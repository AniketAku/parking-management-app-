// =============================================================================
// START SHIFT API ENDPOINT
// Event-Driven Shift Management - Start New Shift
// =============================================================================

import { NextApiRequest, NextApiResponse } from 'next';
import { typedSupabaseAdmin, ShiftRealtimeManager } from '../../../lib/supabase';
import { ApiResponse, StartShiftRequest, ShiftSession } from '../../../lib/types/shift';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ShiftSession>>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const startShiftData: StartShiftRequest = req.body;

    // Validate required fields
    const validation = validateStartShiftRequest(startShiftData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    // Check for existing active shift
    const { data: existingShift, error: checkError } = await typedSupabaseAdmin
      .from('shift_sessions')
      .select('*')
      .eq('status', 'active')
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw checkError;
    }

    if (existingShift) {
      return res.status(409).json({
        success: false,
        error: `Active shift already exists (ID: ${existingShift.id}). Complete current shift or perform handover first.`,
        data: existingShift,
        timestamp: new Date().toISOString()
      });
    }

    // Start new shift using database function
    const { data: newShiftId, error: startError } = await typedSupabaseAdmin
      .rpc('start_shift', {
        p_employee_id: startShiftData.employee_id,
        p_employee_name: startShiftData.employee_name,
        p_employee_phone: startShiftData.employee_phone || null,
        p_opening_cash: startShiftData.opening_cash_amount,
        p_shift_notes: startShiftData.shift_notes || null
      });

    if (startError) {
      throw startError;
    }

    // Fetch the complete shift data
    const { data: newShift, error: fetchError } = await typedSupabaseAdmin
      .from('shift_sessions')
      .select('*')
      .eq('id', newShiftId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Broadcast shift started event
    const realtimeManager = ShiftRealtimeManager.getInstance();
    await realtimeManager.broadcastShiftEvent('shift-started', {
      shift: newShift,
      timestamp: new Date().toISOString(),
      employee_name: newShift.employee_name
    });

    // Log shift start
    console.log(`Shift started: ${newShift.id} for employee ${newShift.employee_name}`);

    return res.status(201).json({
      success: true,
      data: newShift,
      message: `Shift successfully started for ${newShift.employee_name}`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error starting shift:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while starting shift',
      timestamp: new Date().toISOString()
    });
  }
}

// Validation function for start shift request
function validateStartShiftRequest(data: StartShiftRequest) {
  const errors: Array<{ field: string; message: string; code: string }> = [];

  // Employee ID validation
  if (!data.employee_id || typeof data.employee_id !== 'string') {
    errors.push({
      field: 'employee_id',
      message: 'Employee ID is required and must be a valid string',
      code: 'REQUIRED_FIELD'
    });
  }

  // Employee name validation
  if (!data.employee_name || typeof data.employee_name !== 'string' || data.employee_name.trim().length === 0) {
    errors.push({
      field: 'employee_name',
      message: 'Employee name is required and cannot be empty',
      code: 'REQUIRED_FIELD'
    });
  }

  // Opening cash validation
  if (typeof data.opening_cash_amount !== 'number' || data.opening_cash_amount < 0) {
    errors.push({
      field: 'opening_cash_amount',
      message: 'Opening cash amount must be a non-negative number',
      code: 'INVALID_VALUE'
    });
  }

  // Optional phone validation
  if (data.employee_phone && typeof data.employee_phone !== 'string') {
    errors.push({
      field: 'employee_phone',
      message: 'Employee phone must be a string if provided',
      code: 'INVALID_TYPE'
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