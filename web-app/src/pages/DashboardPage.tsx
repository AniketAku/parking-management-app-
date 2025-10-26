import React, { useEffect, useState, useMemo } from 'react'
import { useParkingStore } from '../stores/parkingStore'
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates'
import { useParkingData } from '../hooks/useParkingData'
import { ConnectionStatus } from '../components/common/ConnectionStatus'
import {
  StatisticsOverview,
  RecentActivity,
  QuickActions,
  ParkingOverview,
  ActiveShiftPanel
} from '../components/dashboard'

export const DashboardPage: React.FC = () => {
  // Initialize parking data with database connection (handles real-time updates)
  const { entries, statistics, loading, error } = useParkingData()

  // Connection status only (no data subscriptions to avoid conflicts)
  const { isConnected, lastUpdate, connectionState } = useRealTimeUpdates({
    room: 'dashboard',
    autoJoinRoom: true,
    enableNotifications: false // Disable to prevent duplicate subscriptions
  })
  
  // Initial loading state
  const [initialLoading, setInitialLoading] = useState(true)

  // Memoize current date to prevent constant re-renders
  const currentDate = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }, []) // Empty dependency - only calculate once per day

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 1500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="space-y-6">
      {/* Fixed Page Header - Mobile-first optimized */}
      <div className="sticky-stats">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">
              Dashboard
            </h1>
            <p className="text-base lg:text-sm text-text-muted mt-1">
              Real-time parking management overview
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Connection status */}
            <ConnectionStatus showLastUpdate={true} />

            {/* Current date */}
            <div className="sm:text-right">
              <div className="text-base lg:text-sm text-text-muted">
                {currentDate}
              </div>
            </div>
          </div>
        </div>
        
        {/* Real-time status indicator */}
        {connectionState === 'connecting' && (
          <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 mt-4">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-warning-600"></div>
              <span className="text-warning-700 font-medium">
                Connecting to real-time updates...
              </span>
            </div>
          </div>
        )}

        {!isConnected && connectionState === 'disconnected' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 lg:w-4 lg:h-4 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                  <span className="text-base lg:text-sm text-orange-700 font-medium">
                    Real-time updates unavailable
                  </span>
                  <span className="text-sm lg:text-xs text-orange-600">
                    Data may not be current
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        

        {/* Statistics Overview - Fixed */}
        <div className="mt-6">
          <StatisticsOverview
            statistics={statistics}
            loading={initialLoading || loading}
            isConnected={isConnected}
            lastUpdate={lastUpdate}
          />
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="space-y-6">
        {/* Main content grid - Scrollable */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Recent activity and parking overview */}
        <div className="lg:col-span-2 space-y-6">
          <RecentActivity 
            entries={entries} 
            loading={initialLoading || loading}
            isRealTime={isConnected}
          />
          <ParkingOverview 
            entries={entries} 
            loading={initialLoading || loading}
            statistics={statistics}
          />
        </div>

        {/* Right column - Quick actions */}
        <div className="space-y-6">
          <QuickActions 
            statistics={statistics}
            isConnected={isConnected}
          />

          {/* Real-time activity indicator */}
          {isConnected && (
            <div className="bg-success-50 border border-success-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
                <div className="text-sm">
                  <div className="font-medium text-success-700">Live Updates Active</div>
                  <div className="text-success-600 text-xs">
                    {lastUpdate ? (
                      `Last update: ${lastUpdate.toLocaleTimeString()}`
                    ) : (
                      'Monitoring for changes...'
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Development info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-xs text-blue-700">
                <div className="font-medium">🧪 Development Mode</div>
                <div className="mt-1 space-y-1">
                  <div>Socket: {connectionState}</div>
                  <div>Real-time: {isConnected ? 'Active' : 'Inactive'}</div>
                  <div>Entries: {entries.length}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Shift Management Panel - Moved to bottom */}
      <div className="mt-6">
        <ActiveShiftPanel />
      </div>
      </div>
    </div>
  )
}