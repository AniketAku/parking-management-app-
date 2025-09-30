/**
 * Thermal Printer Types and Interfaces
 * Comprehensive type definitions for thermal printer integration with ESC/POS support
 */

// Core thermal printer data structures
export interface ParkingTicketData {
  businessName: string;
  facilityName: string;
  location: string;
  contactPhone: string;
  ticketNumber: string;
  vehicleNumber: string;
  date: string;
  vehicleType: string;
  inTime: string;
  outTime?: string;
  receivedAmount?: string;
  duration?: string;
  rate?: string;
  ticketType: 'entry' | 'exit';
}

// ESC/POS command definitions
export interface ESCPOSCommand {
  name: string;
  bytes: Uint8Array;
  description: string;
}

export interface ESCPOSCommands {
  // Printer initialization
  INIT: Uint8Array;
  RESET: Uint8Array;
  
  // Text formatting
  BOLD_ON: Uint8Array;
  BOLD_OFF: Uint8Array;
  UNDERLINE_ON: Uint8Array;
  UNDERLINE_OFF: Uint8Array;
  ITALIC_ON: Uint8Array;
  ITALIC_OFF: Uint8Array;
  
  // Text alignment
  ALIGN_LEFT: Uint8Array;
  ALIGN_CENTER: Uint8Array;
  ALIGN_RIGHT: Uint8Array;
  
  // Font sizes
  FONT_SIZE_NORMAL: Uint8Array;
  FONT_SIZE_DOUBLE_HEIGHT: Uint8Array;
  FONT_SIZE_DOUBLE_WIDTH: Uint8Array;
  FONT_SIZE_DOUBLE: Uint8Array;
  FONT_SIZE_LARGE: Uint8Array;
  
  // Paper control
  LINE_FEED: Uint8Array;
  FORM_FEED: Uint8Array;
  CUT_PAPER: Uint8Array;
  CUT_PAPER_PARTIAL: Uint8Array;
  FEED_LINES: (lines: number) => Uint8Array;
  
  // Barcode and QR codes
  BARCODE_MODE: Uint8Array;
  QR_CODE_SIZE: (size: number) => Uint8Array;
  QR_CODE_CORRECTION: (level: number) => Uint8Array;
  
  // Special formatting
  HORIZONTAL_LINE: string;
  DOUBLE_LINE: string;
}

// Printer connection configurations
export interface USBPrinterConfig {
  vendorId: number;
  productId: number;
  interface: number;
  endpoint: number;
  timeout?: number;
}

export interface NetworkPrinterConfig {
  ipAddress: string;
  port: number;
  timeout?: number;
  protocol: 'tcp' | 'http';
}

export interface BluetoothPrinterConfig {
  deviceId: string;
  serviceUUID?: string;
  characteristicUUID?: string;
  timeout?: number;
}

export type PrinterConnectionConfig = 
  | { type: 'usb'; config: USBPrinterConfig }
  | { type: 'network'; config: NetworkPrinterConfig }
  | { type: 'bluetooth'; config: BluetoothPrinterConfig };

// Printer status and capabilities
export interface PrinterStatus {
  connected: boolean;
  online: boolean;
  paperStatus: 'ok' | 'low' | 'empty' | 'jam';
  temperature: 'normal' | 'high' | 'error';
  coverOpen: boolean;
  cutterStatus: 'ok' | 'error';
  lastError?: string;
  batteryLevel?: number; // For portable printers
}

export interface ThermalPrinterCapabilities {
  paperWidth: number; // in mm
  charactersPerLine: number;
  supportsCut: boolean;
  supportsPartialCut: boolean;
  supportsBarcode: boolean;
  supportsQRCode: boolean;
  supportsGraphics: boolean;
  maxPrintSpeed: number; // mm/s
  resolution: number; // dpi
  supportedBarcodeTypes: string[];
  supportedLanguages: string[];
}

// Print operation results
export interface PrintResult {
  success: boolean;
  message?: string;
  error?: string;
  jobId?: string;
  bytesWritten?: number;
  printTime?: number;
}

export interface TestPrintResult extends PrintResult {
  printerInfo?: {
    model: string;
    firmware: string;
    serialNumber?: string;
  };
  statusInfo?: PrinterStatus;
}

// Thermal printer service interface
export interface ThermalPrinterService {
  // Connection management
  connectToPrinter(config: PrinterConnectionConfig): Promise<void>;
  disconnectFromPrinter(): Promise<void>;
  isConnected(): boolean;
  checkPrinterStatus(): Promise<PrinterStatus>;
  
  // Printing operations
  printESCPOS(data: Uint8Array): Promise<PrintResult>;
  printTicket(ticketData: ParkingTicketData): Promise<PrintResult>;
  printRawText(text: string, formatting?: TextFormatting): Promise<PrintResult>;
  
  // Printer control
  testPrint(): Promise<TestPrintResult>;
  feedPaper(lines: number): Promise<void>;
  cutPaper(partial?: boolean): Promise<void>;
  resetPrinter(): Promise<void>;
  
  // Configuration
  getCapabilities(): ThermalPrinterCapabilities;
  configure(settings: ThermalPrinterSettings): Promise<void>;
}

// Text formatting options
export interface TextFormatting {
  bold?: boolean;
  underline?: boolean;
  italic?: boolean;
  fontSize?: 'normal' | 'double-height' | 'double-width' | 'double' | 'large';
  alignment?: 'left' | 'center' | 'right';
}

// Printer settings
export interface ThermalPrinterSettings {
  paperWidth: number;
  printDensity: number; // 0-15
  printSpeed: number; // 0-9
  cutterEnabled: boolean;
  autoCut: boolean;
  encoding: 'utf-8' | 'cp437' | 'cp850' | 'cp858' | 'cp860' | 'cp863' | 'cp865' | 'cp866' | 'cp1252';
  timeout: number;
}

// Error types
export class ThermalPrinterError extends Error {
  constructor(
    message: string,
    public code: string,
    public printerStatus?: PrinterStatus
  ) {
    super(message);
    this.name = 'ThermalPrinterError';
  }
}

export class PrinterConnectionError extends ThermalPrinterError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONNECTION_ERROR');
    this.cause = cause;
  }
}

export class PrinterCommunicationError extends ThermalPrinterError {
  constructor(message: string, cause?: Error) {
    super(message, 'COMMUNICATION_ERROR');
    this.cause = cause;
  }
}

export class PrinterStatusError extends ThermalPrinterError {
  constructor(message: string, status: PrinterStatus) {
    super(message, 'STATUS_ERROR', status);
  }
}

// Utility types
export interface PrintJobMetrics {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  averagePrintTime: number;
  paperUsed: number; // in mm
  lastPrintTime?: Date;
}

export interface ThermalPrinterProfile {
  id: string;
  name: string;
  model: string;
  connection: PrinterConnectionConfig;
  capabilities: ThermalPrinterCapabilities;
  settings: ThermalPrinterSettings;
  isDefault: boolean;
  isActive: boolean;
  lastUsed?: Date;
  metrics: PrintJobMetrics;
}

// Event types for printer status monitoring
export interface PrinterEvent {
  type: 'connected' | 'disconnected' | 'status-change' | 'print-complete' | 'error';
  timestamp: Date;
  data?: any;
}

export type PrinterEventCallback = (event: PrinterEvent) => void;