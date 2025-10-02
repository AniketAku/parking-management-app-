// =============================================================================
// END SHIFT API ENDPOINT
// Event-Driven Shift Management - End Current Shift
// =============================================================================

import { NextApiRequest, NextApiResponse } from 'next';
import { typedSupabaseAdmin, ShiftRealtimeManager } from '../../../../lib/supabase';
import { ApiResponse, EndShiftRequest, ShiftReport } from '../../../../lib/types/shift';

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
    const endShiftData: EndShiftRequest = req.body;

    // Validate shift ID
    if (!shiftId || typeof shiftId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid shift ID is required',
        timestamp: new Date().toISOString()
      });
    }

    // Validate request data
    const validation = validateEndShiftRequest(endShiftData);
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

    // End shift using database function
    const { data: shiftReport, error: endError } = await typedSupabaseAdmin
      .rpc('end_shift', {
        p_shift_id: shiftId,
        p_closing_cash: endShiftData.closing_cash_amount,
        p_closing_notes: endShiftData.shift_notes || null
      });

    if (endError) {
      throw endError;
    }

    // Get updated shift data for broadcasting
    const { data: completedShift, error: fetchError } = await typedSupabaseAdmin
      .from('shift_sessions')
      .select('*')
      .eq('id', shiftId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Broadcast shift ended event
    const realtimeManager = ShiftRealtimeManager.getInstance();
    await realtimeManager.broadcastShiftEvent('shift-ended', {
      shift: completedShift,
      shift_report: shiftReport,
      timestamp: new Date().toISOString(),
      employee_name: completedShift.employee_name
    });

    // Log shift end
    console.log(`Shift ended: ${shiftId} for employee ${completedShift.employee_name}`);

    return res.status(200).json({
      success: true,
      data: shiftReport,
      message: `Shift successfully ended for ${completedShift.employee_name}`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error ending shift:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while ending shift',
      timestamp: new Date().toISOString()
    });
  }
}

// Validation function for end shift request
function validateEndShiftRequest(data: EndShiftRequest) {
  const errors: Array<{ field: string; message: string; code: string }> = [];

  // Closing cash validation
  if (typeof data.closing_cash_amount !== 'number' || data.closing_cash_amount < 0) {
    errors.push({
      field: 'closing_cash_amount',
      message: 'Closing cash amount must be a non-negative number',
      code: 'INVALID_VALUE'
    });
  }

  // Optional notes validation
  if (data.shift_notes && typeof data.shift_notes !== 'string') {
    errors.push({
      field: 'shift_notes',
      message: 'Shift notes must be a string if provided',
      code: 'INVALID_TYPE'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}