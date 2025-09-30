import React from 'react'
import type { ParkingTicketData } from './PrintButton'
import type { PrinterProfile } from '../../types/printerConfig'

interface ParkingTicketPreviewProps {
  ticketData: ParkingTicketData
  ticketType: 'entry' | 'exit' | 'receipt'
  printerProfile?: PrinterProfile
}

export const ParkingTicketPreview: React.FC<ParkingTicketPreviewProps> = ({
  ticketData,
  ticketType,
  printerProfile
}) => {
  const isThermal = printerProfile?.type === 'thermal' || printerProfile?.type === 'receipt'
  const ticketWidth = isThermal ? 'w-72' : 'w-96'
  
  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  
  const renderEntryTicket = () => (
    <div className={`ticket-content ${ticketWidth} mx-auto bg-white border-2 border-dashed border-gray-300 p-4 font-mono text-sm`}>
      <div className="text-center border-b border-gray-200 pb-3 mb-3">
        <h1 className="text-lg font-bold">PARKING ENTRY TICKET</h1>
        <p className="text-xs text-gray-600 mt-1">Keep this ticket safe</p>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="font-semibold">Ticket #:</span>
          <span className="font-mono">{ticketData.ticketNumber}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-semibold">Vehicle:</span>
          <span className="font-mono">{ticketData.vehicleNumber}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-semibold">Type:</span>
          <span>{ticketData.vehicleType}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-semibold">Transport:</span>
          <span>{ticketData.transportName}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-semibold">Driver:</span>
          <span>{ticketData.driverName}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-semibold">Entry Time:</span>
          <span className="font-mono">{ticketData.inTime}</span>
        </div>
        
        {ticketData.notes && (
          <div className="border-t border-gray-200 pt-2 mt-2">
            <p className="font-semibold">Notes:</p>
            <p className="text-xs text-gray-700">{ticketData.notes}</p>
          </div>
        )}
      </div>
      
      <div className="text-center border-t border-gray-200 pt-3 mt-3">
        <p className="text-xs text-gray-600">
          Present this ticket at exit for payment
        </p>
        <div className="mt-2 text-xs font-mono bg-gray-100 p-2 rounded">
          {ticketData.ticketNumber}
        </div>
      </div>
    </div>
  )
  
  const renderExitReceipt = () => (
    <div className={`ticket-content ${ticketWidth} mx-auto bg-white border-2 border-gray-400 p-4 font-mono text-sm`}>
      <div className="text-center border-b border-gray-200 pb-3 mb-3">
        <h1 className="text-lg font-bold">PARKING EXIT RECEIPT</h1>
        <p className="text-xs text-gray-600 mt-1">Payment Confirmation</p>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="font-semibold">Receipt #:</span>
          <span className="font-mono">{ticketData.ticketNumber}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-semibold">Vehicle:</span>
          <span className="font-mono">{ticketData.vehicleNumber}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-semibold">Type:</span>
          <span>{ticketData.vehicleType}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-semibold">Driver:</span>
          <span>{ticketData.driverName}</span>
        </div>
        
        <div className="border-t border-gray-200 pt-2 mt-2">
          <div className="flex justify-between">
            <span className="font-semibold">Entry Time:</span>
            <span className="font-mono">{ticketData.inTime}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-semibold">Exit Time:</span>
            <span className="font-mono">{ticketData.outTime}</span>
          </div>
        </div>
        
        {ticketData.receivedAmount && (
          <div className="border-t border-gray-200 pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Amount Paid:</span>
              <span className="font-bold text-lg">{formatCurrency(ticketData.receivedAmount)}</span>
            </div>
            
            {ticketData.paymentType && (
              <div className="flex justify-between">
                <span className="font-semibold">Payment Method:</span>
                <span>{ticketData.paymentType}</span>
              </div>
            )}
          </div>
        )}
        
        {ticketData.notes && (
          <div className="border-t border-gray-200 pt-2 mt-2">
            <p className="font-semibold">Notes:</p>
            <p className="text-xs text-gray-700">{ticketData.notes}</p>
          </div>
        )}
      </div>
      
      <div className="text-center border-t border-gray-200 pt-3 mt-3">
        <p className="text-xs text-gray-600">
          Thank you for using our parking facility
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Keep this receipt for your records
        </p>
      </div>
    </div>
  )
  
  const renderReceiptTicket = () => (
    <div className={`ticket-content ${ticketWidth} mx-auto bg-white border border-gray-300 p-4 font-mono text-xs`}>
      <div className="text-center border-b border-gray-200 pb-2 mb-2">
        <h1 className="text-sm font-bold">PARKING RECEIPT</h1>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Receipt:</span>
          <span>{ticketData.ticketNumber}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Vehicle:</span>
          <span>{ticketData.vehicleNumber}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Type:</span>
          <span>{ticketData.vehicleType}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Entry:</span>
          <span>{ticketData.inTime}</span>
        </div>
        
        {ticketData.outTime && (
          <div className="flex justify-between">
            <span>Exit:</span>
            <span>{ticketData.outTime}</span>
          </div>
        )}
        
        {ticketData.receivedAmount && (
          <div className="border-t border-gray-200 pt-1 mt-1">
            <div className="flex justify-between font-bold">
              <span>TOTAL:</span>
              <span>{formatCurrency(ticketData.receivedAmount)}</span>
            </div>
          </div>
        )}
      </div>
      
      <div className="text-center border-t border-gray-200 pt-2 mt-2">
        <p className="text-xs">Thank you!</p>
      </div>
    </div>
  )

  const renderTicketPreview = () => {
    switch (ticketType) {
      case 'entry':
        return renderEntryTicket()
      case 'exit':
        return renderExitReceipt()
      case 'receipt':
        return renderReceiptTicket()
      default:
        return <div className="text-center text-gray-500">Unknown ticket type</div>
    }
  }

  return renderTicketPreview()
}