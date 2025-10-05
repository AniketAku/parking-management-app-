// =============================================================================
// SHIFT OVERVIEW TAB
// Real-time shift status, statistics, and quick actions
// =============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import type { ShiftLinkingState, ShiftLinkingMetrics } from '../../hooks/useShiftLinking'

interface ShiftSession {
  id: string
  employee_id: string              // Database column name
  employee_name: string             // Database column name
  employee_phone?: string           // Database column name
  shift_start_time: string          // Database column name
  shift_end_time?: string           // Database column name
  status: string
  opening_cash_amount?: number      // Database column name
  closing_cash_amount?: number      // Database column name
  shift_notes?: string              // Database column name
}

interface ShiftOverviewTabProps {
  linkingState: ShiftLinkingState
  linkingMetrics: ShiftLinkingMetrics | null
  onRefresh: () => Promise<void>
  isLoading: boolean
}

export const ShiftOverviewTab: React.FC<ShiftOverviewTabProps> = ({
  linkingState,
  linkingMetrics,
  onRefresh,
  isLoading
}) => {
  // Local state for active shift details
  const [activeShift, setActiveShift] = useState<ShiftSession | null>(null)
  const [shiftDuration, setShiftDuration] = useState<string>('00:00:00')
  const [todayStats, setTodayStats] = useState({
    totalRevenue: 0,
    vehiclesProcessed: 0,
    currentlyParked: 0,
    averageSessionTime: 0
  })

  // Fetch active shift details
  const fetchActiveShift = useCallback(async () => {
    if (!linkingState.activeShiftId) {
      setActiveShift(null)
      return
    }

    try {
      const { data, error } = await supabase
        .from('shift_sessions')
        .select('*')
        .eq('id', linkingState.activeShiftId)
        .single()

      if (error) throw error

      setActiveShift(data as ShiftSession)
    } catch (error) {
      console.error('Error fetching active shift details:', error)
    }
  }, [linkingState.activeShiftId])

  // Fetch today's statistics
  const fetchTodayStats = useCallback(async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Try shift_statistics view first (if migration deployed)
      if (linkingState.activeShiftId) {
        const { data: shiftStats, error: statsError } = await supabase
          .from('shift_statistics')
          .select('*')
          .eq('shift_id', linkingState.activeShiftId)
          .single()

        if (!statsError && shiftStats) {
          // Use real data from shift_statistics view
          setTodayStats({
            totalRevenue: shiftStats.revenue_collected || 0,
            vehiclesProcessed: shiftStats.vehicles_entered || 0,
            currentlyParked: shiftStats.vehicles_currently_parked || 0,
            averageSessionTime: Math.round(shiftStats.shift_duration_minutes / Math.max(shiftStats.vehicles_entered, 1) || 0)
          })
          return
        }
      }

      // Fallback: Query parking_entries directly (works without migration)
      // ✅ FIX: Include multi-day sessions - entries where EITHER entry_time OR exit_time is today
      const todayStart = new Date(today)
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(today)
      todayEnd.setHours(23, 59, 59, 999)

      const { data: parkingEntries, error } = await supabase
        .from('parking_entries')
        .select('*')
        .or(`and(entry_time.gte.${todayStart.toISOString()},entry_time.lte.${todayEnd.toISOString()}),and(exit_time.gte.${todayStart.toISOString()},exit_time.lte.${todayEnd.toISOString()})`)

      if (error) {
        console.error('Error fetching parking entries:', error)
        return
      }

      console.log('📊 SHIFT OVERVIEW - Fetched entries:', {
        totalCount: parkingEntries?.length || 0,
        firstEntry: parkingEntries?.[0] ? {
          id: parkingEntries[0].id,
          entry_time: parkingEntries[0].entry_time,
          exit_time: parkingEntries[0].exit_time,
          status: parkingEntries[0].status,
          actual_fee: parkingEntries[0].actual_fee,
          calculated_fee: parkingEntries[0].calculated_fee
        } : null
      })

      // ✅ FIX: Use actual database column names (actual_fee/calculated_fee) not parking_fee
      const totalRevenue = parkingEntries?.reduce((sum, entry) => {
        // Only count exited/completed sessions for revenue
        if (entry.status === 'Exited' || entry.exit_time) {
          const feeAmount = entry.actual_fee || entry.calculated_fee || 0
          console.log('📊 SHIFT OVERVIEW - Revenue entry:', {
            id: entry.id,
            status: entry.status,
            actual_fee: entry.actual_fee,
            calculated_fee: entry.calculated_fee,
            feeAmount,
            previousSum: sum
          })
          return sum + feeAmount
        }
        return sum
      }, 0) || 0

      console.log('📊 SHIFT OVERVIEW - Final revenue:', totalRevenue)

      const vehiclesProcessed = parkingEntries?.length || 0

      const currentlyParked = parkingEntries?.filter(entry =>
        entry.status === 'Active'
      ).length || 0

      const completedSessions = parkingEntries?.filter(entry =>
        entry.exit_time
      ) || []

      const averageSessionTime = completedSessions.length > 0
        ? completedSessions.reduce((sum, entry) => {
            const entryTime = new Date(entry.entry_time).getTime()
            const exitTime = new Date(entry.exit_time!).getTime()
            return sum + (exitTime - entryTime)
          }, 0) / (completedSessions.length * 1000 * 60) // Convert to minutes
        : 0

      setTodayStats({
        totalRevenue,
        vehiclesProcessed,
        currentlyParked,
        averageSessionTime: Math.round(averageSessionTime)
      })
    } catch (error) {
      console.error('Error fetching today statistics:', error)
    }
  }, [linkingState.activeShiftId])

  // Calculate shift duration
  const calculateDuration = useCallback((startTime: string): string => {
    const start = new Date(startTime)
    const now = new Date()
    const diffMs = now.getTime() - start.getTime()

    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }, [])

  // Update duration every second
  useEffect(() => {
    if (!activeShift) return

    const updateDuration = () => {
      setShiftDuration(calculateDuration(activeShift.shift_start_time))
    }

    updateDuration()
    const interval = setInterval(updateDuration, 1000)

    return () => clearInterval(interval)
  }, [activeShift, calculateDuration])

  // Initialize data
  useEffect(() => {
    fetchActiveShift()
    fetchTodayStats()
  }, [fetchActiveShift, fetchTodayStats])

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Format time
  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="space-y-8">
      {/* Active Shift Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Active Shift Status</h2>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            <svg className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {activeShift ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">Employee</label>
              <div className="text-lg font-semibold text-gray-900">
                {activeShift.employee_name}
              </div>
              {activeShift.employee_phone && (
                <div className="text-sm text-gray-600">{activeShift.employee_phone}</div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">Started At</label>
              <div className="text-lg font-semibold text-gray-900">
                {formatTime(activeShift.shift_start_time)}
              </div>
              <div className="text-sm text-gray-600">
                {new Date(activeShift.shift_start_time).toLocaleDateString()}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">Duration</label>
              <div className="text-2xl font-mono font-bold text-blue-600" aria-live="polite">
                {shiftDuration}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">Opening Cash</label>
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(activeShift.opening_cash_amount ?? 0)}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Shift</h3>
            <p className="text-gray-600">Start a new shift to begin tracking operations.</p>
          </div>
        )}
      </div>

      {/* Today's Statistics */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Today's Performance</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-600">Total Revenue</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(todayStats.totalRevenue)}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-500 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0a2 2 0 01-2-2v-4a2 2 0 00-2-2H8z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-600">Vehicles Processed</p>
                <p className="text-2xl font-bold text-green-900">{todayStats.vehiclesProcessed}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-500 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-yellow-600">Currently Parked</p>
                <p className="text-2xl font-bold text-yellow-900">{todayStats.currentlyParked}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-500 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-600">Avg Session Time</p>
                <p className="text-2xl font-bold text-purple-900">{todayStats.averageSessionTime}m</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shift Linking Metrics */}
      {linkingMetrics && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Shift Linking Status</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {linkingMetrics.sessionsLinkedToday}
              </div>
              <div className="text-sm text-gray-600">Sessions Linked Today</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {linkingMetrics.paymentsLinkedToday}
              </div>
              <div className="text-sm text-gray-600">Payments Linked Today</div>
            </div>

            <div className="text-center">
              <div className={`text-2xl font-bold mb-2 ${
                linkingMetrics.linkingSuccessRate >= 95
                  ? 'text-green-600'
                  : linkingMetrics.linkingSuccessRate >= 80
                    ? 'text-yellow-600'
                    : 'text-red-600'
              }`}>
                {linkingMetrics.linkingSuccessRate}%
              </div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
          </div>

          {(linkingMetrics.unlinkedSessions > 0 || linkingMetrics.unlinkedPayments > 0) && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-yellow-800">
                  {linkingMetrics.unlinkedSessions} unlinked sessions, {linkingMetrics.unlinkedPayments} unlinked payments
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            View Reports
          </button>

          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
            </svg>
            Handover Shift
          </button>

          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            Shift Settings
          </button>
        </div>
      </div>
    </div>
  )
}

export default ShiftOverviewTab