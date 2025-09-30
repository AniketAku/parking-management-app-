/**
 * Optimized Performance Monitor
 * Low-overhead performance monitoring with intelligent sampling
 */

import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals'

export interface PerformanceMetrics {
  cls: number | null
  fid: number | null
  fcp: number | null
  lcp: number | null
  ttfb: number | null
  renderTime?: number
  memoryUsage?: number
  timestamp: number
  url: string
  sessionId: string
}

export interface MonitoringConfig {
  sampleRate: number // 0.1 = 10% of users
  enabledMetrics: Set<string>
  bufferSize: number
  flushInterval: number
}

export class OptimizedPerformanceMonitor {
  private static instance: OptimizedPerformanceMonitor
  private metrics: PerformanceMetrics[] = []
  private listeners: Array<(metrics: PerformanceMetrics) => void> = []
  private config: MonitoringConfig
  private sessionId: string
  private isMonitoring = false
  private shouldSample = false
  private buffer: PerformanceMetrics[] = []
  private lastFlush = 0

  private constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      sampleRate: 0.1, // Monitor only 10% of users
      enabledMetrics: new Set(['lcp', 'fid', 'cls', 'fcp', 'ttfb']),
      bufferSize: 50,
      flushInterval: 30000, // 30 seconds
      ...config
    }
    
    this.sessionId = this.generateSessionId()
    this.shouldSample = this.determineSampling()
    
    // Only initialize if user is sampled
    if (this.shouldSample) {
      this.initialize()
    }
  }

  static getInstance(config?: Partial<MonitoringConfig>): OptimizedPerformanceMonitor {
    if (!OptimizedPerformanceMonitor.instance) {
      OptimizedPerformanceMonitor.instance = new OptimizedPerformanceMonitor(config)
    }
    return OptimizedPerformanceMonitor.instance
  }

  /**
   * Determine if this user should be sampled for monitoring
   */
  private determineSampling(): boolean {
    // Use session-based sampling for consistency
    const hash = this.simpleHash(this.sessionId)
    return (hash % 100) < (this.config.sampleRate * 100)
  }

  /**
   * Simple hash function for session ID
   */
  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Initialize monitoring (only for sampled users)
   */
  private initialize(): void {
    if (this.isMonitoring) return
    
    this.isMonitoring = true
    this.initializeWebVitals()
    this.setupPeriodicFlush()
  }

  /**
   * Initialize Web Vitals with sampling
   */
  private initializeWebVitals(): void {
    try {
      if (this.config.enabledMetrics.has('lcp')) {
        onLCP((metric) => this.recordMetric({ lcp: metric.value }), { reportAllChanges: false })
      }
      
      if (this.config.enabledMetrics.has('fid')) {
        onINP((metric) => this.recordMetric({ fid: metric.value }), { reportAllChanges: false })
      }
      
      if (this.config.enabledMetrics.has('cls')) {
        onCLS((metric) => this.recordMetric({ cls: metric.value }), { reportAllChanges: false })
      }
      
      if (this.config.enabledMetrics.has('fcp')) {
        onFCP((metric) => this.recordMetric({ fcp: metric.value }), { reportAllChanges: false })
      }
      
      if (this.config.enabledMetrics.has('ttfb')) {
        onTTFB((metric) => this.recordMetric({ ttfb: metric.value }), { reportAllChanges: false })
      }
    } catch (error) {
      // Silently fail if web-vitals not supported
    }
  }

  /**
   * Record performance metric (optimized)
   */
  private recordMetric(partialMetric: Partial<PerformanceMetrics>): void {
    if (!this.shouldSample) return

    const metric: PerformanceMetrics = {
      cls: null,
      fid: null,
      fcp: null,
      lcp: null,
      ttfb: null,
      timestamp: Date.now(),
      url: window.location.pathname, // Use pathname only to reduce data size
      sessionId: this.sessionId,
      ...partialMetric
    }

    // Use buffer to batch metrics
    this.buffer.push(metric)
    
    // Auto-flush if buffer is full
    if (this.buffer.length >= this.config.bufferSize) {
      this.flush()
    }

    // Notify listeners with debouncing
    this.notifyListenersDebounced(metric)
  }

  /**
   * Debounced listener notification
   */
  private notifyListenersDebounced = this.debounce((metric: PerformanceMetrics) => {
    this.listeners.forEach(listener => {
      try {
        listener(metric)
      } catch (error) {
        // Silently handle listener errors
      }
    })
  }, 100)

  /**
   * Setup periodic buffer flush
   */
  private setupPeriodicFlush(): void {
    setInterval(() => {
      if (this.buffer.length > 0 && Date.now() - this.lastFlush > this.config.flushInterval) {
        this.flush()
      }
    }, this.config.flushInterval)

    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flush())
  }

  /**
   * Flush buffered metrics
   */
  private flush(): void {
    if (this.buffer.length === 0) return

    // Move buffer to metrics and clear buffer
    this.metrics.push(...this.buffer.slice(-this.config.bufferSize)) // Keep only latest N metrics
    this.buffer = []
    this.lastFlush = Date.now()

    // Keep metrics array bounded
    if (this.metrics.length > this.config.bufferSize * 2) {
      this.metrics = this.metrics.slice(-this.config.bufferSize)
    }
  }

  /**
   * Get current metrics
   */
  public getMetrics(): PerformanceMetrics[] {
    this.flush() // Ensure latest data
    return [...this.metrics] // Return copy
  }

  /**
   * Add listener for metric updates
   */
  public addListener(listener: (metrics: PerformanceMetrics) => void): void {
    if (!this.shouldSample) return
    this.listeners.push(listener)
  }

  /**
   * Remove listener
   */
  public removeListener(listener: (metrics: PerformanceMetrics) => void): void {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  /**
   * Track custom performance metric
   */
  public trackCustomMetric(name: string, value: number, context?: Record<string, any>): void {
    if (!this.shouldSample) return
    
    const customMetric: PerformanceMetrics = {
      cls: null,
      fid: null,
      fcp: null,
      lcp: null,
      ttfb: null,
      [name]: value,
      timestamp: Date.now(),
      url: window.location.pathname,
      sessionId: this.sessionId,
      ...context
    }
    
    this.recordMetric(customMetric)
  }

  /**
   * Get monitoring status
   */
  public getStatus(): { isMonitoring: boolean; shouldSample: boolean; sessionId: string; sampleRate: number } {
    return {
      isMonitoring: this.isMonitoring,
      shouldSample: this.shouldSample,
      sessionId: this.sessionId,
      sampleRate: this.config.sampleRate
    }
  }

  /**
   * Debounce utility
   */
  private debounce<T extends (...args: any[]) => any>(func: T, delay: number): T {
    let timeoutId: NodeJS.Timeout
    return ((...args: Parameters<T>) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => func.apply(this, args), delay)
    }) as T
  }

  /**
   * Clear all metrics and reset
   */
  public clear(): void {
    this.metrics = []
    this.buffer = []
    this.lastFlush = Date.now()
  }

  /**
   * Update sampling configuration
   */
  public updateConfig(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config }
    
    // Re-evaluate sampling if sample rate changed
    if (config.sampleRate !== undefined) {
      const wasSampling = this.shouldSample
      this.shouldSample = this.determineSampling()
      
      // Start/stop monitoring based on new sampling
      if (!wasSampling && this.shouldSample) {
        this.initialize()
      } else if (wasSampling && !this.shouldSample) {
        this.isMonitoring = false
        this.clear()
      }
    }
  }
}

// Export singleton instance
export const performanceMonitor = OptimizedPerformanceMonitor.getInstance({
  sampleRate: 0.1, // 10% sampling
  enabledMetrics: new Set(['lcp', 'cls', 'fcp']), // Only essential metrics
  bufferSize: 25,
  flushInterval: 30000
})

export default performanceMonitor