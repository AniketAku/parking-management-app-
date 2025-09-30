import type { 
  PrintJob, 
  PrintQueueStatus, 
  PrintHistoryFilters, 
  PrinterProfile,
  PrintJobCreate,
  PrintResult,
  PrintStatistics
} from '../types/printQueue';

const API_BASE_URL = '/api/print-queue';

/**
 * Print Queue API Client
 */
export class PrintQueueApi {

  /**
   * Add job to print queue
   */
  async addToPrintQueue(jobData: PrintJobCreate): Promise<{ jobId: string }> {
    const response = await fetch(`${API_BASE_URL}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jobData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add job to print queue');
    }

    return response.json();
  }

  /**
   * Get print queue status
   */
  async getQueueStatus(): Promise<PrintQueueStatus> {
    const response = await fetch(`${API_BASE_URL}/status`);

    if (!response.ok) {
      throw new Error('Failed to get queue status');
    }

    return response.json();
  }

  /**
   * Get print job history
   */
  async getPrintHistory(filters?: PrintHistoryFilters): Promise<PrintJob[]> {
    const params = new URLSearchParams();
    
    if (filters?.ticketType) params.append('ticketType', filters.ticketType);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.printerProfile) params.append('printerProfile', filters.printerProfile);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom.toISOString());
    if (filters?.dateTo) params.append('dateTo', filters.dateTo.toISOString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const response = await fetch(`${API_BASE_URL}/history?${params}`);

    if (!response.ok) {
      throw new Error('Failed to get print history');
    }

    const data = await response.json();
    return data.map((job: any) => ({
      ...job,
      createdAt: new Date(job.createdAt),
      updatedAt: new Date(job.updatedAt),
      printedAt: job.printedAt ? new Date(job.printedAt) : undefined,
      retryAt: job.retryAt ? new Date(job.retryAt) : undefined,
    }));
  }

  /**
   * Get specific print job
   */
  async getPrintJob(jobId: string): Promise<PrintJob> {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Print job not found');
      }
      throw new Error('Failed to get print job');
    }

    const job = await response.json();
    return {
      ...job,
      createdAt: new Date(job.createdAt),
      updatedAt: new Date(job.updatedAt),
      printedAt: job.printedAt ? new Date(job.printedAt) : undefined,
      retryAt: job.retryAt ? new Date(job.retryAt) : undefined,
    };
  }

  /**
   * Retry failed print job
   */
  async retryPrintJob(jobId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/retry`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to retry print job');
    }
  }

  /**
   * Cancel print job
   */
  async cancelPrintJob(jobId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/cancel`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to cancel print job');
    }
  }

  /**
   * Clear completed jobs
   */
  async clearCompletedJobs(): Promise<{ count: number }> {
    const response = await fetch(`${API_BASE_URL}/jobs/cleanup`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to clear completed jobs');
    }

    return response.json();
  }

  /**
   * Get available printers
   */
  async getAvailablePrinters(): Promise<PrinterProfile[]> {
    const response = await fetch(`${API_BASE_URL}/printers`);

    if (!response.ok) {
      throw new Error('Failed to get available printers');
    }

    return response.json();
  }

  /**
   * Get printer by ID
   */
  async getPrinter(printerId: string): Promise<PrinterProfile> {
    const response = await fetch(`${API_BASE_URL}/printers/${printerId}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Printer not found');
      }
      throw new Error('Failed to get printer');
    }

    return response.json();
  }

  /**
   * Test printer connection
   */
  async testPrinter(printerId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/printers/${printerId}/test`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to test printer');
    }

    return response.json();
  }

  /**
   * Create printer profile
   */
  async createPrinter(printerData: Omit<PrinterProfile, 'id'>): Promise<PrinterProfile> {
    const response = await fetch(`${API_BASE_URL}/printers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(printerData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create printer');
    }

    return response.json();
  }

  /**
   * Update printer profile
   */
  async updatePrinter(printerId: string, updates: Partial<PrinterProfile>): Promise<PrinterProfile> {
    const response = await fetch(`${API_BASE_URL}/printers/${printerId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update printer');
    }

    return response.json();
  }

  /**
   * Delete printer profile
   */
  async deletePrinter(printerId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/printers/${printerId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete printer');
    }
  }

  /**
   * Get print statistics
   */
  async getPrintStatistics(dateRange?: { from: Date; to: Date }): Promise<PrintStatistics> {
    const params = new URLSearchParams();
    
    if (dateRange?.from) params.append('from', dateRange.from.toISOString());
    if (dateRange?.to) params.append('to', dateRange.to.toISOString());

    const response = await fetch(`${API_BASE_URL}/statistics?${params}`);

    if (!response.ok) {
      throw new Error('Failed to get print statistics');
    }

    return response.json();
  }

  /**
   * Process print queue manually
   */
  async processPrintQueue(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/process`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to process print queue');
    }
  }

  /**
   * Archive old completed jobs
   */
  async archiveCompletedJobs(daysOld: number = 30): Promise<{ count: number }> {
    const response = await fetch(`${API_BASE_URL}/archive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ daysOld }),
    });

    if (!response.ok) {
      throw new Error('Failed to archive completed jobs');
    }

    return response.json();
  }

  /**
   * Get printer status (online/offline, error states)
   */
  async getPrinterStatus(printerId: string): Promise<{
    isOnline: boolean;
    hasError: boolean;
    errorMessage?: string;
    paperLevel: string;
    queuedJobs: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/printers/${printerId}/status`);

    if (!response.ok) {
      throw new Error('Failed to get printer status');
    }

    return response.json();
  }

  /**
   * Subscribe to real-time print queue updates
   */
  subscribeToUpdates(callbacks: {
    onJobCreated?: (job: PrintJob) => void;
    onJobUpdated?: (job: PrintJob) => void;
    onJobCompleted?: (job: PrintJob) => void;
    onJobFailed?: (job: PrintJob) => void;
    onQueueStatusChanged?: (status: PrintQueueStatus) => void;
  }): () => void {
    const eventSource = new EventSource(`${API_BASE_URL}/subscribe`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'job:created':
            callbacks.onJobCreated?.(data.payload);
            break;
          case 'job:updated':
            callbacks.onJobUpdated?.(data.payload);
            break;
          case 'job:completed':
            callbacks.onJobCompleted?.(data.payload);
            break;
          case 'job:failed':
            callbacks.onJobFailed?.(data.payload);
            break;
          case 'queue:status':
            callbacks.onQueueStatusChanged?.(data.payload);
            break;
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Print queue SSE error:', error);
    };

    return () => {
      eventSource.close();
    };
  }
}

// Export singleton instance
export const printQueueApi = new PrintQueueApi();

// Convenience functions for quick operations
export const printQueueOperations = {
  /**
   * Quick add ticket to print queue
   */
  async printTicket(
    ticketId: string,
    ticketType: 'entry' | 'exit' | 'receipt' | 'thermal',
    ticketData: any,
    options?: {
      printerId?: string;
      priority?: 'normal' | 'high' | 'urgent';
      copies?: number;
    }
  ): Promise<string> {
    const result = await printQueueApi.addToPrintQueue({
      ticketId,
      ticketType,
      ticketData,
      printerId: options?.printerId,
      priority: options?.priority,
      copies: options?.copies,
    });
    return result.jobId;
  },

  /**
   * Quick reprint failed job
   */
  async reprintTicket(jobId: string): Promise<void> {
    await printQueueApi.retryPrintJob(jobId);
  },

  /**
   * Get queue summary
   */
  async getQueueSummary(): Promise<{
    pending: number;
    processing: number;
    failed: number;
    estimatedWaitTime: number;
  }> {
    const status = await printQueueApi.getQueueStatus();
    return {
      pending: status.queuedJobs + status.retryingJobs,
      processing: status.processingJobs,
      failed: status.failedJobs,
      estimatedWaitTime: status.estimatedWaitTime || 0,
    };
  },
};