/**
 * Optimized Recent Activity - Performance-Enhanced with React.memo and Optimized Calculations
 * Features: Memoization, optimized filtering/sorting, stable function references
 */

import React, { useMemo, useCallback, memo } from 'react'
import { Card, CardHeader, CardContent } from '../ui'
import { formatDateTime, getVehicleTypeColor, getRevenueAmount, formatCurrency } from '../../utils/helpers'
import { useRenderPerformance } from '../../hooks/usePerformance'
import type { ParkingEntry } from '../../types'

interface OptimizedRecentActivityProps {
  entries: ParkingEntry[]
  loading?: boolean
  maxActivities?: number
}

interface ActivityData {
  entry: ParkingEntry
  type: 'entry' | 'exit'
  time: Date
}

// Memoized activity icon component
const ActivityIcon = memo<{ type: 'entry' | 'exit' }>(({ type }) => {
  useRenderPerformance(`ActivityIcon-${type}`)
  
  if (type === 'entry') {
    return (
      <div className="flex-shrink-0 w-8 h-8 bg-success-100 text-success-600 rounded-full flex items-center justify-center">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>
    )
  }
  
  return (
    <div className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    </div>
  )
})
ActivityIcon.displayName = 'ActivityIcon'

// Memoized vehicle type badge
const VehicleTypeBadge = memo<{ vehicleType: string }>(({ vehicleType }) => {
  useRenderPerformance(`VehicleTypeBadge-${vehicleType}`)
  
  const badgeClasses = useMemo(() => 
    `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getVehicleTypeColor(vehicleType)}`,
    [vehicleType]
  )

  return (
    <span className={badgeClasses}>
      {vehicleType}
    </span>
  )
})
VehicleTypeBadge.displayName = 'VehicleTypeBadge'

// Memoized activity item component
const ActivityItem = memo<{
  activity: ActivityData
}>(({ activity }) => {
  useRenderPerformance(`ActivityItem-${activity.entry.id}`)
  
  const { entry, type } = activity

  const activityTime = useMemo(() => 
    type === 'entry' 
      ? formatDateTime(entry.entryTime)
      : entry.exitTime ? formatDateTime(entry.exitTime) : 'N/A',
    [type, entry.entryTime, entry.exitTime]
  )

  const activityDescription = useMemo(() => {
    if (type === 'entry') {
      return `${entry.vehicleNumber} entered parking`
    }
    const amount = getRevenueAmount(entry)
    return `${entry.vehicleNumber} exited parking${amount > 0 ? ` (${formatCurrency(amount)})` : ''}`
  }, [type, entry.vehicleNumber, entry.actualFee, entry.calculatedFee, entry.amountPaid])

  return (
    <div className="flex items-start space-x-3 py-3 border-b border-border-light last:border-b-0">
      <ActivityIcon type={type} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">
          {activityDescription}
        </p>
        <div className="flex items-center space-x-2 mt-1">
          <VehicleTypeBadge vehicleType={entry.vehicleType} />
          <span className="text-xs text-text-muted">
            {entry.transportName}
          </span>
        </div>
        <p className="text-xs text-text-muted mt-1">
          {activityTime}
        </p>
      </div>
    </div>
  )
})
ActivityItem.displayName = 'ActivityItem'

// Memoized loading skeleton
const LoadingSkeleton = memo(() => {
  useRenderPerformance('LoadingSkeleton')
  
  const skeletonItems = useMemo(() => Array.from({ length: 5 }, (_, i) => i), [])

  return (
    <div className="space-y-4">
      {skeletonItems.map((i) => (
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
  )
})
LoadingSkeleton.displayName = 'LoadingSkeleton'

// Memoized empty state
const EmptyState = memo(() => {
  useRenderPerformance('EmptyState')
  
  return (
    <div className="text-center py-8">
      <div className="w-12 h-12 bg-surface-muted rounded-full mx-auto mb-4 flex items-center justify-center">
        <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="text-text-muted">No recent activity</p>
    </div>
  )
})
EmptyState.displayName = 'EmptyState'

export const OptimizedRecentActivity: React.FC<OptimizedRecentActivityProps> = memo(({ 
  entries, 
  loading = false,
  maxActivities = 8 
}) => {
  useRenderPerformance('OptimizedRecentActivity')

  // Memoized recent activities calculation
  const recentActivities = useMemo(() => {
    // Get recent entries (parked vehicles)
    const recentEntries = entries
      .filter(entry => entry.status === 'Parked')
      .sort((a, b) => b.entryTime.getTime() - a.entryTime.getTime())
      .slice(0, 5)
      .map(entry => ({ 
        entry, 
        type: 'entry' as const, 
        time: entry.entryTime 
      }))

    // Get recent exits
    const recentExits = entries
      .filter(entry => entry.status === 'Exited' && entry.exitTime)
      .sort((a, b) => {
        const aTime = a.exitTime!.getTime()
        const bTime = b.exitTime!.getTime()
        return bTime - aTime
      })
      .slice(0, 5)
      .map(entry => ({ 
        entry, 
        type: 'exit' as const, 
        time: entry.exitTime! 
      }))

    // Combine and sort all recent activities
    return [...recentEntries, ...recentExits]
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, maxActivities)
  }, [entries, maxActivities])

  // Memoized view all handler (stable reference)
  const handleViewAll = useCallback(() => {
    // Placeholder for view all functionality
    console.log('View all activities')
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">Recent Activity</h3>
        </CardHeader>
        <CardContent>
          <LoadingSkeleton />
        </CardContent>
      </Card>
    )
  }

  if (recentActivities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">Recent Activity</h3>
        </CardHeader>
        <CardContent>
          <EmptyState />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">Recent Activity</h3>
          <button 
            onClick={handleViewAll}
            className="px-3 py-1.5 border border-border-light rounded-lg hover:bg-surface-light transition-colors text-sm"
          >
            View All
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-6 pb-6">
          {recentActivities.map((activity, index) => (
            <ActivityItem
              key={`${activity.entry.id}-${activity.type}-${index}`}
              activity={activity}
            />
          ))}
        </div>
        
        {/* Performance indicator */}
        {recentActivities.length > 0 && (
          <div className="px-6 py-2 border-t border-border-light bg-surface-light">
            <div className="text-xs text-text-muted text-center">
              Showing latest {recentActivities.length} activities • Optimized rendering
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})
OptimizedRecentActivity.displayName = 'OptimizedRecentActivity'