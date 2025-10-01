/**
 * Centralized Logging Configuration
 * Environment-based logging control with runtime adjustment capabilities
 */

import type { LogContext, NoiseLevel } from '../utils/enhancedLogger'

export interface LoggingEnvironmentConfig {
  // Environment detection
  environment: 'development' | 'staging' | 'production'
  
  // Global logging controls
  enableLogging: boolean
  maxNoiseLevel: NoiseLevel
  
  // Context controls
  enabledContexts: LogContext[]
  
  // Feature flags
  enablePerformanceLogging: boolean
  enableUserActionTracking: boolean
  enableComponentDebugging: boolean
  enableDemoLogging: boolean
  enableSecurityLogging: boolean
  
  // Performance controls
  rateLimitMs: number
  maxBufferSize: number
  intelligentFiltering: boolean
  
  // Production-specific settings
  productionOnlyErrors: boolean
  stripSensitiveData: boolean
  enableProductionMetrics: boolean
  
  // Development-specific settings
  verboseComponentLogging: boolean
  enablePerformanceAlerts: boolean
  enableConsoleGrouping: boolean
}

class LoggingConfigManager {
  private static instance: LoggingConfigManager
  private config: LoggingEnvironmentConfig
  
  private constructor() {
    this.config = this.loadConfiguration()
    
    // Apply immediate console override for production
    if (this.config.environment === 'production' && this.config.productionOnlyErrors) {
      this.applyProductionConsoleOverride()
    }
  }

  static getInstance(): LoggingConfigManager {
    if (!LoggingConfigManager.instance) {
      LoggingConfigManager.instance = new LoggingConfigManager()
    }
    return LoggingConfigManager.instance
  }

  /**
   * Load configuration from environment variables and defaults
   */
  private loadConfiguration(): LoggingEnvironmentConfig {
    const environment = this.detectEnvironment()
    
    // Base configuration
    const baseConfig: LoggingEnvironmentConfig = {
      environment,
      enableLogging: true,
      maxNoiseLevel: environment === 'development' ? 'debug' : 'minimal',
      enabledContexts: this.getDefaultContexts(environment),
      enablePerformanceLogging: environment === 'development',
      enableUserActionTracking: true,
      enableComponentDebugging: environment === 'development',
      enableDemoLogging: environment === 'development',
      enableSecurityLogging: true,
      rateLimitMs: environment === 'development' ? 500 : 2000,
      maxBufferSize: environment === 'development' ? 500 : 100,
      intelligentFiltering: true,
      productionOnlyErrors: environment === 'production',
      stripSensitiveData: environment !== 'development',
      enableProductionMetrics: environment === 'production',
      verboseComponentLogging: environment === 'development',
      enablePerformanceAlerts: environment === 'development',
      enableConsoleGrouping: environment === 'development'
    }

    // Override with environment variables
    return this.applyEnvironmentOverrides(baseConfig)
  }

  /**
   * Detect current environment
   */
  private detectEnvironment(): 'development' | 'staging' | 'production' {
    // Vite environment detection
    if (import.meta.env.DEV) return 'development'
    if (import.meta.env.PROD) {
      // Check for staging indicators
      if (import.meta.env.VITE_APP_STAGE === 'staging' || 
          window.location.hostname.includes('staging') ||
          window.location.hostname.includes('dev')) {
        return 'staging'
      }
      return 'production'
    }
    return 'development' // fallback
  }

  /**
   * Get default enabled contexts based on environment
   */
  private getDefaultContexts(environment: string): LogContext[] {
    switch (environment) {
      case 'development':
        return ['development', 'performance', 'user-action', 'system', 'security', 'component', 'demo']
      case 'staging':
        return ['performance', 'user-action', 'system', 'security']
      case 'production':
        return ['user-action', 'system', 'security']
      default:
        return ['system', 'security']
    }
  }

  /**
   * Apply environment variable overrides
   */
  private applyEnvironmentOverrides(config: LoggingEnvironmentConfig): LoggingEnvironmentConfig {
    // Global logging control
    if (import.meta.env.VITE_DISABLE_LOGGING === 'true') {
      config.enableLogging = false
    }
    
    // Noise level override
    const noiseLevel = import.meta.env.VITE_LOG_NOISE_LEVEL as NoiseLevel
    if (noiseLevel && ['silent', 'minimal', 'normal', 'verbose', 'debug'].includes(noiseLevel)) {
      config.maxNoiseLevel = noiseLevel
    }
    
    // Performance logging
    if (import.meta.env.VITE_ENABLE_PERFORMANCE_LOGGING === 'true') {
      config.enablePerformanceLogging = true
    } else if (import.meta.env.VITE_ENABLE_PERFORMANCE_LOGGING === 'false') {
      config.enablePerformanceLogging = false
    }
    
    // Component debugging
    if (import.meta.env.VITE_ENABLE_COMPONENT_DEBUG === 'true') {
      config.enableComponentDebugging = true
    } else if (import.meta.env.VITE_ENABLE_COMPONENT_DEBUG === 'false') {
      config.enableComponentDebugging = false
    }
    
    // Demo logging (should usually be false in production)
    if (import.meta.env.VITE_ENABLE_DEMO_LOGGING === 'true') {
      config.enableDemoLogging = true
    } else if (import.meta.env.VITE_ENABLE_DEMO_LOGGING === 'false') {
      config.enableDemoLogging = false
    }
    
    // Production-only errors
    if (import.meta.env.VITE_PRODUCTION_ONLY_ERRORS === 'false') {
      config.productionOnlyErrors = false
    }
    
    // Rate limiting
    const rateLimitMs = parseInt(import.meta.env.VITE_LOG_RATE_LIMIT_MS || '0')
    if (rateLimitMs > 0) {
      config.rateLimitMs = rateLimitMs
    }
    
    return config
  }

  /**
   * Apply production console override to eliminate noise
   */
  private applyProductionConsoleOverride(): void {
    if (typeof window === 'undefined') return
    
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug,
      trace: console.trace
    }
    
    // Override console methods in production
    console.log = (...args: any[]) => {
      // Only allow explicitly marked safe logs
      if (args[0]?.includes?.('🔒 SAFE:')) {
        originalConsole.log(...args)
      }
    }
    
    console.info = (...args: any[]) => {
      // Only allow safe info logs
      if (args[0]?.includes?.('🔒 SAFE:')) {
        originalConsole.info(...args)
      }
    }
    
    console.debug = () => {
      // Completely suppress debug in production
    }
    
    console.trace = () => {
      // Suppress trace in production
    }
    
    // Keep warnings and errors but sanitize them
    console.warn = (...args: any[]) => {
      originalConsole.warn('[SANITIZED]', this.sanitizeLogArgs(args))
    }
    
    console.error = (...args: any[]) => {
      originalConsole.error('[SANITIZED]', this.sanitizeLogArgs(args))
    }
  }

  /**
   * Sanitize log arguments for production
   */
  private sanitizeLogArgs(args: any[]): any[] {
    return args.map(arg => {
      if (typeof arg === 'string') {
        return arg.replace(/(password|token|key|secret|api_key).*$/gmi, '[REDACTED]')
      } else if (typeof arg === 'object' && arg !== null) {
        // Sanitize object keys
        const sanitized: any = {}
        for (const [key, value] of Object.entries(arg)) {
          if (['password', 'token', 'key', 'secret', 'api_key'].some(sensitive => 
            key.toLowerCase().includes(sensitive))) {
            sanitized[key] = '[REDACTED]'
          } else {
            sanitized[key] = value
          }
        }
        return sanitized
      }
      return arg
    })
  }

  /**
   * Get current configuration
   */
  public getConfig(): LoggingEnvironmentConfig {
    return { ...this.config }
  }

  /**
   * Update configuration at runtime
   */
  public updateConfig(updates: Partial<LoggingEnvironmentConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  /**
   * Check if a specific context is enabled
   */
  public isContextEnabled(context: LogContext): boolean {
    return this.config.enableLogging && this.config.enabledContexts.includes(context)
  }

  /**
   * Check if noise level is allowed
   */
  public isNoiseLevelAllowed(level: NoiseLevel): boolean {
    const hierarchy = { silent: 0, minimal: 1, normal: 2, verbose: 3, debug: 4 }
    return hierarchy[level] <= hierarchy[this.config.maxNoiseLevel]
  }

  /**
   * Get configuration for enhanced logger
   */
  public getEnhancedLoggerConfig() {
    return {
      enabledContexts: new Set(this.config.enabledContexts),
      maxNoiseLevel: this.config.maxNoiseLevel,
      enablePerformanceLogging: this.config.enablePerformanceLogging,
      enableUserActionTracking: this.config.enableUserActionTracking,
      enableComponentDebugging: this.config.enableComponentDebugging,
      rateLimitMs: this.config.rateLimitMs,
      maxBufferSize: this.config.maxBufferSize,
      intelligentFiltering: this.config.intelligentFiltering
    }
  }

  /**
   * Enable debug mode temporarily
   */
  public enableDebugMode(): void {
    this.config.maxNoiseLevel = 'debug'
    this.config.enableComponentDebugging = true
    this.config.enablePerformanceLogging = true
    this.config.verboseComponentLogging = true
  }

  /**
   * Disable all logging except errors
   */
  public enableSilentMode(): void {
    this.config.maxNoiseLevel = 'silent'
    this.config.enablePerformanceLogging = false
    this.config.enableComponentDebugging = false
    this.config.enableDemoLogging = false
    this.config.enabledContexts = ['security']
  }

  /**
   * Reset to default configuration
   */
  public resetToDefaults(): void {
    this.config = this.loadConfiguration()
  }

  /**
   * Get current environment information
   */
  public getEnvironmentInfo() {
    return {
      environment: this.config.environment,
      nodeEnv: import.meta.env.NODE_ENV,
      mode: import.meta.env.MODE,
      isDev: import.meta.env.DEV,
      isProd: import.meta.env.PROD,
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown'
    }
  }
}

// Export singleton instance
export const loggingConfig = LoggingConfigManager.getInstance()

// Export convenience functions
export const isLoggingEnabled = () => loggingConfig.getConfig().enableLogging
export const getCurrentEnvironment = () => loggingConfig.getConfig().environment
export const getMaxNoiseLevel = () => loggingConfig.getConfig().maxNoiseLevel

export default loggingConfig