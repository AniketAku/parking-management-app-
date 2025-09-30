// Comprehensive Report Generation Component with Date Filtering Logic

import React, { useState, useEffect, useCallback } from 'react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { StatisticsChart } from '../analytics/StatisticsChart'
import { reportService } from '../../services/reportGenerationService'
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

      const result = await reportService.exportReport(state.currentReport, exportConfig)

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
      <Card className="overflow-hidden shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-b">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl">📊</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary">Report Generator</h2>
              <p className="text-text-secondary">Generate comprehensive parking reports with advanced filtering and analytics</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 p-8">
          {/* Report Type Selection */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <span className="text-primary-600 text-lg">📈</span>
              </div>
              <label className="text-xl font-semibold text-text-primary">Report Type</label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              {(['daily', 'weekly', 'monthly', 'custom'] as ReportType[]).map((type) => {
                const isSelected = state.selectedReportType === type
                const icons = { daily: '📅', weekly: '📊', monthly: '📈', custom: '🔧' }
                const descriptions = {
                  daily: 'Single day insights',
                  weekly: '7-day analysis',
                  monthly: 'Monthly overview',
                  custom: 'Flexible periods'
                }

                return (
                  <label
                    key={type}
                    className={`group relative flex flex-col p-3 md:p-6 border-2 rounded-xl md:rounded-2xl cursor-pointer transition-all duration-300 ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-xl shadow-primary-500/25 scale-[1.02]'
                        : 'border-border-light hover:border-primary-300 hover:bg-surface-muted hover:shadow-lg hover:scale-[1.01]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportType"
                      value={type}
                      checked={isSelected}
                      onChange={(e) => handleReportTypeChange(e.target.value as ReportType)}
                      className="sr-only"
                    />

                    {/* Icon and Title */}
                    <div className="flex items-center space-x-2 md:space-x-3 mb-2 md:mb-3">
                      <div className={`w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-xl flex items-center justify-center text-lg md:text-2xl transition-all duration-300 ${
                        isSelected
                          ? 'bg-primary-500 text-white shadow-lg'
                          : 'bg-surface-muted group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30'
                      }`}>
                        {icons[type]}
                      </div>
                      <div className="flex-1">
                        <div className={`font-bold text-sm md:text-lg capitalize transition-colors ${
                          isSelected ? 'text-primary-600' : 'text-text-primary'
                        }`}>
                          {type}
                        </div>
                        <div className="text-xs md:text-sm text-text-muted hidden md:block">{descriptions[type]}</div>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="text-sm text-text-secondary">{getReportTypeLabel(type)}</div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute -top-3 -right-3 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white text-lg">✓</span>
                      </div>
                    )}

                    {/* Hover Effect */}
                    <div className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${
                      isSelected ? 'opacity-0' : 'opacity-0 group-hover:opacity-5'
                    } bg-primary-500`} />
                  </label>
                )
              })}
            </div>
          </div>

          {/* Date Selection Options */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <span className="text-primary-600 text-lg">📅</span>
              </div>
              <label className="text-xl font-semibold text-text-primary">Date Selection</label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getQuickSelectOptions(state.selectedReportType).map((option) => {
                const isSelected = (option.value === 'custom' && !state.selectedQuickOption) || state.selectedQuickOption === option.value
                const dateIcons = {
                  today: '🎯',
                  yesterday: '⏪',
                  this_week: '📊',
                  last_week: '📉',
                  this_month: '📈',
                  last_month: '📋',
                  last_7_days: '🗓️',
                  last_30_days: '📆',
                  custom: '🔧'
                }

                return (
                  <label
                    key={option.value}
                    className={`group relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg'
                        : 'border-border-light hover:border-primary-300 hover:bg-surface-muted hover:shadow-md'
                    }`}
                  >
                    <input
                      type="radio"
                      name="quickSelect"
                      value={option.value}
                      checked={isSelected}
                      onChange={(e) => handleQuickSelectChange(e.target.value as QuickSelectOption | 'custom')}
                      className="sr-only"
                    />
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg mr-3 transition-all duration-200 ${
                      isSelected
                        ? 'bg-primary-500 text-white'
                        : 'bg-surface-muted group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30'
                    }`}>
                      {dateIcons[option.value as keyof typeof dateIcons] || '📅'}
                    </div>
                    <span className={`font-medium transition-colors ${
                      isSelected ? 'text-primary-600' : 'text-text-primary'
                    }`}>
                      {option.label}
                    </span>
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">✓</span>
                      </div>
                    )}
                  </label>
                )
              })}
            </div>
          </div>

          {/* Enhanced Custom Date & Time Range Picker */}
          {!state.selectedQuickOption && (
            <div className="space-y-6">
              {/* Section Header */}
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-primary-600 text-lg">🔧</span>
                </div>
                <label className="text-xl font-semibold text-text-primary">Custom Date & Time Range</label>
              </div>

              {/* Date Range Card */}
              <Card className="bg-gradient-to-br from-surface-light to-surface-muted border-2 border-primary-200 dark:border-primary-700">
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Date Selection */}
                    <div>
                      <h4 className="text-lg font-semibold text-text-primary mb-4 flex items-center space-x-2">
                        <span className="text-primary-500">📅</span>
                        <span>Date Range</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-text-primary">Start Date</label>
                          <div className="relative">
                            <input
                              type="date"
                              value={format(customDateRange.startDate, 'yyyy-MM-dd')}
                              onChange={(e) => setCustomDateRange(prev => ({
                                ...prev,
                                startDate: new Date(e.target.value)
                              }))}
                              disabled={isDatePickerDisabled(state.selectedReportType, state.selectedQuickOption)}
                              className="w-full px-4 py-3 border-2 border-border-light rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white dark:bg-surface-dark text-text-primary shadow-sm hover:shadow-md"
                            />
                            <div className="absolute right-3 top-3 text-primary-400 pointer-events-none">
                              <span className="text-lg">📅</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-text-primary">End Date</label>
                          <div className="relative">
                            <input
                              type="date"
                              value={format(customDateRange.endDate, 'yyyy-MM-dd')}
                              onChange={(e) => setCustomDateRange(prev => ({
                                ...prev,
                                endDate: new Date(e.target.value)
                              }))}
                              disabled={isDatePickerDisabled(state.selectedReportType, state.selectedQuickOption)}
                              className="w-full px-4 py-3 border-2 border-border-light rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white dark:bg-surface-dark text-text-primary shadow-sm hover:shadow-md"
                            />
                            <div className="absolute right-3 top-3 text-primary-400 pointer-events-none">
                              <span className="text-lg">📅</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Time Selection */}
                    <div>
                      <h4 className="text-lg font-semibold text-text-primary mb-4 flex items-center space-x-2">
                        <span className="text-primary-500">🕒</span>
                        <span>Time Range</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-text-primary">Start Time</label>
                          <div className="relative">
                            <input
                              type="time"
                              value={customTimeRange.startTime}
                              onChange={(e) => setCustomTimeRange(prev => ({
                                ...prev,
                                startTime: e.target.value
                              }))}
                              className="w-full px-4 py-3 border-2 border-border-light rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white dark:bg-surface-dark text-text-primary shadow-sm hover:shadow-md"
                            />
                            <div className="absolute right-3 top-3 text-primary-400 pointer-events-none">
                              <span className="text-lg">🕒</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-text-primary">End Time</label>
                          <div className="relative">
                            <input
                              type="time"
                              value={customTimeRange.endTime}
                              onChange={(e) => setCustomTimeRange(prev => ({
                                ...prev,
                                endTime: e.target.value
                              }))}
                              className="w-full px-4 py-3 border-2 border-border-light rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white dark:bg-surface-dark text-text-primary shadow-sm hover:shadow-md"
                            />
                            <div className="absolute right-3 top-3 text-primary-400 pointer-events-none">
                              <span className="text-lg">🕒</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Time Presets */}
                    <div>
                      <h5 className="text-sm md:text-md font-medium text-text-primary mb-3">Quick Time Presets</h5>
                      <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
                        {[
                          { label: 'Full Day', start: '00:00', end: '23:59' },
                          { label: 'Business Hours', start: '09:00', end: '17:00' },
                          { label: 'Morning', start: '06:00', end: '12:00' },
                          { label: 'Afternoon', start: '12:00', end: '18:00' },
                          { label: 'Evening', start: '18:00', end: '23:59' }
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => setCustomTimeRange({ startTime: preset.start, endTime: preset.end })}
                            className="px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-800/40 transition-colors duration-200 font-medium text-center"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Enhanced Date & Time Range Preview */}
          <Card className="bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border-2 border-primary-200 dark:border-primary-700 shadow-lg">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-start space-x-3 md:space-x-4">
                <div className="w-8 h-8 md:w-12 md:h-12 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <span className="text-white text-lg md:text-2xl">📊</span>
                </div>
                <div className="flex-1 space-y-2 md:space-y-3">
                  <h4 className="text-base md:text-lg font-bold text-primary-700 dark:text-primary-300 flex items-center space-x-2">
                    <span className="text-sm md:text-base">📅</span>
                    <span>Selected Date & Time Range</span>
                  </h4>

                  {/* Date Range Display */}
                  <div className="bg-white dark:bg-surface-dark p-3 md:p-4 rounded-xl border border-primary-200 dark:border-primary-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">From:</span>
                      <span className="text-text-primary font-medium">
                        {format(previewDateRange.startDate, 'EEEE, MMMM d, yyyy')}
                        <span className="text-primary-500 ml-2">
                          {!state.selectedQuickOption ? `at ${customTimeRange.startTime}` : 'at 00:00'}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">To:</span>
                      <span className="text-text-primary font-medium">
                        {format(previewDateRange.endDate, 'EEEE, MMMM d, yyyy')}
                        <span className="text-primary-500 ml-2">
                          {!state.selectedQuickOption ? `at ${customTimeRange.endTime}` : 'at 23:59'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
                      <span className="text-text-primary font-medium">
                        {Math.ceil((previewDateRange.endDate.getTime() - previewDateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} day(s)
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-text-muted">
                        {!state.selectedQuickOption ?
                          `Custom time: ${customTimeRange.startTime} - ${customTimeRange.endTime}` :
                          'Full day (00:00 - 23:59)'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Data Inclusion Criteria */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <span className="text-primary-600 text-lg">🎯</span>
              </div>
              <label className="text-xl font-semibold text-text-primary">Data Inclusion Criteria</label>
            </div>

            <Card className="bg-gradient-to-br from-surface-light to-surface-muted border-2 border-primary-200 dark:border-primary-700">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { key: 'includeActiveSessions', label: 'Active Sessions', icon: '🟢', description: 'Include currently active parking sessions' },
                    { key: 'includeCompletedSessions', label: 'Completed Sessions', icon: '✅', description: 'Include finished parking sessions' },
                    { key: 'includeExpenses', label: 'Expenses', icon: '💰', description: 'Include operational expenses' },
                    { key: 'includePendingPayments', label: 'Pending Payments', icon: '⏳', description: 'Include payments awaiting processing' }
                  ].map((item) => {
                    const isChecked = dataInclusionCriteria[item.key as keyof typeof dataInclusionCriteria]
                    return (
                      <label
                        key={item.key}
                        className={`group relative flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                          isChecked
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg'
                            : 'border-border-light hover:border-primary-300 hover:bg-surface-muted hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center space-x-4 w-full">
                          {/* Custom Checkbox */}
                          <div className={`relative w-6 h-6 rounded-lg border-2 transition-all duration-200 ${
                            isChecked
                              ? 'border-primary-500 bg-primary-500'
                              : 'border-border-light group-hover:border-primary-300'
                          }`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => setDataInclusionCriteria(prev => ({
                                ...prev,
                                [item.key]: e.target.checked
                              }))}
                              className="sr-only"
                            />
                            {isChecked && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-white text-sm font-bold">✓</span>
                              </div>
                            )}
                          </div>

                          {/* Icon and Content */}
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all duration-200 ${
                            isChecked
                              ? 'bg-primary-500 text-white shadow-lg'
                              : 'bg-surface-muted group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30'
                          }`}>
                            {item.icon}
                          </div>

                          <div className="flex-1">
                            <div className={`font-semibold transition-colors ${
                              isChecked ? 'text-primary-600' : 'text-text-primary'
                            }`}>
                              {item.label}
                            </div>
                            <div className="text-sm text-text-muted mt-1">{item.description}</div>
                          </div>
                        </div>

                        {/* Selection Indicator */}
                        {isChecked && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </label>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Auto-refresh for Today's Report */}
          {state.selectedQuickOption === 'today' && (
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700">
              <CardContent className="p-6">
                <label className="group flex items-center space-x-4 cursor-pointer">
                  {/* Custom Toggle Switch */}
                  <div className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                    autoRefresh ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}>
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
                      autoRefresh ? 'transform translate-x-6' : ''
                    }`}></div>
                  </div>

                  {/* Icon and Text */}
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all duration-200 ${
                      autoRefresh
                        ? 'bg-green-500 text-white shadow-lg'
                        : 'bg-surface-muted group-hover:bg-green-100 dark:group-hover:bg-green-900/30'
                    }`}>
                      🔄
                    </div>
                    <div>
                      <div className={`font-semibold transition-colors ${
                        autoRefresh ? 'text-green-600 dark:text-green-400' : 'text-text-primary'
                      }`}>
                        Auto-refresh Report
                      </div>
                      <div className="text-sm text-text-muted">Automatically updates every hour for today's data</div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  {autoRefresh && (
                    <div className="ml-auto flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-green-600 dark:text-green-400 font-medium">Active</span>
                    </div>
                  )}
                </label>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {state.error && (
            <div className="bg-error-50 border border-error-200 text-error-800 px-4 py-3 rounded-md">
              {state.error}
            </div>
          )}

          {/* Enhanced Generate Button */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={generateReport}
              disabled={state.isGenerating}
              className={`px-6 py-3 md:px-8 md:py-4 text-base md:text-lg font-semibold rounded-xl shadow-lg transition-all duration-300 transform ${
                state.isGenerating
                  ? 'scale-95 opacity-75'
                  : 'hover:scale-105 hover:shadow-xl'
              } bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white border-0`}
            >
              {state.isGenerating ? (
                <div className="flex items-center space-x-3">
                  <LoadingSpinner className="w-5 h-5" />
                  <span>Generating Report...</span>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">📊</span>
                  <span>Generate Report</span>
                  <span className="text-xl">✨</span>
                </div>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Display */}
      {state.currentReport && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-text-primary">
                  {getReportTypeLabel(state.currentReport.reportType, state.currentReport.dateRange)}
                </h3>
                <p className="text-text-secondary">
                  {format(state.currentReport.dateRange.startDate, 'MMMM d, yyyy')} - {format(state.currentReport.dateRange.endDate, 'MMMM d, yyyy')}
                </p>
                {state.lastGenerated && (
                  <p className="text-sm text-text-muted">
                    Generated: {format(state.lastGenerated, 'MMMM d, yyyy \'at\' h:mm a')}
                  </p>
                )}
              </div>

              {/* Enhanced Export Buttons */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                {[
                  { format: 'csv', label: 'CSV', icon: '📈', color: 'green', description: 'Spreadsheet format' },
                  { format: 'excel', label: 'Excel', icon: '📉', color: 'blue', description: 'Microsoft Excel' },
                  { format: 'pdf', label: 'PDF', icon: '📄', color: 'red', description: 'Portable document' }
                ].map((exportOption) => (
                  <Button
                    key={exportOption.format}
                    onClick={() => exportReport(exportOption.format as 'csv' | 'excel' | 'pdf')}
                    disabled={state.isExporting}
                    variant="outline"
                    className={`group relative flex items-center space-x-2 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium rounded-xl border-2 transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                      exportOption.color === 'green' ? 'border-green-300 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20' :
                      exportOption.color === 'blue' ? 'border-blue-300 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20' :
                      'border-red-300 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                    } ${
                      state.isExporting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <span className="text-base sm:text-lg">{exportOption.icon}</span>
                    <div className="flex flex-col items-start">
                      <span className={`transition-colors ${
                        exportOption.color === 'green' ? 'group-hover:text-green-600' :
                        exportOption.color === 'blue' ? 'group-hover:text-blue-600' :
                        'group-hover:text-red-600'
                      }`}>
                        Export {exportOption.label}
                      </span>
                      <span className="text-xs text-text-muted hidden sm:block">{exportOption.description}</span>
                    </div>
                    {state.isExporting && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-surface-dark bg-opacity-90 rounded-xl">
                        <LoadingSpinner className="w-4 h-4" />
                      </div>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {[
          { title: 'Total Sessions', value: data.summary.totalSessions, icon: '📊', color: 'blue', bgGradient: 'from-blue-500 to-blue-600' },
          { title: 'Revenue', value: `₹${data.summary.revenue.toFixed(2)}`, icon: '💰', color: 'green', bgGradient: 'from-green-500 to-green-600' },
          { title: 'Active Sessions', value: data.summary.activeSessions, icon: '🟢', color: 'yellow', bgGradient: 'from-yellow-500 to-yellow-600' },
          { title: 'Net Income', value: `₹${data.summary.netIncome.toFixed(2)}`, icon: '📈', color: 'purple', bgGradient: 'from-purple-500 to-purple-600' }
        ].map((card, index) => (
          <div key={index} className="group relative bg-white dark:bg-surface-dark p-3 md:p-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-border-light hover:border-primary-300 hover:scale-105">
            <div className={`absolute top-0 right-0 w-12 h-12 md:w-20 md:h-20 bg-gradient-to-br ${card.bgGradient} opacity-10 rounded-xl md:rounded-2xl`}></div>
            <div className={`w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br ${card.bgGradient} rounded-lg md:rounded-xl flex items-center justify-center text-white text-lg md:text-2xl shadow-lg mb-2 md:mb-4 group-hover:scale-110 transition-transform duration-300`}>
              {card.icon}
            </div>
            <div className="relative z-10">
              <h4 className="text-xs md:text-sm font-semibold text-text-secondary mb-1 md:mb-2 uppercase tracking-wide">{card.title}</h4>
              <p className="text-lg md:text-3xl font-bold text-text-primary group-hover:text-primary-600 transition-colors duration-300">{card.value}</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-primary-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl md:rounded-2xl"></div>
          </div>
        ))}
      </div>

      {/* Parking Entries Table */}
      <Card className="overflow-hidden shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-b">
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="w-8 h-8 md:w-12 md:h-12 bg-primary-500 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-lg md:text-2xl">📋</span>
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-text-primary">Parking Entries</h3>
              <p className="text-text-secondary text-sm md:text-base hidden sm:block">Individual parking session details</p>
            </div>
          </div>
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