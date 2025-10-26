// =============================================================================
// REPORT EXPORT API ENDPOINTS - FILE MANAGEMENT & DOWNLOAD SYSTEM
// Comprehensive API for shift report generation, export, and file management
// =============================================================================

import { supabase } from '../lib/supabase';
import { ShiftReportService, ShiftReportExportOptions } from '../services/ShiftReportService';
import { ReportAnalyticsService, AnalyticsTimeRange } from '../services/ReportAnalyticsService';
import { log } from '../utils/secureLogger';

export interface ReportGenerationRequest {
  shift_id: string;
  export_options: ShiftReportExportOptions;
  user_id: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface ReportGenerationResponse {
  success: boolean;
  message: string;
  report_id?: string;
  file_url?: string;
  file_name?: string;
  estimated_completion_time?: string;
  queue_position?: number;
}

export interface AnalyticsRequest {
  time_range: AnalyticsTimeRange;
  export_format?: 'json' | 'pdf' | 'excel';
  include_charts?: boolean;
}

export interface FileDownloadResponse {
  success: boolean;
  download_url: string;
  file_name: string;
  file_size: number;
  expires_at: string;
  download_count: number;
}

export class ReportsAPI {
  private reportService = new ShiftReportService();
  private analyticsService = new ReportAnalyticsService();

  /**
   * Generate and export shift report
   */
  async generateShiftReport(request: ReportGenerationRequest): Promise<ReportGenerationResponse> {
    try {
      // Validate request
      if (!request.shift_id || !request.export_options || !request.user_id) {
        return {
          success: false,
          message: 'Missing required fields: shift_id, export_options, or user_id'
        };
      }

      // Check if shift exists
      const { data: shift, error: shiftError } = await supabase
        .from('shift_sessions')
        .select('id, status, employee_id')
        .eq('id', request.shift_id)
        .single();

      if (shiftError || !shift) {
        return {
          success: false,
          message: 'Shift not found or access denied'
        };
      }

      // Check if report already exists and is recent
      const { data: existingReport } = await supabase
        .from('shift_reports')
        .select('id, generated_at, report_data')
        .eq('shift_session_id', request.shift_id)
        .single();

      // If report exists and is less than 1 hour old, use cached version for non-urgent requests
      if (existingReport && request.priority !== 'urgent') {
        const reportAge = new Date().getTime() - new Date(existingReport.generated_at).getTime();
        const oneHour = 60 * 60 * 1000;

        if (reportAge < oneHour) {
          // Generate file from cached report
          const cachedResult = await this.reportService.generateAndExportShiftReport(
            request.shift_id,
            request.export_options
          );

          return {
            success: true,
            message: 'Report generated from cached data',
            file_url: cachedResult.fileUrl,
            file_name: cachedResult.fileName
          };
        }
      }

      // Queue report for generation
      const { data: queueResult } = await supabase
        .rpc('queue_shift_report', {
          p_shift_id: request.shift_id,
          p_priority: request.priority || 'normal'
        });

      if (!queueResult?.success) {
        return {
          success: false,
          message: queueResult?.message || 'Failed to queue report generation'
        };
      }

      // Get queue position
      const { data: queueStatus } = await supabase
        .rpc('get_report_queue_status');

      const queuePosition = queueStatus?.queue_details?.findIndex(
        (item: any) => item.shift_id === request.shift_id
      ) + 1 || 0;

      // Estimate completion time based on queue position
      const estimatedMinutes = Math.max(1, queuePosition * 2); // 2 minutes per report
      const estimatedCompletion = new Date(Date.now() + estimatedMinutes * 60000).toISOString();

      // Log report request
      await this.logReportRequest(request);

      return {
        success: true,
        message: 'Report queued for generation',
        report_id: request.shift_id,
        estimated_completion_time: estimatedCompletion,
        queue_position: queuePosition
      };

    } catch (error) {
      log.error('Error generating shift report', error);
      return {
        success: false,
        message: `Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get report generation status
   */
  async getReportStatus(shiftId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    file_url?: string;
    file_name?: string;
    error_message?: string;
    estimated_completion?: string;
  }> {
    try {
      // Check queue status
      const { data: queueItem } = await supabase
        .from('shift_report_queue')
        .select('status, error_message, completed_at, started_at')
        .eq('shift_session_id', shiftId)
        .single();

      if (!queueItem) {
        // Check if report already exists
        const { data: report } = await supabase
          .from('shift_reports')
          .select('generated_at')
          .eq('shift_session_id', shiftId)
          .single();

        return {
          status: report ? 'completed' : 'pending'
        };
      }

      // Calculate progress for processing status
      let progress = 0;
      if (queueItem.status === 'processing' && queueItem.started_at) {
        const elapsed = new Date().getTime() - new Date(queueItem.started_at).getTime();
        const estimatedTotal = 2 * 60 * 1000; // 2 minutes estimated
        progress = Math.min(90, (elapsed / estimatedTotal) * 100);
      } else if (queueItem.status === 'completed') {
        progress = 100;
      }

      // Get file URLs if completed
      let fileUrl, fileName;
      if (queueItem.status === 'completed') {
        // Files would be in Supabase storage
        const { data: files } = await supabase.storage
          .from('shift-reports')
          .list(`reports/`, {
            search: `shift-report-${shiftId}`
          });

        if (files && files.length > 0) {
          fileName = files[0].name;
          const { data: urlData } = supabase.storage
            .from('shift-reports')
            .getPublicUrl(`reports/${fileName}`);
          fileUrl = urlData.publicUrl;
        }
      }

      return {
        status: queueItem.status,
        progress,
        file_url: fileUrl,
        file_name: fileName,
        error_message: queueItem.error_message,
        estimated_completion: queueItem.status === 'processing'
          ? new Date(Date.now() + (100 - progress) * 1200).toISOString() // 20 seconds per percent
          : undefined
      };

    } catch (error) {
      log.error('Error getting report status', error);
      return {
        status: 'failed',
        error_message: 'Failed to get report status'
      };
    }
  }

  /**
   * Generate comprehensive analytics report
   */
  async generateAnalyticsReport(request: AnalyticsRequest): Promise<{
    success: boolean;
    data?: any;
    file_url?: string;
    file_name?: string;
    message: string;
  }> {
    try {
      // Generate analytics data
      const analytics = await this.analyticsService.generateComprehensiveAnalytics(
        request.time_range
      );

      // Return JSON by default
      if (!request.export_format || request.export_format === 'json') {
        return {
          success: true,
          data: analytics,
          message: 'Analytics generated successfully'
        };
      }

      // Export to file format
      const fileName = `analytics-report-${request.time_range.start}-${request.time_range.end}-${Date.now()}`;

      if (request.export_format === 'pdf') {
        const pdfData = await this.exportAnalyticsToPDF(analytics, request.include_charts);
        const fileUrl = await this.uploadFile(pdfData, `${fileName}.pdf`, 'application/pdf');

        return {
          success: true,
          file_url: fileUrl,
          file_name: `${fileName}.pdf`,
          message: 'Analytics exported to PDF successfully'
        };
      }

      if (request.export_format === 'excel') {
        const excelData = await this.exportAnalyticsToExcel(analytics);
        const fileUrl = await this.uploadFile(excelData, `${fileName}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        return {
          success: true,
          file_url: fileUrl,
          file_name: `${fileName}.xlsx`,
          message: 'Analytics exported to Excel successfully'
        };
      }

      return {
        success: false,
        message: 'Unsupported export format'
      };

    } catch (error) {
      log.error('Error generating analytics report', error);
      return {
        success: false,
        message: `Analytics generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Download report file with access control
   */
  async downloadReportFile(
    fileId: string,
    userId: string
  ): Promise<FileDownloadResponse> {
    try {
      // Verify user access to file
      const hasAccess = await this.verifyFileAccess(fileId, userId);
      if (!hasAccess) {
        throw new Error('Access denied to requested file');
      }

      // Get file information
      const { data: fileInfo, error } = await supabase
        .from('report_files')
        .select('*')
        .eq('id', fileId)
        .single();

      if (error || !fileInfo) {
        throw new Error('File not found');
      }

      // Check file expiration
      if (fileInfo.expires_at && new Date(fileInfo.expires_at) < new Date()) {
        throw new Error('File has expired');
      }

      // Generate secure download URL
      const { data: urlData } = supabase.storage
        .from('shift-reports')
        .createSignedUrl(fileInfo.storage_path, 3600); // 1 hour expiry

      if (!urlData?.signedUrl) {
        throw new Error('Failed to generate download URL');
      }

      // Update download count
      await supabase
        .from('report_files')
        .update({
          download_count: fileInfo.download_count + 1,
          last_downloaded_at: new Date().toISOString()
        })
        .eq('id', fileId);

      return {
        success: true,
        download_url: urlData.signedUrl,
        file_name: fileInfo.original_name,
        file_size: fileInfo.file_size,
        expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        download_count: fileInfo.download_count + 1
      };

    } catch (error) {
      log.error('Error downloading file', error);
      throw error;
    }
  }

  /**
   * List available reports for user
   */
  async listUserReports(
    userId: string,
    filters?: {
      date_from?: string;
      date_to?: string;
      report_type?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    try {
      let query = supabase
        .from('report_files')
        .select(`
          id,
          original_name,
          file_type,
          file_size,
          created_at,
          expires_at,
          download_count,
          metadata
        `)
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      if (filters?.report_type) {
        query = query.eq('report_type', filters.report_type);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        reports: data || [],
        total: data?.length || 0
      };

    } catch (error) {
      log.error('Error listing user reports', error);
      return {
        success: false,
        message: `Failed to list reports: ${error instanceof Error ? error.message : 'Unknown error'}`,
        reports: [],
        total: 0
      };
    }
  }

  /**
   * Delete report file
   */
  async deleteReportFile(fileId: string, userId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Verify user owns the file
      const { data: fileInfo } = await supabase
        .from('report_files')
        .select('storage_path, created_by')
        .eq('id', fileId)
        .single();

      if (!fileInfo || fileInfo.created_by !== userId) {
        return {
          success: false,
          message: 'File not found or access denied'
        };
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('shift-reports')
        .remove([fileInfo.storage_path]);

      if (storageError) {
        log.error('Error deleting from storage', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('report_files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      return {
        success: true,
        message: 'File deleted successfully'
      };

    } catch (error) {
      log.error('Error deleting report file', error);
      return {
        success: false,
        message: `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get report generation queue status
   */
  async getQueueStatus() {
    try {
      const { data } = await supabase
        .rpc('get_report_queue_status');

      return {
        success: true,
        queue_status: data
      };

    } catch (error) {
      log.error('Error getting queue status', error);
      return {
        success: false,
        message: 'Failed to get queue status'
      };
    }
  }

  /**
   * Process report queue (admin function)
   */
  async processReportQueue(): Promise<{
    success: boolean;
    processed_count: number;
    failed_count: number;
    message: string;
  }> {
    try {
      const { data } = await supabase
        .rpc('process_shift_report_queue');

      return {
        success: true,
        processed_count: data?.processed_count || 0,
        failed_count: data?.failed_count || 0,
        message: `Processed ${data?.processed_count || 0} reports, ${data?.failed_count || 0} failed`
      };

    } catch (error) {
      log.error('Error processing report queue', error);
      return {
        success: false,
        processed_count: 0,
        failed_count: 0,
        message: `Queue processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Private helper methods
  private async logReportRequest(request: ReportGenerationRequest) {
    try {
      await supabase
        .from('report_requests')
        .insert({
          shift_id: request.shift_id,
          user_id: request.user_id,
          export_options: request.export_options,
          priority: request.priority || 'normal',
          status: 'queued',
          requested_at: new Date().toISOString()
        });
    } catch (error) {
      log.error('Error logging report request', error);
    }
  }

  private async verifyFileAccess(fileId: string, userId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('report_files')
        .select('created_by, is_public')
        .eq('id', fileId)
        .single();

      return data?.created_by === userId || data?.is_public === true;
    } catch (error) {
      log.error('Error verifying file access', error);
      return false;
    }
  }

  private async uploadFile(data: Blob, fileName: string, contentType: string): Promise<string> {
    const { data: uploadData, error } = await supabase.storage
      .from('shift-reports')
      .upload(`reports/${fileName}`, data, {
        contentType,
        cacheControl: '3600'
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('shift-reports')
      .getPublicUrl(`reports/${fileName}`);

    return urlData.publicUrl;
  }

  private async exportAnalyticsToPDF(analytics: any, includeCharts?: boolean): Promise<Blob> {
    // This would implement PDF export for analytics
    // For now, returning a placeholder
    return new Blob(['Analytics PDF content'], { type: 'application/pdf' });
  }

  private async exportAnalyticsToExcel(analytics: any): Promise<Blob> {
    // This would implement Excel export for analytics
    // For now, returning a placeholder
    return new Blob(['Analytics Excel content'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
}

// Export singleton instance
export const reportsAPI = new ReportsAPI();