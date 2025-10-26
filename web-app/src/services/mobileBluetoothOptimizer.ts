import type {
  BluetoothOptimizationConfig,
  MobileBluetoothFeatures,
  BluetoothTransmissionStats,
  BluetoothDevice
} from '../types/bluetoothPrinter'
import { BluetoothConstants } from '../types/bluetoothPrinter'
import { bluetoothPrinterService } from './bluetoothPrinterService'
import { bluetoothConnectionManager } from './bluetoothConnectionManager'
import { log } from '../utils/secureLogger'

export interface MobileDeviceInfo {
  isMobile: boolean
  isIOS: boolean
  isAndroid: boolean
  browserName: string
  osVersion?: string
  batteryLevel?: number
  connectionType?: string
  screenSize: { width: number; height: number }
}

export interface MobileBatteryInfo {
  level: number
  charging: boolean
  chargingTime?: number
  dischargingTime?: number
}

export interface MobileOptimizationSettings {
  enableBatteryOptimization: boolean
  enableLowPowerMode: boolean
  enableBackgroundSync: boolean
  reduceBluetoothScanning: boolean
  optimizeChunkSize: boolean
  enableConnectionPersistence: boolean
  maxConcurrentConnections: number
  autoDisconnectTimeout: number
}

export class MobileBluetoothOptimizer {
  private static instance: MobileBluetoothOptimizer
  private deviceInfo: MobileDeviceInfo
  private batteryMonitor?: BatteryManager
  private optimizationSettings: MobileOptimizationSettings
  private performanceMonitor?: PerformanceObserver
  private lowPowerModeEnabled = false
  private connectionTimeouts = new Map<string, NodeJS.Timeout>()

  static getInstance(): MobileBluetoothOptimizer {
    if (!MobileBluetoothOptimizer.instance) {
      MobileBluetoothOptimizer.instance = new MobileBluetoothOptimizer()
    }
    return MobileBluetoothOptimizer.instance
  }

  constructor() {
    this.deviceInfo = this.detectMobileDevice()
    this.optimizationSettings = this.getDefaultMobileSettings()
    this.initializeMobileOptimizations()
  }

  private detectMobileDevice(): MobileDeviceInfo {
    const userAgent = navigator.userAgent
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(userAgent)
    const isAndroid = /Android/.test(userAgent)
    
    let browserName = 'Unknown'
    if (userAgent.includes('Chrome')) browserName = 'Chrome'
    else if (userAgent.includes('Safari')) browserName = 'Safari'
    else if (userAgent.includes('Firefox')) browserName = 'Firefox'
    else if (userAgent.includes('Edge')) browserName = 'Edge'
    
    const screenSize = {
      width: window.screen.width,
      height: window.screen.height
    }

    return {
      isMobile,
      isIOS,
      isAndroid,
      browserName,
      screenSize
    }
  }

  private getDefaultMobileSettings(): MobileOptimizationSettings {
    return {
      enableBatteryOptimization: this.deviceInfo.isMobile,
      enableLowPowerMode: false,
      enableBackgroundSync: this.deviceInfo.isMobile,
      reduceBluetoothScanning: this.deviceInfo.isMobile,
      optimizeChunkSize: this.deviceInfo.isMobile,
      enableConnectionPersistence: true,
      maxConcurrentConnections: this.deviceInfo.isMobile ? 1 : 3,
      autoDisconnectTimeout: this.deviceInfo.isMobile ? 300000 : 600000 // 5min vs 10min
    }
  }

  private async initializeMobileOptimizations(): Promise<void> {
    if (!this.deviceInfo.isMobile) return

    try {
      // Initialize battery monitoring
      await this.initializeBatteryMonitoring()
      
      // Initialize performance monitoring
      this.initializePerformanceMonitoring()
      
      // Set up visibility change handling for background optimization
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
      
      // Set up network change handling
      if ('connection' in navigator) {
        (navigator as any).connection.addEventListener('change', this.handleNetworkChange.bind(this))
      }
      
      log.success('Mobile Bluetooth optimizations initialized')
    } catch (error) {
      log.warn('Failed to initialize mobile optimizations', error)
    }
  }

  private async initializeBatteryMonitoring(): Promise<void> {
    try {
      if ('getBattery' in navigator) {
        this.batteryMonitor = await (navigator as any).getBattery()
        
        this.batteryMonitor.addEventListener('levelchange', this.handleBatteryLevelChange.bind(this))
        this.batteryMonitor.addEventListener('chargingchange', this.handleChargingChange.bind(this))
        
        // Initial battery optimization check
        await this.handleBatteryLevelChange()
      }
    } catch (error) {
      log.warn('Battery monitoring not available', error)
    }
  }

  private initializePerformanceMonitoring(): void {
    try {
      if ('PerformanceObserver' in window) {
        this.performanceMonitor = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          
          // Monitor for long tasks that might affect Bluetooth performance
          entries.forEach((entry) => {
            if (entry.entryType === 'longtask' && entry.duration > 50) {
              log.warn('Long task detected - may affect Bluetooth performance', { duration: entry.duration })
              this.adjustOptimizationsForPerformance()
            }
          })
        })
        
        this.performanceMonitor.observe({ entryTypes: ['longtask', 'measure'] })
      }
    } catch (error) {
      log.warn('Performance monitoring not available', error)
    }
  }

  optimizeForMobile(): BluetoothOptimizationConfig {
    const baseConfig: BluetoothOptimizationConfig = {
      scanDuration: this.optimizationSettings.reduceBluetoothScanning ? 10000 : 15000,
      scanInterval: this.optimizationSettings.reduceBluetoothScanning ? 60000 : 30000,
      preferredChunkSize: this.getOptimalChunkSize(),
      transmissionDelay: this.getOptimalTransmissionDelay(),
      connectionTimeout: this.deviceInfo.isMobile ? 15000 : 10000,
      keepAliveInterval: this.getOptimalKeepAliveInterval(),
      enableLowPowerMode: this.lowPowerModeEnabled,
      automaticDisconnect: this.optimizationSettings.autoDisconnectTimeout
    }

    // Apply battery-specific optimizations
    if (this.batteryMonitor && this.batteryMonitor.level < 0.2) {
      baseConfig.scanDuration = Math.min(baseConfig.scanDuration, 8000)
      baseConfig.scanInterval = Math.max(baseConfig.scanInterval, 120000)
      baseConfig.keepAliveInterval = Math.max(baseConfig.keepAliveInterval, 60000)
      baseConfig.enableLowPowerMode = true
    }

    // iOS-specific optimizations
    if (this.deviceInfo.isIOS) {
      baseConfig.preferredChunkSize = Math.min(baseConfig.preferredChunkSize, 20)
      baseConfig.transmissionDelay = Math.max(baseConfig.transmissionDelay, 100)
      baseConfig.connectionTimeout = Math.max(baseConfig.connectionTimeout, 20000)
    }

    // Android-specific optimizations
    if (this.deviceInfo.isAndroid) {
      baseConfig.preferredChunkSize = Math.min(baseConfig.preferredChunkSize, 512)
      baseConfig.transmissionDelay = Math.max(baseConfig.transmissionDelay, 50)
    }

    return baseConfig
  }

  async requestMobileBluetoothPermissions(): Promise<boolean> {
    if (!this.deviceInfo.isMobile) return true

    try {
      // Check location permission for Bluetooth discovery on mobile
      if ('permissions' in navigator) {
        const locationPermission = await navigator.permissions.query({ 
          name: 'geolocation' as PermissionName 
        })
        
        if (locationPermission.state !== 'granted') {
          // Show user-friendly message about location requirement
          const userConsent = confirm(
            'Location permission is required for Bluetooth printer discovery on mobile devices. ' +
            'This is a browser requirement and location data is not stored or transmitted.'
          )
          
          if (!userConsent) {
            throw new Error('Location permission required for Bluetooth discovery on mobile devices')
          }
        }
      }

      // Request notification permission for print status updates
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission()
      }

      return true
    } catch (error) {
      log.warn('Mobile Bluetooth permission check failed', error)
      return false
    }
  }

  private getOptimalChunkSize(): number {
    let chunkSize = BluetoothConstants.DEFAULT_CHUNK_SIZE

    // Optimize based on device capabilities
    if (this.deviceInfo.isMobile) {
      if (this.deviceInfo.isIOS) {
        chunkSize = 20 // Smaller chunks for iOS reliability
      } else if (this.deviceInfo.isAndroid) {
        chunkSize = Math.min(512, chunkSize) // Larger chunks for Android if supported
      }
    }

    // Battery optimization
    if (this.batteryMonitor && this.batteryMonitor.level < 0.15) {
      chunkSize = Math.min(chunkSize, 20) // Smaller chunks to reduce processing
    }

    return chunkSize
  }

  private getOptimalTransmissionDelay(): number {
    let delay = BluetoothConstants.DEFAULT_CHUNK_DELAY

    if (this.deviceInfo.isMobile) {
      delay = Math.max(delay, 100) // Longer delay for mobile reliability
      
      if (this.deviceInfo.isIOS) {
        delay = Math.max(delay, 150) // Even longer for iOS
      }
    }

    // Increase delay under low battery conditions
    if (this.batteryMonitor && this.batteryMonitor.level < 0.2) {
      delay *= 1.5
    }

    // Increase delay during low power mode
    if (this.lowPowerModeEnabled) {
      delay *= 2
    }

    return Math.round(delay)
  }

  private getOptimalKeepAliveInterval(): number {
    let interval = BluetoothConstants.KEEP_ALIVE_INTERVAL

    if (this.deviceInfo.isMobile) {
      interval = Math.max(interval, 45000) // 45 seconds for mobile
    }

    // Reduce frequency under battery optimization
    if (this.optimizationSettings.enableBatteryOptimization && this.batteryMonitor) {
      if (this.batteryMonitor.level < 0.3) {
        interval = Math.max(interval, 90000) // 90 seconds when battery low
      }
    }

    return interval
  }

  private async handleBatteryLevelChange(): Promise<void> {
    if (!this.batteryMonitor) return

    const batteryLevel = this.batteryMonitor.level
    
    if (batteryLevel < 0.15 && !this.lowPowerModeEnabled) {
      await this.enableLowPowerMode()
    } else if (batteryLevel > 0.3 && this.lowPowerModeEnabled) {
      await this.disableLowPowerMode()
    }

    // Notify connected devices of battery optimization changes
    const connectedDevices = await bluetoothPrinterService.getConnectedDevices()
    for (const device of connectedDevices) {
      const optimizedConfig = this.optimizeForMobile()
      await bluetoothConnectionManager.optimizeConnectionForDevice(device.id, optimizedConfig)
    }
  }

  private async handleChargingChange(): Promise<void> {
    if (!this.batteryMonitor) return

    if (this.batteryMonitor.charging && this.lowPowerModeEnabled) {
      // Device is charging, can reduce battery optimizations
      await this.disableLowPowerMode()
    }
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      // Page is hidden, reduce Bluetooth activity
      this.enableBackgroundOptimizations()
    } else {
      // Page is visible, restore normal operation
      this.disableBackgroundOptimizations()
    }
  }

  private handleNetworkChange(): void {
    const connection = (navigator as any).connection
    if (connection) {
      log.debug('Network changed', { effectiveType: connection.effectiveType, downlink: connection.downlink })

      // Adjust optimizations based on network conditions
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        this.optimizationSettings.reduceBluetoothScanning = true
      }
    }
  }

  private async enableLowPowerMode(): Promise<void> {
    this.lowPowerModeEnabled = true
    log.info('Enabling low power mode for Bluetooth operations')

    // Start auto-disconnect timers for idle connections
    const connectedDevices = await bluetoothPrinterService.getConnectedDevices()
    for (const device of connectedDevices) {
      this.startAutoDisconnectTimer(device.id)
    }
  }

  private async disableLowPowerMode(): Promise<void> {
    this.lowPowerModeEnabled = false
    log.info('Disabling low power mode for Bluetooth operations')

    // Clear auto-disconnect timers
    for (const timeout of this.connectionTimeouts.values()) {
      clearTimeout(timeout)
    }
    this.connectionTimeouts.clear()
  }

  private enableBackgroundOptimizations(): void {
    if (this.optimizationSettings.enableBackgroundSync) {
      log.info('Enabling background Bluetooth optimizations')

      // Reduce scanning and monitoring frequency
      this.optimizationSettings.reduceBluetoothScanning = true
    }
  }

  private disableBackgroundOptimizations(): void {
    log.info('Disabling background Bluetooth optimizations')
    this.optimizationSettings.reduceBluetoothScanning = false
  }

  private adjustOptimizationsForPerformance(): void {
    // Temporarily reduce Bluetooth activity due to detected performance issues
    log.info('Adjusting Bluetooth optimizations due to performance issues')

    setTimeout(() => {
      // Increase chunk delay to reduce processor load
      const connectedDevices = bluetoothPrinterService.getConnectedDevices()
      // Implementation would adjust active connections
    }, 100)
  }

  private startAutoDisconnectTimer(deviceId: string): void {
    this.clearAutoDisconnectTimer(deviceId)
    
    const timeout = setTimeout(async () => {
      try {
        log.info('Auto-disconnecting device due to battery optimization', { deviceId })
        await bluetoothPrinterService.disconnectBluetoothPrinter(deviceId)
      } catch (error) {
        log.error('Failed to auto-disconnect device', { deviceId, error })
      } finally {
        this.connectionTimeouts.delete(deviceId)
      }
    }, this.optimizationSettings.autoDisconnectTimeout)
    
    this.connectionTimeouts.set(deviceId, timeout)
  }

  private clearAutoDisconnectTimer(deviceId: string): void {
    const timeout = this.connectionTimeouts.get(deviceId)
    if (timeout) {
      clearTimeout(timeout)
      this.connectionTimeouts.delete(deviceId)
    }
  }

  getMobileDeviceInfo(): MobileDeviceInfo {
    return { ...this.deviceInfo }
  }

  getBatteryInfo(): MobileBatteryInfo | null {
    if (!this.batteryMonitor) return null

    return {
      level: this.batteryMonitor.level,
      charging: this.batteryMonitor.charging,
      chargingTime: this.batteryMonitor.chargingTime || undefined,
      dischargingTime: this.batteryMonitor.dischargingTime || undefined
    }
  }

  getMobileFeatures(): MobileBluetoothFeatures {
    return {
      lowPowerMode: this.lowPowerModeEnabled,
      backgroundSync: this.optimizationSettings.enableBackgroundSync,
      connectionPersistence: this.optimizationSettings.enableConnectionPersistence,
      batteryOptimization: this.optimizationSettings.enableBatteryOptimization,
      reducedScanFrequency: this.optimizationSettings.reduceBluetoothScanning,
      chunkSizeOptimization: this.optimizationSettings.optimizeChunkSize
    }
  }

  updateOptimizationSettings(settings: Partial<MobileOptimizationSettings>): void {
    this.optimizationSettings = { ...this.optimizationSettings, ...settings }
    log.debug('Updated mobile optimization settings', settings)
  }

  destroy(): void {
    if (this.performanceMonitor) {
      this.performanceMonitor.disconnect()
    }
    
    for (const timeout of this.connectionTimeouts.values()) {
      clearTimeout(timeout)
    }
    this.connectionTimeouts.clear()
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
  }
}

export const mobileBluetoothOptimizer = MobileBluetoothOptimizer.getInstance()