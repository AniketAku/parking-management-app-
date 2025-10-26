// Performance Monitoring Hook
// React hook for tracking and optimizing component performance

import { useState, useEffect, useCallback, useRef } from 'react'
import { performanceMonitor, PerformanceMetrics, MemoryTracker } from '../utils/optimizedPerformanceMonitor'
import { log } from '../utils/secureLogger'

export interface UsePerformanceOptions {
  trackRenders?: boolean
  trackMemory?: boolean
  trackNetwork?: boolean
  reportInterval?: number
  componentName?: string
}

export interface PerformanceHookResult {
  metrics: PerformanceMetrics[]
  summary: {
    averages: Partial<PerformanceMetrics>
    budgetStatus: Record<string, 'pass' | 'warn' | 'fail'>
    recommendations: string[]
  }
  isMonitoring: boolean
  startMonitoring: () => void
  stopMonitoring: () => void
  clearMetrics: () => void
  measureOperation: <T>(name: string, operation: () => Promise<T>) => Promise<T>
  memoryUsage: {
    current: number
    average: number
    peak: number
    history: Array<{ timestamp: number; usage: number }>
  }
}

/**
 * Hook for performance monitoring and optimization
 */
export const usePerformance = (options: UsePerformanceOptions = {}): PerformanceHookResult => {
  const {
    trackRenders = true,
    trackMemory = true,
    trackNetwork = true,
    reportInterval = 10000,
    componentName = 'UnnamedComponent'
  } = options

  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [memoryData, setMemoryData] = useState({
    current: 0,
    average: 0,
    peak: 0,
    history: [] as Array<{ timestamp: number; usage: number }>
  })

  const renderCountRef = useRef(0)
  const memoryTracker = useRef<MemoryTracker>(new MemoryTracker())
  const intervalRef = useRef<number>()

  // Track component renders
  useEffect(() => {
    if (trackRenders) {
      renderCountRef.current++
      const renderTime = performance.now()

      if (renderCountRef.current > 1) {
        log.debug('Component render', {
          component: componentName,
          renderNumber: renderCountRef.current,
          time: `${renderTime.toFixed(2)}ms`
        })
      }
    }
  })

  // Initialize monitoring
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return
    
    setIsMonitoring(true)
    performanceMonitor.startMonitoring()
    
    if (trackMemory) {
      memoryTracker.current.start(5000)
    }

    // Update metrics periodically
    intervalRef.current = window.setInterval(() => {
      setMetrics(performanceMonitor.getMetrics())
      
      if (trackMemory) {
        setMemoryData({
          current: memoryTracker.current.getCurrentUsage(),
          average: memoryTracker.current.getAverageUsage(),
          peak: memoryTracker.current.getPeakUsage(),
          history: memoryTracker.current.getUsage()
        })
      }
    }, reportInterval)

    log.info('Performance monitoring started', { component: componentName })
  }, [isMonitoring, trackMemory, reportInterval, componentName])

  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return
    
    setIsMonitoring(false)
    performanceMonitor.stopMonitoring()
    memoryTracker.current.stop()
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = undefined
    }

    log.info('Performance monitoring stopped', { component: componentName })
  }, [isMonitoring, componentName])

  const clearMetrics = useCallback(() => {
    performanceMonitor.clearMetrics()
    setMetrics([])
    log.debug('Metrics cleared', { component: componentName })
  }, [componentName])

  const measureOperation = useCallback(async <T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now()
    const startMemory = memoryTracker.current.getCurrentUsage()
    
    try {
      const result = await operation()
      const endTime = performance.now()
      const endMemory = memoryTracker.current.getCurrentUsage()

      log.debug('Operation completed', {
        operation: name,
        duration: `${(endTime - startTime).toFixed(2)}ms`,
        memoryDelta: `${((endMemory - startMemory) / 1024 / 1024).toFixed(2)}MB`
      })

      return result
    } catch (error) {
      const endTime = performance.now()
      log.error('Operation failed', {
        operation: name,
        duration: `${(endTime - startTime).toFixed(2)}ms`,
        error
      })
      throw error
    }
  }, [])

  // Get performance summary
  const summary = performanceMonitor.getSummary()

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring()
    }
  }, [stopMonitoring])

  return {
    metrics,
    summary,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearMetrics,
    measureOperation,
    memoryUsage: memoryData,
  }
}

/**
 * Hook for measuring component render performance
 */
export const useRenderPerformance = (componentName: string) => {
  const renderCount = useRef(0)
  const lastRenderTime = useRef(0)

  useEffect(() => {
    renderCount.current++
    const currentTime = performance.now()
    
    if (lastRenderTime.current > 0) {
      const timeSinceLastRender = currentTime - lastRenderTime.current
      log.debug('Component render', {
        component: componentName,
        renderNumber: renderCount.current,
        timeSinceLastRender: `${timeSinceLastRender.toFixed(2)}ms`
      })
    }
    
    lastRenderTime.current = currentTime
  })

  return {
    renderCount: renderCount.current,
    lastRenderTime: lastRenderTime.current,
  }
}

/**
 * Hook for network request performance tracking
 */
export const useNetworkPerformance = () => {
  const [networkMetrics, setNetworkMetrics] = useState<{
    totalRequests: number
    failedRequests: number
    averageResponseTime: number
    slowestRequest: number
    fastestRequest: number
  }>({
    totalRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    slowestRequest: 0,
    fastestRequest: Infinity,
  })

  const trackRequest = useCallback(async <T>(
    url: string,
    requestFn: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now()
    
    try {
      const result = await requestFn()
      const endTime = performance.now()
      const responseTime = endTime - startTime
      
      setNetworkMetrics(prev => ({
        totalRequests: prev.totalRequests + 1,
        failedRequests: prev.failedRequests,
        averageResponseTime: ((prev.averageResponseTime * prev.totalRequests) + responseTime) / (prev.totalRequests + 1),
        slowestRequest: Math.max(prev.slowestRequest, responseTime),
        fastestRequest: Math.min(prev.fastestRequest, responseTime),
      }))

      log.debug('Network request completed', {
        url,
        responseTime: `${responseTime.toFixed(2)}ms`
      })
      return result
    } catch (error) {
      const endTime = performance.now()
      const responseTime = endTime - startTime

      setNetworkMetrics(prev => ({
        totalRequests: prev.totalRequests + 1,
        failedRequests: prev.failedRequests + 1,
        averageResponseTime: ((prev.averageResponseTime * prev.totalRequests) + responseTime) / (prev.totalRequests + 1),
        slowestRequest: Math.max(prev.slowestRequest, responseTime),
        fastestRequest: prev.fastestRequest === Infinity ? responseTime : Math.min(prev.fastestRequest, responseTime),
      }))

      log.error('Network request failed', {
        url,
        responseTime: `${responseTime.toFixed(2)}ms`,
        error
      })
      throw error
    }
  }, [])

  return {
    metrics: networkMetrics,
    trackRequest,
  }
}

/**
 * Hook for bundle size analysis
 */
export const useBundleAnalysis = () => {
  const [bundleInfo, setBundleInfo] = useState<{
    totalSize: number
    gzippedSize: number
    chunkCount: number
    largestChunks: Array<{ name: string; size: number }>
  }>({
    totalSize: 0,
    gzippedSize: 0,
    chunkCount: 0,
    largestChunks: [],
  })

  useEffect(() => {
    // Analyze loaded resources to estimate bundle size
    const analyzeBundle = () => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      let totalSize = 0
      const chunks: Array<{ name: string; size: number }> = []
      
      resources.forEach(resource => {
        if (resource.name.includes('.js') || resource.name.includes('.css')) {
          const size = resource.transferSize || resource.decodedBodySize || 0
          totalSize += size
          chunks.push({
            name: resource.name.split('/').pop() || 'unknown',
            size,
          })
        }
      })
      
      chunks.sort((a, b) => b.size - a.size)
      
      setBundleInfo({
        totalSize,
        gzippedSize: totalSize * 0.7, // Estimate gzipped size
        chunkCount: chunks.length,
        largestChunks: chunks.slice(0, 5),
      })
    }

    // Run analysis after initial load
    if (document.readyState === 'complete') {
      analyzeBundle()
    } else {
      window.addEventListener('load', analyzeBundle)
      return () => window.removeEventListener('load', analyzeBundle)
    }
  }, [])

  return bundleInfo
}

/**
 * Hook for accessibility performance tracking
 */
export const useAccessibilityPerformance = () => {
  const [a11yMetrics, setA11yMetrics] = useState({
    themeSwichTime: 0,
    focusDelay: 0,
    screenReaderDelay: 0,
    keyboardResponseTime: 0,
  })

  const measureThemeSwitch = useCallback(async (themeSwitchFn: () => Promise<void> | void) => {
    const startTime = performance.now()
    await themeSwitchFn()
    const endTime = performance.now()
    const switchTime = endTime - startTime

    setA11yMetrics(prev => ({ ...prev, themeSwichTime: switchTime }))
    log.debug('Theme switch completed', { switchTime: `${switchTime.toFixed(2)}ms` })

    return switchTime
  }, [])

  const measureFocusDelay = useCallback((element: HTMLElement) => {
    const startTime = performance.now()
    element.focus()
    
    requestAnimationFrame(() => {
      const endTime = performance.now()
      const focusTime = endTime - startTime
      setA11yMetrics(prev => ({ ...prev, focusDelay: focusTime }))
      log.debug('Focus delay', { focusTime: `${focusTime.toFixed(2)}ms` })
    })
  }, [])

  const measureKeyboardResponse = useCallback((callback: () => void) => {
    return (event: KeyboardEvent) => {
      const startTime = performance.now()
      callback()
      
      requestAnimationFrame(() => {
        const endTime = performance.now()
        const responseTime = endTime - startTime
        setA11yMetrics(prev => ({ ...prev, keyboardResponseTime: responseTime }))
        log.debug('Keyboard response time', { responseTime: `${responseTime.toFixed(2)}ms` })
      })
    }
  }, [])

  return {
    metrics: a11yMetrics,
    measureThemeSwitch,
    measureFocusDelay,
    measureKeyboardResponse,
  }
}

export default usePerformance