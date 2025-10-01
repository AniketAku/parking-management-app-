import { useState, useEffect, useMemo } from 'react'
import { exportToCSV } from '../utils/helpers'
import type { ParkingEntry, SearchFilters } from '../types'

interface UseSearchResult {
  filters: SearchFilters
  setFilters: (filters: SearchFilters) => void
  resetFilters: () => void
  searchResults: ParkingEntry[]
  loading: boolean
  resultCount: number
  exportData: () => void
  hasActiveFilters: boolean
}

const initialFilters: SearchFilters = {}

const applyFilters = (entries: ParkingEntry[], filters: SearchFilters): ParkingEntry[] => {
  return entries.filter(entry => {
    // Quick search across multiple fields
    if (filters.vehicleNumber) {
      const searchTerm = filters.vehicleNumber.toLowerCase()
      const matchesQuickSearch = 
        entry.vehicleNumber.toLowerCase().includes(searchTerm) ||
        entry.transportName.toLowerCase().includes(searchTerm) ||
        entry.driverName.toLowerCase().includes(searchTerm) ||
        (entry.notes && entry.notes.toLowerCase().includes(searchTerm))
      
      if (!matchesQuickSearch) return false
    }

    // Transport name filter
    if (filters.transportName) {
      if (!entry.transportName.toLowerCase().includes(filters.transportName.toLowerCase())) {
        return false
      }
    }

    // Vehicle type filter
    if (filters.vehicleType && entry.vehicleType !== filters.vehicleType) {
      return false
    }

    // Status filter
    if (filters.status && entry.status !== filters.status) {
      return false
    }

    // Payment status filter
    if (filters.paymentStatus && entry.paymentStatus !== filters.paymentStatus) {
      return false
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      const entryDate = new Date(entry.entryTime)
      
      if (filters.dateFrom && entryDate < filters.dateFrom) {
        return false
      }
      
      if (filters.dateTo) {
        const endOfDay = new Date(filters.dateTo)
        endOfDay.setHours(23, 59, 59, 999)
        if (entryDate > endOfDay) {
          return false
        }
      }
    }

    return true
  })
}

export const useSearch = (entries: ParkingEntry[]): UseSearchResult => {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters)
  const [loading, setLoading] = useState(false)

  // Simulate search delay for better UX
  useEffect(() => {
    if (Object.keys(filters).some(key => filters[key as keyof SearchFilters] !== undefined)) {
      setLoading(true)
      const timer = setTimeout(() => setLoading(false), 300)
      return () => clearTimeout(timer)
    }
  }, [filters])

  const searchResults = useMemo(() => {
    if (!entries.length) return []
    
    const filtered = applyFilters(entries, filters)
    
    // Apply default sorting: unpaid first, then by entry time (newest first)
    return filtered.sort((a, b) => {
      // First priority: Unpaid status
      if (a.paymentStatus === 'Unpaid' && b.paymentStatus !== 'Unpaid') return -1
      if (a.paymentStatus !== 'Unpaid' && b.paymentStatus === 'Unpaid') return 1
      
      // Second priority: Entry time (newest first)
      return new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime()
    })
  }, [entries, filters])

  const resetFilters = () => {
    setFilters(initialFilters)
  }

  const exportData = () => {
    if (searchResults.length === 0) return
    
    const filename = `vehicle_records_${new Date().toISOString().split('T')[0]}`
    exportToCSV(searchResults, filename)
  }

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(value => 
      value !== undefined && value !== '' && value !== null
    )
  }, [filters])

  return {
    filters,
    setFilters,
    resetFilters,
    searchResults,
    loading,
    resultCount: searchResults.length,
    exportData,
    hasActiveFilters
  }
}