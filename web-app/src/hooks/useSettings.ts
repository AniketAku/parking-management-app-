/**
 * NEW SIMPLIFIED SETTINGS HOOKS
 * React hooks for the new settings service
 * Replaces complex useBusinessSettings and related hooks
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { newSettingsService, type SettingCategory, type BusinessSettings, type UIThemeSettings } from '../services/newSettingsService'
import { log } from '../utils/secureLogger'

// ================================================
// GENERIC SETTINGS HOOK
// ================================================

export interface UseSettingsOptions {
  useCache?: boolean
  throwOnError?: boolean
  autoRefresh?: boolean
}

export function useSettings<T extends Record<string, any>>(
  category: SettingCategory,
  options: UseSettingsOptions = {}
) {
  const [settings, setSettings] = useState<Partial<T>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Memoize options to prevent constant re-renders
  const memoizedOptions = useMemo(() => ({
    useCache: options.useCache ?? true,
    throwOnError: options.throwOnError ?? false,
    autoRefresh: options.autoRefresh ?? true
  }), [options.useCache, options.throwOnError, options.autoRefresh])

  const { useCache, throwOnError, autoRefresh } = memoizedOptions

  // Load settings
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await newSettingsService.getCategorySettings<T>(category, {
        useCache,
        throwOnError
      })

      setSettings(data)
      log.debug('Settings loaded', { category, count: Object.keys(data).length })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load settings'
      setError(errorMessage)
      log.error('Failed to load settings', { category, error: err })
    } finally {
      setLoading(false)
    }
  }, [category, useCache, throwOnError])

  // Update settings
  const updateSettings = useCallback(async (updates: Partial<T>): Promise<boolean> => {
    try {
      const success = await newSettingsService.updateCategorySettings(category, updates, {
        throwOnError
      })
      
      if (success) {
        // Optimistically update local state
        setSettings(prev => ({ ...prev, ...updates }))
      }
      
      return success
    } catch (err) {
      log.error('Failed to update settings', { category, error: err })
      return false
    }
  }, [category, throwOnError])

  // Update single setting
  const updateSetting = useCallback(async (key: string, value: any): Promise<boolean> => {
    try {
      const success = await newSettingsService.updateSetting(category, key, value, {
        throwOnError
      })
      
      if (success) {
        setSettings(prev => ({ ...prev, [key]: value }))
      }
      
      return success
    } catch (err) {
      log.error('Failed to update setting', { category, key, error: err })
      return false
    }
  }, [category, throwOnError])

  // Refresh settings
  const refresh = useCallback(() => {
    loadSettings()
  }, [loadSettings])

  // Setup effect
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Setup real-time subscription
  useEffect(() => {
    if (!autoRefresh) return

    const unsubscribe = newSettingsService.subscribeToCategory(category, (changedSettings) => {
      log.debug('Settings updated', { category, changedSettings })
      setSettings(prev => ({ ...prev, ...changedSettings }))
    })

    return unsubscribe
  }, [category, autoRefresh])

  return {
    settings,
    loading,
    error,
    updateSettings,
    updateSetting,
    refresh
  }
}

// ================================================
// SPECIFIC CATEGORY HOOKS
// ================================================

/**
 * Hook for business settings (vehicle rates, types, etc.)
 */
export function useBusinessSettings(options?: UseSettingsOptions) {
  const result = useSettings<BusinessSettings>('business', options)
  
  return {
    ...result,
    // Convenience getters with fallbacks
    vehicleRates: result.settings.vehicle_rates || {},
    vehicleTypes: result.settings.vehicle_types || [],
    operatingHours: result.settings.operating_hours || { start: '06:00', end: '22:00', timezone: 'Asia/Kolkata' },
    paymentMethods: result.settings.payment_methods || ['Cash', 'Card'],
    entryStatusOptions: result.settings.entry_status_options || ['Active', 'Exited'],
    paymentStatusOptions: result.settings.payment_status_options || ['Paid', 'Pending'],
    minimumChargeDays: result.settings.minimum_charge_days || 1,
    overstayPenaltyRate: result.settings.overstay_penalty_rate || 50,
    overstayThresholdHours: result.settings.overstay_threshold_hours || 24,
    currencyCode: result.settings.currency_code || 'INR',
    taxRate: result.settings.tax_rate || 0,

    // Helper methods
    getVehicleRate: (vehicleType: string) => {
      return result.settings.vehicle_rates?.[vehicleType] || 0
    },

    // Status indicators
    isConfigured: Object.keys(result.settings).length > 0,
    hasVehicleRates: result.settings.vehicle_rates && Object.keys(result.settings.vehicle_rates).length > 0,
    statusText: result.loading ? 'Loading settings...' : 
                result.error ? `Error: ${result.error}` :
                Object.keys(result.settings).length === 0 ? 'No business settings found' :
                'Settings loaded successfully',
    statusIcon: result.loading ? '🔄' :
                result.error ? '❌' :
                Object.keys(result.settings).length === 0 ? '⚠️' :
                '✅'
  }
}

/**
 * Hook for UI theme settings
 */
export function useUIThemeSettings(options?: UseSettingsOptions) {
  const result = useSettings<UIThemeSettings>('ui_theme', options)
  
  return {
    ...result,
    // Convenience getters with defaults
    primaryColor: result.settings.primary_color || '#2563eb',
    secondaryColor: result.settings.secondary_color || '#64748b',
    successColor: result.settings.success_color || '#10b981',
    warningColor: result.settings.warning_color || '#f59e0b',
    dangerColor: result.settings.danger_color || '#ef4444',
    darkMode: result.settings.dark_mode || false,
    themeMode: result.settings.theme_mode || 'light',
    
    // Theme object for easy consumption
    theme: useMemo(() => ({
      primary: result.settings.primary_color || '#2563eb',
      secondary: result.settings.secondary_color || '#64748b',
      success: result.settings.success_color || '#10b981',
      warning: result.settings.warning_color || '#f59e0b',
      danger: result.settings.danger_color || '#ef4444',
      dark: result.settings.dark_mode || false,
      mode: result.settings.theme_mode || 'light'
    }), [result.settings])
  }
}

/**
 * Hook for a single setting value
 */
export function useSetting<T = any>(
  category: SettingCategory,
  key: string,
  defaultValue?: T,
  options?: UseSettingsOptions
) {
  const [value, setValue] = useState<T | null>(defaultValue || null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Memoize options to prevent constant re-renders
  const memoizedOptions = useMemo(() => ({
    useCache: options?.useCache ?? true,
    throwOnError: options?.throwOnError ?? false,
    autoRefresh: options?.autoRefresh ?? true
  }), [options?.useCache, options?.throwOnError, options?.autoRefresh])

  const { useCache, throwOnError, autoRefresh } = memoizedOptions

  // Load single setting
  const loadSetting = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await newSettingsService.getSetting<T>(category, key, {
        useCache,
        throwOnError
      })
      
      setValue(data !== null ? data : defaultValue || null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load setting'
      setError(errorMessage)
      log.error('Failed to load setting', { category, key, error: err })
    } finally {
      setLoading(false)
    }
  }, [category, key, defaultValue, useCache, throwOnError])

  // Update setting
  const updateValue = useCallback(async (newValue: T): Promise<boolean> => {
    try {
      const success = await newSettingsService.updateSetting(category, key, newValue, {
        throwOnError
      })
      
      if (success) {
        setValue(newValue)
      }
      
      return success
    } catch (err) {
      log.error('Failed to update setting', { category, key, error: err })
      return false
    }
  }, [category, key, throwOnError])

  // Setup effect
  useEffect(() => {
    loadSetting()
  }, [loadSetting])

  // Setup real-time subscription
  useEffect(() => {
    if (!autoRefresh) return

    const unsubscribe = newSettingsService.subscribeToCategory(category, (changedSettings) => {
      if (changedSettings[key] !== undefined) {
        setValue(changedSettings[key])
      }
    })

    return unsubscribe
  }, [category, key, autoRefresh])

  return {
    value,
    loading,
    error,
    updateValue,
    refresh: loadSetting
  }
}

// ================================================
// MISSING EXPORTS FOR COMPATIBILITY
// ================================================

/**
 * Alias for useUIThemeSettings for compatibility
 */
export function useThemeSettings(options?: UseSettingsOptions) {
  return useUIThemeSettings(options)
}

/**
 * Hook for getting settings by category (generic)
 */
export function useSettingsCategory(category: SettingCategory, options?: UseSettingsOptions) {
  return useSettings(category, options)
}

/**
 * Hook for system settings
 */
export function useSystemSettings(options?: UseSettingsOptions) {
  return useSettings('system', options)
}

/**
 * Hook for performance settings (mapped to system category)
 */
export function usePerformanceSettings(options?: UseSettingsOptions) {
  return useSettings('system', options)
}

/**
 * Hook for localization settings
 */
export function useLocalizationSettings(options?: UseSettingsOptions) {
  return useSettings('localization', options)
}

/**
 * Hook for currency formatting
 */
export function useCurrencyFormatter(options?: UseSettingsOptions) {
  const { settings, loading } = useLocalizationSettings(options)

  const formatCurrency = useCallback((amount: number) => {
    const currencyCode = settings.currency_code || 'INR'
    const locale = settings.locale || 'en-IN'

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode
      }).format(amount)
    } catch (err) {
      log.warn('Failed to format currency', { locale, currencyCode, error: err })
      return `${currencyCode} ${amount.toFixed(2)}`
    }
  }, [settings.currency_code, settings.locale])

  return {
    formatCurrency,
    loading,
    currencyCode: settings.currency_code || 'INR',
    locale: settings.locale || 'en-IN'
  }
}

// ================================================
// ADVANCED SETTINGS HOOKS
// ================================================

/**
 * Hook for searching settings
 */
export function useSettingsSearch() {
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (query: string, category?: SettingCategory) => {
    setLoading(true)
    setError(null)
    try {
      // Mock search implementation - replace with actual service call
      setSearchResults([])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    searchResults,
    loading,
    error,
    search
  }
}

/**
 * Hook for exporting settings
 */
export function useSettingsExport() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const exportSettings = useCallback(async (categories?: SettingCategory[]) => {
    setLoading(true)
    setError(null)
    try {
      // Mock export implementation - replace with actual service call
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    exportSettings
  }
}

/**
 * Hook for importing settings
 */
export function useSettingsImport() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const importSettings = useCallback(async (data: any) => {
    setLoading(true)
    setError(null)
    try {
      // Mock import implementation - replace with actual service call
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Import failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    importSettings
  }
}

// ================================================
// SETTINGS CACHE HOOK
// ================================================

/**
 * Hook for settings service debugging and cache management
 */
export function useSettingsDebug() {
  const [stats, setStats] = useState(newSettingsService.getCacheStats())

  const refresh = useCallback(() => {
    setStats(newSettingsService.getCacheStats())
  }, [])

  const clearCache = useCallback(() => {
    newSettingsService.clearCache()
    refresh()
  }, [refresh])

  const testConnection = useCallback(async () => {
    return await newSettingsService.testConnection()
  }, [])

  useEffect(() => {
    const interval = setInterval(refresh, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [refresh])

  return {
    stats,
    clearCache,
    testConnection,
    refresh
  }
}