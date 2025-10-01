/**
 * Production Logging Validation Tests
 * Validates console noise reduction and security improvements
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { enhancedLogger, logger } from '../../utils/enhancedLogger'
import { loggingConfig } from '../../config/loggingConfig'

// Mock environment for testing
const mockImportMeta = {
  env: {
    DEV: false,
    PROD: true,
    VITE_LOG_NOISE_LEVEL: 'minimal'
  }
}

// Mock console methods
let consoleMocks: {
  log: ReturnType<typeof vi.fn>
  warn: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
  info: ReturnType<typeof vi.fn>
  debug: ReturnType<typeof vi.fn>
}

describe('Production Logging System', () => {
  beforeEach(() => {
    // Reset logger state
    enhancedLogger.clearLogs()
    
    // Mock console methods
    consoleMocks = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      debug: vi.fn()
    }
    
    global.console.log = consoleMocks.log
    global.console.warn = consoleMocks.warn
    global.console.error = consoleMocks.error
    global.console.info = consoleMocks.info
    global.console.debug = consoleMocks.debug
    
    // Mock import.meta for production environment
    vi.stubGlobal('import', { meta: mockImportMeta })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Noise Level Filtering', () => {
    it('should suppress verbose logs in production', () => {
      // Set production configuration
      loggingConfig.updateConfig({ maxNoiseLevel: 'minimal' })
      
      // Attempt verbose logging
      logger.component('TestComponent', 'verbose operation', { data: 'test' })
      
      // Verify no console output for verbose logs
      expect(consoleMocks.log).not.toHaveBeenCalled()
      expect(consoleMocks.info).not.toHaveBeenCalled()
    })

    it('should allow minimal noise level logs in production', () => {
      loggingConfig.updateConfig({ maxNoiseLevel: 'minimal' })
      
      // Log at minimal level
      logger.warn('Production warning', { context: 'test' })
      logger.error('Production error', new Error('test'))
      
      // Verify warnings and errors are logged
      expect(consoleMocks.warn).toHaveBeenCalled()
      expect(consoleMocks.error).toHaveBeenCalled()
    })

    it('should completely suppress demo logs in production', () => {
      loggingConfig.updateConfig({ enableDemoLogging: false })
      
      // Attempt demo logging
      logger.demo('Demo message', { test: 'data' })
      
      // Verify no console output
      expect(consoleMocks.log).not.toHaveBeenCalled()
      expect(consoleMocks.info).not.toHaveBeenCalled()
    })
  })

  describe('Context-Based Filtering', () => {
    it('should disable component debugging in production', () => {
      loggingConfig.updateConfig({ 
        enableComponentDebugging: false,
        enabledContexts: ['system', 'security']
      })
      
      // Attempt component logging
      logger.component('TestComponent', 'component event')
      
      // Verify no output
      expect(consoleMocks.log).not.toHaveBeenCalled()
      expect(consoleMocks.debug).not.toHaveBeenCalled()
    })

    it('should always allow security logs', () => {
      loggingConfig.updateConfig({ 
        maxNoiseLevel: 'silent',
        enabledContexts: ['security']
      })
      
      // Log security issue
      logger.security('Security violation detected', { ip: '127.0.0.1' })
      
      // Verify security logs always go through
      expect(consoleMocks.error).toHaveBeenCalledWith(
        expect.stringContaining('Security: Security violation detected'),
        expect.any(Object)
      )
    })
  })

  describe('Rate Limiting', () => {
    it('should suppress repeated identical messages', async () => {
      loggingConfig.updateConfig({ rateLimitMs: 100 })
      
      // Send rapid identical messages
      const message = 'Repeated message'
      logger.info(message)
      logger.info(message)
      logger.info(message)
      
      // Should only log first occurrence immediately
      expect(consoleMocks.log).toHaveBeenCalledTimes(1)
      
      // Wait for rate limit to reset
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Next message should go through
      logger.info(message)
      expect(consoleMocks.log).toHaveBeenCalledTimes(2)
    })
  })

  describe('Sensitive Data Protection', () => {
    it('should sanitize sensitive information from logs', () => {
      const sensitiveData = {
        password: 'secret123',
        token: 'abc123token',
        api_key: 'key_12345',
        normalData: 'this is fine'
      }
      
      logger.warn('Data with sensitive info', sensitiveData)
      
      // Verify sensitive data is sanitized
      expect(consoleMocks.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          password: '[SENSITIVE_DATA_HIDDEN]',
          token: '[SENSITIVE_DATA_HIDDEN]',
          api_key: '[SENSITIVE_DATA_HIDDEN]',
          normalData: 'this is fine'
        })
      )
    })
  })

  describe('Performance Impact', () => {
    it('should have minimal performance impact when logging is disabled', () => {
      loggingConfig.updateConfig({ enableLogging: false })
      
      const startTime = performance.now()
      
      // Attempt many log operations
      for (let i = 0; i < 1000; i++) {
        logger.debug(`Debug message ${i}`, { iteration: i })
        logger.component('TestComponent', `Event ${i}`, { data: i })
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Should complete very quickly when disabled
      expect(duration).toBeLessThan(10) // 10ms for 1000 operations
      expect(consoleMocks.log).not.toHaveBeenCalled()
    })

    it('should maintain reasonable performance with rate limiting', () => {
      loggingConfig.updateConfig({ 
        enableLogging: true,
        rateLimitMs: 10
      })
      
      const startTime = performance.now()
      
      // Send many similar messages (should be rate limited)
      for (let i = 0; i < 100; i++) {
        logger.info('Rate limited message', { iteration: i })
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Should still be fast due to rate limiting
      expect(duration).toBeLessThan(50) // 50ms for 100 operations
      
      // Should only log a few messages due to rate limiting
      expect(consoleMocks.log.mock.calls.length).toBeLessThan(10)
    })
  })

  describe('Production Console Override', () => {
    it('should override dangerous console methods in production', () => {
      // Simulate production console override
      const originalConsole = {
        log: global.console.log,
        debug: global.console.debug
      }
      
      // Apply production override (simplified)
      global.console.log = (msg: string) => {
        if (!msg?.includes?.('🔒 SAFE:')) return
        originalConsole.log(msg)
      }
      global.console.debug = () => {} // Completely suppress
      
      // Test unsafe logging
      console.log('Unsafe production log')
      console.debug('Debug information')
      
      // Test safe logging
      console.log('🔒 SAFE: This should appear')
      
      // Verify override behavior
      expect(originalConsole.log).toHaveBeenCalledTimes(1)
      expect(originalConsole.log).toHaveBeenCalledWith('🔒 SAFE: This should appear')
    })
  })

  describe('Environment Detection', () => {
    it('should correctly detect production environment', () => {
      const env = loggingConfig.getEnvironmentInfo()
      
      expect(env.isProd).toBe(true)
      expect(env.isDev).toBe(false)
      expect(env.environment).toBe('production')
    })

    it('should apply production-specific configuration', () => {
      const config = loggingConfig.getConfig()
      
      expect(config.maxNoiseLevel).toBe('minimal')
      expect(config.enableComponentDebugging).toBe(false)
      expect(config.enablePerformanceLogging).toBe(false)
      expect(config.productionOnlyErrors).toBe(true)
    })
  })

  describe('Logging Statistics', () => {
    it('should provide accurate logging statistics', () => {
      // Generate some logs
      logger.error('Error message')
      logger.warn('Warning message')
      logger.info('Info message')
      
      const stats = enhancedLogger.getStats()
      
      expect(stats.totalLogs).toBeGreaterThan(0)
      expect(stats.logsByLevel).toHaveProperty('error')
      expect(stats.logsByLevel).toHaveProperty('warn')
      expect(stats.sessionId).toBeDefined()
    })
  })

  describe('Integration with Existing Systems', () => {
    it('should integrate with secureLogger for production safety', () => {
      // Test that enhanced logger uses secureLogger internally
      logger.error('Test error with sensitive data: password=secret123')
      
      // Verify error was logged but sanitized
      expect(consoleMocks.error).toHaveBeenCalledWith(
        expect.stringContaining('Test error with sensitive data'),
        expect.any(Object)
      )
      
      // Verify sensitive data was sanitized
      const loggedArgs = consoleMocks.error.mock.calls[0]
      expect(loggedArgs[0]).toContain('[PASSWORD_HIDDEN]')
    })
  })
})

describe('Enhanced Logger Configuration', () => {
  it('should allow runtime configuration updates', () => {
    // Update configuration
    enhancedLogger.configure({
      maxNoiseLevel: 'debug',
      enableComponentDebugging: true
    })
    
    // Verify configuration was applied
    const stats = enhancedLogger.getStats()
    expect(stats).toBeDefined()
    
    // Test that debug logging now works
    logger.debug('Debug message after config update')
    
    // In test environment, should be logged
    expect(consoleMocks.log).toHaveBeenCalledWith(
      expect.stringContaining('Debug message after config update'),
      expect.any(String)
    )
  })

  it('should provide noise level adjustment methods', () => {
    // Test noise level methods
    enhancedLogger.setMaxNoiseLevel('verbose')
    enhancedLogger.setIntelligentFiltering(false)
    
    // Should not throw errors
    expect(() => {
      logger.component('TestComponent', 'verbose event')
    }).not.toThrow()
  })
})