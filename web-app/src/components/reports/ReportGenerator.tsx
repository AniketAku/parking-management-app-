// Comprehensive Report Generation Component with Date Filtering Logic

import React, { useState, useEffect, useCallback } from 'react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { Card, CardHeader, CardContent } from '../ui'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { StatisticsChart } from '../analytics/StatisticsChart'
import { reportService } from '../../services/reportGenerationService'
import { reportExportService } from '../../services/reportExportService'
import type {
  ReportType,
  QuickSelectOption,
  DateBoundary,
  ReportGenerationResponse,
  ReportUIState,
  ExportConfig,
  DataInclusionCriteria
} from '../../types/reports'
import type { ParkingEntry } from '../../types'

interface ReportGeneratorProps {
  className?: string
  onReportGenerated?: (report: ReportGenerationResponse) => void
  defaultReportType?: ReportType
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  className = '',
  onReportGenerated,
  defaultReportType = 'daily'
}) => {
  const [state, setState] = useState<ReportUIState>({
    selectedReportType: defaultReportType,
    isGenerating: false,
    isExporting: false
  })

  const [customDateRange, setCustomDateRange] = useState<DateBoundary>({
    startDate: new Date(),
    endDate: new Date()
  })

  const [dataInclusionCriteria, setDataInclusionCriteria] = useState<DataInclusionCriteria>({
    includeActiveSessions: true,
    includeCompletedSessions: true,
    includeExpenses: true,
    includePendingPayments: true,
    includePartialPayments: true
  })

  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  // Time selection state - Initialize with current time
  const [customTimeRange, setCustomTimeRange] = useState(() => {
    const now = new Date()
    const currentTime = format(now, 'HH:mm')
    return {
      startTime: '00:00',
      endTime: currentTime
    }
  })

  // === AUTOMATIC DATE BOUNDARY CALCULATION ===
  const calculatePreviewDateRange = useCallback((
    reportType: ReportType,
    quickSelect?: QuickSelectOption
  ): DateBoundary => {
    return reportService.calculateDateBoundaries(reportType, quickSelect,
      state.selectedQuickOption === undefined ? customDateRange : undefined)
  }, [customDateRange, state.selectedQuickOption])

  const [previewDateRange, setPreviewDateRange] = useState<DateBoundary>(
    calculatePreviewDateRange(state.selectedReportType, state.selectedQuickOption)
  )

  // Update preview when selections change
  useEffect(() => {
    const newRange = calculatePreviewDateRange(state.selectedReportType, state.selectedQuickOption)
    setPreviewDateRange(newRange)
  }, [state.selectedReportType, state.selectedQuickOption, calculatePreviewDateRange])

  // === REPORT TYPE SELECTION HANDLERS ===
  const handleReportTypeChange = (type: ReportType) => {
    setState(prev => ({
      ...prev,
      selectedReportType: type,
      selectedQuickOption: undefined, // Reset quick select when changing type
      error: undefined
    }))

    // Auto-select appropriate default quick option
    switch (type) {
      case 'daily':
        setState(prev => ({ ...prev, selectedQuickOption: 'today' }))
        break
      case 'weekly':
        setState(prev => ({ ...prev, selectedQuickOption: 'this_week' }))
        break
      case 'monthly':
        setState(prev => ({ ...prev, selectedQuickOption: 'this_month' }))
        break
    }
  }

  const handleQuickSelectChange = (option: QuickSelectOption | 'custom') => {
    if (option === 'custom') {
      setState(prev => ({ ...prev, selectedQuickOption: undefined }))
    } else {
      setState(prev => ({ ...prev, selectedQuickOption: option }))
    }
  }

  // === VALIDATION RULES ===
  const validateSelection = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (state.selectedReportType === 'custom' && !state.selectedQuickOption) {
      const daysDiff = Math.ceil((customDateRange.endDate.getTime() - customDateRange.startDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysDiff > 365) {
        errors.push('Custom date range cannot exceed 1 year')
      }

      if (customDateRange.endDate <= customDateRange.startDate) {
        errors.push('End date and time must be after start date and time')
      }

      // Allow future dates - users can generate reports for any time period
    }

    // Weekly report validation
    if (state.selectedReportType === 'weekly' && state.selectedQuickOption === undefined) {
      const daysDiff = Math.ceil((customDateRange.endDate.getTime() - customDateRange.startDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff !== 6) {
        errors.push('Weekly reports must span exactly 7 days')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // === REPORT GENERATION ===
  const generateReport = async () => {
    const validation = validateSelection()
    if (!validation.isValid) {
      setState(prev => ({ ...prev, error: validation.errors.join(', ') }))
      return
    }

    setState(prev => ({ ...prev, isGenerating: true, error: undefined }))

    try {
      // Combine date and time for custom ranges
      let finalDateRange = customDateRange
      if (!state.selectedQuickOption) {
        // Create new Date objects with the selected times
        const [startHour, startMinute] = customTimeRange.startTime.split(':').map(Number)
        const [endHour, endMinute] = customTimeRange.endTime.split(':').map(Number)

        const startDateTime = new Date(customDateRange.startDate)
        startDateTime.setHours(startHour, startMinute, 0, 0)

        const endDateTime = new Date(customDateRange.endDate)
        endDateTime.setHours(endHour, endMinute, 59, 999)

        finalDateRange = {
          startDate: startDateTime,
          endDate: endDateTime
        }
      }

      const response = await reportService.generateReport({
        type: state.selectedReportType,
        dateSelection: {
          type: state.selectedReportType,
          quickSelect: state.selectedQuickOption,
          customRange: state.selectedQuickOption ? undefined : finalDateRange,
          autoCalculated: !!state.selectedQuickOption
        },
        dataInclusionCriteria
      })

      if (response.success) {
        setState(prev => ({
          ...prev,
          currentReport: response,
          lastGenerated: new Date()
        }))
        onReportGenerated?.(response)
      } else {
        setState(prev => ({ ...prev, error: response.error || 'Failed to generate report' }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }))
    } finally {
      setState(prev => ({ ...prev, isGenerating: false }))
    }
  }

  // === EXPORT FUNCTIONALITY ===
  const exportReport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!state.currentReport) {
      setState(prev => ({ ...prev, error: 'No report to export' }))
      return
    }

    setState(prev => ({ ...prev, isExporting: true }))

    try {
      const exportConfig: ExportConfig = {
        format,
        includeCharts: true,
        includeHourlyBreakdown: true,
        includeDailyBreakdown: true,
        includeWeeklyBreakdown: state.selectedReportType !== 'daily',
        includeExpenseDetails: dataInclusionCriteria.includeExpenses
      }

      const result = await reportExportService.exportReport(state.currentReport, exportConfig)

      if (result.success) {
        // Trigger download
        if (result.downloadLink) {
          const link = document.createElement('a')
          link.href = result.downloadLink
          link.download = result.fileName
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      } else {
        setState(prev => ({ ...prev, error: result.error || 'Export failed' }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Export failed'
      }))
    } finally {
      setState(prev => ({ ...prev, isExporting: false }))
    }
  }

  // === AUTOMATIC UPDATES ===
  useEffect(() => {
    if (autoRefresh && state.selectedQuickOption === 'today') {
      const interval = setInterval(() => {
        generateReport()
      }, 60 * 60 * 1000) // Refresh every hour for today's report

      setRefreshInterval(interval)

      return () => {
        if (interval) {
          clearInterval(interval)
        }
      }
    } else if (refreshInterval) {
      clearInterval(refreshInterval)
      setRefreshInterval(null)
    }
  }, [autoRefresh, state.selectedQuickOption])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [refreshInterval])

  const isDatePickerDisabled = (reportType: ReportType, quickSelect?: QuickSelectOption): boolean => {
    if (quickSelect) return true

    switch (reportType) {
      case 'daily':
        return quickSelect === 'today' || quickSelect === 'yesterday'
      case 'weekly':
        return quickSelect === 'this_week' || quickSelect === 'last_week'
      case 'monthly':
        return quickSelect === 'this_month' || quickSelect === 'last_month'
      default:
        return false
    }
  }

  // Helper function to get proper report type labels based on actual date range
  const getReportTypeLabel = (type: ReportType, dateRange?: DateBoundary): string => {
    // If we have a current report, use its date range to determine the appropriate label
    if (dateRange) {
      const startDate = new Date(dateRange.startDate)
      const endDate = new Date(dateRange.endDate)

      // Reset times to compare dates only
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(0, 0, 0, 0)

      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

      // Calculate actual days included (inclusive)
      const totalDays = daysDiff + 1

      if (totalDays === 1) {
        return 'Single Day Report'
      } else if (totalDays === 2) {
        return '2-Day Period Report'
      } else if (totalDays === 7) {
        return 'Weekly Analysis Report'
      } else if (totalDays >= 28 && totalDays <= 31) {
        return 'Monthly Financial Report'
      } else if (totalDays <= 7) {
        return `${totalDays}-Day Period Report`
      } else if (totalDays <= 30) {
        const weeks = Math.round(totalDays / 7)
        return weeks === 1 ? 'Weekly Period Report' : `${weeks}-Week Period Report`
      } else {
        const months = Math.round(totalDays / 30)
        return months === 1 ? 'Monthly Period Report' : `${months}-Month Period Report`
      }
    }

    // Fallback to original logic for selection phase
    switch (type) {
      case 'daily': return 'Daily Summary Report'
      case 'weekly': return 'Weekly Analysis Report'
      case 'monthly': return 'Monthly Financial Report'
      case 'custom': return 'Custom Period Report'
      default: return 'Report'
    }
  }

  const getQuickSelectOptions = (reportType: ReportType): { value: QuickSelectOption | 'custom'; label: string }[] => {
    const baseOptions = [
      { value: 'custom' as const, label: 'Custom Date & Time Range' }
    ]

    switch (reportType) {
      case 'daily':
        return [
          { value: 'today', label: 'Today' },
          { value: 'yesterday', label: 'Yesterday' },
          ...baseOptions
        ]
      case 'weekly':
        return [
          { value: 'this_week', label: 'This Week' },
          { value: 'last_week', label: 'Last Week' },
          { value: 'last_7_days', label: 'Last 7 Days' },
          ...baseOptions
        ]
      case 'monthly':
        return [
          { value: 'this_month', label: 'This Month' },
          { value: 'last_month', label: 'Last Month' },
          { value: 'last_30_days', label: 'Last 30 Days' },
          ...baseOptions
        ]
      case 'custom':
        return [
          { value: 'today', label: 'Today' },
          { value: 'yesterday', label: 'Yesterday' },
          { value: 'last_7_days', label: 'Last 7 Days' },
          { value: 'last_30_days', label: 'Last 30 Days' },
          { value: 'this_week', label: 'This Week' },
          { value: 'last_week', label: 'Last Week' },
          { value: 'this_month', label: 'This Month' },
          { value: 'last_month', label: 'Last Month' },
          ...baseOptions
        ]
      default:
        return baseOptions
    }
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Report Configuration */}
      <Card className="shadow-sm border border-gray-200 dark:border-gray-700">
        <CardHeader className="border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Report Configuration</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Configure and generate parking reports</p>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {/* Report Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Report Type</label>
            <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-full">
              {(['daily', 'weekly', 'monthly', 'custom'] as ReportType[]).map((type) => {
                const isSelected = state.selectedReportType === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleReportTypeChange(type)}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      isSelected
                        ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <span className="capitalize">{type}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date Selection Options */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range</label>
            <select
              value={state.selectedQuickOption || 'custom'}
              onChange={(e) => handleQuickSelectChange(e.target.value as QuickSelectOption | 'custom')}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            >
              {getQuickSelectOptions(state.selectedReportType).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Enhanced Custom Date & Time Range Picker */}
          {!state.selectedQuickOption && (
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              {/* Date Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                  <input
                    type="date"
                    value={format(customDateRange.startDate, 'yyyy-MM-dd')}
                    onChange={(e) => setCustomDateRange(prev => ({
                      ...prev,
                      startDate: new Date(e.target.value)
                    }))}
                    disabled={isDatePickerDisabled(state.selectedReportType, state.selectedQuickOption)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                  <input
                    type="date"
                    value={format(customDateRange.endDate, 'yyyy-MM-dd')}
                    onChange={(e) => setCustomDateRange(prev => ({
                      ...prev,
                      endDate: new Date(e.target.value)
                    }))}
                    disabled={isDatePickerDisabled(state.selectedReportType, state.selectedQuickOption)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
              </div>

              {/* Time Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</label>
                  <input
                    type="time"
                    value={customTimeRange.startTime}
                    onChange={(e) => setCustomTimeRange(prev => ({
                      ...prev,
                      startTime: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Time</label>
                  <input
                    type="time"
                    value={customTimeRange.endTime}
                    onChange={(e) => setCustomTimeRange(prev => ({
                      ...prev,
                      endTime: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
              </div>

              {/* Quick Time Presets */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quick Presets</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Full Day', start: '00:00', end: '23:59' },
                    { label: 'Business Hours', start: '09:00', end: '17:00' },
                    { label: 'Morning', start: '06:00', end: '12:00' },
                    { label: 'Afternoon', start: '12:00', end: '18:00' },
                    { label: 'Evening', start: '18:00', end: '23:59' }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setCustomTimeRange({ startTime: preset.start, endTime: preset.end })}
                      className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Date & Time Range Preview */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Selected Range</div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {format(previewDateRange.startDate, 'MMM d, yyyy')} {!state.selectedQuickOption && `at ${customTimeRange.startTime}`}
                {' → '}
                {format(previewDateRange.endDate, 'MMM d, yyyy')} {!state.selectedQuickOption && `at ${customTimeRange.endTime}`}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {Math.ceil((previewDateRange.endDate.getTime() - previewDateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} day(s)
              </div>
            </div>
          </div>

          {/* Data Inclusion Criteria */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Include in Report</label>
            <div className="space-y-2">
              {[
                { key: 'includeActiveSessions', label: 'Active Sessions' },
                { key: 'includeCompletedSessions', label: 'Completed Sessions' },
                { key: 'includeExpenses', label: 'Expenses' },
                { key: 'includePendingPayments', label: 'Pending Payments' }
              ].map((item) => {
                const isChecked = dataInclusionCriteria[item.key as keyof typeof dataInclusionCriteria]
                return (
                  <label
                    key={item.key}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => setDataInclusionCriteria(prev => ({
                        ...prev,
                        [item.key]: e.target.checked
                      }))}
                      className="w-4 h-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500 dark:bg-gray-700"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Auto-refresh for Today's Report */}
          {state.selectedQuickOption === 'today' && (
            <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-green-600 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500 dark:bg-gray-700"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Auto-refresh</span>
                <p className="text-xs text-gray-600 dark:text-gray-400">Updates every hour for today's data</p>
              </div>
              {autoRefresh && (
                <div className="flex items-center space-x-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">Active</span>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {state.error && (
            <div className="bg-error-50 border border-error-200 text-error-800 px-4 py-3 rounded-md">
              {state.error}
            </div>
          )}

          {/* Generate Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={generateReport}
              disabled={state.isGenerating}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state.isGenerating ? (
                <div className="flex items-center space-x-2">
                  <LoadingSpinner className="w-4 h-4" />
                  <span>Generating...</span>
                </div>
              ) : (
                'Generate Report'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Display */}
      {state.currentReport && (
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardHeader className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {getReportTypeLabel(state.currentReport.reportType, state.currentReport.dateRange)}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {format(state.currentReport.dateRange.startDate, 'MMM d, yyyy')} - {format(state.currentReport.dateRange.endDate, 'MMM d, yyyy')}
                </p>
                {state.lastGenerated && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Generated: {format(state.lastGenerated, 'MMM d, yyyy \'at\' h:mm a')}
                  </p>
                )}
              </div>

              {/* Export Buttons */}
              <div className="flex items-center gap-2">
                {[
                  { format: 'csv', label: 'CSV' },
                  { format: 'excel', label: 'Excel' },
                  { format: 'pdf', label: 'PDF' }
                ].map((exportOption) => (
                  <Button
                    key={exportOption.format}
                    onClick={() => exportReport(exportOption.format as 'csv' | 'excel' | 'pdf')}
                    disabled={state.isExporting}
                    variant="outline"
                    className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {state.isExporting ? (
                      <LoadingSpinner className="w-3 h-3" />
                    ) : (
                      exportOption.label
                    )}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Cache Information */}
            {state.currentReport.cacheInfo && (
              <div className="mb-4 p-3 bg-surface-muted rounded-md">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Data Source:</span>
                  <span className="text-text-primary font-medium">
                    {state.currentReport.metadata.dataSource === 'cached' ? 'Cached' : 'Live'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Processing Time:</span>
                  <span className="text-text-primary font-medium">
                    {state.currentReport.metadata.processingTimeMs}ms
                  </span>
                </div>
              </div>
            )}

            {/* Report Content will be rendered based on report type */}
            <ReportContent report={state.currentReport} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Report Content Component
interface ReportContentProps {
  report: ReportGenerationResponse
}

const ReportContent: React.FC<ReportContentProps> = ({ report }) => {
  const reportData = report.data as { entries: ParkingEntry[]; summary: any }
  return <DetailedReportDisplay data={reportData} />
}

// Detailed Report Display Component - Shows individual parking entries in table format
const DetailedReportDisplay: React.FC<{ data: { entries: ParkingEntry[]; summary: any } }> = ({ data }) => {
  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Sessions', value: data.summary.totalSessions, color: 'text-blue-600 dark:text-blue-400' },
          { title: 'Revenue', value: `₹${data.summary.revenue.toFixed(2)}`, color: 'text-green-600 dark:text-green-400' },
          { title: 'Active Sessions', value: data.summary.activeSessions, color: 'text-yellow-600 dark:text-yellow-400' },
          { title: 'Net Income', value: `₹${data.summary.netIncome.toFixed(2)}`, color: 'text-purple-600 dark:text-purple-400' }
        ].map((card, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{card.title}</div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Parking Entries Table */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardHeader className="border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Parking Sessions</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Detailed parking session records</p>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile view - Cards */}
          <div className="md:hidden space-y-3 p-3">
            {data.entries.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-surface-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📋</span>
                </div>
                <p className="text-lg font-medium text-text-primary">No parking entries found</p>
                <p className="text-sm text-text-muted">Try adjusting your date range or filters</p>
              </div>
            ) : (
              data.entries.map((entry, index) => (
                <div key={entry.id || index} className="bg-white dark:bg-surface-dark rounded-xl border border-border-light p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                        <span className="text-primary-600 text-lg">🚛</span>
                      </div>
                      <div>
                        <div className="font-medium text-text-primary">{entry.transportName || 'N/A'}</div>
                        <div className="text-sm text-text-muted">{entry.vehicleNumber || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-text-primary">₹{entry.parkingFee ? entry.parkingFee.toFixed(2) : '0.00'}</div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        entry.paymentStatus === 'Paid'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : entry.paymentStatus === 'Pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : entry.paymentStatus === 'Partial'
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {entry.paymentStatus || 'Pending'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-text-muted">In Time</div>
                      <div className="text-text-primary font-medium">
                        {format(new Date(entry.entryTime), 'dd/MM/yyyy HH:mm')}
                      </div>
                    </div>
                    <div>
                      <div className="text-text-muted">Out Time</div>
                      {entry.exitTime ? (
                        <div className="text-text-primary font-medium">
                          {format(new Date(entry.exitTime), 'dd/MM/yyyy HH:mm')}
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                          <span className="text-yellow-600 dark:text-yellow-400 font-medium">Active</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop view - Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-muted">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary uppercase tracking-wider">Transport Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary uppercase tracking-wider">Vehicle No.</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary uppercase tracking-wider">In Time</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary uppercase tracking-wider">Out Time</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary uppercase tracking-wider">Payment Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-text-primary uppercase tracking-wider">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {data.entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="w-16 h-16 bg-surface-muted rounded-full flex items-center justify-center">
                          <span className="text-2xl">📋</span>
                        </div>
                        <div>
                          <p className="text-lg font-medium">No parking entries found</p>
                          <p className="text-sm">Try adjusting your date range or filters</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.entries.map((entry, index) => (
                    <tr key={entry.id || index} className="hover:bg-surface-muted transition-colors duration-200">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                            <span className="text-primary-600 text-lg">🚛</span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-text-primary">{entry.transportName || 'N/A'}</div>
                            <div className="text-xs text-text-muted">{entry.driverName || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-text-primary">{entry.vehicleNumber || 'N/A'}</div>
                        <div className="text-xs text-text-muted">{entry.vehicleType || ''}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-text-primary">
                          {format(new Date(entry.entryTime), 'dd/MM/yyyy')}
                        </div>
                        <div className="text-xs text-text-muted">
                          {format(new Date(entry.entryTime), 'HH:mm')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {entry.exitTime ? (
                          <div>
                            <div className="text-sm text-text-primary">
                              {format(new Date(entry.exitTime), 'dd/MM/yyyy')}
                            </div>
                            <div className="text-xs text-text-muted">
                              {format(new Date(entry.exitTime), 'HH:mm')}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                            <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Active</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          entry.paymentStatus === 'Paid'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : entry.paymentStatus === 'Pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : entry.paymentStatus === 'Partial'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {entry.paymentStatus || 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-text-primary">
                          ₹{entry.parkingFee ? entry.parkingFee.toFixed(2) : '0.00'}
                        </div>
                        {entry.paymentType && (
                          <div className="text-xs text-text-muted">{entry.paymentType}</div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ReportGenerator