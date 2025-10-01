import React, { useState, useCallback, useEffect } from 'react'
import { ShiftLinkingState, ShiftLinkingMetrics } from '../../hooks/useShiftLinking'
import { ShiftReportService, ShiftReportData } from '../../services/ShiftReportService'
import { Card, CardHeader, CardContent } from '../ui'
import { Button } from '../ui/Button'
import toast from 'react-hot-toast'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

interface ShiftReportsTabProps {
  linkingState: ShiftLinkingState
  linkingMetrics: ShiftLinkingMetrics
  onRefresh: () => Promise<void>
  isLoading: boolean
}

type ReportFormat = 'pdf' | 'excel' | 'csv'
type ReportPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'custom'

interface ReportFilters {
  period: ReportPeriod
  startDate: Date
  endDate: Date
  includeAnalytics: boolean
  includeCashReconciliation: boolean
  includeVehicleActivity: boolean
  operatorFilter?: string
}

interface ReportPreview {
  totalShifts: number
  totalRevenue: number
  totalSessions: number
  averageShiftDuration: number
  topOperator?: string
}

export const ShiftReportsTab: React.FC<ShiftReportsTabProps> = ({
  linkingState,
  linkingMetrics,
  onRefresh,
  isLoading
}) => {
  const [reportFilters, setReportFilters] = useState<ReportFilters>({
    period: 'today',
    startDate: new Date(),
    endDate: new Date(),
    includeAnalytics: true,
    includeCashReconciliation: true,
    includeVehicleActivity: true
  })
  const [reportPreview, setReportPreview] = useState<ReportPreview | null>(null)
  const [generatingReport, setGeneratingReport] = useState<ReportFormat | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [availableOperators, setAvailableOperators] = useState<string[]>([])

  // Update date range when period changes
  useEffect(() => {
    const today = new Date()
    let startDate: Date
    let endDate: Date

    switch (reportFilters.period) {
      case 'today':
        startDate = endDate = today
        break
      case 'yesterday':
        startDate = endDate = subDays(today, 1)
        break
      case 'week':
        startDate = startOfWeek(today, { weekStartsOn: 1 }) // Monday
        endDate = endOfWeek(today, { weekStartsOn: 1 })
        break
      case 'month':
        startDate = startOfMonth(today)
        endDate = endOfMonth(today)
        break
      default:
        return // Don't update for custom period
    }

    setReportFilters(prev => ({
      ...prev,
      startDate,
      endDate
    }))
  }, [reportFilters.period])

  // Load available operators and generate preview
  useEffect(() => {
    const loadData = async () => {
      try {
        setPreviewLoading(true)

        // Load operators and preview data
        const [operators, preview] = await Promise.all([
          ShiftReportService.getAvailableOperators(),
          generatePreview()
        ])

        setAvailableOperators(operators)
        setReportPreview(preview)
      } catch (error) {
        console.error('Failed to load report data:', error)
        toast.error('Failed to load report data')
      } finally {
        setPreviewLoading(false)
      }
    }

    loadData()
  }, [reportFilters])

  // Generate report preview
  const generatePreview = useCallback(async (): Promise<ReportPreview> => {
    try {
      const reportData = await ShiftReportService.generateReport({
        startDate: reportFilters.startDate,
        endDate: reportFilters.endDate,
        operatorFilter: reportFilters.operatorFilter,
        includeAnalytics: reportFilters.includeAnalytics,
        includeCashReconciliation: reportFilters.includeCashReconciliation,
        includeVehicleActivity: reportFilters.includeVehicleActivity
      })

      // Calculate preview metrics
      const totalShifts = reportData.shifts.length
      const totalRevenue = reportData.financialSummary.totalRevenue
      const totalSessions = reportData.vehicleActivity.reduce((sum, activity) => sum + activity.sessionsCount, 0)

      const averageShiftDuration = totalShifts > 0
        ? reportData.shifts.reduce((sum, shift) => sum + (shift.durationHours || 0), 0) / totalShifts
        : 0

      // Find top operator by shift count
      const operatorCounts = reportData.shifts.reduce((acc, shift) => {
        acc[shift.operatorName] = (acc[shift.operatorName] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const topOperator = Object.entries(operatorCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0]

      return {
        totalShifts,
        totalRevenue,
        totalSessions,
        averageShiftDuration,
        topOperator
      }
    } catch (error) {
      console.error('Failed to generate preview:', error)
      return {
        totalShifts: 0,
        totalRevenue: 0,
        totalSessions: 0,
        averageShiftDuration: 0
      }
    }
  }, [reportFilters])

  // Generate and download report
  const handleGenerateReport = useCallback(async (reportFormat: ReportFormat) => {
    try {
      setGeneratingReport(reportFormat)

      const filename = `shift_report_${format(reportFilters.startDate, 'yyyy-MM-dd')}_to_${format(reportFilters.endDate, 'yyyy-MM-dd')}`

      let downloadUrl: string

      switch (reportFormat) {
        case 'pdf':
          downloadUrl = await ShiftReportService.generatePDFReport({
            startDate: reportFilters.startDate,
            endDate: reportFilters.endDate,
            operatorFilter: reportFilters.operatorFilter,
            includeAnalytics: reportFilters.includeAnalytics,
            includeCashReconciliation: reportFilters.includeCashReconciliation,
            includeVehicleActivity: reportFilters.includeVehicleActivity
          }, `${filename}.pdf`)
          break

        case 'excel':
          downloadUrl = await ShiftReportService.generateExcelReport({
            startDate: reportFilters.startDate,
            endDate: reportFilters.endDate,
            operatorFilter: reportFilters.operatorFilter,
            includeAnalytics: reportFilters.includeAnalytics,
            includeCashReconciliation: reportFilters.includeCashReconciliation,
            includeVehicleActivity: reportFilters.includeVehicleActivity
          }, `${filename}.xlsx`)
          break

        case 'csv':
          downloadUrl = await ShiftReportService.generateCSVReport({
            startDate: reportFilters.startDate,
            endDate: reportFilters.endDate,
            operatorFilter: reportFilters.operatorFilter,
            includeAnalytics: reportFilters.includeAnalytics,
            includeCashReconciliation: reportFilters.includeCashReconciliation,
            includeVehicleActivity: reportFilters.includeVehicleActivity
          }, `${filename}.csv`)
          break
      }

      // Trigger download
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${filename}.${reportFormat === 'excel' ? 'xlsx' : reportFormat}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`${reportFormat.toUpperCase()} report generated successfully`)
    } catch (error) {
      console.error(`Failed to generate ${reportFormat} report:`, error)
      toast.error(`Failed to generate ${reportFormat} report`)
    } finally {
      setGeneratingReport(null)
    }
  }, [reportFilters])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Shift Reports</h2>
        <div className="text-sm text-gray-500">
          Generate comprehensive shift reports and analytics
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Report Configuration */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-900">Report Configuration</h3>
            <p className="text-sm text-gray-600">Configure report parameters and data to include</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Period Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Period
              </label>
              <select
                value={reportFilters.period}
                onChange={(e) => setReportFilters(prev => ({ ...prev, period: e.target.value as ReportPeriod }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Custom Date Range */}
            {reportFilters.period === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={format(reportFilters.startDate, 'yyyy-MM-dd')}
                    onChange={(e) => setReportFilters(prev => ({
                      ...prev,
                      startDate: new Date(e.target.value)
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={format(reportFilters.endDate, 'yyyy-MM-dd')}
                    onChange={(e) => setReportFilters(prev => ({
                      ...prev,
                      endDate: new Date(e.target.value)
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Operator Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Operator (Optional)
              </label>
              <select
                value={reportFilters.operatorFilter || ''}
                onChange={(e) => setReportFilters(prev => ({
                  ...prev,
                  operatorFilter: e.target.value || undefined
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Operators</option>
                {availableOperators.map(operator => (
                  <option key={operator} value={operator}>{operator}</option>
                ))}
              </select>
            </div>

            {/* Report Sections */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Include Sections
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={reportFilters.includeAnalytics}
                    onChange={(e) => setReportFilters(prev => ({
                      ...prev,
                      includeAnalytics: e.target.checked
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Analytics & Performance Metrics</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={reportFilters.includeCashReconciliation}
                    onChange={(e) => setReportFilters(prev => ({
                      ...prev,
                      includeCashReconciliation: e.target.checked
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Cash Reconciliation</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={reportFilters.includeVehicleActivity}
                    onChange={(e) => setReportFilters(prev => ({
                      ...prev,
                      includeVehicleActivity: e.target.checked
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Vehicle Activity Details</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Preview & Generation */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-900">Report Preview</h3>
            <p className="text-sm text-gray-600">Preview key metrics and generate reports</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preview Metrics */}
            {previewLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            ) : reportPreview ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Total Shifts</div>
                  <div className="text-xl font-bold text-blue-900">{reportPreview.totalShifts}</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">Total Revenue</div>
                  <div className="text-xl font-bold text-green-900">₹{reportPreview.totalRevenue.toLocaleString()}</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-sm text-purple-600 font-medium">Sessions</div>
                  <div className="text-xl font-bold text-purple-900">{reportPreview.totalSessions}</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="text-sm text-orange-600 font-medium">Avg Duration</div>
                  <div className="text-xl font-bold text-orange-900">{reportPreview.averageShiftDuration.toFixed(1)}h</div>
                </div>
                {reportPreview.topOperator && (
                  <div className="bg-indigo-50 p-3 rounded-lg col-span-2">
                    <div className="text-sm text-indigo-600 font-medium">Most Active Operator</div>
                    <div className="text-lg font-bold text-indigo-900">{reportPreview.topOperator}</div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Date Range Display */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600 font-medium">Report Period</div>
              <div className="text-base font-semibold text-gray-900">
                {format(reportFilters.startDate, 'MMM dd, yyyy')} - {format(reportFilters.endDate, 'MMM dd, yyyy')}
              </div>
            </div>

            {/* Generate Buttons */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Generate Report</h4>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => handleGenerateReport('pdf')}
                  disabled={generatingReport === 'pdf'}
                  className="bg-red-600 hover:bg-red-700 text-xs py-2"
                >
                  {generatingReport === 'pdf' ? 'Generating...' : 'PDF'}
                </Button>
                <Button
                  onClick={() => handleGenerateReport('excel')}
                  disabled={generatingReport === 'excel'}
                  className="bg-green-600 hover:bg-green-700 text-xs py-2"
                >
                  {generatingReport === 'excel' ? 'Generating...' : 'Excel'}
                </Button>
                <Button
                  onClick={() => handleGenerateReport('csv')}
                  disabled={generatingReport === 'csv'}
                  className="bg-blue-600 hover:bg-blue-700 text-xs py-2"
                >
                  {generatingReport === 'csv' ? 'Generating...' : 'CSV'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Report Actions */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Quick Reports</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button
              onClick={() => {
                setReportFilters({
                  ...reportFilters,
                  period: 'today',
                  includeAnalytics: true,
                  includeCashReconciliation: true,
                  includeVehicleActivity: false
                })
                handleGenerateReport('pdf')
              }}
              variant="secondary"
              className="flex flex-col items-center p-4 h-auto"
            >
              <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm">Daily Summary</span>
            </Button>

            <Button
              onClick={() => {
                setReportFilters({
                  ...reportFilters,
                  period: 'week',
                  includeAnalytics: true,
                  includeCashReconciliation: false,
                  includeVehicleActivity: true
                })
                handleGenerateReport('excel')
              }}
              variant="secondary"
              className="flex flex-col items-center p-4 h-auto"
            >
              <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="text-sm">Weekly Analytics</span>
            </Button>

            <Button
              onClick={() => {
                setReportFilters({
                  ...reportFilters,
                  period: 'month',
                  includeAnalytics: false,
                  includeCashReconciliation: true,
                  includeVehicleActivity: false
                })
                handleGenerateReport('excel')
              }}
              variant="secondary"
              className="flex flex-col items-center p-4 h-auto"
            >
              <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span className="text-sm">Monthly Finance</span>
            </Button>

            <Button
              onClick={() => {
                setReportFilters({
                  ...reportFilters,
                  period: 'today',
                  includeAnalytics: false,
                  includeCashReconciliation: false,
                  includeVehicleActivity: true
                })
                handleGenerateReport('csv')
              }}
              variant="secondary"
              className="flex flex-col items-center p-4 h-auto"
            >
              <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm">Vehicle Data</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ShiftReportsTab