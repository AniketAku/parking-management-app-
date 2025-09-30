/**
 * Lazy Performance Dashboard Component
 * Optimized dashboard that loads only when needed
 */

import React, { lazy, Suspense, useState, useCallback } from 'react'
import { performanceMonitor } from '../../utils/optimizedPerformanceMonitor'

// Lazy load heavy dashboard components
const PerformanceChart = lazy(() => import('./PerformanceChart'))
const MetricsTable = lazy(() => import('./MetricsTable'))
const NetworkAnalysis = lazy(() => import('./NetworkAnalysis'))

interface LazyPerformanceDashboardProps {
  className?: string
}

export const LazyPerformanceDashboard: React.FC<LazyPerformanceDashboardProps> = ({
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'network'>('overview')
  const monitoringStatus = performanceMonitor.getStatus()

  const handleToggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  // Don't render dashboard if user is not being monitored
  if (!monitoringStatus.shouldSample) {
    return (
      <div className="text-sm text-gray-500 p-2">
        Performance monitoring disabled (not in sample)
      </div>
    )
  }

  // Collapsed state - minimal UI
  if (!isExpanded) {
    return (
      <div className={`performance-dashboard-collapsed ${className}`}>
        <button
          onClick={handleToggleExpanded}
          className="flex items-center gap-2 p-2 text-sm bg-blue-50 hover:bg-blue-100 rounded border"
          aria-expanded={false}
        >
          📊 Performance Monitor
          <span className="text-xs text-gray-600">
            ({monitoringStatus.isMonitoring ? 'Active' : 'Inactive'})
          </span>
        </button>
      </div>
    )
  }

  // Expanded state - full dashboard
  return (
    <div className={`performance-dashboard-expanded border rounded-lg bg-white shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <div>
            <h3 className="font-medium text-sm">Performance Monitor</h3>
            <div className="text-xs text-gray-600">
              Sample Rate: {(monitoringStatus.sampleRate * 100).toFixed(1)}% | 
              Session: {monitoringStatus.sessionId.slice(-6)}
            </div>
          </div>
        </div>
        <button
          onClick={handleToggleExpanded}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Collapse dashboard"
        >
          ✕
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b">
        {(['overview', 'details', 'network'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              activeTab === tab
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-sm text-gray-600">Loading...</span>
            </div>
          }
        >
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'details' && <MetricsTable />}
          {activeTab === 'network' && <NetworkAnalysis />}
        </Suspense>
      </div>
    </div>
  )
}

// Lightweight overview tab (not lazy loaded)
const OverviewTab: React.FC = () => {
  const [metrics, setMetrics] = useState(performanceMonitor.getMetrics())

  React.useEffect(() => {
    const updateMetrics = () => setMetrics(performanceMonitor.getMetrics())
    
    performanceMonitor.addListener(updateMetrics)
    
    // Periodic refresh
    const interval = setInterval(updateMetrics, 15000) // Reduced frequency for better performance
    
    return () => {
      performanceMonitor.removeListener(updateMetrics)
      clearInterval(interval)
    }
  }, [])

  const latestMetrics = metrics[metrics.length - 1]
  
  if (!latestMetrics) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No performance data available yet.</p>
        <p className="text-xs mt-1">Metrics will appear as you interact with the app.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {latestMetrics.lcp && (
          <MetricCard
            label="LCP"
            value={`${latestMetrics.lcp.toFixed(0)}ms`}
            status={latestMetrics.lcp <= 2500 ? 'good' : latestMetrics.lcp <= 4000 ? 'needs-improvement' : 'poor'}
          />
        )}
        {latestMetrics.fid && (
          <MetricCard
            label="FID"
            value={`${latestMetrics.fid.toFixed(0)}ms`}
            status={latestMetrics.fid <= 100 ? 'good' : latestMetrics.fid <= 300 ? 'needs-improvement' : 'poor'}
          />
        )}
        {latestMetrics.cls && (
          <MetricCard
            label="CLS"
            value={latestMetrics.cls.toFixed(3)}
            status={latestMetrics.cls <= 0.1 ? 'good' : latestMetrics.cls <= 0.25 ? 'needs-improvement' : 'poor'}
          />
        )}
      </div>
      
      <div className="text-xs text-gray-500">
        Last updated: {new Date(latestMetrics.timestamp).toLocaleTimeString()}
      </div>
    </div>
  )
}

// Lightweight metric card component
interface MetricCardProps {
  label: string
  value: string
  status: 'good' | 'needs-improvement' | 'poor'
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, status }) => {
  const statusColors = {
    good: 'border-green-200 bg-green-50 text-green-800',
    'needs-improvement': 'border-yellow-200 bg-yellow-50 text-yellow-800',
    poor: 'border-red-200 bg-red-50 text-red-800'
  }

  return (
    <div className={`p-3 rounded border ${statusColors[status]}`}>
      <div className="font-medium text-lg">{value}</div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  )
}

export default LazyPerformanceDashboard