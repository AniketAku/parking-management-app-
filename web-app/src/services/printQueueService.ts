import type {
  PrintJob,
  PrintQueueService,
  PrintQueueStatus,
  PrintHistoryFilters,
  PrinterProfile,
  PrintResult,
  PrintJobCreate,
  PrintJobUpdate,
  PrintStatistics
} from '../types/printQueue';
import { PriorityQueue, calculatePrintPriority } from '../utils/PriorityQueue';
import { log } from '../utils/secureLogger';

/**
 * Print Queue Manager - Handles background print processing with retry logic
 */
export class PrintQueueManager implements PrintQueueService {
  private queue: PriorityQueue<PrintJob> = new PriorityQueue();
  private processing = false;
  private processingInterval = 2000; // 2 seconds
  private intervalId?: NodeJS.Timeout;
  
  // Event callbacks
  private onPrintCompleteCallbacks: ((job: PrintJob) => void)[] = [];
  private onPrintErrorCallbacks: ((job: PrintJob, error: Error) => void)[] = [];
  private onQueueStatusChangeCallbacks: ((status: PrintQueueStatus) => void)[] = [];

  // In-memory storage for completed/failed jobs (for demo)
  private jobHistory: Map<string, PrintJob> = new Map();
  private activeJobs: Map<string, PrintJob> = new Map();

  constructor(private printerService?: any) {
    this.startQueueProcessor();
  }

  /**
   * Add job to print queue
   */
  async addToPrintQueue(jobData: Omit<PrintJob, 'id' | 'status' | 'attempts' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const job: PrintJob = {
      ...jobData,
      id: this.generateJobId(),
      status: 'queued',
      attempts: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const priority = calculatePrintPriority(
      job.ticketType,
      job.attempts > 0, // isReprint
      job.priority
    );

    this.queue.enqueue(job, priority);
    this.activeJobs.set(job.id, job);

    // Persist to database (mock for now)
    await this.persistJob(job);

    // Notify status change
    await this.notifyStatusChange();

    return job.id;
  }

  /**
   * Start background queue processor
   */
  private startQueueProcessor(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(async () => {
      if (!this.processing && !this.queue.isEmpty()) {
        await this.processNextJob();
      }
    }, this.processingInterval);
  }

  /**
   * Process next job in queue
   */
  async processPrintQueue(): Promise<void> {
    if (this.processing) {
      return;
    }

    await this.processNextJob();
  }

  private async processNextJob(): Promise<void> {
    this.processing = true;

    try {
      const job = this.queue.dequeue();
      if (job) {
        await this.executePrintJob(job);
      }
    } catch (error) {
      log.error('Print queue processing error', error);
    } finally {
      this.processing = false;
      await this.notifyStatusChange();
    }
  }

  /**
   * Execute individual print job
   */
  private async executePrintJob(job: PrintJob): Promise<void> {
    const updatedJob = { ...job };
    updatedJob.status = 'printing';
    updatedJob.attempts++;
    updatedJob.updatedAt = new Date();

    this.activeJobs.set(updatedJob.id, updatedJob);
    await this.updateJobInDatabase(updatedJob);

    try {
      // Simulate print operation (replace with actual printer service call)
      const printResult = await this.simulatePrint(updatedJob);

      if (printResult.success) {
        updatedJob.status = 'completed';
        updatedJob.printedAt = new Date();
        updatedJob.updatedAt = new Date();
        
        this.activeJobs.delete(updatedJob.id);
        this.jobHistory.set(updatedJob.id, updatedJob);
        
        await this.updateJobInDatabase(updatedJob);
        this.onPrintCompleteCallbacks.forEach(callback => callback(updatedJob));
      } else {
        throw new Error(printResult.error || 'Print failed');
      }
    } catch (error) {
      await this.handlePrintError(updatedJob, error as Error);
    }
  }

  /**
   * Handle print job errors with retry logic
   */
  private async handlePrintError(job: PrintJob, error: Error): Promise<void> {
    job.error = error.message;
    job.updatedAt = new Date();

    if (job.attempts < job.maxAttempts) {
      job.status = 'retrying';
      
      // Calculate exponential backoff delay
      const backoffDelay = Math.pow(2, job.attempts) * 1000;
      job.retryAt = new Date(Date.now() + backoffDelay);

      await this.updateJobInDatabase(job);

      // Re-queue with delay
      setTimeout(() => {
        const priority = calculatePrintPriority(
          job.ticketType,
          true, // isReprint
          job.priority
        );
        this.queue.enqueue(job, priority);
      }, backoffDelay);

    } else {
      job.status = 'failed';
      this.activeJobs.delete(job.id);
      this.jobHistory.set(job.id, job);
      
      await this.updateJobInDatabase(job);
      this.onPrintErrorCallbacks.forEach(callback => callback(job, error));
    }
  }

  /**
   * Retry failed print job
   */
  async retryFailedPrint(jobId: string): Promise<void> {
    const job = this.jobHistory.get(jobId) || this.activeJobs.get(jobId);
    
    if (!job || job.status !== 'failed') {
      throw new Error('Job not found or not in failed state');
    }

    // Reset job for retry
    job.status = 'queued';
    job.attempts = 0;
    job.error = undefined;
    job.retryAt = undefined;
    job.updatedAt = new Date();

    // Move back to active jobs
    this.jobHistory.delete(jobId);
    this.activeJobs.set(jobId, job);

    const priority = calculatePrintPriority(job.ticketType, true, job.priority);
    this.queue.enqueue(job, priority);

    await this.updateJobInDatabase(job);
    await this.notifyStatusChange();
  }

  /**
   * Cancel print job
   */
  async cancelPrintJob(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    
    if (!job) {
      throw new Error('Job not found or already completed');
    }

    // Remove from queue if still queued
    if (job.status === 'queued' || job.status === 'retrying') {
      this.queue.remove(queuedJob => queuedJob.id === jobId);
    }

    job.status = 'cancelled';
    job.updatedAt = new Date();
    
    this.activeJobs.delete(jobId);
    this.jobHistory.set(jobId, job);

    await this.updateJobInDatabase(job);
    await this.notifyStatusChange();
  }

  /**
   * Clear completed jobs from history
   */
  async clearCompletedJobs(): Promise<void> {
    for (const [jobId, job] of this.jobHistory.entries()) {
      if (job.status === 'completed') {
        this.jobHistory.delete(jobId);
        await this.deleteJobFromDatabase(jobId);
      }
    }
    await this.notifyStatusChange();
  }

  /**
   * Get current queue status
   */
  async getQueueStatus(): Promise<PrintQueueStatus> {
    const allJobs = [...this.activeJobs.values(), ...this.jobHistory.values()];
    
    return {
      totalJobs: allJobs.length,
      queuedJobs: allJobs.filter(job => job.status === 'queued').length,
      processingJobs: allJobs.filter(job => job.status === 'printing').length,
      completedJobs: allJobs.filter(job => job.status === 'completed').length,
      failedJobs: allJobs.filter(job => job.status === 'failed').length,
      retryingJobs: allJobs.filter(job => job.status === 'retrying').length,
      isProcessing: this.processing,
      lastProcessedAt: this.getLastProcessedTime(),
      estimatedWaitTime: this.calculateEstimatedWaitTime()
    };
  }

  /**
   * Get print job history with filters
   */
  async getPrintHistory(filters?: PrintHistoryFilters): Promise<PrintJob[]> {
    let jobs = [...this.activeJobs.values(), ...this.jobHistory.values()];

    if (filters) {
      if (filters.ticketType) {
        jobs = jobs.filter(job => job.ticketType === filters.ticketType);
      }
      if (filters.status) {
        jobs = jobs.filter(job => job.status === filters.status);
      }
      if (filters.priority) {
        jobs = jobs.filter(job => job.priority === filters.priority);
      }
      if (filters.printerProfile) {
        jobs = jobs.filter(job => job.printerProfile.id === filters.printerProfile);
      }
      if (filters.dateFrom) {
        jobs = jobs.filter(job => job.createdAt >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        jobs = jobs.filter(job => job.createdAt <= filters.dateTo!);
      }
    }

    // Sort by creation date (newest first)
    jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 100;
    
    return jobs.slice(offset, offset + limit);
  }

  /**
   * Get specific print job
   */
  async getPrintJob(jobId: string): Promise<PrintJob | null> {
    return this.activeJobs.get(jobId) || this.jobHistory.get(jobId) || null;
  }

  /**
   * Get available printers (mock implementation)
   */
  async getAvailablePrinters(): Promise<PrinterProfile[]> {
    // Mock printer profiles
    return [
      {
        id: 'default-printer',
        name: 'Default Printer',
        type: 'standard',
        paperSize: 'A4',
        connection: 'usb',
        isDefault: true,
        isOnline: true,
        capabilities: {
          supportsCut: false,
          supportsColor: true,
          supportsGraphics: true,
          maxPaperWidth: 210,
          dpi: 300,
          supportedFonts: ['Arial', 'Times New Roman', 'Courier New']
        },
        settings: {
          margins: { top: 10, right: 10, bottom: 10, left: 10 },
          defaultCopies: 1,
          autoCut: false,
          density: 100,
          speed: 'medium'
        }
      },
      {
        id: 'thermal-printer',
        name: 'Thermal Receipt Printer',
        type: 'thermal',
        paperSize: 'thermal-2.75',
        connection: 'usb',
        isDefault: false,
        isOnline: true,
        capabilities: {
          supportsCut: true,
          supportsColor: false,
          supportsGraphics: false,
          maxPaperWidth: 72,
          dpi: 203,
          supportedFonts: ['Courier New']
        },
        settings: {
          margins: { top: 2, right: 2, bottom: 2, left: 2 },
          defaultCopies: 1,
          autoCut: true,
          density: 80,
          speed: 'fast'
        }
      }
    ];
  }

  /**
   * Test printer connection
   */
  async testPrinter(printerId: string): Promise<boolean> {
    // Mock printer test
    await new Promise(resolve => setTimeout(resolve, 1000));
    return Math.random() > 0.1; // 90% success rate
  }

  // Event handler registrations
  onPrintComplete(callback: (job: PrintJob) => void): void {
    this.onPrintCompleteCallbacks.push(callback);
  }

  onPrintError(callback: (job: PrintJob, error: Error) => void): void {
    this.onPrintErrorCallbacks.push(callback);
  }

  onQueueStatusChange(callback: (status: PrintQueueStatus) => void): void {
    this.onQueueStatusChangeCallbacks.push(callback);
  }

  // Utility methods
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async simulatePrint(job: PrintJob): Promise<PrintResult> {
    // Simulate print time based on job complexity
    const printTime = job.ticketType === 'thermal' ? 1000 : 2000;
    await new Promise(resolve => setTimeout(resolve, printTime));

    // Simulate occasional failures
    const failureRate = job.attempts > 1 ? 0.1 : 0.05; // Higher failure rate for retries
    const success = Math.random() > failureRate;

    return {
      success,
      jobId: job.id,
      error: success ? undefined : `Printer error: ${job.attempts > 1 ? 'Communication timeout' : 'Paper jam detected'}`,
      timestamp: new Date()
    };
  }

  private async notifyStatusChange(): Promise<void> {
    const status = await this.getQueueStatus();
    this.onQueueStatusChangeCallbacks.forEach(callback => callback(status));
  }

  private getLastProcessedTime(): Date | undefined {
    const completedJobs = [...this.jobHistory.values()]
      .filter(job => job.printedAt)
      .sort((a, b) => (b.printedAt?.getTime() || 0) - (a.printedAt?.getTime() || 0));
    
    return completedJobs[0]?.printedAt;
  }

  private calculateEstimatedWaitTime(): number {
    const queuedJobs = this.queue.size();
    const averagePrintTime = 3; // seconds
    return queuedJobs * averagePrintTime;
  }

  // Database operations (mock implementations)
  private async persistJob(job: PrintJob): Promise<void> {
    // Mock database persistence
    log.debug('Persisting job to database', { jobId: job.id });
  }

  private async updateJobInDatabase(job: PrintJob): Promise<void> {
    // Mock database update
    log.debug('Updating job in database', { jobId: job.id });
  }

  private async deleteJobFromDatabase(jobId: string): Promise<void> {
    // Mock database deletion
    log.debug('Deleting job from database', { jobId });
  }

  // Cleanup
  destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.queue.clear();
    this.activeJobs.clear();
    this.jobHistory.clear();
  }
}

// Export singleton instance
export const printQueueManager = new PrintQueueManager();