// =============================================================================
// SHIFT OVERVIEW TAB
// Real-time shift status, statistics, and quick actions
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react'
import type { ShiftLinkingMetrics } from '../../hooks/useShiftLinking'
import type { UseShiftDataReturn } from '../../hooks/useShiftData'

interface ShiftOverviewTabProps {
  shiftData: UseShiftDataReturn
  linkingMetrics: ShiftLinkingMetrics | null
  onRefresh: () => Promise<void>
  isLoading: boolean
  onNavigateToReports?: () => void
  onNavigateToOperations?: () => void
  onNavigateToSettings?: () => void
}

export const ShiftOverviewTab: React.FC<ShiftOverviewTabProps> = ({
  shiftData,
  linkingMetrics,
  onRefresh,
  isLoading,
  onNavigateToReports,
  onNavigateToOperations,
  onNavigateToSettings
}) => {
  // ✅ SIMPLIFIED: Only local state needed is shift duration timer
  const [shiftDuration, setShiftDuration] = useState<string>('00:00:00')

  // ✅ CLEAN: All data comes from centralized shiftData hook
  const {
    shift: activeShift,
    todayStats,
    totalExpenses,
    totalCashDeposits,
    currentCash,
    expensesByCategory,
    expenses
  } = shiftData

  const expenseCount = expenses.length

  // ✅ REMOVED: All data fetching - now comes from shiftData prop

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

  // ✅ SIMPLIFIED: Only update shift duration timer (UI-only state)
  useEffect(() => {
    if (!activeShift) return

    const updateDuration = () => {
      setShiftDuration(calculateDuration(activeShift.shift_start_time))
    }

    updateDuration()
    const interval = setInterval(updateDuration, 1000)

    return () => clearInterval(interval)
  }, [activeShift, calculateDuration])

  // ✅ REMOVED: Real-time subscriptions - handled by useShiftData hook
  // ✅ REMOVED: Initialize data - handled by useShiftData hook

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
              <label className="text-sm font-medium text-gray-500">Employee</label>
              <div className="text-lg font-semibold text-gray-900">
                {activeShift.employee_name}
              </div>
              {activeShift.employee_phone && (
                <div className="text-sm text-gray-600">{activeShift.employee_phone}</div>
              )}
            </div>

            <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
              <label className="text-sm font-medium text-gray-500">Started At</label>
              <div className="text-lg font-semibold text-gray-900">
                {formatTime(activeShift.shift_start_time)}
              </div>
              <div className="text-sm text-gray-600">
                {new Date(activeShift.shift_start_time).toLocaleDateString()}
              </div>
            </div>

            <div className="space-y-2 bg-blue-50 p-4 rounded-lg">
              <label className="text-sm font-medium text-gray-500">Duration</label>
              <div className="text-2xl font-mono font-bold text-blue-600" aria-live="polite">
                {shiftDuration}
              </div>
            </div>

            <div className="space-y-2 bg-green-50 p-4 rounded-lg">
              <label className="text-sm font-medium text-gray-500">Opening Cash</label>
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(activeShift.opening_cash_amount ?? 0)}
              </div>
            </div>

            <div className={`space-y-2 p-4 rounded-lg ${
              currentCash >= 0 ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <label className="text-sm font-medium text-gray-500">Current Cash on Hand</label>
              <div className={`text-lg font-semibold ${
                currentCash >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(currentCash)}
              </div>
              <div className="text-xs text-gray-500">
                Opening + Cash - Expenses - Deposits
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-6">
          {/* Cash Revenue - affects employee's cash on hand */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-500 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-600">Cash Revenue</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(todayStats.cashRevenue)}</p>
              </div>
            </div>
          </div>

          {/* Digital Revenue - goes directly to owner */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border-2 border-blue-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-600">Digital Revenue</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(todayStats.digitalRevenue)}</p>
                <p className="text-xs text-blue-500">Direct to owner</p>
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

        {/* Total Expenses - Standalone Card */}
        {activeShift && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-6 border-2 border-red-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 bg-red-500 rounded-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-red-600">Total Expenses</p>
                  <p className="text-3xl font-bold text-red-900">{formatCurrency(totalExpenses)}</p>
                </div>
              </div>
              {expenseCount > 0 && (
                <div className="text-right">
                  <p className="text-sm text-red-600 font-medium">{expenseCount} {expenseCount === 1 ? 'expense' : 'expenses'}</p>
                  <p className="text-xs text-red-500">See breakdown below</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Expense Metrics */}
      {activeShift && expenseCount > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Expense Breakdown</h2>
            <div className="text-sm text-gray-600">
              {expenseCount} {expenseCount === 1 ? 'expense' : 'expenses'} recorded
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {Object.entries(expensesByCategory).map(([category, amount]) => {
              const categoryColors = {
                'Maintenance': { bg: 'from-orange-50 to-orange-100', icon: 'bg-orange-500', text: 'text-orange-600', textBold: 'text-orange-900' },
                'Supplies': { bg: 'from-teal-50 to-teal-100', icon: 'bg-teal-500', text: 'text-teal-600', textBold: 'text-teal-900' },
                'Staff': { bg: 'from-indigo-50 to-indigo-100', icon: 'bg-indigo-500', text: 'text-indigo-600', textBold: 'text-indigo-900' },
                'Utilities': { bg: 'from-cyan-50 to-cyan-100', icon: 'bg-cyan-500', text: 'text-cyan-600', textBold: 'text-cyan-900' },
                'Other': { bg: 'from-gray-50 to-gray-100', icon: 'bg-gray-500', text: 'text-gray-600', textBold: 'text-gray-900' }
              }

              const colors = categoryColors[category as keyof typeof categoryColors] || categoryColors['Other']

              return (
                <div key={category} className={`bg-gradient-to-r ${colors.bg} rounded-lg p-4 border-2 ${colors.text.replace('text-', 'border-')}`}>
                  <div className="flex items-center">
                    <div className={`p-2 ${colors.icon} rounded-lg flex-shrink-0`}>
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="ml-3 min-w-0 flex-1">
                      <p className={`text-xs font-medium ${colors.text} truncate`}>{category}</p>
                      <p className={`text-lg font-bold ${colors.textBold}`}>{formatCurrency(amount)}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Cash on Hand</span>
              <div className="text-right">
                <div className={`text-lg font-bold ${currentCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(currentCash)}
                </div>
                <div className="text-xs text-gray-500">
                  Opening {formatCurrency(activeShift.opening_cash_amount ?? 0)} +
                  Cash {formatCurrency(todayStats.cashRevenue)} -
                  Expenses {formatCurrency(totalExpenses)} -
                  Deposits {formatCurrency(totalCashDeposits)}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Digital {formatCurrency(todayStats.digitalRevenue)} (direct to owner)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
          <button
            onClick={() => onNavigateToReports?.()}
            className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            View Reports
          </button>

          <button
            onClick={() => onNavigateToOperations?.()}
            className="flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
            </svg>
            Handover Shift
          </button>

          <button
            onClick={() => onNavigateToSettings?.()}
            className="flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
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