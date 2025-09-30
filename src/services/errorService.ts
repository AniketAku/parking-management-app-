/**
 * Error Service
 * Centralized error logging, tracking, and reporting
 */

import { AppError, ErrorHandler, ErrorSeverity, ErrorCategory } from '../utils/errorHandler'
import { performanceMonitor } from '../utils/optimizedPerformanceMonitor'
import { secureLogger } from '../utils/secureLogger'

interface ErrorLogEntry {
  id: string
  error: AppError
  timestamp: Date
  resolved: boolean
  reportedToService: boolean
}

interface ErrorStats {
  totalErrors: number
  errorsByCategory: Record<ErrorCategory, number>
  errorsBySeverity: Record<ErrorSeverity, number>
  recentErrors: ErrorLogEntry[]
  errorRate: number
}

class ErrorService {
  private errorLog: ErrorLogEntry[] = []
  private maxLogSize = 1000
  private errorListeners: Array<(error: AppError) => void> = []
  private statsListeners: Array<(stats: ErrorStats) => void> = []
  
  // Error tracking configuration
  private config = {
    enableConsoleLogging: import.meta.env.DEV || import.meta.env.VITE_ENABLE_ERROR_LOGGING === 'true',
    enableRemoteReporting: import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true',
    enablePerformanceTracking: true,
    maxRetries: 3,
    reportingEndpoint: import.meta.env.VITE_ERROR_REPORTING_ENDPOINT
  }

  /**
   * Log and handle an error
   */
  async logError(error: unknown, context?: any): Promise<AppError> {
    const standardizedError = ErrorHandler.standardizeError(error, {
      component: context?.component,
      action: context?.action,
      userId: context?.userId,
      metadata: context?.metadata
    })

    const logEntry: ErrorLogEntry = {
      id: this.generateErrorId(),
      error: standardizedError,
      timestamp: new Date(),
      resolved: false,
      reportedToService: false
    }

    // Add to internal log
    this.addToLog(logEntry)

    // Console logging with secure logger
    if (this.config.enableConsoleLogging) {
      this.logWithSecureLogger(standardizedError)
    }

    // Track performance impact
    if (this.config.enablePerformanceTracking) {
      this.trackErrorPerformance(standardizedError)
    }

    // Report to remote service if configured and error is severe enough
    if (this.config.enableRemoteReporting && ErrorHandler.shouldReport(standardizedError)) {
      try {
        await this.reportToRemoteService(logEntry)
        logEntry.reportedToService = true
      } catch (reportingError) {
        if (this.config.enableConsoleLogging) {
          secureLogger.warn('Failed to report error to remote service', reportingError, 'ErrorService')
        }
      }
    }

    // Notify listeners
    this.notifyListeners(standardizedError)
    this.notifyStatsListeners()

    return standardizedError
  }

  /**
   * Handle and log common error types
   */
  async handleSupabaseError(error: any, context?: any): Promise<AppError> {
    const standardizedError = ErrorHandler.fromSupabaseError(error, {
      component: context?.component,
      action: context?.action,
      metadata: context?.metadata
    })
    
    return this.logError(standardizedError, context)
  }

  async handleNetworkError(error: any, context?: any): Promise<AppError> {
    const standardizedError = ErrorHandler.fromNetworkError(error, {
      component: context?.component,
      action: context?.action,
      metadata: context?.metadata
    })
    
    return this.logError(standardizedError, context)
  }

  /**
   * Mark error as resolved
   */
  resolveError(errorId: string): void {
    const entry = this.errorLog.find(e => e.id === errorId)
    if (entry) {
      entry.resolved = true
      this.notifyStatsListeners()
    }
  }

  /**
   * Get error statistics
   */
  getStats(): ErrorStats {
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000
    const recentErrors = this.errorLog.filter(e => e.timestamp.getTime() > oneHourAgo)

    const errorsByCategory = {} as Record<ErrorCategory, number>
    const errorsBySeverity = {} as Record<ErrorSeverity, number>

    // Initialize counters
    Object.values(ErrorCategory).forEach(cat => {
      errorsByCategory[cat] = 0
    })
    Object.values(ErrorSeverity).forEach(sev => {
      errorsBySeverity[sev] = 0
    })

    // Count errors
    this.errorLog.forEach(entry => {
      errorsByCategory[entry.error.category]++
      errorsBySeverity[entry.error.severity]++
    })

    return {
      totalErrors: this.errorLog.length,
      errorsByCategory,
      errorsBySeverity,
      recentErrors: recentErrors.slice(-10), // Last 10 recent errors
      errorRate: recentErrors.length // Errors per hour
    }
  }

  /**
   * Clear error log
   */
  clearLog(): void {
    this.errorLog = []
    this.notifyStatsListeners()
  }

  /**
   * Subscribe to error events
   */
  onError(callback: (error: AppError) => void): () => void {
    this.errorListeners.push(callback)
    return () => {
      const index = this.errorListeners.indexOf(callback)
      if (index > -1) {
        this.errorListeners.splice(index, 1)
      }
    }
  }

  /**
   * Subscribe to stats updates
   */
  onStatsUpdate(callback: (stats: ErrorStats) => void): () => void {
    this.statsListeners.push(callback)
    return () => {
      const index = this.statsListeners.indexOf(callback)
      if (index > -1) {
        this.statsListeners.splice(index, 1)
      }
    }
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors(limit = 20): ErrorLogEntry[] {
    return this.errorLog
      .slice(-limit)
      .reverse() // Most recent first
  }

  /**
   * Export errors for analysis
   */
  exportErrors(): string {
    return JSON.stringify(this.errorLog.map(entry => entry.error.toJSON()), null, 2)
  }

  /**
   * Get comprehensive error report including logs from secureLogger
   */
  getComprehensiveErrorReport(): {
    errorServiceLogs: ErrorLogEntry[]
    secureLoggerEntries: any[]
    correlatedErrors: any[]
    timestamp: string
    summary: {
      totalErrors: number
      criticalErrors: number
      recentErrorRate: number
      topErrorCategories: Array<{ category: string; count: number }>
    }
  } {
    const secureLogEntries = secureLogger.getRecentLogs()
    const stats = this.getStats()
    
    // Correlate errors by timestamp
    const correlatedErrors = this.errorLog.map(errorEntry => {
      const correlatedLogEntries = secureLogEntries.filter(logEntry => {
        const timeDiff = Math.abs(
          new Date(logEntry.timestamp).getTime() - errorEntry.timestamp.getTime()
        )
        return timeDiff < 5000 // Within 5 seconds
      })
      
      return {
        error: errorEntry.error.toJSON(),
        id: errorEntry.id,
        timestamp: errorEntry.timestamp.toISOString(),
        correlatedLogs: correlatedLogEntries
      }
    })

    // Calculate top error categories
    const categoryCount: Record<string, number> = {}
    this.errorLog.forEach(entry => {
      categoryCount[entry.error.category] = (categoryCount[entry.error.category] || 0) + 1
    })
    const topErrorCategories = Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }))

    return {
      errorServiceLogs: this.errorLog,
      secureLoggerEntries: secureLogEntries,
      correlatedErrors,
      timestamp: new Date().toISOString(),
      summary: {
        totalErrors: stats.totalErrors,
        criticalErrors: stats.errorsBySeverity[ErrorSeverity.CRITICAL] || 0,
        recentErrorRate: stats.errorRate,
        topErrorCategories
      }
    }
  }

  // Private methods

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private addToLog(entry: ErrorLogEntry): void {
    this.errorLog.push(entry)
    
    // Maintain log size limit
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize)
    }
  }

  private logWithSecureLogger(error: AppError): void {
    const contextInfo = {
      category: error.category,
      severity: error.severity,
      code: error.code,
      context: error.context,
      validationErrors: error.validationErrors,
      stack: error.stack
    }

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        secureLogger.error(`CRITICAL ERROR [${error.code}]: ${error.message}`, {
          ...contextInfo,
          originalError: error.originalError
        }, error.context?.component || 'ErrorService')
        break
      case ErrorSeverity.HIGH:
        secureLogger.error(`HIGH SEVERITY [${error.code}]: ${error.message}`, contextInfo, error.context?.component || 'ErrorService')
        break
      case ErrorSeverity.MEDIUM:
        secureLogger.warn(`MEDIUM SEVERITY [${error.code}]: ${error.message}`, contextInfo, error.context?.component || 'ErrorService')
        break
      case ErrorSeverity.LOW:
        secureLogger.info(`LOW SEVERITY [${error.code}]: ${error.message}`, contextInfo, error.context?.component || 'ErrorService')
        break
      default:
        secureLogger.error(`UNKNOWN SEVERITY [${error.code}]: ${error.message}`, contextInfo, error.context?.component || 'ErrorService')
    }
  }


  private trackErrorPerformance(error: AppError): void {
    // Track error rate as a custom metric
    performanceMonitor.trackCustomMetric(`error_${error.category}`, Date.now(), {
      severity: error.severity,
      code: error.code
    })
  }

  private async reportToRemoteService(entry: ErrorLogEntry): Promise<void> {
    if (!this.config.reportingEndpoint) {
      return
    }

    const payload = {
      id: entry.id,
      error: entry.error.toJSON(),
      timestamp: entry.timestamp.toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      environment: import.meta.env.MODE
    }

    let retries = 0
    while (retries < this.config.maxRetries) {
      try {
        const response = await fetch(this.config.reportingEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        if (response.ok) {
          return
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      } catch (error) {
        retries++
        if (retries >= this.config.maxRetries) {
          throw error
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000))
      }
    }
  }

  private notifyListeners(error: AppError): void {
    this.errorListeners.forEach(callback => {
      try {
        callback(error)
      } catch (listenerError) {
        secureLogger.warn('Error listener failed', listenerError, 'ErrorService')
      }
    })
  }

  private notifyStatsListeners(): void {
    const stats = this.getStats()
    this.statsListeners.forEach(callback => {
      try {
        callback(stats)
      } catch (listenerError) {
        secureLogger.warn('Stats listener failed', listenerError, 'ErrorService')
      }
    })
  }
}

// Create singleton instance
export const errorService = new ErrorService()

// Convenience functions for common error patterns
export const logError = (error: unknown, context?: any) => errorService.logError(error, context)
export const logSupabaseError = (error: any, context?: any) => errorService.handleSupabaseError(error, context)
export const logNetworkError = (error: any, context?: any) => errorService.handleNetworkError(error, context)

export default errorService