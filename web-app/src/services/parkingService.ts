import { supabase } from '../lib/supabase'
import type { ParkingEntry, ParkingStatistics } from '../types'
import { getCurrentParkingTime } from '../utils/time-fix'
import { parseFromDatabase } from '../utils/timezone'
import { transformParkingDataFromDB, transformParkingDataToDB } from '../utils/dataTransformUtils'
import { ErrorHandler, DatabaseError, BusinessLogicError, ErrorCode } from '../utils/errorHandler'
import { unifiedFeeService } from './UnifiedFeeCalculationService'

export interface CreateParkingEntryRequest {
  transport_name: string
  vehicle_type: string
  vehicle_number: string
  driver_name?: string
  driver_phone?: string     // NEW: Added driver phone field
  notes?: string
  parking_fee: number       // UPDATED: Renamed from calculated_fee
  entry_time?: string
}

export interface UpdateParkingEntryRequest {
  transport_name?: string
  driver_name?: string
  driver_phone?: string     // NEW: Added driver phone field
  vehicle_type?: string
  exit_time?: string
  status?: 'Active' | 'Exited' | 'Overstay'  // UPDATED: New status values
  payment_status?: 'Paid' | 'Pending' | 'Partial' | 'Failed'  // UPDATED: New payment status values
  payment_type?: string
  parking_fee?: number      // UPDATED: Renamed from actual_fee (new schema)
  actual_fee?: number       // Database column (primary)
  calculated_fee?: number   // Database column (backup/migration)
  notes?: string
}

export class ParkingService {
  /**
   * Create a new parking entry
   */
  static async createEntry(data: CreateParkingEntryRequest): Promise<ParkingEntry> {
    try {
      const { data: entry, error } = await supabase
        .from('parking_entries')
        .insert({
          transport_name: data.transport_name,
          vehicle_type: data.vehicle_type,
          vehicle_number: data.vehicle_number.toUpperCase(),
          driver_name: data.driver_name || null,
          driver_phone: data.driver_phone || null,    // NEW: Add driver phone
          notes: data.notes || null,
          parking_fee: data.parking_fee,              // UPDATED: Use new field name
          entry_time: data.entry_time || getCurrentParkingTime(),
          status: 'Active',                           // UPDATED: Use new status value
          payment_status: 'Pending'                   // UPDATED: Use new payment status value
          // Note: serial is auto-generated, don't include it
        })
        .select()
        .single()

      if (error) {
        throw ErrorHandler.fromSupabaseError(error, {
          component: 'ParkingService',
          action: 'createEntry',
          metadata: { vehicleNumber: data.vehicle_number, transportName: data.transport_name }
        })
      }

      return transformParkingDataFromDB(entry)
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw ErrorHandler.standardizeError(error, {
        component: 'ParkingService',
        action: 'createEntry',
        metadata: { vehicleNumber: data.vehicle_number }
      })
    }
  }

  /**
   * Get all parking entries with optional filters
   */
  static async getEntries(filters?: {
    status?: 'Parked' | 'Exited'
    payment_status?: 'Paid' | 'Unpaid' | 'Pending'
    vehicle_number?: string
    transport_name?: string
    date_from?: string
    date_to?: string
  }): Promise<ParkingEntry[]> {
    try {
      let query = supabase
        .from('parking_entries')
        .select('*')
        .order('entry_time', { ascending: false })

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.payment_status) {
        query = query.eq('payment_status', filters.payment_status)
      }
      if (filters?.vehicle_number) {
        query = query.ilike('vehicle_number', `%${filters.vehicle_number}%`)
      }
      if (filters?.transport_name) {
        query = query.ilike('transport_name', `%${filters.transport_name}%`)
      }
      if (filters?.date_from) {
        query = query.gte('entry_time', filters.date_from)
      }
      if (filters?.date_to) {
        query = query.lte('entry_time', filters.date_to)
      }

      const { data: entries, error } = await query

      if (error) {
        throw ErrorHandler.fromSupabaseError(error, {
          component: 'ParkingService',
          action: 'getEntries',
          metadata: { filters }
        })
      }

      return transformParkingDataFromDB(entries)
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw ErrorHandler.standardizeError(error, {
        component: 'ParkingService',
        action: 'getEntries',
        metadata: { filters }
      })
    }
  }

  /**
   * Get a single parking entry by ID
   */
  static async getEntryById(id: string): Promise<ParkingEntry | null> {
    try {
      const { data: entry, error } = await supabase
        .from('parking_entries')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Entry not found
        }
        throw ErrorHandler.fromSupabaseError(error, {
          component: 'ParkingService',
          action: 'getEntryById',
          metadata: { entryId: id }
        })
      }

      return transformParkingDataFromDB(entry)
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw ErrorHandler.standardizeError(error, {
        component: 'ParkingService',
        action: 'getEntryById',
        metadata: { entryId: id }
      })
    }
  }

  /**
   * Update a parking entry
   */
  static async updateEntry(id: string, updates: UpdateParkingEntryRequest): Promise<ParkingEntry> {
    try {
      // Build update object with only safe columns to handle missing schema columns gracefully
      const safeUpdateData: any = {}

      // Core columns that should always exist
      if (updates.transport_name !== undefined) safeUpdateData.transport_name = updates.transport_name
      if (updates.driver_name !== undefined) safeUpdateData.driver_name = updates.driver_name
      if (updates.vehicle_type !== undefined) safeUpdateData.vehicle_type = updates.vehicle_type
      if (updates.exit_time !== undefined) safeUpdateData.exit_time = updates.exit_time
      if (updates.status !== undefined) safeUpdateData.status = updates.status
      if (updates.payment_status !== undefined) safeUpdateData.payment_status = updates.payment_status
      if (updates.notes !== undefined) safeUpdateData.notes = updates.notes

      // First, try updating with only safe columns
      const { data: entry, error } = await supabase
        .from('parking_entries')
        .update(safeUpdateData)
        .eq('id', id)
        .select()
        .single()

      // If basic update failed, throw the error
      if (error) {
        throw ErrorHandler.fromSupabaseError(error, {
          component: 'ParkingService',
          action: 'updateEntry',
          metadata: { entryId: id, updates: safeUpdateData }
        })
      }

      // Try to update extended columns separately (they might not exist)
      const extendedUpdates: any = {}
      if (updates.payment_type !== undefined) extendedUpdates.payment_type = updates.payment_type
      if (updates.parking_fee !== undefined) extendedUpdates.parking_fee = updates.parking_fee
      if (updates.actual_fee !== undefined) extendedUpdates.actual_fee = updates.actual_fee
      // calculated_fee removed - column doesn't exist in current database schema
      if (updates.driver_phone !== undefined) extendedUpdates.driver_phone = updates.driver_phone

      console.log('🔧 UPDATE DEBUG - Extended updates:', extendedUpdates)

      if (Object.keys(extendedUpdates).length > 0) {
        try {
          const { data: extendedEntry, error: extendedError } = await supabase
            .from('parking_entries')
            .update(extendedUpdates)
            .eq('id', id)
            .select()
            .single()

          if (!extendedError && extendedEntry) {
            console.log('✅ UPDATE DEBUG - Extended columns updated successfully:', extendedEntry)
            return transformParkingDataFromDB(extendedEntry)
          } else {
            console.warn('⚠️ UPDATE DEBUG - Extended columns update failed:', extendedError?.message)
            console.warn('⚠️ UPDATE DEBUG - Error details:', extendedError)
            // Continue with basic entry data since core update succeeded
          }
        } catch (extendedUpdateError) {
          console.warn('⚠️ UPDATE DEBUG - Extended columns exception:', extendedUpdateError)
          // Continue with basic entry data since core update succeeded
        }
      }

      return transformParkingDataFromDB(entry)
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw ErrorHandler.standardizeError(error, {
        component: 'ParkingService',
        action: 'updateEntry',
        metadata: { entryId: id, updates }
      })
    }
  }

  /**
   * Delete a parking entry
   */
  static async deleteEntry(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('parking_entries')
        .delete()
        .eq('id', id)

      if (error) {
        throw ErrorHandler.fromSupabaseError(error, {
          component: 'ParkingService',
          action: 'deleteEntry',
          metadata: { entryId: id }
        })
      }
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw ErrorHandler.standardizeError(error, {
        component: 'ParkingService',
        action: 'deleteEntry',
        metadata: { entryId: id }
      })
    }
  }

  /**
   * Get parking statistics
   */
  static async getStatistics(): Promise<ParkingStatistics> {
    console.log('📈 STATISTICS DEBUG - getStatistics function called')
    try {
      // Get all entries for calculations
      const { data: entries, error } = await supabase
        .from('parking_entries')
        .select('*')

      if (error) {
        throw ErrorHandler.fromSupabaseError(error, {
          component: 'ParkingService',
          action: 'getStatistics'
        })
      }

      console.log('🔍 RAW DATABASE DATA - Total entries:', entries?.length || 0)
      if (entries && entries.length > 0) {
        console.log('🔍 RAW DATABASE SAMPLE - First entry fields:', Object.keys(entries[0]))
        console.log('🔍 RAW DATABASE SAMPLE - First entry data:', entries[0])

        // Check for paid entries
        const paidEntries = entries.filter(e => e.payment_status === 'Paid')
        console.log('💰 PAID ENTRIES DEBUG - Found paid entries:', paidEntries.length)

        if (paidEntries.length > 0) {
          console.log('💰 PAID ENTRY SAMPLE - First paid entry fields:', Object.keys(paidEntries[0]))
          console.log('💰 PAID ENTRY SAMPLE - First paid entry data:', paidEntries[0])
        }
      }

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

      // Calculate statistics
      // Note: Status should be 'Active' for currently parked vehicles (updated from legacy 'Parked')
      const parkedVehicles = entries.filter(e => e.status === 'Active' || e.status === 'Parked').length
      
      const todayEntries = entries.filter(e => {
        const entryDate = new Date(e.entry_time)
        return entryDate >= today && entryDate < tomorrow
      }).length

      const todayExits = entries.filter(e => {
        if (!e.exit_time) return false
        const exitDate = new Date(e.exit_time)
        return exitDate >= today && exitDate < tomorrow
      }).length

      const todayEligibleEntries = entries.filter(e => {
        if (!e.exit_time || e.payment_status !== 'Paid') return false
        const exitDate = new Date(e.exit_time)
        return exitDate >= today && exitDate < tomorrow
      })

      console.log('📅 TODAY INCOME DEBUG - Eligible entries for today:', todayEligibleEntries.length)

      const todayIncome = todayEligibleEntries
        .reduce((sum, e) => {
          console.log('🔍 ENTRY BEFORE TRANSFORM - Raw entry:', e)

          // 🔧 Transform entry to frontend format before unified service
          const transformedEntry = transformParkingDataFromDB(e)
          console.log('🔄 ENTRY AFTER TRANSFORM - Transformed entry:', transformedEntry)

          // 🎯 Use unified service for consistent revenue extraction
          const feeAmount = unifiedFeeService.getRevenueAmount(transformedEntry)
          console.log('💰 UNIFIED REVENUE - Using unified service:', {
            vehicleNumber: e.vehicle_number,
            originalFields: {
              parking_fee: e.parking_fee,
              actual_fee: e.actual_fee,
              calculated_fee: e.calculated_fee,
              amount_paid: e.amount_paid
            },
            transformedFields: {
              parkingFee: transformedEntry.parkingFee,
              actualFee: transformedEntry.actualFee,
              calculatedFee: transformedEntry.calculatedFee,
              amountPaid: transformedEntry.amountPaid
            },
            feeAmount,
            source: unifiedFeeService.getFeeSource(transformedEntry),
            previousSum: sum
          })
          return sum + feeAmount
        }, 0)

      const unpaidVehicles = entries.filter(e => e.payment_status === 'Unpaid').length

      // Calculate overstaying vehicles (parked > 24 hours)
      const overstayingVehicles = entries.filter(e => {
        // Check for both 'Active' and legacy 'Parked' status
        if (e.status !== 'Active' && e.status !== 'Parked') return false
        const entryTime = new Date(e.entry_time)
        const hoursDiff = (now.getTime() - entryTime.getTime()) / (1000 * 60 * 60)
        return hoursDiff > 24
      }).length

      // Calculate average stay duration for exited vehicles
      const exitedEntries = entries.filter(e => e.status === 'Exited' && e.exit_time)
      const avgStayHours = exitedEntries.length > 0
        ? exitedEntries.reduce((sum, e) => {
            const entryTime = new Date(e.entry_time)
            const exitTime = new Date(e.exit_time!)
            const hours = (exitTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60)
            return sum + hours
          }, 0) / exitedEntries.length
        : 0

      // Calculate total exited vehicles
      const exitedVehicles = entries.filter(e => e.status === 'Exited').length

      // Calculate total income from all paid vehicles (all-time) using unified service
      const allPaidEntries = entries.filter(e => e.payment_status === 'Paid')
      console.log('💰 TOTAL INCOME DEBUG - All paid entries:', allPaidEntries.length)

      const totalIncome = allPaidEntries
        .reduce((sum, e) => {
          // 🔧 Transform entry to frontend format before unified service
          const transformedEntry = transformParkingDataFromDB(e)
          const feeAmount = unifiedFeeService.getRevenueAmount(transformedEntry)
          console.log('💰 TOTAL INCOME - Using unified service:', {
            vehicleNumber: e.vehicle_number,
            originalFields: {
              parking_fee: e.parking_fee,
              actual_fee: e.actual_fee,
              calculated_fee: e.calculated_fee,
              amount_paid: e.amount_paid
            },
            transformedFields: {
              parkingFee: transformedEntry.parkingFee,
              actualFee: transformedEntry.actualFee,
              calculatedFee: transformedEntry.calculatedFee,
              amountPaid: transformedEntry.amountPaid
            },
            feeAmount,
            source: unifiedFeeService.getFeeSource(transformedEntry)
          })
          return sum + feeAmount
        }, 0)

      return {
        parkedVehicles,
        exitedVehicles,
        todayEntries,
        todayExits,
        todayIncome,
        totalIncome,
        unpaidVehicles,
        overstayingVehicles,
        averageStayDuration: Math.round(avgStayHours * 100) / 100,
        occupancyRate: 0 // Would need max capacity to calculate
      }
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw ErrorHandler.standardizeError(error, {
        component: 'ParkingService',
        action: 'getStatistics'
      })
    }
  }


  /**
   * Subscribe to real-time changes
   */
  static subscribeToChanges(callback: (payload: any) => void) {
    return supabase
      .channel('parking_entries_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'parking_entries' 
        }, 
        callback
      )
      .subscribe()
  }
}