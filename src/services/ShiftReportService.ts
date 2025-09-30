// =============================================================================
// SHIFT REPORT SERVICE - PDF/EXCEL/CSV EXPORT WITH ANALYTICS
// Automatic report generation with comprehensive formatting
// =============================================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { utils as XLSXUtils, write, writeFile } from 'xlsx';
import html2canvas from 'html2canvas';
import { supabase } from '../lib/supabase';
import { reportService } from './reportGenerationService';
import { reportExportService } from './reportExportService';
import type { ReportGenerationRequest, ReportType } from '../types/reports';

export interface ShiftReportExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  includeCharts: boolean;
  includeVehicleDetails: boolean;
  includeFinancialBreakdown: boolean;
  includeCashReconciliation: boolean;
  includePerformanceMetrics: boolean;
  paperSize?: 'a4' | 'a3' | 'letter';
  orientation?: 'portrait' | 'landscape';
}

export interface ShiftReportData {
  shift_info: {
    shift_id: string;
    employee_id: string;
    employee_name: string;
    shift_start_time: string;
    shift_end_time: string;
    shift_status: string;
    report_period_start: string;
    report_period_end: string;
    shift_duration_hours: number;
    report_period_hours: number;
    shift_notes?: string;
    emergency_reason?: string;
  };
  vehicle_activity: {
    vehicles_entered: number;
    vehicles_exited: number;
    currently_parked: number;
    inherited_exits: number;
    cross_shift_vehicles: number;
    vehicle_entries: Array<{
      vehicle_number: string;
      transport_name?: string;
      driver_name?: string;
      vehicle_type?: string;
      entry_time: string;
      exit_time?: string;
      duration_minutes?: number;
      parking_fee?: number;
      payment_mode?: string;
      payment_status?: string;
      payment_type?: string;
      session_id?: string;
    }>;
    vehicle_exits: Array<{
      vehicle_number: string;
      transport_name?: string;
      driver_name?: string;
      vehicle_type?: string;
      exit_time: string;
      entry_time?: string;
      duration_minutes?: number;
      parking_fee?: number;
      payment_mode?: string;
      payment_status?: string;
      payment_type?: string;
      session_id?: string;
    }>;
    vehicle_type_breakdown: Record<string, number>;
  };
  financial_summary: {
    total_revenue: number;
    cash_revenue: number;
    digital_revenue: number;
    pending_revenue: number;
    failed_revenue: number;
    payment_mode_breakdown: Record<string, number>;
    payment_status_breakdown: Record<string, number>;
  };
  performance_metrics: {
    avg_session_duration_minutes: number;
    vehicles_per_hour: number;
    revenue_per_hour: number;
    avg_transaction_value: number;
    occupancy_efficiency_percent: number;
    peak_hours: {
      peak_entry_hour: number;
      peak_exit_hour: number;
    };
  };
  cash_reconciliation: {
    opening_cash: number;
    closing_cash: number;
    cash_difference: number;
    expected_cash_increase: number;
    cash_variance: number;
  };
  report_metadata: {
    report_generated_at: string;
    report_version: string;
    time_boundary_logic: string;
    includes_cross_shift_data: boolean;
    data_completeness_check: string;
  };
}

// Interface for the report filters expected by ShiftReportsTab
export interface ReportFilters {
  startDate: Date
  endDate: Date
  operatorFilter?: string
  includeAnalytics: boolean
  includeCashReconciliation: boolean
  includeVehicleActivity: boolean
}

// Extended report data interface for the new report generation
export interface ExtendedShiftReportData {
  shifts: Array<{
    id: string
    operatorName: string
    startTime: string
    endTime: string
    durationHours: number
    status: string
  }>
  financialSummary: {
    totalRevenue: number
    cashRevenue: number
    digitalRevenue: number
    pendingRevenue: number
  }
  vehicleActivity: Array<{
    date: string
    sessionsCount: number
    revenue: number
  }>
}

export class ShiftReportService {
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  private formatDateTime(timestamp: string): string {
    return new Date(timestamp).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  private formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  async generateShiftReport(shiftId: string): Promise<ShiftReportData> {
    const { data, error } = await supabase
      .rpc('generate_shift_report', { p_shift_id: shiftId });

    if (error) {
      throw new Error(`Failed to generate shift report: ${error.message}`);
    }

    if (data?.error) {
      throw new Error(`Report generation error: ${data.message}`);
    }

    return data as ShiftReportData;
  }

  async generateAndExportShiftReport(
    shiftId: string,
    options: ShiftReportExportOptions
  ): Promise<{ fileUrl: string; fileName: string }> {
    // Generate comprehensive report data
    const reportData = await this.generateShiftReport(shiftId);

    // Format report based on export type
    switch (options.format) {
      case 'pdf':
        return await this.generatePDFReport(reportData, options);
      case 'excel':
        return await this.generateExcelReport(reportData, options);
      case 'csv':
        return await this.generateCSVReport(reportData, options);
      default:
        throw new Error('Unsupported export format');
    }
  }

  private async generatePDFReport(
    reportData: ShiftReportData,
    options: ShiftReportExportOptions
  ): Promise<{ fileUrl: string; fileName: string }> {
    const doc = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: options.paperSize || 'a4'
    });

    const fileName = `shift-report-${reportData.shift_info.shift_id}-${new Date().toISOString().split('T')[0]}.pdf`;
    let yPos = 20;

    // Header with logo space
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPREHENSIVE SHIFT REPORT', 105, yPos, { align: 'center' });
    yPos += 15;

    // Report metadata
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${this.formatDateTime(reportData.report_metadata.report_generated_at)}`, 20, yPos);
    doc.text(`Report Version: ${reportData.report_metadata.report_version}`, 150, yPos);
    yPos += 15;

    // Shift Information Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SHIFT INFORMATION', 20, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    const shiftInfo = [
      [`Employee:`, reportData.shift_info.employee_name],
      [`Shift Period:`, `${this.formatDateTime(reportData.shift_info.shift_start_time)} - ${this.formatDateTime(reportData.shift_info.shift_end_time)}`],
      [`Duration:`, `${reportData.shift_info.shift_duration_hours} hours`],
      [`Report Period:`, `${this.formatDateTime(reportData.shift_info.report_period_start)} - ${this.formatDateTime(reportData.shift_info.report_period_end)}`],
      [`Status:`, reportData.shift_info.shift_status.toUpperCase()],
    ];

    if (reportData.shift_info.emergency_reason) {
      shiftInfo.push([`Emergency Reason:`, reportData.shift_info.emergency_reason]);
    }

    shiftInfo.forEach(([label, value]) => {
      doc.text(label, 25, yPos);
      doc.text(value, 80, yPos);
      yPos += 7;
    });

    yPos += 10;

    // Financial Summary Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('FINANCIAL SUMMARY', 20, yPos);
    yPos += 10;

    const financialData = [
      ['Revenue Type', 'Amount'],
      ['Total Revenue', this.formatCurrency(reportData.financial_summary.total_revenue)],
      ['Cash Payments', this.formatCurrency(reportData.financial_summary.cash_revenue)],
      ['Digital Payments', this.formatCurrency(reportData.financial_summary.digital_revenue)],
      ['Pending Payments', this.formatCurrency(reportData.financial_summary.pending_revenue)],
      ['Failed/Refunded', this.formatCurrency(reportData.financial_summary.failed_revenue)]
    ];

    autoTable(doc, {
      head: [financialData[0]],
      body: financialData.slice(1),
      startY: yPos,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      margin: { left: 20, right: 20 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Cash Reconciliation (if enabled)
    if (options.includeCashReconciliation) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('CASH RECONCILIATION', 20, yPos);
      yPos += 10;

      const cashData = [
        ['Description', 'Amount'],
        ['Opening Cash', this.formatCurrency(reportData.cash_reconciliation.opening_cash)],
        ['Closing Cash', this.formatCurrency(reportData.cash_reconciliation.closing_cash)],
        ['Cash Difference', this.formatCurrency(reportData.cash_reconciliation.cash_difference)],
        ['Expected Increase', this.formatCurrency(reportData.cash_reconciliation.expected_cash_increase)],
        ['Variance', this.formatCurrency(reportData.cash_reconciliation.cash_variance)]
      ];

      autoTable(doc, {
        head: [cashData[0]],
        body: cashData.slice(1),
        startY: yPos,
        theme: 'striped',
        headStyles: { fillColor: [39, 174, 96] },
        margin: { left: 20, right: 20 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Vehicle Activity Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('VEHICLE ACTIVITY', 20, yPos);
    yPos += 10;

    const vehicleData = [
      ['Activity Type', 'Count'],
      ['Vehicles Entered', reportData.vehicle_activity.vehicles_entered.toString()],
      ['Vehicles Exited', reportData.vehicle_activity.vehicles_exited.toString()],
      ['Currently Parked', reportData.vehicle_activity.currently_parked.toString()],
      ['Cross-Shift Vehicles', reportData.vehicle_activity.cross_shift_vehicles.toString()],
      ['Inherited Exits', reportData.vehicle_activity.inherited_exits.toString()]
    ];

    autoTable(doc, {
      head: [vehicleData[0]],
      body: vehicleData.slice(1),
      startY: yPos,
      theme: 'striped',
      headStyles: { fillColor: [155, 89, 182] },
      margin: { left: 20, right: 20 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Performance Metrics Section
    if (options.includePerformanceMetrics) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('PERFORMANCE METRICS', 20, yPos);
      yPos += 10;

      const performanceData = [
        ['Metric', 'Value'],
        ['Avg Session Duration', `${reportData.performance_metrics.avg_session_duration_minutes} minutes`],
        ['Vehicles per Hour', reportData.performance_metrics.vehicles_per_hour.toString()],
        ['Revenue per Hour', this.formatCurrency(reportData.performance_metrics.revenue_per_hour)],
        ['Avg Transaction Value', this.formatCurrency(reportData.performance_metrics.avg_transaction_value)],
        ['Occupancy Efficiency', `${reportData.performance_metrics.occupancy_efficiency_percent}%`],
        ['Peak Entry Hour', `${reportData.performance_metrics.peak_hours.peak_entry_hour}:00`],
        ['Peak Exit Hour', `${reportData.performance_metrics.peak_hours.peak_exit_hour}:00`]
      ];

      autoTable(doc, {
        head: [performanceData[0]],
        body: performanceData.slice(1),
        startY: yPos,
        theme: 'striped',
        headStyles: { fillColor: [230, 126, 34] },
        margin: { left: 20, right: 20 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Vehicle Details (if enabled and space allows)
    if (options.includeVehicleDetails && reportData.vehicle_activity.vehicle_entries?.length > 0) {
      // Check if we need a new page
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('VEHICLE ENTRY DETAILS', 20, yPos);
      yPos += 10;

      const vehicleEntries = reportData.vehicle_activity.vehicle_entries
        .slice(0, 40) // Limit to first 40 entries for better formatting
        .map(entry => [
          entry.vehicle_number,
          entry.vehicle_type || 'N/A',
          `${entry.transport_name || 'N/A'}${entry.driver_name ? `\n(${entry.driver_name})` : ''}`,
          this.formatTime(entry.entry_time),
          entry.exit_time ? this.formatTime(entry.exit_time) : 'Active',
          this.formatCurrency(entry.parking_fee || 0),
          `${entry.payment_status || 'N/A'}${entry.payment_type ? `\n(${entry.payment_type})` : ''}`
        ]);

      autoTable(doc, {
        head: [['Vehicle #', 'Type', 'Transport/Driver', 'Entry', 'Exit', 'Fee', 'Payment Status']],
        body: vehicleEntries,
        startY: yPos,
        theme: 'striped',
        headStyles: { fillColor: [52, 152, 219] },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 20 }, // Vehicle #
          1: { cellWidth: 15 }, // Type
          2: { cellWidth: 35 }, // Transport/Driver
          3: { cellWidth: 20 }, // Entry
          4: { cellWidth: 20 }, // Exit
          5: { cellWidth: 18 }, // Fee
          6: { cellWidth: 25 }  // Payment Status
        },
        margin: { left: 20, right: 20 }
      });

      if (reportData.vehicle_activity.vehicle_entries.length > 40) {
        doc.setFontSize(10);
        doc.text(`... and ${reportData.vehicle_activity.vehicle_entries.length - 40} more entries`, 20, (doc as any).lastAutoTable.finalY + 10);
      }
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
      doc.text(`Shift Report - ${reportData.shift_info.employee_name}`, 20, 285);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 150, 285);
    }

    // Save PDF
    const pdfBlob = doc.output('blob');
    const fileUrl = await this.uploadReportFile(pdfBlob, fileName);

    return { fileUrl, fileName };
  }

  private async generateExcelReport(
    reportData: ShiftReportData,
    options: ShiftReportExportOptions
  ): Promise<{ fileUrl: string; fileName: string }> {
    const fileName = `shift-report-${reportData.shift_info.shift_id}-${new Date().toISOString().split('T')[0]}.xlsx`;

    // Create workbook with multiple sheets
    const wb = XLSXUtils.book_new();

    // Summary Sheet
    const summaryData = [
      ['SHIFT REPORT SUMMARY', ''],
      ['', ''],
      ['Employee', reportData.shift_info.employee_name],
      ['Shift Start', this.formatDateTime(reportData.shift_info.shift_start_time)],
      ['Shift End', this.formatDateTime(reportData.shift_info.shift_end_time)],
      ['Duration (Hours)', reportData.shift_info.shift_duration_hours],
      ['Status', reportData.shift_info.shift_status],
      ['', ''],
      ['FINANCIAL SUMMARY', ''],
      ['Total Revenue', reportData.financial_summary.total_revenue],
      ['Cash Revenue', reportData.financial_summary.cash_revenue],
      ['Digital Revenue', reportData.financial_summary.digital_revenue],
      ['Pending Revenue', reportData.financial_summary.pending_revenue],
      ['', ''],
      ['VEHICLE ACTIVITY', ''],
      ['Vehicles Entered', reportData.vehicle_activity.vehicles_entered],
      ['Vehicles Exited', reportData.vehicle_activity.vehicles_exited],
      ['Currently Parked', reportData.vehicle_activity.currently_parked],
      ['', ''],
      ['PERFORMANCE METRICS', ''],
      ['Vehicles per Hour', reportData.performance_metrics.vehicles_per_hour],
      ['Revenue per Hour', reportData.performance_metrics.revenue_per_hour],
      ['Avg Transaction Value', reportData.performance_metrics.avg_transaction_value],
      ['Occupancy Efficiency %', reportData.performance_metrics.occupancy_efficiency_percent]
    ];

    const summarySheet = XLSXUtils.aoa_to_sheet(summaryData);
    XLSXUtils.book_append_sheet(wb, summarySheet, 'Summary');

    // Vehicle Entries Sheet
    if (options.includeVehicleDetails && reportData.vehicle_activity.vehicle_entries?.length > 0) {
      const entriesHeader = [
        'Vehicle Number',
        'Vehicle Type',
        'Transport Name',
        'Driver Name',
        'Entry Time',
        'Exit Time',
        'Duration (min)',
        'Parking Fee',
        'Payment Mode',
        'Payment Type',
        'Payment Status',
        'Session ID'
      ];
      const entriesData = reportData.vehicle_activity.vehicle_entries.map(entry => [
        entry.vehicle_number || '',
        entry.vehicle_type || '',
        entry.transport_name || '',
        entry.driver_name || '',
        this.formatDateTime(entry.entry_time),
        entry.exit_time ? this.formatDateTime(entry.exit_time) : 'Active',
        entry.duration_minutes || 0,
        entry.parking_fee || 0,
        entry.payment_mode || '',
        entry.payment_type || '',
        entry.payment_status || '',
        entry.session_id || ''
      ]);

      const entriesSheet = XLSXUtils.aoa_to_sheet([entriesHeader, ...entriesData]);
      XLSXUtils.book_append_sheet(wb, entriesSheet, 'Vehicle Entries');

      // Add Vehicle Exits sheet if exits data exists
      if (reportData.vehicle_activity.vehicle_exits?.length > 0) {
        const exitsHeader = [
          'Vehicle Number',
          'Vehicle Type',
          'Transport Name',
          'Driver Name',
          'Entry Time',
          'Exit Time',
          'Duration (min)',
          'Parking Fee',
          'Payment Mode',
          'Payment Type',
          'Payment Status',
          'Session ID'
        ];
        const exitsData = reportData.vehicle_activity.vehicle_exits.map(exit => [
          exit.vehicle_number || '',
          exit.vehicle_type || '',
          exit.transport_name || '',
          exit.driver_name || '',
          exit.entry_time ? this.formatDateTime(exit.entry_time) : 'N/A',
          this.formatDateTime(exit.exit_time),
          exit.duration_minutes || 0,
          exit.parking_fee || 0,
          exit.payment_mode || '',
          exit.payment_type || '',
          exit.payment_status || '',
          exit.session_id || ''
        ]);

        const exitsSheet = XLSXUtils.aoa_to_sheet([exitsHeader, ...exitsData]);
        XLSXUtils.book_append_sheet(wb, exitsSheet, 'Vehicle Exits');
      }
    }

    // Financial Breakdown Sheet
    if (options.includeFinancialBreakdown) {
      const paymentModes = Object.entries(reportData.financial_summary.payment_mode_breakdown);
      const paymentStatuses = Object.entries(reportData.financial_summary.payment_status_breakdown);

      const financialData = [
        ['PAYMENT MODE BREAKDOWN', ''],
        ...paymentModes.map(([mode, count]) => [mode, count]),
        ['', ''],
        ['PAYMENT STATUS BREAKDOWN', ''],
        ...paymentStatuses.map(([status, count]) => [status, count])
      ];

      const financialSheet = XLSXUtils.aoa_to_sheet(financialData);
      XLSXUtils.book_append_sheet(wb, financialSheet, 'Financial Analysis');
    }

    // Cash Reconciliation Sheet
    if (options.includeCashReconciliation) {
      const cashData = [
        ['CASH RECONCILIATION', ''],
        ['', ''],
        ['Opening Cash', reportData.cash_reconciliation.opening_cash],
        ['Closing Cash', reportData.cash_reconciliation.closing_cash],
        ['Cash Difference', reportData.cash_reconciliation.cash_difference],
        ['Expected Cash Increase', reportData.cash_reconciliation.expected_cash_increase],
        ['Cash Variance', reportData.cash_reconciliation.cash_variance]
      ];

      const cashSheet = XLSXUtils.aoa_to_sheet(cashData);
      XLSXUtils.book_append_sheet(wb, cashSheet, 'Cash Reconciliation');
    }

    // Generate Excel file
    const excelBuffer = XLSXUtils.write(wb, { bookType: 'xlsx', type: 'array' });
    const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileUrl = await this.uploadReportFile(excelBlob, fileName);

    return { fileUrl, fileName };
  }

  private async generateCSVReport(
    reportData: ShiftReportData,
    options: ShiftReportExportOptions
  ): Promise<{ fileUrl: string; fileName: string }> {
    const fileName = `shift-report-${reportData.shift_info.shift_id}-${new Date().toISOString().split('T')[0]}.csv`;

    // Build CSV content
    let csvContent = '';

    // Header information
    csvContent += 'SHIFT REPORT\n';
    csvContent += `Employee,${reportData.shift_info.employee_name}\n`;
    csvContent += `Shift Start,${this.formatDateTime(reportData.shift_info.shift_start_time)}\n`;
    csvContent += `Shift End,${this.formatDateTime(reportData.shift_info.shift_end_time)}\n`;
    csvContent += `Duration Hours,${reportData.shift_info.shift_duration_hours}\n`;
    csvContent += `Status,${reportData.shift_info.shift_status}\n\n`;

    // Financial Summary
    csvContent += 'FINANCIAL SUMMARY\n';
    csvContent += `Total Revenue,${reportData.financial_summary.total_revenue}\n`;
    csvContent += `Cash Revenue,${reportData.financial_summary.cash_revenue}\n`;
    csvContent += `Digital Revenue,${reportData.financial_summary.digital_revenue}\n`;
    csvContent += `Pending Revenue,${reportData.financial_summary.pending_revenue}\n\n`;

    // Vehicle Activity
    csvContent += 'VEHICLE ACTIVITY\n';
    csvContent += `Vehicles Entered,${reportData.vehicle_activity.vehicles_entered}\n`;
    csvContent += `Vehicles Exited,${reportData.vehicle_activity.vehicles_exited}\n`;
    csvContent += `Currently Parked,${reportData.vehicle_activity.currently_parked}\n\n`;

    // Vehicle Details
    if (options.includeVehicleDetails && reportData.vehicle_activity.vehicle_entries?.length > 0) {
      csvContent += 'VEHICLE ENTRIES\n';
      csvContent += 'Vehicle Number,Vehicle Type,Transport Name,Driver Name,Entry Time,Exit Time,Duration Minutes,Parking Fee,Payment Mode,Payment Type,Payment Status,Session ID\n';

      reportData.vehicle_activity.vehicle_entries.forEach(entry => {
        csvContent += `"${entry.vehicle_number || ''}",`;
        csvContent += `"${entry.vehicle_type || ''}",`;
        csvContent += `"${entry.transport_name || ''}",`;
        csvContent += `"${entry.driver_name || ''}",`;
        csvContent += `"${this.formatDateTime(entry.entry_time)}",`;
        csvContent += `"${entry.exit_time ? this.formatDateTime(entry.exit_time) : 'Active'}",`;
        csvContent += `${entry.duration_minutes || 0},`;
        csvContent += `${entry.parking_fee || 0},`;
        csvContent += `"${entry.payment_mode || ''}",`;
        csvContent += `"${entry.payment_type || ''}",`;
        csvContent += `"${entry.payment_status || ''}",`;
        csvContent += `"${entry.session_id || ''}"\n`;
      });
      csvContent += '\n';

      // Add vehicle exits section if data exists
      if (reportData.vehicle_activity.vehicle_exits?.length > 0) {
        csvContent += 'VEHICLE EXITS\n';
        csvContent += 'Vehicle Number,Vehicle Type,Transport Name,Driver Name,Entry Time,Exit Time,Duration Minutes,Parking Fee,Payment Mode,Payment Type,Payment Status,Session ID\n';

        reportData.vehicle_activity.vehicle_exits.forEach(exit => {
          csvContent += `"${exit.vehicle_number || ''}",`;
          csvContent += `"${exit.vehicle_type || ''}",`;
          csvContent += `"${exit.transport_name || ''}",`;
          csvContent += `"${exit.driver_name || ''}",`;
          csvContent += `"${exit.entry_time ? this.formatDateTime(exit.entry_time) : 'N/A'}",`;
          csvContent += `"${this.formatDateTime(exit.exit_time)}",`;
          csvContent += `${exit.duration_minutes || 0},`;
          csvContent += `${exit.parking_fee || 0},`;
          csvContent += `"${exit.payment_mode || ''}",`;
          csvContent += `"${exit.payment_type || ''}",`;
          csvContent += `"${exit.payment_status || ''}",`;
          csvContent += `"${exit.session_id || ''}"\n`;
        });
      }
    }

    // Create blob and upload
    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileUrl = await this.uploadReportFile(csvBlob, fileName);

    return { fileUrl, fileName };
  }

  private async uploadReportFile(blob: Blob, fileName: string): Promise<string> {
    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('shift-reports')
      .upload(`reports/${fileName}`, blob, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Failed to upload report file: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from('shift-reports')
      .getPublicUrl(`reports/${fileName}`);

    return publicUrl.publicUrl;
  }

  // Generate quick summary for real-time display
  async generateQuickSummary(shiftId: string): Promise<any> {
    const reportData = await this.generateShiftReport(shiftId);

    return {
      shift_id: reportData.shift_info.shift_id,
      employee_name: reportData.shift_info.employee_name,
      shift_duration_hours: reportData.shift_info.shift_duration_hours,
      total_revenue: reportData.financial_summary.total_revenue,
      vehicles_processed: reportData.vehicle_activity.vehicles_entered,
      performance_score: Math.round(reportData.performance_metrics.occupancy_efficiency_percent),
      cash_variance: reportData.cash_reconciliation.cash_variance,
      generated_at: reportData.report_metadata.report_generated_at
    };
  }

  // Get available operators for report filtering
  async getAvailableOperators(): Promise<Array<{ id: string; name: string }>> {
    try {
      // First, get unique user_ids from shift_sessions
      const { data: sessionData, error: sessionError } = await supabase
        .from('shift_sessions')
        .select('user_id')
        .not('user_id', 'is', null);

      if (sessionError) {
        console.error('Error fetching shift sessions:', sessionError);
        return [];
      }

      // Get unique user IDs
      const uniqueUserIds = [...new Set(sessionData?.map(session => session.user_id) || [])];

      if (uniqueUserIds.length === 0) {
        return [];
      }

      // Fetch user details for these user IDs
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, role')
        .in('id', uniqueUserIds);

      if (userError) {
        console.error('Error fetching user data:', userError);
        return [];
      }

      // Transform user data for return
      return userData?.map(user => ({
        id: user.id,
        name: `User ${user.id.substring(0, 8)}`,
        role: user.role
      })).sort((a, b) => a.name.localeCompare(b.name)) || [];

    } catch (error) {
      console.error('Error in getAvailableOperators:', error);
      return [];
    }
  }

  // Get available shift periods for filtering
  async getAvailableShiftPeriods(): Promise<Array<{ id: string; start_time: string; end_time: string; employee_name: string }>> {
    try {
      // First, get shift sessions
      const { data: shiftData, error: shiftError } = await supabase
        .from('shift_sessions')
        .select('id, start_time, end_time, user_id, status')
        .order('start_time', { ascending: false })
        .limit(50);

      if (shiftError) {
        console.error('Error fetching shift periods:', shiftError);
        return [];
      }

      if (!shiftData || shiftData.length === 0) {
        return [];
      }

      // Get unique user IDs from the shifts
      const uniqueUserIds = [...new Set(shiftData.map(shift => shift.user_id).filter(id => id !== null))];

      // Fetch user details if we have user IDs
      let userMap = new Map();
      if (uniqueUserIds.length > 0) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .in('id', uniqueUserIds);

        if (userError) {
          console.error('Error fetching user data:', userError);
        } else {
          userData?.forEach(user => {
            userMap.set(user.id, user);
          });
        }
      }

      // Combine shift data with user data
      return shiftData.map(shift => ({
        id: shift.id,
        start_time: shift.start_time,
        end_time: shift.end_time || 'Active',
        employee_name: shift.user_id && userMap.has(shift.user_id)
          ? `User ${shift.user_id.substring(0, 8)}`
          : 'Unknown',
        status: shift.status
      }));

    } catch (error) {
      console.error('Error in getAvailableShiftPeriods:', error);
      return [];
    }
  }

  // Static methods expected by ShiftReportsTab component
  static async getAvailableOperators(): Promise<string[]> {
    try {
      const service = new ShiftReportService();
      const operators = await service.getAvailableOperators();
      return operators.map(op => op.name);
    } catch (error) {
      console.error('Error in static getAvailableOperators:', error);
      return [];
    }
  }

  static async generateReport(filters: ReportFilters): Promise<ExtendedShiftReportData> {
    try {
      // First, query shift sessions within the date range
      const { data: shifts, error } = await supabase
        .from('shift_sessions')
        .select(`
          id,
          start_time,
          end_time,
          status,
          total_revenue,
          cash_collected,
          digital_collected,
          user_id
        `)
        .gte('start_time', filters.startDate.toISOString())
        .lte('start_time', filters.endDate.toISOString())
        .order('start_time', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch shifts: ${error.message}`);
      }

      if (!shifts || shifts.length === 0) {
        return {
          shifts: [],
          financialSummary: {
            totalRevenue: 0,
            cashRevenue: 0,
            digitalRevenue: 0,
            pendingRevenue: 0
          },
          vehicleActivity: []
        };
      }

      // Get unique user IDs from the shifts
      const uniqueUserIds = [...new Set(shifts.map(shift => shift.user_id).filter(id => id !== null))];

      // Fetch user details if we have user IDs
      let userMap = new Map();
      if (uniqueUserIds.length > 0) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .in('id', uniqueUserIds);

        if (userError) {
          console.error('Error fetching user data:', userError);
        } else {
          userData?.forEach(user => {
            userMap.set(user.id, user);
          });
        }
      }

      // Combine shift data with user data and filter by operator if specified
      const allShiftsWithUsers = shifts.map(shift => ({
        ...shift,
        userEmail: shift.user_id || null,
        operatorName: shift.user_id && userMap.has(shift.user_id)
          ? `User ${shift.user_id.substring(0, 8)}`
          : 'Unknown'
      }));

      // Filter by operator if specified
      const filteredShifts = filters.operatorFilter
        ? allShiftsWithUsers.filter(shift => shift.operatorName === filters.operatorFilter)
        : allShiftsWithUsers;

      // Transform shifts data
      const transformedShifts = filteredShifts.map(shift => ({
        id: shift.id,
        operatorName: shift.operatorName,
        startTime: shift.start_time,
        endTime: shift.end_time || 'Active',
        durationHours: shift.end_time
          ? Math.round((new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) / (1000 * 60 * 60) * 10) / 10
          : 0,
        status: shift.status
      }));

      // Calculate financial summary
      const financialSummary = {
        totalRevenue: filteredShifts.reduce((sum, shift) => sum + (shift.total_revenue || 0), 0),
        cashRevenue: filteredShifts.reduce((sum, shift) => sum + (shift.cash_collected || 0), 0),
        digitalRevenue: filteredShifts.reduce((sum, shift) => sum + (shift.digital_collected || 0), 0),
        pendingRevenue: 0 // Would need additional query for pending payments
      };

      // Generate vehicle activity summary (simplified - one entry per shift)
      const vehicleActivity = transformedShifts.map(shift => ({
        date: shift.startTime.split('T')[0],
        sessionsCount: 0, // Would need additional query to parking_sessions
        revenue: financialSummary.totalRevenue / transformedShifts.length || 0
      }));

      return {
        shifts: transformedShifts,
        financialSummary,
        vehicleActivity
      };
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  static async generatePDFReport(filters: ReportFilters, filename: string): Promise<string> {
    try {
      // Generate report data directly
      const reportData = await this.generateReport(filters);

      // Create PDF using jsPDF
      const doc = new jsPDF();

      // Document metadata
      doc.setProperties({
        title: 'Shift Report - PDF Export',
        subject: 'Parking Management Shift Report',
        author: 'Parking Management System',
        creator: 'Parking Management System'
      });

      // Header
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text('Parking Management - Shift Report', 20, 30);

      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text(`Period: ${filters.startDate.toLocaleDateString()} - ${filters.endDate.toLocaleDateString()}`, 20, 45);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 55);

      let yPos = 75;

      // Summary section
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Financial Summary', 20, yPos);
      yPos += 20;

      const summaryData = [
        ['Total Revenue', `₹${reportData.financialSummary.totalRevenue.toFixed(2)}`],
        ['Cash Revenue', `₹${reportData.financialSummary.cashRevenue.toFixed(2)}`],
        ['Digital Revenue', `₹${reportData.financialSummary.digitalRevenue.toFixed(2)}`],
        ['Pending Revenue', `₹${reportData.financialSummary.pendingRevenue.toFixed(2)}`],
        ['Total Shifts', reportData.shifts.length.toString()]
      ];

      // Add summary table
      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [66, 139, 202] }
      });

      yPos = (doc as any).lastAutoTable.finalY + 20;

      // Shifts details if space allows
      if (reportData.shifts && reportData.shifts.length > 0) {
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Shift Details', 20, yPos);
        yPos += 10;

        const shiftData = reportData.shifts.slice(0, 20).map(shift => [
          shift.id.substring(0, 8),
          shift.operatorName,
          new Date(shift.startTime).toLocaleString(),
          shift.endTime === 'Active' ? 'Active' : new Date(shift.endTime).toLocaleString(),
          `${shift.durationHours}h`,
          shift.status
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Shift ID', 'Operator', 'Start Time', 'End Time', 'Duration', 'Status']],
          body: shiftData,
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [66, 139, 202] }
        });
      }

      // Generate blob and trigger download
      const pdfBlob = doc.output('blob');
      const downloadUrl = URL.createObjectURL(pdfBlob);

      // Trigger immediate download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || `shift-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL after short delay
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

      return downloadUrl;
    } catch (error) {
      console.error('Error generating PDF report:', error);
      throw error;
    }
  }

  static async generateExcelReport(filters: ReportFilters, filename: string): Promise<string> {
    try {
      // Generate report data directly
      const reportData = await this.generateReport(filters);

      // Create workbook
      const wb = XLSXUtils.book_new();

      // Summary sheet
      const summaryData = [
        ['Parking Management - Shift Report'],
        [`Period: ${filters.startDate.toLocaleDateString()} - ${filters.endDate.toLocaleDateString()}`],
        [`Generated: ${new Date().toLocaleString()}`],
        [],
        ['Financial Summary'],
        ['Metric', 'Value'],
        ['Total Revenue', reportData.financialSummary.totalRevenue],
        ['Cash Revenue', reportData.financialSummary.cashRevenue],
        ['Digital Revenue', reportData.financialSummary.digitalRevenue],
        ['Pending Revenue', reportData.financialSummary.pendingRevenue],
        ['Total Shifts', reportData.shifts.length]
      ];

      const summaryWs = XLSXUtils.aoa_to_sheet(summaryData);
      XLSXUtils.book_append_sheet(wb, summaryWs, 'Summary');

      // Shifts sheet
      if (reportData.shifts && reportData.shifts.length > 0) {
        const shiftHeaders = ['Shift ID', 'Operator', 'Start Time', 'End Time', 'Duration (Hours)', 'Status'];
        const shiftData = [
          shiftHeaders,
          ...reportData.shifts.map(shift => [
            shift.id,
            shift.operatorName,
            new Date(shift.startTime).toLocaleString(),
            shift.endTime === 'Active' ? 'Active' : new Date(shift.endTime).toLocaleString(),
            shift.durationHours,
            shift.status
          ])
        ];

        const shiftWs = XLSXUtils.aoa_to_sheet(shiftData);
        XLSXUtils.book_append_sheet(wb, shiftWs, 'Shifts');
      }

      // Vehicle activity sheet
      if (reportData.vehicleActivity && reportData.vehicleActivity.length > 0) {
        const activityHeaders = ['Date', 'Sessions Count', 'Revenue'];
        const activityData = [
          activityHeaders,
          ...reportData.vehicleActivity.map(activity => [
            activity.date,
            activity.sessionsCount,
            activity.revenue
          ])
        ];

        const activityWs = XLSXUtils.aoa_to_sheet(activityData);
        XLSXUtils.book_append_sheet(wb, activityWs, 'Vehicle Activity');
      }

      // Generate blob and trigger download
      const excelBuffer = write(wb, { bookType: 'xlsx', type: 'array' });
      const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const downloadUrl = URL.createObjectURL(excelBlob);

      // Trigger immediate download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || `shift-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL after short delay
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

      return downloadUrl;
    } catch (error) {
      console.error('Error generating Excel report:', error);
      throw error;
    }
  }

  static async generateCSVReport(filters: ReportFilters, filename: string): Promise<string> {
    try {
      // Generate report data directly
      const reportData = await this.generateReport(filters);

      // Create CSV content
      let csvContent = '';

      // Header
      csvContent += `Parking Management - Shift Report\n`;
      csvContent += `Period: ${filters.startDate.toLocaleDateString()} - ${filters.endDate.toLocaleDateString()}\n`;
      csvContent += `Generated: ${new Date().toLocaleString()}\n`;
      csvContent += `\n`;

      // Financial Summary
      csvContent += `Financial Summary\n`;
      csvContent += `Metric,Value\n`;
      csvContent += `Total Revenue,${reportData.financialSummary.totalRevenue}\n`;
      csvContent += `Cash Revenue,${reportData.financialSummary.cashRevenue}\n`;
      csvContent += `Digital Revenue,${reportData.financialSummary.digitalRevenue}\n`;
      csvContent += `Pending Revenue,${reportData.financialSummary.pendingRevenue}\n`;
      csvContent += `Total Shifts,${reportData.shifts.length}\n`;
      csvContent += `\n`;

      // Shifts data
      if (reportData.shifts && reportData.shifts.length > 0) {
        csvContent += `Shift Details\n`;
        csvContent += `Shift ID,Operator,Start Time,End Time,Duration Hours,Status\n`;

        reportData.shifts.forEach(shift => {
          const startTime = new Date(shift.startTime).toLocaleString();
          const endTime = shift.endTime === 'Active' ? 'Active' : new Date(shift.endTime).toLocaleString();
          csvContent += `${shift.id},"${shift.operatorName}","${startTime}","${endTime}",${shift.durationHours},${shift.status}\n`;
        });
        csvContent += `\n`;
      }

      // Vehicle activity data
      if (reportData.vehicleActivity && reportData.vehicleActivity.length > 0) {
        csvContent += `Vehicle Activity\n`;
        csvContent += `Date,Sessions Count,Revenue\n`;

        reportData.vehicleActivity.forEach(activity => {
          csvContent += `${activity.date},${activity.sessionsCount},${activity.revenue}\n`;
        });
      }

      // Create blob and trigger download
      const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = URL.createObjectURL(csvBlob);

      // Trigger immediate download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || `shift-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL after short delay
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

      return downloadUrl;
    } catch (error) {
      console.error('Error generating CSV report:', error);
      throw error;
    }
  }
}