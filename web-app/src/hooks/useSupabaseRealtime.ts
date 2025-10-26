import { useEffect, useState, useCallback, useRef } from 'react'
import { supabaseRealtime } from '../services/supabaseRealtime'
import { api as supabaseApi } from '../services/supabaseApi'
import { useParkingStore } from '../stores/parkingStore'
import { log } from '../utils/secureLogger'
import type { ParkingEntry } from '../types'

export interface UseSupabaseRealtimeOptions {
  room?: 'dashboard' | 'reports'
  autoJoinRoom?: boolean
  enableNotifications?: boolean
}

interface RealTimeConnection {
  isConnected: boolean
  connectionState: 'connected' | 'disconnected' | 'connecting'
  lastUpdate: Date | null
}

export const useSupabaseRealtime = (options: UseSupabaseRealtimeOptions = {}) => {
  const {
    room,
    autoJoinRoom = true,
    enableNotifications = true
  } = options

  // Local state for connection status
  const [connection, setConnection] = useState<RealTimeConnection>({
    isConnected: supabaseRealtime.isRealtimeConnected(),
    connectionState: supabaseRealtime.getConnectionState(),
    lastUpdate: null
  })

  // Store actions - use refs to prevent effect dependencies
  const {
    addEntry,
    updateEntry,
    removeEntry,
    setStatistics
  } = useParkingStore()

  // Store function refs to prevent effect re-runs
  const storeActionsRef = useRef({
    addEntry,
    updateEntry,
    removeEntry,
    setStatistics
  })

  // Update refs when store functions change
  useEffect(() => {
    storeActionsRef.current = {
      addEntry,
      updateEntry,
      removeEntry,
      setStatistics
    }
  }, [addEntry, updateEntry, removeEntry, setStatistics])

  // Update connection state
  const updateConnectionState = useCallback(() => {
    setConnection(prev => ({
      ...prev,
      isConnected: supabaseRealtime.isRealtimeConnected(),
      connectionState: supabaseRealtime.getConnectionState()
    }))
  }, [])

  // Setup real-time event listeners
  useEffect(() => {
    const cleanupFunctions: Array<() => void> = []

    // Connection state listeners
    const onConnect = supabaseRealtime.onConnection(() => {
      updateConnectionState()
      if (autoJoinRoom && room) {
        supabaseRealtime.joinRoom(room)
      }
    })

    const onDisconnect = supabaseRealtime.onDisconnection(() => {
      updateConnectionState()
    })

    cleanupFunctions.push(onConnect, onDisconnect)

    // Entry event listeners (only if notifications enabled to prevent conflicts)
    if (enableNotifications) {
      const onEntryCreated = supabaseRealtime.on('entry:created', (entry: ParkingEntry) => {
        storeActionsRef.current.addEntry(entry)
        setConnection(prev => ({
          ...prev,
          lastUpdate: new Date()
        }))
        log.debug('New vehicle entry', { vehicleNumber: entry.vehicleNumber })
      })

      const onEntryUpdated = supabaseRealtime.on('entry:updated', (entry: ParkingEntry) => {
        storeActionsRef.current.updateEntry(entry.id!, entry)
        setConnection(prev => ({
          ...prev,
          lastUpdate: new Date()
        }))

        if (entry.status === 'Exited') {
          log.debug('Vehicle exit processed', { vehicleNumber: entry.vehicleNumber })
        } else {
          log.debug('Vehicle updated', { vehicleNumber: entry.vehicleNumber })
        }
      })

      const onEntryDeleted = supabaseRealtime.on('entry:deleted', (entryId: string) => {
        storeActionsRef.current.removeEntry(entryId)
        setConnection(prev => ({
          ...prev,
          lastUpdate: new Date()
        }))
        log.debug('Vehicle entry deleted', { entryId })
      })

      cleanupFunctions.push(onEntryCreated, onEntryUpdated, onEntryDeleted)
    }

    // Statistics updates are now handled by the store's debounced refreshStatistics
    // and useParkingData's real-time subscriptions to prevent duplicates

    // Initial connection state update
    updateConnectionState()

    // Join room if specified
    if (autoJoinRoom && room && supabaseRealtime.isRealtimeConnected()) {
      supabaseRealtime.joinRoom(room)
    }

    // Cleanup function
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup())
      if (room) {
        supabaseRealtime.leaveRoom(room)
      }
    }
  }, [room, autoJoinRoom, enableNotifications, updateConnectionState]) // Removed store functions to prevent re-runs

  // Real-time actions (now use API directly since realtime handles notifications)
  const createEntry = useCallback(async (entry: Omit<ParkingEntry, 'id' | 'serial'>) => {
    try {
      await supabaseApi.createParkingEntry(entry)
      // Realtime will handle the notification
    } catch (error) {
      log.error('Failed to create entry', error)
      throw error
    }
  }, [])

  const updateEntryRealTime = useCallback(async (entryId: string, updates: Partial<ParkingEntry>) => {
    try {
      await supabaseApi.updateParkingEntry(entryId, updates)
      // Realtime will handle the notification
    } catch (error) {
      log.error('Failed to update entry', error)
      throw error
    }
  }, [])

  const processExitRealTime = useCallback(async (
    entryId: string, 
    exitData: { exitTime: Date; paymentType?: string; amountPaid?: number }
  ) => {
    try {
      await supabaseApi.updateParkingEntry(entryId, {
        exitTime: exitData.exitTime,
        status: 'Exited',
        paymentStatus: 'Paid',
        paymentType: exitData.paymentType,
        parkingFee: exitData.amountPaid
      })
      // Realtime will handle the notification
    } catch (error) {
      log.error('Failed to process exit', error)
      throw error
    }
  }, [])

  // Manual room management
  const joinRoom = useCallback((targetRoom: 'dashboard' | 'reports') => {
    supabaseRealtime.joinRoom(targetRoom)
  }, [])

  const leaveRoom = useCallback((targetRoom: 'dashboard' | 'reports') => {
    supabaseRealtime.leaveRoom(targetRoom)
  }, [])

  // Connection management
  const connect = useCallback(async () => {
    try {
      await supabaseRealtime.connect()
      updateConnectionState()
    } catch (error) {
      log.error('Failed to connect to real-time updates', error)
    }
  }, [updateConnectionState])

  const disconnect = useCallback(() => {
    supabaseRealtime.disconnect()
    updateConnectionState()
  }, [updateConnectionState])

  return {
    // Connection state
    connection,
    isConnected: connection.isConnected,
    connectionState: connection.connectionState,
    lastUpdate: connection.lastUpdate,
    
    // Real-time actions
    createEntry,
    updateEntry: updateEntryRealTime,
    processExit: processExitRealTime,
    
    // Room management
    joinRoom,
    leaveRoom,
    
    // Connection management
    connect,
    disconnect,
    
    // Utility
    refresh: updateConnectionState
  }
}

// Keep the old hook name for compatibility but use the new implementation
export const useRealTimeUpdates = useSupabaseRealtime