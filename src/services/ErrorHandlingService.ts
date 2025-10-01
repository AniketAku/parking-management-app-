// =============================================================================
// ERROR HANDLING AND DATA CONSISTENCY SERVICE
// Comprehensive error handling, data consistency, and fault tolerance mechanisms
// =============================================================================

import { supabase } from '../lib/supabase';
import { performanceOptimizationService } from './PerformanceOptimizationService';

export interface ErrorContext {
  operation: string;
  component?: string;
  userId?: string;
  shiftId?: string;
  sessionId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
  stackTrace?: string;
  userAgent?: string;
  url?: string;
}

export interface DataConsistencyCheck {
  id: string;
  checkType: 'referential_integrity' | 'data_validation' | 'business_rules' | 'audit_trail';
  table: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'error';
  issues: ConsistencyIssue[];
  startTime: number;
  endTime?: number;
  metadata?: Record<string, any>;
}

export interface ConsistencyIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  affectedRecords: string[];
  suggestedFix?: string;
  autoFixable: boolean;
}

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBackoff: boolean;
  jitter: boolean;
  retryableErrors: string[];
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
  halfOpenUntil?: number;
}

export class ErrorHandlingService {
  private static instance: ErrorHandlingService;

  // Error tracking and analytics
  private errorLog: Map<string, ErrorContext[]> = new Map();
  private errorCounts = new Map<string, number>();
  private circuitBreakers = new Map<string, CircuitBreakerState>();

  // Data consistency management
  private consistencyChecks = new Map<string, DataConsistencyCheck>();
  private consistencyScheduler?: NodeJS.Timeout;

  // Retry and recovery
  private readonly defaultRetryPolicy: RetryPolicy = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    exponentialBackoff: true,
    jitter: true,
    retryableErrors: [
      'PGRST301', // Connection timeout
      'PGRST302', // Connection failed
      'NETWORK_ERROR',
      'TEMPORARY_UNAVAILABLE'
    ]
  };

  // Circuit breaker configuration
  private readonly circuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeoutMs: 60000,
    halfOpenMaxCalls: 3
  };

  public static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  constructor() {
    this.initializeConsistencyScheduler();
    this.setupGlobalErrorHandling();
  }

  /**
   * Report and log error with context
   */
  async reportError(
    error: Error | string,
    context: Partial<ErrorContext>,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<string> {
    const errorId = this.generateErrorId();
    const errorMessage = typeof error === 'string' ? error : error.message;
    const stackTrace = error instanceof Error ? error.stack : undefined;

    const fullContext: ErrorContext = {
      operation: 'unknown',
      timestamp: Date.now(),
      ...context,
      metadata: {
        severity,
        ...context.metadata
      },
      stackTrace,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    };

    // Store error locally
    const operationErrors = this.errorLog.get(fullContext.operation) || [];
    operationErrors.push(fullContext);
    this.errorLog.set(fullContext.operation, operationErrors.slice(-50)); // Keep last 50 errors per operation

    // Update error counts
    const currentCount = this.errorCounts.get(fullContext.operation) || 0;
    this.errorCounts.set(fullContext.operation, currentCount + 1);

    // Update circuit breaker state
    this.updateCircuitBreaker(fullContext.operation, false);

    // Log to database for persistent tracking
    try {
      await this.persistError(errorId, errorMessage, fullContext);
    } catch (persistError) {
      console.error('Failed to persist error to database:', persistError);
    }

    // Trigger alerts for critical errors
    if (severity === 'critical') {
      await this.triggerCriticalErrorAlert(errorId, errorMessage, fullContext);
    }

    console.error(`[${severity.toUpperCase()}] ${fullContext.operation}:`, errorMessage, fullContext);
    return errorId;
  }

  /**
   * Execute operation with comprehensive error handling and retry logic
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: {
      retryPolicy?: Partial<RetryPolicy>;
      circuitBreaker?: boolean;
      timeout?: number;
      context?: Partial<ErrorContext>;
    } = {}
  ): Promise<T> {
    const {
      retryPolicy = {},
      circuitBreaker = true,
      timeout = 30000,
      context = {}
    } = options;

    const effectiveRetryPolicy = { ...this.defaultRetryPolicy, ...retryPolicy };

    // Check circuit breaker
    if (circuitBreaker && this.isCircuitOpen(operationName)) {
      throw new Error(`Circuit breaker is open for operation: ${operationName}`);
    }

    let lastError: Error;

    for (let attempt = 1; attempt <= effectiveRetryPolicy.maxAttempts; attempt++) {
      try {
        const result = timeout > 0
          ? await this.withTimeout(operation(), timeout)
          : await operation();

        // Success - update circuit breaker
        this.updateCircuitBreaker(operationName, true);

        return result;
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (!this.isRetryableError(lastError, effectiveRetryPolicy)) {
          break;
        }

        // Report error with attempt context
        await this.reportError(lastError, {
          ...context,
          operation: operationName,
          metadata: { attempt, maxAttempts: effectiveRetryPolicy.maxAttempts, ...context.metadata }
        });

        // Don't wait after the last attempt
        if (attempt < effectiveRetryPolicy.maxAttempts) {
          await this.delay(this.calculateRetryDelay(attempt, effectiveRetryPolicy));
        }
      }
    }

    // All retries failed - update circuit breaker and throw
    this.updateCircuitBreaker(operationName, false);
    await this.reportError(lastError!, {
      ...context,
      operation: operationName,
      metadata: { allRetriesFailed: true, ...context.metadata }
    }, 'high');

    throw lastError!;
  }

  /**
   * Comprehensive data consistency checking
   */
  async checkDataConsistency(
    checkType: DataConsistencyCheck['checkType'],
    table: string,
    options: {
      autoFix?: boolean;
      scope?: 'all' | 'recent' | 'critical';
      maxIssues?: number;
    } = {}
  ): Promise<DataConsistencyCheck> {
    const checkId = this.generateConsistencyCheckId();
    const { autoFix = false, scope = 'recent', maxIssues = 100 } = options;

    const consistencyCheck: DataConsistencyCheck = {
      id: checkId,
      checkType,
      table,
      status: 'running',
      issues: [],
      startTime: Date.now(),
      metadata: { autoFix, scope, maxIssues }
    };

    this.consistencyChecks.set(checkId, consistencyCheck);

    try {
      const issues = await this.performConsistencyCheck(checkType, table, scope, maxIssues);
      consistencyCheck.issues = issues;
      consistencyCheck.status = issues.length > 0 ? 'failed' : 'passed';

      // Auto-fix if enabled and issues are fixable
      if (autoFix && issues.length > 0) {
        await this.autoFixConsistencyIssues(checkId);
      }

      consistencyCheck.endTime = Date.now();
      console.log(`Data consistency check completed for ${table} (${checkType}): ${issues.length} issues found`);

      return consistencyCheck;
    } catch (error) {
      consistencyCheck.status = 'error';
      consistencyCheck.endTime = Date.now();

      await this.reportError(error as Error, {
        operation: 'data_consistency_check',
        metadata: { checkId, checkType, table }
      }, 'high');

      throw error;
    }
  }

  /**
   * Transaction management with rollback capabilities
   */
  async executeTransaction<T>(
    operations: Array<() => Promise<any>>,
    transactionName: string,
    options: {
      isolationLevel?: 'read_uncommitted' | 'read_committed' | 'repeatable_read' | 'serializable';
      timeout?: number;
      onRollback?: (error: Error) => Promise<void>;
    } = {}
  ): Promise<T[]> {
    const { isolationLevel = 'read_committed', timeout = 60000, onRollback } = options;

    const transactionContext = {
      operation: 'database_transaction',
      metadata: { transactionName, operationsCount: operations.length, isolationLevel }
    };

    try {
      // Start transaction
      const { data, error: beginError } = await supabase.rpc('begin_transaction', {
        isolation_level: isolationLevel
      });

      if (beginError) {
        throw new Error(`Failed to begin transaction: ${beginError.message}`);
      }

      const results: T[] = [];
      const executedOperations: number[] = [];

      try {
        // Execute operations sequentially within transaction
        for (let i = 0; i < operations.length; i++) {
          const result = await this.withTimeout(operations[i](), timeout / operations.length);
          results.push(result);
          executedOperations.push(i);
        }

        // Commit transaction
        const { error: commitError } = await supabase.rpc('commit_transaction');
        if (commitError) {
          throw new Error(`Failed to commit transaction: ${commitError.message}`);
        }

        console.log(`Transaction ${transactionName} committed successfully`);
        return results;

      } catch (operationError) {
        // Rollback transaction
        try {
          const { error: rollbackError } = await supabase.rpc('rollback_transaction');
          if (rollbackError) {
            console.error('Failed to rollback transaction:', rollbackError);
          }

          if (onRollback) {
            await onRollback(operationError as Error);
          }

        } catch (rollbackError) {
          console.error('Error during transaction rollback:', rollbackError);
        }

        await this.reportError(operationError as Error, {
          ...transactionContext,
          metadata: {
            ...transactionContext.metadata,
            executedOperations: executedOperations.length,
            rollbackPerformed: true
          }
        }, 'high');

        throw operationError;
      }
    } catch (transactionError) {
      await this.reportError(transactionError as Error, transactionContext, 'high');
      throw transactionError;
    }
  }

  /**
   * Data validation and sanitization
   */
  validateAndSanitizeData<T extends Record<string, any>>(
    data: T,
    schema: Record<keyof T, {
      required?: boolean;
      type?: 'string' | 'number' | 'boolean' | 'date' | 'uuid' | 'email';
      minLength?: number;
      maxLength?: number;
      min?: number;
      max?: number;
      pattern?: RegExp;
      sanitize?: boolean;
    }>
  ): { isValid: boolean; errors: string[]; sanitizedData: Partial<T> } {
    const errors: string[] = [];
    const sanitizedData: Partial<T> = {};

    for (const [field, rules] of Object.entries(schema) as [keyof T, any][]) {
      const value = data[field];

      // Required field check
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`Field ${String(field)} is required`);
        continue;
      }

      // Skip validation for optional empty fields
      if (!rules.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Type validation
      if (rules.type) {
        const typeError = this.validateFieldType(field as string, value, rules.type);
        if (typeError) {
          errors.push(typeError);
          continue;
        }
      }

      // String validations
      if (typeof value === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`Field ${String(field)} must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`Field ${String(field)} must be no more than ${rules.maxLength} characters`);
        }
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(`Field ${String(field)} format is invalid`);
        }

        // Sanitize string if requested
        sanitizedData[field] = rules.sanitize ? this.sanitizeString(value) as T[keyof T] : value;
      } else {
        sanitizedData[field] = value;
      }

      // Number validations
      if (typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`Field ${String(field)} must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`Field ${String(field)} must be no more than ${rules.max}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData
    };
  }

  /**
   * Get error statistics and health metrics
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByOperation: Record<string, number>;
    recentErrors: ErrorContext[];
    circuitBreakerStates: Record<string, CircuitBreakerState>;
    topErrors: Array<{ operation: string; count: number; lastOccurred: number }>;
  } {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    const errorsByOperation = Object.fromEntries(this.errorCounts);

    // Get recent errors (last 100 across all operations)
    const allRecentErrors = Array.from(this.errorLog.values())
      .flat()
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 100);

    // Get top errors by frequency
    const topErrors = Array.from(this.errorCounts.entries())
      .map(([operation, count]) => ({
        operation,
        count,
        lastOccurred: Math.max(...(this.errorLog.get(operation) || []).map(e => e.timestamp))
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors,
      errorsByOperation,
      recentErrors: allRecentErrors,
      circuitBreakerStates: Object.fromEntries(this.circuitBreakers),
      topErrors
    };
  }

  // Private methods

  private initializeConsistencyScheduler(): void {
    // Schedule regular consistency checks
    this.consistencyScheduler = setInterval(async () => {
      try {
        await this.runScheduledConsistencyChecks();
      } catch (error) {
        console.error('Scheduled consistency check failed:', error);
      }
    }, 3600000); // Every hour
  }

  private setupGlobalErrorHandling(): void {
    if (typeof window !== 'undefined') {
      // Browser environment
      window.addEventListener('unhandledrejection', (event) => {
        this.reportError(
          event.reason,
          { operation: 'unhandled_promise_rejection' },
          'high'
        );
      });

      window.addEventListener('error', (event) => {
        this.reportError(
          event.error || event.message,
          { operation: 'unhandled_error', metadata: { filename: event.filename, lineno: event.lineno } },
          'high'
        );
      });
    }

    // Handle Supabase errors globally
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        // Clear circuit breakers on auth changes
        this.circuitBreakers.clear();
      }
    });
  }

  private async runScheduledConsistencyChecks(): Promise<void> {
    const checksToRun = [
      { type: 'referential_integrity' as const, table: 'parking_sessions' },
      { type: 'referential_integrity' as const, table: 'payments' },
      { type: 'business_rules' as const, table: 'shift_sessions' }
    ];

    for (const { type, table } of checksToRun) {
      try {
        await this.checkDataConsistency(type, table, { scope: 'recent' });
      } catch (error) {
        console.error(`Scheduled consistency check failed for ${table}:`, error);
      }
    }
  }

  private async performConsistencyCheck(
    checkType: DataConsistencyCheck['checkType'],
    table: string,
    scope: string,
    maxIssues: number
  ): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    try {
      switch (checkType) {
        case 'referential_integrity':
          issues.push(...await this.checkReferentialIntegrity(table, scope, maxIssues));
          break;
        case 'data_validation':
          issues.push(...await this.checkDataValidation(table, scope, maxIssues));
          break;
        case 'business_rules':
          issues.push(...await this.checkBusinessRules(table, scope, maxIssues));
          break;
        case 'audit_trail':
          issues.push(...await this.checkAuditTrail(table, scope, maxIssues));
          break;
      }
    } catch (error) {
      console.error('Error during consistency check:', error);
      throw error;
    }

    return issues.slice(0, maxIssues);
  }

  private async checkReferentialIntegrity(table: string, scope: string, maxIssues: number): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    try {
      // Check for orphaned records based on table
      if (table === 'parking_sessions') {
        const { data: orphanedSessions } = await supabase
          .from('parking_sessions')
          .select('id')
          .is('shift_session_id', null)
          .limit(maxIssues);

        if (orphanedSessions && orphanedSessions.length > 0) {
          issues.push({
            severity: 'medium',
            type: 'orphaned_parking_sessions',
            description: `${orphanedSessions.length} parking sessions are not linked to any shift`,
            affectedRecords: orphanedSessions.map(s => s.id),
            suggestedFix: 'Link sessions to appropriate shifts or create default shift',
            autoFixable: true
          });
        }
      }

      if (table === 'payments') {
        const { data: orphanedPayments } = await supabase
          .from('payments')
          .select('id')
          .is('parking_session_id', null)
          .limit(maxIssues);

        if (orphanedPayments && orphanedPayments.length > 0) {
          issues.push({
            severity: 'high',
            type: 'orphaned_payments',
            description: `${orphanedPayments.length} payments are not linked to parking sessions`,
            affectedRecords: orphanedPayments.map(p => p.id),
            suggestedFix: 'Link payments to appropriate parking sessions',
            autoFixable: false
          });
        }
      }
    } catch (error) {
      console.error('Referential integrity check failed:', error);
      throw error;
    }

    return issues;
  }

  private async checkDataValidation(table: string, scope: string, maxIssues: number): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // Add specific data validation checks based on business rules
    // This is a simplified implementation - expand based on your specific requirements

    return issues;
  }

  private async checkBusinessRules(table: string, scope: string, maxIssues: number): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // Add business rule validation
    // This is a simplified implementation - expand based on your specific requirements

    return issues;
  }

  private async checkAuditTrail(table: string, scope: string, maxIssues: number): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // Check audit trail completeness and integrity
    // This is a simplified implementation - expand based on your specific requirements

    return issues;
  }

  private async autoFixConsistencyIssues(checkId: string): Promise<void> {
    const check = this.consistencyChecks.get(checkId);
    if (!check) return;

    const fixableIssues = check.issues.filter(issue => issue.autoFixable);

    for (const issue of fixableIssues) {
      try {
        await this.applyAutoFix(issue, check.table);
      } catch (error) {
        console.error(`Auto-fix failed for issue ${issue.type}:`, error);
      }
    }
  }

  private async applyAutoFix(issue: ConsistencyIssue, table: string): Promise<void> {
    // Apply specific fixes based on issue type
    switch (issue.type) {
      case 'orphaned_parking_sessions':
        // Link to current active shift if available
        const activeShift = await this.getCurrentActiveShift();
        if (activeShift) {
          await supabase
            .from('parking_sessions')
            .update({ shift_session_id: activeShift.id })
            .in('id', issue.affectedRecords);
        }
        break;

      default:
        console.warn(`No auto-fix available for issue type: ${issue.type}`);
    }
  }

  private async getCurrentActiveShift(): Promise<{ id: string } | null> {
    const { data } = await supabase
      .from('shift_sessions')
      .select('id')
      .eq('status', 'active')
      .single();

    return data;
  }

  private isCircuitOpen(operationName: string): boolean {
    const breaker = this.circuitBreakers.get(operationName);
    if (!breaker) return false;

    const now = Date.now();

    if (breaker.isOpen) {
      if (breaker.halfOpenUntil && now > breaker.halfOpenUntil) {
        // Transition to half-open
        breaker.isOpen = false;
        breaker.halfOpenUntil = undefined;
        breaker.successCount = 0;
        return false;
      }
      return true;
    }

    return false;
  }

  private updateCircuitBreaker(operationName: string, success: boolean): void {
    let breaker = this.circuitBreakers.get(operationName);

    if (!breaker) {
      breaker = {
        isOpen: false,
        failureCount: 0,
        lastFailureTime: 0,
        successCount: 0
      };
      this.circuitBreakers.set(operationName, breaker);
    }

    if (success) {
      breaker.failureCount = 0;
      breaker.successCount++;

      if (breaker.isOpen && breaker.successCount >= this.circuitBreakerConfig.halfOpenMaxCalls) {
        breaker.isOpen = false;
        breaker.halfOpenUntil = undefined;
        console.log(`Circuit breaker closed for operation: ${operationName}`);
      }
    } else {
      breaker.failureCount++;
      breaker.lastFailureTime = Date.now();
      breaker.successCount = 0;

      if (breaker.failureCount >= this.circuitBreakerConfig.failureThreshold) {
        breaker.isOpen = true;
        breaker.halfOpenUntil = Date.now() + this.circuitBreakerConfig.resetTimeoutMs;
        console.warn(`Circuit breaker opened for operation: ${operationName}`);
      }
    }
  }

  private isRetryableError(error: Error, policy: RetryPolicy): boolean {
    const errorMessage = error.message.toLowerCase();

    return policy.retryableErrors.some(retryableError =>
      errorMessage.includes(retryableError.toLowerCase())
    );
  }

  private calculateRetryDelay(attempt: number, policy: RetryPolicy): number {
    let delay = policy.exponentialBackoff
      ? policy.baseDelayMs * Math.pow(2, attempt - 1)
      : policy.baseDelayMs;

    delay = Math.min(delay, policy.maxDelayMs);

    if (policy.jitter) {
      delay *= (0.5 + Math.random() * 0.5); // Add 0-50% jitter
    }

    return Math.floor(delay);
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    if (timeoutMs <= 0) return promise;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private validateFieldType(field: string, value: any, expectedType: string): string | null {
    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          return `Field ${field} must be a string`;
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return `Field ${field} must be a valid number`;
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return `Field ${field} must be a boolean`;
        }
        break;
      case 'date':
        if (!value || isNaN(Date.parse(value))) {
          return `Field ${field} must be a valid date`;
        }
        break;
      case 'uuid':
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(value)) {
          return `Field ${field} must be a valid UUID`;
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return `Field ${field} must be a valid email address`;
        }
        break;
    }

    return null;
  }

  private sanitizeString(input: string): string {
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }

  private async persistError(errorId: string, message: string, context: ErrorContext): Promise<void> {
    try {
      const { error } = await supabase
        .from('error_logs')
        .insert({
          id: errorId,
          error_message: message,
          operation: context.operation,
          component: context.component,
          user_id: context.userId,
          shift_id: context.shiftId,
          session_id: context.sessionId,
          stack_trace: context.stackTrace,
          metadata: context.metadata,
          timestamp: new Date(context.timestamp).toISOString()
        });

      if (error) {
        console.warn('Failed to persist error to database:', error);
      }
    } catch (persistError) {
      console.warn('Error persisting error to database:', persistError);
    }
  }

  private async triggerCriticalErrorAlert(errorId: string, message: string, context: ErrorContext): Promise<void> {
    try {
      // Send notification through pg_notify
      await supabase.rpc('notify_critical_error', {
        error_id: errorId,
        error_message: message,
        operation: context.operation,
        metadata: context.metadata
      });
    } catch (error) {
      console.error('Failed to trigger critical error alert:', error);
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateConsistencyCheckId(): string {
    return `cc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.consistencyScheduler) {
      clearInterval(this.consistencyScheduler);
    }

    this.errorLog.clear();
    this.errorCounts.clear();
    this.circuitBreakers.clear();
    this.consistencyChecks.clear();
  }
}

// Export singleton instance
export const errorHandlingService = ErrorHandlingService.getInstance();