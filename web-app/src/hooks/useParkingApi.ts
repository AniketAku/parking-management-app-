import { useCallback } from 'react'
import { useParkingStore } from '../stores/parkingStore'
import { api as supabaseApi } from '../services/supabaseApi'
import { useApi, useMutation } from './useApi'
import { log } from '../utils/secureLogger'
import type {
  ParkingEntry,
  SearchFilters
} from '../types'

// Parking entries hooks
export function useParkingEntries(filters?: SearchFilters) {
  const setEntries = useParkingStore(state => state.setEntries)
  const setLoading = useParkingStore(state => state.setLoading)

  return useApi(
    () => supabaseApi.getParkingEntries(filters),
    [JSON.stringify(filters)],
    {
      onSuccess: (response) => {
        setEntries(response.data)
        setLoading(false)
      },
      onError: () => {
        setLoading(false)
      }
    }
  )
}

export function useParkingEntry(id: string | null) {
  return useApi(
    async () => {
        const response = await supabaseApi.getParkingEntries()
        return response.data.find(entry => entry.id === id!)
      },
    [id],
    {
      immediate: !!id,
      showErrorToast: false // Handle errors manually
    }
  )
}

export function useCreateEntry() {
  const addEntry = useParkingStore(state => state.addEntry)
  const refreshStatistics = useParkingStore(state => state.refreshStatistics)

  return useMutation(
    (entry: Omit<ParkingEntry, 'id' | 'createdAt' | 'updatedAt'>) =>
      supabaseApi.createParkingEntry(entry),
    {
      onSuccess: (newEntry) => {
        addEntry(newEntry)
        refreshStatistics()
      },
      showSuccessToast: '🚗 Vehicle entry created successfully'
    }
  )
}

export function useUpdateEntry() {
  const updateEntry = useParkingStore(state => state.updateEntry)
  const refreshStatistics = useParkingStore(state => state.refreshStatistics)

  return useMutation(
    ({ id, updates }: { id: string; updates: Partial<ParkingEntry> }) =>
      supabaseApi.updateParkingEntry(id, updates),
    {
      onSuccess: (updatedEntry) => {
        updateEntry(updatedEntry.id, updatedEntry)
        refreshStatistics()
      },
      showSuccessToast: '✅ Vehicle entry updated successfully'
    }
  )
}

export function useDeleteEntry() {
  const removeEntry = useParkingStore(state => state.removeEntry)
  const refreshStatistics = useParkingStore(state => state.refreshStatistics)

  return useMutation(
    (id: string) => supabaseApi.deleteParkingEntry(id),
    {
      onSuccess: (_, id) => {
        removeEntry(id)
        refreshStatistics()
      },
      showSuccessToast: '🗑️ Vehicle entry deleted successfully'
    }
  )
}

export function useProcessExit() {
  const updateEntry = useParkingStore(state => state.updateEntry)
  const refreshStatistics = useParkingStore(state => state.refreshStatistics)

  return useMutation(
    ({ 
      id, 
      exitData 
    }: { 
      id: string
      exitData: { exitTime: Date; paymentType?: string; amountPaid?: number }
    }) => supabaseApi.updateParkingEntry(id, {
        exitTime: exitData.exitTime,
        status: 'Exited',
        paymentStatus: 'Paid',
        paymentType: exitData.paymentType,
        parkingFee: exitData.amountPaid
      }),
    {
      onSuccess: (processedEntry) => {
        updateEntry(processedEntry.id, processedEntry)
        refreshStatistics()
      },
      showSuccessToast: '🚪 Vehicle exit processed successfully'
    }
  )
}

// Statistics hooks
export function useParkingStatistics() {
  const setStatistics = useParkingStore(state => state.setStatistics)

  return useApi(
    () => supabaseApi.getStatistics(),
    [],
    {
      onSuccess: (stats) => {
        setStatistics(stats)
      }
    }
  )
}

export function useRefreshStatistics() {
  const setStatistics = useParkingStore(state => state.setStatistics)

  return useMutation(
    () => supabaseApi.getStatistics(),
    {
      onSuccess: (stats) => {
        setStatistics(stats)
      },
      showErrorToast: false // Statistics refresh should be silent
    }
  )
}

// Reports hooks
export function useReports(
  type: 'daily' | 'weekly' | 'monthly',
  startDate?: Date,
  endDate?: Date
) {
  return useApi(
    () => supabaseApi.getReportData(
        startDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        endDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        type === 'daily' ? 'day' : type === 'weekly' ? 'week' : 'month'
      ),
    [type, startDate?.toISOString(), endDate?.toISOString()],
    {
      immediate: false // Only fetch when explicitly requested
    }
  )
}

export function useGenerateReport() {
  return useMutation(
    ({ type, startDate, endDate }: {
      type: 'daily' | 'weekly' | 'monthly'
      startDate?: Date
      endDate?: Date
    }) => supabaseApi.getReportData(
        startDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        endDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        type === 'daily' ? 'day' : type === 'weekly' ? 'week' : 'month'
      ),
    {
      showSuccessToast: '📊 Report generated successfully'
    }
  )
}

// Search functionality
export function useSearchEntries() {
  const setSearchResults = useParkingStore(state => state.setSearchResults)
  const setSearchLoading = useParkingStore(state => state.setSearchLoading)

  return useMutation(
    (filters: SearchFilters) => supabaseApi.getParkingEntries(filters),
    {
      onSuccess: (response) => {
        setSearchResults(response.data)
        setSearchLoading(false)
      },
      onError: () => {
        setSearchLoading(false)
      },
      showErrorToast: false // Search errors should be handled gracefully
    }
  )
}

// Bulk operations
export function useBulkUpdateEntries() {
  const refreshEntries = useParkingStore(state => state.refreshEntries)
  const refreshStatistics = useParkingStore(state => state.refreshStatistics)

  return useMutation(
    async (updates: { id: string; updates: Partial<ParkingEntry> }[]) => {
      // Process updates in parallel
      const promises = updates.map(({ id, updates }) =>
        supabaseApi.updateParkingEntry(id, updates)
      )
      return Promise.all(promises)
    },
    {
      onSuccess: () => {
        // Refresh both entries and statistics after bulk update
        refreshEntries()
        refreshStatistics()
      },
      showSuccessToast: (data) => 
        `✅ ${data.length} entries updated successfully`
    }
  )
}

// Combined hook for dashboard data
export function useDashboardData() {
  const entries = useParkingStore(state => state.entries)
  const statistics = useParkingStore(state => state.statistics)
  const loading = useParkingStore(state => state.loading)

  // Fetch entries
  const entriesQuery = useParkingEntries()
  
  // Fetch statistics
  const statsQuery = useParkingStatistics()

  // Refresh function for manual refresh
  const refresh = useCallback(async () => {
    try {
      await Promise.all([
        entriesQuery.execute(),
        statsQuery.execute()
      ])
    } catch (error) {
      log.error('Failed to refresh dashboard data', error)
    }
  }, [entriesQuery, statsQuery])

  return {
    entries,
    statistics,
    loading: loading || entriesQuery.loading || statsQuery.loading,
    error: entriesQuery.error || statsQuery.error,
    refresh
  }
}

// Hook for real-time data synchronization
export function useDataSync() {
  const refreshEntries = useParkingStore(state => state.refreshEntries)
  const refreshStatistics = useParkingStore(state => state.refreshStatistics)

  const syncData = useCallback(async () => {
    try {
      const [entriesResponse, statistics] = await Promise.all([
        apiService.getEntries(),
        supabaseApi.getStatistics()
      ])
      
      // Update store with fresh data
      useParkingStore.getState().setEntries(entriesResponse.data)
      useParkingStore.getState().setStatistics(statistics)
      
      log.success('Data synchronized successfully')
    } catch (error) {
      log.error('Data sync failed', error)
    }
  }, [])

  return {
    syncData,
    refreshEntries,
    refreshStatistics
  }
}

// Hook for optimistic updates
export function useOptimisticUpdate() {
  const updateEntry = useParkingStore(state => state.updateEntry)

  const optimisticUpdate = useCallback(
    async (
      id: string,
      updates: Partial<ParkingEntry>,
      apiCall: () => Promise<ParkingEntry>
    ) => {
      // Apply optimistic update immediately
      const originalEntry = useParkingStore.getState().entries.find(e => e.id === id)
      if (originalEntry) {
        updateEntry(id, { ...originalEntry, ...updates })
      }

      try {
        // Make API call
        const updatedEntry = await apiCall()
        
        // Apply real update
        updateEntry(id, updatedEntry)
        
        return updatedEntry
      } catch (error) {
        // Revert optimistic update on error
        if (originalEntry) {
          updateEntry(id, originalEntry)
        }
        throw error
      }
    },
    [updateEntry]
  )

  return { optimisticUpdate }
}