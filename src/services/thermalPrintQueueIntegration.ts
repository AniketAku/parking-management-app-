/**
 * Thermal Print Queue Integration
 * Enhanced print queue system with thermal printer support and ESC/POS integration
 */

import type { 
  PrintJob, 
  PrintResult,
  PrintJobCreate,
  PrinterProfile 
} from '../types/printQueue';
import type {
  ParkingTicketData,
  ThermalPrinterService,
  PrinterStatus
} from '../types/thermalPrinter';
import { thermalPrinterManager } from './thermalPrinterService';
import { createEntryTicketData, createExitReceiptData, createThermalTicketData } from '../utils/ticketHelpers';

/**
 * Enhanced print job processor with thermal printer support
 */
export class ThermalPrintJobProcessor {
  private processing = false;

  /**
   * Process a print job with thermal printer support
   */
  async processPrintJob(job: PrintJob): Promise<PrintResult> {
    try {
      // Check if this is a thermal print job
      if (job.printerProfile.type === 'thermal') {
        return await this.processThermalPrintJob(job);
      }
      
      // Handle other printer types with existing logic
      return await this.processStandardPrintJob(job);
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown print error'
      };
    }
  }

  /**
   * Process thermal printer job with ESC/POS commands
   */
  private async processThermalPrintJob(job: PrintJob): Promise<PrintResult> {
    const thermalPrinter = thermalPrinterManager.getActivePrinter();
    
    if (!thermalPrinter) {
      // Try to connect to a thermal printer
      const profiles = thermalPrinterManager.getAllPrinterProfiles();
      const thermalProfile = profiles.find(p => p.connection.type === 'usb' && !p.isActive);
      
      if (thermalProfile) {
        try {
          await thermalPrinterManager.connectToPrinter(thermalProfile.id);
        } catch (error) {
          return {
            success: false,
            error: `Failed to connect to thermal printer: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      } else {
        return {
          success: false,
          error: 'No thermal printer available'
        };
      }
    }

    // Check printer status
    const status = await thermalPrinterManager.checkPrinterStatus();
    if (!status?.online) {
      return {
        success: false,
        error: 'Thermal printer is offline'
      };
    }

    // Convert job data to thermal ticket format
    const ticketData = this.convertJobDataToThermalTicket(job);
    if (!ticketData) {
      return {
        success: false,
        error: 'Failed to convert job data to thermal ticket format'
      };
    }

    // Print the ticket
    const result = await thermalPrinterManager.printTicket(ticketData);
    
    return result;
  }

  /**
   * Process standard printer job (existing logic)
   */
  private async processStandardPrintJob(job: PrintJob): Promise<PrintResult> {
    // Placeholder for existing standard print logic
    // This would integrate with react-to-print or other printing methods
    
    try {
      // Simulate print processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        message: `Standard print job ${job.id} completed successfully`,
        bytesWritten: 1024,
        printTime: 1000
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Standard print failed'
      };
    }
  }

  /**
   * Convert print job data to thermal ticket format
   */
  private convertJobDataToThermalTicket(job: PrintJob): ParkingTicketData | null {
    try {
      const ticketData = job.ticketData;
      
      // Check if we have the required fields for a parking entry
      if (!ticketData || !ticketData.vehicleNumber || !ticketData.entryTime) {
        return null;
      }

      // Create parking entry object from job data
      const entry = {
        id: job.ticketId,
        vehicleNumber: ticketData.vehicleNumber,
        vehicleType: ticketData.vehicleType || 'Car',
        entryTime: new Date(ticketData.entryTime),
        exitTime: ticketData.exitTime ? new Date(ticketData.exitTime) : undefined,
        calculatedFee: ticketData.calculatedFee,
        actualFee: ticketData.actualFee,
        amountPaid: ticketData.amountPaid,
        paymentMethod: ticketData.paymentMethod,
        paymentStatus: ticketData.paymentStatus || 'pending',
        status: ticketData.status || 'active'
      };

      // Convert based on ticket type
      switch (job.ticketType) {
        case 'entry':
          return createEntryTicketData(entry);
          
        case 'exit':
        case 'receipt':
          if (!entry.exitTime) {
            entry.exitTime = new Date(); // Use current time if exit time not provided
          }
          return createExitReceiptData(entry);
          
        case 'thermal':
          const ticketType = entry.exitTime ? 'exit' : 'entry';
          return createThermalTicketData(entry, ticketType);
          
        default:
          // Default to entry ticket
          return createEntryTicketData(entry);
      }
    } catch (error) {
      console.error('Error converting job data to thermal ticket:', error);
      return null;
    }
  }
}

/**
 * Enhanced print queue service with thermal printer integration
 */
export class EnhancedPrintQueueService {
  private thermalProcessor = new ThermalPrintJobProcessor();
  
  /**
   * Add thermal print job to queue
   */
  async addThermalPrintJob(
    ticketId: string,
    ticketType: 'entry' | 'exit' | 'receipt' | 'thermal',
    parkingEntry: any,
    printerProfileId?: string
  ): Promise<string> {
    // Get thermal printer profile
    const printerProfiles = thermalPrinterManager.getAllPrinterProfiles();
    let printerProfile = printerProfiles.find(p => p.id === printerProfileId);
    
    if (!printerProfile) {
      // Use default thermal printer
      printerProfile = printerProfiles.find(p => p.isDefault && p.connection.type === 'usb');
    }
    
    if (!printerProfile) {
      throw new Error('No thermal printer profile available');
    }

    // Create print job
    const jobData: PrintJobCreate = {
      ticketId,
      ticketType,
      ticketData: {
        vehicleNumber: parkingEntry.vehicleNumber,
        vehicleType: parkingEntry.vehicleType,
        entryTime: parkingEntry.entryTime,
        exitTime: parkingEntry.exitTime,
        calculatedFee: parkingEntry.calculatedFee,
        actualFee: parkingEntry.actualFee,
        amountPaid: parkingEntry.amountPaid,
        paymentMethod: parkingEntry.paymentMethod,
        paymentStatus: parkingEntry.paymentStatus,
        status: parkingEntry.status
      },
      printerProfile: {
        id: printerProfile.id,
        name: printerProfile.name,
        type: 'thermal',
        paperSize: 'thermal-2.75',
        connection: 'usb',
        isDefault: printerProfile.isDefault,
        isOnline: true,
        capabilities: {
          supportsCut: printerProfile.capabilities.supportsCut,
          supportsColor: false,
          supportsGraphics: printerProfile.capabilities.supportsGraphics,
          maxPaperWidth: printerProfile.capabilities.paperWidth,
          dpi: printerProfile.capabilities.resolution,
          supportedFonts: ['default']
        },
        settings: {
          margins: {
            top: printerProfile.settings.paperWidth * 0.05,
            right: printerProfile.settings.paperWidth * 0.05,
            bottom: printerProfile.settings.paperWidth * 0.05,
            left: printerProfile.settings.paperWidth * 0.05
          },
          defaultCopies: 1,
          printQuality: 'normal',
          colorMode: 'mono'
        }
      },
      priority: 'normal',
      copies: 1
    };

    // Process immediately for thermal printers (or add to queue if implementing full queue)
    const job: PrintJob = {
      ...jobData,
      id: this.generateJobId(),
      status: 'printing',
      attempts: 1,
      maxAttempts: 3,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.thermalProcessor.processPrintJob(job);
    
    if (result.success) {
      return job.id;
    } else {
      throw new Error(`Thermal print failed: ${result.error}`);
    }
  }

  /**
   * Test thermal printer
   */
  async testThermalPrinter(printerProfileId?: string): Promise<PrintResult> {
    try {
      // Connect to thermal printer if needed
      if (printerProfileId) {
        await thermalPrinterManager.connectToPrinter(printerProfileId);
      }
      
      // Run test print
      const result = await thermalPrinterManager.testPrint();
      return result;
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Test print failed'
      };
    }
  }

  /**
   * Get thermal printer status
   */
  async getThermalPrinterStatus(): Promise<PrinterStatus | null> {
    return await thermalPrinterManager.checkPrinterStatus();
  }

  /**
   * Discover and setup thermal printers
   */
  async discoverThermalPrinters(): Promise<any[]> {
    const usbPrinters = await thermalPrinterManager.discoverUSBPrinters();
    return usbPrinters.map(printer => ({
      id: printer.id,
      name: printer.name,
      model: printer.model,
      type: 'thermal',
      connection: printer.connection.type,
      capabilities: printer.capabilities,
      isDefault: printer.isDefault,
      isOnline: false // Will be updated when connected
    }));
  }

  /**
   * Connect to specific thermal printer
   */
  async connectToThermalPrinter(printerProfileId: string): Promise<void> {
    await thermalPrinterManager.connectToPrinter(printerProfileId);
  }

  /**
   * Disconnect from thermal printer
   */
  async disconnectFromThermalPrinter(): Promise<void> {
    await thermalPrinterManager.disconnectFromPrinter();
  }

  private generateJobId(): string {
    return `print_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Thermal print utilities for easy integration
 */
export class ThermalPrintUtilities {
  private printService = new EnhancedPrintQueueService();

  /**
   * Quick print entry ticket
   */
  async printEntryTicket(parkingEntry: any): Promise<string> {
    return await this.printService.addThermalPrintJob(
      parkingEntry.id,
      'entry',
      parkingEntry
    );
  }

  /**
   * Quick print exit receipt
   */
  async printExitReceipt(parkingEntry: any): Promise<string> {
    return await this.printService.addThermalPrintJob(
      parkingEntry.id,
      'exit',
      parkingEntry
    );
  }

  /**
   * Quick print thermal ticket (auto-detect type)
   */
  async printThermalTicket(parkingEntry: any): Promise<string> {
    const ticketType = parkingEntry.exitTime ? 'exit' : 'entry';
    return await this.printService.addThermalPrintJob(
      parkingEntry.id,
      'thermal',
      parkingEntry
    );
  }

  /**
   * Setup thermal printer for first use
   */
  async setupThermalPrinter(): Promise<{ success: boolean; message: string; printers: any[] }> {
    try {
      // Discover available thermal printers
      const printers = await this.printService.discoverThermalPrinters();
      
      if (printers.length === 0) {
        return {
          success: false,
          message: 'No thermal printers found. Please connect a USB thermal printer and try again.',
          printers: []
        };
      }

      // Try to connect to the first available printer
      const firstPrinter = printers[0];
      await this.printService.connectToThermalPrinter(firstPrinter.id);

      // Test the connection
      const testResult = await this.printService.testThermalPrinter();
      
      if (testResult.success) {
        return {
          success: true,
          message: `Successfully connected to ${firstPrinter.name}. Test print completed.`,
          printers
        };
      } else {
        return {
          success: false,
          message: `Connected to ${firstPrinter.name} but test print failed: ${testResult.error}`,
          printers
        };
      }

    } catch (error) {
      return {
        success: false,
        message: `Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        printers: []
      };
    }
  }

  /**
   * Check if thermal printing is ready
   */
  async isThermalPrintingReady(): Promise<boolean> {
    const status = await this.printService.getThermalPrinterStatus();
    return status?.connected && status?.online || false;
  }
}

// Export singleton instances for easy use
export const enhancedPrintQueueService = new EnhancedPrintQueueService();
export const thermalPrintUtilities = new ThermalPrintUtilities();