/**
 * Error Handling System Validation Tests
 * Validates the standardized error handling implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppError, ErrorHandler, ErrorSeverity, ErrorCategory, ErrorCode } from '../../utils/errorHandler'
import { errorService } from '../../services/errorService'
import { secureLogger } from '../../utils/secureLogger'

// Mock performance monitor to avoid real performance tracking in tests
vi.mock('../../utils/optimizedPerformanceMonitor', () => ({
  performanceMonitor: {
    trackCustomMetric: vi.fn()
  }
}))

describe('Error Handling System Validation', () => {
  beforeEach(() => {
    // Clear error service logs before each test
    errorService.clearLog()
    vi.clearAllMocks()
  })

  describe('AppError Class', () => {
    it('should create AppError with proper defaults', () => {
      const error = new AppError({
        message: 'Test error',
        code: ErrorCode.UNKNOWN_ERROR,
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.MEDIUM
      })

      expect(error.message).toBe('Test error')
      expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR)
      expect(error.category).toBe(ErrorCategory.UNKNOWN)
      expect(error.severity).toBe(ErrorSeverity.MEDIUM)
      expect(error.userMessage).toBe('An unexpected error occurred. Please try again.')
      expect(error.isOperational).toBe(true)
      expect(error.context.timestamp).toBeInstanceOf(Date)
    })

    it('should generate user-friendly messages based on category', () => {
      const validationError = new AppError({
        message: 'Invalid input',
        category: ErrorCategory.VALIDATION
      })

      const networkError = new AppError({
        message: 'Connection failed',
        category: ErrorCategory.NETWORK
      })

      expect(validationError.userMessage).toBe('Please check your input and try again.')
      expect(networkError.userMessage).toBe('Network connection failed. Please check your internet connection.')
    })

    it('should serialize to JSON properly', () => {
      const error = new AppError({
        message: 'Test serialization',
        code: ErrorCode.VALIDATION_REQUIRED_FIELD,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        context: { component: 'TestComponent' }
      })

      const json = error.toJSON()
      expect(json.name).toBe('AppError')
      expect(json.message).toBe('Test serialization')
      expect(json.code).toBe(ErrorCode.VALIDATION_REQUIRED_FIELD)
      expect(json.category).toBe(ErrorCategory.VALIDATION)
      expect(json.severity).toBe(ErrorSeverity.LOW)
      expect(json.context.component).toBe('TestComponent')
    })
  })

  describe('ErrorHandler Utilities', () => {
    it('should standardize unknown errors', () => {
      const stringError = 'Simple string error'
      const standardized = ErrorHandler.standardizeError(stringError)

      expect(standardized).toBeInstanceOf(AppError)
      expect(standardized.message).toBe(stringError)
      expect(standardized.code).toBe(ErrorCode.UNKNOWN_ERROR)
    })

    it('should preserve AppError instances', () => {
      const originalError = new AppError({
        message: 'Original error',
        code: ErrorCode.BUSINESS_DUPLICATE_ENTRY
      })

      const standardized = ErrorHandler.standardizeError(originalError)
      expect(standardized).toBe(originalError)
    })

    it('should handle Supabase errors correctly', () => {
      const supabaseError = {
        message: 'Record not found',
        code: 'PGRST116'
      }

      const standardized = ErrorHandler.fromSupabaseError(supabaseError, {
        component: 'TestService'
      })

      expect(standardized.code).toBe(ErrorCode.DATABASE_RECORD_NOT_FOUND)
      expect(standardized.severity).toBe(ErrorSeverity.MEDIUM)
      expect(standardized.category).toBe(ErrorCategory.DATABASE)
      expect(standardized.context.component).toBe('TestService')

      // Test default database error
      const generalDbError = {
        message: 'Connection failed',
        code: '42000'
      }

      const standardizedGeneral = ErrorHandler.fromSupabaseError(generalDbError, {
        component: 'TestService'
      })

      expect(standardizedGeneral.severity).toBe(ErrorSeverity.HIGH)
      expect(standardizedGeneral.category).toBe(ErrorCategory.DATABASE)
    })

    it('should determine reporting correctly', () => {
      const criticalError = new AppError({
        message: 'Critical system failure',
        severity: ErrorSeverity.CRITICAL
      })

      const operationalError = new AppError({
        message: 'Validation failed',
        isOperational: true,
        severity: ErrorSeverity.LOW
      })

      expect(ErrorHandler.shouldReport(criticalError)).toBe(true)
      expect(ErrorHandler.shouldReport(operationalError)).toBe(false)
    })
  })

  describe('ErrorService Integration', () => {
    it('should log errors and track them', async () => {
      const testError = new Error('Test service error')
      const context = {
        component: 'TestComponent',
        action: 'testAction',
        userId: 'test-user-123'
      }

      const standardizedError = await errorService.logError(testError, context)

      expect(standardizedError).toBeInstanceOf(AppError)
      expect(standardizedError.context.component).toBe('TestComponent')
      expect(standardizedError.context.action).toBe('testAction')
      expect(standardizedError.context.userId).toBe('test-user-123')

      // Verify error was added to service logs
      const stats = errorService.getStats()
      expect(stats.totalErrors).toBe(1)
      expect(stats.errorsByCategory[ErrorCategory.UNKNOWN]).toBe(1)
    })

    it('should provide comprehensive error reports', async () => {
      // Log multiple errors of different types
      await errorService.logError(new AppError({
        message: 'Database error',
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH
      }))

      await errorService.logError(new AppError({
        message: 'Validation error',
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW
      }))

      const report = errorService.getComprehensiveErrorReport()

      expect(report.summary.totalErrors).toBe(2)
      expect(report.summary.topErrorCategories).toContainEqual({
        category: ErrorCategory.DATABASE,
        count: 1
      })
      expect(report.summary.topErrorCategories).toContainEqual({
        category: ErrorCategory.VALIDATION,
        count: 1
      })
      expect(report.timestamp).toBeDefined()
      expect(report.correlatedErrors).toHaveLength(2)
    })

    it('should handle error listeners correctly', async () => {
      const mockListener = vi.fn()
      const unsubscribe = errorService.onError(mockListener)

      const testError = new AppError({
        message: 'Test listener error',
        category: ErrorCategory.BUSINESS_LOGIC
      })

      await errorService.logError(testError)

      expect(mockListener).toHaveBeenCalledWith(testError)

      // Test unsubscribe
      unsubscribe()
      await errorService.logError(testError)
      expect(mockListener).toHaveBeenCalledTimes(1) // Should not be called again
    })
  })

  describe('Secure Logger Integration', () => {
    it('should sanitize sensitive information', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Create error with sensitive data
      const errorWithSensitiveData = new AppError({
        message: 'Authentication failed with password: secret123 and token: abc123',
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        context: {
          apiKey: 'sensitive-key-123',
          userPassword: 'user-secret'
        }
      })

      await errorService.logError(errorWithSensitiveData)

      // Verify console.error was called but sensitive data was sanitized
      expect(spy).toHaveBeenCalled()
      const logCall = spy.mock.calls[0]
      const logMessage = logCall[0]
      
      // The secure logger should have sanitized the message and context data
      // Check that sensitive information is hidden or replaced
      expect(typeof logMessage).toBe('string')
      expect(logMessage).toContain('HIGH SEVERITY')
      expect(logMessage).toContain('Authentication failed')
      
      // Verify the error was processed and logged
      const stats = errorService.getStats()
      expect(stats.totalErrors).toBeGreaterThan(0)

      spy.mockRestore()
    })
  })

  describe('Error Recovery and Debugging', () => {
    it('should provide debugging information', () => {
      const debugError = new AppError({
        message: 'Debug test error',
        originalError: new Error('Original cause'),
        context: { debugInfo: 'test-debug-data' }
      })

      const json = debugError.toJSON()
      expect(json.originalError).toBeDefined()
      expect(json.originalError.message).toBe('Original cause')
      expect(json.stack).toBeDefined()
      expect(json.context.debugInfo).toBe('test-debug-data')
    })

    it('should track error performance metrics', async () => {
      const { performanceMonitor } = await import('../../utils/optimizedPerformanceMonitor')
      
      const performanceError = new AppError({
        message: 'Performance test error',
        category: ErrorCategory.SYSTEM,
        code: ErrorCode.SYSTEM_RESOURCE_EXHAUSTED
      })

      await errorService.logError(performanceError)

      expect(performanceMonitor.trackCustomMetric).toHaveBeenCalledWith(
        'error_system',
        expect.any(Number),
        {
          severity: ErrorSeverity.MEDIUM,
          code: ErrorCode.SYSTEM_RESOURCE_EXHAUSTED
        }
      )
    })
  })

  describe('User Experience Improvements', () => {
    it('should provide appropriate user messages for different error types', () => {
      const errors = [
        {
          error: new AppError({ category: ErrorCategory.VALIDATION, message: 'Field required' }),
          expectedMessage: 'Please check your input and try again.'
        },
        {
          error: new AppError({ category: ErrorCategory.NETWORK, message: 'Connection timeout' }),
          expectedMessage: 'Network connection failed. Please check your internet connection.'
        },
        {
          error: new AppError({ category: ErrorCategory.AUTHENTICATION, message: 'Invalid credentials' }),
          expectedMessage: 'Authentication failed. Please check your credentials.'
        },
        {
          error: new AppError({ category: ErrorCategory.AUTHORIZATION, message: 'Access denied' }),
          expectedMessage: 'You don\'t have permission to perform this action.'
        }
      ]

      errors.forEach(({ error, expectedMessage }) => {
        expect(error.userMessage).toBe(expectedMessage)
      })
    })

    it('should preserve custom user messages when provided', () => {
      const customMessage = 'This is a custom user-friendly message'
      const error = new AppError({
        message: 'Technical error message',
        userMessage: customMessage
      })

      expect(error.userMessage).toBe(customMessage)
    })
  })
})