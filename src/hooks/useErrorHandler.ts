/**
 * useErrorHandler Hook
 * Provides standardized error handling for React components
 */

import { useCallback, useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { AppError, ErrorHandler, ErrorSeverity } from '../utils/errorHandler'
import { errorService } from '../services/errorService'

interface UseErrorHandlerOptions {
  component?: string
  showToast?: boolean
  logErrors?: boolean
  throwOnCritical?: boolean
}

interface UseErrorHandlerResult {
  error: AppError | null
  isError: boolean
  handleError: (error: unknown, context?: any) => Promise<AppError>
  handleSupabaseError: (error: any, context?: any) => Promise<AppError>
  handleNetworkError: (error: any, context?: any) => Promise<AppError>
  clearError: () => void
  retry: (fn: () => Promise<void>) => Promise<void>
}

/**
 * Hook for standardized error handling in components
 */
export const useErrorHandler = (options: UseErrorHandlerOptions = {}): UseErrorHandlerResult => {
  const {
    component = 'UnknownComponent',
    showToast = true,
    logErrors = true,
    throwOnCritical = false
  } = options

  const [error, setError] = useState<AppError | null>(null)

  const handleError = useCallback(async (
    error: unknown,
    context?: any
  ): Promise<AppError> => {
    const contextWithComponent = {
      component,
      ...context
    }

    // Standardize the error
    const standardizedError = ErrorHandler.standardizeError(error, contextWithComponent)

    // Set local error state
    setError(standardizedError)

    // Log error if enabled
    if (logErrors) {
      await errorService.logError(standardizedError, contextWithComponent)
    }

    // Show toast notification if enabled
    if (showToast) {
      showErrorToast(standardizedError)
    }

    // Throw critical errors if configured
    if (throwOnCritical && standardizedError.severity === ErrorSeverity.CRITICAL) {
      throw standardizedError
    }

    return standardizedError
  }, [component, showToast, logErrors, throwOnCritical])

  const handleSupabaseError = useCallback(async (
    error: any,
    context?: any
  ): Promise<AppError> => {
    const contextWithComponent = {
      component,
      ...context
    }

    const standardizedError = ErrorHandler.fromSupabaseError(error, contextWithComponent)
    setError(standardizedError)

    if (logErrors) {
      await errorService.logError(standardizedError, contextWithComponent)
    }

    if (showToast) {
      showErrorToast(standardizedError)
    }

    if (throwOnCritical && standardizedError.severity === ErrorSeverity.CRITICAL) {
      throw standardizedError
    }

    return standardizedError
  }, [component, showToast, logErrors, throwOnCritical])

  const handleNetworkError = useCallback(async (
    error: any,
    context?: any
  ): Promise<AppError> => {
    const contextWithComponent = {
      component,
      ...context
    }

    const standardizedError = ErrorHandler.fromNetworkError(error, contextWithComponent)
    setError(standardizedError)

    if (logErrors) {
      await errorService.logError(standardizedError, contextWithComponent)
    }

    if (showToast) {
      showErrorToast(standardizedError)
    }

    if (throwOnCritical && standardizedError.severity === ErrorSeverity.CRITICAL) {
      throw standardizedError
    }

    return standardizedError
  }, [component, showToast, logErrors, throwOnCritical])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const retry = useCallback(async (fn: () => Promise<void>): Promise<void> => {
    try {
      clearError()
      await fn()
    } catch (retryError) {
      await handleError(retryError, { action: 'retry' })
    }
  }, [handleError, clearError])

  // Auto-clear error after some time for non-critical errors
  useEffect(() => {
    if (error && error.severity !== ErrorSeverity.CRITICAL) {
      const timeout = setTimeout(() => {
        clearError()
      }, 10000) // Clear after 10 seconds

      return () => clearTimeout(timeout)
    }
  }, [error, clearError])

  return {
    error,
    isError: error !== null,
    handleError,
    handleSupabaseError,
    handleNetworkError,
    clearError,
    retry
  }
}

/**
 * Show appropriate toast message based on error severity
 */
function showErrorToast(error: AppError): void {
  const options = {
    duration: getToastDuration(error.severity),
    icon: getToastIcon(error.severity)
  }

  switch (error.severity) {
    case ErrorSeverity.CRITICAL:
      toast.error(error.userMessage, { ...options, duration: 0 }) // Persistent
      break
    case ErrorSeverity.HIGH:
      toast.error(error.userMessage, options)
      break
    case ErrorSeverity.MEDIUM:
      toast.error(error.userMessage, options)
      break
    case ErrorSeverity.LOW:
      toast(error.userMessage, { ...options, icon: '⚠️' })
      break
    default:
      toast.error(error.userMessage, options)
  }
}

function getToastDuration(severity: ErrorSeverity): number {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      return 0 // Persistent
    case ErrorSeverity.HIGH:
      return 8000
    case ErrorSeverity.MEDIUM:
      return 6000
    case ErrorSeverity.LOW:
      return 4000
    default:
      return 4000
  }
}

function getToastIcon(severity: ErrorSeverity): string {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      return '🚨'
    case ErrorSeverity.HIGH:
      return '❌'
    case ErrorSeverity.MEDIUM:
      return '⚠️'
    case ErrorSeverity.LOW:
      return '💡'
    default:
      return '❓'
  }
}

/**
 * Hook for async operations with error handling
 */
export const useAsyncError = (options: UseErrorHandlerOptions = {}) => {
  const { handleError } = useErrorHandler(options)
  const [loading, setLoading] = useState(false)

  const execute = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    context?: any
  ): Promise<T | null> => {
    setLoading(true)
    try {
      const result = await asyncFn()
      return result
    } catch (error) {
      await handleError(error, { ...context, action: 'async_operation' })
      return null
    } finally {
      setLoading(false)
    }
  }, [handleError])

  return { execute, loading }
}

/**
 * Interface for error boundary fallback component props
 */
export interface ErrorBoundaryFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export default useErrorHandler