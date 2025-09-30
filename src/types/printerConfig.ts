/**
 * Comprehensive Printer Configuration System Types
 * Hardware profiles, connection management, and printer capabilities
 */

// Connection configuration types
export interface USBConfig {
  vendorId: number
  productId: number
  endpoint?: number
  interface?: number
  timeout?: number
}

export interface NetworkConfig {
  ipAddress: string
  port: number
  protocol: 'ipp' | 'socket' | 'http' | 'https'
  authentication?: {
    username?: string
    password?: string
    certificate?: string
  }
  timeout?: number
  keepAlive?: boolean
}

export interface BluetoothConfig {
  deviceAddress: string
  serviceName?: string
  channel?: number
  pinCode?: string
  timeout?: number
}

export interface SerialConfig {
  port: string
  baudRate: number
  dataBits: 7 | 8
  stopBits: 1 | 2
  parity: 'none' | 'even' | 'odd' | 'mark' | 'space'
  flowControl: 'none' | 'hardware' | 'software'
  timeout?: number
}

export type ConnectionConfig = USBConfig | NetworkConfig | BluetoothConfig | SerialConfig

// Printer capabilities and specifications
export interface PrinterCapabilities {
  maxWidth: number        // mm
  maxHeight: number       // mm
  resolution: number      // DPI
  colorSupport: boolean
  paperSizes: string[]
  commandSet: 'ESC/POS' | 'ZPL' | 'EPL' | 'PCL' | 'PostScript' | 'standard'
  supportedFonts: string[]
  maxCopies: number
  duplexSupport: boolean
  cutterSupport?: boolean    // For thermal printers
  drawerKickSupport?: boolean // For cash drawer integration
  barcodeSupport?: string[]   // Supported barcode types
  qrCodeSupport?: boolean
  graphicsSupport?: boolean
  compressionSupport?: string[] // JPEG, PNG, etc.
}

// Print job settings and defaults
export interface PrintDefaults {
  paperSize: string
  orientation: 'portrait' | 'landscape'
  copies: number
  density: number           // 1-10 for thermal printers
  speed: 'fast' | 'normal' | 'high-quality'
  margins: {
    top: number
    right: number
    bottom: number
    left: number
  }
  scaling: number          // 0.1-3.0 scale factor
  fitToPage: boolean
  centerContent: boolean
  colorMode?: 'color' | 'grayscale' | 'monochrome'
  quality?: 'draft' | 'normal' | 'high' | 'best'
}

// Main printer profile interface
export interface PrinterProfile {
  id: string
  name: string
  type: 'thermal' | 'laser' | 'inkjet' | 'receipt' | 'label' | 'dot-matrix'
  manufacturer: string
  model: string
  description?: string
  
  // Connection configuration
  connection: {
    type: 'usb' | 'network' | 'bluetooth' | 'serial'
    settings: ConnectionConfig
    testConnection?: () => Promise<boolean>
  }
  
  // Hardware capabilities
  capabilities: PrinterCapabilities
  
  // Default print settings
  defaultSettings: PrintDefaults
  
  // Status and metadata
  isActive: boolean
  isDefault: boolean
  lastTestResult?: TestResult
  calibrationData?: CalibrationResult
  usage: {
    totalJobs: number
    successfulJobs: number
    failedJobs: number
    lastUsed?: Date
    averageJobTime?: number
  }
  
  // Location assignments
  locationAssignments?: LocationPrinterAssignment[]
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
}

// Supporting interfaces
export interface DetectedPrinter {
  name: string
  manufacturer?: string
  model?: string
  connectionType: 'usb' | 'network' | 'bluetooth' | 'serial'
  connectionDetails: Partial<ConnectionConfig>
  capabilities?: Partial<PrinterCapabilities>
  isOnline: boolean
}

export interface TestResult {
  success: boolean
  message: string
  responseTime?: number
  errorCode?: string
  testPagePrinted?: boolean
  capabilities?: Partial<PrinterCapabilities>
  timestamp: Date
}

export interface CalibrationResult {
  success: boolean
  adjustments: {
    density?: number
    speed?: number
    margins?: Partial<PrintDefaults['margins']>
    alignment?: { x: number; y: number }
  }
  testPrintQuality: 'excellent' | 'good' | 'fair' | 'poor'
  recommendations?: string[]
  timestamp: Date
}

export interface LocationPrinterAssignment {
  id: string
  locationId: number
  printerProfileId: string
  assignmentType: 'entry' | 'exit' | 'receipt' | 'label' | 'report'
  isPrimary: boolean
  isActive: boolean
  createdAt: Date
}

// Print job and queue management
export interface PrintJob {
  id: string
  printerProfileId: string
  documentType: 'entry_ticket' | 'exit_receipt' | 'daily_report' | 'custom'
  data: any
  settings: Partial<PrintDefaults>
  status: 'pending' | 'printing' | 'completed' | 'failed' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  attempts: number
  maxAttempts: number
  error?: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
}

export interface PrintQueue {
  id: string
  printerProfileId: string
  jobs: PrintJob[]
  isProcessing: boolean
  isPaused: boolean
  processingSpeed: number // jobs per minute
  lastProcessedAt?: Date
}

// Settings integration
export interface PrintSettingsCategory {
  category: 'printing'
  settings: {
    // Auto-print settings
    autoPrintEntry: boolean
    autoPrintExit: boolean
    autoPrintReports: boolean
    
    // Default print settings
    defaultCopies: number
    showPrintPreview: boolean
    confirmBeforePrint: boolean
    
    // Printer management
    printerProfiles: PrinterProfile[]
    defaultPrinterId?: string
    fallbackPrinterId?: string
    
    // Queue management
    printQueueEnabled: boolean
    maxQueueSize: number
    queueTimeout: number // minutes
    
    // Error handling
    retryFailedPrints: boolean
    maxRetryAttempts: number
    retryDelay: number // seconds
    notifyOnFailure: boolean
    
    // Performance
    backgroundPrinting: boolean
    batchPrintingEnabled: boolean
    maxConcurrentJobs: number
    
    // Quality settings
    defaultPrintQuality: 'draft' | 'normal' | 'high' | 'best'
    enableCalibration: boolean
    autoCalibration: boolean
    
    // Security
    requireAuthToPrint: boolean
    auditPrintJobs: boolean
    restrictPrinterAccess: boolean
  }
}

// Printer discovery and management
export interface PrinterDiscoveryService {
  discoverUSBPrinters(): Promise<DetectedPrinter[]>
  discoverNetworkPrinters(ipRange?: string): Promise<DetectedPrinter[]>
  discoverBluetoothPrinters(): Promise<DetectedPrinter[]>
  discoverSerialPrinters(): Promise<DetectedPrinter[]>
  getSystemPrinters(): Promise<DetectedPrinter[]>
}

// Configuration validation
export interface PrinterConfigValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
  compatibilityScore: number // 0-100
}

export interface PrinterConfigValidator {
  validateProfile(profile: Partial<PrinterProfile>): PrinterConfigValidation
  validateConnection(connection: ConnectionConfig): Promise<TestResult>
  validateCapabilities(capabilities: Partial<PrinterCapabilities>): PrinterConfigValidation
  validateSettings(settings: Partial<PrintDefaults>): PrinterConfigValidation
}

// Export utility types
export type PrinterType = PrinterProfile['type']
export type ConnectionType = PrinterProfile['connection']['type']
export type CommandSet = PrinterCapabilities['commandSet']
export type PrintQuality = PrintDefaults['quality']
export type AssignmentType = LocationPrinterAssignment['assignmentType']