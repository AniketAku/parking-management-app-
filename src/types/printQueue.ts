export interface PrintJob {
  id: string;
  ticketId: string;
  ticketType: 'entry' | 'exit' | 'receipt' | 'thermal';
  ticketData: Record<string, any>;
  printerProfile: PrinterProfile;
  priority: 'normal' | 'high' | 'urgent';
  copies: number;
  status: 'queued' | 'printing' | 'completed' | 'failed' | 'retrying' | 'cancelled';
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  printedAt?: Date;
  error?: string;
  retryAt?: Date;
}

export interface PrinterProfile {
  id: string;
  name: string;
  type: 'standard' | 'thermal' | 'receipt';
  paperSize: 'A4' | 'thermal-2.75' | 'thermal-3' | 'custom';
  connection: 'usb' | 'network' | 'bluetooth';
  devicePath?: string;
  ipAddress?: string;
  port?: number;
  isDefault: boolean;
  isOnline: boolean;
  capabilities: PrinterCapabilities;
  settings: PrinterSettings;
}

export interface PrinterCapabilities {
  supportsCut: boolean;
  supportsColor: boolean;
  supportsGraphics: boolean;
  maxPaperWidth: number;
  dpi: number;
  supportedFonts: string[];
}

export interface PrinterSettings {
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  defaultCopies: number;
  autoCut: boolean;
  density: number;
  speed: 'slow' | 'medium' | 'fast';
}

export interface PrintQueueStatus {
  totalJobs: number;
  queuedJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  retryingJobs: number;
  isProcessing: boolean;
  lastProcessedAt?: Date;
  estimatedWaitTime?: number;
}

export interface PrintHistoryFilters {
  ticketType?: PrintJob['ticketType'];
  status?: PrintJob['status'];
  priority?: PrintJob['priority'];
  printerProfile?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface PrintQueueService {
  // Queue operations
  addToPrintQueue(job: Omit<PrintJob, 'id' | 'status' | 'attempts' | 'createdAt' | 'updatedAt'>): Promise<string>;
  processPrintQueue(): Promise<void>;
  retryFailedPrint(jobId: string): Promise<void>;
  cancelPrintJob(jobId: string): Promise<void>;
  clearCompletedJobs(): Promise<void>;
  
  // Status and monitoring
  getQueueStatus(): Promise<PrintQueueStatus>;
  getPrintHistory(filters?: PrintHistoryFilters): Promise<PrintJob[]>;
  getPrintJob(jobId: string): Promise<PrintJob | null>;
  
  // Printer management
  getAvailablePrinters(): Promise<PrinterProfile[]>;
  testPrinter(printerId: string): Promise<boolean>;
  
  // Event handlers
  onPrintComplete(callback: (job: PrintJob) => void): void;
  onPrintError(callback: (job: PrintJob, error: Error) => void): void;
  onQueueStatusChange(callback: (status: PrintQueueStatus) => void): void;
}

export interface PrintResult {
  success: boolean;
  jobId?: string;
  error?: string;
  timestamp: Date;
}

export interface PrintJobCreate {
  ticketId: string;
  ticketType: PrintJob['ticketType'];
  ticketData: Record<string, any>;
  printerId?: string;
  priority?: PrintJob['priority'];
  copies?: number;
  maxAttempts?: number;
}

export interface PrintJobUpdate {
  status?: PrintJob['status'];
  error?: string;
  attempts?: number;
  printedAt?: Date;
  retryAt?: Date;
}

export interface PriorityQueueItem<T> {
  item: T;
  priority: number;
}

export interface PrintStatistics {
  totalPrintJobs: number;
  successfulPrints: number;
  failedPrints: number;
  averagePrintTime: number;
  mostUsedPrinter: string;
  peakPrintingHours: { hour: number; count: number }[];
  printsByType: { type: string; count: number }[];
  errorRate: number;
  uptime: number;
}

export interface PrinterStatus {
  id: string;
  name: string;
  isOnline: boolean;
  hasError: boolean;
  errorMessage?: string;
  paperLevel: 'high' | 'medium' | 'low' | 'empty';
  inkLevel?: 'high' | 'medium' | 'low' | 'empty';
  queuedJobs: number;
  lastPrintTime?: Date;
  totalPrints: number;
}

// Event types for real-time updates
export interface PrintQueueEvents {
  'job:created': PrintJob;
  'job:updated': PrintJob;
  'job:completed': PrintJob;
  'job:failed': PrintJob;
  'job:cancelled': PrintJob;
  'queue:status': PrintQueueStatus;
  'printer:status': PrinterStatus;
  'printer:connected': PrinterProfile;
  'printer:disconnected': string;
}