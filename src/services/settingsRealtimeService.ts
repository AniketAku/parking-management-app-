/**
 * Settings Real-time Service
 * Handles real-time updates, change tracking, and sync across clients
 */

import { supabase } from '../lib/supabase'
import { settingsService } from './settingsService'
import type {
  SettingsChangeEvent,
  SettingsSubscription,
  SettingsSubscriptionOptions,
  SettingsSubscriptionCallback,
  SettingCategory,
  SettingScope
} from '../types/settings'

interface RealtimeChannel {
  id: string
  channel: any // Supabase channel
  options: SettingsSubscriptionOptions
  callbacks: Set<SettingsSubscriptionCallback>
  isActive: boolean
}

interface ChangeNotification {
  id: string
  setting_key: string
  old_value: any
  new_value: any
  category: SettingCategory
  scope: SettingScope
  changed_by: string
  changed_at: string
  source_table: string
  change_reason?: string
}

class SettingsRealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map()
  private globalCallbacks: Set<SettingsSubscriptionCallback> = new Set()
  private changeHistory: ChangeNotification[] = []
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  constructor() {
    this.initializeConnection()
  }

  /**
   * Subscribe to settings changes with filtering options
   */
  subscribeToChanges(
    callback: SettingsSubscriptionCallback,
    options?: SettingsSubscriptionOptions
  ): SettingsSubscription {
    const subscriptionId = `settings_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    if (!options || this.isGlobalSubscription(options)) {
      // Global subscription - listen to all changes
      this.globalCallbacks.add(callback)
      
      return {
        id: subscriptionId,
        unsubscribe: () => {
          this.globalCallbacks.delete(callback)
        },
        isActive: true
      }
    }

    // Create or reuse filtered channel
    const channelKey = this.getChannelKey(options)
    let channel = this.channels.get(channelKey)

    if (!channel) {
      channel = this.createChannel(channelKey, options)
      this.channels.set(channelKey, channel)
    }

    // Add callback to channel
    channel.callbacks.add(callback)

    return {
      id: subscriptionId,
      unsubscribe: () => {
        if (channel) {
          channel.callbacks.delete(callback)
          
          // Clean up empty channels
          if (channel.callbacks.size === 0) {
            this.cleanupChannel(channelKey)
          }
        }
      },
      isActive: true
    }
  }

  /**
   * Broadcast a setting change to all subscribers
   */
  broadcastChange(event: SettingsChangeEvent): void {
    // Notify global subscribers
    this.globalCallbacks.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        console.error('Error in global settings callback:', error)
      }
    })

    // Notify filtered subscribers
    this.channels.forEach(channel => {
      if (this.eventMatchesChannelFilter(event, channel.options)) {
        channel.callbacks.forEach(callback => {
          try {
            callback(event)
          } catch (error) {
            console.error('Error in filtered settings callback:', error)
          }
        })
      }
    })

    // Add to change history
    this.addToChangeHistory(event)
  }

  /**
   * Get recent change history
   */
  getChangeHistory(limit = 100): ChangeNotification[] {
    return this.changeHistory.slice(-limit)
  }

  /**
   * Get change history for a specific setting
   */
  getSettingHistory(settingKey: string, limit = 50): ChangeNotification[] {
    return this.changeHistory
      .filter(change => change.setting_key === settingKey)
      .slice(-limit)
  }

  /**
   * Clear change history
   */
  clearChangeHistory(): void {
    this.changeHistory = []
  }

  /**
   * Check connection status
   */
  isConnectionActive(): boolean {
    return this.isConnected
  }

  /**
   * Force reconnection
   */
  async reconnect(): Promise<void> {
    this.disconnect()
    await this.initializeConnection()
  }

  /**
   * Disconnect all real-time subscriptions
   */
  disconnect(): void {
    // Unsubscribe from all channels
    this.channels.forEach(channel => {
      if (channel.channel) {
        channel.channel.unsubscribe()
      }
    })

    this.channels.clear()
    this.globalCallbacks.clear()
    this.isConnected = false
  }

  /**
   * Get real-time statistics
   */
  getStats(): {
    isConnected: boolean
    activeChannels: number
    totalSubscribers: number
    changeHistorySize: number
    reconnectAttempts: number
  } {
    const totalSubscribers = Array.from(this.channels.values())
      .reduce((sum, channel) => sum + channel.callbacks.size, 0) + this.globalCallbacks.size

    return {
      isConnected: this.isConnected,
      activeChannels: this.channels.size,
      totalSubscribers,
      changeHistorySize: this.changeHistory.length,
      reconnectAttempts: this.reconnectAttempts
    }
  }

  /**
   * Subscribe to audit trail changes
   */
  subscribeToAuditTrail(
    callback: (auditEntry: any) => void,
    settingKey?: string
  ): SettingsSubscription {
    const subscriptionId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const channel = supabase
      .channel(`audit_trail_${subscriptionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'settings_history',
        filter: settingKey ? `setting_key=eq.${settingKey}` : undefined
      }, (payload) => {
        try {
          callback(payload.new)
        } catch (error) {
          console.error('Error in audit trail callback:', error)
        }
      })
      .subscribe()

    return {
      id: subscriptionId,
      unsubscribe: () => {
        channel.unsubscribe()
      },
      isActive: true
    }
  }

  /**
   * Push setting change with conflict resolution
   */
  async pushSettingChange(
    key: string,
    value: any,
    expectedVersion?: string,
    changeReason?: string
  ): Promise<{
    success: boolean
    conflict?: boolean
    currentVersion?: string
    error?: string
  }> {
    try {
      // Check for conflicts if version provided
      if (expectedVersion) {
        const { data: currentSetting } = await supabase
          .from('app_settings')
          .select('updated_at')
          .eq('key', key)
          .single()

        if (currentSetting && currentSetting.updated_at !== expectedVersion) {
          return {
            success: false,
            conflict: true,
            currentVersion: currentSetting.updated_at
          }
        }
      }

      // Apply the change
      await settingsService.setSetting(key, value)

      // The change will be automatically broadcast through database triggers
      return { success: true }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Sync settings with server (force refresh)
   */
  async syncWithServer(categories?: SettingCategory[]): Promise<void> {
    try {
      // Clear cache to force fresh fetch
      settingsService.clearCache()

      // Optionally refresh specific categories
      if (categories && categories.length > 0) {
        for (const category of categories) {
          await settingsService.getCategorySettings(category)
        }
      }

      // Broadcast sync event
      this.broadcastChange({
        key: '__sync__',
        new_value: { synced_at: new Date().toISOString(), categories },
        category: 'system',
        scope: 'system',
        changed_by: 'system',
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('Failed to sync with server:', error)
      throw error
    }
  }

  // Private methods

  private async initializeConnection(): Promise<void> {
    try {
      // Test connection
      const { error } = await supabase.from('app_settings').select('id').limit(1)
      
      if (error) {
        throw error
      }

      this.isConnected = true
      this.reconnectAttempts = 0

      // Set up global change listener
      this.setupGlobalChangeListener()

      console.log('Settings real-time service connected')

    } catch (error) {
      console.error('Failed to initialize settings real-time connection:', error)
      this.scheduleReconnect()
    }
  }

  private setupGlobalChangeListener(): void {
    // Listen to all settings table changes
    const globalChannel = supabase
      .channel('settings_global_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'app_settings'
      }, (payload) => {
        this.handleDatabaseChange(payload)
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_settings'
      }, (payload) => {
        this.handleDatabaseChange(payload)
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'location_settings'
      }, (payload) => {
        this.handleDatabaseChange(payload)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Global settings listener active')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Global settings listener error')
          this.scheduleReconnect()
        }
      })
  }

  private handleDatabaseChange(payload: any): void {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload

      const settingKey = newRecord?.key || newRecord?.setting_key || oldRecord?.key || oldRecord?.setting_key
      const category = newRecord?.category || 'system'
      const scope = this.determineScope(payload.table)

      const event: SettingsChangeEvent = {
        key: settingKey,
        old_value: oldRecord?.value,
        new_value: newRecord?.value,
        category,
        scope,
        changed_by: newRecord?.updated_by || 'unknown',
        timestamp: new Date().toISOString()
      }

      // Clear cache for this setting
      settingsService.clearCache()

      // Broadcast the change
      this.broadcastChange(event)

    } catch (error) {
      console.error('Error handling database change:', error)
    }
  }

  private determineScope(tableName: string): SettingScope {
    switch (tableName) {
      case 'user_settings':
        return 'user'
      case 'location_settings':
        return 'location'
      default:
        return 'system'
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`)

    setTimeout(() => {
      this.initializeConnection()
    }, delay)
  }

  private createChannel(key: string, options: SettingsSubscriptionOptions): RealtimeChannel {
    const channelId = `settings_filtered_${key}`
    
    let filter: string | undefined
    if (options.category) {
      filter = `category=eq.${options.category}`
    }

    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'app_settings',
        filter
      }, (payload) => {
        this.handleDatabaseChange(payload)
      })
      .subscribe()

    return {
      id: channelId,
      channel,
      options,
      callbacks: new Set(),
      isActive: true
    }
  }

  private cleanupChannel(key: string): void {
    const channel = this.channels.get(key)
    if (channel) {
      channel.channel.unsubscribe()
      this.channels.delete(key)
    }
  }

  private getChannelKey(options: SettingsSubscriptionOptions): string {
    const parts: string[] = []
    
    if (options.category) parts.push(`cat:${options.category}`)
    if (options.scope) parts.push(`scope:${options.scope}`)
    if (options.keys) parts.push(`keys:${options.keys.sort().join(',')}`)
    
    return parts.join('|') || 'global'
  }

  private isGlobalSubscription(options: SettingsSubscriptionOptions): boolean {
    return !options.category && !options.keys && !options.scope
  }

  private eventMatchesChannelFilter(
    event: SettingsChangeEvent,
    options: SettingsSubscriptionOptions
  ): boolean {
    if (options.category && event.category !== options.category) {
      return false
    }

    if (options.scope && event.scope !== options.scope) {
      return false
    }

    if (options.keys && !options.keys.includes(event.key)) {
      return false
    }

    return true
  }

  private addToChangeHistory(event: SettingsChangeEvent): void {
    const notification: ChangeNotification = {
      id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      setting_key: event.key,
      old_value: event.old_value,
      new_value: event.new_value,
      category: event.category,
      scope: event.scope,
      changed_by: event.changed_by,
      changed_at: event.timestamp,
      source_table: 'app_settings' // Would be determined based on scope
    }

    this.changeHistory.push(notification)

    // Keep only last 1000 changes
    if (this.changeHistory.length > 1000) {
      this.changeHistory = this.changeHistory.slice(-1000)
    }
  }
}

// Export singleton instance
export const settingsRealtimeService = new SettingsRealtimeService()
export default settingsRealtimeService

// React hook for real-time settings
export function useRealtimeSettings() {
  const [isConnected, setIsConnected] = React.useState(false)
  const [stats, setStats] = React.useState(settingsRealtimeService.getStats())

  React.useEffect(() => {
    const updateStats = () => {
      const currentStats = settingsRealtimeService.getStats()
      setStats(currentStats)
      setIsConnected(currentStats.isConnected)
    }

    // Update stats periodically
    const interval = setInterval(updateStats, 5000)
    updateStats() // Initial update

    return () => clearInterval(interval)
  }, [])

  const reconnect = React.useCallback(async () => {
    await settingsRealtimeService.reconnect()
  }, [])

  const syncWithServer = React.useCallback(async (categories?: SettingCategory[]) => {
    await settingsRealtimeService.syncWithServer(categories)
  }, [])

  return {
    isConnected,
    stats,
    reconnect,
    syncWithServer,
    subscribe: settingsRealtimeService.subscribeToChanges.bind(settingsRealtimeService),
    getChangeHistory: settingsRealtimeService.getChangeHistory.bind(settingsRealtimeService)
  }
}

// Helper for detecting if React is available
const React = (() => {
  try {
    return require('react')
  } catch {
    return {
      useState: () => [null, () => {}],
      useEffect: () => {},
      useCallback: (fn: any) => fn
    }
  }
})()