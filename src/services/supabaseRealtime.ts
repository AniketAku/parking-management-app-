import { supabase } from '../lib/supabase'
import type { ParkingEntry, ParkingStatistics } from '../types'
import { toast } from 'react-hot-toast'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface RealtimeEvents {
  // Parking entry events
  'entry:created': (entry: ParkingEntry) => void
  'entry:updated': (entry: ParkingEntry) => void
  'entry:deleted': (entryId: string) => void
  
  // Statistics updates
  'stats:updated': (stats: ParkingStatistics) => void
  
  // System events
  'system:notification': (message: string, type: 'info' | 'success' | 'warning' | 'error') => void
  'connection:status': (status: 'connected' | 'disconnected') => void
}

class SupabaseRealtimeService {
  private channel: RealtimeChannel | null = null
  private isConnected = false
  private eventListeners: Map<string, Set<Function>> = new Map()
  private connectionCallbacks: Array<() => void> = []
  private disconnectionCallbacks: Array<() => void> = []

  constructor() {
    this.connect()
  }

  async connect(): Promise<void> {
    try {
      // Check if real-time is disabled via environment variable
      if (import.meta.env.VITE_DISABLE_REALTIME === 'true') {
        console.log('📴 Real-time updates disabled via environment variable')
        this.isConnected = false
        this.emit('connection:status', 'disconnected')
        return
      }

      // Create a channel for parking entries
      this.channel = supabase
        .channel('parking_entries_channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'parking_entries'
          },
          (payload) => this.handleDatabaseInsert(payload)
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'parking_entries'
          },
          (payload) => this.handleDatabaseUpdate(payload)
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'parking_entries'
          },
          (payload) => this.handleDatabaseDelete(payload)
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.isConnected = true
            console.log('✅ Supabase realtime connected')
            
            // Execute connection callbacks
            this.connectionCallbacks.forEach(callback => callback())
            
            // Emit connection status
            this.emit('connection:status', 'connected')
            
            toast.success('🔄 Real-time updates connected', {
              duration: 2000,
              position: 'bottom-right'
            })
          } else if (status === 'CHANNEL_ERROR') {
            this.isConnected = false
            console.warn('❌ Supabase realtime connection error - operating in offline mode')

            this.emit('connection:status', 'disconnected')

            // Less intrusive notification for development
            if (import.meta.env.DEV) {
              toast('⚠️ Real-time updates unavailable (offline mode)', {
                duration: 3000,
                position: 'bottom-right',
                icon: '⚠️'
              })
            }
          } else if (status === 'TIMED_OUT') {
            this.isConnected = false
            console.warn('⏰ Supabase realtime connection timed out - retrying...')

            this.emit('connection:status', 'disconnected')

            // Less intrusive notification for timeout
            if (import.meta.env.DEV) {
              toast('🔄 Real-time connection timed out, retrying...', {
                duration: 2000,
                position: 'bottom-right',
                icon: '🔄'
              })
            }
          } else if (status === 'CLOSED') {
            this.isConnected = false
            console.log('🔌 Supabase realtime disconnected')
            
            // Execute disconnection callbacks
            this.disconnectionCallbacks.forEach(callback => callback())
            
            this.emit('connection:status', 'disconnected')
            
            toast.error('Real-time updates disconnected', {
              duration: 3000,
              position: 'bottom-right'
            })
          }
        })
    } catch (error) {
      console.warn('Failed to connect to Supabase realtime, operating in offline mode:', error)
      this.isConnected = false
      this.emit('connection:status', 'disconnected')

      // Only show error in development and make it less intrusive
      if (import.meta.env.DEV) {
        toast('📱 Operating in offline mode - real-time updates disabled', {
          duration: 3000,
          position: 'bottom-right',
          icon: '📱'
        })
      }
    }
  }

  disconnect(): void {
    if (this.channel) {
      supabase.removeChannel(this.channel)
      this.channel = null
    }
    this.isConnected = false
    this.eventListeners.clear()
    console.log('🔌 Supabase realtime disconnected')
  }

  // Event handler for database INSERT
  private handleDatabaseInsert(payload: any): void {
    const dbEntry = payload.new
    if (!dbEntry) return

    // Transform database format to frontend format
    const entry: ParkingEntry = {
      id: dbEntry.id,
      serial: dbEntry.serial,
      transportName: dbEntry.transport_name,
      vehicleType: dbEntry.vehicle_type,
      vehicleNumber: dbEntry.vehicle_number,
      driverName: dbEntry.driver_name,
      driverPhone: dbEntry.driver_phone,
      notes: dbEntry.notes,
      entryTime: dbEntry.entry_time,
      exitTime: dbEntry.exit_time,
      status: dbEntry.status,
      parkingFee: dbEntry.parking_fee,
      paymentStatus: dbEntry.payment_status,
      paymentType: dbEntry.payment_type,
      createdBy: dbEntry.created_by,
      lastModified: dbEntry.updated_at
    }

    this.emit('entry:created', entry)
    
    // Show notification for entry creation
    this.emit('system:notification', `New entry: ${entry.vehicleNumber}`, 'success')
  }

  // Event handler for database UPDATE
  private handleDatabaseUpdate(payload: any): void {
    const dbEntry = payload.new
    if (!dbEntry) return

    // Transform database format to frontend format
    const entry: ParkingEntry = {
      id: dbEntry.id,
      serial: dbEntry.serial,
      transportName: dbEntry.transport_name,
      vehicleType: dbEntry.vehicle_type,
      vehicleNumber: dbEntry.vehicle_number,
      driverName: dbEntry.driver_name,
      driverPhone: dbEntry.driver_phone,
      notes: dbEntry.notes,
      entryTime: dbEntry.entry_time,
      exitTime: dbEntry.exit_time,
      status: dbEntry.status,
      parkingFee: dbEntry.parking_fee,
      paymentStatus: dbEntry.payment_status,
      paymentType: dbEntry.payment_type,
      createdBy: dbEntry.created_by,
      lastModified: dbEntry.updated_at
    }

    this.emit('entry:updated', entry)
    
    // Show different notifications based on what was updated
    if (dbEntry.status === 'Exited' && payload.old.status === 'Active') {
      this.emit('system:notification', `Vehicle exited: ${entry.vehicleNumber}`, 'info')
    } else if (dbEntry.status === 'Overstay' && payload.old.status === 'Active') {
      this.emit('system:notification', `Vehicle overstay: ${entry.vehicleNumber}`, 'warning')
    } else {
      this.emit('system:notification', `Entry updated: ${entry.vehicleNumber}`, 'info')
    }
  }

  // Event handler for database DELETE
  private handleDatabaseDelete(payload: any): void {
    const deletedEntry = payload.old
    if (!deletedEntry) return

    this.emit('entry:deleted', deletedEntry.id)
    this.emit('system:notification', `Entry deleted: ${deletedEntry.vehicle_number}`, 'info')
  }

  // Event listener management
  on<K extends keyof RealtimeEvents>(event: K, callback: RealtimeEvents[K]): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(callback)

    // Return unsubscribe function
    return () => this.off(event, callback)
  }

  off<K extends keyof RealtimeEvents>(event: K, callback: RealtimeEvents[K]): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(callback)
    }
  }

  private emit<K extends keyof RealtimeEvents>(event: K, ...args: Parameters<RealtimeEvents[K]>): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          (callback as any)(...args)
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error)
        }
      })
    }
  }

  // Connection status
  isRealtimeConnected(): boolean {
    return this.isConnected
  }

  getConnectionState(): 'connected' | 'disconnected' | 'connecting' {
    if (!this.channel) return 'disconnected'
    return this.isConnected ? 'connected' : 'connecting'
  }

  // Connection callbacks
  onConnection(callback: () => void): () => void {
    if (this.isConnected) {
      callback()
    }
    this.connectionCallbacks.push(callback)
    return () => {
      this.connectionCallbacks = this.connectionCallbacks.filter(cb => cb !== callback)
    }
  }

  onDisconnection(callback: () => void): () => void {
    this.disconnectionCallbacks.push(callback)
    return () => {
      this.disconnectionCallbacks = this.disconnectionCallbacks.filter(cb => cb !== callback)
    }
  }

  // Convenience methods that match the socket service interface
  onEntryCreated(callback: (entry: ParkingEntry) => void): () => void {
    return this.on('entry:created', callback)
  }

  onEntryUpdated(callback: (entry: ParkingEntry) => void): () => void {
    return this.on('entry:updated', callback)
  }

  onEntryDeleted(callback: (entryId: string) => void): () => void {
    return this.on('entry:deleted', callback)
  }

  onStatsUpdated(callback: (stats: ParkingStatistics) => void): () => void {
    return this.on('stats:updated', callback)
  }

  // Room management (simplified for Supabase - no explicit rooms needed)
  joinRoom(room: 'dashboard' | 'reports'): void {
    console.log(`📡 Joined realtime room: ${room}`)
    // With Supabase, all users automatically get updates for the tables they subscribe to
    // No explicit room joining needed
  }

  leaveRoom(room: 'dashboard' | 'reports'): void {
    console.log(`📡 Left realtime room: ${room}`)
    // With Supabase, disconnecting from the channel stops all updates
    // Individual room leaving not needed
  }
}

// Singleton instance
export const supabaseRealtime = new SupabaseRealtimeService()

export default supabaseRealtime