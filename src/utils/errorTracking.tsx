// Error Tracking and Monitoring System
// Comprehensive error handling and performance issue tracking

import React, { useEffect } from 'react'

export interface ErrorReport {
  id: string
  type: 'javascript' | 'network' | 'performance' | 'accessibility' | 'user'
  level: 'error' | 'warning' | 'info'
  message: string
  stack?: string
  url: string
  timestamp: number
  userAgent: string
  userId?: string
  sessionId: string
  
  // Context information
  componentStack?: string
  props?: Record<string, any>
  state?: Record<string, any>
  
  // Performance context
  performanceMetrics?: {
    lcp?: number
    fid?: number
    cls?: number
    memoryUsage?: number
  }
  
  // User context
  userActions?: Array<{
    type: string
    timestamp: number
    element?: string
  }>
}

export interface ErrorTrackingConfig {
  enableConsoleCapture: boolean
  enableNetworkErrorCapture: boolean
  enablePerformanceTracking: boolean
  enableUserActionTracking: boolean
  maxErrors: number
  enableRemoteLogging: boolean
  remoteEndpoint?: string
  enableLocalStorage: boolean
  enableAccessibilityErrors: boolean
}

class ErrorTracker {
  private errors: ErrorReport[] = []
  private config: ErrorTrackingConfig
  private sessionId: string
  private userActions: Array<{ type: string; timestamp: number; element?: string }> = []
  private isInitialized = false

  constructor(config: Partial<ErrorTrackingConfig> = {}) {
    this.config = {
      enableConsoleCapture: true,
      enableNetworkErrorCapture: true,
      enablePerformanceTracking: true,
      enableUserActionTracking: true,
      enableAccessibilityErrors: true,
      maxErrors: 100,
      enableRemoteLogging: false,
      enableLocalStorage: true,
      ...config
    }
    
    this.sessionId = this.generateSessionId()
    this.loadStoredErrors()
  }

  /**
   * Initialize error tracking
   */
  public initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') return

    this.setupGlobalErrorHandlers()
    this.setupUnhandledPromiseRejectionHandler()
    this.setupNetworkErrorCapture()
    this.setupUserActionTracking()
    this.setupPerformanceTracking()
    this.setupAccessibilityErrorTracking()

    this.isInitialized = true
    console.log('🔍 Error tracking initialized')
  }

  /**
   * Track a custom error
   */
  public trackError(
    error: Error | string,
    context: {
      type?: ErrorReport['type']
      level?: ErrorReport['level']
      componentStack?: string
      props?: Record<string, any>
      state?: Record<string, any>
    } = {}
  ): void {
    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      type: context.type || 'javascript',
      level: context.level || 'error',
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      url: window.location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      componentStack: context.componentStack,
      props: context.props,
      state: context.state,
      userActions: [...this.userActions.slice(-10)], // Last 10 actions
      performanceMetrics: this.getCurrentPerformanceMetrics(),
    }

    this.addError(errorReport)
  }

  /**
   * Get all tracked errors
   */
  public getErrors(): ErrorReport[] {
    return [...this.errors]
  }

  /**
   * Get error summary
   */
  public getSummary(): {
    total: number
    byType: Record<string, number>
    byLevel: Record<string, number>
    recentErrors: ErrorReport[]
    topErrors: Array<{ message: string; count: number }>
  } {
    const byType: Record<string, number> = {}
    const byLevel: Record<string, number> = {}
    const messageCounts: Record<string, number> = {}

    this.errors.forEach(error => {
      byType[error.type] = (byType[error.type] || 0) + 1
      byLevel[error.level] = (byLevel[error.level] || 0) + 1
      messageCounts[error.message] = (messageCounts[error.message] || 0) + 1
    })

    const topErrors = Object.entries(messageCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([message, count]) => ({ message, count }))

    const recentErrors = this.errors
      .filter(error => Date.now() - error.timestamp < 3600000) // Last hour
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)

    return {
      total: this.errors.length,
      byType,
      byLevel,
      recentErrors,
      topErrors,
    }
  }

  /**
   * Clear all errors
   */
  public clearErrors(): void {
    this.errors = []
    if (this.config.enableLocalStorage) {
      localStorage.removeItem('error-tracker-errors')
    }
  }

  /**
   * Export errors for analysis
   */
  public exportErrors(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      timestamp: Date.now(),
      errors: this.errors,
      config: this.config,
    }, null, 2)
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    if (!this.config.enableConsoleCapture) return

    window.addEventListener('error', (event) => {
      this.trackError(event.error || event.message, {
        type: 'javascript',
        level: 'error',
      })
    })
  }

  /**
   * Setup unhandled promise rejection handler
   */
  private setupUnhandledPromiseRejectionHandler(): void {
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(event.reason, {
        type: 'javascript',
        level: 'error',
      })
    })
  }

  /**
   * Setup network error capture
   */
  private setupNetworkErrorCapture(): void {
    if (!this.config.enableNetworkErrorCapture) return

    // Monitor fetch requests
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args)
        
        if (!response.ok) {
          this.trackError(`Network error: ${response.status} ${response.statusText}`, {
            type: 'network',
            level: response.status >= 500 ? 'error' : 'warning',
          })
        }
        
        return response
      } catch (error) {
        this.trackError(error as Error, {
          type: 'network',
          level: 'error',
        })
        throw error
      }
    }
  }

  /**
   * Setup user action tracking
   */
  private setupUserActionTracking(): void {
    if (!this.config.enableUserActionTracking) return

    const trackAction = (type: string, event: Event) => {
      const element = event.target as HTMLElement
      const elementInfo = element.tagName.toLowerCase() + 
        (element.id ? `#${element.id}` : '') +
        (element.className ? `.${element.className.split(' ')[0]}` : '')

      this.userActions.push({
        type,
        timestamp: Date.now(),
        element: elementInfo,
      })

      // Keep only last 50 actions
      if (this.userActions.length > 50) {
        this.userActions = this.userActions.slice(-50)
      }
    }

    window.addEventListener('click', (e) => trackAction('click', e))
    window.addEventListener('keydown', (e) => trackAction('keydown', e))
    window.addEventListener('submit', (e) => trackAction('submit', e))
  }

  /**
   * Setup performance tracking
   */
  private setupPerformanceTracking(): void {
    if (!this.config.enablePerformanceTracking) return

    // Monitor Core Web Vitals violations
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (entry.entryType === 'largest-contentful-paint' && entry.startTime > 4000) {
          this.trackError('Poor Largest Contentful Paint performance', {
            type: 'performance',
            level: 'warning',
          })
        }
        
        if (entry.entryType === 'first-input' && entry.processingStart - entry.startTime > 300) {
          this.trackError('Poor First Input Delay performance', {
            type: 'performance',
            level: 'warning',
          })
        }
        
        if (entry.entryType === 'layout-shift' && entry.value > 0.25) {
          this.trackError('High Cumulative Layout Shift detected', {
            type: 'performance',
            level: 'warning',
          })
        }
      })
    }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] })
  }

  /**
   * Setup accessibility error tracking
   */
  private setupAccessibilityErrorTracking(): void {
    if (!this.config.enableAccessibilityErrors) return

    // Monitor focus issues
    let lastFocusTime = 0
    document.addEventListener('focusin', () => {
      const currentTime = Date.now()
      if (currentTime - lastFocusTime > 1000) { // Focus took more than 1 second
        this.trackError('Slow focus transition detected', {
          type: 'accessibility',
          level: 'warning',
        })
      }
      lastFocusTime = currentTime
    })

    // Monitor keyboard traps
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        const activeElement = document.activeElement
        if (!activeElement || activeElement === document.body) {
          this.trackError('Focus lost during tab navigation', {
            type: 'accessibility',
            level: 'warning',
          })
        }
      }
    })
  }

  /**
   * Add error to collection
   */
  private addError(error: ErrorReport): void {
    this.errors.push(error)

    // Maintain max errors limit
    if (this.errors.length > this.config.maxErrors) {
      this.errors = this.errors.slice(-this.config.maxErrors)
    }

    // Store in localStorage if enabled
    if (this.config.enableLocalStorage) {
      try {
        localStorage.setItem('error-tracker-errors', JSON.stringify(this.errors))
      } catch (e) {
        console.warn('Failed to store errors in localStorage:', e)
      }
    }

    // Send to remote endpoint if configured
    if (this.config.enableRemoteLogging && this.config.remoteEndpoint) {
      this.sendErrorToRemote(error).catch(console.error)
    }

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🐛 ${error.type} ${error.level}: ${error.message}`)
      console.log('Error details:', error)
      if (error.stack) {
        console.log('Stack trace:', error.stack)
      }
      console.groupEnd()
    }
  }

  /**
   * Load stored errors from localStorage
   */
  private loadStoredErrors(): void {
    if (!this.config.enableLocalStorage) return

    try {
      const stored = localStorage.getItem('error-tracker-errors')
      if (stored) {
        this.errors = JSON.parse(stored)
      }
    } catch (error) {
      console.warn('Failed to load stored errors:', error)
    }
  }

  /**
   * Send error to remote logging service
   */
  private async sendErrorToRemote(error: ErrorReport): Promise<void> {
    if (!this.config.remoteEndpoint) return

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(error),
      })
    } catch (err) {
      console.warn('Failed to send error to remote endpoint:', err)
    }
  }

  /**
   * Get current performance metrics
   */
  private getCurrentPerformanceMetrics() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const paint = performance.getEntriesByType('paint')
    
    return {
      lcp: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
      fcp: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime,
      memoryUsage: 'memory' in performance ? (performance as any).memory.usedJSHeapSize : undefined,
      navigationTiming: navigation ? {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        loadComplete: navigation.loadEventEnd - navigation.fetchStart,
      } : undefined,
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * React Error Boundary with enhanced error tracking
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error; retry: () => void }> },
  { hasError: boolean; error?: Error }
> {
  private errorTracker: ErrorTracker

  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
    this.errorTracker = new ErrorTracker()
    this.errorTracker.initialize()
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.errorTracker.trackError(error, {
      type: 'javascript',
      level: 'error',
      componentStack: errorInfo.componentStack,
    })
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error} retry={this.handleRetry} />
    }

    return this.props.children
  }
}

/**
 * Default error fallback component
 */
const DefaultErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <span className="text-red-500 text-2xl">⚠️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">
              Something went wrong
            </h3>
            <div className="mt-2 text-sm text-gray-500">
              <p>The application encountered an unexpected error.</p>
            </div>
          </div>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-sm font-mono text-gray-700">
            {error.message}
          </div>
        )}
        
        <div className="mt-4">
          <button
            onClick={retry}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Higher-order component for error tracking
 */
export function withErrorTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent: React.FC<P> = (props) => {
    const errorTracker = new ErrorTracker()
    
    useEffect(() => {
      errorTracker.initialize()
    }, [])

    const trackComponentError = (error: Error) => {
      errorTracker.trackError(error, {
        type: 'javascript',
        level: 'error',
        componentStack: componentName || Component.name,
        props: props as Record<string, any>,
      })
    }

    return (
      <ErrorBoundary>
        <Component {...props} />
      </ErrorBoundary>
    )
  }

  WrappedComponent.displayName = `withErrorTracking(${componentName || Component.displayName || Component.name})`
  return WrappedComponent
}

/**
 * Hook for error tracking in functional components
 */
export const useErrorTracking = (componentName: string) => {
  const errorTracker = new ErrorTracker()
  
  useEffect(() => {
    errorTracker.initialize()
  }, [])

  const trackError = (error: Error | string, context?: any) => {
    errorTracker.trackError(error, {
      type: 'user',
      level: 'error',
      componentStack: componentName,
      ...context,
    })
  }

  const trackWarning = (message: string, context?: any) => {
    errorTracker.trackError(message, {
      type: 'user',
      level: 'warning',
      componentStack: componentName,
      ...context,
    })
  }

  const trackInfo = (message: string, context?: any) => {
    errorTracker.trackError(message, {
      type: 'user',
      level: 'info',
      componentStack: componentName,
      ...context,
    })
  }

  return {
    trackError,
    trackWarning,
    trackInfo,
    getErrors: () => errorTracker.getErrors(),
    getSummary: () => errorTracker.getSummary(),
    clearErrors: () => errorTracker.clearErrors(),
  }
}

// Global error tracker instance
export const globalErrorTracker = new ErrorTracker({
  enableConsoleCapture: true,
  enableNetworkErrorCapture: true,
  enablePerformanceTracking: true,
  enableUserActionTracking: true,
  enableAccessibilityErrors: true,
  maxErrors: 100,
  enableLocalStorage: true,
  enableRemoteLogging: process.env.NODE_ENV === 'production',
  remoteEndpoint: process.env.REACT_APP_ERROR_ENDPOINT,
})

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  globalErrorTracker.initialize()
}

export default globalErrorTracker