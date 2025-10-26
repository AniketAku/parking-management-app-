import { useEffect, useCallback } from 'react'
import { useParkingStore } from '../stores/parkingStore'
import { useRealTimeUpdates } from './useRealTimeUpdates'
import * as useParkingApi from './useParkingApi'
import { useConnectionStatus } from './useApi'
import { getRevenueAmount } from '../utils/helpers'
import { log } from '../utils/secureLogger'
import type { ParkingEntry } from '../types'

/**
 * Unified data integration hook that combines API calls with real-time updates
 * Handles both online and offline scenarios gracefully
 */
export function useDataIntegration() {
  const { isOnline, isFullyConnected } = useConnectionStatus()
  
  // Real-time updates
  const {
    connection,
    createEntry: createEntryRealTime,
    updateEntry: updateEntryRealTime,
    processExit: processExitRealTime
  } = useRealTimeUpdates({
    room: 'dashboard',
    autoJoinRoom: true,
    enableNotifications: true
  })
  
  // API hooks
  const { mutate: createEntryApi } = useParkingApi.useCreateEntry()
  const { mutate: updateEntryApi } = useParkingApi.useUpdateEntry()  
  const { mutate: processExitApi } = useParkingApi.useProcessExit()
  const { mutate: refreshStats } = useParkingApi.useRefreshStatistics()
  
  // Store state
  const { entries, statistics, loading } = useParkingStore()

  // Smart entry creation - uses API with real-time fallback
  const createEntry = useCallback(async (entry: Omit<ParkingEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (isFullyConnected) {
      try {
        // Use API first for authoritative data
        await createEntryApi(entry)
        
        // Real-time update will be handled by Socket.IO automatically
        // when other clients need to see the update
      } catch (error) {
        log.warn('API create failed, falling back to real-time only', error)
        createEntryRealTime(entry)
      }
    } else {
      // Offline or API unavailable - use real-time mock
      createEntryRealTime(entry)
    }
  }, [isFullyConnected, createEntryApi, createEntryRealTime])

  // Smart entry update - uses API with real-time fallback
  const updateEntry = useCallback(async (id: string, updates: Partial<ParkingEntry>) => {
    if (isFullyConnected) {
      try {
        // Use API first for authoritative data
        await updateEntryApi({ id, updates })


        // Real-time update will be handled by Socket.IO automatically
      } catch (error) {
        log.warn('API update failed, falling back to real-time only', error)
        updateEntryRealTime(id, updates)
      }
    } else {
      // Offline or API unavailable - use real-time mock
      updateEntryRealTime(id, updates)
    }
  }, [isFullyConnected, updateEntryApi, updateEntryRealTime])

  // Smart exit processing - uses API with real-time fallback
  const processExit = useCallback(async (
    id: string, 
    exitData: { exitTime: Date; paymentType?: string; amountPaid?: number }
  ) => {
    if (isFullyConnected) {
      try {
        // Use API first for authoritative data
        await processExitApi({ id, exitData })


        // Real-time update will be handled by Socket.IO automatically
      } catch (error) {
        log.warn('API exit processing failed, falling back to real-time only', error)
        processExitRealTime(id, exitData)
      }
    } else {
      // Offline or API unavailable - use real-time mock
      processExitRealTime(id, exitData)
    }
  }, [isFullyConnected, processExitApi, processExitRealTime])

  // Sync data when connection is restored
  useEffect(() => {
    if (isFullyConnected && !loading) {
      // Refresh statistics when connection is restored
      refreshStats()
        .catch(error => {
          log.warn('Failed to refresh statistics after reconnection', error)
        })
    }
  }, [isFullyConnected, refreshStats, loading])

  // Data quality indicators
  const getDataQuality = useCallback(() => {
    if (isFullyConnected && connection.isConnected) {
      return {
        quality: 'excellent' as const,
        description: 'Real-time updates with API backup',
        indicator: '🟢'
      }
    } else if (connection.isConnected) {
      return {
        quality: 'good' as const,
        description: 'Real-time updates only (offline mode)',
        indicator: '🟡'
      }
    } else if (isOnline) {
      return {
        quality: 'limited' as const,
        description: 'API only (real-time unavailable)',
        indicator: '🟠'
      }
    } else {
      return {
        quality: 'cached' as const,
        description: 'Offline mode (cached data)',
        indicator: '🔴'
      }
    }
  }, [isFullyConnected, connection.isConnected, isOnline])

  return {
    // Data operations
    createEntry,
    updateEntry,
    processExit,
    
    // Connection status
    isOnline,
    isFullyConnected,
    isRealTimeActive: connection.isConnected,
    lastUpdate: connection.lastUpdate,
    
    // Data state
    entries,
    statistics,
    loading,
    
    // Data quality
    dataQuality: getDataQuality(),
    
    // Manual refresh
    refresh: refreshStats
  }
}

/**
 * Hook for dashboard-specific data integration
 */
export function useDashboardIntegration() {
  const dataIntegration = useDataIntegration()
  
  // Dashboard-specific real-time setup
  const realTimeUpdates = useRealTimeUpdates({
    room: 'dashboard',
    autoJoinRoom: true,
    enableNotifications: true
  })
  
  return {
    ...dataIntegration,
    
    // Dashboard-specific features
    recentActivity: dataIntegration.entries
      .sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime())
      .slice(0, 10),
    
    parkedVehicles: dataIntegration.entries.filter(e => e.status === 'Parked'),
    
    todayEntries: dataIntegration.entries.filter(e => {
      const today = new Date()
      const entryDate = new Date(e.entryTime)
      return entryDate.toDateString() === today.toDateString()
    }),
    
    // Real-time connection for dashboard
    connectionStatus: realTimeUpdates.connection
  }
}

/**
 * Hook for reports page data integration
 */
export function useReportsIntegration() {
  const dataIntegration = useDataIntegration()
  
  // Reports-specific real-time setup
  const realTimeUpdates = useRealTimeUpdates({
    room: 'reports',
    autoJoinRoom: true,
    enableNotifications: false // Less noisy for reports page
  })
  
  return {
    ...dataIntegration,
    
    // Reports-specific data processing
    processedData: {
      byVehicleType: dataIntegration.entries.reduce((acc, entry) => {
        acc[entry.vehicleType] = (acc[entry.vehicleType] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      
      byPaymentStatus: dataIntegration.entries.reduce((acc, entry) => {
        acc[entry.paymentStatus] = (acc[entry.paymentStatus] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      
      dailyRevenue: dataIntegration.entries
        .filter(e => getRevenueAmount(e) > 0 && e.exitTime)
        .reduce((total, entry) => total + getRevenueAmount(entry), 0)
    },
    
    // Real-time connection for reports
    connectionStatus: realTimeUpdates.connection
  }
}