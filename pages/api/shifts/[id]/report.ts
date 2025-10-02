// =============================================================================
// SHIFT REPORT API ENDPOINT
// Event-Driven Shift Management - Generate Comprehensive Shift Report
// =============================================================================

import { NextApiRequest, NextApiResponse } from 'next';
import { typedSupabaseAdmin } from '../../../../lib/supabase';
import { ApiResponse, ShiftReport } from '../../../../lib/types/shift';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ShiftReport>>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const { id: shiftId } = req.query;

    // Validate shift ID
    if (!shiftId || typeof shiftId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid shift ID is required',
        timestamp: new Date().toISOString()
      });
    }

    // Get shift data
    const { data: shift, error: shiftError } = await typedSupabaseAdmin
      .from('shift_sessions')
      .select('*')
      .eq('id', shiftId)
      .single();

    if (shiftError || !shift) {
      return res.status(404).json({
        success: false,
        error: 'Shift not found',
        timestamp: new Date().toISOString()
      });
    }

    // Generate comprehensive report
    const report = await generateShiftReport(shift);

    return res.status(200).json({
      success: true,
      data: report,
      message: `Shift report generated for ${shift.employee_name}`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error generating shift report:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while generating shift report',
      timestamp: new Date().toISOString()
    });
  }
}

// Generate comprehensive shift report
async function generateShiftReport(shift: any): Promise<ShiftReport> {
  // Get parking entries for this shift
  const { data: parkingEntries, error: parkingError } = await typedSupabaseAdmin
    .from('parking_entries')
    .select('id, vehicle_number, vehicle_type, entry_time, exit_time, parking_fee, status')
    .eq('shift_session_id', shift.id);

  if (parkingError) {
    console.warn('Error fetching parking entries for report:', parkingError);
  }

  const entries = parkingEntries || [];

  // Calculate metrics
  const totalRevenue = entries.reduce((sum, entry) => sum + (entry.parking_fee || 0), 0);
  const averageTransaction = entries.length > 0 ? totalRevenue / entries.length : 0;

  // Group by vehicle type for breakdown
  const vehicleTypeBreakdown = entries.reduce((breakdown, entry) => {
    const type = entry.vehicle_type || 'Unknown';
    if (!breakdown[type]) {
      breakdown[type] = { count: 0, revenue: 0 };
    }
    breakdown[type].count += 1;
    breakdown[type].revenue += entry.parking_fee || 0;
    return breakdown;
  }, {} as Record<string, { count: number; revenue: number }>);

  const parkingBreakdown = Object.entries(vehicleTypeBreakdown).map(([vehicleType, data]) => ({
    vehicle_type: vehicleType,
    count: data.count,
    revenue: data.revenue
  }));

  // Calculate duration
  const startTime = new Date(shift.shift_start_time);
  const endTime = shift.shift_end_time ? new Date(shift.shift_end_time) : new Date();
  const durationHours = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) * 100) / 100;

  // Calculate cash difference
  const cashDifference = shift.cash_discrepancy || 0;

  const report: ShiftReport = {
    shift_id: shift.id,
    employee_name: shift.employee_name,
    start_time: shift.shift_start_time,
    end_time: shift.shift_end_time || new Date().toISOString(),
    duration_hours: durationHours,
    opening_cash: shift.opening_cash_amount,
    closing_cash: shift.closing_cash_amount || shift.opening_cash_amount,
    cash_difference: cashDifference,
    total_parking_entries: entries.length,
    total_revenue: totalRevenue,
    average_transaction: Math.round(averageTransaction * 100) / 100,
    parking_breakdown: parkingBreakdown,
    status: shift.status,
    notes: shift.shift_notes
  };

  return report;
}