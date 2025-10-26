/**
 * Thermal Printer Service
 * Unified interface for thermal printing with multiple connection types and ESC/POS support
 */

import { log } from '../utils/secureLogger'
import type {
  ThermalPrinterService,
  ParkingTicketData,
  PrinterConnectionConfig,
  PrinterStatus,
  PrintResult,
  TestPrintResult,
  ThermalPrinterCapabilities,
  ThermalPrinterSettings,
  TextFormatting,
  ThermalPrinterProfile,
  PrinterEvent,
  PrinterEventCallback,
  NetworkPrinterConfig,
  BluetoothPrinterConfig
} from '../types/thermalPrinter';
import { USBThermalPrinter } from './usbThermalPrinter';
import { ESCPOSGenerator } from './escposGenerator';

/**
 * Network thermal printer implementation
 */
class NetworkThermalPrinter implements ThermalPrinterService {
  private connected = false;
  private config: NetworkPrinterConfig | null = null;
  private escposGenerator: ESCPOSGenerator;
  private settings: ThermalPrinterSettings;

  constructor(settings?: Partial<ThermalPrinterSettings>) {
    this.settings = {
      paperWidth: 80,
      printDensity: 8,
      printSpeed: 5,
      cutterEnabled: true,
      autoCut: true,
      encoding: 'utf-8',
      timeout: 5000,
      ...settings
    };
    this.escposGenerator = new ESCPOSGenerator(this.settings);
  }

  async connectToPrinter(connectionConfig: PrinterConnectionConfig): Promise<void> {
    if (connectionConfig.type !== 'network') {
      throw new Error('This service only supports network connections');
    }

    this.config = connectionConfig.config;
    
    // Test connection
    const testResult = await this.testConnection();
    if (!testResult) {
      throw new Error(`Failed to connect to network printer at ${this.config.ipAddress}:${this.config.port}`);
    }

    this.connected = true;
  }

  async disconnectFromPrinter(): Promise<void> {
    this.connected = false;
    this.config = null;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async checkPrinterStatus(): Promise<PrinterStatus> {
    if (!this.connected) {
      return {
        connected: false,
        online: false,
        paperStatus: 'empty',
        temperature: 'error',
        coverOpen: true,
        cutterStatus: 'error'
      };
    }

    return {
      connected: true,
      online: true,
      paperStatus: 'ok',
      temperature: 'normal',
      coverOpen: false,
      cutterStatus: 'ok'
    };
  }

  async printESCPOS(data: Uint8Array): Promise<PrintResult> {
    if (!this.connected || !this.config) {
      return { success: false, error: 'Printer not connected' };
    }

    try {
      const response = await fetch(`http://${this.config.ipAddress}:${this.config.port}/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: data,
        signal: AbortSignal.timeout(this.config.timeout || 5000)
      });

      if (!response.ok) {
        throw new Error(`Network print failed: ${response.statusText}`);
      }

      return {
        success: true,
        message: 'Network print completed',
        bytesWritten: data.length
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network print failed'
      };
    }
  }

  async printTicket(ticketData: ParkingTicketData): Promise<PrintResult> {
    const escposData = this.escposGenerator.generateParkingTicket(ticketData);
    return await this.printESCPOS(escposData);
  }

  async printRawText(text: string, formatting?: TextFormatting): Promise<PrintResult> {
    const escposData = this.escposGenerator.generateFormattedText(text, formatting);
    return await this.printESCPOS(escposData);
  }

  async testPrint(): Promise<TestPrintResult> {
    const testData = this.escposGenerator.generateTestPrint();
    const result = await this.printESCPOS(testData);
    
    return {
      ...result,
      printerInfo: {
        model: 'Network Thermal Printer',
        firmware: 'Unknown'
      }
    };
  }

  async feedPaper(lines: number): Promise<void> {
    const feedCommand = new Uint8Array([0x1B, 0x64, Math.min(lines, 255)]);
    const result = await this.printESCPOS(feedCommand);
    if (!result.success) {
      throw new Error(`Failed to feed paper: ${result.error}`);
    }
  }

  async cutPaper(partial?: boolean): Promise<void> {
    const cutCommand = partial 
      ? new Uint8Array([0x1D, 0x56, 0x01])
      : new Uint8Array([0x1D, 0x56, 0x00]);
    const result = await this.printESCPOS(cutCommand);
    if (!result.success) {
      throw new Error(`Failed to cut paper: ${result.error}`);
    }
  }

  async resetPrinter(): Promise<void> {
    const resetCommand = new Uint8Array([0x1B, 0x40]);
    const result = await this.printESCPOS(resetCommand);
    if (!result.success) {
      throw new Error(`Failed to reset printer: ${result.error}`);
    }
  }

  getCapabilities(): ThermalPrinterCapabilities {
    return {
      paperWidth: 80,
      charactersPerLine: 32,
      supportsCut: true,
      supportsPartialCut: true,
      supportsBarcode: true,
      supportsQRCode: true,
      supportsGraphics: false,
      maxPrintSpeed: 100,
      resolution: 203,
      supportedBarcodeTypes: ['CODE128', 'CODE39', 'EAN13'],
      supportedLanguages: ['en']
    };
  }

  async configure(settings: ThermalPrinterSettings): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    this.escposGenerator = new ESCPOSGenerator(this.settings);
  }

  private async testConnection(): Promise<boolean> {
    if (!this.config) return false;

    try {
      const response = await fetch(`http://${this.config.ipAddress}:${this.config.port}/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.config.timeout || 3000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Main thermal printer service factory and manager
 */
export class ThermalPrinterManager {
  private printerServices: Map<string, ThermalPrinterService> = new Map();
  private activePrinter: ThermalPrinterService | null = null;
  private printerProfiles: Map<string, ThermalPrinterProfile> = new Map();
  private eventListeners: Map<string, PrinterEventCallback[]> = new Map();

  /**
   * Create a thermal printer service based on connection type
   */
  createPrinterService(
    connectionConfig: PrinterConnectionConfig,
    settings?: Partial<ThermalPrinterSettings>
  ): ThermalPrinterService {
    switch (connectionConfig.type) {
      case 'usb':
        return new USBThermalPrinter(settings);
      case 'network':
        return new NetworkThermalPrinter(settings);
      case 'bluetooth':
        throw new Error('Bluetooth thermal printers not yet implemented');
      default:
        throw new Error(`Unsupported connection type: ${(connectionConfig as any).type}`);
    }
  }

  /**
   * Add printer profile
   */
  addPrinterProfile(profile: ThermalPrinterProfile): void {
    this.printerProfiles.set(profile.id, profile);
  }

  /**
   * Get printer profile
   */
  getPrinterProfile(id: string): ThermalPrinterProfile | undefined {
    return this.printerProfiles.get(id);
  }

  /**
   * List all printer profiles
   */
  getAllPrinterProfiles(): ThermalPrinterProfile[] {
    return Array.from(this.printerProfiles.values());
  }

  /**
   * Connect to printer by profile ID
   */
  async connectToPrinter(profileId: string): Promise<void> {
    const profile = this.printerProfiles.get(profileId);
    if (!profile) {
      throw new Error(`Printer profile not found: ${profileId}`);
    }

    let service = this.printerServices.get(profileId);
    if (!service) {
      service = this.createPrinterService(profile.connection, profile.settings);
      this.printerServices.set(profileId, service);
    }

    await service.connectToPrinter(profile.connection);
    this.activePrinter = service;

    // Update profile status
    profile.isActive = true;
    profile.lastUsed = new Date();
  }

  /**
   * Disconnect from current printer
   */
  async disconnectFromPrinter(): Promise<void> {
    if (this.activePrinter) {
      await this.activePrinter.disconnectFromPrinter();
      this.activePrinter = null;
    }

    // Update all profiles to inactive
    this.printerProfiles.forEach(profile => {
      profile.isActive = false;
    });
  }

  /**
   * Get current active printer
   */
  getActivePrinter(): ThermalPrinterService | null {
    return this.activePrinter;
  }

  /**
   * Print ticket using active printer
   */
  async printTicket(ticketData: ParkingTicketData): Promise<PrintResult> {
    if (!this.activePrinter) {
      return { success: false, error: 'No active printer' };
    }

    try {
      const result = await this.activePrinter.printTicket(ticketData);
      
      // Update metrics for active printer profile
      this.updatePrinterMetrics(result);
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Print failed'
      };
    }
  }

  /**
   * Test print using active printer
   */
  async testPrint(): Promise<TestPrintResult> {
    if (!this.activePrinter) {
      return { success: false, error: 'No active printer' };
    }

    return await this.activePrinter.testPrint();
  }

  /**
   * Check status of active printer
   */
  async checkPrinterStatus(): Promise<PrinterStatus | null> {
    if (!this.activePrinter) {
      return null;
    }

    return await this.activePrinter.checkPrinterStatus();
  }

  /**
   * Get capabilities of active printer
   */
  getPrinterCapabilities(): ThermalPrinterCapabilities | null {
    if (!this.activePrinter) {
      return null;
    }

    return this.activePrinter.getCapabilities();
  }

  /**
   * Auto-discover USB thermal printers
   */
  async discoverUSBPrinters(): Promise<ThermalPrinterProfile[]> {
    if (!navigator.usb) {
      return [];
    }

    try {
      const devices = await navigator.usb.getDevices();
      const printerProfiles: ThermalPrinterProfile[] = [];

      // Common thermal printer vendor IDs
      const thermalPrinterVendors = [
        { vendorId: 0x04b8, name: 'Epson' }, // Epson
        { vendorId: 0x0519, name: 'Star Micronics' }, // Star
        { vendorId: 0x20d1, name: 'Rongta' }, // Rongta
        { vendorId: 0x0fe6, name: 'ICS Advent' }, // ICS Advent
        { vendorId: 0x0416, name: 'Winbond' }, // Winbond
      ];

      for (const device of devices) {
        const vendor = thermalPrinterVendors.find(v => v.vendorId === device.vendorId);
        if (vendor) {
          const profile: ThermalPrinterProfile = {
            id: `usb_${device.vendorId}_${device.productId}`,
            name: `${vendor.name} Thermal Printer`,
            model: device.productName || 'Unknown Model',
            connection: {
              type: 'usb',
              config: {
                vendorId: device.vendorId,
                productId: device.productId,
                interface: 0,
                endpoint: 1
              }
            },
            capabilities: {
              paperWidth: 80,
              charactersPerLine: 32,
              supportsCut: true,
              supportsPartialCut: true,
              supportsBarcode: true,
              supportsQRCode: true,
              supportsGraphics: false,
              maxPrintSpeed: 100,
              resolution: 203,
              supportedBarcodeTypes: ['CODE128', 'CODE39', 'EAN13'],
              supportedLanguages: ['en']
            },
            settings: {
              paperWidth: 80,
              printDensity: 8,
              printSpeed: 5,
              cutterEnabled: true,
              autoCut: true,
              encoding: 'utf-8',
              timeout: 5000
            },
            isDefault: false,
            isActive: false,
            metrics: {
              totalJobs: 0,
              successfulJobs: 0,
              failedJobs: 0,
              averagePrintTime: 0,
              paperUsed: 0
            }
          };

          printerProfiles.push(profile);
          this.addPrinterProfile(profile);
        }
      }

      return printerProfiles;
    } catch (error) {
      log.error('Error discovering USB printers', error);
      return [];
    }
  }

  /**
   * Create default printer profiles for testing
   */
  createDefaultProfiles(): void {
    // USB printer profile
    const usbProfile: ThermalPrinterProfile = {
      id: 'default_usb',
      name: 'USB Thermal Printer',
      model: 'Generic USB Thermal',
      connection: {
        type: 'usb',
        config: {
          vendorId: 0x04b8, // Epson
          productId: 0x0202,
          interface: 0,
          endpoint: 1
        }
      },
      capabilities: {
        paperWidth: 80,
        charactersPerLine: 32,
        supportsCut: true,
        supportsPartialCut: true,
        supportsBarcode: true,
        supportsQRCode: true,
        supportsGraphics: false,
        maxPrintSpeed: 100,
        resolution: 203,
        supportedBarcodeTypes: ['CODE128', 'CODE39', 'EAN13'],
        supportedLanguages: ['en']
      },
      settings: {
        paperWidth: 80,
        printDensity: 8,
        printSpeed: 5,
        cutterEnabled: true,
        autoCut: true,
        encoding: 'utf-8',
        timeout: 5000
      },
      isDefault: true,
      isActive: false,
      metrics: {
        totalJobs: 0,
        successfulJobs: 0,
        failedJobs: 0,
        averagePrintTime: 0,
        paperUsed: 0
      }
    };

    // Network printer profile
    const networkProfile: ThermalPrinterProfile = {
      id: 'default_network',
      name: 'Network Thermal Printer',
      model: 'Generic Network Thermal',
      connection: {
        type: 'network',
        config: {
          ipAddress: '192.168.1.100',
          port: 9100,
          protocol: 'tcp'
        }
      },
      capabilities: usbProfile.capabilities,
      settings: usbProfile.settings,
      isDefault: false,
      isActive: false,
      metrics: {
        totalJobs: 0,
        successfulJobs: 0,
        failedJobs: 0,
        averagePrintTime: 0,
        paperUsed: 0
      }
    };

    this.addPrinterProfile(usbProfile);
    this.addPrinterProfile(networkProfile);
  }

  /**
   * Update printer metrics after print job
   */
  private updatePrinterMetrics(result: PrintResult): void {
    const activeProfile = Array.from(this.printerProfiles.values())
      .find(p => p.isActive);
    
    if (activeProfile) {
      activeProfile.metrics.totalJobs++;
      if (result.success) {
        activeProfile.metrics.successfulJobs++;
      } else {
        activeProfile.metrics.failedJobs++;
      }
      
      if (result.printTime) {
        const totalTime = activeProfile.metrics.averagePrintTime * (activeProfile.metrics.totalJobs - 1) + result.printTime;
        activeProfile.metrics.averagePrintTime = totalTime / activeProfile.metrics.totalJobs;
      }
      
      activeProfile.lastUsed = new Date();
    }
  }

  /**
   * Event handling
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

// Export singleton instance
export const thermalPrinterManager = new ThermalPrinterManager();

// Initialize default profiles
thermalPrinterManager.createDefaultProfiles();