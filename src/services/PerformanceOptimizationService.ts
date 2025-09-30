// =============================================================================
// PERFORMANCE OPTIMIZATION SERVICE
// Advanced batching, caching, and performance monitoring for real-time operations
// =============================================================================

import { supabase } from '../lib/supabase';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  version: number;
}

export interface BatchOperation {
  id: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT';
  table: string;
  data: any;
  priority: 'low' | 'normal' | 'high' | 'critical';
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface PerformanceMetrics {
  cacheHitRate: number;
  averageResponseTime: number;
  batchProcessingRate: number;
  errorRate: number;
  memoryUsage: number;
  networkLatency: number;
  operationsPerSecond: number;
  queueSize: number;
}

export interface OptimizationConfig {
  cacheMaxSize: number;
  cacheTTL: number;
  batchSize: number;
  batchTimeout: number;
  maxRetries: number;
  compressionThreshold: number;
  prefetchEnabled: boolean;
  adaptiveBatching: boolean;
}

export class PerformanceOptimizationService {
  private static instance: PerformanceOptimizationService;

  // Cache management
  private cache = new Map<string, CacheEntry>();
  private cacheStats = { hits: 0, misses: 0, evictions: 0 };

  // Batch processing
  private batchQueue: BatchOperation[] = [];
  private batchTimer?: NodeJS.Timeout;
  private processingBatch = false;

  // Performance monitoring
  private metrics: PerformanceMetrics = {
    cacheHitRate: 0,
    averageResponseTime: 0,
    batchProcessingRate: 0,
    errorRate: 0,
    memoryUsage: 0,
    networkLatency: 0,
    operationsPerSecond: 0,
    queueSize: 0
  };

  private responseTimeBuffer: number[] = [];
  private operationCounter = 0;
  private errorCounter = 0;
  private lastMetricsUpdate = Date.now();

  // Configuration with adaptive optimization
  private config: OptimizationConfig = {
    cacheMaxSize: 1000,
    cacheTTL: 300000, // 5 minutes default
    batchSize: 25,
    batchTimeout: 1000, // 1 second
    maxRetries: 3,
    compressionThreshold: 1024, // 1KB
    prefetchEnabled: true,
    adaptiveBatching: true
  };

  // Adaptive optimization state
  private performanceProfile: 'fast' | 'balanced' | 'memory_saving' = 'balanced';
  private adaptationInterval?: NodeJS.Timeout;

  public static getInstance(): PerformanceOptimizationService {
    if (!PerformanceOptimizationService.instance) {
      PerformanceOptimizationService.instance = new PerformanceOptimizationService();
    }
    return PerformanceOptimizationService.instance;
  }

  constructor() {
    this.startAdaptiveOptimization();
    this.startPerformanceMonitoring();
    this.setupMemoryManagement();
  }

  /**
   * Advanced caching with TTL, versioning, and intelligent eviction
   */
  async get<T>(key: string, fallback?: () => Promise<T>, ttl?: number): Promise<T | null> {
    const startTime = performance.now();

    try {
      const cacheEntry = this.cache.get(key);
      const now = Date.now();

      if (cacheEntry && (now - cacheEntry.timestamp < cacheEntry.ttl)) {
        // Cache hit
        cacheEntry.accessCount++;
        cacheEntry.lastAccessed = now;
        this.cacheStats.hits++;

        this.recordResponseTime(performance.now() - startTime);
        return cacheEntry.data;
      }

      // Cache miss
      this.cacheStats.misses++;

      if (fallback) {
        const data = await fallback();
        await this.set(key, data, ttl);
        this.recordResponseTime(performance.now() - startTime);
        return data;
      }

      this.recordResponseTime(performance.now() - startTime);
      return null;
    } catch (error) {
      this.errorCounter++;
      console.error('Cache get error:', error);
      this.recordResponseTime(performance.now() - startTime);
      return null;
    }
  }

  /**
   * Set cache entry with intelligent storage optimization
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const now = Date.now();
    const effectiveTTL = ttl || this.config.cacheTTL;

    // Compress large data if enabled
    let processedData = data;
    if (this.shouldCompress(data)) {
      processedData = await this.compressData(data);
    }

    const entry: CacheEntry<T> = {
      data: processedData,
      timestamp: now,
      ttl: effectiveTTL,
      accessCount: 1,
      lastAccessed: now,
      version: 1
    };

    this.cache.set(key, entry);

    // Trigger eviction if cache is too large
    if (this.cache.size > this.config.cacheMaxSize) {
      await this.evictLeastRecentlyUsed();
    }
  }

  /**
   * Batch processing with priority queuing and adaptive sizing
   */
  async batchOperation(operation: Omit<BatchOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const batchOp: BatchOperation = {
      ...operation,
      id: this.generateOperationId(),
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.config.maxRetries
    };

    // Insert with priority ordering
    this.insertWithPriority(batchOp);

    // Start batch processing if not already running
    if (!this.processingBatch) {
      this.scheduleBatchProcessing();
    }

    return batchOp.id;
  }

  /**
   * Intelligent prefetching based on usage patterns
   */
  async prefetch(keys: string[], predictor?: (key: string) => boolean): Promise<void> {
    if (!this.config.prefetchEnabled) return;

    const prefetchPromises = keys
      .filter(key => !this.cache.has(key))
      .filter(key => !predictor || predictor(key))
      .slice(0, 10) // Limit concurrent prefetch
      .map(async key => {
        try {
          const data = await this.fetchFromDatabase(key);
          if (data) {
            await this.set(key, data, this.config.cacheTTL / 2); // Shorter TTL for prefetched data
          }
        } catch (error) {
          console.warn('Prefetch failed for key:', key, error);
        }
      });

    await Promise.allSettled(prefetchPromises);
  }

  /**
   * Smart database query optimization
   */
  async optimizedQuery<T>(
    query: () => Promise<T>,
    cacheKey?: string,
    options: {
      ttl?: number;
      priority?: BatchOperation['priority'];
      useCache?: boolean;
    } = {}
  ): Promise<T> {
    const { ttl, priority = 'normal', useCache = true } = options;
    const startTime = performance.now();

    try {
      // Try cache first if enabled
      if (useCache && cacheKey) {
        const cached = await this.get(cacheKey, undefined, ttl);
        if (cached !== null) {
          return cached as T;
        }
      }

      // Execute query with performance monitoring
      const result = await this.executeWithRetry(query, 3);

      // Cache result if successful and cache key provided
      if (useCache && cacheKey && result) {
        await this.set(cacheKey, result, ttl);
      }

      this.operationCounter++;
      this.recordResponseTime(performance.now() - startTime);

      return result;
    } catch (error) {
      this.errorCounter++;
      this.recordResponseTime(performance.now() - startTime);
      throw error;
    }
  }

  /**
   * Memory-efficient data streaming for large datasets
   */
  async *streamData<T>(
    query: (offset: number, limit: number) => Promise<T[]>,
    chunkSize: number = 100
  ): AsyncGenerator<T[], void, unknown> {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      try {
        const chunk = await query(offset, chunkSize);

        if (chunk.length === 0) {
          hasMore = false;
        } else {
          yield chunk;
          offset += chunk.length;

          // Yield control to prevent blocking
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      } catch (error) {
        console.error('Streaming error at offset', offset, error);
        throw error;
      }
    }
  }

  /**
   * Performance metrics and monitoring
   */
  getMetrics(): PerformanceMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Dynamic configuration adjustment based on performance
   */
  async optimizeConfiguration(): Promise<void> {
    const currentMetrics = this.getMetrics();

    // Adjust cache size based on hit rate
    if (currentMetrics.cacheHitRate < 0.6 && this.config.cacheMaxSize < 2000) {
      this.config.cacheMaxSize = Math.min(2000, this.config.cacheMaxSize * 1.2);
    } else if (currentMetrics.cacheHitRate > 0.9 && this.config.cacheMaxSize > 500) {
      this.config.cacheMaxSize = Math.max(500, this.config.cacheMaxSize * 0.9);
    }

    // Adjust batch size based on processing rate
    if (currentMetrics.batchProcessingRate < 0.8) {
      this.config.batchSize = Math.min(50, this.config.batchSize + 5);
    } else if (currentMetrics.queueSize < 5) {
      this.config.batchSize = Math.max(10, this.config.batchSize - 3);
    }

    // Adjust TTL based on memory pressure
    if (currentMetrics.memoryUsage > 0.8) {
      this.config.cacheTTL = Math.max(60000, this.config.cacheTTL * 0.8);
    }

    console.log('Configuration optimized:', this.config);
  }

  /**
   * Clear cache with optional pattern matching
   */
  async clearCache(pattern?: string): Promise<number> {
    let clearedCount = 0;

    if (pattern) {
      const regex = new RegExp(pattern);
      for (const [key] of this.cache) {
        if (regex.test(key)) {
          this.cache.delete(key);
          clearedCount++;
        }
      }
    } else {
      clearedCount = this.cache.size;
      this.cache.clear();
      this.cacheStats = { hits: 0, misses: 0, evictions: 0 };
    }

    return clearedCount;
  }

  // Private methods

  private startAdaptiveOptimization(): void {
    this.adaptationInterval = setInterval(async () => {
      await this.optimizeConfiguration();
    }, 60000); // Adjust every minute
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updateMetrics();
    }, 10000); // Update every 10 seconds
  }

  private setupMemoryManagement(): void {
    // Monitor memory usage and trigger cleanup
    setInterval(() => {
      if (typeof window !== 'undefined' && 'performance' in window) {
        // Browser environment
        const memInfo = (performance as any).memory;
        if (memInfo && memInfo.usedJSHeapSize / memInfo.totalJSHeapSize > 0.8) {
          this.performMemoryCleanup();
        }
      }
    }, 30000);
  }

  private shouldCompress<T>(data: T): boolean {
    if (!this.config.compressionThreshold) return false;

    const serialized = JSON.stringify(data);
    return serialized.length > this.config.compressionThreshold;
  }

  private async compressData<T>(data: T): Promise<T> {
    // Simple compression simulation - in real implementation, use a compression library
    const serialized = JSON.stringify(data);
    const compressed = serialized.replace(/\s+/g, ' ').trim();
    return JSON.parse(compressed);
  }

  private async evictLeastRecentlyUsed(): Promise<void> {
    const entries = Array.from(this.cache.entries());

    // Sort by last accessed time (oldest first)
    entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    // Remove oldest 10% of entries
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
      this.cacheStats.evictions++;
    }
  }

  private insertWithPriority(operation: BatchOperation): void {
    const priorities = { critical: 0, high: 1, normal: 2, low: 3 };
    const insertIndex = this.batchQueue.findIndex(
      op => priorities[op.priority] > priorities[operation.priority]
    );

    if (insertIndex === -1) {
      this.batchQueue.push(operation);
    } else {
      this.batchQueue.splice(insertIndex, 0, operation);
    }
  }

  private scheduleBatchProcessing(): void {
    if (this.batchTimer) return;

    const shouldProcessImmediately =
      this.batchQueue.length >= this.config.batchSize ||
      this.batchQueue.some(op => op.priority === 'critical');

    if (shouldProcessImmediately) {
      this.processBatch();
    } else {
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, this.config.batchTimeout);
    }
  }

  private async processBatch(): Promise<void> {
    if (this.processingBatch || this.batchQueue.length === 0) return;

    this.processingBatch = true;

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    const batchToProcess = this.batchQueue.splice(0, this.config.batchSize);

    try {
      await this.executeBatchOperations(batchToProcess);
    } catch (error) {
      console.error('Batch processing error:', error);

      // Retry failed operations
      const retriableOps = batchToProcess
        .filter(op => op.retryCount < op.maxRetries)
        .map(op => ({ ...op, retryCount: op.retryCount + 1 }));

      this.batchQueue.unshift(...retriableOps);
    }

    this.processingBatch = false;

    // Schedule next batch if queue not empty
    if (this.batchQueue.length > 0) {
      this.scheduleBatchProcessing();
    }
  }

  private async executeBatchOperations(operations: BatchOperation[]): Promise<void> {
    // Group operations by table and type for optimal batching
    const grouped = this.groupOperations(operations);

    for (const [key, ops] of Object.entries(grouped)) {
      try {
        await this.executeBatchGroup(ops);
      } catch (error) {
        console.error(`Batch group execution failed for ${key}:`, error);
        throw error;
      }
    }
  }

  private groupOperations(operations: BatchOperation[]): Record<string, BatchOperation[]> {
    return operations.reduce((groups, op) => {
      const key = `${op.table}_${op.type}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(op);
      return groups;
    }, {} as Record<string, BatchOperation[]>);
  }

  private async executeBatchGroup(operations: BatchOperation[]): Promise<void> {
    if (operations.length === 0) return;

    const { table, type } = operations[0];

    try {
      switch (type) {
        case 'INSERT':
          await supabase.from(table).insert(operations.map(op => op.data));
          break;
        case 'UPDATE':
          // Execute updates sequentially for now - could be optimized further
          for (const op of operations) {
            await supabase.from(table).update(op.data).eq('id', op.data.id);
          }
          break;
        case 'DELETE':
          const ids = operations.map(op => op.data.id);
          await supabase.from(table).delete().in('id', ids);
          break;
        default:
          throw new Error(`Unsupported batch operation type: ${type}`);
      }
    } catch (error) {
      console.error(`Batch execution failed for ${table} ${type}:`, error);
      throw error;
    }
  }

  private async executeWithRetry<T>(fn: () => Promise<T>, maxRetries: number): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }

    throw lastError!;
  }

  private async fetchFromDatabase(key: string): Promise<any> {
    // This would be replaced with actual database fetching logic
    // For now, return null to indicate no data
    return null;
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private recordResponseTime(time: number): void {
    this.responseTimeBuffer.push(time);
    if (this.responseTimeBuffer.length > 100) {
      this.responseTimeBuffer.shift();
    }
  }

  private updateMetrics(): void {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastMetricsUpdate;

    // Cache hit rate
    const totalCacheRequests = this.cacheStats.hits + this.cacheStats.misses;
    this.metrics.cacheHitRate = totalCacheRequests > 0
      ? this.cacheStats.hits / totalCacheRequests
      : 0;

    // Average response time
    this.metrics.averageResponseTime = this.responseTimeBuffer.length > 0
      ? this.responseTimeBuffer.reduce((a, b) => a + b, 0) / this.responseTimeBuffer.length
      : 0;

    // Operations per second
    this.metrics.operationsPerSecond = timeSinceLastUpdate > 0
      ? (this.operationCounter * 1000) / timeSinceLastUpdate
      : 0;

    // Error rate
    const totalOperations = this.operationCounter + this.errorCounter;
    this.metrics.errorRate = totalOperations > 0
      ? this.errorCounter / totalOperations
      : 0;

    // Queue size
    this.metrics.queueSize = this.batchQueue.length;

    // Memory usage (simplified)
    this.metrics.memoryUsage = this.cache.size / this.config.cacheMaxSize;

    // Batch processing rate
    this.metrics.batchProcessingRate = this.processingBatch ? 0.8 : 1.0;

    this.lastMetricsUpdate = now;

    // Reset counters periodically
    if (timeSinceLastUpdate > 60000) { // Reset every minute
      this.operationCounter = 0;
      this.errorCounter = 0;
    }
  }

  private performMemoryCleanup(): void {
    // Remove expired cache entries
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        this.cacheStats.evictions++;
      }
    }

    // Clear old response times
    if (this.responseTimeBuffer.length > 50) {
      this.responseTimeBuffer = this.responseTimeBuffer.slice(-50);
    }

    console.log('Memory cleanup completed');
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    if (this.adaptationInterval) {
      clearInterval(this.adaptationInterval);
    }

    this.cache.clear();
    this.batchQueue = [];
    this.responseTimeBuffer = [];
  }
}

// Export singleton instance
export const performanceOptimizationService = PerformanceOptimizationService.getInstance();