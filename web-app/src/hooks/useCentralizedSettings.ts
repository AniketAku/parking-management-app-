import { useState, useEffect, useCallback } from 'react'
import { BackwardCompatibility, SettingsMigration } from '../utils/settingsMigration'
// import { getVehicleRatesFromSettings, getValidationRulesFromSettings } from '../utils/helpers'
import { useSettings } from './useSettings'
import { log } from '../utils/secureLogger'
import type { VehicleRates } from '../types'

// Fallback values for individual settings
const getSettingFallback = (key: string): unknown => {
  const fallbacks: Record<string, unknown> = {
    vehicleRates: { 'Trailer': 225, '6 Wheeler': 150, '4 Wheeler': 100, '2 Wheeler': 50 },
    validationRules: {
      vehicleNumber: { pattern: '^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$', minLength: 4, maxLength: 15 },
      transportName: { minLength: 2, maxLength: 100 },
      driverName: { minLength: 2, maxLength: 50 }
    },
    darkModeEnabled: true,
    compactMode: false,
    primaryColors: { 50: '#f0f5ff', 500: '#2A5C8F', 600: '#1e4a7a' },
    animations: { duration: '0.3s', easing: 'ease-out' },
    apiTimeout: 30000,
    retryAttempts: 3,
    cacheTimeout: 300000,
    currency: 'INR',
    businessHours: { start: '06:00', end: '22:00', timezone: 'Asia/Kolkata' },
    overstayPenaltyRate: 1.5,
    debounceDelay: 300,
    searchThreshold: 3,
    paginationSize: 50
  }
  return fallbacks[key] || null
}

/**
 * Custom hook for accessing centralized settings with backward compatibility
 * Enhanced with robust error handling and fallback mechanisms
 */

interface CentralizedSettingsState {
  vehicleRates: VehicleRates | null
  validationRules: {
    vehicleNumber: {
      pattern: string
      minLength: number
      maxLength: number
    }
    transportName: {
      minLength: number
      maxLength: number
    }
    driverName: {
      minLength: number
      maxLength: number
    }
  } | null
  uiTheme: {
    darkModeEnabled: boolean
    compactMode: boolean
    primaryColors: Record<string, string>
    animations: {
      duration: string
      easing: string
    }
  } | null
  systemConfig: {
    apiTimeout: number
    retryAttempts: number
    cacheTimeout: number
  } | null
  businessConfig: {
    currency: string
    businessHours: {
      start: string
      end: string
      timezone: string
    }
    overstayPenaltyRate: number
  } | null
  performanceConfig: {
    debounceDelay: number
    searchThreshold: number
    paginationSize: number
  } | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  // Enhanced state
  isInitialized: boolean
  failedSettings: string[]
  fallbackMode: boolean
  healthStatus: 'healthy' | 'degraded' | 'failed'
}

export const useCentralizedSettings = (autoLoad = true) => {
  const { settings, loading: settingsLoading, refreshSettings } = useSettings()
  const [state, setState] = useState<CentralizedSettingsState>({
    vehicleRates: null,
    validationRules: null,
    uiTheme: null,
    systemConfig: null,
    businessConfig: null,
    performanceConfig: null,
    loading: true,
    error: null,
    lastUpdated: null,
    isInitialized: false,
    failedSettings: [],
    fallbackMode: false,
    healthStatus: 'healthy'
  })

  // Load all centralized settings
  const loadSettings = useCallback(async (force = false) => {
    if (state.loading && !force) return
    
    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null,
      failedSettings: [],
      healthStatus: 'healthy'
    }))

    try {
      // Test connectivity first
      const isHealthy = await BackwardCompatibility.testConnectivity()
      if (!isHealthy) {
        setState(prev => ({
          ...prev,
          healthStatus: 'degraded',
          fallbackMode: true
        }))
        log.warn('Settings connectivity degraded, enabling fallback mode')
      }

      // Check if migration is needed first
      const migrationNeeded = await SettingsMigration.isMigrationNeeded()
      if (migrationNeeded) {
        log.info('Settings migration needed, running migration')
        await SettingsMigration.migrateLegacySettings()
        await refreshSettings() // Refresh the settings after migration
      }

      // Load all settings with individual error handling
      const settingsPromises = [
        { key: 'vehicleRates', promise: BackwardCompatibility.getSettingWithFallback('vehicle_rates', getSettingFallback('vehicleRates')) },
        { key: 'validationRules', promise: BackwardCompatibility.getSettingWithFallback('validation_rules', getSettingFallback('validationRules')) },
        // UI Theme settings
        { key: 'darkModeEnabled', promise: BackwardCompatibility.getSettingWithFallback('dark_mode_enabled', true) },
        { key: 'compactMode', promise: BackwardCompatibility.getSettingWithFallback('compact_mode', false) },
        { key: 'primaryColors', promise: BackwardCompatibility.getSettingWithFallback('primary_color_scheme', {
          50: '#f0f5ff', 500: '#2A5C8F', 600: '#1e4a7a'
        }) },
        { key: 'animations', promise: BackwardCompatibility.getSettingWithFallback('animation_settings', {
          duration: '0.3s', easing: 'ease-out'
        }) },
        // System configuration
        { key: 'apiTimeout', promise: BackwardCompatibility.getSettingWithFallback('api_timeout', 30000) },
        { key: 'retryAttempts', promise: BackwardCompatibility.getSettingWithFallback('retry_attempts', 3) },
        { key: 'cacheTimeout', promise: BackwardCompatibility.getSettingWithFallback('cache_timeout', 300000) },
        // Business configuration
        { key: 'currency', promise: BackwardCompatibility.getSettingWithFallback('currency', 'INR') },
        { key: 'businessHours', promise: BackwardCompatibility.getSettingWithFallback('business_hours', {
          start: '06:00', end: '22:00', timezone: 'Asia/Kolkata'
        }) },
        { key: 'overstayPenaltyRate', promise: BackwardCompatibility.getSettingWithFallback('overstay_penalty_rate', 1.5) },
        // Performance configuration
        { key: 'debounceDelay', promise: BackwardCompatibility.getSettingWithFallback('debounce_delay', 300) },
        { key: 'searchThreshold', promise: BackwardCompatibility.getSettingWithFallback('search_threshold', 3) },
        { key: 'paginationSize', promise: BackwardCompatibility.getSettingWithFallback('pagination_size', 50) }
      ]

      // Execute all settings loads with individual error tracking
      const settingsResults = await Promise.allSettled(settingsPromises.map(s => s.promise))
      const failedSettings: string[] = []
      const settingsData: Record<string, unknown> = {}

      // Process results and track failures
      settingsResults.forEach((result, index) => {
        const settingKey = settingsPromises[index].key
        if (result.status === 'fulfilled') {
          settingsData[settingKey] = result.value
        } else {
          failedSettings.push(settingKey)
          log.warn('Failed to load setting', { setting: settingKey, reason: result.reason })
          // Use fallback values for failed settings
          settingsData[settingKey] = getSettingFallback(settingKey)
        }
      })

      // Destructure results with type assertions
      const vehicleRates = settingsData.vehicleRates as VehicleRates
      const validationRules = settingsData.validationRules as CentralizedSettingsState['validationRules']
      const darkModeEnabled = settingsData.darkModeEnabled as boolean
      const compactMode = settingsData.compactMode as boolean
      const primaryColors = settingsData.primaryColors as Record<string, string>
      const animations = settingsData.animations as { duration: string; easing: string }
      const apiTimeout = settingsData.apiTimeout as number
      const retryAttempts = settingsData.retryAttempts as number
      const cacheTimeout = settingsData.cacheTimeout as number
      const currency = settingsData.currency as string
      const businessHours = settingsData.businessHours as { start: string; end: string; timezone: string }
      const overstayPenaltyRate = settingsData.overstayPenaltyRate as number
      const debounceDelay = settingsData.debounceDelay as number
      const searchThreshold = settingsData.searchThreshold as number
      const paginationSize = settingsData.paginationSize as number

      // Determine health status based on failed settings
      const healthStatus: 'healthy' | 'degraded' | 'failed' = 
        failedSettings.length === 0 ? 'healthy' :
        failedSettings.length <= 5 ? 'degraded' : 'failed'

      setState({
        vehicleRates,
        validationRules,
        uiTheme: {
          darkModeEnabled,
          compactMode,
          primaryColors,
          animations
        },
        systemConfig: {
          apiTimeout,
          retryAttempts,
          cacheTimeout
        },
        businessConfig: {
          currency,
          businessHours,
          overstayPenaltyRate
        },
        performanceConfig: {
          debounceDelay,
          searchThreshold,
          paginationSize
        },
        loading: false,
        error: null,
        lastUpdated: new Date(),
        isInitialized: true,
        failedSettings,
        fallbackMode: failedSettings.length > 0,
        healthStatus
      })

      // Log loading results
      if (failedSettings.length === 0) {
        log.success('Centralized settings loaded successfully')
      } else {
        log.warn('Centralized settings loaded with failures', {
          failureCount: failedSettings.length,
          failedSettings: failedSettings.join(', ')
        })
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error loading settings'
      log.error('Failed to load centralized settings', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: message,
        healthStatus: 'failed',
        fallbackMode: true,
        isInitialized: false
      }))
    }
  }, [state.loading, refreshSettings])

  // Auto-load settings on mount
  useEffect(() => {
    if (autoLoad && !settingsLoading) {
      loadSettings()
    }
  }, [autoLoad, settingsLoading, loadSettings])

  // Reload settings when the underlying settings change
  useEffect(() => {
    if (settings && state.lastUpdated) {
      // Check if any settings have changed since last load
      const settingsModified = settings.some(s => 
        new Date(s.updated_at || s.created_at) > state.lastUpdated!
      )

      if (settingsModified) {
        log.info('Settings changed, reloading centralized settings')
        loadSettings(true)
      }
    }
  }, [settings, state.lastUpdated, loadSettings])

  // Refresh function for manual reloads
  const refresh = useCallback(() => {
    return loadSettings(true)
  }, [loadSettings])

  // Clear cache function
  const clearCache = useCallback(() => {
    BackwardCompatibility.clearCache()
    return loadSettings(true)
  }, [loadSettings])

  // Preload specific settings
  const preloadSettings = useCallback(async (keys: string[]) => {
    await BackwardCompatibility.preloadSettings(keys)
  }, [])

  return {
    // Settings data
    vehicleRates: state.vehicleRates,
    validationRules: state.validationRules,
    uiTheme: state.uiTheme,
    systemConfig: state.systemConfig,
    businessConfig: state.businessConfig,
    performanceConfig: state.performanceConfig,
    
    // State
    loading: state.loading || settingsLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    
    // Enhanced error handling state
    isInitialized: state.isInitialized,
    failedSettings: state.failedSettings,
    fallbackMode: state.fallbackMode,
    healthStatus: state.healthStatus,
    
    // Actions
    refresh,
    clearCache,
    preloadSettings,
    
    // Utilities
    isSettingsLoaded: !state.loading && !settingsLoading && !!state.vehicleRates,
    hasError: !!state.error
  }
}

/**
 * Hook for vehicle rates specifically (most commonly used)
 */
export const useVehicleRates = () => {
  const { vehicleRates, loading, error, refresh } = useCentralizedSettings()
  
  return {
    rates: vehicleRates,
    loading,
    error,
    refresh,
    isLoaded: !!vehicleRates && !loading
  }
}

/**
 * Hook for validation rules specifically
 */
export const useValidationRules = () => {
  const { validationRules, loading, error, refresh } = useCentralizedSettings()
  
  return {
    rules: validationRules,
    loading,
    error,
    refresh,
    isLoaded: !!validationRules && !loading
  }
}

/**
 * Hook for UI theme settings specifically
 */
export const useUITheme = () => {
  const { uiTheme, loading, error, refresh } = useCentralizedSettings()
  
  return {
    theme: uiTheme,
    loading,
    error,
    refresh,
    isLoaded: !!uiTheme && !loading
  }
}

/**
 * Hook for system configuration specifically
 */
export const useSystemConfig = () => {
  const { systemConfig, loading, error, refresh } = useCentralizedSettings()
  
  return {
    config: systemConfig,
    loading,
    error,
    refresh,
    isLoaded: !!systemConfig && !loading
  }
}

/**
 * Hook for business configuration specifically
 * Compatible interface with legacy businessConfigService for seamless migration
 * Direct settings service integration to bypass BackwardCompatibility issues
 */
export const useBusinessConfig = () => {
  const { settings, loading, error } = useSettings()
  
  // Direct extraction from settings with fallbacks
  const vehicleRates = settings?.business?.vehicleRates || {
    'Trailer': 225,
    '6 Wheeler': 150, 
    '4 Wheeler': 100,
    '2 Wheeler': 50
  }
  
  const businessHours = settings?.business?.businessHours || {
    start: '06:00',
    end: '22:00',
    timezone: 'Asia/Kolkata'
  }
  
  const currency = settings?.business?.currency || 'INR'
  const overstayPenalty = settings?.business?.overstayPenaltyRate || 1.5
  
  // Create compatible interface for legacy components
  const getVehicleRate = (vehicleType: string): number => {
    if (!vehicleRates) return 0
    return vehicleRates[vehicleType] || 0
  }

  // Status helpers for compatibility
  const isConfigured = !!settings && !loading && !error
  const statusText = loading 
    ? 'Loading business configuration...'
    : error 
    ? `Configuration error: ${error}`
    : isConfigured 
    ? 'Business settings loaded from database'
    : 'Using default business settings'
  
  const statusIcon = loading
    ? '🔄'
    : error
    ? '❌'
    : isConfigured
    ? '🟢'
    : '🟡'
  
  // Refresh function
  const refresh = async () => {
    // This will be handled by the useSettings refresh
    log.info('Refreshing business configuration')
  }
  
  return {
    // Direct properties for legacy compatibility
    vehicleRates,
    businessHours,
    paymentTypes: ['Cash', 'Online', 'Card', 'UPI'], // TODO: Add to settings
    companyInfo: null, // TODO: Add to settings
    overstayPenalty,
    currency,
    taxRate: 18, // TODO: Add to settings
    
    // State properties
    loading,
    error,
    isConfigured,
    lastUpdated: new Date(),
    
    // Helper methods
    refresh,
    getVehicleRate,
    
    // Status helpers
    isReady: !loading && !error,
    statusText,
    statusIcon,
    isLoaded: !!vehicleRates && !loading
  }
}

/**
 * Hook for performance configuration specifically
 */
export const usePerformanceConfig = () => {
  const { performanceConfig, loading, error, refresh } = useCentralizedSettings()
  
  return {
    config: performanceConfig,
    loading,
    error,
    refresh,
    isLoaded: !!performanceConfig && !loading
  }
}