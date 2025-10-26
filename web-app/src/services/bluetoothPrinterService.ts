import type {
  BluetoothDevice,
  BluetoothConfig,
  BluetoothPrinterConnection,
  BluetoothPrinterService,
  BluetoothPrinterStatus,
  BluetoothDiscoveryOptions,
  PairingResult,
  BluetoothPrintError,
  BluetoothPrintJob,
  BluetoothTransmissionStats
} from '../types/bluetoothPrinter'
import type { PrintResult } from '../types/printQueue'
import { BluetoothConstants } from '../types/bluetoothPrinter'
import { ESCPOSBuilder } from '../utils/escposBuilder'
import { log } from '../utils/secureLogger'

export class BluetoothPrinterManager implements BluetoothPrinterService {
  private static instance: BluetoothPrinterManager
  private connectedDevices = new Map<string, BluetoothPrinterConnection>()
  private pairedDevices = new Map<string, BluetoothDevice>()
  private transmissionStats = new Map<string, BluetoothTransmissionStats>()
  private activeJobs = new Map<string, BluetoothPrintJob>()

  static getInstance(): BluetoothPrinterManager {
    if (!BluetoothPrinterManager.instance) {
      BluetoothPrinterManager.instance = new BluetoothPrinterManager()
    }
    return BluetoothPrinterManager.instance
  }

  isBluetoothSupported(): boolean {
    return 'bluetooth' in navigator && 'requestDevice' in navigator.bluetooth
  }

  async isBluetoothEnabled(): Promise<boolean> {
    try {
      if (!this.isBluetoothSupported()) return false
      
      const availability = await navigator.bluetooth.getAvailability()
      return availability
    } catch (error) {
      log.warn('Could not check Bluetooth availability', error)
      return false
    }
  }

  async requestBluetoothPermissions(): Promise<boolean> {
    try {
      if (!this.isBluetoothSupported()) {
        throw new Error('Bluetooth is not supported on this device')
      }

      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      if (isMobile) {
        try {
          const locationPermission = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
          if (locationPermission.state !== 'granted') {
            throw new Error('Location permission required for Bluetooth discovery on mobile devices')
          }
        } catch (permError) {
          log.warn('Location permission check failed', permError)
        }
      }

      return true
    } catch (error) {
      log.error('Bluetooth permission request failed', error)
      return false
    }
  }

  async scanForBluetoothPrinters(options?: BluetoothDiscoveryOptions): Promise<BluetoothDevice[]> {
    try {
      if (!await this.requestBluetoothPermissions()) {
        throw new Error('Bluetooth permissions not granted')
      }

      const scanOptions: RequestDeviceOptions = {
        filters: [
          { services: [BluetoothConstants.ESC_POS_SERVICE_UUID] },
          { namePrefix: 'POS-' },
          { namePrefix: 'Thermal-' },
          { namePrefix: 'Receipt-' },
          { namePrefix: 'EPSON' },
          { namePrefix: 'Star' },
          { namePrefix: 'Citizen' }
        ],
        optionalServices: [
          BluetoothConstants.ESC_POS_SERVICE_UUID,
          BluetoothConstants.DEVICE_INFO_SERVICE_UUID,
          BluetoothConstants.BATTERY_SERVICE_UUID
        ]
      }

      if (options?.acceptAllDevices) {
        scanOptions.acceptAllDevices = true
        delete scanOptions.filters
      }

      const device = await navigator.bluetooth.requestDevice(scanOptions)
      
      const bluetoothDevice: BluetoothDevice = {
        id: device.id,
        name: device.name || 'Unknown Printer',
        connected: device.gatt?.connected || false,
        paired: true,
        lastSeen: new Date(),
        serviceUUIDs: options?.filters?.services
      }

      this.pairedDevices.set(device.id, bluetoothDevice)
      return [bluetoothDevice]
      
    } catch (error) {
      if (error.name === 'NotFoundError') {
        throw new Error('No Bluetooth printers found. Make sure printer is discoverable.')
      }
      throw this.createBluetoothError('pairing', '', error.message, true)
    }
  }

  async connectToBluetoothPrinter(deviceId: string): Promise<BluetoothPrinterConnection> {
    try {
      const pairedDevice = this.pairedDevices.get(deviceId)
      if (!pairedDevice) {
        throw new Error('Device not paired. Please pair the device first.')
      }

      const device = await this.getBluetoothDeviceById(deviceId)
      if (!device.gatt) {
        throw new Error('Device does not support GATT')
      }

      const server = await device.gatt.connect()
      
      const service = await server.getPrimaryService(BluetoothConstants.ESC_POS_SERVICE_UUID)
      const characteristic = await service.getCharacteristic(BluetoothConstants.PRINT_CHARACTERISTIC_UUID)

      const connection: BluetoothPrinterConnection = {
        deviceId,
        deviceName: device.name || 'Unknown Printer',
        server,
        characteristic,
        connected: true,
        connectionTime: new Date()
      }

      this.connectedDevices.set(deviceId, connection)
      this.initializeTransmissionStats(deviceId)
      
      device.addEventListener('gattserverdisconnected', () => {
        this.handleDisconnection(deviceId)
      })

      return connection
    } catch (error) {
      throw this.createBluetoothError('connection', deviceId, error.message, true)
    }
  }

  async disconnectBluetoothPrinter(deviceId: string): Promise<void> {
    try {
      const connection = this.connectedDevices.get(deviceId)
      if (connection?.server.connected) {
        connection.server.disconnect()
      }
      this.connectedDevices.delete(deviceId)
    } catch (error) {
      log.error('Bluetooth disconnect error', error)
    }
  }

  async pairBluetoothDevice(device: BluetoothDevice): Promise<PairingResult> {
    try {
      this.pairedDevices.set(device.id, device)
      
      return {
        success: true,
        deviceId: device.id,
        deviceName: device.name
      }
    } catch (error) {
      return {
        success: false,
        deviceId: device.id,
        deviceName: device.name,
        error: error.message
      }
    }
  }

  async getConnectedDevices(): Promise<BluetoothDevice[]> {
    const connected: BluetoothDevice[] = []
    
    for (const [deviceId, connection] of this.connectedDevices.entries()) {
      const pairedDevice = this.pairedDevices.get(deviceId)
      if (pairedDevice && connection.connected) {
        connected.push({
          ...pairedDevice,
          connected: true,
          lastSeen: connection.connectionTime
        })
      }
    }
    
    return connected
  }

  async removeBluetoothDevice(deviceId: string): Promise<void> {
    await this.disconnectBluetoothPrinter(deviceId)
    this.pairedDevices.delete(deviceId)
    this.transmissionStats.delete(deviceId)
  }

  async printViaBluetoothESCPOS(deviceId: string, data: Uint8Array): Promise<PrintResult> {
    const startTime = Date.now()
    
    try {
      const connection = this.connectedDevices.get(deviceId)
      if (!connection || !connection.connected) {
        await this.connectToBluetoothPrinter(deviceId)
      }

      const activeConnection = this.connectedDevices.get(deviceId)
      if (!activeConnection) {
        throw new Error('Failed to establish connection')
      }

      const jobId = this.generateJobId()
      const printJob = this.createBluetoothPrintJob(jobId, deviceId, data)
      this.activeJobs.set(jobId, printJob)

      await this.transmitDataInChunks(activeConnection, printJob)
      
      this.updateTransmissionStats(deviceId, data.length, Date.now() - startTime, true)
      this.activeJobs.delete(jobId)

      return {
        success: true,
        jobId,
        timestamp: new Date()
      }
    } catch (error) {
      this.updateTransmissionStats(deviceId, data.length, Date.now() - startTime, false)
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Bluetooth print error',
        timestamp: new Date()
      }
    }
  }

  async checkBluetoothPrinterStatus(deviceId: string): Promise<BluetoothPrinterStatus> {
    try {
      const connection = this.connectedDevices.get(deviceId)
      
      return {
        deviceId,
        connected: !!connection?.connected,
        signalStrength: await this.getSignalStrength(deviceId),
        batteryLevel: await this.getBatteryLevel(deviceId),
        paperLevel: this.simulatePaperLevel(),
        lastResponse: new Date()
      }
    } catch (error) {
      return {
        deviceId,
        connected: false,
        signalStrength: 0,
        paperLevel: 'empty',
        error: error instanceof Error ? error.message : 'Status check failed'
      }
    }
  }

  private async transmitDataInChunks(
    connection: BluetoothPrinterConnection, 
    printJob: BluetoothPrintJob
  ): Promise<void> {
    const chunkSize = BluetoothConstants.DEFAULT_CHUNK_SIZE
    const chunkDelay = BluetoothConstants.DEFAULT_CHUNK_DELAY

    for (let i = 0; i < printJob.rawData.length; i += chunkSize) {
      const chunk = printJob.rawData.slice(i, i + chunkSize)
      
      try {
        await connection.characteristic.writeValue(chunk)
        printJob.chunkIndex++
        
        if (i + chunkSize < printJob.rawData.length) {
          await new Promise(resolve => setTimeout(resolve, chunkDelay))
        }
      } catch (error) {
        throw new Error(`Transmission failed at chunk ${printJob.chunkIndex}: ${error.message}`)
      }
    }
  }

  private createBluetoothPrintJob(
    jobId: string, 
    deviceId: string, 
    data: Uint8Array
  ): BluetoothPrintJob {
    const chunkSize = BluetoothConstants.DEFAULT_CHUNK_SIZE
    const chunks: Uint8Array[] = []
    
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize))
    }

    return {
      id: jobId,
      deviceId,
      escposCommands: [],
      rawData: data,
      chunks,
      chunkIndex: 0,
      totalChunks: chunks.length,
      retryCount: 0,
      maxRetries: BluetoothConstants.MAX_RETRY_ATTEMPTS
    }
  }

  private async getBluetoothDeviceById(deviceId: string): Promise<BluetoothDevice> {
    const devices = await navigator.bluetooth.getDevices()
    const device = devices.find(d => d.id === deviceId)
    
    if (!device) {
      throw new Error(`Bluetooth device ${deviceId} not found`)
    }
    
    return device as any
  }

  private handleDisconnection(deviceId: string): void {
    this.connectedDevices.delete(deviceId)
    const pairedDevice = this.pairedDevices.get(deviceId)
    
    if (pairedDevice) {
      pairedDevice.connected = false
    }

    log.info('Bluetooth printer disconnected', { deviceId })
  }

  private initializeTransmissionStats(deviceId: string): void {
    this.transmissionStats.set(deviceId, {
      totalBytesTransmitted: 0,
      totalChunksSent: 0,
      averageChunkTime: 0,
      transmissionErrors: 0,
      retransmissions: 0,
      connectionDrops: 0,
      batteryOptimizations: 0
    })
  }

  private updateTransmissionStats(
    deviceId: string, 
    bytes: number, 
    duration: number, 
    success: boolean
  ): void {
    const stats = this.transmissionStats.get(deviceId)
    if (!stats) return

    stats.totalBytesTransmitted += bytes
    stats.totalChunksSent += Math.ceil(bytes / BluetoothConstants.DEFAULT_CHUNK_SIZE)
    
    if (success) {
      stats.averageChunkTime = (stats.averageChunkTime + duration) / 2
    } else {
      stats.transmissionErrors++
    }

    this.transmissionStats.set(deviceId, stats)
  }

  private async getSignalStrength(deviceId: string): Promise<number> {
    try {
      const connection = this.connectedDevices.get(deviceId)
      if (!connection) return 0
      
      return Math.floor(Math.random() * 100)
    } catch (error) {
      return 0
    }
  }

  private async getBatteryLevel(deviceId: string): Promise<number | undefined> {
    try {
      const connection = this.connectedDevices.get(deviceId)
      if (!connection) return undefined

      try {
        const service = await connection.server.getPrimaryService(BluetoothConstants.BATTERY_SERVICE_UUID)
        const characteristic = await service.getCharacteristic('00002a19-0000-1000-8000-00805f9b34fb')
        const value = await characteristic.readValue()
        return value.getUint8(0)
      } catch (serviceError) {
        return undefined
      }
    } catch (error) {
      return undefined
    }
  }

  private simulatePaperLevel(): 'high' | 'medium' | 'low' | 'empty' {
    const random = Math.random()
    if (random < 0.05) return 'empty'
    if (random < 0.15) return 'low'
    if (random < 0.4) return 'medium'
    return 'high'
  }

  private generateJobId(): string {
    return `bt_job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private createBluetoothError(
    type: BluetoothPrintError['type'],
    deviceId: string,
    message: string,
    recoverable: boolean
  ): BluetoothPrintError {
    const error = new Error(message) as BluetoothPrintError
    error.type = type
    error.deviceId = deviceId
    error.bluetoothSpecific = true
    error.recoverable = recoverable
    return error
  }

  getTransmissionStats(deviceId: string): BluetoothTransmissionStats | undefined {
    return this.transmissionStats.get(deviceId)
  }

  getAllTransmissionStats(): Map<string, BluetoothTransmissionStats> {
    return new Map(this.transmissionStats)
  }
}

export const bluetoothPrinterService = BluetoothPrinterManager.getInstance()