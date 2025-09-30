import type {
  BluetoothDevice,
  BluetoothConfig,
  BluetoothPrinterConnection,
  BluetoothOptimizationConfig,
  BluetoothTransmissionStats
} from '../types/bluetoothPrinter'
import { BluetoothConstants } from '../types/bluetoothPrinter'
import { bluetoothPrinterService } from './bluetoothPrinterService'

export interface ConnectionAttempt {
  deviceId: string
  attempts: number
  lastAttempt: Date
  nextRetry: Date
  backoffMultiplier: number
}

export class BluetoothConnectionManager {
  private static instance: BluetoothConnectionManager
  private connectionAttempts = new Map<string, ConnectionAttempt>()
  private keepAliveIntervals = new Map<string, NodeJS.Timeout>()
  private connectionMonitorInterval?: NodeJS.Timeout
  private maxRetryAttempts = 3
  private baseReconnectDelay = 5000
  private maxReconnectDelay = 60000
  private monitoringInterval = 30000

  static getInstance(): BluetoothConnectionManager {
    if (!BluetoothConnectionManager.instance) {
      BluetoothConnectionManager.instance = new BluetoothConnectionManager()
    }
    return BluetoothConnectionManager.instance
  }

  constructor() {
    this.startConnectionMonitoring()
  }

  async maintainBluetoothConnection(deviceId: string): Promise<void> {
    const attempt = this.connectionAttempts.get(deviceId) || {
      deviceId,
      attempts: 0,
      lastAttempt: new Date(0),
      nextRetry: new Date(),
      backoffMultiplier: 1
    }

    if (attempt.attempts >= this.maxRetryAttempts) {
      throw new Error(`Max reconnection attempts (${this.maxRetryAttempts}) reached for device ${deviceId}`)
    }

    const now = new Date()
    if (now < attempt.nextRetry) {
      const waitTime = attempt.nextRetry.getTime() - now.getTime()
      throw new Error(`Must wait ${Math.ceil(waitTime / 1000)}s before next retry attempt`)
    }

    try {
      await bluetoothPrinterService.connectToBluetoothPrinter(deviceId)
      
      // Reset attempts on successful connection
      this.connectionAttempts.delete(deviceId)
      this.startKeepAlive(deviceId)
      
      console.log(`Successfully reconnected to Bluetooth printer ${deviceId}`)
    } catch (error) {
      attempt.attempts++
      attempt.lastAttempt = now
      attempt.backoffMultiplier = Math.min(attempt.backoffMultiplier * 2, 8)
      
      const delay = Math.min(
        this.baseReconnectDelay * attempt.backoffMultiplier,
        this.maxReconnectDelay
      )
      
      attempt.nextRetry = new Date(now.getTime() + delay)
      this.connectionAttempts.set(deviceId, attempt)
      
      console.error(`Reconnection attempt ${attempt.attempts}/${this.maxRetryAttempts} failed for ${deviceId}:`, error)
      
      if (attempt.attempts < this.maxRetryAttempts) {
        // Schedule next retry
        setTimeout(() => {
          this.maintainBluetoothConnection(deviceId).catch(console.error)
        }, delay)
      }
      
      throw error
    }
  }

  async handleBluetoothDisconnection(deviceId: string): Promise<void> {
    console.log(`Handling disconnection for Bluetooth printer ${deviceId}`)
    
    this.stopKeepAlive(deviceId)
    
    try {
      const connectedDevices = await bluetoothPrinterService.getConnectedDevices()
      const device = connectedDevices.find(d => d.id === deviceId)
      
      if (device) {
        const shouldAutoReconnect = this.shouldAutoReconnect(deviceId)
        
        if (shouldAutoReconnect) {
          console.log(`Attempting auto-reconnect for ${deviceId}`)
          await this.maintainBluetoothConnection(deviceId)
        } else {
          console.log(`Auto-reconnect disabled for ${deviceId}`)
        }
      }
    } catch (error) {
      console.error(`Failed to handle disconnection for ${deviceId}:`, error)
    }
  }

  private shouldAutoReconnect(deviceId: string): boolean {
    const attempt = this.connectionAttempts.get(deviceId)
    
    // Don't auto-reconnect if we've exceeded max attempts
    if (attempt && attempt.attempts >= this.maxRetryAttempts) {
      return false
    }
    
    // Don't auto-reconnect if we're in cooldown period
    if (attempt && new Date() < attempt.nextRetry) {
      return false
    }
    
    return true
  }

  private startKeepAlive(deviceId: string): void {
    this.stopKeepAlive(deviceId)
    
    const interval = setInterval(async () => {
      try {
        await bluetoothPrinterService.checkBluetoothPrinterStatus(deviceId)
      } catch (error) {
        console.warn(`Keep-alive failed for ${deviceId}:`, error)
        clearInterval(interval)
        this.handleBluetoothDisconnection(deviceId)
      }
    }, BluetoothConstants.KEEP_ALIVE_INTERVAL)
    
    this.keepAliveIntervals.set(deviceId, interval)
  }

  private stopKeepAlive(deviceId: string): void {
    const interval = this.keepAliveIntervals.get(deviceId)
    if (interval) {
      clearInterval(interval)
      this.keepAliveIntervals.delete(deviceId)
    }
  }

  private startConnectionMonitoring(): void {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval)
    }
    
    this.connectionMonitorInterval = setInterval(async () => {
      await this.monitorAllConnections()
    }, this.monitoringInterval)
  }

  private async monitorAllConnections(): Promise<void> {
    try {
      const connectedDevices = await bluetoothPrinterService.getConnectedDevices()
      
      for (const device of connectedDevices) {
        try {
          const status = await bluetoothPrinterService.checkBluetoothPrinterStatus(device.id)
          
          if (!status.connected) {
            console.warn(`Connection lost for device ${device.id}`)
            await this.handleBluetoothDisconnection(device.id)
          }
        } catch (error) {
          console.error(`Monitor check failed for ${device.id}:`, error)
          await this.handleBluetoothDisconnection(device.id)
        }
      }
    } catch (error) {
      console.error('Connection monitoring failed:', error)
    }
  }

  async forceReconnect(deviceId: string): Promise<void> {
    // Clear any existing retry state
    this.connectionAttempts.delete(deviceId)
    this.stopKeepAlive(deviceId)
    
    try {
      await bluetoothPrinterService.disconnectBluetoothPrinter(deviceId)
    } catch (error) {
      // Ignore disconnect errors when forcing reconnect
    }
    
    await this.maintainBluetoothConnection(deviceId)
  }

  async resetConnectionAttempts(deviceId: string): void {
    this.connectionAttempts.delete(deviceId)
    console.log(`Reset connection attempts for ${deviceId}`)
  }

  getConnectionAttempts(): Map<string, ConnectionAttempt> {
    return new Map(this.connectionAttempts)
  }

  getConnectionStatus(deviceId: string): {
    connected: boolean
    attempts: number
    nextRetry?: Date
    keepAliveActive: boolean
  } {
    const attempt = this.connectionAttempts.get(deviceId)
    const hasKeepAlive = this.keepAliveIntervals.has(deviceId)
    
    return {
      connected: !attempt || attempt.attempts === 0,
      attempts: attempt?.attempts || 0,
      nextRetry: attempt?.nextRetry,
      keepAliveActive: hasKeepAlive
    }
  }

  async testConnection(deviceId: string): Promise<{
    success: boolean
    responseTime: number
    signalStrength?: number
    batteryLevel?: number
    error?: string
  }> {
    const startTime = Date.now()
    
    try {
      const status = await bluetoothPrinterService.checkBluetoothPrinterStatus(deviceId)
      const responseTime = Date.now() - startTime
      
      return {
        success: status.connected,
        responseTime,
        signalStrength: status.signalStrength,
        batteryLevel: status.batteryLevel,
        error: status.error
      }
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Connection test failed'
      }
    }
  }

  async optimizeConnectionForDevice(
    deviceId: string, 
    optimization: BluetoothOptimizationConfig
  ): Promise<void> {
    // Apply connection optimizations
    if (optimization.keepAliveInterval !== BluetoothConstants.KEEP_ALIVE_INTERVAL) {
      this.stopKeepAlive(deviceId)
      
      const interval = setInterval(async () => {
        try {
          await bluetoothPrinterService.checkBluetoothPrinterStatus(deviceId)
        } catch (error) {
          console.warn(`Optimized keep-alive failed for ${deviceId}:`, error)
          this.handleBluetoothDisconnection(deviceId)
        }
      }, optimization.keepAliveInterval)
      
      this.keepAliveIntervals.set(deviceId, interval)
    }
    
    if (optimization.enableLowPowerMode) {
      // Reduce monitoring frequency for battery optimization
      if (this.connectionMonitorInterval) {
        clearInterval(this.connectionMonitorInterval)
        this.connectionMonitorInterval = setInterval(async () => {
          await this.monitorAllConnections()
        }, optimization.keepAliveInterval * 2)
      }
    }
  }

  getTransmissionStats(): Map<string, BluetoothTransmissionStats> {
    return bluetoothPrinterService.getAllTransmissionStats()
  }

  destroy(): void {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval)
    }
    
    for (const interval of this.keepAliveIntervals.values()) {
      clearInterval(interval)
    }
    
    this.keepAliveIntervals.clear()
    this.connectionAttempts.clear()
  }
}

export const bluetoothConnectionManager = BluetoothConnectionManager.getInstance()