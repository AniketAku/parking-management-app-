/**
 * USB Thermal Printer Service
 * Direct communication with USB thermal printers using WebUSB API
 */

import { log } from '../utils/secureLogger'
import type {
  ThermalPrinterService,
  ParkingTicketData,
  PrinterConnectionConfig,
  USBPrinterConfig,
  PrinterStatus,
  PrintResult,
  TestPrintResult,
  ThermalPrinterCapabilities,
  ThermalPrinterSettings,
  TextFormatting,
  PrinterConnectionError,
  PrinterCommunicationError,
  PrinterStatusError,
  PrinterEvent,
  PrinterEventCallback
} from '../types/thermalPrinter';
import { ESCPOSGenerator } from './escposGenerator';

export class USBThermalPrinter implements ThermalPrinterService {
  private device: USBDevice | null = null;
  private connected = false;
  private config: USBPrinterConfig | null = null;
  private escposGenerator: ESCPOSGenerator;
  private eventListeners: Map<string, PrinterEventCallback[]> = new Map();
  private statusCheckInterval: number | null = null;

  // Default capabilities for most thermal printers
  private capabilities: ThermalPrinterCapabilities = {
    paperWidth: 80, // 80mm
    charactersPerLine: 32,
    supportsCut: true,
    supportsPartialCut: true,
    supportsBarcode: true,
    supportsQRCode: true,
    supportsGraphics: false,
    maxPrintSpeed: 100,
    resolution: 203,
    supportedBarcodeTypes: ['CODE128', 'CODE39', 'EAN13', 'UPC-A'],
    supportedLanguages: ['en', 'es', 'fr']
  };

  private settings: ThermalPrinterSettings = {
    paperWidth: 80,
    printDensity: 8,
    printSpeed: 5,
    cutterEnabled: true,
    autoCut: true,
    encoding: 'utf-8',
    timeout: 5000
  };

  constructor(settings?: Partial<ThermalPrinterSettings>) {
    this.settings = { ...this.settings, ...settings };
    this.escposGenerator = new ESCPOSGenerator(this.settings);
  }

  /**
   * Connect to USB thermal printer
   */
  async connectToPrinter(connectionConfig: PrinterConnectionConfig): Promise<void> {
    if (connectionConfig.type !== 'usb') {
      throw new PrinterConnectionError('This service only supports USB connections');
    }

    const config = connectionConfig.config;
    
    try {
      // Check if WebUSB is supported
      if (!navigator.usb) {
        throw new PrinterConnectionError('WebUSB is not supported in this browser');
      }

      // Request device access
      const devices = await navigator.usb.getDevices();
      let targetDevice = devices.find(d => 
        d.vendorId === config.vendorId && d.productId === config.productId
      );

      if (!targetDevice) {
        // Request new device
        targetDevice = await navigator.usb.requestDevice({
          filters: [{
            vendorId: config.vendorId,
            productId: config.productId
          }]
        });
      }

      if (!targetDevice) {
        throw new PrinterConnectionError('No USB thermal printer found');
      }

      // Open device
      if (!targetDevice.opened) {
        await targetDevice.open();
      }

      // Select configuration
      if (targetDevice.configuration === null) {
        await targetDevice.selectConfiguration(1);
      }

      // Claim interface
      const interfaceNumber = config.interface || 0;
      await targetDevice.claimInterface(interfaceNumber);

      this.device = targetDevice;
      this.config = config;
      this.connected = true;

      // Setup device event listeners
      this.setupDeviceEventListeners();

      // Initialize printer
      await this.initializePrinter();

      // Start status monitoring
      this.startStatusMonitoring();

      this.emitEvent({
        type: 'connected',
        timestamp: new Date(),
        data: { deviceId: targetDevice.serialNumber }
      });

    } catch (error) {
      this.connected = false;
      this.device = null;
      this.config = null;
      
      if (error instanceof Error) {
        throw new PrinterConnectionError(`Failed to connect to printer: ${error.message}`, error);
      }
      throw new PrinterConnectionError('Unknown connection error');
    }
  }

  /**
   * Disconnect from printer
   */
  async disconnectFromPrinter(): Promise<void> {
    try {
      this.stopStatusMonitoring();
      
      if (this.device && this.device.opened) {
        // Release interface
        const interfaceNumber = this.config?.interface || 0;
        await this.device.releaseInterface(interfaceNumber);
        
        // Close device
        await this.device.close();
      }

      this.emitEvent({
        type: 'disconnected',
        timestamp: new Date()
      });

    } catch (error) {
      log.error('Error during disconnect', error);
    } finally {
      this.device = null;
      this.config = null;
      this.connected = false;
    }
  }

  /**
   * Check if printer is connected
   */
  isConnected(): boolean {
    return this.connected && this.device !== null;
  }

  /**
   * Check printer status
   */
  async checkPrinterStatus(): Promise<PrinterStatus> {
    if (!this.isConnected() || !this.device) {
      return {
        connected: false,
        online: false,
        paperStatus: 'empty',
        temperature: 'error',
        coverOpen: true,
        cutterStatus: 'error'
      };
    }

    try {
      // Send status request command
      const statusCommand = new Uint8Array([0x1B, 0x76]); // ESC v - printer status
      const endpoint = this.config?.endpoint || 1;
      
      await this.device.transferOut(endpoint, statusCommand);
      
      // Read status response (this is simplified - actual implementation would parse response)
      const result = await this.device.transferIn(endpoint, 64);
      
      // Parse status based on response (implementation specific to printer model)
      return this.parseStatusResponse(result.data);

    } catch (error) {
      log.error('Error checking printer status', error);
      return {
        connected: true,
        online: false,
        paperStatus: 'empty',
        temperature: 'error',
        coverOpen: true,
        cutterStatus: 'error',
        lastError: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Print ESC/POS data directly
   */
  async printESCPOS(data: Uint8Array): Promise<PrintResult> {
    if (!this.isConnected() || !this.device) {
      throw new PrinterCommunicationError('Printer not connected');
    }

    const startTime = Date.now();

    try {
      const endpoint = this.config?.endpoint || 1;
      
      // Split large data into chunks if necessary
      const chunkSize = 1024; // 1KB chunks
      let bytesWritten = 0;

      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        const result = await this.device.transferOut(endpoint, chunk);
        
        if (result.status !== 'ok') {
          throw new PrinterCommunicationError(`Transfer failed: ${result.status}`);
        }
        
        bytesWritten += chunk.length;
      }

      const printTime = Date.now() - startTime;

      this.emitEvent({
        type: 'print-complete',
        timestamp: new Date(),
        data: { bytesWritten, printTime }
      });

      return {
        success: true,
        message: 'Print job completed successfully',
        bytesWritten,
        printTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown print error';
      
      this.emitEvent({
        type: 'error',
        timestamp: new Date(),
        data: { error: errorMessage }
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Print parking ticket
   */
  async printTicket(ticketData: ParkingTicketData): Promise<PrintResult> {
    try {
      const escposData = this.escposGenerator.generateParkingTicket(ticketData);
      return await this.printESCPOS(escposData);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate ticket'
      };
    }
  }

  /**
   * Print raw text with formatting
   */
  async printRawText(text: string, formatting?: TextFormatting): Promise<PrintResult> {
    try {
      const escposData = this.escposGenerator.generateFormattedText(text, formatting);
      return await this.printESCPOS(escposData);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to print text'
      };
    }
  }

  /**
   * Test print functionality
   */
  async testPrint(): Promise<TestPrintResult> {
    if (!this.isConnected() || !this.device) {
      return {
        success: false,
        error: 'Printer not connected'
      };
    }

    try {
      const testData = this.escposGenerator.generateTestPrint();
      const result = await this.printESCPOS(testData);
      
      const status = await this.checkPrinterStatus();
      
      return {
        ...result,
        printerInfo: {
          model: 'USB Thermal Printer',
          firmware: 'Unknown',
          serialNumber: this.device.serialNumber || 'Unknown'
        },
        statusInfo: status
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Test print failed'
      };
    }
  }

  /**
   * Feed paper
   */
  async feedPaper(lines: number): Promise<void> {
    if (!this.isConnected()) {
      throw new PrinterCommunicationError('Printer not connected');
    }

    const feedCommand = new Uint8Array([0x1B, 0x64, Math.min(lines, 255)]);
    const result = await this.printESCPOS(feedCommand);
    
    if (!result.success) {
      throw new PrinterCommunicationError(`Failed to feed paper: ${result.error}`);
    }
  }

  /**
   * Cut paper
   */
  async cutPaper(partial: boolean = false): Promise<void> {
    if (!this.isConnected()) {
      throw new PrinterCommunicationError('Printer not connected');
    }

    const cutCommand = partial 
      ? new Uint8Array([0x1D, 0x56, 0x01]) // Partial cut
      : new Uint8Array([0x1D, 0x56, 0x00]); // Full cut
      
    const result = await this.printESCPOS(cutCommand);
    
    if (!result.success) {
      throw new PrinterCommunicationError(`Failed to cut paper: ${result.error}`);
    }
  }

  /**
   * Reset printer
   */
  async resetPrinter(): Promise<void> {
    if (!this.isConnected()) {
      throw new PrinterCommunicationError('Printer not connected');
    }

    const resetCommand = new Uint8Array([0x1B, 0x40]); // ESC @
    const result = await this.printESCPOS(resetCommand);
    
    if (!result.success) {
      throw new PrinterCommunicationError(`Failed to reset printer: ${result.error}`);
    }

    // Reinitialize after reset
    await this.initializePrinter();
  }

  /**
   * Get printer capabilities
   */
  getCapabilities(): ThermalPrinterCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Configure printer settings
   */
  async configure(newSettings: ThermalPrinterSettings): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    this.escposGenerator = new ESCPOSGenerator(this.settings);
    
    // Send configuration commands to printer if connected
    if (this.isConnected()) {
      await this.initializePrinter();
    }
  }

  /**
   * Event listener management
   */
  addEventListener(type: string, callback: PrinterEventCallback): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type)!.push(callback);
  }

  removeEventListener(type: string, callback: PrinterEventCallback): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Private methods
   */

  private async initializePrinter(): Promise<void> {
    if (!this.device || !this.isConnected()) return;

    try {
      // Initialize printer with settings
      const initCommands: Uint8Array[] = [];
      
      // Reset printer
      initCommands.push(new Uint8Array([0x1B, 0x40])); // ESC @
      
      // Set print density
      initCommands.push(new Uint8Array([0x1D, 0x7C, this.settings.printDensity]));
      
      // Set print speed
      initCommands.push(new Uint8Array([0x1D, 0x84, this.settings.printSpeed]));
      
      // Combine and send
      const totalLength = initCommands.reduce((sum, cmd) => sum + cmd.length, 0);
      const combinedCommand = new Uint8Array(totalLength);
      let offset = 0;
      
      initCommands.forEach(cmd => {
        combinedCommand.set(cmd, offset);
        offset += cmd.length;
      });
      
      await this.printESCPOS(combinedCommand);

    } catch (error) {
      log.error('Failed to initialize printer', error);
    }
  }

  private setupDeviceEventListeners(): void {
    if (!this.device) return;

    // Handle device disconnection
    navigator.usb.addEventListener('disconnect', (event) => {
      if (event.device === this.device) {
        this.connected = false;
        this.device = null;
        this.config = null;
        this.stopStatusMonitoring();
        
        this.emitEvent({
          type: 'disconnected',
          timestamp: new Date(),
          data: { reason: 'Device disconnected' }
        });
      }
    });
  }

  private startStatusMonitoring(): void {
    if (this.statusCheckInterval) return;
    
    this.statusCheckInterval = window.setInterval(async () => {
      try {
        const status = await this.checkPrinterStatus();
        this.emitEvent({
          type: 'status-change',
          timestamp: new Date(),
          data: status
        });
      } catch (error) {
        log.error('Error during status check', error);
      }
    }, 10000); // Check every 10 seconds
  }

  private stopStatusMonitoring(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
  }

  private parseStatusResponse(data: DataView | undefined): PrinterStatus {
    // This is a simplified implementation
    // Actual parsing would depend on the specific printer model
    if (!data || data.byteLength === 0) {
      return {
        connected: true,
        online: true,
        paperStatus: 'ok',
        temperature: 'normal',
        coverOpen: false,
        cutterStatus: 'ok'
      };
    }

    // Parse actual status bits based on printer documentation
    const statusByte = data.getUint8(0);
    
    return {
      connected: true,
      online: (statusByte & 0x01) === 0,
      paperStatus: (statusByte & 0x04) ? 'empty' : 'ok',
      temperature: (statusByte & 0x40) ? 'high' : 'normal',
      coverOpen: (statusByte & 0x20) !== 0,
      cutterStatus: (statusByte & 0x08) ? 'error' : 'ok'
    };
  }

  private emitEvent(event: PrinterEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          log.error('Error in event listener', error);
        }
      });
    }
  }
}