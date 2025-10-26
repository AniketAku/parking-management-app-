import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  PrintJob,
  PrintQueueStatus,
  PrintJobCreate,
  PrinterProfile,
  PrintHistoryFilters
} from '../types/printQueue';
import { printQueueApi, printQueueOperations } from '../services/printQueueApi';
import { log } from '../utils/secureLogger';

interface UsePrintQueueOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealTimeUpdates?: boolean;
  filters?: PrintHistoryFilters;
}

interface UsePrintQueueReturn {
  // State
  jobs: PrintJob[];
  status: PrintQueueStatus | null;
  printers: PrinterProfile[];
  loading: boolean;
  error: string | null;
  
  // Actions
  addJob: (jobData: PrintJobCreate) => Promise<string>;
  retryJob: (jobId: string) => Promise<void>;
  cancelJob: (jobId: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Convenience methods
  printTicket: (ticketId: string, ticketType: any, ticketData: any, options?: any) => Promise<string>;
  getQueueSummary: () => Promise<any>;
}

export const usePrintQueue = ({
  autoRefresh = true,
  refreshInterval = 10000,
  enableRealTimeUpdates = false,
  filters
}: UsePrintQueueOptions = {}): UsePrintQueueReturn => {
  
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [status, setStatus] = useState<PrintQueueStatus | null>(null);
  const [printers, setPrinters] = useState<PrinterProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const refreshIntervalRef = useRef<number>();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Load initial data
  useEffect(() => {
    loadData();
    loadPrinters();
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Setup auto-refresh
  useEffect(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    if (autoRefresh && !enableRealTimeUpdates) {
      refreshIntervalRef.current = setInterval(loadData, refreshInterval);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, enableRealTimeUpdates]);

  // Setup real-time updates
  useEffect(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (enableRealTimeUpdates) {
      unsubscribeRef.current = printQueueApi.subscribeToUpdates({
        onJobCreated: (job) => {
          setJobs(prev => [job, ...prev]);
        },
        onJobUpdated: (job) => {
          setJobs(prev => prev.map(j => j.id === job.id ? job : j));
        },
        onJobCompleted: (job) => {
          setJobs(prev => prev.map(j => j.id === job.id ? job : j));
        },
        onJobFailed: (job) => {
          setJobs(prev => prev.map(j => j.id === job.id ? job : j));
        },
        onQueueStatusChanged: (newStatus) => {
          setStatus(newStatus);
        }
      });
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [enableRealTimeUpdates]);

  // Reload data when filters change
  useEffect(() => {
    if (filters) {
      loadData();
    }
  }, [filters]);

  const loadData = useCallback(async () => {
    try {
      const [jobsData, statusData] = await Promise.all([
        printQueueApi.getPrintHistory({ limit: 100, ...filters }),
        printQueueApi.getQueueStatus()
      ]);
      
      setJobs(jobsData);
      setStatus(statusData);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load print queue data';
      setError(errorMessage);
      log.error('Print queue error', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadPrinters = useCallback(async () => {
    try {
      const printersData = await printQueueApi.getAvailablePrinters();
      setPrinters(printersData);
    } catch (err) {
      log.error('Failed to load printers', err);
    }
  }, []);

  const addJob = useCallback(async (jobData: PrintJobCreate): Promise<string> => {
    try {
      const result = await printQueueApi.addToPrintQueue(jobData);
      await loadData(); // Refresh to show new job
      return result.jobId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add print job';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [loadData]);

  const retryJob = useCallback(async (jobId: string): Promise<void> => {
    try {
      await printQueueApi.retryPrintJob(jobId);
      await loadData();
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to retry print job';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [loadData]);

  const cancelJob = useCallback(async (jobId: string): Promise<void> => {
    try {
      await printQueueApi.cancelPrintJob(jobId);
      await loadData();
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel print job';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [loadData]);

  const clearCompleted = useCallback(async (): Promise<void> => {
    try {
      await printQueueApi.clearCompletedJobs();
      await loadData();
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear completed jobs';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [loadData]);

  const refreshData = useCallback(async (): Promise<void> => {
    setLoading(true);
    await loadData();
  }, [loadData]);

  // Convenience methods
  const printTicket = useCallback(async (
    ticketId: string, 
    ticketType: any, 
    ticketData: any, 
    options?: any
  ): Promise<string> => {
    return printQueueOperations.printTicket(ticketId, ticketType, ticketData, options);
  }, []);

  const getQueueSummary = useCallback(async () => {
    return printQueueOperations.getQueueSummary();
  }, []);

  return {
    // State
    jobs,
    status,
    printers,
    loading,
    error,
    
    // Actions
    addJob,
    retryJob,
    cancelJob,
    clearCompleted,
    refreshData,
    
    // Convenience methods
    printTicket,
    getQueueSummary
  };
};

// Specialized hooks for specific use cases
export const usePrintQueueStatus = (refreshInterval: number = 30000) => {
  const [status, setStatus] = useState<PrintQueueStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const statusData = await printQueueApi.getQueueStatus();
        setStatus(statusData);
      } catch (err) {
        log.error('Failed to load print queue status', err);
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
    const interval = setInterval(loadStatus, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { status, loading };
};

export const usePrinters = () => {
  const [printers, setPrinters] = useState<PrinterProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPrinters = async () => {
      try {
        const printersData = await printQueueApi.getAvailablePrinters();
        setPrinters(printersData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load printers');
      } finally {
        setLoading(false);
      }
    };

    loadPrinters();
  }, []);

  const testPrinter = useCallback(async (printerId: string): Promise<boolean> => {
    try {
      const result = await printQueueApi.testPrinter(printerId);
      return result.success;
    } catch {
      return false;
    }
  }, []);

  const refreshPrinters = useCallback(async () => {
    setLoading(true);
    try {
      const printersData = await printQueueApi.getAvailablePrinters();
      setPrinters(printersData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh printers');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    printers,
    loading,
    error,
    testPrinter,
    refreshPrinters
  };
};