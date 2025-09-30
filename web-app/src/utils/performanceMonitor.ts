/**
 * Performance Monitor - Comprehensive Performance Tracking and Analysis
 * Measures component render times, bundle sizes, and user interaction responsiveness
 */

interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: number
  context?: Record<string, any>
}

interface ComponentRenderMetrics {
  componentName: string
  renderTime: number
  propsCount: number
  childrenCount: number
  rerenderCount: number
  lastRender: number
}

interface BundleMetrics {
  initialBundleSize: number
  chunkSizes: Record<string, number>
  loadingTimes: Record<string, number>
  cacheHitRatio: number
}

interface InteractionMetrics {
  eventType: string
  responseTime: number
  target: string
  timestamp: number
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetric[] = []
  private componentMetrics: Map<string, ComponentRenderMetrics> = new Map()
  private interactionMetrics: InteractionMetrics[] = []
  private observers: PerformanceObserver[] = []
  private isEnabled: boolean = true

  private constructor() {
    this.initializeObservers()
    this.setupInteractionTracking()
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  private initializeObservers(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      this.isEnabled = false
      return
    }

    // Observe navigation timing
    try {
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          if (entry.entryType === 'navigation') {
            this.recordNavigation(entry as PerformanceNavigationTiming)
          }
        })
      })
      navObserver.observe({ entryTypes: ['navigation'] })
      this.observers.push(navObserver)
    } catch (e) {
      console.warn('Navigation observer not supported')
    }

    // Observe resource timing
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          if (entry.entryType === 'resource') {
            this.recordResource(entry as PerformanceResourceTiming)
          }
        })
      })
      resourceObserver.observe({ entryTypes: ['resource'] })
      this.observers.push(resourceObserver)
    } catch (e) {
      console.warn('Resource observer not supported')
    }

    // Observe paint timing
    try {
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          this.recordMetric({
            name: entry.name,
            value: entry.startTime,
            unit: 'ms',
            timestamp: Date.now()
          })
        })
      })
      paintObserver.observe({ entryTypes: ['paint'] })
      this.observers.push(paintObserver)
    } catch (e) {
      console.warn('Paint observer not supported')
    }

    // Observe largest contentful paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as any
        if (lastEntry) {
          this.recordMetric({
            name: 'largest-contentful-paint',
            value: lastEntry.startTime,
            unit: 'ms',
            timestamp: Date.now(),
            context: {
              element: lastEntry.element?.tagName,
              size: lastEntry.size
            }
          })
        }
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.push(lcpObserver)
    } catch (e) {
      console.warn('LCP observer not supported')
    }

    // Observe layout shifts
    try {
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          if (!(entry as any).hadRecentInput) {
            this.recordMetric({
              name: 'cumulative-layout-shift',
              value: (entry as any).value,
              unit: 'score',
              timestamp: Date.now()
            })
          }
        })
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
      this.observers.push(clsObserver)
    } catch (e) {
      console.warn('CLS observer not supported')
    }
  }

  private setupInteractionTracking(): void {
    if (typeof window === 'undefined') return

    const trackInteraction = (eventType: string) => {
      return (event: Event) => {
        const startTime = performance.now()
        
        requestIdleCallback(() => {
          const endTime = performance.now()
          const target = (event.target as Element)?.tagName || 'unknown'
          
          this.interactionMetrics.push({
            eventType,
            responseTime: endTime - startTime,
            target,
            timestamp: Date.now()
          })

          // Keep only last 100 interactions
          if (this.interactionMetrics.length > 100) {
            this.interactionMetrics = this.interactionMetrics.slice(-100)
          }
        })
      }
    }

    // Track key interactions
    window.addEventListener('click', trackInteraction('click'), { passive: true })
    window.addEventListener('keydown', trackInteraction('keydown'), { passive: true })
    window.addEventListener('scroll', trackInteraction('scroll'), { passive: true })
  }

  private recordNavigation(entry: PerformanceNavigationTiming): void {
    this.recordMetric({
      name: 'dom-content-loaded',
      value: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      unit: 'ms',
      timestamp: Date.now()
    })

    this.recordMetric({
      name: 'page-load-complete',
      value: entry.loadEventEnd - entry.loadEventStart,
      unit: 'ms',
      timestamp: Date.now()
    })

    this.recordMetric({
      name: 'dns-lookup',
      value: entry.domainLookupEnd - entry.domainLookupStart,
      unit: 'ms',
      timestamp: Date.now()
    })

    this.recordMetric({
      name: 'tcp-connection',
      value: entry.connectEnd - entry.connectStart,
      unit: 'ms',
      timestamp: Date.now()
    })
  }

  private recordResource(entry: PerformanceResourceTiming): void {
    const resourceType = this.getResourceType(entry.name)
    
    this.recordMetric({
      name: `resource-${resourceType}-load`,
      value: entry.responseEnd - entry.requestStart,
      unit: 'ms',
      timestamp: Date.now(),
      context: {
        url: entry.name,
        size: entry.transferSize,
        cached: entry.transferSize === 0
      }
    })
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'javascript'
    if (url.includes('.css')) return 'stylesheet'
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg')) return 'image'
    if (url.includes('.woff') || url.includes('.ttf')) return 'font'
    return 'other'
  }

  // Public API
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    if (!this.isEnabled) return

    this.metrics.push({
      ...metric,
      timestamp: Date.now()
    })

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
  }

  recordComponentRender(
    componentName: string,
    renderTime: number,
    props?: any,
    children?: any[]
  ): void {
    if (!this.isEnabled) return

    const existing = this.componentMetrics.get(componentName)
    if (existing) {
      existing.renderTime = renderTime
      existing.propsCount = props ? Object.keys(props).length : 0
      existing.childrenCount = children ? children.length : 0
      existing.rerenderCount++
      existing.lastRender = Date.now()
    } else {
      this.componentMetrics.set(componentName, {
        componentName,
        renderTime,
        propsCount: props ? Object.keys(props).length : 0,
        childrenCount: children ? children.length : 0,
        rerenderCount: 1,
        lastRender: Date.now()
      })
    }
  }

  measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now()
    
    return fn().then(
      result => {
        this.recordMetric({
          name: `async-${name}`,
          value: performance.now() - start,
          unit: 'ms'
        })
        return result
      },
      error => {
        this.recordMetric({
          name: `async-${name}-error`,
          value: performance.now() - start,
          unit: 'ms',
          context: { error: error.message }
        })
        throw error
      }
    )
  }

  measureSync<T>(name: string, fn: () => T): T {
    const start = performance.now()
    try {
      const result = fn()
      this.recordMetric({
        name: `sync-${name}`,
        value: performance.now() - start,
        unit: 'ms'
      })
      return result
    } catch (error) {
      this.recordMetric({
        name: `sync-${name}-error`,
        value: performance.now() - start,
        unit: 'ms',
        context: { error: (error as Error).message }
      })
      throw error
    }
  }

  // Analysis methods
  getMetricsSummary(): Record<string, any> {
    const now = Date.now()
    const recent = this.metrics.filter(m => now - m.timestamp < 60000) // Last minute

    const grouped = recent.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = []
      }
      acc[metric.name].push(metric.value)
      return acc
    }, {} as Record<string, number[]>)

    return Object.entries(grouped).reduce((acc, [name, values]) => {
      acc[name] = {
        count: values.length,
        avg: values.reduce((sum, v) => sum + v, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        p95: this.percentile(values, 95)
      }
      return acc
    }, {} as Record<string, any>)
  }

  getComponentPerformance(): ComponentRenderMetrics[] {
    return Array.from(this.componentMetrics.values()).sort((a, b) => 
      b.renderTime - a.renderTime
    )
  }

  getInteractionPerformance(): Record<string, any> {
    const grouped = this.interactionMetrics.reduce((acc, interaction) => {
      if (!acc[interaction.eventType]) {
        acc[interaction.eventType] = []
      }
      acc[interaction.eventType].push(interaction.responseTime)
      return acc
    }, {} as Record<string, number[]>)

    return Object.entries(grouped).reduce((acc, [eventType, times]) => {
      acc[eventType] = {
        count: times.length,
        avg: times.reduce((sum, t) => sum + t, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        p95: this.percentile(times, 95)
      }
      return acc
    }, {} as Record<string, any>)
  }

  getBundleMetrics(): BundleMetrics {
    const jsResources = this.metrics.filter(m => 
      m.name === 'resource-javascript-load' && m.context
    )

    const chunkSizes = jsResources.reduce((acc, metric) => {
      if (metric.context?.url) {
        const filename = metric.context.url.split('/').pop() || 'unknown'
        acc[filename] = metric.context.size || 0
      }
      return acc
    }, {} as Record<string, number>)

    const loadingTimes = jsResources.reduce((acc, metric) => {
      if (metric.context?.url) {
        const filename = metric.context.url.split('/').pop() || 'unknown'
        acc[filename] = metric.value
      }
      return acc
    }, {} as Record<string, number>)

    const cachedResources = jsResources.filter(m => m.context?.cached).length
    const totalResources = jsResources.length
    const cacheHitRatio = totalResources > 0 ? cachedResources / totalResources : 0

    return {
      initialBundleSize: Object.values(chunkSizes).reduce((sum, size) => sum + size, 0),
      chunkSizes,
      loadingTimes,
      cacheHitRatio
    }
  }

  getPerformanceReport(): string {
    const summary = this.getMetricsSummary()
    const components = this.getComponentPerformance()
    const interactions = this.getInteractionPerformance()
    const bundle = this.getBundleMetrics()

    return `
## Performance Report (Generated: ${new Date().toISOString()})

### Core Web Vitals
- **First Contentful Paint**: ${summary['first-contentful-paint']?.avg?.toFixed(2) || 'N/A'} ms
- **Largest Contentful Paint**: ${summary['largest-contentful-paint']?.avg?.toFixed(2) || 'N/A'} ms  
- **Cumulative Layout Shift**: ${summary['cumulative-layout-shift']?.avg?.toFixed(3) || 'N/A'}
- **First Input Delay**: ${interactions.click?.avg?.toFixed(2) || 'N/A'} ms

### Bundle Performance
- **Initial Bundle Size**: ${(bundle.initialBundleSize / 1024 / 1024).toFixed(2)} MB
- **Cache Hit Ratio**: ${(bundle.cacheHitRatio * 100).toFixed(1)}%
- **Average Chunk Load Time**: ${Object.values(bundle.loadingTimes).reduce((sum, time) => sum + time, 0) / Object.values(bundle.loadingTimes).length || 0} ms

### Component Performance (Top 5 Slowest)
${components.slice(0, 5).map(comp => 
  `- **${comp.componentName}**: ${comp.renderTime.toFixed(2)}ms (${comp.rerenderCount} renders)`
).join('\n')}

### Interaction Performance
${Object.entries(interactions).map(([type, stats]: [string, any]) =>
  `- **${type}**: ${stats.avg.toFixed(2)}ms avg, ${stats.p95.toFixed(2)}ms p95`
).join('\n')}

### Recommendations
${this.generateRecommendations(summary, components, interactions, bundle)}
    `.trim()
  }

  private generateRecommendations(summary: any, components: ComponentRenderMetrics[], interactions: any, bundle: BundleMetrics): string {
    const recommendations: string[] = []

    // LCP recommendations
    const lcp = summary['largest-contentful-paint']?.avg || 0
    if (lcp > 2500) {
      recommendations.push('- **Critical**: LCP > 2.5s - Consider lazy loading, image optimization, or server-side rendering')
    }

    // Bundle size recommendations  
    if (bundle.initialBundleSize > 1024 * 1024) { // > 1MB
      recommendations.push('- **Warning**: Bundle size > 1MB - Implement code splitting and tree shaking')
    }

    // Component render time recommendations
    const slowComponents = components.filter(c => c.renderTime > 16) // > 16ms (60fps threshold)
    if (slowComponents.length > 0) {
      recommendations.push(`- **Performance**: ${slowComponents.length} components render > 16ms - Consider React.memo, useMemo, or virtualization`)
    }

    // Interaction responsiveness
    const clickTime = interactions.click?.avg || 0
    if (clickTime > 100) {
      recommendations.push('- **UX**: Click response time > 100ms - Optimize event handlers and reduce main thread work')
    }

    // Cache hit ratio
    if (bundle.cacheHitRatio < 0.8) {
      recommendations.push('- **Caching**: Cache hit ratio < 80% - Improve cache headers and service worker strategy')
    }

    return recommendations.length > 0 ? recommendations.join('\n') : '- ✅ All metrics within recommended ranges'
  }

  private percentile(values: number[], p: number): number {
    const sorted = values.slice().sort((a, b) => a - b)
    const index = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[index] || 0
  }

  // Cleanup
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    this.metrics = []
    this.componentMetrics.clear()
    this.interactionMetrics = []
    this.isEnabled = false
  }
}

export default PerformanceMonitor.getInstance()