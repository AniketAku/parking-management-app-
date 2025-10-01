import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';

export interface PerformanceMetrics {
  cls: number | null;
  fid: number | null;
  fcp: number | null;
  lcp: number | null;
  ttfb: number | null;
  renderTime?: number;
  bundleSize?: number;
  memoryUsage?: number;
  networkRequests?: number;
  errorRate?: number;
  a11yScore?: number;
  timestamp: number;
  url: string;
  userAgent: string;
}

export interface PerformanceBudget {
  lcp: number // Max 2.5s
  fid: number // Max 100ms
  cls: number // Max 0.1
  fcp: number // Max 1.8s
  ttfb: number // Max 600ms
  bundleSize: number // Max 500KB
  memoryUsage: number // Max 100MB
  a11yScore: number // Min 95
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    cls: null,
    fid: null,
    fcp: null,
    lcp: null,
    ttfb: null,
    timestamp: Date.now(),
    url: '',
    userAgent: ''
  };
  private listeners: Array<(metrics: PerformanceMetrics) => void> = [];
  private budget: PerformanceBudget;
  private isMonitoring = false;

  constructor(budget?: Partial<PerformanceBudget>) {
    this.budget = {
      lcp: 2500,
      fid: 100,
      cls: 0.1,
      fcp: 1800,
      ttfb: 600,
      bundleSize: 512000,
      memoryUsage: 104857600,
      a11yScore: 95,
      ...budget
    };
  }

  init() {
    if (typeof window === 'undefined') return;
    
    try {
      onCLS((metric) => {
        this.metrics.cls = metric.value;
        this.notifyListeners();
      });

      onINP((metric) => {
        this.metrics.fid = metric.value;
        this.notifyListeners();
      });

      onFCP((metric) => {
        this.metrics.fcp = metric.value;
        this.notifyListeners();
      });

      onLCP((metric) => {
        this.metrics.lcp = metric.value;
        this.notifyListeners();
      });

      onTTFB((metric) => {
        this.metrics.ttfb = metric.value;
        this.notifyListeners();
      });
    } catch (error) {
      console.warn('Web vitals initialization failed:', error);
    }
  }

  onMetricsUpdate(callback: (metrics: PerformanceMetrics) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.metrics));
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  reportMetrics() {
    const report = {
      ...this.metrics,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    };

    // Send to analytics service
    if (import.meta.env.PROD) {
      fetch('/api/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      }).catch(console.error);
    }

    return report;
  }

  /**
   * Clear stored metrics - Fixed type mismatch bug
   */
  public clearMetrics(): void {
    this.metrics = {
      cls: null,
      fid: null,
      fcp: null,
      lcp: null,
      ttfb: null,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    }
  }

  /**
   * Initialize Core Web Vitals monitoring
   */
  private initializeCoreWebVitals(): void {
    // LCP (Largest Contentful Paint)
    this.observeMetric('largest-contentful-paint', (entry: any) => {
      this.recordMetric({ lcp: entry.startTime })
    })

    // FID (First Input Delay)
    this.observeMetric('first-input', (entry: any) => {
      this.recordMetric({ fid: entry.processingStart - entry.startTime })
    })

    // CLS (Cumulative Layout Shift)
    this.observeMetric('layout-shift', (entry: any) => {
      if (!entry.hadRecentInput) {
        this.recordMetric({ cls: entry.value })
      }
    })

    // FCP (First Contentful Paint)
    this.observeMetric('paint', (entry: any) => {
      if (entry.name === 'first-contentful-paint') {
        this.recordMetric({ fcp: entry.startTime })
      }
    })
  }

  /**
   * Initialize navigation metrics
   */
  private initializeNavigationMetrics(): void {
    this.navigationObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        if (entry.entryType === 'navigation') {
          this.recordMetric({
            ttfb: entry.responseStart - entry.requestStart,
            renderTime: entry.loadEventEnd - entry.navigationStart,
          })
        }
      })
    })

    try {
      this.navigationObserver.observe({ entryTypes: ['navigation'] })
    } catch (error) {
      console.warn('Navigation timing not supported:', error)
    }
  }

  /**
   * Initialize resource metrics monitoring
   */
  private initializeResourceMetrics(): void {
    // Monitor bundle size and network requests
    const resourceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      let totalSize = 0
      let requestCount = 0

      entries.forEach((entry: any) => {
        if (entry.transferSize) {
          totalSize += entry.transferSize
          requestCount++
        }
      })

      if (requestCount > 0) {
        this.recordMetric({
          bundleSize: totalSize,
          networkRequests: requestCount,
        })
      }
    })

    try {
      resourceObserver.observe({ entryTypes: ['resource'] })
    } catch (error) {
      console.warn('Resource timing not supported:', error)
    }
  }

  /**
   * Initialize memory monitoring
   */
  private initializeMemoryMonitoring(): void {
    // Check for memory API support
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory
        this.recordMetric({
          memoryUsage: memory.usedJSHeapSize,
        })
      }, 30000) // Check every 30 seconds
    }
  }

  /**
   * Initialize error tracking
   */
  private initializeErrorTracking(): void {
    let errorCount = 0
    let totalEvents = 0

    const errorHandler = () => {
      errorCount++
      totalEvents++
      this.recordMetric({
        errorRate: (errorCount / totalEvents) * 100,
      })
    }

    const eventHandler = () => {
      totalEvents++
    }

    window.addEventListener('error', errorHandler)
    window.addEventListener('unhandledrejection', errorHandler)
    window.addEventListener('click', eventHandler)
    window.addEventListener('keypress', eventHandler)
  }

  /**
   * Generic metric observer
   */
  private observeMetric(type: string, callback: (entry: PerformanceEntry) => void): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach(callback)
    })

    try {
      observer.observe({ entryTypes: [type] })
    } catch (error) {
      console.warn(`${type} monitoring not supported:`, error)
    }
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: Partial<PerformanceMetrics>): void {
    const fullMetric: PerformanceMetrics = {
      ...metric,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    }

    this.metrics.push(fullMetric)

    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100)
    }

    // Check for budget violations
    this.checkMetricAgainstBudget(fullMetric)
  }

  /**
   * Calculate average metrics
   */
  private calculateAverages(): Partial<PerformanceMetrics> {
    const averages: Partial<PerformanceMetrics> = {}
    const keys = ['lcp', 'fid', 'cls', 'fcp', 'ttfb', 'renderTime', 'bundleSize', 'memoryUsage', 'networkRequests', 'errorRate'] as const

    keys.forEach(key => {
      const values = this.metrics
        .map(m => m[key])
        .filter(v => v !== undefined) as number[]
      
      if (values.length > 0) {
        averages[key] = values.reduce((sum, val) => sum + val, 0) / values.length
      }
    })

    return averages
  }

  /**
   * Check metrics against performance budget
   */
  private checkBudget(averages: Partial<PerformanceMetrics>): Record<keyof PerformanceBudget, 'pass' | 'warn' | 'fail'> {
    const status = {} as Record<keyof PerformanceBudget, 'pass' | 'warn' | 'fail'>

    Object.entries(this.budget).forEach(([key, budgetValue]) => {
      const metricKey = key as keyof PerformanceBudget
      const avgValue = averages[metricKey as keyof PerformanceMetrics] as number

      if (avgValue === undefined) {
        status[metricKey] = 'pass' // No data means no violation
        return
      }

      if (metricKey === 'a11yScore') {
        // For accessibility score, higher is better
        if (avgValue >= budgetValue) status[metricKey] = 'pass'
        else if (avgValue >= budgetValue * 0.9) status[metricKey] = 'warn'
        else status[metricKey] = 'fail'
      } else {
        // For other metrics, lower is better
        if (avgValue <= budgetValue) status[metricKey] = 'pass'
        else if (avgValue <= budgetValue * 1.2) status[metricKey] = 'warn'
        else status[metricKey] = 'fail'
      }
    })

    return status
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    averages: Partial<PerformanceMetrics>,
    budgetStatus: Record<keyof PerformanceBudget, 'pass' | 'warn' | 'fail'>
  ): string[] {
    const recommendations: string[] = []

    if (budgetStatus.lcp === 'fail') {
      recommendations.push('Optimize Largest Contentful Paint: reduce image sizes, improve server response times')
    }

    if (budgetStatus.fid === 'fail') {
      recommendations.push('Reduce First Input Delay: minimize JavaScript execution, use code splitting')
    }

    if (budgetStatus.cls === 'fail') {
      recommendations.push('Improve Cumulative Layout Shift: set image dimensions, avoid inserting content above existing content')
    }

    if (budgetStatus.bundleSize === 'fail') {
      recommendations.push('Reduce bundle size: implement code splitting, remove unused dependencies')
    }

    if (budgetStatus.memoryUsage === 'fail') {
      recommendations.push('Optimize memory usage: fix memory leaks, reduce object creation')
    }

    if (budgetStatus.a11yScore === 'fail') {
      recommendations.push('Improve accessibility: run accessibility audit, fix WCAG violations')
    }

    return recommendations
  }

  /**
   * Check individual metric against budget and warn if needed
   */
  private checkMetricAgainstBudget(metric: PerformanceMetrics): void {
    Object.entries(this.budget).forEach(([key, budgetValue]) => {
      const metricKey = key as keyof PerformanceBudget
      const value = metric[metricKey as keyof PerformanceMetrics] as number

      if (value === undefined) return

      let exceeded = false
      if (metricKey === 'a11yScore') {
        exceeded = value < budgetValue
      } else {
        exceeded = value > budgetValue
      }

      if (exceeded) {
        console.warn(`⚠️ Performance budget exceeded for ${key}: ${value} (budget: ${budgetValue})`)
      }
    })
  }
}

/**
 * Component performance measurement decorator
 */
export function measurePerformance(componentName: string) {
  return function <T extends { new (...args: any[]): any }>(constructor: T) {
    return class extends constructor {
      componentDidMount() {
        const startTime = performance.now()
        if (super.componentDidMount) {
          super.componentDidMount()
        }
        const endTime = performance.now()
        console.log(`🔍 ${componentName} mount time: ${endTime - startTime}ms`)
      }

      componentDidUpdate() {
        const startTime = performance.now()
        if (super.componentDidUpdate) {
          super.componentDidUpdate()
        }
        const endTime = performance.now()
        console.log(`🔍 ${componentName} update time: ${endTime - startTime}ms`)
      }
    }
  }
}

/**
 * Hook for measuring React component render performance
 */
export function usePerformanceMeasurement(componentName: string) {
  React.useEffect(() => {
    const startTime = performance.now()
    return () => {
      const endTime = performance.now()
      console.log(`🔍 ${componentName} render time: ${endTime - startTime}ms`)
    }
  })
}

/**
 * Function to measure async operations
 */
export async function measureAsyncOperation<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = performance.now()
  try {
    const result = await operation()
    const endTime = performance.now()
    console.log(`⏱️ ${operationName} completed in ${endTime - startTime}ms`)
    return result
  } catch (error) {
    const endTime = performance.now()
    console.error(`❌ ${operationName} failed after ${endTime - startTime}ms:`, error)
    throw error
  }
}

/**
 * Memory usage tracker
 */
export class MemoryTracker {
  private measurements: Array<{ timestamp: number; usage: number }> = []
  private interval?: number

  start(intervalMs = 5000): void {
    if ('memory' in performance) {
      this.interval = window.setInterval(() => {
        const usage = (performance as any).memory.usedJSHeapSize
        this.measurements.push({
          timestamp: Date.now(),
          usage,
        })

        // Keep only last hour of measurements
        const oneHourAgo = Date.now() - 3600000
        this.measurements = this.measurements.filter(m => m.timestamp > oneHourAgo)
      }, intervalMs)
    }
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = undefined
    }
  }

  getUsage(): Array<{ timestamp: number; usage: number }> {
    return [...this.measurements]
  }

  getCurrentUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize
    }
    return 0
  }

  getAverageUsage(): number {
    if (this.measurements.length === 0) return 0
    const total = this.measurements.reduce((sum, m) => sum + m.usage, 0)
    return total / this.measurements.length
  }

  getPeakUsage(): number {
    if (this.measurements.length === 0) return 0
    return Math.max(...this.measurements.map(m => m.usage))
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

export default performanceMonitor