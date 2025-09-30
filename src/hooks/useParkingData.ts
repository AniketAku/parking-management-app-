import { useEffect, useCallback, useRef } from 'react'
import { useParkingStore } from '../stores/parkingStore'
import { ParkingService } from '../services/parkingService'

interface Subscription {
  unsubscribe(): void
}

/**
 * Custom hook for managing parking data lifecycle
 * Handles initial data loading and real-time updates
 */
export const useParkingData = () => {
  const {
    entries,
    statistics,
    loading,
    error,
    loadEntries,
    refreshStatistics,
    setError,
    handleEntryUpdate,
    handleEntryDelete
  } = useParkingStore()

  // Debounce timer for statistics updates
  const statsUpdateTimer = useRef<NodeJS.Timeout | null>(null)

  // Debounced statistics refresh (wait 500ms after last change)
  const debouncedRefreshStats = useCallback(() => {
    if (statsUpdateTimer.current) {
      clearTimeout(statsUpdateTimer.current)
    }

    statsUpdateTimer.current = setTimeout(() => {
      refreshStatistics()
    }, 500) // Wait 500ms after last database change
  }, [refreshStatistics])

  useEffect(() => {
    let mounted = true
    let subscription: Subscription | null = null

    const initializeData = async () => {
      try {
        // Load initial data
        await loadEntries()
        await refreshStatistics()

        // Set up real-time subscription
        subscription = ParkingService.subscribeToChanges((payload) => {
          if (!mounted) return

          const { eventType, new: newRecord, old: oldRecord } = payload

          switch (eventType) {
            case 'INSERT':
              if (newRecord) {
                const transformedEntry = ParkingService.transformDatabaseEntry(newRecord)
                handleEntryUpdate(transformedEntry)
                debouncedRefreshStats() // Use debounced version
              }
              break

            case 'UPDATE':
              if (newRecord) {
                const transformedEntry = ParkingService.transformDatabaseEntry(newRecord)
                handleEntryUpdate(transformedEntry)
                debouncedRefreshStats() // Use debounced version
              }
              break

            case 'DELETE':
              if (oldRecord) {
                handleEntryDelete(oldRecord.id)
                debouncedRefreshStats() // Use debounced version
              }
              break
          }
        })

      } catch (error) {
        if (mounted) {
          const message = error instanceof Error ? error.message : 'Failed to initialize parking data'
          setError(message)
        }
      }
    }

    initializeData()

    // Cleanup function
    return () => {
      mounted = false
      if (subscription) {
        subscription.unsubscribe()
      }
      // Clear any pending statistics update
      if (statsUpdateTimer.current) {
        clearTimeout(statsUpdateTimer.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedRefreshStats]) // Include debounced function in dependencies

  return {
    entries,
    statistics,
    loading,
    error,
    refresh: async () => {
      await loadEntries()
      await refreshStatistics()
    }
  }
}

/**
 * Hook for getting real-time parking statistics
 */
export const useParkingStatistics = () => {
  const { statistics, refreshStatistics } = useParkingStore()

  useEffect(() => {
    refreshStatistics()
  }, [refreshStatistics])

  return statistics
}

/**
 * Hook for getting filtered parking entries
 */
export const useParkingEntries = (autoLoad = true) => {
  const { entries, loading, error, loadEntries } = useParkingStore()

  useEffect(() => {
    if (autoLoad) {
      loadEntries()
    }
  }, [autoLoad, loadEntries])

  return { entries, loading, error, refresh: loadEntries }
}