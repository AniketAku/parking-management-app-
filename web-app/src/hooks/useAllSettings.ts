/**
 * Hook for Advanced Settings Manager
 * Provides settings as an array with CRUD operations
 */

import { useState, useEffect, useCallback } from 'react'
import { settingsService } from '../services/settingsService'
import type { AppSetting, SettingCategory } from '../types/settings'

interface UseAllSettingsReturn {
  settings: AppSetting[] | null
  loading: boolean
  error: string | null
  updateSetting: (key: string, value: any) => Promise<void>
  refresh: () => Promise<void>
}

export function useAllSettings(): UseAllSettingsReturn {
  const [settings, setSettings] = useState<AppSetting[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const allSettings = await settingsService.getAllSettings()
      setSettings(allSettings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  const updateSetting = useCallback(async (key: string, value: any) => {
    try {
      await settingsService.setSetting(key, value)
      await loadSettings() // Refresh after update
    } catch (err) {
      throw err
    }
  }, [loadSettings])

  const refresh = useCallback(async () => {
    await loadSettings()
  }, [loadSettings])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  return {
    settings,
    loading,
    error,
    updateSetting,
    refresh
  }
}