// Performance Dashboard Component
// Real-time performance monitoring and optimization insights

import React, { useState, useEffect } from 'react'
import { usePerformance, useNetworkPerformance, useBundleAnalysis, useAccessibilityPerformance } from '../../hooks/usePerformance'
import { StatusAnnouncer } from '../ui/ScreenReaderSupport'

interface PerformanceDashboardProps {
  className?: string
  autoStart?: boolean
  refreshInterval?: number
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  className = '',
  autoStart = true,
  refreshInterval = 5000,
}) => {
  const {
    metrics,
    summary,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearMetrics,
    memoryUsage,
  } = usePerformance({
    trackRenders: true,
    trackMemory: true,
    reportInterval: refreshInterval,
    componentName: 'PerformanceDashboard',
  })

  const networkPerf = useNetworkPerformance()
  const bundleInfo = useBundleAnalysis()
  const a11yPerf = useAccessibilityPerformance()

  const [activeTab, setActiveTab] = useState<'vitals' | 'network' | 'bundle' | 'accessibility' | 'memory'>('vitals')
  const [statusMessage, setStatusMessage] = useState('')

  // Auto-start monitoring
  useEffect(() => {
    if (autoStart && !isMonitoring) {
      startMonitoring()
      setStatusMessage('Performance monitoring started')
    }
  }, [autoStart, isMonitoring, startMonitoring])

  // Format bytes to human-readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  // Format milliseconds
  const formatMs = (ms: number): string => {
    return `${ms.toFixed(1)}ms`
  }

  // Get status color based on value and threshold
  const getStatusColor = (value: number, good: number, bad: number): string => {
    if (value <= good) return 'text-green-600'
    if (value <= bad) return 'text-yellow-600'
    return 'text-red-600'
  }

  // Get budget status badge
  const getBudgetBadge = (status: 'pass' | 'warn' | 'fail'): JSX.Element => {
    const colors = {
      pass: 'bg-green-100 text-green-800',
      warn: 'bg-yellow-100 text-yellow-800',
      fail: 'bg-red-100 text-red-800',
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
        {status.toUpperCase()}
      </span>
    )
  }

  const handleToggleMonitoring = () => {
    if (isMonitoring) {
      stopMonitoring()
      setStatusMessage('Performance monitoring stopped')
    } else {
      startMonitoring()
      setStatusMessage('Performance monitoring started')
    }
  }

  const handleClearMetrics = () => {
    clearMetrics()
    setStatusMessage('Performance metrics cleared')
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Performance Dashboard
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={handleToggleMonitoring}
            className={`px-4 py-2 rounded-lg font-medium focus:outline-none focus:ring-2 ${
              isMonitoring
                ? 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500'
                : 'bg-green-500 hover:bg-green-600 text-white focus:ring-green-500'
            }`}
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
          <button
            onClick={handleClearMetrics}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Clear Metrics
          </button>
        </div>
      </div>

      <StatusAnnouncer message={statusMessage} priority="polite" />

      {/* Monitoring Status */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${isMonitoring ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="font-medium">
              Monitoring: {isMonitoring ? 'Active' : 'Inactive'}
            </span>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {metrics.length} metrics collected
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-600 mb-6">
        <nav className="-mb-px flex space-x-8" role="tablist">
          {[
            { id: 'vitals', label: 'Core Web Vitals', icon: '⚡' },
            { id: 'network', label: 'Network', icon: '🌐' },
            { id: 'bundle', label: 'Bundle Analysis', icon: '📦' },
            { id: 'accessibility', label: 'Accessibility', icon: '♿' },
            { id: 'memory', label: 'Memory', icon: '🧠' },
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`py-2 px-1 border-b-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
              onClick={() => setActiveTab(tab.id as any)}
            >
              <span className="mr-2" aria-hidden="true">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Core Web Vitals */}
        {activeTab === 'vitals' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* LCP */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">Largest Contentful Paint</h3>
                {summary.budgetStatus.lcp && getBudgetBadge(summary.budgetStatus.lcp)}
              </div>
              <div className={`text-2xl font-bold ${getStatusColor(summary.averages.lcp || 0, 2500, 4000)}`}>
                {summary.averages.lcp ? formatMs(summary.averages.lcp) : 'N/A'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Good: &lt;2.5s</div>
            </div>

            {/* FID */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">First Input Delay</h3>
                {summary.budgetStatus.fid && getBudgetBadge(summary.budgetStatus.fid)}
              </div>
              <div className={`text-2xl font-bold ${getStatusColor(summary.averages.fid || 0, 100, 300)}`}>
                {summary.averages.fid ? formatMs(summary.averages.fid) : 'N/A'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Good: &lt;100ms</div>
            </div>

            {/* CLS */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">Cumulative Layout Shift</h3>
                {summary.budgetStatus.cls && getBudgetBadge(summary.budgetStatus.cls)}
              </div>
              <div className={`text-2xl font-bold ${getStatusColor(summary.averages.cls || 0, 0.1, 0.25)}`}>
                {summary.averages.cls ? summary.averages.cls.toFixed(3) : 'N/A'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Good: &lt;0.1</div>
            </div>

            {/* FCP */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">First Contentful Paint</h3>
                {summary.budgetStatus.fcp && getBudgetBadge(summary.budgetStatus.fcp)}
              </div>
              <div className={`text-2xl font-bold ${getStatusColor(summary.averages.fcp || 0, 1800, 3000)}`}>
                {summary.averages.fcp ? formatMs(summary.averages.fcp) : 'N/A'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Good: &lt;1.8s</div>
            </div>
          </div>
        )}

        {/* Network Performance */}
        {activeTab === 'network' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Total Requests</h3>
              <div className="text-2xl font-bold text-blue-600">
                {networkPerf.metrics.totalRequests}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Failed Requests</h3>
              <div className={`text-2xl font-bold ${
                networkPerf.metrics.failedRequests > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {networkPerf.metrics.failedRequests}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Average Response Time</h3>
              <div className={`text-2xl font-bold ${getStatusColor(networkPerf.metrics.averageResponseTime, 200, 1000)}`}>
                {formatMs(networkPerf.metrics.averageResponseTime)}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Fastest Request</h3>
              <div className="text-2xl font-bold text-green-600">
                {networkPerf.metrics.fastestRequest !== Infinity ? formatMs(networkPerf.metrics.fastestRequest) : 'N/A'}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Slowest Request</h3>
              <div className="text-2xl font-bold text-red-600">
                {formatMs(networkPerf.metrics.slowestRequest)}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Success Rate</h3>
              <div className={`text-2xl font-bold ${
                networkPerf.metrics.totalRequests > 0 
                  ? getStatusColor(
                      (networkPerf.metrics.failedRequests / networkPerf.metrics.totalRequests) * 100,
                      5, 10
                    )
                  : 'text-gray-400'
              }`}>
                {networkPerf.metrics.totalRequests > 0 
                  ? `${(((networkPerf.metrics.totalRequests - networkPerf.metrics.failedRequests) / networkPerf.metrics.totalRequests) * 100).toFixed(1)}%`
                  : 'N/A'
                }
              </div>
            </div>
          </div>
        )}

        {/* Bundle Analysis */}
        {activeTab === 'bundle' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Total Bundle Size</h3>
                <div className={`text-2xl font-bold ${getStatusColor(bundleInfo.totalSize, 512000, 1048576)}`}>
                  {formatBytes(bundleInfo.totalSize)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Gzipped: {formatBytes(bundleInfo.gzippedSize)}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Chunk Count</h3>
                <div className="text-2xl font-bold text-blue-600">
                  {bundleInfo.chunkCount}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Performance Score</h3>
                <div className={`text-2xl font-bold ${
                  bundleInfo.totalSize <= 512000 ? 'text-green-600' :
                  bundleInfo.totalSize <= 1048576 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {bundleInfo.totalSize <= 512000 ? 'Good' :
                   bundleInfo.totalSize <= 1048576 ? 'Fair' : 'Poor'}
                </div>
              </div>
            </div>

            {bundleInfo.largestChunks.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Largest Chunks</h3>
                <div className="space-y-2">
                  {bundleInfo.largestChunks.map((chunk, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm font-mono truncate">{chunk.name}</span>
                      <span className="text-sm font-semibold">{formatBytes(chunk.size)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Accessibility Performance */}
        {activeTab === 'accessibility' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Theme Switch Time</h3>
              <div className={`text-2xl font-bold ${getStatusColor(a11yPerf.metrics.themeSwichTime, 50, 200)}`}>
                {a11yPerf.metrics.themeSwichTime > 0 ? formatMs(a11yPerf.metrics.themeSwichTime) : 'N/A'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Good: &lt;50ms</div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Focus Delay</h3>
              <div className={`text-2xl font-bold ${getStatusColor(a11yPerf.metrics.focusDelay, 16, 50)}`}>
                {a11yPerf.metrics.focusDelay > 0 ? formatMs(a11yPerf.metrics.focusDelay) : 'N/A'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Good: &lt;16ms</div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Keyboard Response</h3>
              <div className={`text-2xl font-bold ${getStatusColor(a11yPerf.metrics.keyboardResponseTime, 16, 100)}`}>
                {a11yPerf.metrics.keyboardResponseTime > 0 ? formatMs(a11yPerf.metrics.keyboardResponseTime) : 'N/A'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Good: &lt;16ms</div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Screen Reader Delay</h3>
              <div className={`text-2xl font-bold ${getStatusColor(a11yPerf.metrics.screenReaderDelay, 100, 300)}`}>
                {a11yPerf.metrics.screenReaderDelay > 0 ? formatMs(a11yPerf.metrics.screenReaderDelay) : 'N/A'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Good: &lt;100ms</div>
            </div>
          </div>
        )}

        {/* Memory Usage */}
        {activeTab === 'memory' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Current Usage</h3>
                <div className={`text-2xl font-bold ${getStatusColor(memoryUsage.current, 52428800, 104857600)}`}>
                  {formatBytes(memoryUsage.current)}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Average Usage</h3>
                <div className="text-2xl font-bold text-blue-600">
                  {formatBytes(memoryUsage.average)}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Peak Usage</h3>
                <div className="text-2xl font-bold text-orange-600">
                  {formatBytes(memoryUsage.peak)}
                </div>
              </div>
            </div>

            {memoryUsage.history.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Memory Usage Trend</h3>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Last {memoryUsage.history.length} measurements
                </div>
                <div className="space-y-1">
                  {memoryUsage.history.slice(-10).map((measurement, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span>{new Date(measurement.timestamp).toLocaleTimeString()}</span>
                      <span className="font-mono">{formatBytes(measurement.usage)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recommendations */}
        {summary.recommendations.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
              🎯 Performance Recommendations
            </h3>
            <ul className="space-y-2">
              {summary.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start">
                  <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3" />
                  <span className="text-blue-800 dark:text-blue-200">{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default PerformanceDashboard