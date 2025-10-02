// =============================================================================
// SHIFT REPORTS API ENDPOINT
// Event-Driven Shift Management - Historical Shift Reports with Filtering
// =============================================================================

import { NextApiRequest, NextApiResponse } from 'next';
import { typedSupabaseAdmin } from '../../../lib/supabase';
import { ApiResponse, ShiftReport, ReportFilter } from '../../../lib/types/shift';

interface ReportsResponse {
  reports: ShiftReport[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
  filters_applied: ReportFilter;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ReportsResponse>>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // Parse query parameters
    const {
      employee_id,
      start_date,
      end_date,
      status,
      min_duration,
      max_duration,
      has_discrepancy,
      page = '1',
      per_page = '20'
    } = req.query;

    // Build filters
    const filters: ReportFilter = {};
    if (employee_id && typeof employee_id === 'string') filters.employee_id = employee_id;
    if (status && typeof status === 'string') filters.status = status as any;
    if (min_duration && typeof min_duration === 'string') filters.min_duration = parseInt(min_duration);
    if (max_duration && typeof max_duration === 'string') filters.max_duration = parseInt(max_duration);
    if (has_discrepancy && typeof has_discrepancy === 'string') filters.has_discrepancy = has_discrepancy === 'true';

    if (start_date && end_date && typeof start_date === 'string' && typeof end_date === 'string') {
      filters.date_range = { start: start_date, end: end_date };
    }

    // Parse pagination
    const pageNum = Math.max(1, parseInt(page as string));
    const perPage = Math.min(100, Math.max(1, parseInt(per_page as string)));
    const offset = (pageNum - 1) * perPage;

    // Build query
    let query = typedSupabaseAdmin
      .from('shift_sessions')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.employee_id) {
      query = query.eq('employee_id', filters.employee_id);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.date_range) {
      query = query
        .gte('shift_start_time', filters.date_range.start)
        .lte('shift_start_time', filters.date_range.end);
    }

    if (filters.min_duration) {
      query = query.gte('shift_duration_minutes', filters.min_duration);
    }

    if (filters.max_duration) {
      query = query.lte('shift_duration_minutes', filters.max_duration);
    }

    if (filters.has_discrepancy) {
      query = query.neq('cash_discrepancy', 0);
    }

    // Apply pagination and ordering
    query = query
      .order('shift_start_time', { ascending: false })
      .range(offset, offset + perPage - 1);

    const { data: shifts, error: shiftsError, count } = await query;

    if (shiftsError) {
      throw shiftsError;
    }

    // Generate reports for each shift
    const reports: ShiftReport[] = [];

    if (shifts) {
      for (const shift of shifts) {
        try {
          const report = await generateShiftReport(shift);
          reports.push(report);
        } catch (error) {
          console.warn(`Error generating report for shift ${shift.id}:`, error);
          // Continue with other reports
        }
      }
    }

    const totalPages = Math.ceil((count || 0) / perPage);

    const response: ReportsResponse = {
      reports,
      pagination: {
        total: count || 0,
        page: pageNum,
        per_page: perPage,
        total_pages: totalPages
      },
      filters_applied: filters
    };

    return res.status(200).json({
      success: true,
      data: response,
      message: `Retrieved ${reports.length} shift reports`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error fetching shift reports:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while fetching shift reports',
      timestamp: new Date().toISOString()
    });
  }
}

// Generate shift report (reused from individual report endpoint)
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