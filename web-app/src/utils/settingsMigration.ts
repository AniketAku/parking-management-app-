import { settingsService } from '../services/settingsService'
import type { Setting, SettingCategory } from '../types/settings'
import { log } from './secureLogger'

/**
 * Settings Migration Utility
 * Centralizes hard-coded configurations into the comprehensive settings system
 * while maintaining backward compatibility
 */

// Hard-coded values that need to be migrated to centralized settings
const LEGACY_VEHICLE_RATES = {
  'Trailer': 225,
  '6 Wheeler': 150,
  '4 Wheeler': 100,
  '2 Wheeler': 50
}

const LEGACY_SUPABASE_CONFIG = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
}

const LEGACY_UI_THEME = {
  darkMode: 'class',
  primaryColors: {
    50: '#f0f5ff',
    500: '#2A5C8F',
    600: '#1e4a7a'
  },
  animations: {
    duration: '0.3s',
    easing: 'ease-out'
  }
}

const LEGACY_VALIDATION_RULES = {
  vehicleNumber: {
    pattern: '^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$',
    minLength: 4,
    maxLength: 15
  },
  transportName: {
    minLength: 2,
    maxLength: 100
  },
  driverName: {
    minLength: 2,
    maxLength: 50
  }
}

const LEGACY_SYSTEM_CONFIG = {
  api: {
    timeout: 30000,
    retryAttempts: 3,
    cacheTimeout: 300000
  },
  performance: {
    debounceDelay: 300,
    searchThreshold: 3,
    paginationSize: 50
  },
  security: {
    sessionTimeout: 3600000,
    passwordMinLength: 8,
    maxLoginAttempts: 5
  }
}

// Default settings structure for migration
const DEFAULT_SETTINGS: Omit<Setting, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>[] = [
  // Business Settings
  {
    key: 'vehicle_rates',
    category: 'business',
    level: 'location',
    value: LEGACY_VEHICLE_RATES,
    data_type: 'json',
    description: 'Daily parking rates by vehicle type (in INR)',
    validation: {
      required: true,
      custom: (value: any) => {
        if (typeof value !== 'object' || Array.isArray(value)) {
          return 'Vehicle rates must be an object'
        }
        for (const [type, rate] of Object.entries(value)) {
          if (typeof rate !== 'number' || rate < 0) {
            return `Invalid rate for ${type}: must be a positive number`
          }
        }
        return true
      }
    }
  },
  {
    key: 'business_hours',
    category: 'business',
    level: 'location',
    value: { start: '06:00', end: '22:00', timezone: 'Asia/Kolkata' },
    data_type: 'json',
    description: 'Business operating hours',
    validation: { required: true }
  },
  {
    key: 'currency',
    category: 'business',
    level: 'location',
    value: 'INR',
    data_type: 'string',
    description: 'Default currency for pricing',
    validation: { required: true, maxLength: 3 }
  },
  {
    key: 'overstay_penalty_rate',
    category: 'business',
    level: 'location',
    value: 1.5,
    data_type: 'number',
    description: 'Penalty multiplier for overstay charges',
    validation: { required: true, min: 1.0, max: 5.0 }
  },

  // System Configuration
  {
    key: 'api_timeout',
    category: 'system',
    level: 'system',
    value: LEGACY_SYSTEM_CONFIG.api.timeout,
    data_type: 'number',
    description: 'API request timeout in milliseconds',
    validation: { required: true, min: 1000, max: 60000 }
  },
  {
    key: 'retry_attempts',
    category: 'system',
    level: 'system',
    value: LEGACY_SYSTEM_CONFIG.api.retryAttempts,
    data_type: 'number',
    description: 'Number of retry attempts for failed API calls',
    validation: { required: true, min: 0, max: 10 }
  },
  {
    key: 'cache_timeout',
    category: 'system',
    level: 'system',
    value: LEGACY_SYSTEM_CONFIG.api.cacheTimeout,
    data_type: 'number',
    description: 'Cache timeout in milliseconds',
    validation: { required: true, min: 30000, max: 3600000 }
  },
  {
    key: 'supabase_config',
    category: 'system',
    level: 'system',
    value: LEGACY_SUPABASE_CONFIG,
    data_type: 'json',
    description: 'Supabase client configuration',
    validation: { required: true }
  },

  // UI Theme Settings
  {
    key: 'dark_mode_enabled',
    category: 'ui_theme',
    level: 'user',
    value: true,
    data_type: 'boolean',
    description: 'Enable dark mode theme',
    validation: { required: true }
  },
  {
    key: 'primary_color_scheme',
    category: 'ui_theme',
    level: 'location',
    value: LEGACY_UI_THEME.primaryColors,
    data_type: 'json',
    description: 'Primary color scheme configuration',
    validation: { required: true }
  },
  {
    key: 'animation_settings',
    category: 'ui_theme',
    level: 'user',
    value: LEGACY_UI_THEME.animations,
    data_type: 'json',
    description: 'UI animation preferences',
    validation: { required: true }
  },
  {
    key: 'compact_mode',
    category: 'ui_theme',
    level: 'user',
    value: false,
    data_type: 'boolean',
    description: 'Enable compact UI layout',
    validation: { required: true }
  },

  // Validation Rules
  {
    key: 'vehicle_number_validation',
    category: 'validation',
    level: 'location',
    value: LEGACY_VALIDATION_RULES.vehicleNumber,
    data_type: 'json',
    description: 'Vehicle number format validation rules',
    validation: { required: true }
  },
  {
    key: 'transport_name_validation',
    category: 'validation',
    level: 'location',
    value: LEGACY_VALIDATION_RULES.transportName,
    data_type: 'json',
    description: 'Transport company name validation rules',
    validation: { required: true }
  },
  {
    key: 'driver_name_validation',
    category: 'validation',
    level: 'user',
    value: LEGACY_VALIDATION_RULES.driverName,
    data_type: 'json',
    description: 'Driver name validation rules',
    validation: { required: true }
  },

  // Performance Settings
  {
    key: 'debounce_delay',
    category: 'performance',
    level: 'system',
    value: LEGACY_SYSTEM_CONFIG.performance.debounceDelay,
    data_type: 'number',
    description: 'Input debounce delay in milliseconds',
    validation: { required: true, min: 100, max: 1000 }
  },
  {
    key: 'search_threshold',
    category: 'performance',
    level: 'user',
    value: LEGACY_SYSTEM_CONFIG.performance.searchThreshold,
    data_type: 'number',
    description: 'Minimum characters before triggering search',
    validation: { required: true, min: 1, max: 10 }
  },
  {
    key: 'pagination_size',
    category: 'performance',
    level: 'user',
    value: LEGACY_SYSTEM_CONFIG.performance.paginationSize,
    data_type: 'number',
    description: 'Number of items per page in lists',
    validation: { required: true, min: 10, max: 200 }
  },

  // Security Settings
  {
    key: 'session_timeout',
    category: 'security',
    level: 'system',
    value: LEGACY_SYSTEM_CONFIG.security.sessionTimeout,
    data_type: 'number',
    description: 'User session timeout in milliseconds',
    validation: { required: true, min: 600000, max: 86400000 }
  },
  {
    key: 'password_min_length',
    category: 'security',
    level: 'system',
    value: LEGACY_SYSTEM_CONFIG.security.passwordMinLength,
    data_type: 'number',
    description: 'Minimum password length requirement',
    validation: { required: true, min: 6, max: 32 }
  },
  {
    key: 'max_login_attempts',
    category: 'security',
    level: 'system',
    value: LEGACY_SYSTEM_CONFIG.security.maxLoginAttempts,
    data_type: 'number',
    description: 'Maximum failed login attempts before lockout',
    validation: { required: true, min: 3, max: 10 }
  },

  // User Management Settings
  {
    key: 'default_user_role',
    category: 'user_management',
    level: 'location',
    value: 'operator',
    data_type: 'string',
    description: 'Default role assigned to new users',
    validation: { 
      required: true,
      pattern: '^(admin|manager|operator|viewer)$' 
    }
  },
  {
    key: 'user_registration_enabled',
    category: 'user_management',
    level: 'system',
    value: false,
    data_type: 'boolean',
    description: 'Allow user self-registration',
    validation: { required: true }
  },

  // Notification Settings
  {
    key: 'email_notifications_enabled',
    category: 'notifications',
    level: 'user',
    value: true,
    data_type: 'boolean',
    description: 'Enable email notifications',
    validation: { required: true }
  },
  {
    key: 'notification_sound_enabled',
    category: 'notifications',
    level: 'user',
    value: false,
    data_type: 'boolean',
    description: 'Enable notification sounds',
    validation: { required: true }
  },

  // Reporting Settings
  {
    key: 'default_report_period',
    category: 'reporting',
    level: 'user',
    value: '7days',
    data_type: 'string',
    description: 'Default time period for reports',
    validation: { 
      required: true,
      pattern: '^(1day|7days|30days|90days|1year)$' 
    }
  },
  {
    key: 'export_format_preference',
    category: 'reporting',
    level: 'user',
    value: 'xlsx',
    data_type: 'string',
    description: 'Preferred format for data exports',
    validation: { 
      required: true,
      pattern: '^(csv|xlsx|pdf)$' 
    }
  },

  // Localization Settings
  {
    key: 'default_language',
    category: 'localization',
    level: 'location',
    value: 'en',
    data_type: 'string',
    description: 'Default application language',
    validation: { 
      required: true,
      pattern: '^(en|hi|mr|gu|ta|te|kn|ml)$' 
    }
  },
  {
    key: 'date_format',
    category: 'localization',
    level: 'user',
    value: 'DD/MM/YYYY',
    data_type: 'string',
    description: 'Preferred date display format',
    validation: { 
      required: true,
      pattern: '^(DD/MM/YYYY|MM/DD/YYYY|YYYY-MM-DD)$' 
    }
  },
  {
    key: 'time_format',
    category: 'localization',
    level: 'user',
    value: '24h',
    data_type: 'string',
    description: 'Time display format preference',
    validation: { 
      required: true,
      pattern: '^(12h|24h)$' 
    }
  }
]

/**
 * Migration functions
 */

export class SettingsMigration {
  /**
   * Check if migration is needed
   */
  static async isMigrationNeeded(): Promise<boolean> {
    try {
      const existingSettings = await settingsService.getAllSettings()
      
      // Check if core business settings exist
      const vehicleRatesSetting = existingSettings.find(s => s.key === 'vehicle_rates')
      if (!vehicleRatesSetting) {
        return true
      }
      
      // Check if we have all essential categories
      const categories = new Set(existingSettings.map(s => s.category))
      const requiredCategories: SettingCategory[] = [
        'business', 'system', 'ui_theme', 'validation', 'security'
      ]
      
      for (const category of requiredCategories) {
        if (!categories.has(category)) {
          return true
        }
      }
      
      return false
    } catch (error) {
      log.error('Error checking migration status', error)
      return true // Assume migration needed if we can't check
    }
  }

  /**
   * Perform the migration to centralized settings
   */
  static async migrateLegacySettings(): Promise<void> {
    try {
      log.info('Starting settings migration')
      
      const existingSettings = await settingsService.getAllSettings()
      const existingKeys = new Set(existingSettings.map(s => s.key))
      
      let migratedCount = 0
      let updatedCount = 0
      
      for (const defaultSetting of DEFAULT_SETTINGS) {
        if (existingKeys.has(defaultSetting.key)) {
          // Update existing setting if value has changed
          const existing = existingSettings.find(s => s.key === defaultSetting.key)
          if (existing && JSON.stringify(existing.value) !== JSON.stringify(defaultSetting.value)) {
            await settingsService.updateSetting(
              defaultSetting.key,
              defaultSetting.value,
              defaultSetting.level
            )
            updatedCount++
            log.success('Updated setting', { key: defaultSetting.key })
          }
        } else {
          // Create new setting
          await settingsService.createSetting(defaultSetting)
          migratedCount++
          log.success('Created setting', { key: defaultSetting.key })
        }
      }

      log.success('Migration completed', { created: migratedCount, updated: updatedCount })
      
      // Create audit log entry
      await settingsService.createAuditEntry({
        action: 'bulk_migration',
        settings_affected: DEFAULT_SETTINGS.map(s => s.key),
        details: `Migrated ${migratedCount} new settings, updated ${updatedCount} existing settings`,
        user_id: 'system'
      })

    } catch (error) {
      log.error('Settings migration failed', error)
      throw new Error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Backup current settings before migration
   */
  static async backupCurrentSettings(): Promise<string> {
    try {
      const settings = await settingsService.getAllSettings()
      const backup = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        settings: settings,
        metadata: {
          total_settings: settings.length,
          categories: [...new Set(settings.map(s => s.category))]
        }
      }

      // Store in localStorage as fallback
      const backupKey = `settings-backup-${Date.now()}`
      localStorage.setItem(backupKey, JSON.stringify(backup))

      log.success('Settings backup created', { backupKey })
      return backupKey
    } catch (error) {
      log.error('Failed to create settings backup', error)
      throw new Error('Backup creation failed')
    }
  }

  /**
   * Restore settings from backup
   */
  static async restoreFromBackup(backupKey: string): Promise<void> {
    try {
      const backupData = localStorage.getItem(backupKey)
      if (!backupData) {
        throw new Error('Backup not found')
      }

      const backup = JSON.parse(backupData)
      if (!backup.settings || !Array.isArray(backup.settings)) {
        throw new Error('Invalid backup format')
      }

      // Clear existing settings and restore from backup
      log.info('Restoring settings from backup')

      for (const setting of backup.settings) {
        await settingsService.createSetting(setting)
      }

      log.success('Restored settings from backup', { count: backup.settings.length })
      
      // Create audit log entry
      await settingsService.createAuditEntry({
        action: 'restore_backup',
        settings_affected: backup.settings.map((s: Setting) => s.key),
        details: `Restored settings from backup: ${backupKey}`,
        user_id: 'system'
      })

    } catch (error) {
      log.error('Backup restoration failed', error)
      throw new Error(`Restoration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate migrated settings
   */
  static async validateMigratedSettings(): Promise<boolean> {
    try {
      const settings = await settingsService.getAllSettings()

      // Check all required settings exist
      for (const defaultSetting of DEFAULT_SETTINGS) {
        const exists = settings.find(s => s.key === defaultSetting.key)
        if (!exists) {
          log.error('Missing required setting', { key: defaultSetting.key })
          return false
        }

        // Validate setting value if validation rules exist
        if (defaultSetting.validation && exists.validation) {
          const isValid = await settingsService.validateSetting(exists)
          if (!isValid) {
            log.error('Invalid setting value', { key: defaultSetting.key })
            return false
          }
        }
      }

      log.success('All migrated settings validated successfully')
      return true
    } catch (error) {
      log.error('Settings validation failed', error)
      return false
    }
  }
}

/**
 * Backward compatibility helpers
 */

export class BackwardCompatibility {
  private static _migrationCache = new Map<string, any>()
  private static _failedSettings = new Set<string>()
  private static _isInitialized = false

  /**
   * Initialize the backward compatibility system
   */
  static async initialize(): Promise<boolean> {
    try {
      log.info('Initializing BackwardCompatibility system')

      // Test basic settings service connectivity
      const testValue = await settingsService.getSetting('test_connectivity')
      log.success('Settings service connectivity test completed')

      this._isInitialized = true
      return true
    } catch (error) {
      log.warn('BackwardCompatibility initialization failed, using fallback mode', error)
      this._isInitialized = false
      return false
    }
  }

  /**
   * Get setting value with fallback to legacy hard-coded values
   * Enhanced with error handling and retry logic
   */
  static async getSettingWithFallback(
    key: string, 
    fallbackValue?: any,
    options: {
      timeout?: number
      retries?: number
      skipCache?: boolean
    } = {}
  ): Promise<any> {
    const { timeout = 5000, retries = 2, skipCache = false } = options

    try {
      // Quick return for failed settings to avoid repeated failures
      if (this._failedSettings.has(key)) {
        log.debug('Quick fallback for previously failed setting', { key })
        return fallbackValue || this.getLegacyValue(key)
      }

      // Check cache first (unless skipping)
      if (!skipCache && this._migrationCache.has(key)) {
        const cachedValue = this._migrationCache.get(key)
        log.debug('Cache hit for setting', { key })
        return cachedValue
      }

      // Try to get from settings service with timeout and retries
      let lastError: Error | null = null
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          log.debug('Fetching setting', { key, attempt: attempt + 1, totalAttempts: retries + 1 })

          const value = await this.withTimeout(
            settingsService.getSetting('validation', key),
            timeout,
            `Setting fetch timeout for ${key}`
          )

          if (value !== null && value !== undefined) {
            log.success('Successfully loaded setting from service', { key })
            this._migrationCache.set(key, value)
            return value
          }

          // Setting exists but is null/undefined
          log.warn('Setting exists but has null/undefined value', { key })
          break

        } catch (error) {
          lastError = error as Error
          log.warn('Setting fetch attempt failed', { key, attempt: attempt + 1, error })

          if (attempt < retries) {
            // Wait before retry (exponential backoff)
            await this.delay(Math.pow(2, attempt) * 100)
          }
        }
      }

      // All attempts failed, mark as failed and use fallback
      if (lastError) {
        this._failedSettings.add(key)
        log.warn('All attempts failed for setting, using fallback', { key })
      }

      // Try legacy values
      const legacyValue = this.getLegacyValue(key)
      if (legacyValue !== undefined) {
        log.info('Using legacy value for setting', { key })
        this._migrationCache.set(key, legacyValue)
        return legacyValue
      }

      // Final fallback
      log.debug('Using provided fallback for setting', { key })
      const finalValue = fallbackValue !== undefined ? fallbackValue : null
      this._migrationCache.set(key, finalValue)
      return finalValue

    } catch (error) {
      log.error('Critical error in getSettingWithFallback', { key, error })

      // Emergency fallback
      const emergencyValue = fallbackValue !== undefined
        ? fallbackValue
        : this.getLegacyValue(key)

      if (emergencyValue !== undefined) {
        log.warn('Emergency fallback activated', { key })
        return emergencyValue
      }

      log.error('No fallback available for setting', { key })
      return null
    }
  }

  /**
   * Utility function to add timeout to promises
   */
  private static withTimeout<T>(promise: Promise<T>, ms: number, description: string): Promise<T> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${description} (${ms}ms)`)), ms)
    )
    return Promise.race([promise, timeout])
  }

  /**
   * Utility function for delays
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get legacy hard-coded values for backward compatibility
   */
  private static getLegacyValue(key: string): any {
    const legacyValues: Record<string, any> = {
      'vehicle_rates': LEGACY_VEHICLE_RATES,
      'supabase_config': LEGACY_SUPABASE_CONFIG,
      'primary_color_scheme': LEGACY_UI_THEME.primaryColors,
      'animation_settings': LEGACY_UI_THEME.animations,
      'vehicle_number_validation': LEGACY_VALIDATION_RULES.vehicleNumber,
      'transport_name_validation': LEGACY_VALIDATION_RULES.transportName,
      'driver_name_validation': LEGACY_VALIDATION_RULES.driverName,
      'api_timeout': LEGACY_SYSTEM_CONFIG.api.timeout,
      'retry_attempts': LEGACY_SYSTEM_CONFIG.api.retryAttempts,
      'cache_timeout': LEGACY_SYSTEM_CONFIG.api.cacheTimeout,
      'debounce_delay': LEGACY_SYSTEM_CONFIG.performance.debounceDelay,
      'search_threshold': LEGACY_SYSTEM_CONFIG.performance.searchThreshold,
      'pagination_size': LEGACY_SYSTEM_CONFIG.performance.paginationSize,
      'session_timeout': LEGACY_SYSTEM_CONFIG.security.sessionTimeout,
      'password_min_length': LEGACY_SYSTEM_CONFIG.security.passwordMinLength,
      'max_login_attempts': LEGACY_SYSTEM_CONFIG.security.maxLoginAttempts
    }
    
    return legacyValues[key]
  }

  /**
   * Clear migration cache
   */
  static clearCache(): void {
    log.info('Clearing settings cache')
    this._migrationCache.clear()
    this._failedSettings.clear()
  }

  /**
   * Get system health information
   */
  static getHealthInfo(): {
    isInitialized: boolean
    cacheSize: number
    failedSettingsCount: number
    failedSettings: string[]
  } {
    return {
      isInitialized: this._isInitialized,
      cacheSize: this._migrationCache.size,
      failedSettingsCount: this._failedSettings.size,
      failedSettings: Array.from(this._failedSettings)
    }
  }

  /**
   * Reset failed settings to allow retry
   */
  static resetFailedSettings(keys?: string[]): void {
    if (keys) {
      keys.forEach(key => this._failedSettings.delete(key))
      log.info('Reset failed status for settings', { keys: keys.join(', ') })
    } else {
      this._failedSettings.clear()
      log.info('Reset all failed settings status')
    }
  }

  /**
   * Preload commonly used settings with enhanced error handling
   */
  static async preloadSettings(keys: string[], options: {
    timeout?: number
    parallel?: boolean
    continueOnError?: boolean
  } = {}): Promise<{
    successful: string[]
    failed: string[]
    errors: Record<string, string>
  }> {
    const { timeout = 3000, parallel = true, continueOnError = true } = options
    const successful: string[] = []
    const failed: string[] = []
    const errors: Record<string, string> = {}

    try {
      log.info('Preloading settings', { count: keys.length, parallel })

      if (parallel) {
        // Load all settings in parallel
        const results = await Promise.allSettled(
          keys.map(async key => {
            try {
              await this.getSettingWithFallback(key, undefined, { timeout })
              return { key, success: true }
            } catch (error) {
              return { key, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
            }
          })
        )

        results.forEach(result => {
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              successful.push(result.value.key)
            } else {
              failed.push(result.value.key)
              errors[result.value.key] = result.value.error || 'Unknown error'
            }
          } else {
            failed.push('unknown')
            errors['unknown'] = result.reason
          }
        })
      } else {
        // Load settings sequentially
        for (const key of keys) {
          try {
            await this.getSettingWithFallback(key, undefined, { timeout })
            successful.push(key)
          } catch (error) {
            failed.push(key)
            errors[key] = error instanceof Error ? error.message : 'Unknown error'

            if (!continueOnError) {
              log.error('Preload stopped due to error', { key, error })
              break
            }
          }
        }
      }

      log.success('Preload completed', { successful: successful.length, failed: failed.length })

      if (failed.length > 0) {
        log.warn('Failed to preload settings', { failed })
      }

      return { successful, failed, errors }

    } catch (error) {
      log.error('Critical error during settings preload', error)
      return {
        successful,
        failed: keys,
        errors: { 'preload_error': error instanceof Error ? error.message : 'Critical preload error' }
      }
    }
  }

  /**
   * Test connectivity to settings service
   */
  static async testConnectivity(): Promise<{
    success: boolean
    responseTime: number
    error?: string
  }> {
    const startTime = Date.now()

    try {
      await this.withTimeout(
        settingsService.getSetting('connectivity_test'),
        2000,
        'Connectivity test timeout'
      )

      const responseTime = Date.now() - startTime
      log.success('Settings service connectivity test passed', { responseTime })

      return { success: true, responseTime }
    } catch (error) {
      const responseTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown connectivity error'

      log.warn('Settings service connectivity test failed', { responseTime, error: errorMessage })

      return { success: false, responseTime, error: errorMessage }
    }
  }
}