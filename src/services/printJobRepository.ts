import { supabase } from '../lib/supabase';
import type { PrintJob, PrinterProfile, PrintJobCreate, PrintJobUpdate, PrintHistoryFilters } from '../types/printQueue';

/**
 * Print Job Repository - Database operations for print queue management
 */
export class PrintJobRepository {
  
  /**
   * Create new print job in database
   */
  async createPrintJob(jobData: PrintJobCreate & { id: string }): Promise<PrintJob> {
    const { data, error } = await supabase
      .from('print_jobs')
      .insert({
        id: jobData.id,
        ticket_id: jobData.ticketId,
        ticket_type: jobData.ticketType,
        ticket_data: jobData.ticketData,
        printer_profile_id: jobData.printerId,
        priority: jobData.priority || 'normal',
        copies: jobData.copies || 1,
        max_attempts: jobData.maxAttempts || 3,
        status: 'queued',
        attempts: 0
      })
      .select(`
        *,
        printer_profile:printer_profiles(*)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create print job: ${error.message}`);
    }

    return this.mapDatabaseJobToJob(data);
  }

  /**
   * Update existing print job
   */
  async updatePrintJob(jobId: string, updates: PrintJobUpdate): Promise<PrintJob> {
    const updateData: any = {};

    if (updates.status) updateData.status = updates.status;
    if (updates.error) updateData.error_message = updates.error;
    if (updates.attempts !== undefined) updateData.attempts = updates.attempts;
    if (updates.printedAt) updateData.printed_at = updates.printedAt.toISOString();
    if (updates.retryAt) updateData.retry_at = updates.retryAt.toISOString();

    const { data, error } = await supabase
      .from('print_jobs')
      .update(updateData)
      .eq('id', jobId)
      .select(`
        *,
        printer_profile:printer_profiles(*)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update print job: ${error.message}`);
    }

    return this.mapDatabaseJobToJob(data);
  }

  /**
   * Get print job by ID
   */
  async getPrintJob(jobId: string): Promise<PrintJob | null> {
    const { data, error } = await supabase
      .from('print_jobs')
      .select(`
        *,
        printer_profile:printer_profiles(*)
      `)
      .eq('id', jobId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to get print job: ${error.message}`);
    }

    return this.mapDatabaseJobToJob(data);
  }

  /**
   * Get next queued print job
   */
  async getNextQueuedJob(): Promise<PrintJob | null> {
    const { data, error } = await supabase
      .rpc('get_next_print_job');

    if (error) {
      throw new Error(`Failed to get next print job: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Get full job data with printer profile
    return this.getPrintJob(data[0].id);
  }

  /**
   * Get print jobs with filters
   */
  async getPrintJobs(filters?: PrintHistoryFilters): Promise<PrintJob[]> {
    let query = supabase
      .from('print_jobs')
      .select(`
        *,
        printer_profile:printer_profiles(*)
      `);

    // Apply filters
    if (filters?.ticketType) {
      query = query.eq('ticket_type', filters.ticketType);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    if (filters?.printerProfile) {
      query = query.eq('printer_profile_id', filters.printerProfile);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom.toISOString());
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo.toISOString());
    }

    // Apply sorting and pagination
    query = query.order('created_at', { ascending: false });

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get print jobs: ${error.message}`);
    }

    return data?.map(job => this.mapDatabaseJobToJob(job)) || [];
  }

  /**
   * Get jobs that need retry
   */
  async getJobsToRetry(): Promise<PrintJob[]> {
    const { data, error } = await supabase
      .from('print_jobs')
      .select(`
        *,
        printer_profile:printer_profiles(*)
      `)
      .eq('status', 'retrying')
      .lte('retry_at', new Date().toISOString())
      .order('retry_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get retry jobs: ${error.message}`);
    }

    return data?.map(job => this.mapDatabaseJobToJob(job)) || [];
  }

  /**
   * Delete print job
   */
  async deletePrintJob(jobId: string): Promise<void> {
    const { error } = await supabase
      .from('print_jobs')
      .delete()
      .eq('id', jobId);

    if (error) {
      throw new Error(`Failed to delete print job: ${error.message}`);
    }
  }

  /**
   * Clear completed jobs older than specified days
   */
  async clearCompletedJobs(daysOld: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await supabase
      .from('print_jobs')
      .delete()
      .eq('status', 'completed')
      .lt('created_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      throw new Error(`Failed to clear completed jobs: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Get print queue statistics
   */
  async getQueueStatistics(): Promise<any> {
    const { data, error } = await supabase
      .from('print_queue_status')
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to get queue statistics: ${error.message}`);
    }

    return {
      totalJobs: data.total_jobs || 0,
      queuedJobs: data.queued_jobs || 0,
      processingJobs: data.processing_jobs || 0,
      completedJobs: data.completed_jobs || 0,
      failedJobs: data.failed_jobs || 0,
      retryingJobs: data.retrying_jobs || 0,
      averageProcessingTime: data.avg_processing_time || 0
    };
  }

  /**
   * Update print statistics
   */
  async updatePrintStatistics(
    printerId: string,
    jobStatus: string,
    processingTime?: number
  ): Promise<void> {
    const { error } = await supabase
      .rpc('update_print_statistics', {
        p_printer_id: printerId,
        p_job_status: jobStatus,
        p_processing_time: processingTime
      });

    if (error) {
      throw new Error(`Failed to update print statistics: ${error.message}`);
    }
  }

  /**
   * Archive old completed jobs
   */
  async archiveCompletedJobs(daysOld: number = 30): Promise<number> {
    const { data, error } = await supabase
      .rpc('archive_completed_print_jobs', {
        days_old: daysOld
      });

    if (error) {
      throw new Error(`Failed to archive completed jobs: ${error.message}`);
    }

    return data || 0;
  }

  // Printer Profile Operations

  /**
   * Get all printer profiles
   */
  async getPrinterProfiles(): Promise<PrinterProfile[]> {
    const { data, error } = await supabase
      .from('printer_profiles')
      .select('*')
      .order('name');

    if (error) {
      throw new Error(`Failed to get printer profiles: ${error.message}`);
    }

    return data?.map(profile => this.mapDatabaseProfileToProfile(profile)) || [];
  }

  /**
   * Get printer profile by ID
   */
  async getPrinterProfile(profileId: string): Promise<PrinterProfile | null> {
    const { data, error } = await supabase
      .from('printer_profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get printer profile: ${error.message}`);
    }

    return this.mapDatabaseProfileToProfile(data);
  }

  /**
   * Create printer profile
   */
  async createPrinterProfile(profile: Omit<PrinterProfile, 'id'>): Promise<PrinterProfile> {
    const { data, error } = await supabase
      .from('printer_profiles')
      .insert({
        name: profile.name,
        type: profile.type,
        paper_size: profile.paperSize,
        connection_type: profile.connection,
        device_path: profile.devicePath,
        ip_address: profile.ipAddress,
        port: profile.port,
        is_default: profile.isDefault,
        is_online: profile.isOnline,
        capabilities: profile.capabilities,
        settings: profile.settings
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create printer profile: ${error.message}`);
    }

    return this.mapDatabaseProfileToProfile(data);
  }

  /**
   * Update printer profile
   */
  async updatePrinterProfile(profileId: string, updates: Partial<PrinterProfile>): Promise<PrinterProfile> {
    const updateData: any = {};

    if (updates.name) updateData.name = updates.name;
    if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;
    if (updates.isOnline !== undefined) updateData.is_online = updates.isOnline;
    if (updates.capabilities) updateData.capabilities = updates.capabilities;
    if (updates.settings) updateData.settings = updates.settings;
    if (updates.devicePath) updateData.device_path = updates.devicePath;
    if (updates.ipAddress) updateData.ip_address = updates.ipAddress;
    if (updates.port) updateData.port = updates.port;

    const { data, error } = await supabase
      .from('printer_profiles')
      .update(updateData)
      .eq('id', profileId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update printer profile: ${error.message}`);
    }

    return this.mapDatabaseProfileToProfile(data);
  }

  // Mapping functions
  private mapDatabaseJobToJob(dbJob: any): PrintJob {
    return {
      id: dbJob.id,
      ticketId: dbJob.ticket_id,
      ticketType: dbJob.ticket_type,
      ticketData: dbJob.ticket_data,
      printerProfile: this.mapDatabaseProfileToProfile(dbJob.printer_profile),
      priority: dbJob.priority,
      copies: dbJob.copies,
      status: dbJob.status,
      attempts: dbJob.attempts,
      maxAttempts: dbJob.max_attempts,
      createdAt: new Date(dbJob.created_at),
      updatedAt: new Date(dbJob.updated_at),
      printedAt: dbJob.printed_at ? new Date(dbJob.printed_at) : undefined,
      error: dbJob.error_message,
      retryAt: dbJob.retry_at ? new Date(dbJob.retry_at) : undefined
    };
  }

  private mapDatabaseProfileToProfile(dbProfile: any): PrinterProfile {
    return {
      id: dbProfile.id,
      name: dbProfile.name,
      type: dbProfile.type,
      paperSize: dbProfile.paper_size,
      connection: dbProfile.connection_type,
      devicePath: dbProfile.device_path,
      ipAddress: dbProfile.ip_address,
      port: dbProfile.port,
      isDefault: dbProfile.is_default,
      isOnline: dbProfile.is_online,
      capabilities: dbProfile.capabilities,
      settings: dbProfile.settings
    };
  }
}

export const printJobRepository = new PrintJobRepository();