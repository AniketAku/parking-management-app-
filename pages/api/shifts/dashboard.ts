// =============================================================================
// DASHBOARD DATA API ENDPOINT
// Event-Driven Shift Management - Real-time Dashboard Data
// =============================================================================

import { NextApiRequest, NextApiResponse } from 'next';
import { typedSupabaseAdmin } from '../../../lib/supabase';
import { ApiResponse, DashboardData } from '../../../lib/types/shift';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<DashboardData>>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // Get all data in parallel for better performance
    const [
      activeShiftResult,
      shiftStatsResult,
      parkingDataResult,
      dailyStatsResult
    ] = await Promise.allSettled([
      typedSupabaseAdmin.rpc('get_current_active_shift'),
      getActiveShiftStatistics(),
      getRealTimeParkingData(),
      getDailySummary()
    ]);

    // Process active shift data
    const activeShift = activeShiftResult.status === 'fulfilled'
      ? activeShiftResult.value.data
      : null;

    // Process shift statistics
    const shiftStatistics = shiftStatsResult.status === 'fulfilled'
      ? shiftStatsResult.value
      : null;

    // Process parking data
    const parkingData = parkingDataResult.status === 'fulfilled'
      ? parkingDataResult.value
      : {
          recent_parking_entries: 0,
          current_cash_position: 0,
          hourly_revenue: 0,
          real_time_stats: {
            entries_last_hour: 0,
            revenue_last_hour: 0,
            active_parking_spots: 0
          }
        };

    // Process daily summary
    const dailySummary = dailyStatsResult.status === 'fulfilled'
      ? dailyStatsResult.value
      : {
          total_shifts: 0,
          total_revenue: 0,
          total_entries: 0,
          average_shift_duration: 0
        };

    const dashboardData: DashboardData = {
      active_shift: activeShift,
      shift_statistics: shiftStatistics,
      recent_parking_entries: parkingData.recent_parking_entries,
      current_cash_position: parkingData.current_cash_position,
      hourly_revenue: parkingData.hourly_revenue,
      daily_summary: dailySummary,
      real_time_stats: parkingData.real_time_stats
    };

    return res.status(200).json({
      success: true,
      data: dashboardData,
      message: 'Dashboard data retrieved successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while fetching dashboard data',
      timestamp: new Date().toISOString()
    });
  }
}

// Get active shift statistics
async function getActiveShiftStatistics() {
  const { data: activeShift } = await typedSupabaseAdmin.rpc('get_current_active_shift');

  if (!activeShift) {
    return null;
  }

  const { data: stats, error } = await typedSupabaseAdmin
    .from('shift_statistics')
    .select('*')
    .eq('shift_id', activeShift.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return stats;
}

// Get real-time parking data
async function getRealTimeParkingData() {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const today = now.toISOString().split('T')[0];

  // Get current active shift
  const { data: activeShift } = await typedSupabaseAdmin.rpc('get_current_active_shift');

  if (!activeShift) {
    return {
      recent_parking_entries: 0,
      current_cash_position: activeShift?.opening_cash_amount || 0,
      hourly_revenue: 0,
      real_time_stats: {
        entries_last_hour: 0,
        revenue_last_hour: 0,
        active_parking_spots: 0
      }
    };
  }

  // Get parking entries for active shift
  const { data: parkingEntries, error: parkingError } = await typedSupabaseAdmin
    .from('parking_entries')
    .select('id, parking_fee, status, created_at, entry_time')
    .eq('shift_session_id', activeShift.id);

  if (parkingError) {
    throw parkingError;
  }

  const entries = parkingEntries || [];

  // Calculate metrics
  const todayEntries = entries.filter(entry =>
    entry.created_at.startsWith(today)
  );

  const lastHourEntries = entries.filter(entry =>
    new Date(entry.created_at) >= oneHourAgo
  );

  const activeSpots = entries.filter(entry =>
    entry.status === 'parked'
  ).length;

  const todayRevenue = todayEntries.reduce((sum, entry) =>
    sum + (entry.parking_fee || 0), 0
  );

  const lastHourRevenue = lastHourEntries.reduce((sum, entry) =>
    sum + (entry.parking_fee || 0), 0
  );

  const currentCashPosition = activeShift.opening_cash_amount + todayRevenue;

  return {
    recent_parking_entries: todayEntries.length,
    current_cash_position: currentCashPosition,
    hourly_revenue: lastHourRevenue,
    real_time_stats: {
      entries_last_hour: lastHourEntries.length,
      revenue_last_hour: lastHourRevenue,
      active_parking_spots: activeSpots
    }
  };
}

// Get daily summary statistics
async function getDailySummary() {
  const today = new Date().toISOString().split('T')[0];

  // Get today's shifts
  const { data: todayShifts, error: shiftsError } = await typedSupabaseAdmin
    .from('shift_sessions')
    .select('id, shift_duration_minutes, opening_cash_amount, closing_cash_amount')
    .gte('shift_start_time', `${today}T00:00:00`)
    .lt('shift_start_time', `${today}T23:59:59`);

  if (shiftsError) {
    throw shiftsError;
  }

  // Get today's parking entries
  const { data: todayEntries, error: entriesError } = await typedSupabaseAdmin
    .from('parking_entries')
    .select('id, parking_fee')
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59`);

  if (entriesError) {
    throw entriesError;
  }

  const shifts = todayShifts || [];
  const entries = todayEntries || [];

  const totalRevenue = entries.reduce((sum, entry) =>
    sum + (entry.parking_fee || 0), 0
  );

  const averageShiftDuration = shifts.length > 0
    ? shifts.reduce((sum, shift) => sum + (shift.shift_duration_minutes || 0), 0) / shifts.length
    : 0;

  return {
    total_shifts: shifts.length,
    total_revenue: totalRevenue,
    total_entries: entries.length,
    average_shift_duration: Math.round(averageShiftDuration)
  };
}