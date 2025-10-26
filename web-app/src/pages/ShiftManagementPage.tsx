// =============================================================================
// SHIFT MANAGEMENT PAGE
// Consolidated Shift Management Interface - All Shift Operations in One View
// =============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useShiftLinking } from '../hooks/useShiftLinking'
import { useShiftData } from '../hooks/useShiftData'
import { ConnectionStatus } from '../components/common/ConnectionStatus'
import type { ShiftSession, ShiftStatistics } from '../types/database'
import { log } from '../utils/secureLogger'

// Tab Components (to be implemented)
import { ShiftOverviewTab } from '../components/shift/ShiftOverviewTab'
import { ShiftOperationsTab } from '../components/shift/ShiftOperationsTab'
import { ExpenseTab } from '../components/shift/ExpenseTab'
import { DepositsTab } from '../components/shift/DepositsTab'
import { ShiftReportsTab } from '../components/shift/ShiftReportsTab'
import { ShiftHistoryTab } from '../components/shift/ShiftHistoryTab'
import { ShiftSettingsTab } from '../components/shift/ShiftSettingsTab'

// Types for tab management
type ShiftTab = 'overview' | 'operations' | 'expenses' | 'deposits' | 'reports' | 'history' | 'settings'

interface TabConfig {
  id: ShiftTab
  label: string
  icon: React.ReactNode
  description: string
}

export const ShiftManagementPage: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState<ShiftTab>('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Shift linking hook for metrics and operations
  const {
    state: linkingState,
    metrics: linkingMetrics,
    refreshMetrics,
    clearCache,
    clearErrors
  } = useShiftLinking()

  // ✅ NEW: Centralized shift data hook (eliminates duplicate queries)
  const shiftData = useShiftData(linkingState.activeShiftId)

  // Tab configuration
  const tabs: TabConfig[] = useMemo(() => [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      description: 'Current shift status and real-time statistics'
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
      ),
      description: 'Start, end, and handover shift operations'
    },
    {
      id: 'expenses',
      label: 'Expenses',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      description: 'Track shift expenses and manage costs'
    },
    {
      id: 'deposits',
      label: 'Deposits',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      description: 'Daily deposits to owner with role-based access'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      description: 'Generate and export detailed shift reports'
    },
    {
      id: 'history',
      label: 'History',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      description: 'View past shift sessions and performance analytics'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      description: 'Configure shift settings and preferences'
    }
  ], [])

  // ✅ FIX: Initialize component (fix race condition with empty dependency array)
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Clear any previous errors and refresh metrics
        clearErrors()
        await refreshMetrics()

        log.info('Shift Management Page initialized successfully')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize shift management'
        setError(errorMessage)
        log.error('Shift Management initialization error', err)
      } finally {
        setIsLoading(false)
      }
    }

    initialize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // ✅ Empty array - only run once on mount

  // ✅ FIX: Handle tab change (no arbitrary refresh needed - real-time subscriptions handle updates)
  const handleTabChange = useCallback((tabId: ShiftTab) => {
    setActiveTab(tabId)
  }, [])

  // ✅ NEW: Unified refresh handler
  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refreshMetrics(),
      shiftData.refreshData()
    ])
  }, [refreshMetrics, shiftData])

  // ✅ NEW: Render active tab content with clean props (no more duplicate data fetching)
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <ShiftOverviewTab
          shiftData={shiftData}
          linkingMetrics={linkingMetrics}
          onRefresh={handleRefresh}
          isLoading={isLoading || shiftData.loading}
          onNavigateToReports={() => setActiveTab('reports')}
          onNavigateToOperations={() => setActiveTab('operations')}
          onNavigateToSettings={() => setActiveTab('settings')}
        />
      case 'operations':
        return <ShiftOperationsTab
          linkingState={linkingState}
          linkingMetrics={linkingMetrics}
          onRefresh={handleRefresh}
          isLoading={isLoading}
        />
      case 'expenses':
        return <ExpenseTab
          shiftData={shiftData}
          onRefresh={handleRefresh}
          isLoading={isLoading || shiftData.loading}
        />
      case 'deposits':
        return <DepositsTab
          shiftData={shiftData}
          onRefresh={handleRefresh}
          isLoading={isLoading || shiftData.loading}
        />
      case 'reports':
        return <ShiftReportsTab
          linkingState={linkingState}
          linkingMetrics={linkingMetrics}
          onRefresh={handleRefresh}
          isLoading={isLoading}
        />
      case 'history':
        return <ShiftHistoryTab
          linkingState={linkingState}
          linkingMetrics={linkingMetrics}
          onRefresh={handleRefresh}
          isLoading={isLoading}
        />
      case 'settings':
        return <ShiftSettingsTab
          linkingState={linkingState}
          linkingMetrics={linkingMetrics}
          onRefresh={handleRefresh}
          isLoading={isLoading}
        />
      default:
        return <ShiftOverviewTab
          shiftData={shiftData}
          linkingMetrics={linkingMetrics}
          onRefresh={handleRefresh}
          isLoading={isLoading || shiftData.loading}
          onNavigateToReports={() => setActiveTab('reports')}
          onNavigateToOperations={() => setActiveTab('operations')}
          onNavigateToSettings={() => setActiveTab('settings')}
        />
    }
  }

  // Loading state
  if (isLoading && !linkingState.activeShiftId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" role="status" aria-live="polite">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-2/3 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
          <span className="sr-only">Loading shift management dashboard...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md" role="alert">
          <div className="flex items-center mb-4">
            <div className="bg-red-100 rounded-full p-2 mr-3">
              <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800">Initialization Error</h2>
          </div>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header - Mobile-friendly sticky (desktop only) */}
      <div className="bg-white border-b border-gray-200 lg:sticky lg:top-0 lg:z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Shift Management
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Comprehensive shift operations and analytics
              </p>
            </div>

            {/* Connection Status */}
            <div className="flex items-center space-x-4">
              <ConnectionStatus showLastUpdate={true} />
              {linkingState.activeShiftId && (
                <div className="flex items-center space-x-2 bg-green-100 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-green-800">
                    Active Shift
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" role="tablist" aria-label="Shift management sections">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`${tab.id}-panel`}
                onClick={() => handleTabChange(tab.id)}
                className={`group relative py-4 px-1 border-b-2 font-medium text-sm focus:outline-none transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className={`transition-colors ${
                    activeTab === tab.id ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                  }`}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </div>

                {/* Tooltip */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {tab.description}
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div
          id={`${activeTab}-panel`}
          role="tabpanel"
          aria-labelledby={`${activeTab}-tab`}
          className="focus:outline-none"
        >
          {renderTabContent()}
        </div>
      </main>
    </div>
  )
}

export default ShiftManagementPage