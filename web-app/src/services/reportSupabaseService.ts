// Enhanced Supabase Service for Report Data Fetching with Performance Optimization

import { supabase } from '../lib/supabase'
import { format, startOfDay, endOfDay } from 'date-fns'
import { log } from '../utils/secureLogger'
import type {
  ParkingEntry,
  DateBoundary,
  DataInclusionCriteria
} from '../types/reports'

interface ReportQueryOptions {
  dateRange: DateBoundary
  criteria: DataInclusionCriteria
  useIndexHints?: boolean
  batchSize?: number
  orderBy?: 'entry_time' | 'exit_time' | 'created_at'
  orderDirection?: 'asc' | 'desc'
}

interface QueryPerformanceMetrics {
  queryTime: number
  recordsReturned: number
  cacheHit: boolean
  indexUsed: boolean
}

class ReportSupabaseService {
  private queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private readonly CACHE_TTL = {
    current: 5 * 60 * 1000,      // 5 minutes for current day data
    historical: 24 * 60 * 60 * 1000, // 24 hours for historical data
    completed: 7 * 24 * 60 * 60 * 1000 // 7 days for completed periods
  }

  /**
   * === OPTIMIZED PARKING ENTRIES FETCHING ===
   */
  async fetchParkingEntriesForReport(options: ReportQueryOptions): Promise<{
    entries: ParkingEntry[]
    metrics: QueryPerformanceMetrics
  }> {
    const startTime = Date.now()
    const cacheKey = this.generateCacheKey(options)

    // Check cache first
    const cachedResult = this.getCachedData(cacheKey)
    if (cachedResult) {
      return {
        entries: cachedResult,
        metrics: {
          queryTime: Date.now() - startTime,
          recordsReturned: cachedResult.length,
          cacheHit: true,
          indexUsed: false
        }
      }
    }

    try {
      // Build optimized query with proper indexing
      let query = supabase
        .from('parking_entries')
        .select(`
          id,
          serial,
          transport_name,
          vehicle_type,
          vehicle_number,
          driver_name,
          driver_phone,
          notes,
          entry_time,
          exit_time,
          status,
          parking_fee,
          payment_status,
          payment_type,
          created_by,
          updated_at
        `)

      // Apply date range filtering with proper indexing
      query = query
        .gte('entry_time', options.dateRange.startDate.toISOString())
        .lte('entry_time', options.dateRange.endDate.toISOString())

      // Apply data inclusion criteria
      if (!options.criteria.includeActiveSessions) {
        query = query.neq('status', 'Active')
      }
      if (!options.criteria.includeCompletedSessions) {
        query = query.neq('status', 'Exited')
      }
      if (!options.criteria.includePendingPayments) {
        query = query.neq('payment_status', 'Pending')
      }
      if (!options.criteria.includePartialPayments) {
        query = query.neq('payment_status', 'Partial')
      }

      // Apply ordering for better performance
      const orderBy = options.orderBy || 'entry_time'
      const orderDirection = options.orderDirection || 'asc'
      query = query.order(orderBy, { ascending: orderDirection === 'asc' })

      // Add index hints if requested (for PostgreSQL optimization)
      if (options.useIndexHints) {
        // Note: Supabase doesn't directly support index hints, but we can structure
        // the query to encourage the use of specific indexes
        query = query.limit(options.batchSize || 10000)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch parking entries: ${error.message}`)
      }

      // Transform database format to application format
      const transformedEntries = (data || []).map(this.transformDatabaseToEntry)

      // Cache the result
      this.setCachedData(cacheKey, transformedEntries, options.dateRange)

      const queryTime = Date.now() - startTime

      return {
        entries: transformedEntries,
        metrics: {
          queryTime,
          recordsReturned: transformedEntries.length,
          cacheHit: false,
          indexUsed: true // Assume index was used for date range queries
        }
      }

    } catch (error) {
      log.error('Error fetching parking entries for report', error)
      throw error
    }
  }

  /**
   * === OPTIMIZED AGGREGATION QUERIES ===
   */
  async fetchReportAggregations(options: ReportQueryOptions): Promise<{
    totalSessions: number
    totalRevenue: number
    activeSessions: number
    completedSessions: number
    byVehicleType: Record<string, number>
    byPaymentMethod: Record<string, number>
    metrics: QueryPerformanceMetrics
  }> {
    const startTime = Date.now()
    const cacheKey = `agg_${this.generateCacheKey(options)}`

    // Check cache first
    const cachedResult = this.getCachedData(cacheKey)
    if (cachedResult) {
      return {
        ...cachedResult,
        metrics: {
          queryTime: Date.now() - startTime,
          recordsReturned: 1,
          cacheHit: true,
          indexUsed: false
        }
      }
    }

    try {
      // Use Supabase's aggregation functions for better performance
      const [
        totalSessionsResult,
        revenueResult,
        statusResult,
        vehicleTypeResult,
        paymentMethodResult
      ] = await Promise.all([
        // Total sessions count
        supabase
          .from('parking_entries')
          .select('id', { count: 'exact', head: true })
          .gte('entry_time', options.dateRange.startDate.toISOString())
          .lte('entry_time', options.dateRange.endDate.toISOString()),

        // Total revenue
        supabase
          .from('parking_entries')
          .select('parking_fee')
          .gte('entry_time', options.dateRange.startDate.toISOString())
          .lte('entry_time', options.dateRange.endDate.toISOString())
          .eq('status', 'Exited')
          .not('parking_fee', 'is', null),

        // Status breakdown
        supabase
          .from('parking_entries')
          .select('status', { count: 'exact' })
          .gte('entry_time', options.dateRange.startDate.toISOString())
          .lte('entry_time', options.dateRange.endDate.toISOString()),

        // Vehicle type breakdown
        supabase
          .from('parking_entries')
          .select('vehicle_type', { count: 'exact' })
          .gte('entry_time', options.dateRange.startDate.toISOString())
          .lte('entry_time', options.dateRange.endDate.toISOString()),

        // Payment method breakdown (for completed sessions)
        supabase
          .from('parking_entries')
          .select('payment_type', { count: 'exact' })
          .gte('entry_time', options.dateRange.startDate.toISOString())
          .lte('entry_time', options.dateRange.endDate.toISOString())
          .eq('status', 'Exited')
          .not('payment_type', 'is', null)
      ])

      // Process results
      const totalSessions = totalSessionsResult.count || 0
      const totalRevenue = revenueResult.data?.reduce((sum, entry) => sum + (entry.parking_fee || 0), 0) || 0

      // Count active and completed sessions
      const statusCounts = this.processGroupedResults(statusResult.data || [])
      const activeSessions = statusCounts['Active'] || 0
      const completedSessions = statusCounts['Exited'] || 0

      // Process vehicle type breakdown
      const byVehicleType = this.processGroupedResults(vehicleTypeResult.data || [])

      // Process payment method breakdown
      const byPaymentMethod = this.processGroupedResults(paymentMethodResult.data || [])

      const result = {
        totalSessions,
        totalRevenue,
        activeSessions,
        completedSessions,
        byVehicleType,
        byPaymentMethod
      }

      // Cache the result
      this.setCachedData(cacheKey, result, options.dateRange)

      return {
        ...result,
        metrics: {
          queryTime: Date.now() - startTime,
          recordsReturned: 1,
          cacheHit: false,
          indexUsed: true
        }
      }

    } catch (error) {
      log.error('Error fetching report aggregations', error)
      throw error
    }
  }

  /**
   * === HOURLY BREAKDOWN OPTIMIZATION ===
   */
  async fetchHourlyBreakdown(options: ReportQueryOptions): Promise<{
    hourlyData: Array<{
      hour: number
      entries: number
      exits: number
      revenue: number
      occupancy: number
    }>
    metrics: QueryPerformanceMetrics
  }> {
    const startTime = Date.now()
    const cacheKey = `hourly_${this.generateCacheKey(options)}`

    const cachedResult = this.getCachedData(cacheKey)
    if (cachedResult) {
      return {
        hourlyData: cachedResult,
        metrics: {
          queryTime: Date.now() - startTime,
          recordsReturned: cachedResult.length,
          cacheHit: true,
          indexUsed: false
        }
      }
    }

    try {
      // Use PostgreSQL's date_part function for efficient hour extraction
      const { data, error } = await supabase.rpc('get_hourly_breakdown', {
        start_date: options.dateRange.startDate.toISOString(),
        end_date: options.dateRange.endDate.toISOString()
      })

      if (error) {
        // Fallback to client-side processing if RPC function doesn't exist
        return this.fallbackHourlyBreakdown(options)
      }

      const hourlyData = data || []
      this.setCachedData(cacheKey, hourlyData, options.dateRange)

      return {
        hourlyData,
        metrics: {
          queryTime: Date.now() - startTime,
          recordsReturned: hourlyData.length,
          cacheHit: false,
          indexUsed: true
        }
      }

    } catch (error) {
      log.error('Error fetching hourly breakdown', error)
      // Fallback to client-side processing
      return this.fallbackHourlyBreakdown(options)
    }
  }

  /**
   * === BATCH PROCESSING FOR LARGE DATASETS ===
   */
  async fetchParkingEntriesBatch(
    options: ReportQueryOptions,
    onProgress?: (progress: number) => void
  ): Promise<ParkingEntry[]> {
    const batchSize = options.batchSize || 1000
    let allEntries: ParkingEntry[] = []
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const batchQuery = supabase
        .from('parking_entries')
        .select('*')
        .gte('entry_time', options.dateRange.startDate.toISOString())
        .lte('entry_time', options.dateRange.endDate.toISOString())
        .order('entry_time', { ascending: true })
        .range(offset, offset + batchSize - 1)

      const { data, error } = await batchQuery

      if (error) {
        throw new Error(`Batch fetch failed: ${error.message}`)
      }

      if (!data || data.length === 0) {
        hasMore = false
        break
      }

      const transformedBatch = data.map(this.transformDatabaseToEntry)
      allEntries = allEntries.concat(transformedBatch)

      offset += batchSize
      hasMore = data.length === batchSize

      // Report progress
      if (onProgress) {
        const estimatedTotal = offset + (hasMore ? batchSize : 0)
        const progress = (allEntries.length / estimatedTotal) * 100
        onProgress(Math.min(progress, 100))
      }

      // Small delay to prevent overwhelming the database
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }

    return allEntries
  }

  /**
   * === CACHE MANAGEMENT ===
   */
  private generateCacheKey(options: ReportQueryOptions): string {
    const dateKey = `${options.dateRange.startDate.getTime()}_${options.dateRange.endDate.getTime()}`
    const criteriaKey = Object.values(options.criteria).join('_')
    const orderKey = `${options.orderBy || 'entry_time'}_${options.orderDirection || 'asc'}`
    return `${dateKey}_${criteriaKey}_${orderKey}`
  }

  private getCachedData(key: string): any | null {
    const cached = this.queryCache.get(key)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data
    }

    if (cached) {
      this.queryCache.delete(key)
    }

    return null
  }

  private setCachedData(key: string, data: any, dateRange: DateBoundary): void {
    const now = Date.now()
    const isCurrentDay = this.isCurrentDay(dateRange)
    const isCompletedPeriod = this.isCompletedPeriod(dateRange)

    let ttl: number
    if (isCurrentDay) {
      ttl = this.CACHE_TTL.current
    } else if (isCompletedPeriod) {
      ttl = this.CACHE_TTL.completed
    } else {
      ttl = this.CACHE_TTL.historical
    }

    this.queryCache.set(key, {
      data,
      timestamp: now,
      ttl
    })

    // Clean up old cache entries
    this.cleanupCache()
  }

  private isCurrentDay(dateRange: DateBoundary): boolean {
    const today = new Date()
    const rangeStart = format(dateRange.startDate, 'yyyy-MM-dd')
    const todayFormatted = format(today, 'yyyy-MM-dd')
    return rangeStart === todayFormatted
  }

  private isCompletedPeriod(dateRange: DateBoundary): boolean {
    const now = new Date()
    return dateRange.endDate < now
  }

  private cleanupCache(): void {
    const now = Date.now()
    for (const [key, entry] of this.queryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.queryCache.delete(key)
      }
    }
  }

  /**
   * === UTILITY METHODS ===
   */
  private transformDatabaseToEntry(dbEntry: any): ParkingEntry {
    return {
      id: dbEntry.id,
      serial: dbEntry.serial,
      transportName: dbEntry.transport_name,
      vehicleType: dbEntry.vehicle_type,
      vehicleNumber: dbEntry.vehicle_number,
      driverName: dbEntry.driver_name,
      driverPhone: dbEntry.driver_phone,
      notes: dbEntry.notes,
      entryTime: new Date(dbEntry.entry_time),
      exitTime: dbEntry.exit_time ? new Date(dbEntry.exit_time) : undefined,
      status: dbEntry.status,
      parkingFee: dbEntry.parking_fee,
      paymentStatus: dbEntry.payment_status,
      paymentType: dbEntry.payment_type,
      createdBy: dbEntry.created_by,
      lastModified: dbEntry.updated_at ? new Date(dbEntry.updated_at) : undefined,
      createdAt: new Date(dbEntry.created_at || dbEntry.entry_time),
      updatedAt: new Date(dbEntry.updated_at || dbEntry.entry_time)
    }
  }

  private processGroupedResults(groupedData: any[]): Record<string, number> {
    const result: Record<string, number> = {}

    groupedData.forEach(item => {
      // Handle different grouping formats from Supabase
      if (item.count !== undefined) {
        const key = item.status || item.vehicle_type || item.payment_type || 'Unknown'
        result[key] = item.count
      }
    })

    return result
  }

  private async fallbackHourlyBreakdown(options: ReportQueryOptions): Promise<{
    hourlyData: Array<{
      hour: number
      entries: number
      exits: number
      revenue: number
      occupancy: number
    }>
    metrics: QueryPerformanceMetrics
  }> {
    const startTime = Date.now()

    // Fetch all entries and process on client side
    const { entries } = await this.fetchParkingEntriesForReport(options)

    const hourlyMap = new Map<number, {
      entries: number
      exits: number
      revenue: number
      occupancy: number
    }>()

    // Initialize all hours
    for (let hour = 0; hour < 24; hour++) {
      hourlyMap.set(hour, { entries: 0, exits: 0, revenue: 0, occupancy: 0 })
    }

    // Process entries
    entries.forEach(entry => {
      const entryHour = entry.entryTime.getHours()
      const hourData = hourlyMap.get(entryHour)!

      hourData.entries++

      if (entry.status === 'Active') {
        hourData.occupancy++
      }

      if (entry.exitTime) {
        const exitHour = entry.exitTime.getHours()
        const exitHourData = hourlyMap.get(exitHour)!
        exitHourData.exits++
        exitHourData.revenue += entry.parkingFee || 0
      }
    })

    const hourlyData = Array.from(hourlyMap.entries()).map(([hour, data]) => ({
      hour,
      ...data
    }))

    return {
      hourlyData,
      metrics: {
        queryTime: Date.now() - startTime,
        recordsReturned: hourlyData.length,
        cacheHit: false,
        indexUsed: false
      }
    }
  }

  /**
   * === PERFORMANCE MONITORING ===
   */
  getCacheStatistics() {
    const totalEntries = this.queryCache.size
    const cacheSize = Array.from(this.queryCache.values())
      .reduce((total, entry) => total + JSON.stringify(entry.data).length, 0)

    return {
      totalEntries,
      cacheSize,
      cacheSizeFormatted: this.formatBytes(cacheSize)
    }
  }

  clearCache(): void {
    this.queryCache.clear()
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * === HEALTH CHECK ===
   */
  async healthCheck(): Promise<{
    isHealthy: boolean
    responseTime: number
    error?: string
  }> {
    const startTime = Date.now()

    try {
      const { data, error } = await supabase
        .from('parking_entries')
        .select('id')
        .limit(1)

      const responseTime = Date.now() - startTime

      if (error) {
        return {
          isHealthy: false,
          responseTime,
          error: error.message
        }
      }

      return {
        isHealthy: true,
        responseTime
      }

    } catch (error) {
      return {
        isHealthy: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export const reportSupabaseService = new ReportSupabaseService()
export default reportSupabaseService