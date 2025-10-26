import type {
  BluetoothPrintError,
  ErrorRecoveryPlan,
  BluetoothDevice
} from '../types/bluetoothPrinter'
import { bluetoothPrinterService } from './bluetoothPrinterService'
import { bluetoothConnectionManager } from './bluetoothConnectionManager'
import { log } from '../utils/secureLogger'

export interface ErrorContext {
  deviceId: string
  deviceName?: string
  operation: string
  timestamp: Date
  userAgent?: string
  batteryLevel?: number
  signalStrength?: number
}

export interface RecoveryAttempt {
  errorType: BluetoothPrintError['type']
  deviceId: string
  attempt: number
  startTime: Date
  endTime?: Date
  success: boolean
  error?: string
}

export class BluetoothErrorHandler {
  private static instance: BluetoothErrorHandler
  private recoveryAttempts = new Map<string, RecoveryAttempt[]>()
  private errorHistory = new Map<string, BluetoothPrintError[]>()
  private maxErrorHistory = 50
  private maxRecoveryAttempts = 3

  static getInstance(): BluetoothErrorHandler {
    if (!BluetoothErrorHandler.instance) {
      BluetoothErrorHandler.instance = new BluetoothErrorHandler()
    }
    return BluetoothErrorHandler.instance
  }

  handleBluetoothError(error: BluetoothPrintError, context?: ErrorContext): ErrorRecoveryPlan {
    this.recordError(error, context)
    
    const recoveryPlan = this.getRecoveryPlan(error, context)
    
    if (recoveryPlan.autoRecovery && !recoveryPlan.requiresUserIntervention) {
      this.executeAutoRecovery(error, recoveryPlan, context)
    }
    
    return recoveryPlan
  }

  private getRecoveryPlan(error: BluetoothPrintError, context?: ErrorContext): ErrorRecoveryPlan {
    const errorType = error.type
    const deviceId = error.deviceId
    
    const baseRecoveryPlans: Record<BluetoothPrintError['type'], ErrorRecoveryPlan> = {
      connection: {
        autoRecovery: true,
        steps: [
          'Check Bluetooth is enabled on device',
          'Ensure printer is powered on and discoverable',
          'Try moving closer to printer (within 10 meters)',
          'Restart Bluetooth connection',
          'Clear Bluetooth cache if on mobile device'
        ],
        retryDelay: 10000,
        maxRetries: 3
      },
      
      pairing: {
        autoRecovery: false,
        steps: [
          'Put printer in pairing mode',
          'Clear browser Bluetooth cache',
          'Remove device from paired devices',
          'Restart browser and try pairing again',
          'Check printer compatibility with Web Bluetooth'
        ],
        requiresUserIntervention: true,
        maxRetries: 2
      },
      
      transmission: {
        autoRecovery: true,
        steps: [
          'Check Bluetooth signal strength',
          'Reduce transmission chunk size',
          'Increase delay between data chunks',
          'Move closer to printer',
          'Retry print operation'
        ],
        retryDelay: 5000,
        maxRetries: 3
      },
      
      timeout: {
        autoRecovery: true,
        steps: [
          'Check printer is responsive',
          'Increase connection timeout duration',
          'Reset Bluetooth connection',
          'Verify printer is not busy with other operations',
          'Retry operation with longer timeout'
        ],
        retryDelay: 15000,
        maxRetries: 2
      },
      
      permissions: {
        autoRecovery: false,
        steps: [
          'Enable Bluetooth permissions in browser',
          'Allow location access if on mobile device',
          'Check site permissions for Bluetooth access',
          'Refresh page and try again',
          'Use HTTPS connection if available'
        ],
        requiresUserIntervention: true,
        maxRetries: 1
      }
    }
    
    const basePlan = baseRecoveryPlans[errorType]
    
    // Enhance plan based on context and error history
    return this.enhanceRecoveryPlan(basePlan, error, context)
  }

  private enhanceRecoveryPlan(
    basePlan: ErrorRecoveryPlan, 
    error: BluetoothPrintError, 
    context?: ErrorContext
  ): ErrorRecoveryPlan {
    const enhancedPlan = { ...basePlan }
    const deviceId = error.deviceId
    const errorHistory = this.errorHistory.get(deviceId) || []
    const recentErrors = errorHistory.filter(e => 
      Date.now() - e.timestamp.getTime() < 300000 // 5 minutes
    )
    
    // Increase retry delay for devices with frequent errors
    if (recentErrors.length > 2) {
      enhancedPlan.retryDelay = (enhancedPlan.retryDelay || 5000) * 2
      enhancedPlan.steps.unshift('Wait longer due to frequent connection issues')
    }
    
    // Disable auto-recovery for devices that consistently fail
    if (recentErrors.length > 5) {
      enhancedPlan.autoRecovery = false
      enhancedPlan.requiresUserIntervention = true
      enhancedPlan.steps.unshift('Device requires manual intervention due to repeated failures')
    }
    
    // Mobile-specific enhancements
    if (this.isMobileDevice(context?.userAgent)) {
      switch (error.type) {
        case 'connection':
          enhancedPlan.steps.splice(2, 0, 'Check if device is in power saving mode')
          enhancedPlan.steps.push('Try turning screen brightness up')
          break
        case 'permissions':
          enhancedPlan.steps.splice(1, 0, 'Enable location services for Bluetooth discovery')
          break
        case 'transmission':
          enhancedPlan.steps.splice(1, 0, 'Close other Bluetooth-intensive apps')
          break
      }
    }
    
    // Battery-specific enhancements
    if (context?.batteryLevel && context.batteryLevel < 20) {
      enhancedPlan.steps.push('Consider connecting to power source - low battery may affect Bluetooth')
    }
    
    // Signal strength enhancements
    if (context?.signalStrength && context.signalStrength < 50) {
      enhancedPlan.steps.unshift('Move closer to printer - weak signal detected')
      enhancedPlan.retryDelay = (enhancedPlan.retryDelay || 5000) + 2000
    }
    
    return enhancedPlan
  }

  private async executeAutoRecovery(
    error: BluetoothPrintError, 
    plan: ErrorRecoveryPlan, 
    context?: ErrorContext
  ): Promise<void> {
    const deviceId = error.deviceId
    const attempts = this.recoveryAttempts.get(deviceId) || []

    if (attempts.length >= (plan.maxRetries || this.maxRecoveryAttempts)) {
      log.warn('Max recovery attempts reached for device', { deviceId })
      return
    }
    
    const attempt: RecoveryAttempt = {
      errorType: error.type,
      deviceId,
      attempt: attempts.length + 1,
      startTime: new Date(),
      success: false
    }

    try {
      log.info('Starting auto-recovery attempt', { deviceId, attempt: attempt.attempt })

      await this.executeRecoverySteps(error.type, deviceId, plan)

      attempt.success = true
      attempt.endTime = new Date()

      log.success('Auto-recovery successful', { deviceId })
    } catch (recoveryError) {
      attempt.success = false
      attempt.endTime = new Date()
      attempt.error = recoveryError instanceof Error ? recoveryError.message : 'Recovery failed'

      log.error('Auto-recovery failed', { deviceId, error: recoveryError })
    } finally {
      attempts.push(attempt)
      this.recoveryAttempts.set(deviceId, attempts)
    }
  }

  private async executeRecoverySteps(
    errorType: BluetoothPrintError['type'],
    deviceId: string,
    plan: ErrorRecoveryPlan
  ): Promise<void> {
    switch (errorType) {
      case 'connection':
        await this.recoverConnection(deviceId)
        break
      case 'transmission':
        await this.recoverTransmission(deviceId)
        break
      case 'timeout':
        await this.recoverTimeout(deviceId)
        break
      default:
        throw new Error(`Auto-recovery not available for error type: ${errorType}`)
    }
    
    if (plan.retryDelay) {
      await new Promise(resolve => setTimeout(resolve, plan.retryDelay))
    }
  }

  private async recoverConnection(deviceId: string): Promise<void> {
    try {
      // Force disconnect and reconnect
      await bluetoothPrinterService.disconnectBluetoothPrinter(deviceId)
      await new Promise(resolve => setTimeout(resolve, 2000))
      await bluetoothConnectionManager.forceReconnect(deviceId)
    } catch (error) {
      throw new Error(`Connection recovery failed: ${error.message}`)
    }
  }

  private async recoverTransmission(deviceId: string): Promise<void> {
    try {
      // Reset connection and test communication
      await this.recoverConnection(deviceId)
      const testResult = await bluetoothConnectionManager.testConnection(deviceId)
      
      if (!testResult.success) {
        throw new Error(`Transmission recovery test failed: ${testResult.error}`)
      }
    } catch (error) {
      throw new Error(`Transmission recovery failed: ${error.message}`)
    }
  }

  private async recoverTimeout(deviceId: string): Promise<void> {
    try {
      // Check if device is responsive
      const status = await bluetoothPrinterService.checkBluetoothPrinterStatus(deviceId)
      
      if (!status.connected) {
        await this.recoverConnection(deviceId)
      }
    } catch (error) {
      throw new Error(`Timeout recovery failed: ${error.message}`)
    }
  }

  private recordError(error: BluetoothPrintError, context?: ErrorContext): void {
    const deviceId = error.deviceId
    const history = this.errorHistory.get(deviceId) || []
    
    const errorRecord: BluetoothPrintError & { timestamp: Date; context?: ErrorContext } = {
      ...error,
      timestamp: new Date(),
      context
    }
    
    history.push(errorRecord as any)
    
    // Keep only recent errors
    if (history.length > this.maxErrorHistory) {
      history.splice(0, history.length - this.maxErrorHistory)
    }
    
    this.errorHistory.set(deviceId, history)
  }

  private isMobileDevice(userAgent?: string): boolean {
    if (!userAgent) {
      userAgent = navigator.userAgent
    }
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
  }

  getErrorHistory(deviceId: string): BluetoothPrintError[] {
    return this.errorHistory.get(deviceId) || []
  }

  getRecoveryAttempts(deviceId: string): RecoveryAttempt[] {
    return this.recoveryAttempts.get(deviceId) || []
  }

  clearErrorHistory(deviceId: string): void {
    this.errorHistory.delete(deviceId)
    this.recoveryAttempts.delete(deviceId)
    log.info('Cleared error history for device', { deviceId })
  }

  getAllErrorStats(): {
    totalErrors: number
    errorsByType: Record<string, number>
    deviceWithMostErrors: string | null
    successfulRecoveries: number
    failedRecoveries: number
  } {
    let totalErrors = 0
    const errorsByType: Record<string, number> = {}
    const errorsPerDevice: Record<string, number> = {}
    let successfulRecoveries = 0
    let failedRecoveries = 0
    
    for (const [deviceId, errors] of this.errorHistory.entries()) {
      totalErrors += errors.length
      errorsPerDevice[deviceId] = errors.length
      
      errors.forEach(error => {
        errorsByType[error.type] = (errorsByType[error.type] || 0) + 1
      })
    }
    
    for (const attempts of this.recoveryAttempts.values()) {
      attempts.forEach(attempt => {
        if (attempt.success) {
          successfulRecoveries++
        } else {
          failedRecoveries++
        }
      })
    }
    
    const deviceWithMostErrors = Object.entries(errorsPerDevice)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null
    
    return {
      totalErrors,
      errorsByType,
      deviceWithMostErrors,
      successfulRecoveries,
      failedRecoveries
    }
  }
}

export const bluetoothErrorHandler = BluetoothErrorHandler.getInstance()