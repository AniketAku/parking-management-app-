/**
 * useThermalPrinter Hook
 * React hook for thermal printer management and printing operations
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  ThermalPrinterProfile,
  PrinterStatus,
  PrintResult,
  ParkingTicketData
} from '../types/thermalPrinter';
import { thermalPrinterManager } from '../services/thermalPrinterService';
import { thermalPrintUtilities } from '../services/thermalPrintQueueIntegration';
import { log } from '../utils/secureLogger';

interface UseThermalPrinterOptions {
  autoConnect?: boolean;
  autoDiscover?: boolean;
  statusCheckInterval?: number;
  onPrinterConnected?: (printer: ThermalPrinterProfile) => void;
  onPrinterDisconnected?: () => void;
  onPrintComplete?: (result: PrintResult) => void;
  onError?: (error: string) => void;
}

interface UseThermalPrinterReturn {
  // State
  printers: ThermalPrinterProfile[];
  selectedPrinter: ThermalPrinterProfile | null;
  printerStatus: PrinterStatus | null;
  isConnected: boolean;
  isConnecting: boolean;
  isPrinting: boolean;
  error: string | null;
  
  // Actions
  discoverPrinters: () => Promise<ThermalPrinterProfile[]>;
  connectToPrinter: (printerId: string) => Promise<void>;
  disconnectPrinter: () => Promise<void>;
  testPrint: () => Promise<PrintResult>;
  
  // Printing methods
  printTicket: (ticketData: ParkingTicketData) => Promise<PrintResult>;
  printEntryTicket: (parkingEntry: any) => Promise<string>;
  printExitReceipt: (parkingEntry: any) => Promise<string>;
  
  // Utility methods
  quickSetup: () => Promise<{ success: boolean; message: string }>;
  checkStatus: () => Promise<PrinterStatus | null>;
  isReady: () => boolean;
}

export const useThermalPrinter = ({
  autoConnect = false,
  autoDiscover = false,
  statusCheckInterval = 10000,
  onPrinterConnected,
  onPrinterDisconnected,
  onPrintComplete,
  onError
}: UseThermalPrinterOptions = {}): UseThermalPrinterReturn => {
  
  const [printers, setPrinters] = useState<ThermalPrinterProfile[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<ThermalPrinterProfile | null>(null);
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial printer profiles
  useEffect(() => {
    loadPrinters();
    
    if (autoDiscover) {
      discoverPrinters();
    }
  }, [autoDiscover]);

  // Auto-connect to default printer
  useEffect(() => {
    if (autoConnect && printers.length > 0 && !selectedPrinter) {
      const defaultPrinter = printers.find(p => p.isDefault) || printers[0];
      if (defaultPrinter) {
        connectToPrinter(defaultPrinter.id);
      }
    }
  }, [autoConnect, printers, selectedPrinter]);

  // Set up status monitoring
  useEffect(() => {
    if (statusCheckInterval > 0) {
      const interval = setInterval(checkStatus, statusCheckInterval);
      return () => clearInterval(interval);
    }
  }, [statusCheckInterval]);

  const loadPrinters = useCallback(() => {
    try {
      const allPrinters = thermalPrinterManager.getAllPrinterProfiles();
      setPrinters(allPrinters);
      
      // Update selected printer if it exists
      const activePrinter = allPrinters.find(p => p.isActive);
      if (activePrinter) {
        setSelectedPrinter(activePrinter);
        setIsConnected(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load printers';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [onError]);

  const discoverPrinters = useCallback(async (): Promise<ThermalPrinterProfile[]> => {
    try {
      setError(null);
      const discoveredPrinters = await thermalPrinterManager.discoverUSBPrinters();
      
      if (discoveredPrinters.length > 0) {
        loadPrinters();
      }
      
      return discoveredPrinters;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Printer discovery failed';
      setError(errorMessage);
      onError?.(errorMessage);
      return [];
    }
  }, [loadPrinters, onError]);

  const connectToPrinter = useCallback(async (printerId: string): Promise<void> => {
    setIsConnecting(true);
    setError(null);
    
    try {
      await thermalPrinterManager.connectToPrinter(printerId);
      
      const printer = printers.find(p => p.id === printerId);
      if (printer) {
        setSelectedPrinter(printer);
        setIsConnected(true);
        onPrinterConnected?.(printer);
      }
      
      // Check status after connection
      await checkStatus();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setError(errorMessage);
      onError?.(errorMessage);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [printers, onPrinterConnected, onError]);

  const disconnectPrinter = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      await thermalPrinterManager.disconnectFromPrinter();
      
      setSelectedPrinter(null);
      setIsConnected(false);
      setPrinterStatus(null);
      onPrinterDisconnected?.();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Disconnect failed';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [onPrinterDisconnected, onError]);

  const testPrint = useCallback(async (): Promise<PrintResult> => {
    if (!selectedPrinter || !isConnected) {
      const result = { success: false, error: 'No printer connected' };
      onError?.('No printer connected');
      return result;
    }

    try {
      setError(null);
      setIsPrinting(true);
      
      const result = await thermalPrinterManager.testPrint();
      
      if (result.success) {
        onPrintComplete?.(result);
      } else {
        setError(result.error || 'Test print failed');
        onError?.(result.error || 'Test print failed');
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Test print failed';
      const result = { success: false, error: errorMessage };
      setError(errorMessage);
      onError?.(errorMessage);
      return result;
    } finally {
      setIsPrinting(false);
    }
  }, [selectedPrinter, isConnected, onPrintComplete, onError]);

  const printTicket = useCallback(async (ticketData: ParkingTicketData): Promise<PrintResult> => {
    if (!selectedPrinter || !isConnected) {
      const result = { success: false, error: 'No printer connected' };
      onError?.('No printer connected');
      return result;
    }

    try {
      setError(null);
      setIsPrinting(true);
      
      const result = await thermalPrinterManager.printTicket(ticketData);
      
      if (result.success) {
        onPrintComplete?.(result);
      } else {
        setError(result.error || 'Print failed');
        onError?.(result.error || 'Print failed');
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Print failed';
      const result = { success: false, error: errorMessage };
      setError(errorMessage);
      onError?.(errorMessage);
      return result;
    } finally {
      setIsPrinting(false);
    }
  }, [selectedPrinter, isConnected, onPrintComplete, onError]);

  const printEntryTicket = useCallback(async (parkingEntry: any): Promise<string> => {
    try {
      setError(null);
      setIsPrinting(true);
      
      const jobId = await thermalPrintUtilities.printEntryTicket(parkingEntry);
      return jobId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Entry ticket print failed';
      setError(errorMessage);
      onError?.(errorMessage);
      throw error;
    } finally {
      setIsPrinting(false);
    }
  }, [onError]);

  const printExitReceipt = useCallback(async (parkingEntry: any): Promise<string> => {
    try {
      setError(null);
      setIsPrinting(true);
      
      const jobId = await thermalPrintUtilities.printExitReceipt(parkingEntry);
      return jobId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Exit receipt print failed';
      setError(errorMessage);
      onError?.(errorMessage);
      throw error;
    } finally {
      setIsPrinting(false);
    }
  }, [onError]);

  const quickSetup = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const result = await thermalPrintUtilities.setupThermalPrinter();
      
      if (result.success) {
        loadPrinters();
        // Find the connected printer and set it as selected
        const connectedPrinter = result.printers[0];
        if (connectedPrinter) {
          setSelectedPrinter(connectedPrinter);
          setIsConnected(true);
          onPrinterConnected?.(connectedPrinter);
        }
      } else {
        setError(result.message);
        onError?.(result.message);
      }
      
      return { success: result.success, message: result.message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Quick setup failed';
      setError(errorMessage);
      onError?.(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setIsConnecting(false);
    }
  }, [loadPrinters, onPrinterConnected, onError]);

  const checkStatus = useCallback(async (): Promise<PrinterStatus | null> => {
    try {
      const status = await thermalPrinterManager.checkPrinterStatus();
      setPrinterStatus(status);
      
      // Update connection status based on printer status
      if (status) {
        setIsConnected(status.connected);
      }
      
      return status;
    } catch (error) {
      log.error('Error checking printer status', error);
      return null;
    }
  }, []);

  const isReady = useCallback((): boolean => {
    return isConnected && printerStatus?.online === true && !isPrinting;
  }, [isConnected, printerStatus, isPrinting]);

  return {
    // State
    printers,
    selectedPrinter,
    printerStatus,
    isConnected,
    isConnecting,
    isPrinting,
    error,
    
    // Actions
    discoverPrinters,
    connectToPrinter,
    disconnectPrinter,
    testPrint,
    
    // Printing methods
    printTicket,
    printEntryTicket,
    printExitReceipt,
    
    // Utility methods
    quickSetup,
    checkStatus,
    isReady
  };
};