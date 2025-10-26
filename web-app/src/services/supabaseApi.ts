import { supabase } from '../lib/supabase'
import { log } from '../utils/secureLogger'
import type {
  ParkingEntry,
  ParkingStatistics,
  SearchFilters,
  ReportData
} from '../types'

export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
  errors?: string[]
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

class SupabaseApiService {
  // Parking Entries
  async getParkingEntries(
    filters?: SearchFilters,
    page = 1,
    limit = 50
  ): Promise<PaginatedResponse<ParkingEntry>> {
    let query = supabase
      .from('parking_entries')
      .select('*', { count: 'exact' })
      .order('entry_time', { ascending: false })

    // Apply filters
    if (filters?.vehicleNumber) {
      query = query.ilike('vehicle_number', `%${filters.vehicleNumber}%`)
    }
    if (filters?.transportName) {
      query = query.ilike('transport_name', `%${filters.transportName}%`)
    }
    if (filters?.driverName) {
      query = query.ilike('driver_name', `%${filters.driverName}%`)
    }
    if (filters?.vehicleType) {
      query = query.eq('vehicle_type', filters.vehicleType)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    // ✅ FIX: For date filtering, use OR logic to include multi-day sessions
    // Include entries where EITHER entry_time OR exit_time falls within the date range
    if (filters?.dateFrom && filters?.dateTo) {
      const dateFromISO = filters.dateFrom instanceof Date ? filters.dateFrom.toISOString() : filters.dateFrom
      const dateToISO = filters.dateTo instanceof Date ? filters.dateTo.toISOString() : filters.dateTo

      // Use Supabase .or() to create: (entry_time in range) OR (exit_time in range)
      query = query.or(`and(entry_time.gte.${dateFromISO},entry_time.lte.${dateToISO}),and(exit_time.gte.${dateFromISO},exit_time.lte.${dateToISO})`)
    } else if (filters?.dateFrom) {
      query = query.gte('entry_time', filters.dateFrom instanceof Date ? filters.dateFrom.toISOString() : filters.dateFrom)
    } else if (filters?.dateTo) {
      query = query.lte('entry_time', filters.dateTo instanceof Date ? filters.dateTo.toISOString() : filters.dateTo)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    log.debug('SUPABASE API - Query results', {
      filters: filters,
      rawDataCount: data?.length || 0,
      error: error?.message,
      firstEntry: data?.[0] ? {
        id: data[0].id,
        vehicle_number: data[0].vehicle_number,
        entry_time: data[0].entry_time,
        exit_time: data[0].exit_time,
        actual_fee: data[0].actual_fee
      } : null
    })

    if (error) {
      throw new Error(`Failed to fetch parking entries: ${error.message}`)
    }

    return {
      data: (data || []).map(entry => this.transformDatabaseToFrontend(entry)),
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }
  }

  async createParkingEntry(entry: Omit<ParkingEntry, 'id' | 'serial'>): Promise<ParkingEntry> {
    const { data, error } = await supabase
      .from('parking_entries')
      .insert({
        transport_name: entry.transportName,
        vehicle_type: entry.vehicleType,
        vehicle_number: entry.vehicleNumber,
        driver_name: entry.driverName,
        driver_phone: entry.driverPhone,
        notes: entry.notes || 'N/A',
        entry_time: entry.entryTime,
        status: this.mapStatusToDatabase(entry.status),
        payment_status: this.mapPaymentStatusToDatabase(entry.paymentStatus),
        payment_type: entry.paymentType,
        calculated_fee: entry.parkingFee || 0,
        actual_fee: entry.parkingFee || 0,
        created_by: entry.createdBy || 'Web App',
        location_id: 1 // Default location
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create parking entry: ${error.message}`)
    }

    // Transform to frontend format
    return this.transformDatabaseToFrontend(data)
  }

  async updateParkingEntry(
    id: string,
    updates: Partial<ParkingEntry>
  ): Promise<ParkingEntry> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (updates.transportName) updateData.transport_name = updates.transportName
    if (updates.vehicleType) updateData.vehicle_type = updates.vehicleType
    if (updates.vehicleNumber) updateData.vehicle_number = updates.vehicleNumber
    if (updates.driverName) updateData.driver_name = updates.driverName
    if (updates.driverPhone) updateData.driver_phone = updates.driverPhone
    if (updates.notes) updateData.notes = updates.notes
    if (updates.exitTime) updateData.exit_time = updates.exitTime
    if (updates.status) updateData.status = this.mapStatusToDatabase(updates.status)
    if (updates.parkingFee !== undefined) {
      updateData.calculated_fee = updates.parkingFee
      updateData.actual_fee = updates.parkingFee
    }
    if (updates.paymentStatus) updateData.payment_status = this.mapPaymentStatusToDatabase(updates.paymentStatus)
    if (updates.paymentType) updateData.payment_type = updates.paymentType

    const { data, error } = await supabase
      .from('parking_entries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update parking entry: ${error.message}`)
    }

    // Transform to frontend format
    return this.transformDatabaseToFrontend(data)
  }

  async deleteParkingEntry(id: string): Promise<void> {
    const { error } = await supabase
      .from('parking_entries')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete parking entry: ${error.message}`)
    }
  }

  // Statistics
  async getStatistics(): Promise<ParkingStatistics> {
    const { data, error } = await supabase
      .from('parking_entries')
      .select('*')

    if (error) {
      throw new Error(`Failed to fetch statistics: ${error.message}`)
    }

    const entries = data || []
    const parkedVehicles = entries.filter(e => e.status === 'Parked')
    const exitedVehicles = entries.filter(e => e.status === 'Exited')
    const totalRevenue = exitedVehicles.reduce((sum, e) => sum + (e.actual_fee || e.calculated_fee || 0), 0)

    // Today's statistics
    const today = new Date().toISOString().split('T')[0]
    const todayEntries = entries.filter(e => e.entry_time?.startsWith(today))
    const todayExits = exitedVehicles.filter(e => e.exit_time?.startsWith(today))
    const todayRevenue = todayExits.reduce((sum, e) => sum + (e.actual_fee || e.calculated_fee || 0), 0)

    return {
      totalEntries: entries.length,
      parkedVehicles: parkedVehicles.length,
      exitedVehicles: exitedVehicles.length,
      totalRevenue,
      todayEntries: todayEntries.length,
      todayExits: todayExits.length,
      todayRevenue,
      averageStayDuration: this.calculateAverageStayDuration(exitedVehicles),
      occupancyRate: this.calculateOccupancyRate(parkedVehicles.length),
      revenueByVehicleType: this.calculateRevenueByVehicleType(exitedVehicles),
      totalIncome: totalRevenue,
      todayIncome: todayRevenue,
      unpaidVehicles: entries.filter(e => e.payment_status === 'Unpaid').length,
      overstayingVehicles: 0 // TODO: Implement overstay logic
    }
  }

  // Reports
  async getReportData(
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<ReportData> {
    const { data, error } = await supabase
      .from('parking_entries')
      .select('*')
      .gte('entry_time', startDate)
      .lte('entry_time', endDate)
      .order('entry_time', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch report data: ${error.message}`)
    }

    return this.processReportData(data || [], groupBy)
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('parking_entries')
        .select('id')
        .limit(1)

      return !error
    } catch {
      return false
    }
  }

  // Private helper methods
  private calculateAverageStayDuration(exitedVehicles: any[]): number {
    if (exitedVehicles.length === 0) return 0

    const totalDuration = exitedVehicles.reduce((sum, entry) => {
      if (entry.entry_time && entry.exit_time) {
        const entryTime = new Date(entry.entry_time)
        const exitTime = new Date(entry.exit_time)
        return sum + (exitTime.getTime() - entryTime.getTime())
      }
      return sum
    }, 0)

    return totalDuration / exitedVehicles.length / (1000 * 60 * 60) // Convert to hours
  }

  private calculateOccupancyRate(currentlyParked: number): number {
    const maxCapacity = 100 // This should come from config
    return (currentlyParked / maxCapacity) * 100
  }

  private calculateRevenueByVehicleType(exitedVehicles: any[]): Record<string, number> {
    return exitedVehicles.reduce((acc, entry) => {
      const vehicleType = entry.vehicle_type || 'Unknown'
      acc[vehicleType] = (acc[vehicleType] || 0) + (entry.actual_fee || entry.calculated_fee || 0)
      return acc
    }, {} as Record<string, number>)
  }

  private processReportData(entries: any[], groupBy: 'day' | 'week' | 'month'): ReportData {
    // Process data based on groupBy parameter
    const groupedData = entries.reduce((acc, entry) => {
      const date = new Date(entry.entry_time)
      let key: string

      switch (groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0]
          break
        case 'week':
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = weekStart.toISOString().split('T')[0]
          break
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        default:
          key = date.toISOString().split('T')[0]
      }

      if (!acc[key]) {
        acc[key] = {
          date: key,
          entries: 0,
          exits: 0,
          revenue: 0,
          vehicleTypes: {}
        }
      }

      acc[key].entries++
      if (entry.status === 'Exited') {
        acc[key].exits++
        acc[key].revenue += entry.actual_fee || entry.calculated_fee || 0
      }

      const vehicleType = entry.vehicle_type || 'Unknown'
      acc[key].vehicleTypes[vehicleType] = (acc[key].vehicleTypes[vehicleType] || 0) + 1

      return acc
    }, {} as any)

    return {
      timeline: Object.values(groupedData),
      summary: {
        totalEntries: entries.length,
        totalExits: entries.filter(e => e.status === 'Exited').length,
        totalRevenue: entries.reduce((sum, e) => sum + (e.actual_fee || e.calculated_fee || 0), 0),
        averageStayDuration: this.calculateAverageStayDuration(entries.filter(e => e.status === 'Exited'))
      }
    }
  }

  // Transformation helper methods
  private transformDatabaseToFrontend(data: any): ParkingEntry {
    log.debug('SUPABASE API - Transforming data from DB', {
      id: data.id,
      vehicleNumber: data.vehicle_number,
      actual_fee: data.actual_fee,
      calculated_fee: data.calculated_fee,
      parking_fee: data.parking_fee
    })

    return {
      id: data.id,
      serial: data.serial,
      transportName: data.transport_name,
      vehicleType: data.vehicle_type,
      vehicleNumber: data.vehicle_number,
      driverName: data.driver_name,
      driverPhone: data.driver_phone,
      notes: data.notes,
      entryTime: data.entry_time,
      exitTime: data.exit_time,
      status: this.mapStatusFromDatabase(data.status),
      parkingFee: data.parking_fee || data.actual_fee || data.calculated_fee || 0,
      actualFee: data.actual_fee,
      calculatedFee: data.calculated_fee,
      paymentStatus: this.mapPaymentStatusFromDatabase(data.payment_status),
      paymentType: data.payment_type,
      createdBy: data.created_by,
      lastModified: data.updated_at,
      createdAt: data.created_at || data.entry_time,
      updatedAt: data.updated_at || data.entry_time
    }
  }

  private mapStatusToDatabase(status: string): string {
    switch (status) {
      case 'Active':
        return 'Parked'
      case 'Exited':
        return 'Exited'
      case 'Overstay':
        return 'Parked' // Map overstay to parked in database
      default:
        return 'Parked'
    }
  }

  private mapStatusFromDatabase(status: string): 'Active' | 'Exited' | 'Overstay' {
    switch (status) {
      case 'Parked':
        return 'Active'
      case 'Exited':
        return 'Exited'
      default:
        return 'Active'
    }
  }

  private mapPaymentStatusToDatabase(paymentStatus: string): string {
    switch (paymentStatus) {
      case 'Paid':
        return 'Paid'
      case 'Pending':
      case 'Partial':
      case 'Failed':
        return 'Pending' // Map all unpaid states to Pending in database
      default:
        return 'Pending'
    }
  }

  private mapPaymentStatusFromDatabase(paymentStatus: string): 'Paid' | 'Pending' | 'Partial' | 'Failed' {
    switch (paymentStatus) {
      case 'Paid':
        return 'Paid'
      case 'Unpaid':
      case 'Pending':
        return 'Pending'
      default:
        return 'Pending'
    }
  }
}

export const api = new SupabaseApiService()
export default api