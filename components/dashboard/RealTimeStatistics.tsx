// =============================================================================
// REAL-TIME STATISTICS COMPONENT
// Event-Driven Shift Management - Live Statistics Display
// =============================================================================

import React from 'react';
import { DashboardData, ShiftStatistics } from '../../lib/types/shift';

interface RealTimeStatisticsProps {
  dashboardData: DashboardData | null;
  shiftStatistics: ShiftStatistics | null;
  className?: string;
}

export const RealTimeStatistics: React.FC<RealTimeStatisticsProps> = ({
  dashboardData,
  shiftStatistics,
  className = ''
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const stats = [
    {
      title: 'Vehicles In',
      value: dashboardData?.recent_parking_entries || 0,
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
          <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z" />
        </svg>
      ),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      trend: dashboardData?.real_time_stats?.entries_last_hour || 0,
      trendLabel: 'last hour'
    },
    {
      title: 'Currently Parked',
      value: dashboardData?.real_time_stats?.active_parking_spots || 0,
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      trend: null,
      trendLabel: 'occupied spots'
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(shiftStatistics?.total_parking_revenue || 0),
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
        </svg>
      ),
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      trend: dashboardData?.real_time_stats?.revenue_last_hour || 0,
      trendLabel: 'last hour',
      trendFormat: 'currency'
    },
    {
      title: 'Avg Transaction',
      value: formatCurrency(shiftStatistics?.average_parking_fee || 0),
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
          <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
        </svg>
      ),
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      trend: null,
      trendLabel: 'per vehicle'
    }
  ];

  return (
    <div className={`space-y-4 ${className}`} role="region" aria-label="Real-time parking statistics">
      {/* Main Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`${stat.bgColor} ${stat.borderColor} border rounded-lg p-4 transition-all duration-200 hover:shadow-md`}
            role="article"
            aria-label={`${stat.title}: ${typeof stat.value === 'string' ? stat.value : stat.value.toLocaleString()}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`${stat.color} p-2 rounded-lg bg-white`}>
                {stat.icon}
              </div>
              {stat.trend !== null && (
                <div className="text-right">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">
                    {stat.trendLabel}
                  </div>
                  <div className={`text-sm font-semibold ${stat.color}`}>
                    {stat.trendFormat === 'currency'
                      ? formatCurrency(stat.trend)
                      : stat.trend}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className={`text-2xl font-bold ${stat.color}`}>
                {typeof stat.value === 'string' ? stat.value : stat.value.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 font-medium">
                {stat.title}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Metrics */}
      {dashboardData?.daily_summary && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Today's Summary</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">
                {dashboardData.daily_summary.total_shifts}
              </div>
              <div className="text-sm text-gray-600">Total Shifts</div>
            </div>

            <div className="text-center">
              <div className="text-xl font-bold text-green-600">
                {formatCurrency(dashboardData.daily_summary.total_revenue)}
              </div>
              <div className="text-sm text-gray-600">Daily Revenue</div>
            </div>

            <div className="text-center">
              <div className="text-xl font-bold text-purple-600">
                {dashboardData.daily_summary.total_entries}
              </div>
              <div className="text-sm text-gray-600">Total Entries</div>
            </div>

            <div className="text-center">
              <div className="text-xl font-bold text-orange-600">
                {Math.round(dashboardData.daily_summary.average_shift_duration / 60)}h {dashboardData.daily_summary.average_shift_duration % 60}m
              </div>
              <div className="text-sm text-gray-600">Avg Duration</div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Indicators */}
      {shiftStatistics && (
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Shift Performance</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-indigo-600">
                {((shiftStatistics.total_parking_entries / Math.max(1, (shiftStatistics.shift_duration_minutes || 60) / 60)).toFixed(1))}
              </div>
              <div className="text-sm text-gray-600">Vehicles/Hour</div>
            </div>

            <div className="space-y-1">
              <div className="text-2xl font-bold text-teal-600">
                {shiftStatistics.total_parking_entries > 0
                  ? Math.round((shiftStatistics.total_parking_revenue / shiftStatistics.total_parking_entries))
                  : 0}%
              </div>
              <div className="text-sm text-gray-600">Efficiency Rate</div>
            </div>

            <div className="space-y-1">
              <div className="text-2xl font-bold text-pink-600">
                {formatCurrency((shiftStatistics.total_parking_revenue / Math.max(1, (shiftStatistics.shift_duration_minutes || 60) / 60)))}
              </div>
              <div className="text-sm text-gray-600">Revenue/Hour</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};