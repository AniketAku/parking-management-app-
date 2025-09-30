import type { PrinterProfile, PrintResult } from './printQueue'

export interface BluetoothDevice {
  id: string
  name: string
  macAddress?: string
  rssi?: number
  connected: boolean
  paired: boolean
  lastSeen: Date
  manufacturerData?: ArrayBuffer
  serviceUUIDs?: string[]
}

export interface BluetoothConfig {
  deviceId: string
  deviceName: string
  macAddress: string
  serviceUUID: string
  characteristicUUID: string
  autoReconnect: boolean
  connectionTimeout: number
  chunkSize: number
  chunkDelay: number
  keepAliveInterval: number
  maxRetryAttempts: number
}

export interface BluetoothPrinterProfile extends PrinterProfile {
  connection: 'bluetooth'
  bluetoothConfig: BluetoothConfig
  batteryLevel?: number
  signalStrength?: number
}

export interface BluetoothPrinterConnection {
  deviceId: string
  deviceName: string
  server: BluetoothRemoteGATTServer
  characteristic: BluetoothRemoteGATTCharacteristic
  connected: boolean
  connectionTime: Date
  signalStrength?: number
  batteryLevel?: number
}

export interface PairingResult {
  success: boolean
  deviceId: string
  deviceName: string
  error?: string
  requiresPin?: boolean
  pin?: string
}

export interface BluetoothPrinterStatus {
  deviceId: string
  connected: boolean
  signalStrength: number
  batteryLevel?: number
  paperLevel: 'high' | 'medium' | 'low' | 'empty'
  error?: string
  lastResponse?: Date
}

export interface BluetoothPrintError extends Error {
  type: 'connection' | 'pairing' | 'transmission' | 'timeout' | 'permissions'
  deviceId: string
  bluetoothSpecific: boolean
  recoverable: boolean
}

export interface ErrorRecoveryPlan {
  autoRecovery: boolean
  steps: string[]
  retryDelay?: number
  requiresUserIntervention?: boolean
  maxRetries?: number
}

export interface BluetoothOptimizationConfig {
  scanDuration: number
  scanInterval: number
  preferredChunkSize: number
  transmissionDelay: number
  connectionTimeout: number
  keepAliveInterval: number
  enableLowPowerMode: boolean
  automaticDisconnect: number
}

export interface BluetoothPrinterService {
  scanForBluetoothPrinters(): Promise<BluetoothDevice[]>
  connectToBluetoothPrinter(deviceId: string): Promise<BluetoothPrinterConnection>
  disconnectBluetoothPrinter(deviceId: string): Promise<void>
  pairBluetoothDevice(device: BluetoothDevice): Promise<PairingResult>
  getConnectedDevices(): Promise<BluetoothDevice[]>
  removeBluetoothDevice(deviceId: string): Promise<void>
  printViaBluetoothESCPOS(deviceId: string, data: Uint8Array): Promise<PrintResult>
  checkBluetoothPrinterStatus(deviceId: string): Promise<BluetoothPrinterStatus>
  requestBluetoothPermissions(): Promise<boolean>
  isBluetoothSupported(): boolean
  isBluetoothEnabled(): Promise<boolean>
}

export interface ESCPOSCommand {
  type: 'text' | 'image' | 'cut' | 'feed' | 'init' | 'align' | 'size' | 'style'
  data?: string | Uint8Array
  parameters?: Record<string, any>
}

export interface ESCPOSBuilder {
  init(): ESCPOSBuilder
  text(content: string): ESCPOSBuilder
  bold(enabled: boolean): ESCPOSBuilder
  align(alignment: 'left' | 'center' | 'right'): ESCPOSBuilder
  size(width: number, height: number): ESCPOSBuilder
  feed(lines: number): ESCPOSBuilder
  cut(type?: 'full' | 'partial'): ESCPOSBuilder
  image(imageData: Uint8Array): ESCPOSBuilder
  barcode(data: string, type: string): ESCPOSBuilder
  qrCode(data: string, size?: number): ESCPOSBuilder
  build(): Uint8Array
}

export interface BluetoothPrintJob {
  id: string
  deviceId: string
  escposCommands: ESCPOSCommand[]
  rawData: Uint8Array
  chunks: Uint8Array[]
  chunkIndex: number
  totalChunks: number
  retryCount: number
  maxRetries: number
}

export interface BluetoothDiscoveryOptions {
  scanDuration?: number
  filters?: {
    namePrefix?: string[]
    services?: string[]
    manufacturerData?: { companyId: number; dataPrefix?: Uint8Array }[]
  }
  acceptAllDevices?: boolean
  optionalServices?: string[]
}

export interface BluetoothTransmissionStats {
  totalBytesTransmitted: number
  totalChunksSent: number
  averageChunkTime: number
  transmissionErrors: number
  retransmissions: number
  connectionDrops: number
  batteryOptimizations: number
}

export interface MobileBluetoothFeatures {
  lowPowerMode: boolean
  backgroundSync: boolean
  connectionPersistence: boolean
  batteryOptimization: boolean
  reducedScanFrequency: boolean
  chunkSizeOptimization: boolean
}

export const BluetoothConstants = {
  ESC_POS_SERVICE_UUID: '000018f0-0000-1000-8000-00805f9b34fb',
  PRINT_CHARACTERISTIC_UUID: '00002af1-0000-1000-8000-00805f9b34fb',
  DEVICE_INFO_SERVICE_UUID: '0000180a-0000-1000-8000-00805f9b34fb',
  BATTERY_SERVICE_UUID: '0000180f-0000-1000-8000-00805f9b34fb',
  DEFAULT_CHUNK_SIZE: 20,
  DEFAULT_CHUNK_DELAY: 50,
  CONNECTION_TIMEOUT: 10000,
  MAX_RETRY_ATTEMPTS: 3,
  SCAN_TIMEOUT: 10000,
  KEEP_ALIVE_INTERVAL: 30000
} as const