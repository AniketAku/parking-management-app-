import React from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
// import { Button } from '../ui/Button'
import { formatDateTime, getVehicleTypeColor, getRevenueAmount, formatCurrency, calculateParkingFee } from '../../utils/helpers'
import { isCurrentlyParked } from '../../utils/statusHelpers'
import { useBusinessSettings } from '../../hooks/useSettings'
import type { ParkingEntry } from '../../types'

interface RecentActivityProps {
  entries: ParkingEntry[]
  loading?: boolean
}

interface ActivityItemProps {
  entry: ParkingEntry
  type: 'entry' | 'exit'
  vehicleRates?: any
}

const ActivityItem: React.FC<ActivityItemProps> = ({ entry, type, vehicleRates }) => {
  const getAmountDisplay = (entry: ParkingEntry) => {
    // For parked vehicles, always calculate dynamically since fee increases with time
    // For exited vehicles, use stored revenue amount (manual override or system calculation)
    if (isCurrentlyParked(entry.status)) {
      // Only use manual override (actualFee) if explicitly set, otherwise calculate dynamically
      if (entry.actualFee !== null && entry.actualFee !== undefined) {
        return entry.actualFee
      }

      // Calculate current parking fee dynamically
      try {
        const currentFee = calculateParkingFee(
          entry.vehicleType,
          entry.entryTime,
          undefined,
          vehicleRates
        )
        return currentFee
      } catch (error) {
        console.warn('Error calculating current parking fee:', error)
        return entry.calculatedFee || 0
      }
    }

    // For exited vehicles, use the revenue amount with priority: actualFee > calculatedFee > amountPaid
    const revenueAmount = getRevenueAmount(entry)
    if (revenueAmount > 0) {
      return revenueAmount
    }

    // For exited vehicles without stored revenue, calculate dynamically
    if (entry.status === 'Exited' && entry.exitTime) {
      try {
        const calculatedFee = calculateParkingFee(
          entry.vehicleType,
          entry.entryTime,
          entry.exitTime,
          vehicleRates
        )
        return calculatedFee
      } catch (error) {
        console.warn('Error calculating parking fee:', error)
      }
    }

    return 0
  }

  const getActivityIcon = () => {
    switch (type) {
      case 'entry':
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-success-100 text-success-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        )
      case 'exit':
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
        )
    }
  }

  const getActivityTime = () => {
    return type === 'entry' 
      ? formatDateTime(entry.entryTime)
      : entry.exitTime ? formatDateTime(entry.exitTime) : 'N/A'
  }

  const getActivityDescription = () => {
    if (type === 'entry') {
      return `${entry.vehicleNumber} entered parking`
    } else {
      const amount = getAmountDisplay(entry)
      return `${entry.vehicleNumber} exited parking${amount > 0 ? ` (${formatCurrency(amount)})` : ''}`
    }
  }

  return (
    <div className="flex items-start space-x-3 py-3 border-b border-border-light last:border-b-0">
      {getActivityIcon()}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">
          {getActivityDescription()}
        </p>
        <div className="flex items-center space-x-2 mt-1">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getVehicleTypeColor(entry.vehicleType)}`}>
            {entry.vehicleType}
          </span>
          <span className="text-xs text-text-muted">
            {entry.transportName}
          </span>
        </div>
        <p className="text-xs text-text-muted mt-1">
          {getActivityTime()}
        </p>
      </div>
    </div>
  )
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  entries,
  loading = false
}) => {
  // Get vehicle rates from settings
  const { settings: businessSettings } = useBusinessSettings()
  const vehicleRates = businessSettings?.vehicle_rates
  // Get recent entries and exits (last 10 activities)
  const recentEntries = entries
    .filter(entry => entry.status === 'Parked')
    .sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime())
    .slice(0, 5)

  const recentExits = entries
    .filter(entry => entry.status === 'Exited' && entry.exitTime)
    .sort((a, b) => {
      const aTime = new Date(a.exitTime!).getTime()
      const bTime = new Date(b.exitTime!).getTime()
      return bTime - aTime
    })
    .slice(0, 5)

  // Combine and sort all recent activities
  const allActivities = [
    ...recentEntries.map(entry => ({ entry, type: 'entry' as const, time: new Date(entry.entryTime) })),
    ...recentExits.map(entry => ({ entry, type: 'exit' as const, time: new Date(entry.exitTime!) }))
  ]
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, 8)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">Recent Activity</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3 py-3">
                <div className="flex-shrink-0 w-8 h-8 bg-surface-muted rounded-full animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface-muted rounded animate-pulse"></div>
                  <div className="h-3 bg-surface-muted rounded w-3/4 animate-pulse"></div>
                  <div className="h-3 bg-surface-muted rounded w-1/2 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (allActivities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">Recent Activity</h3>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-surface-muted rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-text-muted">No recent activity</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">Recent Activity</h3>
          <button className="px-3 py-1.5 border border-border-light rounded-lg hover:bg-surface-light transition-colors text-sm">
            View All
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-6 pb-6">
          {allActivities.map(({ entry, type }, index) => (
            <ActivityItem
              key={`${entry.id}-${type}-${index}`}
              entry={entry}
              type={type}
              vehicleRates={vehicleRates}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}