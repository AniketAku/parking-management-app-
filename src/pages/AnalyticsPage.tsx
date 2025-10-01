import React, { useState } from 'react'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui'
import {
  RevenueAnalytics,
  OccupancyAnalytics,
  BusinessIntelligenceSystem,
  OptimizedAnalyticsDashboard,
  DailyAnalytics,
  StatisticsChart
} from '../components/analytics'
import { useAnalyticsData } from '../hooks/useAnalyticsData'
import { useUserRole } from '../hooks/useUserRole'
import type { ParkingEntry } from '../types'

export const AnalyticsPage: React.FC = () => {
  const { entries, loading, error } = useAnalyticsData()
  const { role, permissions } = useUserRole()
  const [activeView, setActiveView] = useState<'overview' | 'revenue' | 'occupancy' | 'intelligence' | 'daily'>('overview')

  // Filter for access control
  if (!permissions.canAccessAdvancedAnalytics) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-text-primary mb-2">Access Restricted</h2>
          <p className="text-text-muted">You don't have permission to view analytics.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Fixed Page Header */}
      <div className="sticky-stats">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
              Analytics & Insights
            </h1>
            <p className="text-text-muted mt-1">
              Comprehensive data visualization and business intelligence for parking operations
            </p>
          </div>

          {/* Quick Stats Summary */}
          {!loading && entries.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Badge variant="secondary" className="flex items-center gap-1">
                📊 Total Entries: {entries.length}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                🚗 Active: {entries.filter(e => !e.exitTime).length}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                💰 Revenue: ₹{entries.reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString('en-IN')}
              </Badge>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 text-red-600 mt-0.5">⚠️</div>
                  <div>
                    <h4 className="text-sm font-medium text-red-800">Data Loading Error</h4>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* View Toggle */}
        <div className="mt-4">
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
            <button
              onClick={() => setActiveView('overview')}
              className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeView === 'overview'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>🏠</span>
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveView('revenue')}
              className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeView === 'revenue'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>💰</span>
              <span>Revenue</span>
            </button>
            <button
              onClick={() => setActiveView('occupancy')}
              className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeView === 'occupancy'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>🚗</span>
              <span>Occupancy</span>
            </button>
            <button
              onClick={() => setActiveView('intelligence')}
              className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeView === 'intelligence'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>🧠</span>
              <span>Intelligence</span>
            </button>
            <button
              onClick={() => setActiveView('daily')}
              className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeView === 'daily'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>📅</span>
              <span>Daily</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-text-muted">Loading analytics data...</p>
          </div>
        ) : (
          <>
            {/* Overview View - Advanced Dashboard */}
            {activeView === 'overview' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <span>🏠</span>
                      <span>Analytics Overview</span>
                    </CardTitle>
                    <CardDescription>
                      Comprehensive overview of your parking operations with advanced metrics and insights
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <OptimizedAnalyticsDashboard
                      entries={entries}
                      loading={loading}
                      error={error}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Revenue Analytics View */}
            {activeView === 'revenue' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <span>💰</span>
                      <span>Revenue Analytics</span>
                    </CardTitle>
                    <CardDescription>
                      Detailed revenue analysis, trends, and financial performance metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RevenueAnalytics loading={loading} />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Occupancy Analytics View */}
            {activeView === 'occupancy' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <span>🚗</span>
                      <span>Occupancy Analytics</span>
                    </CardTitle>
                    <CardDescription>
                      Space utilization, peak hours analysis, and capacity optimization insights
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <OccupancyAnalytics loading={loading} />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Business Intelligence View */}
            {activeView === 'intelligence' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <span>🧠</span>
                      <span>Business Intelligence</span>
                    </CardTitle>
                    <CardDescription>
                      AI-powered insights, predictive analytics, and strategic business recommendations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BusinessIntelligenceSystem />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Daily Analytics View */}
            {activeView === 'daily' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <span>📅</span>
                      <span>Daily Analytics</span>
                    </CardTitle>
                    <CardDescription>
                      Day-by-day breakdown of parking operations, trends, and performance metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DailyAnalytics />
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && entries.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">No Data Available</h3>
            <p className="text-text-muted mb-4">
              Start recording parking entries to see analytics and insights.
            </p>
            <Button
              onClick={() => window.location.href = '/entry'}
              className="inline-flex items-center space-x-2"
            >
              <span>🚗</span>
              <span>Add Vehicle Entry</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AnalyticsPage