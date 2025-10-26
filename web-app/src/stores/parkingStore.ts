import { create } from 'zustand'
import { devtools, subscribeWithSelector, persist } from 'zustand/middleware'
import type { ParkingEntry, ParkingStatistics, SearchFilters } from '../types'
import { ParkingService } from '../services/parkingService'
import type { CreateParkingEntryRequest } from '../services/parkingService'
import { getCurrentParkingTime } from '../utils/time-fix'
import { isCurrentlyParked } from '../utils/statusHelpers'
import toast from 'react-hot-toast'
import { log } from '../utils/secureLogger'

interface ParkingState {
  // Data
  entries: ParkingEntry[]
  statistics: ParkingStatistics
  searchResults: ParkingEntry[]
  
  // UI State
  loading: boolean
  searchLoading: boolean
  error: string | null
  
  // Filters and pagination
  searchFilters: SearchFilters
  currentPage: number
  pageSize: number
  
  // Selected entries for bulk operations
  selectedEntries: Set<string>
  
  // Actions
  setEntries: (entries: ParkingEntry[]) => void
  addEntry: (entry: ParkingEntry) => void
  updateEntry: (id: string, updates: Partial<ParkingEntry>) => void
  removeEntry: (id: string) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  deleteEntries: (ids: string[]) => Promise<void>
  
  setStatistics: (statistics: ParkingStatistics) => void
  setSearchResults: (results: ParkingEntry[]) => void
  
  setLoading: (loading: boolean) => void
  setSearchLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // API integration methods
  refreshEntries: () => Promise<void>
  refreshStatistics: () => Promise<void>
  loadEntries: () => Promise<void>
  createEntry: (data: CreateParkingEntryRequest) => Promise<ParkingEntry | null>
  exitVehicle: (id: string, actualFee?: number, paymentType?: string, notes?: string) => Promise<void>
  
  setSearchFilters: (filters: SearchFilters) => void
  clearSearchFilters: () => void
  
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  
  toggleEntrySelection: (id: string) => void
  selectAllEntries: () => void
  clearSelection: () => void
  
  // Computed values
  filteredEntries: () => ParkingEntry[]
  paginatedEntries: () => ParkingEntry[]
  totalPages: () => number
  
  // Real-time update methods
  handleEntryUpdate: (entry: ParkingEntry) => void
  handleEntryDelete: (id: string) => void
  handleStatisticsUpdate: (statistics: ParkingStatistics) => void
}

const initialStatistics: ParkingStatistics = {
  parkedVehicles: 0,
  exitedVehicles: 0,
  todayEntries: 0,
  todayExits: 0,
  todayIncome: 0,
  totalIncome: 0,
  unpaidVehicles: 0,
  overstayingVehicles: 0,
  averageStayDuration: 0,
  occupancyRate: 0
}

const initialSearchFilters: SearchFilters = {}

// Helper function to filter entries based on search criteria
const filterEntries = (entries: ParkingEntry[], filters: SearchFilters): ParkingEntry[] => {
  return entries.filter(entry => {
    // Vehicle number filter
    if (filters.vehicleNumber) {
      const vehicleMatch = entry.vehicleNumber
        .toLowerCase()
        .includes(filters.vehicleNumber.toLowerCase())
      if (!vehicleMatch) return false
    }
    
    // Transport name filter
    if (filters.transportName) {
      const transportMatch = entry.transportName
        .toLowerCase()
        .includes(filters.transportName.toLowerCase())
      if (!transportMatch) return false
    }
    
    // Status filter
    if (filters.status && entry.status !== filters.status) {
      return false
    }
    
    // Vehicle type filter
    if (filters.vehicleType && entry.vehicleType !== filters.vehicleType) {
      return false
    }
    
    // Payment status filter
    if (filters.paymentStatus && entry.paymentStatus !== filters.paymentStatus) {
      return false
    }
    
    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      const entryDate = new Date(entry.entryTime)
      
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom)
        fromDate.setHours(0, 0, 0, 0)
        if (entryDate < fromDate) return false
      }
      
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo)
        toDate.setHours(23, 59, 59, 999)
        if (entryDate > toDate) return false
      }
    }
    
    return true
  })
}

export const useParkingStore = create<ParkingState>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
      // Initial state
      entries: [],
      statistics: initialStatistics,
      searchResults: [],
      loading: false,
      searchLoading: false,
      error: null,
      searchFilters: initialSearchFilters,
      currentPage: 1,
      pageSize: 10,
      selectedEntries: new Set(),
      
      // Actions
      setEntries: (entries) => set({ entries }, false, 'setEntries'),
      
      addEntry: (entry) => set((state) => ({
        entries: [...state.entries, entry],
        selectedEntries: new Set(), // Clear selection after adding
      }), false, 'addEntry'),
      
      updateEntry: (id, updates) => set((state) => ({
        entries: state.entries.map(entry => 
          entry.id === id 
            ? { ...entry, ...updates, updatedAt: new Date() }
            : entry
        ),
      }), false, 'updateEntry'),
      
      removeEntry: async (id) => {
        try {
          await ParkingService.deleteEntry(id)
          set((state) => {
            const newSelectedEntries = new Set(state.selectedEntries)
            newSelectedEntries.delete(id)
            
            return {
              entries: state.entries.filter(entry => entry.id !== id),
              selectedEntries: newSelectedEntries,
            }
          }, false, 'removeEntry')
          await get().refreshStatistics()
          toast.success('Entry removed successfully!')
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to remove entry'
          set({ error: message }, false, 'removeEntry')
          toast.error(message)
        }
      },
      
      deleteEntry: async (id) => {
        try {
          await ParkingService.deleteEntry(id)
          set((state) => {
            const newSelectedEntries = new Set(state.selectedEntries)
            newSelectedEntries.delete(id)
            
            return {
              entries: state.entries.filter(entry => entry.id !== id),
              selectedEntries: newSelectedEntries,
            }
          }, false, 'deleteEntry')
          await get().refreshStatistics()
          toast.success('Entry deleted successfully!')
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete entry'
          set({ error: message }, false, 'deleteEntry')
          toast.error(message)
        }
      },
      
      deleteEntries: async (ids) => {
        try {
          await Promise.all(ids.map(id => ParkingService.deleteEntry(id)))
          set((state) => {
            const idsSet = new Set(ids)
            return {
              entries: state.entries.filter(entry => !idsSet.has(entry.id)),
              selectedEntries: new Set(),
            }
          }, false, 'deleteEntries')
          await get().refreshStatistics()
          toast.success(`${ids.length} entries deleted successfully!`)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete entries'
          set({ error: message }, false, 'deleteEntries')
          toast.error(message)
        }
      },
      
      setStatistics: (statistics) => set({ statistics }, false, 'setStatistics'),
      
      setSearchResults: (results) => set({ searchResults: results }, false, 'setSearchResults'),
      
      setLoading: (loading) => set({ loading }, false, 'setLoading'),
      
      setSearchLoading: (loading) => set({ searchLoading: loading }, false, 'setSearchLoading'),
      
      setError: (error) => set({ error }, false, 'setError'),
      
      // API integration methods
      refreshEntries: async () => {
        set({ loading: true }, false, 'refreshEntries')
        try {
          const entries = await ParkingService.getEntries()
          // Sort by payment status - unpaid first, then by entry time (newest first)
          const sortedEntries = entries.sort((a, b) => {
            // First priority: Unpaid status
            if (a.paymentStatus === 'Unpaid' && b.paymentStatus !== 'Unpaid') return -1
            if (a.paymentStatus !== 'Unpaid' && b.paymentStatus === 'Unpaid') return 1
            
            // Second priority: Entry time (newest first)
            return new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime()
          })
          set({ entries: sortedEntries, loading: false, error: null }, false, 'refreshEntries')
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to load entries'
          set({ loading: false, error: message }, false, 'refreshEntries')
          toast.error(message)
        }
      },
      
      refreshStatistics: (() => {
        let debounceTimer: NodeJS.Timeout | null = null

        return async () => {
          // Clear existing timer
          if (debounceTimer) {
            clearTimeout(debounceTimer)
          }

          // Set new debounced timer
          debounceTimer = setTimeout(async () => {
            try {
              log.debug('About to call ParkingService.getStatistics()')
              const statistics = await ParkingService.getStatistics()
              log.debug('Statistics received', statistics)
              set({ statistics }, false, 'refreshStatistics')
            } catch (error) {
              log.error('Statistics error', error)
              const message = error instanceof Error ? error.message : 'Failed to load statistics'
              set({ error: message }, false, 'refreshStatistics')
            }
          }, 500) // 500ms debounce
        }
      })(),

      loadEntries: async () => {
        set({ loading: true, error: null }, false, 'loadEntries')
        try {
          const entries = await ParkingService.getEntries()
          // Sort by payment status - unpaid first, then by entry time (newest first)
          const sortedEntries = entries.sort((a, b) => {
            // First priority: Unpaid status
            if (a.paymentStatus === 'Unpaid' && b.paymentStatus !== 'Unpaid') return -1
            if (a.paymentStatus !== 'Unpaid' && b.paymentStatus === 'Unpaid') return 1
            
            // Second priority: Entry time (newest first)
            return new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime()
          })
          set({ entries: sortedEntries, loading: false }, false, 'loadEntries')
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to load entries'
          set({ loading: false, error: message }, false, 'loadEntries')
          toast.error(message)
        }
      },

      createEntry: async (data: CreateParkingEntryRequest): Promise<ParkingEntry | null> => {
        try {
          const entry = await ParkingService.createEntry(data)
          get().addEntry(entry)
          await get().refreshStatistics()
          return entry
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create entry'
          set({ error: message }, false, 'createEntry')
          toast.error(message)
          return null
        }
      },

      exitVehicle: async (id: string, actualFee?: number, paymentType?: string, notes?: string): Promise<void> => {
        try {
          const entry = await ParkingService.updateEntry(id, {
            exit_time: getCurrentParkingTime(),
            status: 'Exited',
            payment_status: 'Paid',
            payment_type: paymentType,
            parking_fee: actualFee,
            notes
          })
          get().updateEntry(id, entry)
          await get().refreshStatistics()
          toast.success('Vehicle exit processed successfully!')
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to process exit'
          set({ error: message }, false, 'exitVehicle')
          toast.error(message)
        }
      },
      
      setSearchFilters: (filters) => set({
        searchFilters: filters,
        currentPage: 1, // Reset to first page when filters change
      }, false, 'setSearchFilters'),
      
      clearSearchFilters: () => set({
        searchFilters: initialSearchFilters,
        currentPage: 1,
      }, false, 'clearSearchFilters'),
      
      setCurrentPage: (page) => set({ currentPage: page }, false, 'setCurrentPage'),
      
      setPageSize: (size) => set({
        pageSize: size,
        currentPage: 1, // Reset to first page when page size changes
      }, false, 'setPageSize'),
      
      toggleEntrySelection: (id) => set((state) => {
        const newSelection = new Set(state.selectedEntries)
        if (newSelection.has(id)) {
          newSelection.delete(id)
        } else {
          newSelection.add(id)
        }
        return { selectedEntries: newSelection }
      }, false, 'toggleEntrySelection'),
      
      selectAllEntries: () => set(() => {
        const filteredIds = get().filteredEntries().map(entry => entry.id)
        return { selectedEntries: new Set(filteredIds) }
      }, false, 'selectAllEntries'),
      
      clearSelection: () => set({
        selectedEntries: new Set()
      }, false, 'clearSelection'),
      
      // Computed values
      filteredEntries: () => {
        const { entries, searchFilters } = get()
        const filtered = filterEntries(entries, searchFilters)
        // Sort by payment status - unpaid first, then by entry time (newest first)
        return filtered.sort((a, b) => {
          // First priority: Unpaid status
          if (a.paymentStatus === 'Unpaid' && b.paymentStatus !== 'Unpaid') return -1
          if (a.paymentStatus !== 'Unpaid' && b.paymentStatus === 'Unpaid') return 1
          
          // Second priority: Entry time (newest first)
          return new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime()
        })
      },
      
      paginatedEntries: () => {
        const { currentPage, pageSize } = get()
        const filtered = get().filteredEntries()
        const startIndex = (currentPage - 1) * pageSize
        const endIndex = startIndex + pageSize
        return filtered.slice(startIndex, endIndex)
      },
      
      totalPages: () => {
        const { pageSize } = get()
        const filteredCount = get().filteredEntries().length
        return Math.ceil(filteredCount / pageSize)
      },
      
      // Real-time update methods
      handleEntryUpdate: (entry) => {
        const state = get()
        const existingIndex = state.entries.findIndex(e => e.id === entry.id)
        
        if (existingIndex >= 0) {
          // Update existing entry
          set((state) => ({
            entries: state.entries.map((e, index) => 
              index === existingIndex ? entry : e
            ),
          }), false, 'handleEntryUpdate')
        } else {
          // Add new entry
          get().addEntry(entry)
        }
      },
      
      handleEntryDelete: (id) => {
        get().deleteEntry(id)
      },
      
      handleStatisticsUpdate: (statistics) => {
        get().setStatistics(statistics)
      },
    })),
    {
      name: 'parking-store',
      // Only include data that should be persisted
      partialize: (state: any) => ({
        searchFilters: state.searchFilters,
        pageSize: state.pageSize,
        currentPage: state.currentPage,
      }),
    }),
    { name: 'parking-store-devtools' }
  )
)

// Selectors for better performance
export const selectEntries = (state: ParkingState) => state.entries
export const selectStatistics = (state: ParkingState) => state.statistics
export const selectSearchResults = (state: ParkingState) => state.searchResults
export const selectLoading = (state: ParkingState) => state.loading
export const selectSearchLoading = (state: ParkingState) => state.searchLoading
export const selectError = (state: ParkingState) => state.error
export const selectFilteredEntries = (state: ParkingState) => state.filteredEntries()
export const selectPaginatedEntries = (state: ParkingState) => state.paginatedEntries()
export const selectSelectedEntries = (state: ParkingState) => state.selectedEntries
export const selectSearchFilters = (state: ParkingState) => state.searchFilters

// Helper hooks for common operations
export const useParkedVehicles = () => {
  return useParkingStore(state =>
    state.entries.filter(entry => isCurrentlyParked(entry.status))
  )
}

export const useExitedVehicles = () => {
  return useParkingStore(state => 
    state.entries.filter(entry => entry.status === 'Exited')
  )
}

export const useUnpaidVehicles = () => {
  return useParkingStore(state => 
    state.entries.filter(entry => entry.paymentStatus === 'Unpaid')
  )
}

export const useTodayEntries = () => {
  return useParkingStore(state => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    return state.entries.filter(entry => {
      const entryDate = new Date(entry.entryTime)
      return entryDate >= today && entryDate < tomorrow
    })
  })
}