/**
 * NEW SIMPLIFIED SETTINGS SERVICE
 * Direct database integration with proper error handling
 * Replaces complex hierarchical settings system
 */

import { supabase } from '../lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'
import { validateSetting, formatValidationErrors } from '../utils/settingsValidation'
import { log } from '../utils/secureLogger'

// ================================================
// TYPE DEFINITIONS
// ================================================

export interface AppConfigRow {
  id: string
  category: string
  key: string
  value: any // JSONB value
  description?: string
  is_system: boolean
  sort_order: number
  created_at: string
  updated_at: string
  updated_by?: string
}

export interface BusinessSettings {
  vehicle_rates: { [vehicleType: string]: number }
  vehicle_types: string[]
  operating_hours: {
    start: string
    end: string
    timezone: string
  }
  payment_methods: string[]
  entry_status_options: string[]
  payment_status_options: string[]
  minimum_charge_days: number
  overstay_penalty_rate: number
  overstay_threshold_hours: number
  currency_code: string
  tax_rate: number
}

export interface UIThemeSettings {
  primary_color: string
  secondary_color: string
  success_color: string
  warning_color: string
  danger_color: string
  dark_mode: boolean
  theme_mode: 'light' | 'dark' | 'auto'
}

export interface SystemSettings {
  app_name: string
  app_version: string
  max_parking_duration_hours: number
  auto_exit_enabled: boolean
  backup_retention_days: number
  maintenance_mode: boolean
}

export interface LocalizationSettings {
  currency_symbol: string
  currency_code: string
  default_locale: string
  time_format: '12h' | '24h'
  timezone: string
  date_format: string
}

export type SettingCategory = 'business' | 'ui_theme' | 'system' | 'localization' | 'validation'

export interface SettingsServiceOptions {
  useCache?: boolean
  throwOnError?: boolean
}

// ================================================
// SETTINGS SERVICE CLASS
// ================================================

class NewSettingsService {
  private cache = new Map<string, { value: any; timestamp: number }>()
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes
  private realtimeChannels = new Map<string, RealtimeChannel>()
  private subscribers = new Map<string, Set<(data: any) => void>>()

  // ================================================
  // CORE METHODS
  // ================================================

  /**
   * Get a single setting value by category and key
   */
  async getSetting<T = any>(
    category: SettingCategory,
    key: string,
    options: SettingsServiceOptions = {}
  ): Promise<T | null> {
    const cacheKey = `${category}.${key}`

    try {
      // Check cache first
      if (options.useCache !== false) {
        const cached = this.getCachedValue<T>(cacheKey)
        if (cached !== null) return cached
      }

      // Query database
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('category', category)
        .eq('key', key)
        .single()

      if (error) {
        log.error('Failed to get setting', { setting: cacheKey, error: error.message })
        if (options.throwOnError) throw error
        return null
      }

      if (!data) {
        log.warn('Setting not found in database', { setting: cacheKey })
        return null
      }

      // Parse JSONB value and cache
      const value = this.parseJsonValue<T>(data.value)
      this.setCachedValue(cacheKey, value)
      
      return value
    } catch (error) {
      log.error('Error getting setting', { setting: cacheKey, error })
      if (options.throwOnError) throw error
      return null
    }
  }

  /**
   * Get all settings for a category
   */
  async getCategorySettings<T extends Record<string, any>>(
    category: SettingCategory,
    options: SettingsServiceOptions = {}
  ): Promise<Partial<T>> {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('key, value')
        .eq('category', category)
        .order('sort_order')

      if (error) {
        log.error('Failed to get category settings', { category, error: error.message })
        if (options.throwOnError) throw error
        return {}
      }

      if (!data || data.length === 0) {
        log.warn('No settings found for category', { category })
        return {}
      }

      // Convert to object and cache individual values
      const result: Record<string, any> = {}
      
      data.forEach(row => {
        const value = this.parseJsonValue(row.value)
        result[row.key] = value
        
        // Cache individual settings
        if (options.useCache !== false) {
          this.setCachedValue(`${category}.${row.key}`, value)
        }
      })

      log.success('Successfully loaded category settings', { category, count: data.length })
      return result as Partial<T>
    } catch (error) {
      log.error('Error getting category settings', { category, error })
      if (options.throwOnError) throw error
      return {}
    }
  }

  /**
   * Update a single setting with validation
   */
  async updateSetting(
    category: SettingCategory,
    key: string,
    value: any,
    options: SettingsServiceOptions = {}
  ): Promise<boolean> {
    try {
      // Validate the setting value
      const validationResult = validateSetting(category, key, value)

      if (!validationResult.isValid) {
        const errorMessage = `Validation failed for ${category}.${key}: ${formatValidationErrors(validationResult.errors)}`
        log.error(errorMessage, { category, key, errors: validationResult.errors })

        if (options.throwOnError) {
          throw new Error(errorMessage)
        }
        return false
      }

      // Use sanitized value if available (e.g., rounded numbers, trimmed strings)
      const finalValue = validationResult.sanitizedValue !== undefined
        ? validationResult.sanitizedValue
        : value

      // Serialize value for JSONB storage
      const jsonValue = this.serializeValue(finalValue)

      const { error } = await supabase
        .from('app_config')
        .update({
          value: jsonValue,
          updated_at: new Date().toISOString()
        })
        .eq('category', category)
        .eq('key', key)

      if (error) {
        log.error('Failed to update setting', { category, key, error: error.message })
        if (options.throwOnError) throw error
        return false
      }

      // Update cache and notify subscribers with final value
      const cacheKey = `${category}.${key}`
      this.setCachedValue(cacheKey, finalValue)
      this.notifySubscribers(category, { [key]: finalValue })

      log.success('Updated setting', { setting: cacheKey, validated: true })
      return true
    } catch (error) {
      log.error('Error updating setting', { category, key, error })
      if (options.throwOnError) throw error
      return false
    }
  }

  /**
   * Update multiple settings in a category with validation
   */
  async updateCategorySettings(
    category: SettingCategory,
    settings: Record<string, any>,
    options: SettingsServiceOptions = {}
  ): Promise<boolean> {
    try {
      const validatedUpdates: Array<{ category: string; key: string; value: any; updated_at: string }> = []
      const validatedSettings: Record<string, any> = {}
      const allErrors: string[] = []

      // Validate all settings first
      for (const [key, value] of Object.entries(settings)) {
        const validationResult = validateSetting(category, key, value)

        if (!validationResult.isValid) {
          const errorMessage = `${key}: ${formatValidationErrors(validationResult.errors)}`
          allErrors.push(errorMessage)
          continue
        }

        // Use sanitized value if available
        const finalValue = validationResult.sanitizedValue !== undefined
          ? validationResult.sanitizedValue
          : value

        validatedUpdates.push({
          category,
          key,
          value: this.serializeValue(finalValue),
          updated_at: new Date().toISOString()
        })

        validatedSettings[key] = finalValue
      }

      // If any validation errors, fail the entire operation
      if (allErrors.length > 0) {
        const errorMessage = `Validation failed for ${category} settings:\n${allErrors.join('\n')}`
        log.error(errorMessage, { category, errorCount: allErrors.length })

        if (options.throwOnError) {
          throw new Error(errorMessage)
        }
        return false
      }

      // All validations passed, perform the update
      const { error } = await supabase
        .from('app_config')
        .upsert(validatedUpdates, {
          onConflict: 'category,key'
        })

      if (error) {
        log.error('Failed to update category settings', { category, error: error.message })
        if (options.throwOnError) throw error
        return false
      }

      // Update cache and notify subscribers with validated values
      Object.entries(validatedSettings).forEach(([key, value]) => {
        this.setCachedValue(`${category}.${key}`, value)
      })
      this.notifySubscribers(category, validatedSettings)

      log.success('Updated category settings', {
        category,
        count: Object.keys(validatedSettings).length,
        validated: true
      })
      return true
    } catch (error) {
      log.error('Error updating category settings', { category, error })
      if (options.throwOnError) throw error
      return false
    }
  }

  // ================================================
  // CONVENIENCE METHODS FOR SPECIFIC CATEGORIES
  // ================================================

  async getBusinessSettings(): Promise<Partial<BusinessSettings>> {
    return this.getCategorySettings<BusinessSettings>('business')
  }

  async getUIThemeSettings(): Promise<Partial<UIThemeSettings>> {
    return this.getCategorySettings<UIThemeSettings>('ui_theme')
  }

  async getSystemSettings(): Promise<Partial<SystemSettings>> {
    return this.getCategorySettings<SystemSettings>('system')
  }

  async getLocalizationSettings(): Promise<Partial<LocalizationSettings>> {
    return this.getCategorySettings<LocalizationSettings>('localization')
  }

  async updateBusinessSettings(settings: Partial<BusinessSettings>): Promise<boolean> {
    return this.updateCategorySettings('business', settings)
  }

  async updateUIThemeSettings(settings: Partial<UIThemeSettings>): Promise<boolean> {
    return this.updateCategorySettings('ui_theme', settings)
  }

  // ================================================
  // REAL-TIME SUBSCRIPTIONS
  // ================================================

  /**
   * Subscribe to changes in a category
   */
  subscribeToCategory(
    category: SettingCategory,
    callback: (settings: Record<string, any>) => void
  ): () => void {
    // Add callback to subscribers
    if (!this.subscribers.has(category)) {
      this.subscribers.set(category, new Set())
    }
    this.subscribers.get(category)!.add(callback)

    // Create realtime subscription if not exists
    if (!this.realtimeChannels.has(category)) {
      this.createRealtimeSubscription(category)
    }

    // Return unsubscribe function
    return () => {
      const categorySubscribers = this.subscribers.get(category)
      if (categorySubscribers) {
        categorySubscribers.delete(callback)
        
        // Clean up if no more subscribers
        if (categorySubscribers.size === 0) {
          this.cleanupRealtimeSubscription(category)
        }
      }
    }
  }

  private createRealtimeSubscription(category: SettingCategory) {
    const channel = supabase
      .channel(`app_config_${category}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_config',
          filter: `category=eq.${category}`
        },
        (payload) => {
          log.info('Settings changed in category', { category, event: payload.eventType })

          // Invalidate cache for changed setting
          if (payload.new && typeof payload.new === 'object') {
            const { key, value } = payload.new as { key: string; value: any }
            const cacheKey = `${category}.${key}`
            const parsedValue = this.parseJsonValue(value)
            this.setCachedValue(cacheKey, parsedValue)

            // Notify subscribers
            this.notifySubscribers(category, { [key]: parsedValue })
          }
        }
      )
      .subscribe()

    this.realtimeChannels.set(category, channel)
  }

  private cleanupRealtimeSubscription(category: SettingCategory) {
    const channel = this.realtimeChannels.get(category)
    if (channel) {
      supabase.removeChannel(channel)
      this.realtimeChannels.delete(category)
      this.subscribers.delete(category)
    }
  }

  private notifySubscribers(category: SettingCategory, changedSettings: Record<string, any>) {
    const categorySubscribers = this.subscribers.get(category)
    if (categorySubscribers) {
      categorySubscribers.forEach(callback => {
        try {
          callback(changedSettings)
        } catch (error) {
          log.error('Error in settings subscriber', { category, error })
        }
      })
    }
  }

  // ================================================
  // UTILITY METHODS
  // ================================================

  private getCachedValue<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.value as T
    }
    this.cache.delete(key) // Remove expired
    return null
  }

  private setCachedValue(key: string, value: any) {
    this.cache.set(key, { value, timestamp: Date.now() })
  }

  private parseJsonValue<T>(value: any): T {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T
      } catch {
        return value as T // Return as-is if not valid JSON
      }
    }
    return value as T
  }

  private serializeValue(value: any): any {
    // JSONB columns can store objects directly
    // Only stringify if it's a primitive that needs to be a string
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value
    }
    return value // Objects and arrays are stored directly in JSONB
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.cache.clear()
  }

  /**
   * Get cache stats for debugging
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      channels: Array.from(this.realtimeChannels.keys()),
      subscribers: Array.from(this.subscribers.entries()).map(([category, subs]) => ({
        category,
        count: subs.size
      }))
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('count(*)')
        .limit(1)

      return !error
    } catch {
      return false
    }
  }

  /**
   * Get all available categories
   */
  async getAvailableCategories(): Promise<SettingCategory[]> {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('category')
        .order('category')

      if (error || !data) return []

      // Get unique categories
      const categories = [...new Set(data.map(row => row.category))] as SettingCategory[]
      return categories
    } catch {
      return []
    }
  }

  // ================================================
  // ADVANCED ADMIN METHODS
  // ================================================

  /**
   * Get audit log for settings changes
   */
  async getAuditLog(): Promise<any[]> {
    try {
      // Mock implementation - replace with actual audit table query
      return []
    } catch (error) {
      log.error('Error getting audit log', error)
      return []
    }
  }

  /**
   * Get available settings templates
   */
  async getTemplates(): Promise<any[]> {
    try {
      // Mock implementation - replace with actual templates query
      return []
    } catch (error) {
      log.error('Error getting templates', error)
      return []
    }
  }

  /**
   * Export settings to file
   */
  async exportSettings(categories?: SettingCategory[]): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const categoriesToExport = categories || ['business', 'ui_theme', 'system', 'localization']
      const exportData: Record<string, any> = {}

      for (const category of categoriesToExport) {
        const settings = await this.getCategorySettings(category)
        exportData[category] = settings
      }

      return {
        success: true,
        data: JSON.stringify(exportData, null, 2)
      }
    } catch (error) {
      log.error('Error exporting settings', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      }
    }
  }

  /**
   * Import settings from data
   */
  async importSettings(data: any): Promise<{ success: boolean; error?: string }> {
    try {
      if (!data || typeof data !== 'object') {
        return { success: false, error: 'Invalid import data' }
      }

      for (const [category, settings] of Object.entries(data)) {
        if (typeof settings === 'object' && settings !== null) {
          await this.updateCategorySettings(category as SettingCategory, settings)
        }
      }

      return { success: true }
    } catch (error) {
      log.error('Error importing settings', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Import failed'
      }
    }
  }

  /**
   * Reset category to default values
   */
  async resetCategoryToDefaults(category: SettingCategory): Promise<{ success: boolean; error?: string }> {
    try {
      // Mock implementation - would need default values configuration
      log.warn('Reset to defaults not implemented', { category })
      return { success: false, error: 'Reset to defaults not implemented' }
    } catch (error) {
      log.error('Error resetting category', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Reset failed'
      }
    }
  }

  /**
   * Bulk edit multiple settings
   */
  async bulkEditSettings(operations: any[]): Promise<{ success: boolean; error?: string }> {
    try {
      for (const operation of operations) {
        if (operation.category && operation.key && operation.value !== undefined) {
          await this.updateSetting(operation.category, operation.key, operation.value)
        }
      }

      return { success: true }
    } catch (error) {
      log.error('Error in bulk edit', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bulk edit failed'
      }
    }
  }
}

// ================================================
// SINGLETON INSTANCE
// ================================================

export const newSettingsService = new NewSettingsService()
export default newSettingsService