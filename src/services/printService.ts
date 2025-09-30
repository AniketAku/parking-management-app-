/**
 * Print Service - Enhanced unified printing interface
 * Integrates with existing printer infrastructure and queue management
 */

import type { ParkingTicketData, PrintResult } from '../components/printing/PrintButton'
import type { PrinterProfile } from '../types/printerConfig'
import type { ParkingEntry } from '../types'
import type { PrintJob, PrintQueueService } from '../types/printQueue'
import type { BluetoothPrinterProfile, BluetoothDevice } from '../types/bluetoothPrinter'
import { printerConfigService } from './printerConfigService'
import { printQueueManager } from './printQueueService'
import { settingsService } from './settingsService'
import { bluetoothPrinterService } from './bluetoothPrinterService'
import { bluetoothConnectionManager } from './bluetoothConnectionManager'
import { bluetoothErrorHandler } from './bluetoothErrorHandler'
import { mobileBluetoothOptimizer } from './mobileBluetoothOptimizer'
import { ESCPOSBuilder } from '../utils/escposBuilder'

export interface PrintServiceOptions {
  printerProfileId?: string
  copies?: number
  priority?: 'normal' | 'high' | 'urgent'
  silent?: boolean
  queueIfOffline?: boolean
  useQueue?: boolean
}

export interface ParkingExit {
  entryId: string
  vehicleNumber: string
  vehicleType: string
  entryTime: Date
  exitTime: Date
  parkingFee: number
  paymentType?: string
}

class PrintService {
  private static instance: PrintService
  private queueService: PrintQueueService
  
  constructor() {
    this.queueService = printQueueManager
  }
  
  static getInstance(): PrintService {
    if (!PrintService.instance) {
      PrintService.instance = new PrintService()
    }
    return PrintService.instance
  }
  
  // Register event handlers for queue monitoring
  onPrintComplete(callback: (job: PrintJob) => void): void {
    this.queueService.onPrintComplete(callback)
  }
  
  onPrintError(callback: (job: PrintJob, error: Error) => void): void {
    this.queueService.onPrintError(callback)
  }
  
  onQueueStatusChange(callback: (status: any) => void): void {
    this.queueService.onQueueStatusChange(callback)
  }

  async printTicket(
    ticketData: ParkingTicketData, 
    ticketType: 'entry' | 'exit' | 'receipt',
    copies: number = 1,
    options: PrintServiceOptions = {}
  ): Promise<PrintResult> {
    try {
      // Get printer profile
      const printerProfile = await this.getActivePrinter(options.printerProfileId, ticketType)
      
      if (!printerProfile) {
        throw new Error('No active printer available for this ticket type')
      }

      // Check if we should use queue or print directly
      const printSettings = await this.getPrintSettings()
      const useQueue = options.useQueue ?? printSettings.printQueueEnabled
      
      if (useQueue) {
        // Add to print queue
        const jobId = await this.queueService.addToPrintQueue({
          ticketId: ticketData.ticketNumber || Date.now().toString(),
          ticketType,
          ticketData,
          printerProfile,
          priority: options.priority || 'normal',
          copies: copies || printSettings.defaultCopies,
          maxAttempts: 3
        })
        
        return {
          success: true,
          jobId,
          timestamp: new Date()
        }
      } else {
        // Print directly
        const printJob = await this.createPrintJob(ticketData, ticketType, printerProfile, copies)
        const result = await this.executePrintJob(printJob, printerProfile)
        
        // Update usage statistics
        await this.updatePrinterUsage(printerProfile.id, result.success)
        
        return {
          success: result.success,
          jobId: printJob.id,
          timestamp: new Date(),
          error: result.error
        }
      }
      
    } catch (error) {
      console.error('Print service error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown print error',
        timestamp: new Date()
      }
    }
  }

  private async getActivePrinter(printerProfileId?: string, assignmentType?: string): Promise<PrinterProfile | null> {
    try {
      const profiles = await printerConfigService.getAllPrinterProfiles()
      const activeProfiles = profiles.filter(p => p.isActive)
      
      if (printerProfileId) {
        return activeProfiles.find(p => p.id === printerProfileId) || null
      }
      
      // Find printer assigned to this assignment type
      if (assignmentType) {
        const assignedPrinter = activeProfiles.find(p => 
          p.locationAssignments?.some(a => 
            a.assignmentType === assignmentType && a.isActive && a.isPrimary
          )
        )
        if (assignedPrinter) return assignedPrinter
      }
      
      // Fallback to default printer
      return activeProfiles.find(p => p.isDefault) || activeProfiles[0] || null
      
    } catch (error) {
      console.error('Failed to get active printer:', error)
      return null
    }
  }

  private async createPrintJob(
    ticketData: ParkingTicketData,
    ticketType: 'entry' | 'exit' | 'receipt',
    printerProfile: PrinterProfile,
    copies: number
  ) {
    const documentType = ticketType === 'entry' ? 'entry_ticket' : 
                        ticketType === 'exit' ? 'exit_receipt' : 'custom'
    
    return {
      id: `print_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      printerProfileId: printerProfile.id,
      documentType,
      data: ticketData,
      settings: {
        ...printerProfile.defaultSettings,
        copies
      },
      status: 'pending' as const,
      priority: 'normal' as const,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date()
    }
  }

  private async executePrintJob(printJob: any, printerProfile: PrinterProfile): Promise<{ success: boolean; error?: string }> {
    try {
      // For now, simulate printing - in real implementation, this would:
      // 1. Connect to the actual printer using the connection config
      // 2. Format the ticket data according to printer capabilities
      // 3. Send the print command using the appropriate protocol (ESC/POS, etc.)
      // 4. Handle printer-specific responses and errors
      
      console.log('Executing print job:', {
        jobId: printJob.id,
        printer: printerProfile.name,
        type: printerProfile.type,
        data: printJob.data
      })
      
      // Simulate print delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Check printer status (simulate)
      const isOnline = await this.checkPrinterStatus(printerProfile)
      
      if (!isOnline) {
        throw new Error(`Printer ${printerProfile.name} is offline`)
      }
      
      // Simulate successful print
      return { success: true }
      
    } catch (error) {
      console.error('Print job execution failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Print execution failed' 
      }
    }
  }

  private async checkPrinterStatus(printerProfile: PrinterProfile): Promise<boolean> {
    try {
      // In real implementation, this would test the actual printer connection
      // For now, simulate based on printer profile status
      return printerProfile.isActive
    } catch (error) {
      console.error('Failed to check printer status:', error)
      return false
    }
  }

  private async updatePrinterUsage(printerProfileId: string, success: boolean): Promise<void> {
    try {
      const profile = await printerConfigService.getPrinterProfile(printerProfileId)
      if (!profile) return
      
      const updatedUsage = {
        totalJobs: profile.usage.totalJobs + 1,
        successfulJobs: profile.usage.successfulJobs + (success ? 1 : 0),
        failedJobs: profile.usage.failedJobs + (success ? 0 : 1),
        lastUsed: new Date(),
        averageJobTime: profile.usage.averageJobTime // TODO: Calculate actual average
      }
      
      await printerConfigService.updatePrinterProfile(printerProfileId, {
        usage: updatedUsage,
        updatedAt: new Date()
      })
      
    } catch (error) {
      console.error('Failed to update printer usage:', error)
    }
  }

  // Enhanced utility methods with data conversion
  async printEntryTicket(entry: ParkingEntry, options?: PrintServiceOptions): Promise<PrintResult> {
    const ticketData = this.convertEntryToPrintData(entry)
    return this.printTicket(ticketData, 'entry', options?.copies, options)
  }

  async printExitReceipt(exitData: ParkingExit, options?: PrintServiceOptions): Promise<PrintResult> {
    const receiptData = this.convertExitToPrintData(exitData)
    return this.printTicket(receiptData, 'exit', options?.copies, options)
  }

  async printReceipt(ticketData: ParkingTicketData, copies: number = 1, options?: PrintServiceOptions): Promise<PrintResult> {
    return this.printTicket(ticketData, 'receipt', copies, options)
  }

  // Enhanced printer management
  async getAvailablePrinters(): Promise<PrinterProfile[]> {
    try {
      return await this.queueService.getAvailablePrinters()
    } catch (error) {
      console.error('Failed to get available printers:', error)
      // Fallback to config service
      try {
        const profiles = await printerConfigService.getAllPrinterProfiles()
        return profiles.filter(p => p.isActive)
      } catch (fallbackError) {
        console.error('Fallback printer fetch failed:', fallbackError)
        return []
      }
    }
  }
  
  // Get print queue status
  async getQueueStatus() {
    return await this.queueService.getQueueStatus()
  }
  
  // Get print job history
  async getPrintHistory(filters?: any) {
    return await this.queueService.getPrintHistory(filters)
  }

  // Enhanced auto-print checking with settings integration
  async shouldAutoPrint(ticketType: 'entry' | 'exit'): Promise<boolean> {
    try {
      const printSettings = await this.getPrintSettings()
      return ticketType === 'entry' ? printSettings.autoPrintEntry : printSettings.autoPrintExit
    } catch (error) {
      console.error('Failed to check auto-print settings:', error)
      return false
    }
  }
  
  // Get print settings from settings service
  private async getPrintSettings() {
    try {
      const settings = await settingsService.getSettings('printing')
      return {
        autoPrintEntry: settings?.autoPrintEntry || false,
        autoPrintExit: settings?.autoPrintExit || false,
        printQueueEnabled: settings?.printQueueEnabled || true,
        defaultCopies: settings?.defaultCopies || 1,
        ...settings
      }
    } catch (error) {
      console.error('Failed to load print settings:', error)
      return {
        autoPrintEntry: false,
        autoPrintExit: false,
        printQueueEnabled: true,
        defaultCopies: 1
      }
    }
  }
  // Data conversion methods
  private convertEntryToPrintData(entry: ParkingEntry): ParkingTicketData {
    return {
      ticketNumber: entry.id.toString(),
      vehicleNumber: entry.vehicleNumber,
      vehicleType: entry.vehicleType,
      transportName: entry.transportName,
      driverName: entry.driverName || '',
      inTime: entry.entryTime.toLocaleString(),
      notes: entry.notes
    }
  }
  
  private convertExitToPrintData(exitData: ParkingExit): ParkingTicketData {
    return {
      ticketNumber: exitData.entryId,
      vehicleNumber: exitData.vehicleNumber,
      vehicleType: exitData.vehicleType,
      inTime: exitData.entryTime.toLocaleString(),
      outTime: exitData.exitTime.toLocaleString(),
      receivedAmount: exitData.parkingFee,
      paymentType: exitData.paymentType
    }
  }

  // Bluetooth printer support methods
  async isBluetoothSupported(): Promise<boolean> {
    return bluetoothPrinterService.isBluetoothSupported()
  }

  async isBluetoothEnabled(): Promise<boolean> {
    return bluetoothPrinterService.isBluetoothEnabled()
  }

  async requestBluetoothPermissions(): Promise<boolean> {
    return mobileBluetoothOptimizer.requestMobileBluetoothPermissions()
  }

  async scanForBluetoothPrinters(): Promise<BluetoothDevice[]> {
    try {
      return await bluetoothPrinterService.scanForBluetoothPrinters()
    } catch (error) {
      console.error('Bluetooth scanner failed:', error)
      throw error
    }
  }

  async connectBluetoothPrinter(deviceId: string): Promise<boolean> {
    try {
      await bluetoothConnectionManager.forceReconnect(deviceId)
      return true
    } catch (error) {
      console.error('Bluetooth connection failed:', error)
      return false
    }
  }

  async disconnectBluetoothPrinter(deviceId: string): Promise<void> {
    await bluetoothPrinterService.disconnectBluetoothPrinter(deviceId)
  }

  async printViaBluetoothESCPOS(
    deviceId: string, 
    ticketData: ParkingTicketData, 
    ticketType: 'entry' | 'exit'
  ): Promise<PrintResult> {
    try {
      let escposData: Uint8Array

      if (ticketType === 'entry') {
        escposData = ESCPOSBuilder.buildParkingTicket({
          ticketNumber: ticketData.ticketNumber,
          vehicleNumber: ticketData.vehicleNumber,
          vehicleType: ticketData.vehicleType,
          transportName: ticketData.transportName || '',
          inTime: ticketData.inTime,
          driverName: ticketData.driverName,
          notes: ticketData.notes
        })
      } else {
        escposData = ESCPOSBuilder.buildExitReceipt({
          ticketNumber: ticketData.ticketNumber,
          vehicleNumber: ticketData.vehicleNumber,
          vehicleType: ticketData.vehicleType,
          inTime: ticketData.inTime,
          outTime: ticketData.outTime || new Date().toLocaleString(),
          parkingFee: ticketData.parkingFee || 0,
          paymentType: ticketData.paymentType
        })
      }

      const result = await bluetoothPrinterService.printViaBluetoothESCPOS(deviceId, escposData)
      
      if (result.success) {
        console.log(`Bluetooth print successful for device ${deviceId}`)
      }
      
      return result
    } catch (error) {
      console.error('Bluetooth ESC/POS print failed:', error)
      
      // Handle error through Bluetooth error handler
      const bluetoothError = error as any
      bluetoothError.type = 'transmission'
      bluetoothError.deviceId = deviceId
      bluetoothError.bluetoothSpecific = true
      bluetoothError.recoverable = true
      
      const recoveryPlan = bluetoothErrorHandler.handleBluetoothError(bluetoothError)
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bluetooth print failed',
        recoveryPlan
      }
    }
  }

  async getBluetoothPrinterStatus(deviceId: string) {
    return bluetoothPrinterService.checkBluetoothPrinterStatus(deviceId)
  }

  async getBluetoothConnectedDevices(): Promise<BluetoothDevice[]> {
    return bluetoothPrinterService.getConnectedDevices()
  }

  getMobileOptimizationInfo() {
    return {
      deviceInfo: mobileBluetoothOptimizer.getMobileDeviceInfo(),
      batteryInfo: mobileBluetoothOptimizer.getBatteryInfo(),
      features: mobileBluetoothOptimizer.getMobileFeatures(),
      optimizationConfig: mobileBluetoothOptimizer.optimizeForMobile()
    }
  }

  async testBluetoothConnection(deviceId: string) {
    return bluetoothConnectionManager.testConnection(deviceId)
  }

  getBluetoothErrorStats() {
    return bluetoothErrorHandler.getAllErrorStats()
  }

  getBluetoothTransmissionStats(deviceId: string) {
    return bluetoothPrinterService.getTransmissionStats(deviceId)
  }

  // Enhanced print method that supports both traditional and Bluetooth printing
  async printToDevice(
    deviceId: string, 
    ticketData: ParkingTicketData, 
    ticketType: 'entry' | 'exit' | 'receipt',
    options?: PrintServiceOptions
  ): Promise<PrintResult> {
    try {
      // Check if this is a Bluetooth device
      const connectedBTDevices = await this.getBluetoothConnectedDevices()
      const isBluetoothDevice = connectedBTDevices.some(device => device.id === deviceId)
      
      if (isBluetoothDevice) {
        return await this.printViaBluetoothESCPOS(deviceId, ticketData, ticketType as 'entry' | 'exit')
      } else {
        // Use traditional print queue for non-Bluetooth devices
        return await this.printTicket(ticketData, ticketType, options?.copies, options)
      }
    } catch (error) {
      console.error('Print to device failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Print failed'
      }
    }
  }
}

export default PrintService.getInstance()