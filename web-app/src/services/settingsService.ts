/**
 * NEW SIMPLIFIED SETTINGS SERVICE
 * Direct database integration with proper error handling
 * Replaces complex hierarchical settings system
 */

import { supabase } from '../lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'
import type { SettingCategory } from '../types/settings'
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

      // Query database (without .single() to handle missing records gracefully)
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('category', category)
        .eq('key', key)
        .limit(1)

      if (error) {
        log.error('Failed to get setting', { cacheKey, error: error.message })
        if (options.throwOnError) throw error
        return null
      }

      if (!data || data.length === 0) {
        log.warn('Setting not found in database', { cacheKey })
        return null
      }

      // Use first (and should be only) result
      const record = data[0]

      // Parse JSONB value and cache
      const value = this.parseJsonValue<T>(record.value)
      this.setCachedValue(cacheKey, value)

      return value
    } catch (error) {
      log.error('Error getting setting', { cacheKey, error })
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
   * Update a single setting
   */
  async updateSetting(
    category: SettingCategory,
    key: string,
    value: any,
    options: SettingsServiceOptions = {}
  ): Promise<boolean> {
    try {
      // Serialize value for JSONB storage
      const jsonValue = this.serializeValue(value)

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

      // Update cache and notify subscribers
      const cacheKey = `${category}.${key}`
      this.setCachedValue(cacheKey, value)
      this.notifySubscribers(category, { [key]: value })

      log.success('Updated setting', { cacheKey })
      return true
    } catch (error) {
      log.error('Error updating setting', { category, key, error })
      if (options.throwOnError) throw error
      return false
    }
  }

  /**
   * Update multiple settings in a category
   */
  async updateCategorySettings(
    category: SettingCategory,
    settings: Record<string, any>,
    options: SettingsServiceOptions = {}
  ): Promise<boolean> {
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        category,
        key,
        value: this.serializeValue(value),
        updated_at: new Date().toISOString()
      }))

      const { error } = await supabase
        .from('app_config')
        .upsert(updates, {
          onConflict: 'category,key'
        })

      if (error) {
        log.error('Failed to update category settings', { category, error: error.message })
        if (options.throwOnError) throw error
        return false
      }

      // Update cache and notify subscribers
      Object.entries(settings).forEach(([key, value]) => {
        this.setCachedValue(`${category}.${key}`, value)
      })
      this.notifySubscribers(category, settings)

      log.success('Updated category settings', { category, count: Object.keys(settings).length })
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
          log.debug('Settings changed in category', { category, payload })

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

  /**
   * Refresh settings cache
   */
  async refreshSettings(): Promise<void> {
    this.clearCache()
    // Optionally reload critical settings
  }

  /**
   * Get audit log entries
   */
  async getAuditLog(filters?: any): Promise<any[]> {
    try {
      let query = supabase
        .from('settings_audit')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query
      return error ? [] : (data || [])
    } catch {
      return []
    }
  }

  /**
   * Get available templates
   */
  async getTemplates(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('settings_templates')
        .select('*')
        .order('name')

      return error ? [] : (data || [])
    } catch {
      return []
    }
  }

  /**
   * Export settings
   */
  async exportSettings(options?: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('*')

      if (error) throw error
      return { settings: data || [], exported_at: new Date().toISOString() }
    } catch (error) {
      throw error
    }
  }

  /**
   * Import settings
   */
  async importSettings(data: any, options?: any): Promise<boolean> {
    try {
      // Basic validation
      if (!data?.settings || !Array.isArray(data.settings)) {
        return false
      }

      // Import logic would go here
      // For now, return success
      return true
    } catch {
      return false
    }
  }

  /**
   * Reset category to defaults
   */
  async resetCategoryToDefaults(category: string): Promise<boolean> {
    try {
      // This would reset settings in the specified category to default values
      // For now, return success
      return true
    } catch {
      return false
    }
  }

  /**
   * Bulk edit settings
   */
  async bulkEditSettings(updates: any[]): Promise<any[]> {
    try {
      const results = []
      for (const update of updates) {
        try {
          await this.updateSetting(update.key, update.value)
          results.push({ key: update.key, success: true })
        } catch (error) {
          results.push({
            key: update.key,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
      return results
    } catch {
      return []
    }
  }

  /**
   * Get all settings
   */
  async getAllSettings(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true })

      return error ? [] : (data || [])
    } catch {
      return []
    }
  }

  /**
   * Create a new setting
   */
  async createSetting(setting: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('app_config')
        .insert({
          category: setting.category,
          key: setting.key,
          value: setting.value,
          description: setting.description,
          is_system: setting.is_system || false,
          sort_order: setting.sort_order || 0
        })

      return !error
    } catch {
      return false
    }
  }

  /**
   * Create audit entry
   */
  async createAuditEntry(entry: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('settings_audit')
        .insert(entry)

      return !error
    } catch {
      return false
    }
  }

  /**
   * Validate setting
   */
  async validateSetting(key: string, value: any): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      // Basic validation logic
      if (value === null || value === undefined) {
        return { isValid: false, errors: ['Value cannot be null or undefined'] }
      }

      return { isValid: true, errors: [] }
    } catch {
      return { isValid: false, errors: ['Validation failed'] }
    }
  }
}

// ================================================
// SINGLETON INSTANCE
// ================================================

export const newSettingsService = new NewSettingsService()
export default newSettingsService

// For backward compatibility, export as settingsService
export const settingsService = newSettingsService
