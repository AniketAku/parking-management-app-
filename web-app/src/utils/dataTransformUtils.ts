/**
 * High-Performance Data Transformation Utilities
 * Optimized for minimal overhead with intelligent caching
 */

import { performanceMonitor } from './optimizedPerformanceMonitor'

// Transformation cache with LRU eviction
const transformCache = new Map<string, any>()
const CACHE_SIZE_LIMIT = 1000
let cacheAccessOrder: string[] = []

// Pre-compiled regex patterns for performance
const SNAKE_CASE_REGEX = /(_\w)/g
const CAMEL_CASE_REGEX = /[A-Z]/g

// Common field mappings for parking data (pre-computed)
const PARKING_FIELD_MAP = {
  // Database fields (snake_case) → Frontend fields (camelCase)
  'vehicle_number': 'vehicleNumber',
  'vehicle_type': 'vehicleType',
  'driver_name': 'driverName',
  'transport_name': 'transportName',
  'entry_time': 'entryTime',
  'exit_time': 'exitTime',
  'payment_status': 'paymentStatus',
  'payment_type': 'paymentType',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
  'actual_fee': 'actualFee',
  'calculated_fee': 'calculatedFee',
  'parking_fee': 'parkingFee',
  'amount_paid': 'amountPaid',
  'location_id': 'locationId'
} as const

const REVERSE_PARKING_FIELD_MAP = Object.fromEntries(
  Object.entries(PARKING_FIELD_MAP).map(([k, v]) => [v, k])
) as Record<string, string>

/**
 * Cache management functions
 */
function manageCacheSize(): void {
  if (transformCache.size > CACHE_SIZE_LIMIT) {
    // Remove oldest 20% of entries
    const removeCount = Math.floor(CACHE_SIZE_LIMIT * 0.2)
    for (let i = 0; i < removeCount; i++) {
      const oldKey = cacheAccessOrder.shift()
      if (oldKey) {
        transformCache.delete(oldKey)
      }
    }
  }
}

function updateCacheAccess(key: string): void {
  // Move to end (most recently used)
  const index = cacheAccessOrder.indexOf(key)
  if (index > -1) {
    cacheAccessOrder.splice(index, 1)
  }
  cacheAccessOrder.push(key)
}

/**
 * High-performance snake_case to camelCase conversion
 */
function fastSnakeToCamel(str: string): string {
  if (str.length < 2 || !str.includes('_')) {
    return str
  }
  
  // Use pre-compiled regex for performance
  return str.replace(SNAKE_CASE_REGEX, (match) => 
    match.charAt(1).toUpperCase()
  )
}

/**
 * High-performance camelCase to snake_case conversion
 */
function fastCamelToSnake(str: string): string {
  if (str.length < 2) {
    return str
  }
  
  // Use pre-compiled regex for performance
  return str.replace(CAMEL_CASE_REGEX, (match) => 
    '_' + match.toLowerCase()
  )
}

/**
 * Transform object keys using pre-computed field mapping
 */
export function transformParkingDataFromDB<T extends Record<string, any>>(
  data: T | T[]
): any {
  if (!data) return data
  
  const isArray = Array.isArray(data)
  const items = isArray ? data : [data]
  
  if (items.length === 0) return data
  
  // Generate cache key based on data structure
  const sampleKeys = Object.keys(items[0]).sort().join(',')
  const cacheKey = `db_to_frontend_${sampleKeys}`
  
  // Check cache first
  if (transformCache.has(cacheKey)) {
    updateCacheAccess(cacheKey)
    const cachedTransform = transformCache.get(cacheKey)
    return isArray ? items.map(cachedTransform) : cachedTransform(items[0])
  }
  
  // Create optimized transformer function
  const transformer = createOptimizedTransformer(items[0], PARKING_FIELD_MAP, true)
  
  // Cache the transformer function
  transformCache.set(cacheKey, transformer)
  updateCacheAccess(cacheKey)
  manageCacheSize()
  
  // Transform data
  const result = isArray ? items.map(transformer) : transformer(items[0])
  
  // Track performance in development
  if (import.meta.env.DEV) {
    performanceMonitor.trackCustomMetric('data_transform_db_to_frontend', Date.now())
  }
  
  return result
}

/**
 * Transform object keys for database operations
 */
export function transformParkingDataToDB<T extends Record<string, any>>(
  data: T | T[]
): any {
  if (!data) return data
  
  const isArray = Array.isArray(data)
  const items = isArray ? data : [data]
  
  if (items.length === 0) return data
  
  // Generate cache key
  const sampleKeys = Object.keys(items[0]).sort().join(',')
  const cacheKey = `frontend_to_db_${sampleKeys}`
  
  // Check cache first
  if (transformCache.has(cacheKey)) {
    updateCacheAccess(cacheKey)
    const cachedTransform = transformCache.get(cacheKey)
    return isArray ? items.map(cachedTransform) : cachedTransform(items[0])
  }
  
  // Create optimized transformer function
  const transformer = createOptimizedTransformer(items[0], REVERSE_PARKING_FIELD_MAP, false)
  
  // Cache the transformer function
  transformCache.set(cacheKey, transformer)
  updateCacheAccess(cacheKey)
  manageCacheSize()
  
  // Transform data
  const result = isArray ? items.map(transformer) : transformer(items[0])
  
  // Track performance in development
  if (import.meta.env.DEV) {
    performanceMonitor.trackCustomMetric('data_transform_frontend_to_db', Date.now())
  }
  
  return result
}

/**
 * Create optimized transformer function for specific object structure
 */
function createOptimizedTransformer(
  sampleObject: Record<string, any>,
  fieldMap: Record<string, string>,
  isFromDB: boolean
): (obj: Record<string, any>) => Record<string, any> {
  const keys = Object.keys(sampleObject)
  const transformPairs: Array<[string, string]> = []
  const copyPairs: string[] = []
  
  // Pre-compute transformation strategy
  for (const key of keys) {
    const mappedKey = fieldMap[key]
    if (mappedKey) {
      transformPairs.push([key, mappedKey])
    } else {
      // Check if key needs generic transformation
      const genericTransform = isFromDB 
        ? fastSnakeToCamel(key)
        : fastCamelToSnake(key)
      
      if (genericTransform !== key) {
        transformPairs.push([key, genericTransform])
      } else {
        copyPairs.push(key)
      }
    }
  }
  
  // Return optimized transformer function
  return (obj: Record<string, any>) => {
    const result: Record<string, any> = {}
    
    // Apply pre-computed transformations
    for (const [oldKey, newKey] of transformPairs) {
      if (obj[oldKey] !== undefined) {
        result[newKey] = obj[oldKey]
      }
    }
    
    // Copy non-transformed keys
    for (const key of copyPairs) {
      if (obj[key] !== undefined) {
        result[key] = obj[key]
      }
    }
    
    return result
  }
}

/**
 * Generic transformation function for non-parking data
 */
export function transformKeysSnakeToCamel<T extends Record<string, any>>(
  data: T | T[]
): any {
  if (!data) return data
  
  const isArray = Array.isArray(data)
  const items = isArray ? data : [data]
  
  if (items.length === 0) return data
  
  const transformer = (obj: Record<string, any>) => {
    const result: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[fastSnakeToCamel(key)] = value
      }
    }
    
    return result
  }
  
  return isArray ? items.map(transformer) : transformer(items[0])
}

/**
 * Generic transformation function for database operations
 */
export function transformKeysCamelToSnake<T extends Record<string, any>>(
  data: T | T[]
): any {
  if (!data) return data
  
  const isArray = Array.isArray(data)
  const items = isArray ? data : [data]
  
  if (items.length === 0) return data
  
  const transformer = (obj: Record<string, any>) => {
    const result: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[fastCamelToSnake(key)] = value
      }
    }
    
    return result
  }
  
  return isArray ? items.map(transformer) : transformer(items[0])
}

/**
 * Clear transformation cache (useful for memory management)
 */
export function clearTransformCache(): void {
  transformCache.clear()
  cacheAccessOrder = []
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats(): {
  size: number
  hitRate: number
  maxSize: number
} {
  return {
    size: transformCache.size,
    hitRate: transformCache.size > 0 ? cacheAccessOrder.length / transformCache.size : 0,
    maxSize: CACHE_SIZE_LIMIT
  }
}

export default {
  transformParkingDataFromDB,
  transformParkingDataToDB,
  transformKeysSnakeToCamel,
  transformKeysCamelToSnake,
  clearTransformCache,
  getCacheStats
}