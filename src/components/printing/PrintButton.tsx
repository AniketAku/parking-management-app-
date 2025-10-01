import React, { useState } from 'react'
import { PrinterIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { Button } from '../ui/Button'
import { PrintPreviewModal } from './PrintPreviewModal'
import type { ParkingEntry } from '../../types'
import type { PrinterProfile } from '../../types/printerConfig'

export interface ParkingTicketData {
  ticketNumber: string
  vehicleNumber: string
  vehicleType: string
  transportName: string
  driverName: string
  inTime: string
  outTime?: string
  receivedAmount?: number
  paymentType?: string
  notes?: string
}

export interface PrintResult {
  success: boolean
  jobId?: string
  error?: string
  timestamp: Date
}

interface PrintButtonProps {
  entry: ParkingEntry
  ticketType: 'entry' | 'exit' | 'receipt'
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  showPreview?: boolean
  copies?: number
  className?: string
  onPrintStart?: () => void
  onPrintComplete?: (result: PrintResult) => void
  onPrintError?: (error: Error) => void
}

export const PrintButton: React.FC<PrintButtonProps> = ({
  entry,
  ticketType,
  disabled = false,
  variant = 'primary',
  size = 'md',
  showPreview = true,
  copies = 1,
  className = '',
  onPrintStart,
  onPrintComplete,
  onPrintError
}) => {
  const [printing, setPrinting] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  
  const ticketData: ParkingTicketData = {
    ticketNumber: entry.id,
    vehicleNumber: entry.vehicleNumber,
    vehicleType: entry.vehicleType,
    transportName: entry.transportName,
    driverName: entry.driverName,
    inTime: entry.entryTime.toLocaleString(),
    outTime: entry.exitTime?.toLocaleString(),
    receivedAmount: entry.actualFee || entry.calculatedFee,
    paymentType: entry.paymentType,
    notes: entry.notes
  }
  
  const handlePrint = async () => {
    if (showPreview) {
      setShowPreviewModal(true)
      return
    }
    
    await executePrint()
  }
  
  const executePrint = async () => {
    setPrinting(true)
    onPrintStart?.()
    
    try {
      // TODO: Integrate with actual printer service
      const printService = await import('../../services/printService')
      const result = await printService.default.printTicket(ticketData, ticketType, copies)
      
      if (result.success) {
        const successResult: PrintResult = {
          success: true,
          jobId: result.jobId,
          timestamp: new Date()
        }
        onPrintComplete?.(successResult)
        toast.success(`${ticketType.charAt(0).toUpperCase() + ticketType.slice(1)} ticket printed successfully`)
      } else {
        throw new Error(result.error || 'Print job failed')
      }
    } catch (error) {
      const printError = error as Error
      onPrintError?.(printError)
      toast.error(`Print failed: ${printError.message}`)
    } finally {
      setPrinting(false)
      setShowPreviewModal(false)
    }
  }
  
  const handleClosePreview = () => {
    setShowPreviewModal(false)
  }
  
  return (
    <>
      <Button
        variant={variant}
        size={size}
        disabled={disabled || printing}
        loading={printing}
        onClick={handlePrint}
        className={`print-button ${className}`}
        data-testid={`print-${ticketType}-button`}
      >
        <PrinterIcon className="w-4 h-4 mr-2" />
        {printing ? 'Printing...' : `Print ${ticketType.charAt(0).toUpperCase() + ticketType.slice(1)}`}
      </Button>
      
      {showPreviewModal && (
        <PrintPreviewModal
          ticketData={ticketData}
          ticketType={ticketType}
          copies={copies}
          onPrint={executePrint}
          onClose={handleClosePreview}
        />
      )}
    </>
  )
}