// Performance Monitoring Context
// Provides global performance tracking and optimization features

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { performanceMonitor, PerformanceMetrics } from '../utils/optimizedPerformanceMonitor'
import { usePerformance } from '../hooks/usePerformance'
import { logger } from '../utils/enhancedLogger'

interface PerformanceContextType {
  metrics: PerformanceMetrics[]
  isMonitoring: boolean
  startMonitoring: () => void
  stopMonitoring: () => void
  clearMetrics: () => void
  summary: {
    averages: Partial<PerformanceMetrics>
    budgetStatus: Record<string, 'pass' | 'warn' | 'fail'>
    recommendations: string[]
  }
  // Performance optimization features
  prefetchRoute: (route: string) => void
  preloadComponent: (component: () => Promise<any>) => void
  optimizeImages: boolean
  enableCodeSplitting: boolean
  // Real-time performance alerts
  alerts: PerformanceAlert[]
  dismissAlert: (id: string) => void
}

interface PerformanceAlert {
  id: string
  type: 'warning' | 'error' | 'info'
  title: string
  message: string
  timestamp: number
  metric?: string
  value?: number
  threshold?: number
}

interface PerformanceProviderProps {
  children: ReactNode
  autoStart?: boolean
  enableAlerts?: boolean
  optimizations?: {
    images?: boolean
    codeSplitting?: boolean
    prefetching?: boolean
  }
}

const PerformanceContext = createContext<PerformanceContextType | null>(null)

export const PerformanceProvider: React.FC<PerformanceProviderProps> = ({
  children,
  autoStart = true,
  enableAlerts = true,
  optimizations = {
    images: true,
    codeSplitting: true,
    prefetching: true,
  },
}) => {
  const {
    metrics,
    summary,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearMetrics,
  } = usePerformance({
    trackRenders: true,
    trackMemory: true,
    trackNetwork: true,
    componentName: 'PerformanceProvider',
  })

  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [prefetchedRoutes] = useState<Set<string>>(new Set())
  const [preloadedComponents] = useState<Set<string>>(new Set())

  // Auto-start monitoring
  useEffect(() => {
    if (autoStart && !isMonitoring) {
      startMonitoring()
    }
  }, [autoStart, isMonitoring, startMonitoring])

  // Performance alerts monitoring
  useEffect(() => {
    if (!enableAlerts || !isMonitoring) return

    const checkPerformanceThresholds = () => {
      const { averages } = summary
      const newAlerts: PerformanceAlert[] = []

      // LCP alert
      if (averages.lcp && averages.lcp > 4000) {
        newAlerts.push({
          id: `lcp-${Date.now()}`,
          type: 'error',
          title: 'Poor Largest Contentful Paint',
          message: 'Page loading is slower than recommended. Consider optimizing images and reducing server response time.',
          timestamp: Date.now(),
          metric: 'LCP',
          value: averages.lcp,
          threshold: 2500,
        })
      }

      // Memory usage alert
      if (averages.memoryUsage && averages.memoryUsage > 100 * 1024 * 1024) { // 100MB
        newAlerts.push({
          id: `memory-${Date.now()}`,
          type: 'warning',
          title: 'High Memory Usage',
          message: 'Application is using excessive memory. Check for memory leaks.',
          timestamp: Date.now(),
          metric: 'Memory',
          value: averages.memoryUsage,
          threshold: 100 * 1024 * 1024,
        })
      }

      // Bundle size alert
      if (averages.bundleSize && averages.bundleSize > 1024 * 1024) { // 1MB
        newAlerts.push({
          id: `bundle-${Date.now()}`,
          type: 'warning',
          title: 'Large Bundle Size',
          message: 'Bundle size is larger than recommended. Consider code splitting.',
          timestamp: Date.now(),
          metric: 'Bundle Size',
          value: averages.bundleSize,
          threshold: 512 * 1024,
        })
      }

      // Error rate alert
      if (averages.errorRate && averages.errorRate > 5) {
        newAlerts.push({
          id: `errors-${Date.now()}`,
          type: 'error',
          title: 'High Error Rate',
          message: 'Application is experiencing frequent errors. Check error logs.',
          timestamp: Date.now(),
          metric: 'Error Rate',
          value: averages.errorRate,
          threshold: 1,
        })
      }

      if (newAlerts.length > 0) {
        setAlerts(prev => [...prev, ...newAlerts])
      }
    }

    const interval = setInterval(checkPerformanceThresholds, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [enableAlerts, isMonitoring, summary])

  // Route prefetching
  const prefetchRoute = (route: string) => {
    if (!optimizations.prefetching || prefetchedRoutes.has(route)) return

    prefetchedRoutes.add(route)
    
    // Create invisible link to trigger browser prefetch
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = route
    document.head.appendChild(link)

    logger.performance('Route prefetched', { route })
  }

  // Component preloading
  const preloadComponent = async (component: () => Promise<any>) => {
    const componentName = component.name || 'AnonymousComponent'
    
    if (preloadedComponents.has(componentName)) return

    preloadedComponents.add(componentName)
    
    try {
      await component()
      logger.performance('Component preloaded', { componentName })
    } catch (error) {
      logger.error(`Failed to preload component ${componentName}`, error, 'PerformanceContext')
    }
  }

  // Alert dismissal
  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id))
  }

  // Auto-dismiss old alerts
  useEffect(() => {
    const cleanup = setInterval(() => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      setAlerts(prev => prev.filter(alert => alert.timestamp > fiveMinutesAgo))
    }, 60000) // Check every minute

    return () => clearInterval(cleanup)
  }, [])

  // Image optimization
  useEffect(() => {
    if (!optimizations.images) return

    // Add intersection observer for lazy loading images
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement
          if (img.dataset.src) {
            img.src = img.dataset.src
            img.removeAttribute('data-src')
            imageObserver.unobserve(img)
          }
        }
      })
    }, {
      rootMargin: '50px',
    })

    // Observe all images with data-src attribute
    const lazyImages = document.querySelectorAll('img[data-src]')
    lazyImages.forEach(img => imageObserver.observe(img))

    return () => imageObserver.disconnect()
  }, [optimizations.images])

  // Code splitting optimization
  useEffect(() => {
    if (!optimizations.codeSplitting) return

    // Monitor bundle loading performance
    const resourceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (entry.name.includes('.js') && entry.transferSize > 500 * 1024) { // 500KB
          logger.performance('Large chunk loaded', { 
            name: entry.name, 
            size: `${(entry.transferSize / 1024).toFixed(1)}KB`,
            transferSize: entry.transferSize 
          })
        }
      })
    })

    try {
      resourceObserver.observe({ entryTypes: ['resource'] })
    } catch (error) {
      logger.warn('Resource timing not supported', undefined, 'PerformanceContext')
    }

    return () => resourceObserver.disconnect()
  }, [optimizations.codeSplitting])

  const contextValue: PerformanceContextType = {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearMetrics,
    summary,
    prefetchRoute,
    preloadComponent,
    optimizeImages: optimizations.images ?? true,
    enableCodeSplitting: optimizations.codeSplitting ?? true,
    alerts,
    dismissAlert,
  }

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
      {/* Performance Alerts Overlay */}
      {alerts.length > 0 && (
        <PerformanceAlerts alerts={alerts} onDismiss={dismissAlert} />
      )}
    </PerformanceContext.Provider>
  )
}

// Performance alerts component
const PerformanceAlerts: React.FC<{
  alerts: PerformanceAlert[]
  onDismiss: (id: string) => void
}> = ({ alerts, onDismiss }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {alerts.slice(-3).map(alert => ( // Show only last 3 alerts
        <div
          key={alert.id}
          className={`p-4 rounded-lg shadow-lg border-l-4 ${
            alert.type === 'error'
              ? 'bg-red-50 border-red-400 text-red-700'
              : alert.type === 'warning'
              ? 'bg-yellow-50 border-yellow-400 text-yellow-700'
              : 'bg-blue-50 border-blue-400 text-blue-700'
          }`}
          role="alert"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h4 className="font-medium">{alert.title}</h4>
              <p className="text-sm mt-1">{alert.message}</p>
              {alert.metric && alert.value && (
                <div className="text-xs mt-2 font-mono">
                  {alert.metric}: {
                    alert.metric.includes('Memory') || alert.metric.includes('Bundle')
                      ? `${(alert.value / 1024 / 1024).toFixed(1)}MB`
                      : alert.metric.includes('Rate')
                      ? `${alert.value.toFixed(1)}%`
                      : `${alert.value.toFixed(1)}ms`
                  }
                  {alert.threshold && (
                    <span className="text-gray-500">
                      {' '}(threshold: {
                        alert.metric.includes('Memory') || alert.metric.includes('Bundle')
                          ? `${(alert.threshold / 1024 / 1024).toFixed(1)}MB`
                          : alert.metric.includes('Rate')
                          ? `${alert.threshold}%`
                          : `${alert.threshold}ms`
                      })
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => onDismiss(alert.id)}
              className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none"
              aria-label="Dismiss alert"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// Hook to use performance context
export const usePerformanceContext = (): PerformanceContextType => {
  const context = useContext(PerformanceContext)
  if (!context) {
    throw new Error('usePerformanceContext must be used within PerformanceProvider')
  }
  return context
}

export default PerformanceProvider