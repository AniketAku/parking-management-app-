/**
 * Secure Logging System
 * Production-safe logging that prevents information disclosure
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: string
  data?: Record<string, any>
}

class SecureLogger {
  private isDevelopment = import.meta.env.DEV
  private isProduction = import.meta.env.PROD
  
  // Production log buffer for error reporting
  private logBuffer: LogEntry[] = []
  private maxBufferSize = 100

  constructor() {
    // Clear sensitive data from production builds
    if (this.isProduction) {
      this.sanitizeConsole()
    }
  }

  /**
   * Remove or override sensitive console methods in production
   */
  private sanitizeConsole(): void {
    if (this.isProduction) {
      // Override console methods to prevent accidental logging
      const originalLog = console.log
      const originalWarn = console.warn
      const originalError = console.error
      
      console.log = (...args: any[]) => {
        // Only allow explicitly marked safe logs in production
        if (args[0]?.includes?.('🔒 SAFE:')) {
          originalLog(...args)
        }
      }

      console.warn = (...args: any[]) => {
        // Allow warnings but sanitize sensitive data
        const sanitized = this.sanitizeArgs(args)
        originalWarn(...sanitized)
      }

      console.error = (...args: any[]) => {
        // Allow errors but sanitize sensitive data
        const sanitized = this.sanitizeArgs(args)
        originalError(...sanitized)
        
        // Store for error reporting
        this.addToBuffer({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: sanitized.join(' ')
        })
      }
    }
  }

  /**
   * Sanitize arguments to remove sensitive information
   */
  private sanitizeArgs(args: any[]): any[] {
    return args.map(arg => {
      if (typeof arg === 'string') {
        return this.sanitizeString(arg)
      } else if (typeof arg === 'object' && arg !== null) {
        return this.sanitizeObject(arg)
      }
      return arg
    })
  }

  /**
   * Remove sensitive information from strings
   */
  private sanitizeString(str: string): string {
    return str
      .replace(/VITE_SUPABASE_URL.*$/gmi, '[SUPABASE_URL_HIDDEN]')
      .replace(/VITE_SUPABASE_ANON_KEY.*$/gmi, '[SUPABASE_KEY_HIDDEN]')
      .replace(/password.*$/gmi, '[PASSWORD_HIDDEN]')
      .replace(/token.*$/gmi, '[TOKEN_HIDDEN]')
      .replace(/key.*$/gmi, '[KEY_HIDDEN]')
      .replace(/secret.*$/gmi, '[SECRET_HIDDEN]')
      .replace(/api_key.*$/gmi, '[API_KEY_HIDDEN]')
  }

  /**
   * Remove sensitive information from objects
   */
  private sanitizeObject(obj: any): any {
    if (obj instanceof Error) {
      return {
        name: obj.name,
        message: this.sanitizeString(obj.message),
        stack: this.isDevelopment ? obj.stack : '[STACK_HIDDEN]'
      }
    }

    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      const keyLower = key.toLowerCase()
      
      if (keyLower.includes('password') || 
          keyLower.includes('token') || 
          keyLower.includes('key') || 
          keyLower.includes('secret')) {
        sanitized[key] = '[SENSITIVE_DATA_HIDDEN]'
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value)
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value)
      } else {
        sanitized[key] = value
      }
    }
    return sanitized
  }

  /**
   * Add entry to log buffer
   */
  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry)
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift()
    }
  }

  /**
   * Debug logging - only in development
   */
  debug(message: string, data?: any, context?: string): void {
    if (this.isDevelopment) {
      console.log(`🔍 ${message}`, data || '')
      this.addToBuffer({
        timestamp: new Date().toISOString(),
        level: 'debug',
        message,
        context,
        data
      })
    }
  }

  /**
   * Info logging - development only unless marked safe
   */
  info(message: string, data?: any, context?: string): void {
    if (this.isDevelopment) {
      console.log(`ℹ️ ${message}`, data || '')
    } else {
      // Only log if explicitly marked as safe for production
      if (message.includes('🔒 SAFE:')) {
        console.log(message)
      }
    }
    
    this.addToBuffer({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
      data: this.isDevelopment ? data : undefined
    })
  }

  /**
   * Warning logging - sanitized in production
   */
  warn(message: string, data?: any, context?: string): void {
    const sanitizedMessage = this.sanitizeString(message)
    const sanitizedData = data ? this.sanitizeObject(data) : undefined
    
    console.warn(`⚠️ ${sanitizedMessage}`, sanitizedData || '')
    
    this.addToBuffer({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: sanitizedMessage,
      context,
      data: sanitizedData
    })
  }

  /**
   * Error logging - sanitized in production
   */
  error(message: string, error?: Error | any, context?: string): void {
    const sanitizedMessage = this.sanitizeString(message)
    const sanitizedError = error ? this.sanitizeObject(error) : undefined
    
    console.error(`❌ ${sanitizedMessage}`, sanitizedError || '')
    
    this.addToBuffer({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: sanitizedMessage,
      context,
      data: sanitizedError
    })
  }

  /**
   * Production-safe success logging
   */
  success(message: string, context?: string): void {
    const safeMessage = `🔒 SAFE: ✅ ${message}`
    console.log(safeMessage)
    
    this.addToBuffer({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: safeMessage,
      context
    })
  }

  /**
   * Get recent logs for error reporting
   */
  getRecentLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logBuffer.filter(entry => entry.level === level)
    }
    return [...this.logBuffer]
  }

  /**
   * Clear log buffer
   */
  clearBuffer(): void {
    this.logBuffer = []
  }
}

// Export singleton instance
export const secureLogger = new SecureLogger()

// Convenience functions
export const log = {
  debug: (message: string, data?: any, context?: string) => 
    secureLogger.debug(message, data, context),
  
  info: (message: string, data?: any, context?: string) => 
    secureLogger.info(message, data, context),
  
  warn: (message: string, data?: any, context?: string) => 
    secureLogger.warn(message, data, context),
  
  error: (message: string, error?: Error | any, context?: string) => 
    secureLogger.error(message, error, context),
  
  success: (message: string, context?: string) => 
    secureLogger.success(message, context)
}

export default secureLogger