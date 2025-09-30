import React, { useState } from 'react'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
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
      <div className="sticky-stats">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">
              Reports & Export
            </h1>
            <p className="text-text-muted mt-1">
              Generate comprehensive parking reports with automatic date filtering and export options
            </p>
          </div>

          {/* Performance Metrics Summary */}
          <div className="flex items-center space-x-3">
            {performanceMetrics.totalReportsGenerated > 0 && (
              <div className="text-right text-sm">
                <div className="font-medium text-text-primary">
                  {performanceMetrics.totalReportsGenerated} reports
                </div>
                <div className="text-text-muted">
                  {formatTime(performanceMetrics.averageGenerationTime)} avg
                </div>
              </div>
            )}

            {/* Quick Actions */}
            {cacheStatistics.entries > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={clearCache}
                className="flex items-center space-x-2"
              >
                <span>🗑️</span>
                <span>Clear Cache</span>
              </Button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 text-red-600 mt-0.5">
                      ⚠️
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-red-800">Report Generation Error</h4>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearError}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}


        {/* View Toggle - Always visible */}
        <div className="mt-6">
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveView('generator')}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeView === 'generator'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>📝</span>
              <span>Report Generator</span>
            </button>
            <button
              onClick={() => setActiveView('help')}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeView === 'help'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>❓</span>
              <span>Help & Guide</span>
            </button>
          </div>
        </div>
      </div>


      {/* Scrollable Content Area */}
      <div className="space-y-6">
        {activeView === 'generator' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Report Generator */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>📊</span>
                    <span>Generate New Report</span>
                  </CardTitle>
                  <CardDescription>
                    Create detailed parking reports with automatic date filtering, data inclusion options, and multiple export formats
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ReportGenerator />
                </CardContent>
              </Card>
            </div>

            {/* Status & Performance Sidebar */}
            <div className="space-y-6">
              {/* System Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>⚡</span>
                    <span>System Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Status</span>
                    <Badge variant={isGenerating ? "warning" : isExporting ? "secondary" : "success"}>
                      {isGenerating ? "Generating..." : isExporting ? "Exporting..." : "Ready"}
                    </Badge>
                  </div>

                  {performanceMetrics.totalReportsGenerated > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Reports Generated</span>
                        <span className="font-semibold text-primary-600">{performanceMetrics.totalReportsGenerated}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Average Time</span>
                        <span className="font-semibold text-success-600">
                          {performanceMetrics.averageGenerationTime > 0
                            ? formatTime(performanceMetrics.averageGenerationTime)
                            : 'N/A'
                          }
                        </span>
                      </div>
                    </>
                  )}

                  {cacheStatistics.entries > 0 && (
                    <div className="pt-4 border-t border-border-light">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary-600">
                          {cacheStatistics.hitRate.toFixed(0)}%
                        </div>
                        <div className="text-text-muted text-sm">Cache Hit Rate</div>
                      </div>
                      <div className="text-center text-xs text-text-muted mt-2">
                        {cacheStatistics.entries} cached • {formatFileSize(cacheStatistics.size)}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Current Report Info */}
              {currentReport && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-base">
                      <span>📄</span>
                      <span>Current Report</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">Type</span>
                      <Badge variant="primary">{currentReport.metadata.reportType.charAt(0).toUpperCase() + currentReport.metadata.reportType.slice(1)}</Badge>
                    </div>

                    <div className="text-sm">
                      <span className="text-text-secondary">Date Range</span>
                      <div className="font-medium text-xs mt-1">
                        {formatDate(new Date(currentReport.metadata.dateRange.startDate), 'MMM dd, yyyy')} -{' '}
                        {formatDate(new Date(currentReport.metadata.dateRange.endDate), 'MMM dd, yyyy')}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">Records</span>
                      <span className="font-medium">{currentReport.data.sessions.length}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">Total Revenue</span>
                      <span className="font-medium text-green-600">
                        ₹{currentReport.summary.totalRevenue.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {currentReport.metadata.generationTime && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">Generation Time</span>
                        <span className="font-medium">
                          {formatTime(currentReport.metadata.generationTime)}
                        </span>
                      </div>
                    )}

                    <div className="pt-3 border-t">
                      <div className="text-xs text-text-muted">
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