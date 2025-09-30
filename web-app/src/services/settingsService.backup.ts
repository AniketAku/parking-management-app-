/**
 * Settings Service
 * Comprehensive settings management with hierarchical resolution, caching, and real-time updates
 */

import { supabase } from '../lib/supabase'
import type {
  AppSetting,
  UserSetting,
  LocationSetting,
  SettingsHistory,
  SettingTemplate,
  SettingsServiceOptions,
  SettingValidationResult,
  BulkUpdateResult,
  SettingsExportData,
  SettingsImportOptions,
  SettingsChangeEvent,
  SettingsSearchOptions,
  SettingsSearchResult,
  SettingsCacheEntry,
  SettingsCacheStore,
  SettingValidationSchema,
  SettingsPermissions,
  SettingsAuditQuery,
  SettingsAuditResult,
  SettingsSubscriptionOptions,
  SettingsSubscriptionCallback,
  SettingsSubscription,
  SettingCategory,
  SettingScope,
  AllSettings,
  SettingsValidationError,
  SettingsPermissionError,
  SettingsNotFoundError
} from '../types/settings'

class SettingsService {
  private cache: SettingsCacheStore = new Map()
  private subscriptions: Map<string, SettingsSubscription> = new Map()
  private permissions: SettingsPermissions | null = null
  private defaultOptions: SettingsServiceOptions = {
    enableCache: true,
    cacheTimeout: 300000 // 5 minutes
  }

  constructor(options?: Partial<SettingsServiceOptions>) {
    this.defaultOptions = { ...this.defaultOptions, ...options }
    this.initializePermissions()
  }

  // ===================================================================
  // CORE SETTING RESOLUTION (Hierarchical: user > location > system)
  // ===================================================================

  /**
   * Get setting value with hierarchical resolution
   */
  async getSetting<T = any>(
    key: string, 
    options?: SettingsServiceOptions
  ): Promise<T | undefined> {
    const opts = { ...this.defaultOptions, ...options }
    const cacheKey = this.getCacheKey(key, opts)

    // Check cache first
    if (opts.enableCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!
      if (cached.expires_at > Date.now()) {
        return cached.value as T
      }
      this.cache.delete(cacheKey)
    }

    try {
      // Use database function for hierarchical resolution
      const { data, error } = await supabase.rpc('get_setting_value', {
        p_key: key,
        p_user_id: opts.userId || null,
        p_location_id: opts.locationId || null
      })

      if (error) {
        // If RPC function doesn't exist yet, try localStorage fallback
        console.log(`⚙️ SettingsService: RPC function not found for setting ${key}, checking localStorage fallback:`, error.message)
        const fallbackValue = this.getLocalStorageFallback(key)
        console.log(`⚙️ SettingsService: getSetting ${key} fallback result:`, fallbackValue)
        return fallbackValue as T
      }

      const value = data as T

      // Cache the result
      if (opts.enableCache && value !== undefined) {
        this.setCacheEntry(cacheKey, value, opts.cacheTimeout!)
      }

      return value
    } catch (error) {
      console.error(`Error getting setting ${key}:`, error)
      // Return undefined instead of throwing to allow UI to render
      return undefined
    }
  }

  /**
   * Get multiple settings in a single request
   */
  async getSettings<T extends Record<string, any> = Record<string, any>>(
    keys: string[],
    options?: SettingsServiceOptions
  ): Promise<Partial<T>> {
    const opts = { ...this.defaultOptions, ...options }
    const result: Partial<T> = {}

    // Try to get from cache first
    const uncachedKeys: string[] = []
    
    if (opts.enableCache) {
      for (const key of keys) {
        const cacheKey = this.getCacheKey(key, opts)
        if (this.cache.has(cacheKey)) {
          const cached = this.cache.get(cacheKey)!
          if (cached.expires_at > Date.now()) {
            result[key as keyof T] = cached.value
          } else {
            this.cache.delete(cacheKey)
            uncachedKeys.push(key)
          }
        } else {
          uncachedKeys.push(key)
        }
      }
    } else {
      uncachedKeys.push(...keys)
    }

    // Fetch uncached settings
    if (uncachedKeys.length > 0) {
      try {
        const promises = uncachedKeys.map(key => this.getSetting(key, { ...opts, enableCache: false }))
        const values = await Promise.all(promises)
        
        uncachedKeys.forEach((key, index) => {
          const value = values[index]
          if (value !== undefined) {
            result[key as keyof T] = value
            
            // Cache the result
            if (opts.enableCache) {
              const cacheKey = this.getCacheKey(key, opts)
              this.setCacheEntry(cacheKey, value, opts.cacheTimeout!)
            }
          }
        })
      } catch (error) {
        console.error('Error getting multiple settings:', error)
        throw error
      }
    }

    return result
  }

  /**
   * Get all settings for a category with strong typing
   */
  async getCategorySettings<T extends keyof AllSettings>(
    category: T,
    options?: SettingsServiceOptions
  ): Promise<Partial<AllSettings[T]>> {
    try {
      const { data: settings, error } = await supabase
        .from('app_settings')
        .select('key, value, default_value')
        .eq('category', category)
        .order('sort_order')

      if (error) {
        // If table doesn't exist yet, try localStorage fallback
        console.log(`❌ Database error for category ${category}:`, error.message)
        console.log(`🔄 Falling back to localStorage for category ${category}`)
        return this.getLocalStorageCategoryFallback(category) as Partial<AllSettings[T]>
      }

      const result: Record<string, any> = {}
      
      if (!settings || settings.length === 0) {
        // No settings found for this category yet
        console.log(`⚠️ No settings found in database for category ${category}`)
        console.log(`🔄 Falling back to localStorage for category ${category}`)
        return this.getLocalStorageCategoryFallback(category) as Partial<AllSettings[T]>
      }

      const keys = settings.map(s => s.key)
      
      // Get values with hierarchical resolution
      const values = await this.getSettings(keys, options)
      
      // Merge with defaults for missing values
      settings.forEach(setting => {
        result[setting.key] = values[setting.key] ?? setting.default_value
      })

      return result as Partial<AllSettings[T]>
    } catch (error) {
      console.error(`Error getting category settings for ${category}:`, error)
      // Return empty object instead of throwing to allow UI to render
      return {} as Partial<AllSettings[T]>
    }
  }

  // ===================================================================
  // SETTING UPDATES AND MUTATIONS
  // ===================================================================

  /**
   * Update a setting value
   */
  async setSetting(
    key: string,
    value: any,
    options?: SettingsServiceOptions
  ): Promise<void> {
    console.log(`⚙️ SettingsService: setSetting called - ${key} = ${value}`)
    const opts = { ...this.defaultOptions, ...options }

    // Validate permissions
    if (this.permissions && !(await this.checkWritePermission(key))) {
      throw new SettingsPermissionError(
        `No permission to write setting: ${key}`,
        key,
        'write'
      )
    }

    // Validate value
    const validation = await this.validateSetting(key, value)
    if (!validation.isValid) {
      throw new SettingsValidationError(
        `Validation failed for ${key}: ${validation.errors.join(', ')}`,
        key,
        value,
        null
      )
    }

    try {
      if (opts.userId) {
        // Update user setting
        await supabase
          .from('user_settings')
          .upsert({
            user_id: opts.userId,
            setting_key: key,
            value,
            app_setting_id: await this.getSettingId(key)
          })
      } else if (opts.locationId) {
        // Update location setting
        await supabase
          .from('location_settings')
          .upsert({
            location_id: opts.locationId,
            setting_key: key,
            value,
            app_setting_id: await this.getSettingId(key),
            updated_by: (await supabase.auth.getUser()).data.user?.id
          })
      } else {
        // Update system setting
        await supabase
          .from('app_settings')
          .update({
            value,
            updated_by: (await supabase.auth.getUser()).data.user?.id,
            updated_at: new Date().toISOString()
          })
          .eq('key', key)
      }

      // Clear cache
      this.invalidateCache(key, opts)

      // Update localStorage backup to prevent stale fallbacks
      try {
        const backupKey = `parking_setting_${key}`
        const backupData = {
          value,
          timestamp: new Date().toISOString(),
          scope: opts.userId ? 'user' : opts.locationId ? 'location' : 'system',
          source: 'database_success'
        }
        localStorage.setItem(backupKey, JSON.stringify(backupData))
        console.log(`✅ Updated localStorage backup for ${key} after successful database save`)
      } catch (storageError) {
        console.warn(`Failed to update localStorage backup for ${key}:`, storageError)
      }

      // Emit change event
      this.emitChangeEvent({
        key,
        new_value: value,
        category: await this.getSettingCategory(key),
        scope: opts.userId ? 'user' : opts.locationId ? 'location' : 'system',
        changed_by: (await supabase.auth.getUser()).data.user?.id || 'unknown',
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error(`Error setting ${key}:`, error)
      
      // Try localStorage fallback when database fails
      try {
        const backupKey = `parking_setting_${key}`
        const backupData = {
          value,
          timestamp: new Date().toISOString(),
          scope: opts.userId ? 'user' : opts.locationId ? 'location' : 'system'
        }
        localStorage.setItem(backupKey, JSON.stringify(backupData))
        console.log(`Saved to localStorage fallback: ${key}`)
        
        // Clear cache
        this.invalidateCache(key, opts)
        
        // Emit change event for localStorage fallback
        this.emitChangeEvent({
          key,
          new_value: value,
          category: await this.getSettingCategory(key).catch(() => 'unknown'),
          scope: opts.userId ? 'user' : opts.locationId ? 'location' : 'system',
          changed_by: 'fallback_mode',
          timestamp: new Date().toISOString()
        })
        
        return // Success with localStorage fallback
      } catch (fallbackError) {
        console.error(`localStorage fallback also failed for ${key}:`, fallbackError)
        throw error // Throw original error
      }
    }
  }

  /**
   * Bulk update multiple settings
   */
  async bulkUpdateSettings(
    settings: Record<string, any>,
    options?: SettingsServiceOptions
  ): Promise<BulkUpdateResult[]> {
    try {
      const { data, error } = await supabase.rpc('bulk_update_settings', {
        p_settings: settings,
        p_user_id: options?.userId || null,
        p_location_id: options?.locationId || null
      })

      if (error) throw error

      // Clear cache for all updated settings
      Object.keys(settings).forEach(key => {
        this.invalidateCache(key, options)
      })

      // Update localStorage backup for all settings to prevent stale fallbacks
      try {
        const timestamp = new Date().toISOString()
        Object.entries(settings).forEach(([key, value]) => {
          try {
            const backupKey = `parking_setting_${key}`
            const backupData = {
              value,
              timestamp,
              scope: options?.userId ? 'user' : options?.locationId ? 'location' : 'system',
              source: 'bulk_database_success'
            }
            localStorage.setItem(backupKey, JSON.stringify(backupData))
            console.log(`✅ Updated localStorage backup for ${key} after successful bulk save`)
          } catch (storageError) {
            console.warn(`Failed to update localStorage backup for ${key}:`, storageError)
          }
        })
      } catch (error) {
        console.warn('Error updating localStorage backups after bulk save:', error)
      }

      return data as BulkUpdateResult[]
    } catch (error) {
      console.error('Error bulk updating settings:', error)
      
      // Try localStorage fallback for all settings
      try {
        const results: BulkUpdateResult[] = []
        const timestamp = new Date().toISOString()
        
        for (const [key, value] of Object.entries(settings)) {
          try {
            const backupKey = `parking_setting_${key}`
            const backupData = {
              value,
              timestamp,
              scope: options?.userId ? 'user' : options?.locationId ? 'location' : 'system'
            }
            localStorage.setItem(backupKey, JSON.stringify(backupData))
            
            results.push({
              key,
              success: true,
              error: null
            })
            
            // Emit change event for each setting
            this.emitChangeEvent({
              key,
              new_value: value,
              category: await this.getSettingCategory(key).catch(() => 'unknown'),
              scope: options?.userId ? 'user' : options?.locationId ? 'location' : 'system',
              changed_by: 'fallback_mode',
              timestamp
            })
          } catch (settingError) {
            results.push({
              key,
              success: false,
              error: settingError instanceof Error ? settingError.message : 'Unknown error'
            })
          }
        }
        
        // Clear cache for all settings
        Object.keys(settings).forEach(key => {
          this.invalidateCache(key, options)
        })
        
        console.log(`Bulk saved to localStorage fallback: ${Object.keys(settings).length} settings`)
        return results
      } catch (fallbackError) {
        console.error(`localStorage fallback also failed for bulk update:`, fallbackError)
        throw error // Throw original error
      }
    }
  }

  /**
   * Reset setting to default value
   */
  async resetSetting(
    key: string,
    options?: SettingsServiceOptions
  ): Promise<void> {
    const opts = { ...this.defaultOptions, ...options }

    try {
      if (opts.userId) {
        // Delete user setting override
        await supabase
          .from('user_settings')
          .delete()
          .eq('user_id', opts.userId)
          .eq('setting_key', key)
      } else if (opts.locationId) {
        // Delete location setting override
        await supabase
          .from('location_settings')
          .delete()
          .eq('location_id', opts.locationId)
          .eq('setting_key', key)
      } else {
        // Reset system setting to default
        const { data: setting } = await supabase
          .from('app_settings')
          .select('default_value')
          .eq('key', key)
          .single()

        if (setting) {
          await this.setSetting(key, setting.default_value, opts)
        }
      }

      // Clear cache
      this.invalidateCache(key, opts)

    } catch (error) {
      console.error(`Error resetting setting ${key}:`, error)
      throw error
    }
  }

  // ===================================================================
  // VALIDATION AND PERMISSIONS
  // ===================================================================

  /**
   * Validate a setting value against its schema
   */
  async validateSetting(key: string, value: any): Promise<SettingValidationResult> {
    try {
      const { data: setting, error } = await supabase
        .from('app_settings')
        .select('validation_rules, enum_values, min_value, max_value, min_length, max_length, data_type')
        .eq('key', key)
        .single()

      if (error) {
        // If database is not available, skip validation (localStorage fallback mode)
        console.log(`Validation skipped for ${key} (database not available):`, error.message)
        return {
          isValid: true,
          errors: [],
          warnings: [`Validation skipped - database not available`]
        }
      }

      const errors: string[] = []
      const warnings: string[] = []

      // Type validation
      if (setting.data_type === 'number' && typeof value !== 'number') {
        errors.push(`Expected number, got ${typeof value}`)
      } else if (setting.data_type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`Expected boolean, got ${typeof value}`)
      } else if (setting.data_type === 'string' && typeof value !== 'string') {
        errors.push(`Expected string, got ${typeof value}`)
      } else if (setting.data_type === 'array' && !Array.isArray(value)) {
        errors.push(`Expected array, got ${typeof value}`)
      }

      // Range validation for numbers
      if (setting.data_type === 'number' && typeof value === 'number') {
        if (setting.min_value !== null && value < setting.min_value) {
          errors.push(`Value ${value} is below minimum ${setting.min_value}`)
        }
        if (setting.max_value !== null && value > setting.max_value) {
          errors.push(`Value ${value} is above maximum ${setting.max_value}`)
        }
      }

      // Length validation for strings
      if (setting.data_type === 'string' && typeof value === 'string') {
        if (setting.min_length && value.length < setting.min_length) {
          errors.push(`String length ${value.length} is below minimum ${setting.min_length}`)
        }
        if (setting.max_length && value.length > setting.max_length) {
          errors.push(`String length ${value.length} is above maximum ${setting.max_length}`)
        }
      }

      // Enum validation
      if (setting.enum_values && setting.enum_values.length > 0) {
        if (!setting.enum_values.includes(value)) {
          errors.push(`Value ${value} is not in allowed values: ${setting.enum_values.join(', ')}`)
        }
      }

      // JSON schema validation
      if (setting.validation_rules) {
        try {
          // Basic JSON schema validation
          const schema = setting.validation_rules as SettingValidationSchema
          const result = this.validateAgainstSchema(value, schema)
          if (!result.isValid) {
            errors.push(...result.errors)
          }
        } catch (error) {
          warnings.push(`Could not validate against schema: ${error}`)
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }

    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error}`],
        warnings: []
      }
    }
  }

  /**
   * Basic JSON schema validation
   */
  private validateAgainstSchema(value: any, schema: SettingValidationSchema): SettingValidationResult {
    const errors: string[] = []

    if (schema.type && typeof value !== schema.type) {
      errors.push(`Expected type ${schema.type}, got ${typeof value}`)
    }

    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`Value not in enum: ${schema.enum.join(', ')}`)
    }

    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`Value below minimum: ${schema.minimum}`)
    }

    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`Value above maximum: ${schema.maximum}`)
    }

    if (schema.pattern && typeof value === 'string') {
      const regex = new RegExp(schema.pattern)
      if (!regex.test(value)) {
        errors.push(`Value does not match pattern: ${schema.pattern}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    }
  }

  // ===================================================================
  // TEMPLATES AND PRESETS
  // ===================================================================

  /**
   * Get available setting templates
   */
  async getTemplates(businessType?: string): Promise<SettingTemplate[]> {
    try {
      let query = supabase
        .from('setting_templates')
        .select('*')
        .order('name')

      if (businessType) {
        query = query.contains('applicable_business_types', [businessType])
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting templates:', error)
      throw error
    }
  }

  /**
   * Apply a template
   */
  async applyTemplate(
    templateId: string,
    options?: SettingsServiceOptions
  ): Promise<BulkUpdateResult[]> {
    try {
      const { data: template, error } = await supabase
        .from('setting_templates')
        .select('template_data')
        .eq('id', templateId)
        .single()

      if (error) throw error

      return await this.bulkUpdateSettings(template.template_data, options)
    } catch (error) {
      console.error('Error applying template:', error)
      throw error
    }
  }

  // ===================================================================
  // EXPORT AND IMPORT
  // ===================================================================

  /**
   * Export settings configuration
   */
  async exportSettings(
    category?: SettingCategory,
    includeUserSettings = false,
    includeLocationSettings = false
  ): Promise<SettingsExportData> {
    try {
      let settingsQuery = supabase.from('app_settings').select('*')
      
      if (category) {
        settingsQuery = settingsQuery.eq('category', category)
      }

      const { data: settings, error: settingsError } = await settingsQuery
      if (settingsError) throw settingsError

      const { data: templates, error: templatesError } = await supabase
        .from('setting_templates')
        .select('*')

      if (templatesError) throw templatesError

      const exportData: SettingsExportData = {
        settings: settings || [],
        templates: templates || [],
        exported_at: new Date().toISOString(),
        exported_by: (await supabase.auth.getUser()).data.user?.id || 'unknown'
      }

      if (includeUserSettings) {
        const { data: userSettings } = await supabase
          .from('user_settings')
          .select('*')
        exportData.user_settings = userSettings || []
      }

      if (includeLocationSettings) {
        const { data: locationSettings } = await supabase
          .from('location_settings')
          .select('*')
        exportData.location_settings = locationSettings || []
      }

      return exportData
    } catch (error) {
      console.error('Error exporting settings:', error)
      throw error
    }
  }

  // ===================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ===================================================================

  /**
   * Subscribe to setting changes
   */
  subscribeToChanges(
    callback: SettingsSubscriptionCallback,
    options?: SettingsSubscriptionOptions
  ): SettingsSubscription {
    const subscriptionId = `settings_${Date.now()}_${Math.random()}`

    let channel = supabase.channel(`settings_${subscriptionId}`)

    // Subscribe to app_settings changes
    channel = channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'app_settings',
      filter: options?.category ? `category=eq.${options.category}` : undefined
    }, (payload) => {
      this.handleRealtimeChange(payload, callback, options)
    })

    // Subscribe to user_settings changes if needed
    if (!options?.keys || options.keys.some(key => key.includes('user_'))) {
      channel = channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_settings'
      }, (payload) => {
        this.handleRealtimeChange(payload, callback, options)
      })
    }

    channel.subscribe()

    const subscription: SettingsSubscription = {
      id: subscriptionId,
      callback,
      options,
      unsubscribe: () => {
        channel.unsubscribe()
        this.subscriptions.delete(subscriptionId)
      },
      isActive: true
    }

    this.subscriptions.set(subscriptionId, subscription)
    return subscription
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private getCacheKey(key: string, options: SettingsServiceOptions): string {
    const parts = [key]
    if (options.userId) parts.push(`user:${options.userId}`)
    if (options.locationId) parts.push(`location:${options.locationId}`)
    return parts.join('|')
  }

  private setCacheEntry(key: string, value: any, timeout: number): void {
    const entry: SettingsCacheEntry = {
      value,
      timestamp: Date.now(),
      expires_at: Date.now() + timeout,
      key,
      scope_hash: key
    }
    this.cache.set(key, entry)

    // Cleanup expired entries periodically
    if (this.cache.size > 1000) {
      this.cleanupCache()
    }
  }

  private cleanupCache(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires_at < now) {
        this.cache.delete(key)
      }
    }
  }

  private invalidateCache(settingKey: string, options?: SettingsServiceOptions): void {
    const cacheKey = this.getCacheKey(settingKey, options || {})
    this.cache.delete(cacheKey)
    
    // Also invalidate related cache entries
    for (const [key] of this.cache.entries()) {
      if (key.includes(settingKey)) {
        this.cache.delete(key)
      }
    }
  }

  private async getSettingId(key: string): Promise<string | null> {
    const { data } = await supabase
      .from('app_settings')
      .select('id')
      .eq('key', key)
      .single()

    return data?.id || null
  }

  private async getSettingCategory(key: string): Promise<SettingCategory> {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('category')
        .eq('key', key)
        .single()

      return data?.category || this.getCategoryFallback(key)
    } catch (error) {
      console.warn(`⚠️ Database error getting category for ${key}, using fallback:`, error)
      return this.getCategoryFallback(key)
    }
  }

  private getCategoryFallback(key: string): SettingCategory {
    // Business settings mapping
    const businessKeys = [
      'vehicle_rates', 'operating_hours', 'payment_methods', 'vehicle_types', 
      'entry_status_options', 'payment_status_options', 'minimum_charge_days', 
      'overstay_penalty_rate', 'overstay_threshold_hours'
    ]
    if (businessKeys.includes(key)) return 'business'
    
    // UI Theme settings mapping  
    const uiKeys = [
      'primary_color', 'secondary_color', 'success_color', 'warning_color', 
      'danger_color', 'dark_mode', 'theme_mode'
    ]
    if (uiKeys.includes(key)) return 'ui_theme'
    
    // Localization settings mapping
    const localizationKeys = [
      'currency_symbol', 'currency_code', 'default_locale', 'time_format', 'timezone'
    ]
    if (localizationKeys.includes(key)) return 'localization'
    
    // System settings mapping (includes printing/hardware)
    const systemKeys = [
      'api_timeout', 'cache_ttl', 'session_timeout', 'rate_limit_config',
      'printer_config', 'thermal_printer', 'print_queue', 'printer_profiles',
      'enable_thermal_printing', 'background_printing', 'batch_printing_enabled',
      'default_printer', 'print_settings', 'printer_calibration'
    ]
    if (systemKeys.includes(key)) return 'system'
    
    // Performance settings mapping
    const performanceKeys = [
      'monitoring_config', 'cache_strategy', 'db_optimization', 'frontend_performance'
    ]
    if (performanceKeys.includes(key)) return 'performance'
    
    // Notifications settings mapping
    const notificationKeys = [
      'email_notifications', 'push_notifications', 'sms_config', 'webhook_config',
      'alert_thresholds'
    ]
    if (notificationKeys.includes(key)) return 'notifications'
    
    // Final fallback - any unrecognized keys go to system
    return 'system'
  }

  private async checkWritePermission(key: string): Promise<boolean> {
    if (!this.permissions) return true

    try {
      const { data: setting, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', key)
        .single()

      // If table doesn't exist or other database error, allow write for initialization
      if (error) {
        console.log('Allowing write permission due to database error (likely during initialization):', error.message)
        return true
      }

      if (!setting) {
        // Setting doesn't exist yet, allow write for creation
        return true
      }

      return this.permissions.canWrite(setting)
    } catch (error) {
      // Database errors during initialization - allow write
      console.log('Allowing write permission due to database access error:', error)
      return true
    }
  }

  private emitChangeEvent(event: SettingsChangeEvent): void {
    console.log(`📡 SettingsService: Emitting change event for ${event.key}`, event)
    console.log(`📡 SettingsService: Active subscriptions: ${this.subscriptions.size}`)
    
    // Emit to all active subscriptions
    for (const subscription of this.subscriptions.values()) {
      if (subscription.isActive && subscription.callback) {
        try {
          // Check if this subscription should receive this event
          const keyMatches = !subscription.options?.keys || subscription.options.keys.includes(event.key)
          const categoryMatches = !subscription.options?.category || subscription.options.category === event.category
          const shouldEmit = keyMatches && categoryMatches
          
          console.log(`📡 SettingsService: Subscription ${subscription.id} shouldEmit: ${shouldEmit}`)
          
          if (shouldEmit) {
            console.log(`📡 SettingsService: Calling subscription callback for ${event.key}`)
            subscription.callback(event)
          }
        } catch (error) {
          console.error('Error emitting change event to subscription:', error)
        }
      }
    }
  }

  private handleRealtimeChange(
    payload: any,
    callback: SettingsSubscriptionCallback,
    options?: SettingsSubscriptionOptions
  ): void {
    // Convert Supabase payload to our event format
    const event: SettingsChangeEvent = {
      key: payload.new?.key || payload.old?.key,
      old_value: payload.old?.value,
      new_value: payload.new?.value,
      category: payload.new?.category || 'system',
      scope: 'system', // Would need to determine based on table
      changed_by: payload.new?.updated_by || 'unknown',
      timestamp: new Date().toISOString()
    }

    // Apply filters if specified
    if (options?.keys && !options.keys.includes(event.key)) {
      return
    }

    if (options?.category && event.category !== options.category) {
      return
    }

    callback(event)
  }

  private initializePermissions(): void {
    // Initialize default permissions - would be expanded based on user role
    this.permissions = {
      canRead: () => true,
      canWrite: (setting) => {
        // Allow system settings write during initialization or for admin users
        // For now, allow all writes to enable settings initialization
        return true
      },
      canDelete: () => false,
      canExport: () => true,
      canImport: () => true, // Allow imports for settings initialization
      canManageTemplates: () => false
    }
  }

  /**
   * Get setting from localStorage fallback (used when database is not available)
   */
  private getLocalStorageFallback(key: string): any {
    try {
      const backupKey = `parking_setting_${key}`
      const stored = localStorage.getItem(backupKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        console.log(`🔄 Found localStorage fallback for ${key}:`, parsed.value, `(source: ${parsed.source || 'unknown'})`)
        return parsed.value
      } else {
        // Try default values as final fallback
        const defaultSettings = this.getDefaultSettings()
        if (defaultSettings[key] !== undefined) {
          console.log(`🔄 Using default fallback for ${key}:`, defaultSettings[key])
          return defaultSettings[key]
        }
        console.log(`⚠️ No fallback found for ${key}`)
      }
    } catch (error) {
      console.warn(`❌ Error reading localStorage fallback for ${key}:`, error)
    }
    return undefined
  }

  /**
   * Get all settings for a category from localStorage fallback
   */
  private getLocalStorageCategoryFallback(category: string): Record<string, any> {
    const result: Record<string, any> = {}
    let foundFromStorage = false

    // Known settings by category (from the initializer)
    const categorySettings = this.getKnownSettingsByCategory(category)
    const defaultSettings = this.getDefaultSettings()
    
    for (const key of categorySettings) {
      const value = this.getLocalStorageFallback(key)
      if (value !== undefined) {
        result[key] = value
        foundFromStorage = true
      } else if (defaultSettings[key] !== undefined) {
        // Use default value as final fallback
        result[key] = defaultSettings[key]
        console.log(`🔄 Using default fallback for ${key}:`, defaultSettings[key])
      }
    }

    if (foundFromStorage) {
      console.log(`🔄 Found localStorage fallback for category ${category}:`, Object.keys(result))
    } else if (Object.keys(result).length > 0) {
      console.log(`🔄 Using default fallbacks for category ${category}:`, Object.keys(result))
    } else {
      console.log(`⚠️ No fallback found for category ${category}`)
    }

    return result
  }

  /**
   * Get default settings values - these are used as final fallbacks
   */
  private getDefaultSettings(): Record<string, any> {
    return {
      // Business Settings
      'vehicle_rates': {
        'Trailer': 225,
        '6 Wheeler': 150,
        '4 Wheeler': 100,
        '2 Wheeler': 50
      },
      'minimum_charge_days': 1,
      'operating_hours': {
        start: '06:00',
        end: '22:00',
        timezone: 'Asia/Kolkata'
      },
      'overstay_penalty_rate': 1.5,
      'overstay_threshold_hours': 24,
      'payment_methods': ['Cash', 'UPI', 'Card', 'Net Banking'],
      'vehicle_types': ['Trailer', '6 Wheeler', '4 Wheeler', '2 Wheeler'],
      'entry_status_options': ['Active', 'Exited', 'Overstay', 'Lost Ticket'],
      'payment_status_options': ['Paid', 'Pending', 'Partial', 'Refunded'],

      // UI Theme Settings
      'primary_color': '#2563eb',
      'secondary_color': '#64748b',
      'success_color': '#10b981',
      'warning_color': '#f59e0b',
      'danger_color': '#ef4444',
      'dark_mode': false,
      'theme_mode': 'auto',

      // Localization Settings
      'currency_symbol': '₹',
      'currency_code': 'INR',
      'default_locale': 'en-IN',
      'time_format': '24h',
      'timezone': 'Asia/Kolkata'
    }
  }

  /**
   * Get known settings keys by category
   */
  private getKnownSettingsByCategory(category: string): string[] {
    const settingsMap: Record<string, string[]> = {
      'business': [
        'vehicle_rates', 'overstay_penalty_rate', 'overstay_threshold_hours', 
        'minimum_charge_days', 'operating_hours', 'payment_methods', 
        'vehicle_types', 'entry_status_options', 'payment_status_options'
      ],
      'ui_theme': [
        'primary_color', 'secondary_color', 'success_color', 
        'warning_color', 'danger_color', 'dark_mode', 'theme_mode'
      ],
      'localization': [
        'currency_symbol', 'currency_code', 'default_locale', 
        'time_format', 'timezone'
      ],
      'system': [],
      'performance': [],
      'notifications': [],
      'reporting': [],
      'security': [],
      'validation': [],
      'user_mgmt': []
    }

    return settingsMap[category] || []
  }

  /**
   * Clear all cached settings
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // Would track hits vs misses in real implementation
    }
  }
}

// Export singleton instance
export const settingsService = new SettingsService()
export default settingsService