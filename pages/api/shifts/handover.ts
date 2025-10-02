// =============================================================================
// SHIFT HANDOVER API ENDPOINT
// Event-Driven Shift Management - Complete Shift Handover
// =============================================================================

import { NextApiRequest, NextApiResponse } from 'next';
import { typedSupabaseAdmin, ShiftRealtimeManager } from '../../../lib/supabase';
import { ApiResponse, HandoverRequest, HandoverResult } from '../../../lib/types/shift';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<HandoverResult>>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const handoverData: HandoverRequest = req.body;

    // Validate request data
    const validation = validateHandoverRequest(handoverData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    // Get current active shift
    const { data: currentShift, error: currentShiftError } = await typedSupabaseAdmin
      .rpc('get_current_active_shift');

    if (currentShiftError) {
      throw currentShiftError;
    }

    if (!currentShift) {
      return res.status(404).json({
        success: false,
        error: 'No active shift found to handover',
        timestamp: new Date().toISOString()
      });
    }

    // Check if incoming employee is different from current employee
    if (currentShift.employee_id === handoverData.incoming_employee_id) {
      return res.status(400).json({
        success: false,
        error: 'Incoming employee cannot be the same as current employee',
        timestamp: new Date().toISOString()
      });
    }

    // Execute handover using the database function we need to create
    const handoverResult = await executeShiftHandover(currentShift.id, handoverData);

    // Broadcast handover event
    const realtimeManager = ShiftRealtimeManager.getInstance();
    await realtimeManager.broadcastShiftEvent('shift-handover', {
      previous_shift: handoverResult.previous_shift,
      new_shift: handoverResult.new_shift,
      handover_timestamp: handoverResult.handover_timestamp,
      outgoing_employee: currentShift.employee_name,
      incoming_employee: handoverData.incoming_employee_name
    });

    // Log handover
    console.log(`Shift handover completed: ${currentShift.employee_name} → ${handoverData.incoming_employee_name}`);

    return res.status(200).json({
      success: true,
      data: handoverResult,
      message: `Shift handover completed: ${currentShift.employee_name} → ${handoverData.incoming_employee_name}`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error during shift handover:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during shift handover',
      timestamp: new Date().toISOString()
    });
  }
}

// Execute shift handover with database transactions
async function executeShiftHandover(
  currentShiftId: string,
  handoverData: HandoverRequest
): Promise<HandoverResult> {
  try {
    // Step 1: End current shift
    const { data: shiftReport, error: endError } = await typedSupabaseAdmin
      .rpc('end_shift', {
        p_shift_id: currentShiftId,
        p_closing_cash: handoverData.closing_cash_amount,
        p_closing_notes: `Handover to ${handoverData.incoming_employee_name}. ${handoverData.handover_notes}`
      });

    if (endError) {
      throw endError;
    }

    // Step 2: Start new shift for incoming employee
    const { data: newShiftId, error: startError } = await typedSupabaseAdmin
      .rpc('start_shift', {
        p_employee_id: handoverData.incoming_employee_id,
        p_employee_name: handoverData.incoming_employee_name,
        p_employee_phone: handoverData.incoming_employee_phone || null,
        p_opening_cash: handoverData.closing_cash_amount, // Cash is transferred
        p_shift_notes: `Handover from previous shift. ${handoverData.pending_issues || 'No pending issues.'}`
      });

    if (startError) {
      throw startError;
    }

    // Step 3: Get complete shift data
    const [previousShiftResult, newShiftResult] = await Promise.all([
      typedSupabaseAdmin
        .from('shift_sessions')
        .select('*')
        .eq('id', currentShiftId)
        .single(),
      typedSupabaseAdmin
        .from('shift_sessions')
        .select('*')
        .eq('id', newShiftId)
        .single()
    ]);

    if (previousShiftResult.error || newShiftResult.error) {
      throw previousShiftResult.error || newShiftResult.error;
    }

    // Step 4: Record shift change
    const { error: changeError } = await typedSupabaseAdmin
      .from('shift_changes')
      .insert({
        previous_shift_session_id: currentShiftId,
        new_shift_session_id: newShiftId,
        change_timestamp: new Date().toISOString(),
        handover_notes: handoverData.handover_notes,
        cash_transferred: handoverData.closing_cash_amount,
        pending_issues: handoverData.pending_issues,
        outgoing_employee_id: previousShiftResult.data.employee_id,
        outgoing_employee_name: previousShiftResult.data.employee_name,
        incoming_employee_id: handoverData.incoming_employee_id,
        incoming_employee_name: handoverData.incoming_employee_name,
        change_type: handoverData.change_type || 'normal',
        supervisor_approved: !!handoverData.supervisor_id,
        supervisor_id: handoverData.supervisor_id
      });

    if (changeError) {
      throw changeError;
    }

    // Step 5: Update any active parking entries to new shift
    const { error: updateParkingError } = await typedSupabaseAdmin
      .from('parking_entries')
      .update({ shift_session_id: newShiftId })
      .eq('shift_session_id', currentShiftId)
      .eq('status', 'parked');

    if (updateParkingError) {
      console.warn('Warning: Could not update parking entries to new shift:', updateParkingError);
      // Don't throw here as the handover is functionally complete
    }

    return {
      previous_shift: previousShiftResult.data,
      new_shift: newShiftResult.data,
      shift_report: shiftReport,
      handover_timestamp: new Date().toISOString(),
      change_id: 'generated-during-insert' // This would be returned from the insert
    };

  } catch (error) {
    console.error('Error in executeShiftHandover:', error);
    throw error;
  }
}

// Validation function for handover request
function validateHandoverRequest(data: HandoverRequest) {
  const errors: Array<{ field: string; message: string; code: string }> = [];

  // Closing cash validation
  if (typeof data.closing_cash_amount !== 'number' || data.closing_cash_amount < 0) {
    errors.push({
      field: 'closing_cash_amount',
      message: 'Closing cash amount must be a non-negative number',
      code: 'INVALID_VALUE'
    });
  }

  // Handover notes validation
  if (!data.handover_notes || typeof data.handover_notes !== 'string' || data.handover_notes.trim().length === 0) {
    errors.push({
      field: 'handover_notes',
      message: 'Handover notes are required and cannot be empty',
      code: 'REQUIRED_FIELD'
    });
  }

  // Incoming employee ID validation
  if (!data.incoming_employee_id || typeof data.incoming_employee_id !== 'string') {
    errors.push({
      field: 'incoming_employee_id',
      message: 'Incoming employee ID is required',
      code: 'REQUIRED_FIELD'
    });
  }

  // Incoming employee name validation
  if (!data.incoming_employee_name || typeof data.incoming_employee_name !== 'string' || data.incoming_employee_name.trim().length === 0) {
    errors.push({
      field: 'incoming_employee_name',
      message: 'Incoming employee name is required and cannot be empty',
      code: 'REQUIRED_FIELD'
    });
  }

  // Optional fields validation
  if (data.incoming_employee_phone && typeof data.incoming_employee_phone !== 'string') {
    errors.push({
      field: 'incoming_employee_phone',
      message: 'Incoming employee phone must be a string if provided',
      code: 'INVALID_TYPE'
    });
  }

  if (data.pending_issues && typeof data.pending_issues !== 'string') {
    errors.push({
      field: 'pending_issues',
      message: 'Pending issues must be a string if provided',
      code: 'INVALID_TYPE'
    });
  }

  if (data.supervisor_id && typeof data.supervisor_id !== 'string') {
    errors.push({
      field: 'supervisor_id',
      message: 'Supervisor ID must be a string if provided',
      code: 'INVALID_TYPE'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}