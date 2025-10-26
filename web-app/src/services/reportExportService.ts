// Report Export Service with Parking Sessions Support

import { format } from 'date-fns'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { log } from '../utils/secureLogger'

// Create extended jsPDF type
type ExtendedJsPDF = jsPDF & {
  lastAutoTable?: {
    finalY: number
  }
}

import type {
  ReportGenerationResponse,
  ExportConfig,
  ExportResult,
  ReportType,
  DateBoundary,
  DailyReportContent,
  WeeklyReportContent,
  MonthlyReportContent,
  CustomReportContent
} from '../types/reports'

import type { ParkingEntry } from '../types'

class ReportExportService {
  /**
   * === FILENAME CONVENTIONS ===
   */
  generateFileName(reportType: ReportType, dateRange: DateBoundary, exportFormat: string, customName?: string): string {
    if (customName) {
      return `${customName}.${exportFormat}`
    }

    const startDate = format(dateRange.startDate, 'yyyy-MM-dd')
    const endDate = format(dateRange.endDate, 'yyyy-MM-dd')

    switch (reportType) {
      case 'daily':
        return `Parking_Report_Daily_${startDate}.${exportFormat}`

      case 'weekly':
        const weekNumber = format(dateRange.startDate, 'ww')
        const year = format(dateRange.startDate, 'yyyy')
        return `Parking_Report_Weekly_${year}-${weekNumber.padStart(2, '0')}.${exportFormat}`

      case 'monthly':
        const monthYear = format(dateRange.startDate, 'yyyy-MM')
        return `Parking_Report_Monthly_${monthYear}.${exportFormat}`

      case 'custom':
        return `Parking_Report_Custom_${startDate}_${endDate}.${exportFormat}`

      default:
        return `Parking_Report_${startDate}_${endDate}.${exportFormat}`
    }
  }

  /**
   * === MAIN EXPORT METHOD ===
   */
  async exportReport(
    report: ReportGenerationResponse,
    config: ExportConfig
  ): Promise<ExportResult> {
    try {
      const fileName = this.generateFileName(
        report.reportType,
        report.dateRange,
        config.format,
        config.customFileName
      )

      switch (config.format) {
        case 'pdf':
          return await this.exportToPDF(report, config, fileName)
        case 'excel':
          return await this.exportToExcel(report, config, fileName)
        case 'csv':
          return await this.exportToCSV(report, config, fileName)
        default:
          throw new Error(`Unsupported export format: ${config.format}`)
      }
    } catch (error) {
      return {
        success: false,
        fileName: '',
        error: error instanceof Error ? error.message : 'Export failed'
      }
    }
  }

  /**
   * === PDF EXPORT IMPLEMENTATION ===
   */
  private async exportToPDF(
    report: ReportGenerationResponse,
    config: ExportConfig,
    fileName: string
  ): Promise<ExportResult> {
    const doc = new jsPDF() as ExtendedJsPDF

    // Document metadata
    doc.setProperties({
      title: `Parking Report - ${report.reportType}`,
      subject: `Parking Management Report`,
      author: 'Parking Management System',
      creator: 'Parking Management System'
    })

    let yPosition = 20

    // Header
    doc.setFontSize(20)
    doc.setFont(undefined, 'bold')
    doc.text(`${report.reportType.toUpperCase()} PARKING REPORT`, 20, yPosition)
    yPosition += 10

    doc.setFontSize(12)
    doc.setFont(undefined, 'normal')
    doc.text(
      `Period: ${format(report.dateRange.startDate, 'MMMM d, yyyy')} - ${format(report.dateRange.endDate, 'MMMM d, yyyy')}`,
      20,
      yPosition
    )
    yPosition += 10

    doc.text(`Generated: ${format(report.generatedAt, 'MMMM d, yyyy \'at\' h:mm a')}`, 20, yPosition)
    yPosition += 20

    // Get parking entries from report data
    const reportData = report.data as any
    const parkingEntries: ParkingEntry[] = reportData.entries || reportData.sessions || []

    log.debug('PDF Export - Parking entries', {
      totalEntries: parkingEntries.length,
      reportType: report.reportType,
      dataKeys: Object.keys(reportData)
    })

    // Add summary section
    yPosition = this.addSummarySection(doc, reportData, yPosition)

    // Add parking sessions table (THIS IS WHAT USER WANTS!)
    if (parkingEntries && parkingEntries.length > 0) {
      yPosition = this.addParkingSessionsTable(doc, parkingEntries, yPosition)
    } else {
      // If no entries, show message
      doc.setFontSize(12)
      doc.setFont(undefined, 'italic')
      doc.text('No parking sessions found for this period', 20, yPosition)
      yPosition += 20
    }

    // Generate blob and return
    const pdfBlob = doc.output('blob')
    const downloadUrl = URL.createObjectURL(pdfBlob)

    return {
      success: true,
      fileName,
      downloadUrl,
      blob: pdfBlob
    }
  }

  /**
   * Add summary section to PDF
   */
  private addSummarySection(doc: ExtendedJsPDF, data: any, yPosition: number): number {
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('Daily Summary', 20, yPosition)
    yPosition += 15

    const summaryData = [
      ['Total Vehicle Movement', (data.totalSessions || data.summary?.totalSessions || 0).toString()],
      ['Active/Parked Vehicles', (data.activeSessions || data.summary?.activeSessions || 0).toString()],
      ['Vehicle Exits', (data.completedSessions || data.summary?.completedSessions || 0).toString()],
      ['Revenue', `Rs.${(data.revenue || data.summary?.revenue || 0).toFixed(2)}`],
      ['Expenses', `Rs.${(data.expenses || data.summary?.expenses || 0).toFixed(2)}`],
      ['Net Income', `Rs.${(data.netIncome || data.summary?.netIncome || 0).toFixed(2)}`]
    ]

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      styles: { fontSize: 10 }
    })

    return (doc as ExtendedJsPDF).lastAutoTable!.finalY + 20
  }

  /**
   * Add parking sessions table - EXACT FORMAT USER WANTS
   */
  private addParkingSessionsTable(doc: ExtendedJsPDF, entries: ParkingEntry[], yPosition: number): number {
    // Add new page if needed
    if (yPosition > 200) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('Parking Sessions', 20, yPosition)
    yPosition += 5

    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.text('Detailed parking session records', 20, yPosition)
    yPosition += 15

    // Format data EXACTLY as user specified
    const tableData = entries.map((entry: ParkingEntry) => {
      // Transport Name (combine transport name and driver name if available)
      const transportName = entry.transportName || 'N/A'
      const driverName = entry.driverName || ''
      const fullTransportName = driverName ? `${transportName} ${driverName}` : transportName

      // Vehicle Number + Vehicle Type combined
      const vehicleInfo = `${entry.vehicleNumber || 'N/A'} ${entry.vehicleType || ''}`

      // In Time - DD/MM/YYYY HH:mm format
      const inTime = entry.entryTime
        ? format(new Date(entry.entryTime), 'dd/MM/yyyy HH:mm')
        : 'N/A'

      // Out Time - Show date or "Active" if still parked
      const outTime = entry.exitTime
        ? format(new Date(entry.exitTime), 'dd/MM/yyyy HH:mm')
        : 'Active'

      // Payment Status
      const paymentStatus = entry.paymentStatus || 'Pending'

      // Total Amount - with payment method if available
      const amount = entry.parkingFee || 0
      const paymentMethod = entry.paymentType || ''
      const totalAmount = paymentMethod && entry.paymentStatus === 'Paid'
        ? `Rs.${amount.toFixed(2)} ${paymentMethod}`
        : `Rs.${amount.toFixed(2)}`

      return [
        fullTransportName,
        vehicleInfo,
        inTime,
        outTime,
        paymentStatus,
        totalAmount
      ]
    })

    autoTable(doc, {
      startY: yPosition,
      head: [['Transport Name', 'Vehicle No.', 'In Time', 'Out Time', 'Payment Status', 'Total Amount']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 4,
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 35 },  // Transport Name
        1: { cellWidth: 35 },  // Vehicle No.
        2: { cellWidth: 32 },  // In Time
        3: { cellWidth: 32 },  // Out Time
        4: { cellWidth: 25 },  // Payment Status
        5: { cellWidth: 30, halign: 'right' }  // Total Amount
      }
    })

    return (doc as ExtendedJsPDF).lastAutoTable!.finalY + 20
  }

  /**
   * === EXCEL EXPORT IMPLEMENTATION ===
   */
  private async exportToExcel(
    report: ReportGenerationResponse,
    config: ExportConfig,
    fileName: string
  ): Promise<ExportResult> {
    const workbook = XLSX.utils.book_new()

    // Get parking entries
    const reportData = report.data as any
    const parkingEntries: ParkingEntry[] = reportData.entries || reportData.sessions || []

    // Summary Sheet
    const summaryData = [
      ['Parking Report Summary'],
      [''],
      ['Period', `${format(report.dateRange.startDate, 'MMMM d, yyyy')} - ${format(report.dateRange.endDate, 'MMMM d, yyyy')}`],
      ['Generated', format(report.generatedAt, 'MMMM d, yyyy \'at\' h:mm a')],
      [''],
      ['Metric', 'Value'],
      ['Total Vehicle Movement', reportData.totalSessions || reportData.summary?.totalSessions || 0],
      ['Active/Parked Vehicles', reportData.activeSessions || reportData.summary?.activeSessions || 0],
      ['Vehicle Exits', reportData.completedSessions || reportData.summary?.completedSessions || 0],
      ['Revenue', `Rs.${(reportData.revenue || reportData.summary?.revenue || 0).toFixed(2)}`],
      ['Expenses', `Rs.${(reportData.expenses || reportData.summary?.expenses || 0).toFixed(2)}`],
      ['Net Income', `Rs.${(reportData.netIncome || reportData.summary?.netIncome || 0).toFixed(2)}`]
    ]

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

    // Parking Sessions Sheet
    if (parkingEntries && parkingEntries.length > 0) {
      const sessionsData = [
        ['Transport Name', 'Driver Name', 'Vehicle No.', 'Vehicle Type', 'In Time', 'Out Time', 'Payment Status', 'Payment Method', 'Total Amount'],
        ...parkingEntries.map((entry: ParkingEntry) => [
          entry.transportName || 'N/A',
          entry.driverName || '',
          entry.vehicleNumber || 'N/A',
          entry.vehicleType || '',
          entry.entryTime ? format(new Date(entry.entryTime), 'dd/MM/yyyy HH:mm') : 'N/A',
          entry.exitTime ? format(new Date(entry.exitTime), 'dd/MM/yyyy HH:mm') : 'Active',
          entry.paymentStatus || 'Pending',
          entry.paymentType || '',
          `Rs.${(entry.parkingFee || 0).toFixed(2)}`
        ])
      ]

      const sessionsSheet = XLSX.utils.aoa_to_sheet(sessionsData)
      XLSX.utils.book_append_sheet(workbook, sessionsSheet, 'Parking Sessions')
    }

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const downloadUrl = URL.createObjectURL(excelBlob)

    return {
      success: true,
      fileName,
      downloadUrl,
      blob: excelBlob
    }
  }

  /**
   * === CSV EXPORT IMPLEMENTATION ===
   */
  private async exportToCSV(
    report: ReportGenerationResponse,
    config: ExportConfig,
    fileName: string
  ): Promise<ExportResult> {
    const reportData = report.data as any
    const parkingEntries: ParkingEntry[] = reportData.entries || reportData.sessions || []

    if (!parkingEntries || parkingEntries.length === 0) {
      return {
        success: false,
        fileName: '',
        error: 'No parking sessions found'
      }
    }

    // CSV Headers
    const headers = ['Transport Name', 'Driver Name', 'Vehicle No.', 'Vehicle Type', 'In Time', 'Out Time', 'Payment Status', 'Payment Method', 'Total Amount']

    // CSV Rows
    const rows = parkingEntries.map((entry: ParkingEntry) => [
      entry.transportName || 'N/A',
      entry.driverName || '',
      entry.vehicleNumber || 'N/A',
      entry.vehicleType || '',
      entry.entryTime ? format(new Date(entry.entryTime), 'dd/MM/yyyy HH:mm') : 'N/A',
      entry.exitTime ? format(new Date(entry.exitTime), 'dd/MM/yyyy HH:mm') : 'Active',
      entry.paymentStatus || 'Pending',
      entry.paymentType || '',
      `Rs.${(entry.parkingFee || 0).toFixed(2)}`
    ])

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const downloadUrl = URL.createObjectURL(csvBlob)

    return {
      success: true,
      fileName,
      downloadUrl,
      blob: csvBlob
    }
  }
}

export const reportExportService = new ReportExportService()
export default reportExportService
