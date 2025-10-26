import React, { useState } from 'react'
import { Card, CardHeader, CardContent, CardTitle, CardDescription, Button, Badge } from '../components/ui'
import { ReportGenerator } from '../components/reports/ReportGenerator'
import { useReportGeneration } from '../hooks/useReportGeneration'
import { formatDate } from 'date-fns'

export const ReportsPage: React.FC = () => {
  // Initialize the comprehensive report generation system
  const {
    currentReport,
    isGenerating,
    isExporting,
    error,
    performanceMetrics,
    cacheStatistics,
    clearError,
    clearCache
  } = useReportGeneration({
    enableCaching: true,
    maxCacheSize: 50,
    autoRefreshInterval: 60 * 60 * 1000 // 1 hour
  })

  const [activeView, setActiveView] = useState<'generator' | 'help'>('generator')

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <div className="space-y-6">
      {/* Fixed Page Header */}
      <div className="page-header">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Reports & Analytics
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Generate and export parking reports
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            {performanceMetrics.totalReportsGenerated > 0 && (
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {performanceMetrics.totalReportsGenerated} reports
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTime(performanceMetrics.averageGenerationTime)} avg
                </div>
              </div>
            )}

            {cacheStatistics.entries > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={clearCache}
                className="text-xs"
              >
                Clear Cache
              </Button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-medium text-red-800 dark:text-red-300">Report Generation Error</h4>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={clearError}
                className="text-xs"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* View Toggle */}
        <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveView('generator')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeView === 'generator'
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Report Generator
          </button>
          <button
            onClick={() => setActiveView('help')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeView === 'help'
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Help & Guide
          </button>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="space-y-6">
        {activeView === 'generator' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Report Generator */}
            <div className="lg:col-span-2">
              <ReportGenerator />
            </div>

            {/* Status & Performance Sidebar */}
            <div className="space-y-4">
              {/* System Status */}
              <Card className="border border-gray-200 dark:border-gray-700">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700 pb-3">
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">System Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Status</span>
                    <Badge variant={isGenerating ? "warning" : isExporting ? "secondary" : "success"}>
                      {isGenerating ? "Generating..." : isExporting ? "Exporting..." : "Ready"}
                    </Badge>
                  </div>

                  {performanceMetrics.totalReportsGenerated > 0 && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Reports</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{performanceMetrics.totalReportsGenerated}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Avg Time</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {performanceMetrics.averageGenerationTime > 0
                            ? formatTime(performanceMetrics.averageGenerationTime)
                            : 'N/A'
                          }
                        </span>
                      </div>
                    </>
                  )}

                  {cacheStatistics.entries > 0 && (
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                          {cacheStatistics.hitRate.toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Cache Hit Rate</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {cacheStatistics.entries} cached • {formatFileSize(cacheStatistics.size)}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Current Report Info */}
              {currentReport && (
                <Card className="border border-gray-200 dark:border-gray-700">
                  <CardHeader className="border-b border-gray-200 dark:border-gray-700 pb-3">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Current Report</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Type</span>
                      <Badge variant="primary">{currentReport.metadata.reportType.charAt(0).toUpperCase() + currentReport.metadata.reportType.slice(1)}</Badge>
                    </div>

                    <div className="text-sm">
                      <span className="text-gray-600 dark:text-gray-400 block mb-1">Date Range</span>
                      <div className="text-xs text-gray-900 dark:text-gray-100">
                        {formatDate(new Date(currentReport.metadata.dateRange.startDate), 'MMM dd, yyyy')} -{' '}
                        {formatDate(new Date(currentReport.metadata.dateRange.endDate), 'MMM dd, yyyy')}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Records</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{currentReport.data.sessions.length}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Revenue</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        ₹{currentReport.summary.totalRevenue.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {currentReport.metadata.generationTime && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Gen. Time</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {formatTime(currentReport.metadata.generationTime)}
                        </span>
                      </div>
                    )}

                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Generated: {formatDate(new Date(currentReport.metadata.generatedAt), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeView === 'help' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Report Types Guide */}
            <Card>
              <CardHeader>
                <CardTitle>📋 Report Types</CardTitle>
                <CardDescription>
                  Understanding different report types and their use cases
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm mb-1">Daily Report</h4>
                    <p className="text-xs text-text-muted">Single day data with hour-by-hour breakdown. Perfect for daily operations review.</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm mb-1">Weekly Report</h4>
                    <p className="text-xs text-text-muted">7-day period (Monday to Sunday) with daily summaries. Ideal for weekly performance analysis.</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm mb-1">Monthly Report</h4>
                    <p className="text-xs text-text-muted">Full calendar month with weekly breakdowns. Great for monthly business reviews.</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm mb-1">Custom Report</h4>
                    <p className="text-xs text-text-muted">User-defined date ranges with flexible data inclusion options.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export Formats Guide */}
            <Card>
              <CardHeader>
                <CardTitle>💾 Export Formats</CardTitle>
                <CardDescription>
                  Available export formats and their benefits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm mb-1">📄 PDF Export</h4>
                    <p className="text-xs text-text-muted">Professional formatted reports with charts and tables. Best for presentations and archiving.</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm mb-1">📊 Excel Export</h4>
                    <p className="text-xs text-text-muted">Spreadsheet format with multiple sheets. Perfect for data analysis and calculations.</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm mb-1">📋 CSV Export</h4>
                    <p className="text-xs text-text-muted">Simple comma-separated values. Ideal for importing into other systems.</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium text-sm mb-2">💡 Tips</h4>
                  <ul className="text-xs text-text-muted space-y-1">
                    <li>• Use PDF for official reports and sharing</li>
                    <li>• Use Excel for detailed data analysis</li>
                    <li>• Use CSV for data integration</li>
                    <li>• All exports include proper filename conventions</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Performance Features */}
            <Card>
              <CardHeader>
                <CardTitle>⚡ Performance Features</CardTitle>
                <CardDescription>
                  Built-in optimizations for better user experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm mb-1">💾 Intelligent Caching</h4>
                    <p className="text-xs text-text-muted">Historical reports are cached automatically. Real-time data for current periods.</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm mb-1">📊 Performance Tracking</h4>
                    <p className="text-xs text-text-muted">Monitor generation times, cache hit rates, and system performance.</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm mb-1">🔄 Auto-Refresh</h4>
                    <p className="text-xs text-text-muted">Today's reports refresh automatically every hour for real-time accuracy.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Troubleshooting */}
            <Card>
              <CardHeader>
                <CardTitle>🔧 Troubleshooting</CardTitle>
                <CardDescription>
                  Common issues and solutions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm mb-1">⚠️ No Data Found</h4>
                    <p className="text-xs text-text-muted">Check if there are parking entries for the selected date range.</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm mb-1">🐌 Slow Generation</h4>
                    <p className="text-xs text-text-muted">Large date ranges may take longer. Try smaller ranges or check cache status.</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm mb-1">💾 Export Issues</h4>
                    <p className="text-xs text-text-muted">Ensure browser allows downloads and check available disk space.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReportsPage