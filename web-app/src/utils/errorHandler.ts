/**
 * Standardized Error Handling System
 * Provides consistent error types, handling, and debugging capabilities
 */

// Error severity levels for proper categorization
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories for better organization and handling
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  DATABASE = 'database',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  UI = 'ui',
  UNKNOWN = 'unknown'
}

// Error codes for specific error identification
export enum ErrorCode {
  // Validation errors
  VALIDATION_REQUIRED_FIELD = 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',
  VALIDATION_OUT_OF_RANGE = 'VALIDATION_OUT_OF_RANGE',
  
  // Authentication errors
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_SESSION_INVALID = 'AUTH_SESSION_INVALID',
  AUTH_USER_NOT_FOUND = 'AUTH_USER_NOT_FOUND',
  
  // Authorization errors
  AUTHZ_INSUFFICIENT_PERMISSIONS = 'AUTHZ_INSUFFICIENT_PERMISSIONS',
  AUTHZ_ACCESS_DENIED = 'AUTHZ_ACCESS_DENIED',
  
  // Network errors
  NETWORK_CONNECTION_FAILED = 'NETWORK_CONNECTION_FAILED',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_SERVER_ERROR = 'NETWORK_SERVER_ERROR',
  
  // Database errors
  DATABASE_CONNECTION_FAILED = 'DATABASE_CONNECTION_FAILED',
  DATABASE_QUERY_FAILED = 'DATABASE_QUERY_FAILED',
  DATABASE_CONSTRAINT_VIOLATION = 'DATABASE_CONSTRAINT_VIOLATION',
  DATABASE_RECORD_NOT_FOUND = 'DATABASE_RECORD_NOT_FOUND',
  
  // Business logic errors
  BUSINESS_DUPLICATE_ENTRY = 'BUSINESS_DUPLICATE_ENTRY',
  BUSINESS_INVALID_OPERATION = 'BUSINESS_INVALID_OPERATION',
  BUSINESS_RESOURCE_UNAVAILABLE = 'BUSINESS_RESOURCE_UNAVAILABLE',
  
  // System errors
  SYSTEM_CONFIGURATION_ERROR = 'SYSTEM_CONFIGURATION_ERROR',
  SYSTEM_RESOURCE_EXHAUSTED = 'SYSTEM_RESOURCE_EXHAUSTED',
  
  // UI errors
  UI_COMPONENT_RENDER_FAILED = 'UI_COMPONENT_RENDER_FAILED',
  UI_STATE_INCONSISTENT = 'UI_STATE_INCONSISTENT',
  
  // Generic
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Detailed error context for debugging
export interface ErrorContext {
  userId?: string
  sessionId?: string
  requestId?: string
  component?: string
  action?: string
  metadata?: Record<string, any>
  stackTrace?: string
  timestamp: Date
  userAgent?: string
  url?: string
}

// Validation error details
export interface ValidationErrorDetail {
  field: string
  value: any
  message: string
  code: ErrorCode
}

// Base application error class
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly category: ErrorCategory
  public readonly severity: ErrorSeverity
  public readonly context: ErrorContext
  public readonly validationErrors?: ValidationErrorDetail[]
  public readonly originalError?: Error
  public readonly userMessage: string
  public readonly isOperational: boolean

  constructor({
    message,
    code = ErrorCode.UNKNOWN_ERROR,
    category = ErrorCategory.UNKNOWN,
    severity = ErrorSeverity.MEDIUM,
    context,
    validationErrors,
    originalError,
    userMessage,
    isOperational = true
  }: {
    message: string
    code?: ErrorCode
    category?: ErrorCategory
    severity?: ErrorSeverity
    context?: Partial<ErrorContext>
    validationErrors?: ValidationErrorDetail[]
    originalError?: Error
    userMessage?: string
    isOperational?: boolean
  }) {
    super(message)
    
    this.name = 'AppError'
    this.code = code
    this.category = category
    this.severity = severity
    this.validationErrors = validationErrors
    this.originalError = originalError
    this.isOperational = isOperational
    
    // Generate user-friendly message if not provided
    this.userMessage = userMessage || this.generateUserMessage()
    
    // Build context with defaults
    this.context = {
      timestamp: new Date(),
      userAgent: typeof window !== 'undefined' ? window.navigator?.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location?.href : undefined,
      ...context
    }

    // Preserve stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }

  private generateUserMessage(): string {
    switch (this.category) {
      case ErrorCategory.VALIDATION:
        return 'Please check your input and try again.'
      case ErrorCategory.AUTHENTICATION:
        return 'Authentication failed. Please check your credentials.'
      case ErrorCategory.AUTHORIZATION:
        return 'You don\'t have permission to perform this action.'
      case ErrorCategory.NETWORK:
        return 'Network connection failed. Please check your internet connection.'
      case ErrorCategory.DATABASE:
        return 'Database operation failed. Please try again later.'
      case ErrorCategory.BUSINESS_LOGIC:
        return 'Operation could not be completed. Please try again.'
      default:
        return 'An unexpected error occurred. Please try again.'
    }
  }

  // Convert to plain object for logging/serialization
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      userMessage: this.userMessage,
      context: this.context,
      validationErrors: this.validationErrors,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    }
  }
}

// Specialized error classes
export class ValidationError extends AppError {
  constructor(
    validationErrors: ValidationErrorDetail[],
    context?: Partial<ErrorContext>
  ) {
    super({
      message: `Validation failed: ${validationErrors.map(e => e.message).join(', ')}`,
      code: ErrorCode.VALIDATION_INVALID_FORMAT,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      context,
      validationErrors,
      userMessage: 'Please check your input and correct any errors.'
    })
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(
    message: string = 'Authentication failed',
    code: ErrorCode = ErrorCode.AUTH_INVALID_CREDENTIALS,
    context?: Partial<ErrorContext>
  ) {
    super({
      message,
      code,
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
      context,
      userMessage: 'Please check your credentials and try again.'
    })
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(
    message: string = 'Access denied',
    context?: Partial<ErrorContext>
  ) {
    super({
      message,
      code: ErrorCode.AUTHZ_ACCESS_DENIED,
      category: ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.MEDIUM,
      context,
      userMessage: 'You don\'t have permission to perform this action.'
    })
    this.name = 'AuthorizationError'
  }
}

export class NetworkError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.NETWORK_CONNECTION_FAILED,
    originalError?: Error,
    context?: Partial<ErrorContext>
  ) {
    super({
      message,
      code,
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
      context,
      originalError,
      userMessage: 'Network connection failed. Please check your internet connection and try again.'
    })
    this.name = 'NetworkError'
  }
}

export class DatabaseError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.DATABASE_QUERY_FAILED,
    originalError?: Error,
    context?: Partial<ErrorContext>,
    severity: ErrorSeverity = ErrorSeverity.HIGH
  ) {
    super({
      message,
      code,
      category: ErrorCategory.DATABASE,
      severity,
      context,
      originalError,
      userMessage: 'Database operation failed. Please try again later.'
    })
    this.name = 'DatabaseError'
  }
}

export class BusinessLogicError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.BUSINESS_INVALID_OPERATION,
    context?: Partial<ErrorContext>
  ) {
    super({
      message,
      code,
      category: ErrorCategory.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
      context,
      userMessage: message // Business errors often have user-friendly messages
    })
    this.name = 'BusinessLogicError'
  }
}

// Error handling utilities
export class ErrorHandler {
  /**
   * Convert unknown error to AppError
   */
  static standardizeError(
    error: unknown,
    context?: Partial<ErrorContext>
  ): AppError {
    if (error instanceof AppError) {
      return error
    }

    if (error instanceof Error) {
      return new AppError({
        message: error.message,
        originalError: error,
        context: {
          ...context,
          stackTrace: error.stack
        }
      })
    }

    if (typeof error === 'string') {
      return new AppError({
        message: error,
        context
      })
    }

    return new AppError({
      message: 'An unknown error occurred',
      code: ErrorCode.UNKNOWN_ERROR,
      context: {
        ...context,
        metadata: { originalError: error }
      }
    })
  }

  /**
   * Handle and categorize Supabase errors
   */
  static fromSupabaseError(
    error: any,
    context?: Partial<ErrorContext>
  ): AppError {
    const message = error?.message || 'Database operation failed'
    const code = error?.code

    // Map Supabase error codes to our error codes
    let errorCode = ErrorCode.DATABASE_QUERY_FAILED
    let severity = ErrorSeverity.HIGH

    if (code === 'PGRST116') {
      errorCode = ErrorCode.DATABASE_RECORD_NOT_FOUND
      severity = ErrorSeverity.MEDIUM
    } else if (code?.includes('23505')) {
      errorCode = ErrorCode.DATABASE_CONSTRAINT_VIOLATION
    } else if (code?.includes('23503')) {
      errorCode = ErrorCode.DATABASE_CONSTRAINT_VIOLATION
    }

    return new DatabaseError(message, errorCode, error, context, severity)
  }

  /**
   * Handle network/fetch errors
   */
  static fromNetworkError(
    error: any,
    context?: Partial<ErrorContext>
  ): NetworkError {
    let code = ErrorCode.NETWORK_CONNECTION_FAILED

    if (error?.name === 'TimeoutError') {
      code = ErrorCode.NETWORK_TIMEOUT
    } else if (error?.status >= 500) {
      code = ErrorCode.NETWORK_SERVER_ERROR
    }

    return new NetworkError(
      error?.message || 'Network request failed',
      code,
      error,
      context
    )
  }

  /**
   * Check if error should be reported to error tracking
   */
  static shouldReport(error: AppError): boolean {
    // Don't report operational errors or validation errors
    return error.isOperational === false || error.severity === ErrorSeverity.CRITICAL
  }

  /**
   * Get user-facing message from error
   */
  static getUserMessage(error: unknown): string {
    if (error instanceof AppError) {
      return error.userMessage
    }
    return 'An unexpected error occurred. Please try again.'
  }
}

export default ErrorHandler