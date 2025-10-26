// Performance Optimization Utilities
// Collection of utilities for improving application performance

import { lazy, ComponentType, LazyExoticComponent } from 'react'
import { log } from './secureLogger'

/**
 * Enhanced lazy loading with error boundaries and loading states
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    fallback?: React.ComponentType
    errorBoundary?: React.ComponentType<{ error: Error; retry: () => void }>
    preload?: boolean
    chunkName?: string
  } = {}
): LazyExoticComponent<T> {
  const { preload = false, chunkName } = options

  // Add webpack magic comment for chunk naming
  const enhancedImportFn = chunkName
    ? () => import(/* webpackChunkName: "[chunkName]" */ `${importFn}`)
    : importFn

  const LazyComponent = lazy(enhancedImportFn as any)

  // Preload if requested
  if (preload) {
    setTimeout(() => {
      enhancedImportFn().catch(error => log.error('Component preload failed', error))
    }, 100)
  }

  return LazyComponent
}

/**
 * Image optimization utilities
 */
export class ImageOptimizer {
  private static observer?: IntersectionObserver
  private static loadedImages = new Set<string>()

  /**
   * Initialize lazy loading for images
   */
  static initializeLazyLoading(): void {
    if (this.observer) return

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            this.loadImage(img)
            this.observer?.unobserve(img)
          }
        })
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    )

    // Observe existing images
    this.observeImages()
  }

  /**
   * Observe images for lazy loading
   */
  static observeImages(): void {
    const images = document.querySelectorAll('img[data-src]')
    images.forEach((img) => this.observer?.observe(img))
  }

  /**
   * Load an image with optimization
   */
  private static loadImage(img: HTMLImageElement): void {
    const src = img.dataset.src
    if (!src || this.loadedImages.has(src)) return

    // Create a new image to preload
    const tempImg = new Image()
    tempImg.onload = () => {
      img.src = src
      img.removeAttribute('data-src')
      img.classList.add('loaded')
      this.loadedImages.add(src)
    }
    tempImg.onerror = () => {
      img.classList.add('error')
      log.error('Image load failed', { src })
    }
    tempImg.src = src
  }

  /**
   * Generate optimized image URLs with different formats and sizes
   */
  static generateOptimizedUrl(
    baseUrl: string,
    options: {
      width?: number
      height?: number
      format?: 'webp' | 'jpeg' | 'png'
      quality?: number
    } = {}
  ): string {
    const { width, height, format = 'webp', quality = 80 } = options
    
    // This would integrate with your image optimization service
    const params = new URLSearchParams()
    if (width) params.set('w', width.toString())
    if (height) params.set('h', height.toString())
    if (format) params.set('f', format)
    if (quality) params.set('q', quality.toString())

    return `${baseUrl}?${params.toString()}`
  }

  /**
   * Create responsive image sources
   */
  static createResponsiveSource(baseUrl: string): {
    srcSet: string
    sizes: string
  } {
    const breakpoints = [320, 640, 768, 1024, 1280, 1920]
    
    const srcSet = breakpoints
      .map(width => `${this.generateOptimizedUrl(baseUrl, { width })} ${width}w`)
      .join(', ')

    const sizes = [
      '(max-width: 320px) 280px',
      '(max-width: 640px) 600px',
      '(max-width: 768px) 728px',
      '(max-width: 1024px) 984px',
      '(max-width: 1280px) 1240px',
      '1880px'
    ].join(', ')

    return { srcSet, sizes }
  }
}

/**
 * Bundle optimization utilities
 */
export class BundleOptimizer {
  private static loadedChunks = new Set<string>()
  
  /**
   * Preload a route chunk
   */
  static preloadRoute(route: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.loadedChunks.has(route)) {
        resolve()
        return
      }

      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = route
      link.onload = () => {
        this.loadedChunks.add(route)
        resolve()
      }
      link.onerror = reject
      
      document.head.appendChild(link)
    })
  }

  /**
   * Preload critical resources
   */
  static preloadCriticalResources(): void {
    const criticalResources = [
      // Fonts
      { href: '/fonts/inter-var.woff2', type: 'font', crossorigin: 'anonymous' },
      // CSS
      { href: '/styles/critical.css', type: 'style' },
      // JavaScript chunks
      { href: '/js/vendor.js', type: 'script' },
    ]

    criticalResources.forEach(resource => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.href = resource.href
      link.as = resource.type
      if (resource.crossorigin) {
        link.crossOrigin = resource.crossorigin
      }
      document.head.appendChild(link)
    })
  }

  /**
   * Dynamically import a module with error handling
   */
  static async dynamicImport<T>(
    importFn: () => Promise<T>,
    fallback?: T
  ): Promise<T> {
    try {
      return await importFn()
    } catch (error) {
      log.error('Dynamic import failed', error)
      if (fallback) {
        return fallback
      }
      throw error
    }
  }
}

/**
 * Memory optimization utilities
 */
export class MemoryOptimizer {
  private static weakRefs = new Set<WeakRef<any>>()
  private static cleanupInterval?: number

  /**
   * Create a weak reference for memory-efficient caching
   */
  static createWeakRef<T extends object>(object: T): WeakRef<T> {
    const weakRef = new WeakRef(object)
    this.weakRefs.add(weakRef)
    return weakRef
  }

  /**
   * Start memory cleanup process
   */
  static startCleanup(intervalMs = 30000): void {
    if (this.cleanupInterval) return

    this.cleanupInterval = window.setInterval(() => {
      this.cleanup()
    }, intervalMs)
  }

  /**
   * Stop memory cleanup process
   */
  static stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }
  }

  /**
   * Manual cleanup of weak references
   */
  static cleanup(): void {
    const validRefs = new Set<WeakRef<any>>()
    
    this.weakRefs.forEach(ref => {
      if (ref.deref()) {
        validRefs.add(ref)
      }
    })
    
    this.weakRefs = validRefs
    
    // Force garbage collection if available (development only)
    if (process.env.NODE_ENV === 'development' && 'gc' in window) {
      (window as any).gc()
    }
  }

  /**
   * Monitor memory usage
   */
  static getMemoryInfo(): {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  } | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      }
    }
    return null
  }
}

/**
 * Network optimization utilities
 */
export class NetworkOptimizer {
  private static requestCache = new Map<string, Promise<any>>()
  private static abortControllers = new Map<string, AbortController>()

  /**
   * Debounced network request
   */
  static debouncedRequest<T>(
    key: string,
    requestFn: (signal: AbortSignal) => Promise<T>,
    delay = 300
  ): Promise<T> {
    // Cancel previous request
    const existingController = this.abortControllers.get(key)
    if (existingController) {
      existingController.abort()
    }

    // Create new abort controller
    const controller = new AbortController()
    this.abortControllers.set(key, controller)

    // Create debounced promise
    const promise = new Promise<T>((resolve, reject) => {
      setTimeout(async () => {
        try {
          if (controller.signal.aborted) {
            reject(new Error('Request aborted'))
            return
          }
          
          const result = await requestFn(controller.signal)
          resolve(result)
        } catch (error) {
          reject(error)
        } finally {
          this.abortControllers.delete(key)
        }
      }, delay)
    })

    return promise
  }

  /**
   * Cached request with TTL
   */
  static cachedRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl = 300000 // 5 minutes
  ): Promise<T> {
    const cached = this.requestCache.get(key)
    if (cached) {
      return cached
    }

    const promise = requestFn()
    this.requestCache.set(key, promise)

    // Auto-cleanup after TTL
    setTimeout(() => {
      this.requestCache.delete(key)
    }, ttl)

    return promise
  }

  /**
   * Request with retry logic
   */
  static async requestWithRetry<T>(
    requestFn: () => Promise<T>,
    maxRetries = 3,
    backoffMs = 1000
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn()
      } catch (error) {
        lastError = error as Error
        
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = backoffMs * Math.pow(2, attempt)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError!
  }
}

/**
 * Virtual scrolling for large lists
 */
export class VirtualScrollOptimizer {
  private container: HTMLElement
  private itemHeight: number
  private renderItem: (index: number) => HTMLElement
  private totalItems: number
  private visibleStart = 0
  private visibleEnd = 0
  private renderedItems = new Map<number, HTMLElement>()

  constructor(
    container: HTMLElement,
    itemHeight: number,
    renderItem: (index: number) => HTMLElement,
    totalItems: number
  ) {
    this.container = container
    this.itemHeight = itemHeight
    this.renderItem = renderItem
    this.totalItems = totalItems

    this.setupScrollListener()
    this.updateVisibleItems()
  }

  private setupScrollListener(): void {
    this.container.addEventListener('scroll', () => {
      this.updateVisibleItems()
    })
  }

  private updateVisibleItems(): void {
    const scrollTop = this.container.scrollTop
    const containerHeight = this.container.clientHeight

    const newVisibleStart = Math.floor(scrollTop / this.itemHeight)
    const newVisibleEnd = Math.min(
      this.totalItems - 1,
      Math.ceil((scrollTop + containerHeight) / this.itemHeight)
    )

    // Add buffer for smooth scrolling
    const buffer = 5
    this.visibleStart = Math.max(0, newVisibleStart - buffer)
    this.visibleEnd = Math.min(this.totalItems - 1, newVisibleEnd + buffer)

    this.renderVisibleItems()
  }

  private renderVisibleItems(): void {
    // Remove items that are no longer visible
    this.renderedItems.forEach((element, index) => {
      if (index < this.visibleStart || index > this.visibleEnd) {
        element.remove()
        this.renderedItems.delete(index)
      }
    })

    // Add new visible items
    for (let i = this.visibleStart; i <= this.visibleEnd; i++) {
      if (!this.renderedItems.has(i)) {
        const element = this.renderItem(i)
        element.style.position = 'absolute'
        element.style.top = `${i * this.itemHeight}px`
        element.style.height = `${this.itemHeight}px`
        
        this.container.appendChild(element)
        this.renderedItems.set(i, element)
      }
    }

    // Set container height to enable scrolling
    this.container.style.height = `${this.totalItems * this.itemHeight}px`
  }

  updateTotalItems(newTotal: number): void {
    this.totalItems = newTotal
    this.updateVisibleItems()
  }

  scrollToItem(index: number): void {
    const targetScrollTop = index * this.itemHeight
    this.container.scrollTop = targetScrollTop
  }

  destroy(): void {
    this.renderedItems.forEach(element => element.remove())
    this.renderedItems.clear()
  }
}

/**
 * Performance monitoring and optimization coordinator
 */
export class PerformanceOptimizationCoordinator {
  private static instance?: PerformanceOptimizationCoordinator
  private optimizations = new Set<string>()

  static getInstance(): PerformanceOptimizationCoordinator {
    if (!this.instance) {
      this.instance = new PerformanceOptimizationCoordinator()
    }
    return this.instance
  }

  /**
   * Initialize all optimizations
   */
  initializeOptimizations(): void {
    if (this.optimizations.has('initialized')) return

    // Image optimization
    ImageOptimizer.initializeLazyLoading()
    
    // Bundle optimization
    BundleOptimizer.preloadCriticalResources()
    
    // Memory optimization
    MemoryOptimizer.startCleanup()

    this.optimizations.add('initialized')
    log.info('Performance optimizations initialized')
  }

  /**
   * Cleanup all optimizations
   */
  cleanup(): void {
    MemoryOptimizer.stopCleanup()
    this.optimizations.clear()
    log.info('Performance optimizations cleaned up')
  }

  /**
   * Get optimization status
   */
  getStatus(): {
    imageOptimization: boolean
    bundleOptimization: boolean
    memoryOptimization: boolean
    networkOptimization: boolean
  } {
    return {
      imageOptimization: this.optimizations.has('images'),
      bundleOptimization: this.optimizations.has('bundles'),
      memoryOptimization: this.optimizations.has('memory'),
      networkOptimization: this.optimizations.has('network'),
    }
  }
}

// Export the singleton instance
export const performanceOptimizer = PerformanceOptimizationCoordinator.getInstance()

// Default initialization
if (typeof window !== 'undefined') {
  // Auto-initialize optimizations when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      performanceOptimizer.initializeOptimizations()
    })
  } else {
    performanceOptimizer.initializeOptimizations()
  }
}

export default {
  ImageOptimizer,
  BundleOptimizer,
  MemoryOptimizer,
  NetworkOptimizer,
  VirtualScrollOptimizer,
  performanceOptimizer,
  createLazyComponent,
}