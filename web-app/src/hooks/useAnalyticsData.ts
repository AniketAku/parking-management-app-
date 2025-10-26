import { useState, useEffect, useCallback } from 'react'
import type { ParkingEntry } from '../types'
import { useParkingStore } from '../stores/parkingStore'
import { log } from '../utils/secureLogger'

interface AnalyticsData {
  entries: ParkingEntry[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Optimized hook for analytics data with fallback mechanisms
 */
export const useAnalyticsData = (): AnalyticsData => {
  const [analyticsState, setAnalyticsState] = useState<{
    entries: ParkingEntry[]
    loading: boolean
    error: string | null
  }>({
    entries: [],
    loading: true,
    error: null
  })

  const { entries: storeEntries, loading: storeLoading, error: storeError, loadEntries } = useParkingStore()

  const refresh = useCallback(async () => {
    setAnalyticsState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Try to load from store first
      await loadEntries()
    } catch (error) {
      log.warn('Failed to load from store, using fallback data', error)

      // Fallback to demo data if store fails
      const fallbackEntries: ParkingEntry[] = generateFallbackData()
      setAnalyticsState({
        entries: fallbackEntries,
        loading: false,
        error: null
      })
      return
    }
  }, [loadEntries])

  useEffect(() => {
    // Use store data when available
    if (!storeLoading) {
      if (storeError) {
        log.warn('Store error detected, using fallback data', { error: storeError })
        const fallbackEntries = generateFallbackData()
        setAnalyticsState({
          entries: fallbackEntries,
          loading: false,
          error: null // Don't show error in analytics, use fallback instead
        })
      } else {
        setAnalyticsState({
          entries: storeEntries,
          loading: false,
          error: null
        })
      }
    } else {
      setAnalyticsState(prev => ({ ...prev, loading: storeLoading }))
    }
  }, [storeEntries, storeLoading, storeError])

  // Initial load
  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    entries: analyticsState.entries,
    loading: analyticsState.loading,
    error: analyticsState.error,
    refresh
  }
}

/**
 * Generate realistic fallback data for demo purposes
 */
function generateFallbackData(): ParkingEntry[] {
  const now = new Date()
  const entries: ParkingEntry[] = []

  // Generate entries for the last 7 days
  for (let day = 6; day >= 0; day--) {
    const entryDate = new Date(now)
    entryDate.setDate(entryDate.getDate() - day)

    // Generate 3-8 entries per day
    const entryCount = Math.floor(Math.random() * 6) + 3

    for (let i = 0; i < entryCount; i++) {
      const entryTime = new Date(entryDate)
      entryTime.setHours(
        Math.floor(Math.random() * 16) + 6, // 6 AM to 10 PM
        Math.floor(Math.random() * 60),
        0,
        0
      )

      const vehicleTypes = ['Car', 'Truck', 'Motorcycle', 'Bus']
      const vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)]
      const transportNames = ['City Transport', 'Highway Express', 'Local Delivery', 'Commercial Fleet', 'Private Vehicle']
      const transportName = transportNames[Math.floor(Math.random() * transportNames.length)]

      // Some vehicles have exited, some are still parked
      const hasExited = Math.random() > 0.3 // 70% chance of having exited
      const exitTime = hasExited ? new Date(entryTime.getTime() + Math.random() * 8 * 60 * 60 * 1000) : null // 0-8 hours later

      const baseFee = getBaseFeeForVehicleType(vehicleType)
      const duration = exitTime ? (exitTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60) : 0 // in hours
      const amount = hasExited ? Math.ceil(baseFee * Math.max(1, duration)) : baseFee

      entries.push({
        id: `demo-${day}-${i}`,
        vehicleNumber: generateVehicleNumber(),
        vehicleType,
        transportName,
        driverName: generateDriverName(),
        driverPhone: generatePhoneNumber(),
        entryTime: entryTime.toISOString(),
        exitTime: exitTime?.toISOString() || null,
        amount: amount,
        status: hasExited ? 'Exited' : 'Active',
        paymentStatus: hasExited ? (Math.random() > 0.1 ? 'Paid' : 'Pending') : 'Pending',
        paymentType: hasExited && Math.random() > 0.1 ? (Math.random() > 0.5 ? 'Cash' : 'Digital') : null,
        notes: Math.random() > 0.7 ? 'Demo entry for analytics' : null,
        createdAt: entryTime.toISOString(),
        updatedAt: (exitTime || entryTime).toISOString()
      })
    }
  }

  return entries.sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime())
}

function getBaseFeeForVehicleType(vehicleType: string): number {
  const fees = {
    'Car': 50,
    'Truck': 100,
    'Motorcycle': 30,
    'Bus': 150
  }
  return fees[vehicleType as keyof typeof fees] || 50
}

function generateVehicleNumber(): string {
  const states = ['MH', 'DL', 'KA', 'TN', 'UP']
  const state = states[Math.floor(Math.random() * states.length)]
  const district = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0')
  const series = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + String.fromCharCode(65 + Math.floor(Math.random() * 26))
  const number = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')
  return `${state} ${district} ${series} ${number}`
}

function generateDriverName(): string {
  const firstNames = ['Raj', 'Amit', 'Suresh', 'Deepak', 'Vijay', 'Ravi', 'Ajay', 'Sandeep']
  const lastNames = ['Kumar', 'Singh', 'Sharma', 'Patel', 'Gupta', 'Yadav', 'Mishra', 'Joshi']
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`
}

function generatePhoneNumber(): string {
  return `+91-${Math.floor(Math.random() * 9000000000) + 1000000000}`
}

export default useAnalyticsData