/**
 * Enhanced Logging System Demonstration
 * Shows before/after logging behavior and production safety
 */

import React, { useEffect, useState } from 'react'
import { logger, enhancedLogger } from '../utils/enhancedLogger'
import { loggingConfig } from '../config/loggingConfig'

export const LoggingSystemDemo: React.FC = () => {
  const [stats, setStats] = useState<any>(null)
  const [environment, setEnvironment] = useState<any>(null)
  
  useEffect(() => {
    // Demonstrate different logging levels and contexts
    demonstrateLoggingSystem()
    
    // Update stats
    updateStats()
  }, [])

  const demonstrateLoggingSystem = () => {
    console.log('🔴 BEFORE: Unsafe console.log with sensitive data:', {
      password: 'secret123',
      userToken: 'abc-token-xyz',
      normalData: 'this is fine'
    })
    
    logger.success('✅ AFTER: Enhanced logging system loaded')
    
    // Demonstrate different contexts
    logger.component('LoggingDemo', 'Component mounted', { timestamp: Date.now() })
    logger.performance('Demo metrics calculated', { renderTime: '15ms' })
    logger.userAction('demo_viewed', { userId: 'demo-user' })
    logger.debug('Debug information', { level: 'verbose' })
    
    // Show security logging
    logger.security('Demo security event', { 
      action: 'demo_access',
      ip: '127.0.0.1'
    })
    
    // Demonstrate rate limiting
    for (let i = 0; i < 5; i++) {
      logger.info('Rate limited message', { attempt: i })
    }
    
    // Show sensitive data sanitization
    logger.warn('Warning with sensitive data', {
      password: 'should-be-hidden',
      token: 'also-hidden',
      username: 'visible'
    })
    
    // Demo logging (development only)
    logger.demo('Demo system working correctly')
  }
  
  const updateStats = () => {
    const currentStats = enhancedLogger.getStats()
    const env = loggingConfig.getEnvironmentInfo()
    const config = loggingConfig.getConfig()
    
    setStats(currentStats)
    setEnvironment({ ...env, config })
  }
  
  const toggleDebugMode = () => {
    const isDebug = loggingConfig.getConfig().maxNoiseLevel === 'debug'
    
    if (isDebug) {
      loggingConfig.enableSilentMode()
      logger.success('Silent mode enabled')
    } else {
      loggingConfig.enableDebugMode()
      logger.success('Debug mode enabled')
    }
    
    updateStats()
  }
  
  const clearLogs = () => {
    enhancedLogger.clearLogs()
    updateStats()
    logger.success('Logs cleared')
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        🚀 Enhanced Logging System Demo
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Environment Info */}
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            📊 Environment Info
          </h3>
          {environment && (
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Environment:</span> {environment.environment}</div>
              <div><span className="font-medium">Mode:</span> {environment.mode}</div>
              <div><span className="font-medium">Development:</span> {environment.isDev ? '✅' : '❌'}</div>
              <div><span className="font-medium">Production:</span> {environment.isProd ? '✅' : '❌'}</div>
              <div><span className="font-medium">Max Noise Level:</span> {environment.config.maxNoiseLevel}</div>
              <div><span className="font-medium">Component Debug:</span> {environment.config.enableComponentDebugging ? '✅' : '❌'}</div>
              <div><span className="font-medium">Demo Logging:</span> {environment.config.enableDemoLogging ? '✅' : '❌'}</div>
            </div>
          )}
        </div>

        {/* Logging Statistics */}
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            📈 Logging Statistics
          </h3>
          {stats && (
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Total Logs:</span> {stats.totalLogs}</div>
              <div><span className="font-medium">Session ID:</span> {stats.sessionId.substring(0, 20)}...</div>
              <div className="mt-3">
                <span className="font-medium">Logs by Level:</span>
                <ul className="mt-1 ml-4">
                  {Object.entries(stats.logsByLevel).map(([level, count]) => (
                    <li key={level} className="flex justify-between">
                      <span>{level}:</span> <span>{count as number}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-3">
                <span className="font-medium">Logs by Context:</span>
                <ul className="mt-1 ml-4">
                  {Object.entries(stats.logsByContext).map(([context, count]) => (
                    <li key={context} className="flex justify-between">
                      <span>{context}:</span> <span>{count as number}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rate Limiting Stats */}
      {stats?.rateLimitStats?.length > 0 && (
        <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-3">
            ⚡ Rate Limiting Active
          </h3>
          <div className="space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
            {stats.rateLimitStats.map((stat: any, index: number) => (
              <div key={index}>
                <span className="font-medium">Suppressed:</span> {stat.suppressed} messages 
                <span className="ml-2">({stat.key.substring(0, 30)}...)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mt-6 flex flex-wrap gap-4">
        <button
          onClick={toggleDebugMode}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Toggle Debug Mode
        </button>
        
        <button
          onClick={clearLogs}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Clear Logs
        </button>
        
        <button
          onClick={demonstrateLoggingSystem}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Run Demo Again
        </button>
        
        <button
          onClick={updateStats}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
        >
          Refresh Stats
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3">
          📋 Instructions
        </h3>
        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
          <p>1. Open your browser's Developer Tools (F12) and check the Console tab</p>
          <p>2. Notice the difference between unsafe console.log and enhanced logging</p>
          <p>3. Try toggling debug mode to see noise level filtering in action</p>
          <p>4. Check how rate limiting prevents log spam</p>
          <p>5. Observe sensitive data sanitization in warning messages</p>
          <p>6. See how different contexts (component, performance, security) are handled</p>
        </div>
      </div>

      {/* Production Safety Notice */}
      <div className="mt-6 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-3">
          🛡️ Production Safety
        </h3>
        <div className="text-sm text-red-700 dark:text-red-300 space-y-2">
          <p><strong>In Production:</strong></p>
          <ul className="list-disc ml-6 space-y-1">
            <li>Console.log statements are automatically suppressed unless marked safe</li>
            <li>Only minimal noise level logs (warnings, errors, security) appear</li>
            <li>Sensitive data is automatically sanitized</li>
            <li>Demo and component debugging are disabled</li>
            <li>Rate limiting prevents performance degradation</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default LoggingSystemDemo