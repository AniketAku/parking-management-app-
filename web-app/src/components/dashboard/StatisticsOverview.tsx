import React from 'react'
import { Card, CardHeader, CardContent } from '../ui'
import { ParkingStatsCard } from '../ui/StatsCard'
import type { ParkingStatistics } from '../../types'

interface StatisticsOverviewProps {
  statistics: ParkingStatistics
  loading?: boolean
}

export const StatisticsOverview: React.FC<StatisticsOverviewProps> = ({
  statistics,
  loading = false
}) => {
  // Safety check - if statistics is undefined or null, show loading state
  if (!statistics || loading) {
    return (
      <div className="sticky-stats space-y-4 sm:space-y-6">
        {/* Primary Stats Grid - Loading - Mobile-first responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <ParkingStatsCard type="parked" value={0} loading={true} />
          <ParkingStatsCard type="exited" value={0} loading={true} />
          <ParkingStatsCard type="income" value="₹0" loading={true} />
          <ParkingStatsCard type="unpaid" value={0} loading={true} />
        </div>
        
        {/* Secondary Stats - Loading - Mobile-first responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Total Entries</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-400">...</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Total Exits</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-400">...</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Total Revenue</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-400">...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sticky-stats space-y-4 sm:space-y-6">
      {/* Primary Stats Grid - Mobile-first responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <ParkingStatsCard
          type="parked"
          value={statistics.parkedVehicles || 0}
          loading={loading}
        />
        
        <ParkingStatsCard
          type="exited"
          value={statistics.todayExits || 0}
          loading={loading}
        />
        
        <ParkingStatsCard
          type="income"
          value={`₹${(statistics.todayIncome || 0).toLocaleString('en-IN')}`}
          loading={loading}
        />
        
        <ParkingStatsCard
          type="unpaid"
          value={statistics.unpaidVehicles || 0}
          loading={loading}
        />
      </div>

      {/* Secondary Stats - Mobile-first responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardHeader>
            <h3 className="text-xs sm:text-sm font-medium text-text-secondary">Total Entries</h3>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl sm:text-2xl font-bold text-text-primary">
                {loading ? '...' : (statistics.todayEntries || 0)}
              </span>
              <span className="text-xs sm:text-sm text-text-muted">today</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-xs sm:text-sm font-medium text-text-secondary">Total Exits</h3>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl sm:text-2xl font-bold text-text-primary">
                {loading ? '...' : (statistics.exitedVehicles || 0)}
              </span>
              <span className="text-xs sm:text-sm text-text-muted">all time</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-xs sm:text-sm font-medium text-text-secondary">Total Revenue</h3>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl sm:text-2xl font-bold text-text-primary">
                {loading ? '...' : `₹${(statistics.totalIncome || 0).toLocaleString('en-IN')}`}
              </span>
              <span className="text-xs sm:text-sm text-text-muted">all time</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}