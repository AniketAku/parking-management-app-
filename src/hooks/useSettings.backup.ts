/**
 * Settings React Hooks
 * Easy-to-use React hooks for settings management with real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { settingsService } from '../services/settingsService'
import type {
  UseSettingsReturn,
  UseSettingsCategoryReturn,
  SettingsServiceOptions,
  SettingCategory,
  AllSettings,
  SettingsChangeEvent,
  SettingsSubscription
} from '../types/settings'

interface SettingsTemplate {
  id: string
  name: string
  description: string
  category: SettingCategory
  settings: Record<string, unknown>
  version: string
  createdAt: Date
}

interface SettingsSearchResult {
  key: string
  value: unknown
  category: SettingCategory
  description: string
  matchScore: number
}

type SettingValue = string | number | boolean | object | null

/**
 * Hook for managing a single setting value
 */
export function useSetting<T = unknown>(
  key: string,
  options?: SettingsServiceOptions
): UseSettingsReturn<T> {
  const [value, setValue] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModified, setIsModified] = useState(false)
  const originalValueRef = useRef<T | undefined>(undefined)
  const subscriptionRef = useRef<SettingsSubscription | null>(null)

  // Load initial value
  useEffect(() => {
    let isMounted = true

    const loadSetting = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const initialValue = await settingsService.getSetting<T>(key, options)
        
        if (isMounted) {
          setValue(initialValue)
          originalValueRef.current = initialValue
          setIsModified(false)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load setting')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadSetting()

    return () => {
      isMounted = false
    }
  }, [key, options])

  // Subscribe to real-time changes
  useEffect(() => {
    if (!key) return

    const subscription = settingsService.subscribeToChanges(
      (event: SettingsChangeEvent) => {
        if (event.key === key) {
          setValue(event.new_value as T)
          // Don't update originalValue for external changes
        }
      },
      { keys: [key] }
    )

    subscriptionRef.current = subscription

    return () => {
      subscription.unsubscribe()
    }
  }, [key])

  // Update setting value
  const updateValue = useCallback(async (newValue: T) => {
    try {
      setError(null)
      await settingsService.setSetting(key, newValue, options)
      setValue(newValue)
      setIsModified(newValue !== originalValueRef.current)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update setting')
      throw err
    }
  }, [key, options])

  // Reset to original value
  const reset = useCallback(async () => {
    try {
      setError(null)
      await settingsService.resetSetting(key, options)
      
      // Reload the setting to get the default value
      const resetValue = await settingsService.getSetting<T>(key, options)
      setValue(resetValue)
      originalValueRef.current = resetValue
      setIsModified(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset setting')
      throw err
    }
  }, [key, options])

  return {
    value,
    loading,
    error,
    setValue: updateValue,
    reset,
    isModified
  }
}

/**
 * Hook for managing all settings in a category
 */
export function useSettingsCategory<T extends keyof AllSettings>(
  category: T,
  options?: SettingsServiceOptions
): UseSettingsCategoryReturn<AllSettings[T]> {
  const [settings, setSettings] = useState<AllSettings[T]>({} as AllSettings[T])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const originalSettingsRef = useRef<AllSettings[T]>({} as AllSettings[T])
  const subscriptionRef = useRef<SettingsSubscription | null>(null)

  // Load category settings
  useEffect(() => {
    let isMounted = true

    const loadSettings = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const categorySettings = await settingsService.getCategorySettings(category, options)
        
        if (isMounted) {
          setSettings(categorySettings as AllSettings[T])
          originalSettingsRef.current = categorySettings as AllSettings[T]
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load settings')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadSettings()

    return () => {
      isMounted = false
    }
  }, [category, options])

  // Subscribe to real-time changes for this category
  useEffect(() => {
    console.log(`🔗 useSettingsCategory: Subscribing to changes for category: ${category}`)
    const subscription = settingsService.subscribeToChanges(
      (event: SettingsChangeEvent) => {
        console.log(`🔗 useSettingsCategory: Received change event for ${event.key} in category ${event.category}`)
        if (event.category === category) {
          console.log(`🔗 useSettingsCategory: Updating settings state for ${event.key} = ${event.new_value}`)
          setSettings(prev => ({
            ...prev,
            [event.key]: event.new_value
          }))
        }
      },
      { category }
    )

    subscriptionRef.current = subscription

    return () => {
      subscription.unsubscribe()
    }
  }, [category])

  // Update single setting
  const updateSetting = useCallback(async (key: string, value: SettingValue) => {
    try {
      setError(null)
      await settingsService.setSetting(key, value, options)
      setSettings(prev => ({
        ...prev,
        [key]: value
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update setting')
      throw err
    }
  }, [options])

  // Bulk update settings
  const bulkUpdate = useCallback(async (updates: Partial<AllSettings[T]>) => {
    try {
      setError(null)
      const results = await settingsService.bulkUpdateSettings(updates as Record<string, unknown>, options)
      
      // Update local state with successful updates
      const successfulUpdates: Record<string, unknown> = {}
      results.forEach(result => {
        if (result.success && updates[result.key as keyof AllSettings[T]] !== undefined) {
          successfulUpdates[result.key] = updates[result.key as keyof AllSettings[T]]
        }
      })
      
      setSettings(prev => ({
        ...prev,
        ...successfulUpdates
      }))
      
      return results
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk update settings')
      throw err
    }
  }, [options])

  // Reset all settings in category
  const reset = useCallback(async () => {
    try {
      setError(null)
      
      // Reset each setting individually
      const resetPromises = Object.keys(settings).map(key =>
        settingsService.resetSetting(key, options)
      )
      
      await Promise.all(resetPromises)
      
      // Reload settings
      const resetSettings = await settingsService.getCategorySettings(category, options)
      setSettings(resetSettings as AllSettings[T])
      originalSettingsRef.current = resetSettings as AllSettings[T]
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset settings')
      throw err
    }
  }, [category, settings, options])

  // Export settings
  const exportSettings = useCallback(async () => {
    try {
      return await settingsService.exportSettings(category, false, false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export settings')
      throw err
    }
  }, [category])

  return {
    settings,
    loading,
    error,
    updateSetting,
    bulkUpdate,
    reset,
    export: exportSettings
  }
}

/**
 * General purpose hook for accessing all settings (used by centralized settings)
 */
export function useSettings() {
  const [allSettings, setAllSettings] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const subscriptionRef = useRef<SettingsSubscription | null>(null)

  // Load all settings on initialization
  useEffect(() => {
    let isMounted = true

    const loadAllSettings = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Load settings from all categories
        const categories: SettingCategory[] = [
          'business', 'user_mgmt', 'ui_theme', 'system', 'validation',
          'localization', 'notifications', 'reporting', 'security', 
          'performance', 'printing'
        ]
        
        const categoryPromises = categories.map(async (category) => {
          try {
            const categorySettings = await settingsService.getCategorySettings(category)
            return { category, settings: categorySettings }
          } catch (error) {
            console.warn(`Failed to load settings for category ${category}:`, error)
            return { category, settings: {} }
          }
        })

        const results = await Promise.all(categoryPromises)
        
        if (isMounted) {
          const combinedSettings: Record<string, unknown> = {}
          
          results.forEach(({ settings }) => {
            Object.assign(combinedSettings, settings)
          })
          
          setAllSettings(combinedSettings)
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load all settings:', err)
          setError(err instanceof Error ? err.message : 'Failed to load settings')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadAllSettings()

    return () => {
      isMounted = false
    }
  }, [])

  // Subscribe to all settings changes
  useEffect(() => {
    const subscription = settingsService.subscribeToChanges(
      (event: SettingsChangeEvent) => {
        setAllSettings(prev => ({
          ...prev,
          [event.key]: event.new_value
        }))
      }
    )

    subscriptionRef.current = subscription

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Update a single setting
  const updateSetting = useCallback(async (key: string, value: unknown) => {
    try {
      setError(null)
      await settingsService.setSetting(key, value)
      setAllSettings(prev => ({
        ...prev,
        [key]: value
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update setting')
      throw err
    }
  }, [])

  // Bulk update settings
  const bulkUpdate = useCallback(async (updates: Record<string, unknown>) => {
    try {
      setError(null)
      const results = await settingsService.bulkUpdateSettings(updates)
      
      // Update local state with successful updates
      const successfulUpdates: Record<string, unknown> = {}
      results.forEach(result => {
        if (result.success && updates[result.key] !== undefined) {
          successfulUpdates[result.key] = updates[result.key]
        }
      })
      
      setAllSettings(prev => ({
        ...prev,
        ...successfulUpdates
      }))
      
      return results
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk update settings')
      throw err
    }
  }, [])

  // Refresh all settings
  const refreshSettings = useCallback(async () => {
    setLoading(true)
    try {
      // Reload all settings
      const categories: SettingCategory[] = [
        'business', 'user_mgmt', 'ui_theme', 'system', 'validation',
        'localization', 'notifications', 'reporting', 'security', 
        'performance', 'printing'
      ]
      
      const categoryPromises = categories.map(async (category) => {
        try {
          const categorySettings = await settingsService.getCategorySettings(category)
          return { category, settings: categorySettings }
        } catch (error) {
          console.warn(`Failed to refresh settings for category ${category}:`, error)
          return { category, settings: {} }
        }
      })

      const results = await Promise.all(categoryPromises)
      
      const combinedSettings: Record<string, unknown> = {}
      results.forEach(({ settings }) => {
        Object.assign(combinedSettings, settings)
      })
      
      setAllSettings(combinedSettings)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh settings')
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    settings: allSettings,
    loading,
    error,
    updateSetting,
    bulkUpdate,
    refreshSettings
  }
}

/**
 * Hook for business settings (parking rates, fees, etc.)
 */
export function useBusinessSettings(options?: SettingsServiceOptions) {
  return useSettingsCategory('business', options)
}

/**
 * Hook for UI theme settings
 */
export function useThemeSettings(options?: SettingsServiceOptions) {
  return useSettingsCategory('ui_theme', options)
}

/**
 * Hook for user management settings
 */
export function useUserManagementSettings(options?: SettingsServiceOptions) {
  return useSettingsCategory('user_mgmt', options)
}

/**
 * Hook for localization settings
 */
export function useLocalizationSettings(options?: SettingsServiceOptions) {
  return useSettingsCategory('localization', options)
}

/**
 * Hook for notification settings
 */
export function useNotificationSettings(options?: SettingsServiceOptions) {
  return useSettingsCategory('notifications', options)
}

/**
 * Hook for system settings
 */
export function useSystemSettings(options?: SettingsServiceOptions) {
  return useSettingsCategory('system', options)
}

/**
 * Hook for security settings
 */
export function useSecuritySettings(options?: SettingsServiceOptions) {
  return useSettingsCategory('security', options)
}

/**
 * Hook for performance settings
 */
export function usePerformanceSettings(options?: SettingsServiceOptions) {
  return useSettingsCategory('performance', options)
}

/**
 * Hook for validation settings
 */
export function useValidationSettings(options?: SettingsServiceOptions) {
  return useSettingsCategory('validation', options)
}

/**
 * Hook for reporting settings
 */
export function useReportingSettings(options?: SettingsServiceOptions) {
  return useSettingsCategory('reporting', options)
}

/**
 * Hook for vehicle rates (most commonly used business setting)
 */
export function useVehicleRates(options?: SettingsServiceOptions) {
  return useSetting<Record<string, number>>('vehicle_rates', options)
}

/**
 * Hook for dark mode setting
 */
export function useDarkMode(options?: SettingsServiceOptions) {
  const { value, setValue, loading, error } = useSetting<boolean>('dark_mode', options)
  
  // Apply theme to document
  useEffect(() => {
    if (value !== undefined) {
      if (value) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [value])

  return {
    isDarkMode: value ?? false,
    setDarkMode: setValue,
    loading,
    error
  }
}

/**
 * Hook for currency formatting using localization settings
 */
export function useCurrencyFormatter(options?: SettingsServiceOptions) {
  const { settings, loading } = useLocalizationSettings(options)
  
  const formatCurrency = useCallback((amount: number): string => {
    if (loading || !settings.currency_symbol) {
      return `₹${amount.toLocaleString('en-IN')}`
    }
    
    const locale = settings.default_locale || 'en-IN'
    const symbol = settings.currency_symbol || '₹'
    
    try {
      return `${symbol}${amount.toLocaleString(locale)}`
    } catch {
      return `${symbol}${amount.toLocaleString('en-IN')}`
    }
  }, [settings, loading])

  return {
    formatCurrency,
    currencySymbol: settings.currency_symbol || '₹',
    currencyCode: settings.currency_code || 'INR',
    loading
  }
}

/**
 * Hook for date formatting using localization settings
 */
export function useDateFormatter(options?: SettingsServiceOptions) {
  const { settings, loading } = useLocalizationSettings(options)
  
  const formatDate = useCallback((date: Date): string => {
    if (loading || !settings.default_locale) {
      return date.toLocaleDateString('en-IN')
    }
    
    const locale = settings.default_locale || 'en-IN'
    
    try {
      return date.toLocaleDateString(locale)
    } catch {
      return date.toLocaleDateString('en-IN')
    }
  }, [settings, loading])

  const formatDateTime = useCallback((date: Date): string => {
    if (loading || !settings.default_locale) {
      return date.toLocaleString('en-IN')
    }
    
    const locale = settings.default_locale || 'en-IN'
    const is24Hour = settings.time_format === '24'
    
    try {
      return date.toLocaleString(locale, {
        hour12: !is24Hour
      })
    } catch {
      return date.toLocaleString('en-IN')
    }
  }, [settings, loading])

  return {
    formatDate,
    formatDateTime,
    locale: settings.default_locale || 'en-IN',
    timeFormat: settings.time_format || '12',
    timezone: settings.timezone || 'Asia/Kolkata',
    loading
  }
}

/**
 * Hook for validating vehicle numbers using validation settings
 */
export function useVehicleNumberValidator(options?: SettingsServiceOptions) {
  const { settings, loading } = useValidationSettings(options)
  
  const validateVehicleNumber = useCallback((vehicleNumber: string): boolean => {
    if (loading || !settings.vehicle_number_patterns) {
      // Fallback to hardcoded patterns if settings not loaded
      const defaultPatterns = [
        /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/,
        /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$/
      ]
      const cleaned = vehicleNumber.replace(/\s/g, '').toUpperCase()
      return defaultPatterns.some(pattern => pattern.test(cleaned))
    }
    
    const cleaned = vehicleNumber.replace(/\s/g, '').toUpperCase()
    const patterns = settings.vehicle_number_patterns.map(p => new RegExp(p.replace(/^\/|\/$/g, '')))
    
    return patterns.some(pattern => pattern.test(cleaned))
  }, [settings, loading])

  return {
    validateVehicleNumber,
    patterns: settings.vehicle_number_patterns || [],
    loading
  }
}

/**
 * Hook for applying settings templates
 */
export function useSettingsTemplates() {
  const [templates, setTemplates] = useState<SettingsTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true)
        const templateData = await settingsService.getTemplates()
        setTemplates(templateData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load templates')
      } finally {
        setLoading(false)
      }
    }

    loadTemplates()
  }, [])

  const applyTemplate = useCallback(async (templateId: string, options?: SettingsServiceOptions) => {
    try {
      setError(null)
      const results = await settingsService.applyTemplate(templateId, options)
      return results
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply template')
      throw err
    }
  }, [])

  return {
    templates,
    loading,
    error,
    applyTemplate
  }
}

/**
 * Hook for settings search and filtering
 */
export function useSettingsSearch() {
  const [results, setResults] = useState<SettingsSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (_query: string, _category?: SettingCategory) => {
    try {
      setLoading(true)
      setError(null)
      
      // This would implement search functionality in the service
      // For now, we'll return empty results
      setResults([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    results,
    loading,
    error,
    search
  }
}