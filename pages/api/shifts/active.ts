// =============================================================================
// GET ACTIVE SHIFT API ENDPOINT
// Event-Driven Shift Management - Get Current Active Shift
// =============================================================================

import { NextApiRequest, NextApiResponse } from 'next';
import { typedSupabaseAdmin } from '../../../lib/supabase';
import { ApiResponse, ShiftSession, ShiftStatistics } from '../../../lib/types/shift';

interface ActiveShiftResponse {
  active_shift: ShiftSession | null;
  shift_statistics: ShiftStatistics | null;
  real_time_data: {
    entries_today: number;
    revenue_today: number;
    current_parking_count: number;
    last_updated: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ActiveShiftResponse>>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // Get current active shift using database function
    const { data: activeShift, error: shiftError } = await typedSupabaseAdmin
      .rpc('get_current_active_shift');

    if (shiftError) {
      throw shiftError;
    }

    let shiftStatistics: ShiftStatistics | null = null;
    let realTimeData = {
      entries_today: 0,
      revenue_today: 0,
      current_parking_count: 0,
      last_updated: new Date().toISOString()
    };

    // If there's an active shift, get its statistics
    if (activeShift) {
      const { data: stats, error: statsError } = await typedSupabaseAdmin
        .from('shift_statistics')
        .select('*')
        .eq('shift_id', activeShift.id)
        .single();

      if (statsError && statsError.code !== 'PGRST116') {
        throw statsError;
      }

      shiftStatistics = stats;

      // Get real-time parking data for active shift
      const { data: parkingData, error: parkingError } = await typedSupabaseAdmin
        .from('parking_entries')
        .select('id, parking_fee, status, created_at')
        .eq('shift_session_id', activeShift.id);

      if (parkingError) {
        console.warn('Error fetching parking data:', parkingError);
      } else if (parkingData) {
        const today = new Date().toISOString().split('T')[0];
        const todayEntries = parkingData.filter(entry =>
          entry.created_at.startsWith(today)
        );

        realTimeData = {
          entries_today: todayEntries.length,
          revenue_today: todayEntries.reduce((sum, entry) =>
            sum + (entry.parking_fee || 0), 0
          ),
          current_parking_count: parkingData.filter(entry =>
            entry.status === 'parked'
          ).length,
          last_updated: new Date().toISOString()
        };
      }
    }

    const responseData: ActiveShiftResponse = {
      active_shift: activeShift,
      shift_statistics: shiftStatistics,
      real_time_data: realTimeData
    };

    return res.status(200).json({
      success: true,
      data: responseData,
      message: activeShift
        ? `Active shift found for ${activeShift.employee_name}`
        : 'No active shift found',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error fetching active shift:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while fetching active shift',
      timestamp: new Date().toISOString()
    });
  }
}