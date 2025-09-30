import React, { useState, useRef } from 'react'
import { ParkingTicket, DEFAULT_BUSINESS_INFO } from './ParkingTicket'
import type { ParkingTicketProps } from './ParkingTicket'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

interface PrintModalProps {
  isOpen: boolean
  onClose: () => void
  entryData: {
    id: string
    vehicle_number: string
    vehicle_type: string
    entry_time: string
    exit_time?: string
    parking_fee?: number
    serial?: number
  }
  ticketType?: 'entry' | 'exit' | 'receipt'
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  entryData,
  ticketType: initialTicketType = 'entry'
}) => {
  const [ticketType, setTicketType] = useState<'entry' | 'exit' | 'receipt'>(initialTicketType)
  const [copies, setCopies] = useState(2)
  const printRef = useRef<HTMLDivElement>(null)

  // Generate ticket number from entry data
  const generateTicketNumber = (serial: number | undefined, entryTime: string): string => {
    const date = new Date(entryTime)
    const datePrefix = date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit' 
    }).replace(/\//g, '')
    const serialNumber = serial || Math.floor(Math.random() * 999) + 1
    return `${datePrefix}${serialNumber.toString().padStart(3, '0')}`
  }

  // Format date and time from ISO string
  const formatDate = (isoString: string): string => {
    return new Date(isoString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatTime = (isoString: string): string => {
    return new Date(isoString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  // Prepare ticket props
  const ticketProps: ParkingTicketProps = {
    ...DEFAULT_BUSINESS_INFO,
    ticketNumber: generateTicketNumber(entryData.serial, entryData.entry_time),
    vehicleNumber: entryData.vehicle_number.toUpperCase(),
    date: formatDate(entryData.entry_time),
    vehicleType: entryData.vehicle_type,
    inTime: formatTime(entryData.entry_time),
    outTime: entryData.exit_time ? formatTime(entryData.exit_time) : undefined,
    receivedAmount: entryData.parking_fee,
    ticketType,
    copies,
    showSignatureLine: true
  }

  const handlePrint = () => {
    if (printRef.current) {
      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=800,height=600')
      
      if (printWindow) {
        const ticketHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Parking Ticket - ${ticketProps.ticketNumber}</title>
            <style>
              ${getTicketStyles()}
            </style>
          </head>
          <body>
            ${printRef.current.innerHTML}
          </body>
          </html>
        `
        
        printWindow.document.write(ticketHTML)
        printWindow.document.close()
        
        // Wait for content to load then print
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 250)
      }
    }
  }

  const handlePreview = () => {
    if (printRef.current) {
      // Open preview in new tab
      const previewWindow = window.open('', '_blank', 'width=900,height=700')
      
      if (previewWindow) {
        const previewHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Ticket Preview - ${ticketProps.ticketNumber}</title>
            <style>
              ${getTicketStyles()}
              body { padding: 20px; background: #f0f0f0; }
              .preview-controls { 
                text-align: center; 
                margin-bottom: 20px; 
                background: white; 
                padding: 15px; 
                border-radius: 8px; 
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .preview-controls button {
                background: #2563eb;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                margin: 0 5px;
              }
              .preview-controls button:hover {
                background: #1d4ed8;
              }
            </style>
          </head>
          <body>
            <div class="preview-controls">
              <h2>Ticket Preview</h2>
              <button onclick="window.print()">Print Now</button>
              <button onclick="window.close()">Close Preview</button>
            </div>
            ${printRef.current.innerHTML}
          </body>
          </html>
        `
        
        previewWindow.document.write(previewHTML)
        previewWindow.document.close()
      }
    }
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Print Parking Ticket">
      <div className="print-modal-content">
        {/* Print Options */}
        <div className="print-options mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Ticket Type
              </label>
              <select
                value={ticketType}
                onChange={(e) => setTicketType(e.target.value as 'entry' | 'exit' | 'receipt')}
                className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="entry">Entry Ticket</option>
                <option value="exit">Exit Receipt</option>
                <option value="receipt">Payment Receipt</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Number of Copies
              </label>
              <select
                value={copies}
                onChange={(e) => setCopies(Number(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value={1}>1 Copy</option>
                <option value={2}>2 Copies</option>
                <option value={3}>3 Copies</option>
              </select>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handlePreview} className="flex-1">
              Preview
            </Button>
            <Button onClick={handlePrint} className="flex-1">
              Print Ticket
            </Button>
          </div>
        </div>
        
        {/* Ticket Preview */}
        <div className="ticket-preview-container">
          <h3 className="text-lg font-semibold text-text-primary mb-3">Preview:</h3>
          <div className="preview-wrapper" style={{ transform: 'scale(0.8)', transformOrigin: 'top left' }}>
            <div ref={printRef}>
              <ParkingTicket {...ticketProps} />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// CSS styles for ticket printing
const getTicketStyles = (): string => `
/* Professional parking ticket print styles */
@page {
  size: 3.5in 5in;
  margin: 0.1in;
}

body {
  margin: 0;
  padding: 0;
  font-family: 'Arial', monospace;
  font-size: 12px;
  line-height: 1.2;
}

.ticket-container {
  display: block;
}

.parking-ticket {
  width: 3.5in;
  height: 5in;
  padding: 0.15in;
  border: 2px solid #000;
  background: white;
  box-sizing: border-box;
  page-break-inside: avoid;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
  margin-bottom: 0.1in;
}

.page-break {
  page-break-before: always;
}

.ticket-header {
  text-align: center;
  border-bottom: 2px solid #000;
  padding-bottom: 6px;
  margin-bottom: 8px;
}

.business-name {
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 2px;
  text-transform: uppercase;
}

.facility-name {
  font-size: 15px;
  font-weight: bold;
  text-transform: uppercase;
  margin-bottom: 3px;
}

.location-contact {
  font-size: 9px;
  line-height: 1.1;
  margin-bottom: 2px;
}

.ticket-number {
  color: #d32f2f !important;
  font-size: 22px;
  font-weight: bold;
  text-align: center;
  margin: 8px 0;
  border: 1px solid #000;
  padding: 3px;
  background: white;
  letter-spacing: 1px;
}

.form-fields {
  margin-top: 12px;
}

.field-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
  border-bottom: 1px solid #000;
  padding-bottom: 1px;
  min-height: 16px;
}

.field-label {
  font-weight: bold;
  font-size: 11px;
  flex-shrink: 0;
}

.field-value {
  font-size: 11px;
  text-align: right;
  flex-grow: 1;
  margin-left: 10px;
  text-transform: uppercase;
}

.amount-section {
  margin-top: 10px;
  border: 2px solid #000;
  padding: 5px;
  text-align: center;
  background: #f9f9f9;
}

.amount-label {
  font-size: 11px;
  font-weight: bold;
  margin-bottom: 2px;
}

.amount-value {
  font-size: 16px;
  font-weight: bold;
  color: #d32f2f;
}

.signature-section {
  margin-top: 15px;
  border-top: 2px solid #000;
  padding-top: 8px;
  text-align: center;
  font-size: 11px;
  font-weight: bold;
}

/* Print-specific styles */
@media print {
  body { 
    margin: 0; 
    padding: 0;
  }
  .parking-ticket { 
    box-shadow: none;
    border: 2px solid #000;
    margin: 0;
    height: auto;
    min-height: 5in;
  }
  .no-print { 
    display: none !important; 
  }
}
`