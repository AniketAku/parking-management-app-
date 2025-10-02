// =============================================================================
// EMERGENCY END SHIFT API ENDPOINT
// Event-Driven Shift Management - Emergency Shift Termination
// =============================================================================

import { NextApiRequest, NextApiResponse } from 'next';
import { typedSupabaseAdmin, ShiftRealtimeManager } from '../../../../lib/supabase';
import { ApiResponse, EmergencyEndRequest, ShiftReport } from '../../../../lib/types/shift';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ShiftReport>>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const { id: shiftId } = req.query;
    const emergencyData: EmergencyEndRequest = req.body;

    // Validate shift ID
    if (!shiftId || typeof shiftId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid shift ID is required',
        timestamp: new Date().toISOString()
      });
    }

    // Validate request data
    const validation = validateEmergencyEndRequest(emergencyData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    // Verify shift exists and is active
    const { data: existingShift, error: checkError } = await typedSupabaseAdmin
      .from('shift_sessions')
      .select('*')
      .eq('id', shiftId)
      .eq('status', 'active')
      .single();

    if (checkError || !existingShift) {
      return res.status(404).json({
        success: false,
        error: 'Active shift not found with the provided ID',
        timestamp: new Date().toISOString()
      });
    }

    // Verify supervisor authorization
    const { data: supervisor, error: supervisorError } = await typedSupabaseAdmin
      .from('auth.users')
      .select('id, email, raw_user_meta_data')
      .eq('id', emergencyData.supervisor_id)
      .single();

    if (supervisorError || !supervisor) {
      return res.status(401).json({
        success: false,
        error: 'Invalid supervisor authorization',
        timestamp: new Date().toISOString()
      });
    }

    // Check if supervisor has appropriate role
    const supervisorRole = supervisor.raw_user_meta_data?.role;
    if (!supervisorRole || !['supervisor', 'manager', 'admin'].includes(supervisorRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient privileges for emergency shift termination',
        timestamp: new Date().toISOString()
      });
    }

    // Emergency end shift with special status
    const emergencyNotes = `EMERGENCY TERMINATION - Reason: ${emergencyData.reason} | Supervisor: ${supervisor.email} | Timestamp: ${new Date().toISOString()}`;

    // Update shift to emergency_ended status
    const { error: updateError } = await typedSupabaseAdmin
      .from('shift_sessions')
      .update({
        shift_end_time: new Date().toISOString(),
        closing_cash_amount: emergencyData.closing_cash_amount || existingShift.opening_cash_amount,
        status: 'emergency_ended',
        shift_notes: existingShift.shift_notes
          ? `${existingShift.shift_notes} | ${emergencyNotes}`
          : emergencyNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', shiftId);

    if (updateError) {
      throw updateError;
    }

    // Generate emergency shift report
    const { data: emergencyReport, error: reportError } = await typedSupabaseAdmin
      .rpc('end_shift', {
        p_shift_id: shiftId,
        p_closing_cash: emergencyData.closing_cash_amount || existingShift.opening_cash_amount,
        p_closing_notes: emergencyNotes
      });

    if (reportError) {
      console.warn('Could not generate standard report for emergency end:', reportError);
    }

    // Record emergency change in shift_changes table
    const { error: changeError } = await typedSupabaseAdmin
      .from('shift_changes')
      .insert({
        previous_shift_session_id: shiftId,
        new_shift_session_id: null, // No new shift for emergency end
        change_timestamp: new Date().toISOString(),
        handover_notes: emergencyNotes,
        cash_transferred: emergencyData.closing_cash_amount,
        pending_issues: `EMERGENCY TERMINATION: ${emergencyData.reason}`,
        outgoing_employee_id: existingShift.employee_id,
        outgoing_employee_name: existingShift.employee_name,
        incoming_employee_id: null,
        incoming_employee_name: null,
        change_type: 'emergency',
        supervisor_approved: true,
        supervisor_id: emergencyData.supervisor_id,
        supervisor_name: supervisor.email
      });

    if (changeError) {
      console.warn('Could not record emergency change:', changeError);
    }

    // Get updated shift data
    const { data: completedShift, error: fetchError } = await typedSupabaseAdmin
      .from('shift_sessions')
      .select('*')
      .eq('id', shiftId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Broadcast emergency end event
    const realtimeManager = ShiftRealtimeManager.getInstance();
    await realtimeManager.broadcastShiftEvent('emergency-end', {
      shift: completedShift,
      reason: emergencyData.reason,
      supervisor_id: emergencyData.supervisor_id,
      supervisor_email: supervisor.email,
      timestamp: new Date().toISOString(),
      employee_name: completedShift.employee_name
    });

    // Log emergency end
    console.log(`EMERGENCY SHIFT END: ${shiftId} for ${completedShift.employee_name} by supervisor ${supervisor.email}`);

    const finalReport = emergencyReport || {
      shift_id: shiftId,
      employee_name: completedShift.employee_name,
      start_time: completedShift.shift_start_time,
      end_time: completedShift.shift_end_time!,
      duration_hours: Math.round((new Date(completedShift.shift_end_time!).getTime() - new Date(completedShift.shift_start_time).getTime()) / (1000 * 60 * 60) * 100) / 100,
      opening_cash: completedShift.opening_cash_amount,
      closing_cash: completedShift.closing_cash_amount!,
      cash_difference: completedShift.cash_discrepancy || 0,
      status: completedShift.status,
      notes: emergencyNotes
    };

    return res.status(200).json({
      success: true,
      data: finalReport,
      message: `Emergency shift termination completed for ${completedShift.employee_name}`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error during emergency shift end:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during emergency shift termination',
      timestamp: new Date().toISOString()
    });
  }
}

// Validation function for emergency end request
function validateEmergencyEndRequest(data: EmergencyEndRequest) {
  const errors: Array<{ field: string; message: string; code: string }> = [];

  // Reason validation
  if (!data.reason || typeof data.reason !== 'string' || data.reason.trim().length === 0) {
    errors.push({
      field: 'reason',
      message: 'Emergency reason is required and cannot be empty',
      code: 'REQUIRED_FIELD'
    });
  }

  // Supervisor ID validation
  if (!data.supervisor_id || typeof data.supervisor_id !== 'string') {
    errors.push({
      field: 'supervisor_id',
      message: 'Supervisor ID is required for emergency termination',
      code: 'REQUIRED_FIELD'
    });
  }

  // Optional closing cash validation
  if (data.closing_cash_amount !== undefined) {
    if (typeof data.closing_cash_amount !== 'number' || data.closing_cash_amount < 0) {
      errors.push({
        field: 'closing_cash_amount',
        message: 'Closing cash amount must be a non-negative number if provided',
        code: 'INVALID_VALUE'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}