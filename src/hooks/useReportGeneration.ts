// React Hook for Report Generation with Performance Optimization

import { useState, useEffect, useCallback, useRef } from 'react'
import { reportService } from '../services/reportGenerationService'
import { reportExportService } from '../services/reportExportService'
import type {
  ReportType,
  QuickSelectOption,
  DateBoundary,
  ReportGenerationRequest,
  ReportGenerationResponse,
  ReportUIState,
  DataInclusionCriteria,
  ExportConfig,
  ExportResult,
  ValidationResult
} from '../types/reports'

interface UseReportGenerationOptions {
  defaultReportType?: ReportType
  autoRefreshInterval?: number
  enableCaching?: boolean
  maxCacheSize?: number
}

interface UseReportGenerationReturn {
  // State
  state: ReportUIState
  isGenerating: boolean
  isExporting: boolean
  error: string | null
  currentReport: ReportGenerationResponse | null
  cacheStatistics: { size: number; entries: number; hitRate: number }

  // Actions
  generateReport: (request: ReportGenerationRequest) => Promise<void>
  exportReport: (config: ExportConfig) => Promise<ExportResult | null>
  clearError: () => void
  clearCache: () => void
  retryLastRequest: () => Promise<void>

  // Quick generation methods
  generateDailyReport: (date?: Date) => Promise<void>
  generateWeeklyReport: (weekStart?: Date) => Promise<void>
  generateMonthlyReport: (month?: Date) => Promise<void>

  // Validation
  validateRequest: (request: ReportGenerationRequest) => ValidationResult

  // Performance metrics
  performanceMetrics: {
    lastGenerationTime: number
    averageGenerationTime: number
    cacheHitRate: number
    totalReportsGenerated: number
  }
}

export const useReportGeneration = (
  options: UseReportGenerationOptions = {}
): UseReportGenerationReturn => {
  const {
    defaultReportType = 'daily',
    autoRefreshInterval = 60 * 60 * 1000, // 1 hour
    enableCaching = true,
    maxCacheSize = 50
  } = options

  // State management
  const [state, setState] = useState<ReportUIState>({
    selectedReportType: defaultReportType,
    isGenerating: false,
    isExporting: false
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentReport, setCurrentReport] = useState<ReportGenerationResponse | null>(null)

  // Performance tracking
  const [performanceMetrics, setPerformanceMetrics] = useState({
    lastGenerationTime: 0,
    averageGenerationTime: 0,
    cacheHitRate: 0,
    totalReportsGenerated: 0
  })

  // Cache for requests and responses
  const requestCache = useRef(new Map<string, ReportGenerationResponse>())
  const lastRequest = useRef<ReportGenerationRequest | null>(null)
  const autoRefreshTimer = useRef<NodeJS.Timeout | null>(null)
  const generationTimes = useRef<number[]>([])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshTimer.current) {
        clearInterval(autoRefreshTimer.current)
      }
    }
  }, [])

  /**
   * === CACHE MANAGEMENT ===
   */
  const generateCacheKey = useCallback((request: ReportGenerationRequest): string => {
    const dateKey = request.dateSelection.customRange
      ? `${request.dateSelection.customRange.startDate.getTime()}_${request.dateSelection.customRange.endDate.getTime()}`
      : request.dateSelection.quickSelect || 'auto'

    const criteriaKey = Object.values(request.dataInclusionCriteria).join('_')
    return `${request.type}_${dateKey}_${criteriaKey}`
  }, [])

  const getCachedReport = useCallback((cacheKey: string): ReportGenerationResponse | null => {
    if (!enableCaching) return null
    return requestCache.current.get(cacheKey) || null
  }, [enableCaching])

  const setCachedReport = useCallback((cacheKey: string, report: ReportGenerationResponse): void => {
    if (!enableCaching) return

    // Implement LRU cache with size limit
    if (requestCache.current.size >= maxCacheSize) {
      const firstKey = requestCache.current.keys().next().value
      if (firstKey) {
        requestCache.current.delete(firstKey)
      }
    }

    requestCache.current.set(cacheKey, report)
  }, [enableCaching, maxCacheSize])

  const clearCache = useCallback(() => {
    requestCache.current.clear()
    reportService.clearCache()
    setPerformanceMetrics(prev => ({ ...prev, cacheHitRate: 0 }))
  }, [])

  const getCacheStatistics = useCallback(() => {
    return {
      ...reportService.getCacheStatistics(),
      entries: requestCache.current.size
    }
  }, [])

  /**
   * === VALIDATION ===
   */
  const validateRequest = useCallback((request: ReportGenerationRequest): ValidationResult => {
    return reportService.validateReportRequest(request)
  }, [])

  /**
   * === PERFORMANCE TRACKING ===
   */
  const updatePerformanceMetrics = useCallback((generationTime: number, cacheHit: boolean) => {
    generationTimes.current.push(generationTime)
    if (generationTimes.current.length > 100) {
      generationTimes.current = generationTimes.current.slice(-50) // Keep last 50 measurements
    }

    const averageTime = generationTimes.current.reduce((sum, time) => sum + time, 0) / generationTimes.current.length

    setPerformanceMetrics(prev => {
      const totalReports = prev.totalReportsGenerated + 1
      const totalCacheHits = Math.round(prev.cacheHitRate * prev.totalReportsGenerated / 100) + (cacheHit ? 1 : 0)
      const newCacheHitRate = (totalCacheHits / totalReports) * 100

      return {
        lastGenerationTime: generationTime,
        averageGenerationTime: averageTime,
        cacheHitRate: newCacheHitRate,
        totalReportsGenerated: totalReports
      }
    })
  }, [])

  /**
   * === MAIN GENERATION METHOD ===
   */
  const generateReport = useCallback(async (request: ReportGenerationRequest): Promise<void> => {
    const startTime = Date.now()

    try {
      setIsGenerating(true)
      setError(null)
      lastRequest.current = request

      // Validate the request
      const validation = validateRequest(request)
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '))
      }

      // Check cache first
      const cacheKey = generateCacheKey(request)
      const cachedReport = getCachedReport(cacheKey)

      if (cachedReport) {
        const generationTime = Date.now() - startTime
        setCurrentReport(cachedReport)
        setState(prev => ({ ...prev, currentReport: cachedReport }))
        updatePerformanceMetrics(generationTime, true)
        return
      }

      // Generate new report
      const response = await reportService.generateReport(request)
      const generationTime = Date.now() - startTime

      if (response.success) {
        setCurrentReport(response)
        setState(prev => ({ ...prev, currentReport: response }))
        setCachedReport(cacheKey, response)
        updatePerformanceMetrics(generationTime, false)
      } else {
        throw new Error(response.error || 'Failed to generate report')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      console.error('Report generation failed:', err)
    } finally {
      setIsGenerating(false)
    }
  }, [validateRequest, generateCacheKey, getCachedReport, setCachedReport, updatePerformanceMetrics])

  /**
   * === EXPORT FUNCTIONALITY ===
   */
  const exportReport = useCallback(async (config: ExportConfig): Promise<ExportResult | null> => {
    if (!currentReport) {
      setError('No report available to export')
      return null
    }

    try {
      setIsExporting(true)
      setError(null)

      const result = await reportExportService.exportReport(currentReport, config)

      if (result.success && result.downloadLink) {
        // Trigger download
        const link = document.createElement('a')
        link.href = result.downloadLink
        link.download = result.fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Clean up the blob URL after a delay
        setTimeout(() => {
          URL.revokeObjectURL(result.downloadLink!)
        }, 1000)
      }

      return result

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed'
      setError(errorMessage)
      return {
        success: false,
        fileName: '',
        error: errorMessage
      }
    } finally {
      setIsExporting(false)
    }
  }, [currentReport])

  /**
   * === QUICK GENERATION METHODS ===
   */
  const generateDailyReport = useCallback(async (date?: Date): Promise<void> => {
    const request: ReportGenerationRequest = {
      type: 'daily',
      dateSelection: {
        type: 'daily',
        quickSelect: date ? undefined : 'today',
        customRange: date ? {
          startDate: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          endDate: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)
        } : undefined,
        autoCalculated: !date
      },
      dataInclusionCriteria: {
        includeActiveSessions: true,
        includeCompletedSessions: true,
        includeExpenses: true,
        includePendingPayments: true,
        includePartialPayments: true
      }
    }

    await generateReport(request)
  }, [generateReport])

  const generateWeeklyReport = useCallback(async (weekStart?: Date): Promise<void> => {
    const request: ReportGenerationRequest = {
      type: 'weekly',
      dateSelection: {
        type: 'weekly',
        quickSelect: weekStart ? undefined : 'this_week',
        customRange: weekStart ? {
          startDate: new Date(weekStart),
          endDate: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
        } : undefined,
        autoCalculated: !weekStart
      },
      dataInclusionCriteria: {
        includeActiveSessions: true,
        includeCompletedSessions: true,
        includeExpenses: true,
        includePendingPayments: true,
        includePartialPayments: true
      }
    }

    await generateReport(request)
  }, [generateReport])

  const generateMonthlyReport = useCallback(async (month?: Date): Promise<void> => {
    const request: ReportGenerationRequest = {
      type: 'monthly',
      dateSelection: {
        type: 'monthly',
        quickSelect: month ? undefined : 'this_month',
        customRange: month ? {
          startDate: new Date(month.getFullYear(), month.getMonth(), 1),
          endDate: new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59)
        } : undefined,
        autoCalculated: !month
      },
      dataInclusionCriteria: {
        includeActiveSessions: true,
        includeCompletedSessions: true,
        includeExpenses: true,
        includePendingPayments: true,
        includePartialPayments: true
      }
    }

    await generateReport(request)
  }, [generateReport])

  /**
   * === AUTO-REFRESH FUNCTIONALITY ===
   */
  const setupAutoRefresh = useCallback((enabled: boolean, quickSelect?: QuickSelectOption) => {
    if (autoRefreshTimer.current) {
      clearInterval(autoRefreshTimer.current)
      autoRefreshTimer.current = null
    }

    if (enabled && quickSelect === 'today' && lastRequest.current) {
      autoRefreshTimer.current = setInterval(async () => {
        if (lastRequest.current) {
          await generateReport(lastRequest.current)
        }
      }, autoRefreshInterval)
    }
  }, [generateReport, autoRefreshInterval])

  /**
   * === UTILITY METHODS ===
   */
  const retryLastRequest = useCallback(async (): Promise<void> => {
    if (lastRequest.current) {
      await generateReport(lastRequest.current)
    } else {
      setError('No previous request to retry')
    }
  }, [generateReport])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // State
    state,
    isGenerating,
    isExporting,
    error,
    currentReport,
    cacheStatistics: getCacheStatistics(),

    // Actions
    generateReport,
    exportReport,
    clearError,
    clearCache,
    retryLastRequest,

    // Quick generation methods
    generateDailyReport,
    generateWeeklyReport,
    generateMonthlyReport,

    // Validation
    validateRequest,

    // Performance metrics
    performanceMetrics
  }
}

export default useReportGeneration