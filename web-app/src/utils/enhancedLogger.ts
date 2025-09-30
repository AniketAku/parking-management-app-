/**
 * Enhanced Production-Safe Logging System
 * Intelligent noise reduction with context-aware logging levels
 * Built on secureLogger foundation with advanced filtering
 */

import { secureLogger, type LogLevel, type LogEntry } from './secureLogger'
import { loggingConfig } from '../config/loggingConfig'

export type EnhancedLogLevel = LogLevel | 'trace' | 'performance'
export type LogContext = 'development' | 'performance' | 'user-action' | 'system' | 'security' | 'demo' | 'component'
export type NoiseLevel = 'silent' | 'minimal' | 'normal' | 'verbose' | 'debug'

export interface EnhancedLogEntry extends LogEntry {
  level: EnhancedLogLevel
  context: LogContext
  component?: string
  userId?: string
  sessionId?: string
  noiseLevel: NoiseLevel
  productsionSafe: boolean
}

interface LoggingConfig {
  enabledContexts: Set<LogContext>
  maxNoiseLevel: NoiseLevel
  enablePerformanceLogging: boolean
  enableUserActionTracking: boolean
  enableComponentDebugging: boolean
  rateLimitMs: number
  maxBufferSize: number
  intelligentFiltering: boolean
}

interface RateLimitEntry {
  lastLog: number
  count: number
  suppressed: number
}

export class EnhancedLogger {
  private static instance: EnhancedLogger
  private config: LoggingConfig
  private rateLimitMap = new Map<string, RateLimitEntry>()
  private isDevelopment = import.meta.env.DEV
  private isProduction = import.meta.env.PROD
  private sessionId = this.generateSessionId()
  private logBuffer: EnhancedLogEntry[] = []
  
  // Noise level hierarchy: silent < minimal < normal < verbose < debug
  private noiseHierarchy: Record<NoiseLevel, number> = {
    silent: 0,
    minimal: 1,
    normal: 2,
    verbose: 3,
    debug: 4
  }

  private constructor() {
    // Load configuration from centralized config manager
    this.config = loggingConfig.getEnhancedLoggerConfig()

    // Integrate with existing secureLogger for production safety
    if (this.isProduction) {
      this.enableProductionMode()
    }
    
    // Set up configuration sync
    this.syncWithLoggingConfig()
  }

  static getInstance(): EnhancedLogger {
    if (!EnhancedLogger.instance) {
      EnhancedLogger.instance = new EnhancedLogger()
    }
    return EnhancedLogger.instance
  }

  /**
   * Sync configuration with centralized logging config
   */
  private syncWithLoggingConfig(): void {
    const globalConfig = loggingConfig.getConfig()
    
    // Update local config based on global settings
    if (!globalConfig.enableLogging) {
      this.config.enabledContexts = new Set([])
      return
    }
    
    // Sync specific settings
    this.config.enablePerformanceLogging = globalConfig.enablePerformanceLogging
    this.config.enableUserActionTracking = globalConfig.enableUserActionTracking
    this.config.enableComponentDebugging = globalConfig.enableComponentDebugging
    this.config.maxNoiseLevel = globalConfig.maxNoiseLevel
    this.config.rateLimitMs = globalConfig.rateLimitMs
    this.config.maxBufferSize = globalConfig.maxBufferSize
  }

  /**
   * Enable production mode with enhanced security
   */
  private enableProductionMode(): void {
    this.config.maxNoiseLevel = 'minimal'
    this.config.enablePerformanceLogging = false
    this.config.enableComponentDebugging = false
    this.config.enabledContexts = new Set(['system', 'security', 'user-action'])
    this.config.intelligentFiltering = true
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
  }

  /**
   * Check if log should be processed based on noise level and context
   */
  private shouldLog(level: EnhancedLogLevel, context: LogContext, noiseLevel: NoiseLevel): boolean {
    // Sync with global config first
    this.syncWithLoggingConfig()
    
    // Check if logging is globally disabled
    const globalConfig = loggingConfig.getConfig()
    if (!globalConfig.enableLogging) {
      return false
    }

    // Always log errors and security issues
    if (level === 'error' || context === 'security') {
      return true
    }

    // Check if context is enabled
    if (!this.config.enabledContexts.has(context)) {
      return false
    }

    // Check noise level hierarchy
    if (this.noiseHierarchy[noiseLevel] > this.noiseHierarchy[this.config.maxNoiseLevel]) {
      return false
    }

    // Context-specific filtering with global config integration
    switch (context) {
      case 'demo':
        return globalConfig.enableDemoLogging && this.isDevelopment
      case 'performance':
        return globalConfig.enablePerformanceLogging
      case 'component':
        return globalConfig.enableComponentDebugging
      default:
        return true
    }
  }

  /**
   * Apply rate limiting to prevent log spam
   */
  private applyRateLimit(key: string): boolean {
    const now = Date.now()
    const entry = this.rateLimitMap.get(key)

    if (!entry) {
      this.rateLimitMap.set(key, { lastLog: now, count: 1, suppressed: 0 })
      return true
    }

    if (now - entry.lastLog < this.config.rateLimitMs) {
      entry.suppressed++
      return false
    }

    // Reset rate limit window
    if (entry.suppressed > 0) {
      // Log suppressed count
      this.logDirect('info', 'system', 'minimal', 
        `Suppressed ${entry.suppressed} similar log messages`, { key })
    }
    
    entry.lastLog = now
    entry.count++
    entry.suppressed = 0
    return true
  }

  /**
   * Add entry to enhanced log buffer
   */
  private addToBuffer(entry: EnhancedLogEntry): void {
    this.logBuffer.push(entry)
    if (this.logBuffer.length > this.config.maxBufferSize) {
      this.logBuffer.shift()
    }
  }

  /**
   * Direct logging method that bypasses some filters
   */
  private logDirect(
    level: EnhancedLogLevel,
    context: LogContext,
    noiseLevel: NoiseLevel,
    message: string,
    data?: any
  ): void {
    const entry: EnhancedLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      noiseLevel,
      message,
      data,
      productsionSafe: level === 'error' || context === 'security' || noiseLevel === 'minimal',
      sessionId: this.sessionId
    }

    this.addToBuffer(entry)

    // Route to secureLogger for production safety
    switch (level) {
      case 'trace':
      case 'debug':
        secureLogger.debug(message, data, context)
        break
      case 'info':
      case 'performance':
        secureLogger.info(message, data, context)
        break
      case 'warn':
        secureLogger.warn(message, data, context)
        break
      case 'error':
        secureLogger.error(message, data, context)
        break
    }
  }

  /**
   * Enhanced logging method with intelligent filtering
   */
  public log(
    level: EnhancedLogLevel,
    context: LogContext,
    noiseLevel: NoiseLevel,
    message: string,
    data?: any,
    component?: string,
    userId?: string
  ): void {
    // Apply intelligent filtering
    if (!this.shouldLog(level, context, noiseLevel)) {
      return
    }

    // Generate rate limit key
    const rateLimitKey = `${level}:${context}:${component || 'global'}:${message.substring(0, 50)}`
    
    // Apply rate limiting (except for errors and security)
    if (level !== 'error' && context !== 'security') {
      if (!this.applyRateLimit(rateLimitKey)) {
        return
      }
    }

    this.logDirect(level, context, noiseLevel, message, { 
      ...data, 
      component, 
      userId,
      rateLimitKey 
    })
  }

  /**
   * Convenience methods for common logging patterns
   */
  public debug(message: string, data?: any, component?: string): void {
    this.log('debug', 'development', 'debug', message, data, component)
  }

  public info(message: string, data?: any, component?: string): void {
    this.log('info', 'system', 'normal', message, data, component)
  }

  public warn(message: string, data?: any, component?: string): void {
    this.log('warn', 'system', 'minimal', message, data, component)
  }

  public error(message: string, error?: Error | any, component?: string): void {
    this.log('error', 'system', 'minimal', message, { error, stack: error?.stack }, component)
  }

  /**
   * Context-specific logging methods
   */
  public performance(message: string, metrics?: any, component?: string): void {
    if (!this.config.enablePerformanceLogging) return
    this.log('performance', 'performance', 'verbose', message, metrics, component)
  }

  public userAction(action: string, data?: any, userId?: string): void {
    if (!this.config.enableUserActionTracking) return
    this.log('info', 'user-action', 'normal', `User action: ${action}`, data, undefined, userId)
  }

  public component(component: string, event: string, data?: any): void {
    if (!this.config.enableComponentDebugging) return
    this.log('debug', 'component', 'verbose', `${component}: ${event}`, data, component)
  }

  public security(message: string, data?: any, component?: string): void {
    this.log('error', 'security', 'minimal', `Security: ${message}`, data, component)
  }

  public demo(message: string, data?: any): void {
    // Demo logs are development-only with high noise level
    this.log('info', 'demo', 'debug', `Demo: ${message}`, data)
  }

  /**
   * Safe production logging for user-facing messages
   */
  public success(message: string, component?: string): void {
    secureLogger.success(message, component)
  }

  /**
   * Configure logging behavior
   */
  public configure(config: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current logging statistics
   */
  public getStats(): {
    totalLogs: number
    logsByLevel: Record<string, number>
    logsByContext: Record<string, number>
    rateLimitStats: { key: string; count: number; suppressed: number }[]
    sessionId: string
  } {
    const logsByLevel: Record<string, number> = {}
    const logsByContext: Record<string, number> = {}

    this.logBuffer.forEach(entry => {
      logsByLevel[entry.level] = (logsByLevel[entry.level] || 0) + 1
      logsByContext[entry.context] = (logsByContext[entry.context] || 0) + 1
    })

    const rateLimitStats = Array.from(this.rateLimitMap.entries())
      .map(([key, data]) => ({ key, count: data.count, suppressed: data.suppressed }))
      .filter(stat => stat.suppressed > 0)

    return {
      totalLogs: this.logBuffer.length,
      logsByLevel,
      logsByContext,
      rateLimitStats,
      sessionId: this.sessionId
    }
  }

  /**
   * Clear all logs and reset statistics
   */
  public clearLogs(): void {
    this.logBuffer = []
    this.rateLimitMap.clear()
    secureLogger.clearBuffer()
  }

  /**
   * Export logs for debugging
   */
  public exportLogs(): EnhancedLogEntry[] {
    return [...this.logBuffer]
  }

  /**
   * Enable/disable intelligent filtering
   */
  public setIntelligentFiltering(enabled: boolean): void {
    this.config.intelligentFiltering = enabled
  }

  /**
   * Adjust noise level dynamically
   */
  public setMaxNoiseLevel(level: NoiseLevel): void {
    this.config.maxNoiseLevel = level
  }
}

// Export singleton instance
export const enhancedLogger = EnhancedLogger.getInstance()

// Convenience exports for easy migration
export const logger = {
  debug: enhancedLogger.debug.bind(enhancedLogger),
  info: enhancedLogger.info.bind(enhancedLogger),
  warn: enhancedLogger.warn.bind(enhancedLogger),
  error: enhancedLogger.error.bind(enhancedLogger),
  success: enhancedLogger.success.bind(enhancedLogger),
  performance: enhancedLogger.performance.bind(enhancedLogger),
  userAction: enhancedLogger.userAction.bind(enhancedLogger),
  component: enhancedLogger.component.bind(enhancedLogger),
  security: enhancedLogger.security.bind(enhancedLogger),
  demo: enhancedLogger.demo.bind(enhancedLogger)
}

export default enhancedLogger