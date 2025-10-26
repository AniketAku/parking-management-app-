/**
 * Settings Real-time Synchronization Service
 * Provides comprehensive WebSocket-based real-time synchronization for settings
 * across multiple clients with conflict resolution and offline support
 */

import { supabase } from '../lib/supabase'
import { settingsService } from './settingsService'
import { log } from '../utils/secureLogger'
import type {
  SettingsChangeEvent,
  SettingsSubscriptionCallback,
  SettingsSubscriptionOptions,
  SettingsSubscription,
  AllSettings,
  SettingCategory,
  SettingsConflictResolution,
  SettingsRealtimeStatus,
  SettingsSyncEvent,
  SettingsBroadcastMessage,
  SettingValue
} from '../types/settings'

export interface RealtimeSyncOptions {
  enableHeartbeat?: boolean
  heartbeatInterval?: number
  reconnectDelay?: number
  maxReconnectAttempts?: number
  conflictResolution?: SettingsConflictResolution
  broadcastOwnChanges?: boolean
  enableDebugLogging?: boolean
  offlineQueueMaxSize?: number
  syncBatchSize?: number
}

export interface SyncQueueItem {
  id: string
  key: string
  value: SettingValue
  timestamp: number
  clientId: string
  operation: 'set' | 'delete' | 'reset'
  retries: number
  maxRetries: number
}

// Supabase realtime payload types
interface PostgresChangesPayload {
  schema: string
  table: string
  commit_timestamp: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, unknown>
  old: Record<string, unknown>
  errors: string[] | null
}

interface PresencePayload {
  key: string
  newPresences?: Array<Record<string, unknown>>
  leftPresences?: Array<Record<string, unknown>>
}

/**
 * Real-time Settings Synchronization Service
 * Manages WebSocket connections, conflict resolution, and offline queue
 */
export class SettingsRealtimeSync {
  private static instance: SettingsRealtimeSync | null = null
  
  // Connection management
  private channel: ReturnType<typeof supabase.channel> | null = null
  private isConnected = false
  private reconnectTimeout: NodeJS.Timeout | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  
  // Client identification
  private clientId: string
  private sessionId: string
  
  // Subscription management
  private activeSubscriptions = new Map<string, SettingsSubscription>()
  private changeListeners = new Set<SettingsSubscriptionCallback>()
  
  // Sync state
  private status: SettingsRealtimeStatus = 'disconnected'
  private lastSyncTimestamp: number = 0
  private conflictResolutionStrategy: SettingsConflictResolution = 'server_wins'
  
  // Offline support
  private offlineQueue: SyncQueueItem[] = []
  private isOnline = navigator.onLine
  private pendingSyncs = new Map<string, SyncQueueItem>()
  
  // Configuration
  private options: Required<RealtimeSyncOptions> = {
    enableHeartbeat: true,
    heartbeatInterval: 30000, // 30 seconds
    reconnectDelay: 2000, // 2 seconds
    maxReconnectAttempts: 10,
    conflictResolution: 'server_wins',
    broadcastOwnChanges: false,
    enableDebugLogging: false,
    offlineQueueMaxSize: 100,
    syncBatchSize: 10
  }

  private constructor(options?: Partial<RealtimeSyncOptions>) {
    this.options = { ...this.options, ...options }
    this.clientId = this.generateClientId()
    this.sessionId = this.generateSessionId()
    this.conflictResolutionStrategy = this.options.conflictResolution
    
    this.setupNetworkListeners()
    this.log('Initialized SettingsRealtimeSync', { clientId: this.clientId, sessionId: this.sessionId })
  }

  /**
   * Get singleton instance
   */
  static getInstance(options?: Partial<RealtimeSyncOptions>): SettingsRealtimeSync {
    if (!SettingsRealtimeSync.instance) {
      SettingsRealtimeSync.instance = new SettingsRealtimeSync(options)
    }
    return SettingsRealtimeSync.instance
  }

  /**
   * Initialize and connect to real-time updates
   */
  async connect(): Promise<void> {
    if (this.isConnected || this.status === 'connecting') {
      this.log('Already connected or connecting')
      return
    }

    try {
      this.status = 'connecting'
      this.log('Connecting to real-time settings sync...')

      // Create or join settings synchronization channel
      this.channel = supabase.channel(`settings_sync_${this.sessionId}`, {
        config: {
          broadcast: { 
            self: this.options.broadcastOwnChanges,
            ack: true 
          },
          presence: {
            key: this.clientId
          }
        }
      })

      // Subscribe to database changes
      this.channel
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'app_settings'
        }, (payload: PostgresChangesPayload) => {
          this.handleDatabaseChange('app_settings', payload)
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'user_settings'
        }, (payload: PostgresChangesPayload) => {
          this.handleDatabaseChange('user_settings', payload)
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'location_settings'
        }, (payload: PostgresChangesPayload) => {
          this.handleDatabaseChange('location_settings', payload)
        })

      // Subscribe to broadcast messages for client-to-client communication
      this.channel
        .on('broadcast', { event: 'setting_change' }, (payload: SettingsBroadcastMessage) => {
          this.handleBroadcastMessage(payload)
        })
        .on('broadcast', { event: 'bulk_update' }, (payload: SettingsBroadcastMessage) => {
          this.handleBulkUpdateBroadcast(payload)
        })
        .on('broadcast', { event: 'sync_request' }, (payload: SettingsBroadcastMessage) => {
          this.handleSyncRequest(payload)
        })

      // Handle presence changes (other clients connecting/disconnecting)
      this.channel
        .on('presence', { event: 'sync' }, () => {
          this.handlePresenceSync()
        })
        .on('presence', { event: 'join' }, (payload: PresencePayload) => {
          this.handleClientJoin(payload.key, payload.newPresences || [])
        })
        .on('presence', { event: 'leave' }, (payload: PresencePayload) => {
          this.handleClientLeave(payload.key, payload.leftPresences || [])
        })

      // Subscribe and track presence
      const subscriptionResponse = await this.channel.subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          this.isConnected = true
          this.status = 'connected'
          this.log('Successfully connected to real-time settings sync')

          // Track our presence
          await this.channel.track({
            client_id: this.clientId,
            session_id: this.sessionId,
            user_agent: navigator.userAgent,
            timestamp: Date.now(),
            capabilities: ['settings_sync', 'conflict_resolution', 'offline_queue']
          })

          // Start heartbeat if enabled
          if (this.options.enableHeartbeat) {
            this.startHeartbeat()
          }

          // Process offline queue
          await this.processOfflineQueue()

          // Request initial sync
          await this.requestFullSync()

        } else {
          this.log('Connection status changed:', status)
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this.handleConnectionError(status)
          }
        }
      })

      this.log('Channel subscription initiated:', subscriptionResponse)

    } catch (error) {
      this.status = 'error'
      this.log('Failed to connect to real-time sync:', error)
      this.scheduleReconnect()
      throw error
    }
  }

  /**
   * Disconnect from real-time updates
   */
  async disconnect(): Promise<void> {
    this.log('Disconnecting from real-time settings sync...')

    this.status = 'disconnecting'

    // Clear timers
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    // Unsubscribe from channel
    if (this.channel) {
      await this.channel.unsubscribe()
      this.channel = null
    }

    // Clear state
    this.isConnected = false
    this.status = 'disconnected'
    this.activeSubscriptions.clear()

    this.log('Disconnected from real-time settings sync')
  }

  /**
   * Subscribe to setting changes
   */
  subscribe(
    callback: SettingsSubscriptionCallback,
    options?: SettingsSubscriptionOptions
  ): SettingsSubscription {
    const subscriptionId = `sync_${Date.now()}_${Math.random()}`

    const subscription: SettingsSubscription = {
      id: subscriptionId,
      callback,
      options,
      unsubscribe: () => {
        this.activeSubscriptions.delete(subscriptionId)
        this.changeListeners.delete(callback)
        this.log('Unsubscribed from setting changes:', subscriptionId)
      },
      isActive: true
    }

    this.activeSubscriptions.set(subscriptionId, subscription)
    this.changeListeners.add(callback)

    this.log('Subscribed to setting changes:', subscriptionId, options)
    return subscription
  }

  /**
   * Broadcast a setting change to other clients
   */
  async broadcastChange(key: string, value: SettingValue, metadata?: Record<string, SettingValue>): Promise<void> {
    if (!this.isConnected || !this.channel) {
      this.log('Cannot broadcast - not connected')
      return
    }

    const message: SettingsBroadcastMessage = {
      type: 'setting_change',
      client_id: this.clientId,
      session_id: this.sessionId,
      timestamp: Date.now(),
      data: {
        key,
        value,
        metadata: {
          ...metadata,
          source: 'broadcast'
        }
      }
    }

    try {
      await this.channel.send({
        type: 'broadcast',
        event: 'setting_change',
        payload: message
      })

      this.log('Broadcasted setting change:', { key, client_id: this.clientId })
    } catch (error) {
      this.log('Failed to broadcast setting change:', error)
    }
  }

  /**
   * Request full synchronization with server
   */
  async requestFullSync(): Promise<void> {
    if (!this.isConnected) {
      this.log('Cannot sync - not connected')
      return
    }

    try {
      this.log('Requesting full settings synchronization...')

      // Get latest settings from server
      const categories: SettingCategory[] = [
        'business', 'system', 'ui_theme', 'validation', 
        'performance', 'security', 'user_mgmt', 'notifications', 
        'reporting', 'localization'
      ]

      const syncPromises = categories.map(category => 
        settingsService.getCategorySettings(category)
      )

      const results = await Promise.allSettled(syncPromises)
      let syncedCount = 0

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          const category = categories[index]
          const settings = result.value
          
          // Emit sync events for each setting
          Object.entries(settings).forEach(([key, value]) => {
            this.emitSyncEvent({
              type: 'sync',
              key,
              value,
              category,
              client_id: 'server',
              timestamp: Date.now()
            })
            syncedCount++
          })
        }
      })

      this.lastSyncTimestamp = Date.now()
      this.log(`Full sync completed: ${syncedCount} settings synchronized`)

    } catch (error) {
      this.log('Full sync failed:', error)
      throw error
    }
  }

  /**
   * Handle conflicts between local and remote changes
   */
  private async resolveConflict(
    key: string,
    localValue: SettingValue,
    remoteValue: SettingValue,
    localTimestamp: number,
    remoteTimestamp: number
  ): Promise<{ resolvedValue: SettingValue; resolution: string }> {
    this.log('Resolving conflict for setting:', {
      key,
      strategy: this.conflictResolutionStrategy,
      localTimestamp,
      remoteTimestamp
    })

    switch (this.conflictResolutionStrategy) {
      case 'server_wins':
        return {
          resolvedValue: remoteValue,
          resolution: 'server_wins'
        }

      case 'client_wins':
        return {
          resolvedValue: localValue,
          resolution: 'client_wins'
        }

      case 'timestamp_based':
        if (remoteTimestamp > localTimestamp) {
          return {
            resolvedValue: remoteValue,
            resolution: 'timestamp_based_remote'
          }
        } else {
          return {
            resolvedValue: localValue,
            resolution: 'timestamp_based_local'
          }
        }

      case 'merge_deep':
        if (typeof localValue === 'object' && typeof remoteValue === 'object' &&
            !Array.isArray(localValue) && !Array.isArray(remoteValue) &&
            localValue !== null && remoteValue !== null) {
          const mergedValue = { ...localValue, ...remoteValue }
          return {
            resolvedValue: mergedValue,
            resolution: 'merge_deep'
          }
        } else {
          // Fall back to timestamp-based resolution for non-objects
          return this.resolveConflict(key, localValue, remoteValue, localTimestamp, remoteTimestamp)
        }

      default:
        this.log('Unknown conflict resolution strategy, defaulting to server_wins')
        return {
          resolvedValue: remoteValue,
          resolution: 'server_wins_default'
        }
    }
  }

  /**
   * Add item to offline queue
   */
  private queueOfflineChange(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>): void {
    if (this.offlineQueue.length >= this.options.offlineQueueMaxSize) {
      // Remove oldest item to make room
      this.offlineQueue.shift()
      this.log('Offline queue full, removed oldest item')
    }

    const queueItem: SyncQueueItem = {
      ...item,
      id: `queue_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      retries: 0
    }

    this.offlineQueue.push(queueItem)
    this.log('Added to offline queue:', queueItem.key)
  }

  /**
   * Process offline queue when connection is restored
   */
  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) {
      return
    }

    this.log(`Processing offline queue: ${this.offlineQueue.length} items`)

    const batch = this.offlineQueue.splice(0, this.options.syncBatchSize)
    const processedItems: string[] = []
    const failedItems: SyncQueueItem[] = []

    for (const item of batch) {
      try {
        if (item.operation === 'set') {
          await settingsService.setSetting(item.key, item.value)
        } else if (item.operation === 'delete') {
          await settingsService.resetSetting(item.key)
        }
        
        processedItems.push(item.key)
        this.log('Processed offline item:', item.key)

      } catch (error) {
        item.retries++
        if (item.retries < item.maxRetries) {
          failedItems.push(item)
          this.log('Offline item failed, will retry:', item.key, error)
        } else {
          this.log('Offline item permanently failed:', item.key, error)
        }
      }
    }

    // Re-queue failed items
    this.offlineQueue.unshift(...failedItems)

    this.log(`Offline queue processed: ${processedItems.length} successful, ${failedItems.length} failed`)

    // Continue processing if there are more items
    if (this.offlineQueue.length > 0) {
      setTimeout(() => this.processOfflineQueue(), 1000)
    }
  }

  // Event Handlers

  private handleDatabaseChange(table: string, payload: PostgresChangesPayload): void {
    this.log('Database change detected:', table, payload.eventType)

    const event: SettingsChangeEvent = {
      key: payload.new?.key || payload.old?.key,
      old_value: payload.old?.value,
      new_value: payload.new?.value,
      category: payload.new?.category || 'system',
      scope: this.getTableScope(table),
      changed_by: payload.new?.updated_by || 'unknown',
      timestamp: new Date().toISOString()
    }

    // Clear local cache for this setting
    settingsService.clearCache()

    // Emit to subscribers
    this.emitChangeEvent(event)
  }

  private async handleBroadcastMessage(payload: SettingsBroadcastMessage): Promise<void> {
    const message = payload.payload as SettingsBroadcastMessage

    // Ignore our own broadcasts unless configured otherwise
    if (message.client_id === this.clientId && !this.options.broadcastOwnChanges) {
      return
    }

    this.log('Received broadcast message:', message.type, message.data.key)

    if (message.type === 'setting_change') {
      const { key, value, metadata } = message.data

      // Check for conflicts
      const localValue = await settingsService.getSetting(key)
      if (localValue !== undefined && localValue !== value) {
        const { resolvedValue } = await this.resolveConflict(
          key,
          localValue,
          value,
          Date.now() - 1000, // Local is older
          message.timestamp
        )

        if (resolvedValue !== localValue) {
          // Apply remote change
          await settingsService.setSetting(key, resolvedValue)
        }
      }

      // Emit change event
      const event: SettingsChangeEvent = {
        key,
        new_value: value,
        old_value: localValue,
        category: metadata?.category || 'system',
        scope: metadata?.scope || 'system',
        changed_by: message.client_id,
        timestamp: new Date(message.timestamp).toISOString()
      }

      this.emitChangeEvent(event)
    }
  }

  private handleBulkUpdateBroadcast(payload: SettingsBroadcastMessage): void {
    // Handle bulk updates from other clients
    this.log('Received bulk update broadcast:', payload)
    // Implementation would handle bulk sync operations
  }

  private handleSyncRequest(payload: SettingsBroadcastMessage): void {
    // Handle sync requests from other clients
    this.log('Received sync request:', payload)
    // Implementation would respond with current state
  }

  private handlePresenceSync(): void {
    const presences = this.channel.presenceState()
    this.log('Presence sync - active clients:', Object.keys(presences).length)
  }

  private handleClientJoin(key: string, newPresences: Array<Record<string, unknown>>): void {
    this.log('Client joined:', key, newPresences.length)
  }

  private handleClientLeave(key: string, leftPresences: Array<Record<string, unknown>>): void {
    this.log('Client left:', key, leftPresences.length)
  }

  private handleConnectionError(status: string): void {
    this.log('Connection error:', status)
    this.status = 'error'
    this.isConnected = false
    this.scheduleReconnect()
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      return // Already scheduled
    }

    this.log(`Scheduling reconnect in ${this.options.reconnectDelay}ms`)
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null
      this.connect().catch(error => {
        this.log('Reconnection failed:', error)
        this.scheduleReconnect()
      })
    }, this.options.reconnectDelay)
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      return
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.channel) {
        this.channel.send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: {
            client_id: this.clientId,
            timestamp: Date.now()
          }
        }).catch((error: any) => {
          this.log('Heartbeat failed:', error)
          this.handleConnectionError('heartbeat_failed')
        })
      }
    }, this.options.heartbeatInterval)
  }

  // Utility Methods

  private emitChangeEvent(event: SettingsChangeEvent): void {
    this.changeListeners.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        this.log('Error in change listener:', error)
      }
    })
  }

  private emitSyncEvent(event: SettingsSyncEvent): void {
    this.log('Sync event:', event.type, event.key)
    // Would emit to sync-specific listeners
  }

  private getTableScope(table: string): 'system' | 'location' | 'user' {
    switch (table) {
      case 'app_settings': return 'system'
      case 'location_settings': return 'location'
      case 'user_settings': return 'user'
      default: return 'system'
    }
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.log('Network back online')
      this.isOnline = true
      if (!this.isConnected) {
        this.connect()
      }
    })

    window.addEventListener('offline', () => {
      this.log('Network went offline')
      this.isOnline = false
    })
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private log(...args: any[]): void {
    if (this.options.enableDebugLogging) {
      log.debug('[SettingsRealtimeSync]', ...args)
    }
  }

  // Public API

  /**
   * Get current connection status
   */
  getStatus(): SettingsRealtimeStatus {
    return this.status
  }

  /**
   * Get client information
   */
  getClientInfo(): { clientId: string; sessionId: string; isOnline: boolean } {
    return {
      clientId: this.clientId,
      sessionId: this.sessionId,
      isOnline: this.isOnline
    }
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): {
    activeSubscriptions: number
    offlineQueueSize: number
    lastSyncTimestamp: number
    isConnected: boolean
  } {
    return {
      activeSubscriptions: this.activeSubscriptions.size,
      offlineQueueSize: this.offlineQueue.length,
      lastSyncTimestamp: this.lastSyncTimestamp,
      isConnected: this.isConnected
    }
  }

  /**
   * Update conflict resolution strategy
   */
  setConflictResolution(strategy: SettingsConflictResolution): void {
    this.conflictResolutionStrategy = strategy
    this.log('Updated conflict resolution strategy:', strategy)
  }

  /**
   * Force reconnection
   */
  async forceReconnect(): Promise<void> {
    await this.disconnect()
    await this.connect()
  }

  /**
   * Clear offline queue
   */
  clearOfflineQueue(): void {
    const clearedCount = this.offlineQueue.length
    this.offlineQueue = []
    this.log(`Cleared offline queue: ${clearedCount} items removed`)
  }
}

// Export singleton instance
export const realtimeSync = SettingsRealtimeSync.getInstance({
  enableDebugLogging: process.env.NODE_ENV === 'development',
  conflictResolution: 'timestamp_based',
  enableHeartbeat: true
})

export default realtimeSync