import { ParkingService } from './parkingService'
import printService from './printService'
import { unifiedFeeService } from './UnifiedFeeCalculationService'
import type { ParkingEntry, CreateParkingEntryRequest, UpdateParkingEntryRequest } from './parkingService'
import type { PrintServiceOptions } from './printService'

export interface ParkingEntryWithPrintOptions {
  printOnEntry?: boolean
  printOnExit?: boolean
  printOptions?: PrintServiceOptions
}

export interface CreateEntryWithPrintRequest extends CreateParkingEntryRequest {
  printOptions?: ParkingEntryWithPrintOptions
}

export interface ProcessExitRequest {
  entryId: string
  actualFee: number
  paymentType: string
  exitNotes?: string
  printOptions?: ParkingEntryWithPrintOptions
}

export class ParkingEntryService {
  private static instance: ParkingEntryService

  static getInstance(): ParkingEntryService {
    if (!ParkingEntryService.instance) {
      ParkingEntryService.instance = new ParkingEntryService()
    }
    return ParkingEntryService.instance
  }

  async createEntry(data: CreateEntryWithPrintRequest): Promise<{ entry: ParkingEntry; printResult?: any }> {
    try {
      const entry = await ParkingService.createEntry(data)
      let printResult

      if (data.printOptions?.printOnEntry !== false) {
        const shouldAutoPrint = await printService.shouldAutoPrint('entry')
        
        if (shouldAutoPrint || data.printOptions?.printOnEntry) {
          try {
            printResult = await printService.printEntryTicket(entry, data.printOptions?.printOptions)
          } catch (printError) {
            console.warn('Entry print failed but entry was created:', printError)
          }
        }
      }

      return { entry, printResult }
    } catch (error) {
      console.error('Error creating parking entry:', error)
      throw error
    }
  }

  async processExit(exitRequest: ProcessExitRequest): Promise<{ entry: ParkingEntry; printResult?: any }> {
    try {
      const entry = await ParkingService.getEntryById(exitRequest.entryId)
      if (!entry) {
        throw new Error('Entry not found')
      }

      if (entry.status === 'Exited') {
        throw new Error('Vehicle has already exited')
      }

      const exitTime = new Date().toISOString()
      
      console.log('🚗 EXIT DEBUG - Processing exit:', {
        entryId: exitRequest.entryId,
        actualFee: exitRequest.actualFee,
        paymentType: exitRequest.paymentType,
        exitTime
      })

      // Calculate the system fee for comparison and auditing
      const calculatedFee = await unifiedFeeService.calculateParkingFee(
        entry.vehicleType,
        entry.entryTime,
        exitTime,
        'exit-processing'
      )

      console.log('💰 EXIT FEE COMPARISON:', {
        userInput: exitRequest.actualFee,
        calculated: calculatedFee,
        isManualOverride: Math.abs(exitRequest.actualFee - calculatedFee) > 0.01,
        difference: exitRequest.actualFee - calculatedFee
      })

      const updatedEntry = await ParkingService.updateEntry(exitRequest.entryId, {
        exit_time: exitTime,
        status: 'Exited',
        payment_status: 'Paid',
        payment_type: exitRequest.paymentType,
        parking_fee: exitRequest.actualFee,           // User's actual payment (priority field for revenue)
        // calculated_fee removed - column doesn't exist in database schema
        notes: exitRequest.exitNotes
      })

      console.log('✅ EXIT DEBUG - Entry updated:', {
        id: updatedEntry.id,
        vehicleNumber: updatedEntry.vehicleNumber,
        status: updatedEntry.status,
        payment_status: updatedEntry.paymentStatus,
        exit_time: updatedEntry.exitTime,
        actual_fee: updatedEntry.actualFee,
        calculated_fee: updatedEntry.calculatedFee,
        parking_fee: updatedEntry.parkingFee
      })

      let printResult

      if (exitRequest.printOptions?.printOnExit !== false) {
        const shouldAutoPrint = await printService.shouldAutoPrint('exit')
        
        if (shouldAutoPrint || exitRequest.printOptions?.printOnExit) {
          try {
            const exitData = {
              entryId: updatedEntry.id.toString(),
              vehicleNumber: updatedEntry.vehicleNumber,
              vehicleType: updatedEntry.vehicleType,
              entryTime: updatedEntry.entryTime,
              exitTime: new Date(exitTime),
              parkingFee: exitRequest.actualFee,
              paymentType: exitRequest.paymentType
            }
            
            printResult = await printService.printExitReceipt(exitData, exitRequest.printOptions?.printOptions)
          } catch (printError) {
            console.warn('Exit print failed but exit was processed:', printError)
          }
        }
      }

      return { entry: updatedEntry, printResult }
    } catch (error) {
      console.error('Error processing vehicle exit:', error)
      throw error
    }
  }

  async getEntries(filters?: Parameters<typeof ParkingService.getEntries>[0]): Promise<ParkingEntry[]> {
    return ParkingService.getEntries(filters)
  }

  async getEntryById(id: string): Promise<ParkingEntry | null> {
    return ParkingService.getEntryById(id)
  }

  async updateEntry(id: string, updates: UpdateParkingEntryRequest): Promise<ParkingEntry> {
    return ParkingService.updateEntry(id, updates)
  }

  async deleteEntry(id: string): Promise<void> {
    return ParkingService.deleteEntry(id)
  }

  async getStatistics() {
    return ParkingService.getStatistics()
  }

  subscribeToChanges(callback: (payload: any) => void) {
    return ParkingService.subscribeToChanges(callback)
  }

  async printExistingEntry(entryId: string, options?: PrintServiceOptions): Promise<any> {
    try {
      const entry = await this.getEntryById(entryId)
      if (!entry) {
        throw new Error('Entry not found')
      }

      return await printService.printEntryTicket(entry, options)
    } catch (error) {
      console.error('Error printing existing entry:', error)
      throw error
    }
  }

  async reprintReceipt(entryId: string, options?: PrintServiceOptions): Promise<any> {
    try {
      const entry = await this.getEntryById(entryId)
      if (!entry) {
        throw new Error('Entry not found')
      }

      if (entry.status !== 'Exited') {
        throw new Error('Cannot print receipt for vehicle that has not exited')
      }

      if (!entry.exitTime || !entry.actualFee) {
        throw new Error('Exit information incomplete')
      }

      const exitData = {
        entryId: entry.id.toString(),
        vehicleNumber: entry.vehicleNumber,
        vehicleType: entry.vehicleType,
        entryTime: entry.entryTime,
        exitTime: entry.exitTime,
        parkingFee: entry.actualFee,
        paymentType: entry.paymentStatus || 'Cash'
      }

      return await printService.printExitReceipt(exitData, options)
    } catch (error) {
      console.error('Error reprinting receipt:', error)
      throw error
    }
  }

  async getQueueStatus() {
    return printService.getQueueStatus()
  }

  async getPrintHistory(filters?: any) {
    return printService.getPrintHistory(filters)
  }
}

export default ParkingEntryService.getInstance()