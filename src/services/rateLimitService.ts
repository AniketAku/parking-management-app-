/**
 * Rate Limiting Service
 * Implements client-side rate limiting for authentication and sensitive operations
 */

interface RateLimitEntry {
  count: number
  firstAttempt: number
  lastAttempt: number
  blockedUntil?: number
}

interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
  blockDurationMs: number
  cleanupIntervalMs?: number
}

const DEFAULT_CONFIGS = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 15 * 60 * 1000, // 15 minutes block
  },
  passwordReset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour block
  },
  apiCall: {
    maxAttempts: 100,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 60 * 1000, // 1 minute block
  }
}

class RateLimitService {
  private storage: Map<string, RateLimitEntry> = new Map()
  private cleanupTimer?: NodeJS.Timeout

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupTimer = setInterval(() => this.cleanup(), 5 * 60 * 1000)
    
    // Load from localStorage if available
    this.loadFromStorage()
  }

  /**
   * Check if an operation is rate limited
   */
  isRateLimited(
    identifier: string, 
    operation: keyof typeof DEFAULT_CONFIGS
  ): { allowed: boolean; retryAfter?: number; attemptsLeft?: number } {
    const config = DEFAULT_CONFIGS[operation]
    const key = `${operation}:${identifier}`
    const now = Date.now()
    
    let entry = this.storage.get(key)
    
    // Check if currently blocked
    if (entry?.blockedUntil && entry.blockedUntil > now) {
      return {
        allowed: false,
        retryAfter: Math.ceil((entry.blockedUntil - now) / 1000)
      }
    }
    
    // Initialize or reset entry if window expired
    if (!entry || (now - entry.firstAttempt) > config.windowMs) {
      entry = {
        count: 0,
        firstAttempt: now,
        lastAttempt: now
      }
    }
    
    entry.count++
    entry.lastAttempt = now
    
    // Check if limit exceeded
    if (entry.count > config.maxAttempts) {
      entry.blockedUntil = now + config.blockDurationMs
      this.storage.set(key, entry)
      this.saveToStorage()
      
      return {
        allowed: false,
        retryAfter: Math.ceil(config.blockDurationMs / 1000)
      }
    }
    
    // Update storage
    this.storage.set(key, entry)
    this.saveToStorage()
    
    return {
      allowed: true,
      attemptsLeft: config.maxAttempts - entry.count
    }
  }

  /**
   * Record a successful operation (resets rate limit)
   */
  recordSuccess(identifier: string, operation: keyof typeof DEFAULT_CONFIGS): void {
    const key = `${operation}:${identifier}`
    this.storage.delete(key)
    this.saveToStorage()
  }

  /**
   * Get rate limit status without incrementing count
   */
  getStatus(
    identifier: string, 
    operation: keyof typeof DEFAULT_CONFIGS
  ): { blocked: boolean; retryAfter?: number; attemptsLeft?: number } {
    const config = DEFAULT_CONFIGS[operation]
    const key = `${operation}:${identifier}`
    const now = Date.now()
    
    const entry = this.storage.get(key)
    
    if (!entry) {
      return { blocked: false, attemptsLeft: config.maxAttempts }
    }
    
    // Check if currently blocked
    if (entry.blockedUntil && entry.blockedUntil > now) {
      return {
        blocked: true,
        retryAfter: Math.ceil((entry.blockedUntil - now) / 1000)
      }
    }
    
    // Check if window expired
    if ((now - entry.firstAttempt) > config.windowMs) {
      return { blocked: false, attemptsLeft: config.maxAttempts }
    }
    
    return {
      blocked: false,
      attemptsLeft: Math.max(0, config.maxAttempts - entry.count)
    }
  }

  /**
   * Clear rate limit for a specific identifier and operation
   */
  clearRateLimit(identifier: string, operation: keyof typeof DEFAULT_CONFIGS): void {
    const key = `${operation}:${identifier}`
    this.storage.delete(key)
    this.saveToStorage()
  }

  /**
   * Clear all rate limits (admin function)
   */
  clearAllRateLimits(): void {
    this.storage.clear()
    this.saveToStorage()
  }

  /**
   * Get all current rate limits (for debugging/admin)
   */
  getAllRateLimits(): Array<{ key: string; entry: RateLimitEntry }> {
    return Array.from(this.storage.entries()).map(([key, entry]) => ({ key, entry }))
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    const toDelete: string[] = []
    
    for (const [key, entry] of this.storage.entries()) {
      // Extract operation from key
      const operation = key.split(':')[0] as keyof typeof DEFAULT_CONFIGS
      const config = DEFAULT_CONFIGS[operation]
      
      if (!config) continue
      
      // Remove if window and block period both expired
      const windowExpired = (now - entry.firstAttempt) > config.windowMs
      const blockExpired = !entry.blockedUntil || entry.blockedUntil < now
      
      if (windowExpired && blockExpired) {
        toDelete.push(key)
      }
    }
    
    toDelete.forEach(key => this.storage.delete(key))
    
    if (toDelete.length > 0) {
      this.saveToStorage()
    }
  }

  /**
   * Save rate limits to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.storage)
      localStorage.setItem('rateLimits', JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to save rate limits to localStorage:', error)
    }
  }

  /**
   * Load rate limits from localStorage
   */
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem('rateLimits')
      if (data) {
        const parsed = JSON.parse(data)
        this.storage = new Map(Object.entries(parsed))
      }
    } catch (error) {
      console.warn('Failed to load rate limits from localStorage:', error)
      this.storage.clear()
    }
  }

  /**
   * Cleanup when service is destroyed
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
  }
}

// Export singleton instance
export const rateLimitService = new RateLimitService()

/**
 * Rate limit decorator for authentication functions
 */
export function withRateLimit<T extends any[], R>(
  operation: keyof typeof DEFAULT_CONFIGS,
  getIdentifier: (...args: T) => string
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<(...args: T) => Promise<R>>
  ) {
    const method = descriptor.value!
    
    descriptor.value = async function (...args: T): Promise<R> {
      const identifier = getIdentifier(...args)
      const rateCheck = rateLimitService.isRateLimited(identifier, operation)
      
      if (!rateCheck.allowed) {
        const message = `Too many ${operation} attempts. Please try again in ${rateCheck.retryAfter} seconds.`
        throw new Error(message)
      }
      
      try {
        const result = await method.apply(this, args)
        // Record success to reset rate limit
        rateLimitService.recordSuccess(identifier, operation)
        return result
      } catch (error) {
        // Error is recorded by the rate limiter automatically
        throw error
      }
    }
  }
}

/**
 * Hook for React components to check rate limit status
 */
export function useRateLimit(identifier: string, operation: keyof typeof DEFAULT_CONFIGS) {
  const status = rateLimitService.getStatus(identifier, operation)
  
  return {
    ...status,
    clearRateLimit: () => rateLimitService.clearRateLimit(identifier, operation)
  }
}

export default rateLimitService