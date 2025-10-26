import React, { useState, useEffect } from 'react'
import { PrinterIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Select } from '../ui/select'
import { Input } from '../ui/Input'
import { ParkingTicketPreview } from './ParkingTicketPreview'
import type { ParkingTicketData, PrintResult } from './PrintButton'
import type { PrinterProfile } from '../../types/printerConfig'
import { log } from '../../utils/secureLogger'

interface PrintPreviewModalProps {
  ticketData: ParkingTicketData
  ticketType: 'entry' | 'exit' | 'receipt'
  copies: number
  onPrint: () => Promise<void>
  onClose: () => void
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  ticketData,
  ticketType,
  copies: initialCopies,
  onPrint,
  onClose
}) => {
  const [selectedPrinter, setSelectedPrinter] = useState<string>('')
  const [printCopies, setPrintCopies] = useState(initialCopies)
  const [printerProfiles, setPrinterProfiles] = useState<PrinterProfile[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadPrinterProfiles()
  }, [])

  const loadPrinterProfiles = async () => {
    try {
      // Load available printer profiles
      const { printerConfigService } = await import('../../services/printerConfigService')
      const profiles = await printerConfigService.getAllPrinterProfiles()
      const activeProfiles = profiles.filter(p => p.isActive)
      
      setPrinterProfiles(activeProfiles)
      
      // Select default printer if available
      const defaultPrinter = activeProfiles.find(p => p.isDefault) || activeProfiles[0]
      if (defaultPrinter) {
        setSelectedPrinter(defaultPrinter.id)
      }
    } catch (error) {
      log.error('Failed to load printer profiles', error)
    }
  }

  const handlePrint = async () => {
    if (!selectedPrinter) {
      toast.error('Please select a printer')
      return
    }

    setLoading(true)
    try {
      await onPrint()
    } finally {
      setLoading(false)
    }
  }

  const selectedPrinterProfile = printerProfiles.find(p => p.id === selectedPrinter)

  return (
    <Modal isOpen={true} onClose={onClose} size="xl" title="">
      <ModalHeader onClose={onClose}>
        <h3 className="text-lg font-semibold">
          Print Preview - {ticketType.charAt(0).toUpperCase() + ticketType.slice(1)} Ticket
        </h3>
      </ModalHeader>
      
      <ModalBody>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Print Preview */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Preview</h4>
            <div className="border rounded-lg p-4 bg-white shadow-inner min-h-[400px]">
              <ParkingTicketPreview
                ticketData={ticketData}
                ticketType={ticketType}
                printerProfile={selectedPrinterProfile}
              />
            </div>
          </div>
          
          {/* Print Options */}
          <div className="space-y-6">
            <h4 className="font-semibold text-gray-900">Print Options</h4>
            
            <div>
              <Select
                label="Select Printer"
                value={selectedPrinter}
                onChange={setSelectedPrinter}
                placeholder="Choose a printer..."
                options={printerProfiles.map(printer => ({
                  value: printer.id,
                  label: `${printer.name} (${printer.type})`,
                  disabled: !printer.isActive
                }))}
                required
              />
              
              {selectedPrinterProfile && (
                <div className="mt-2 p-3 bg-gray-50 rounded-md">
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Type:</span> {selectedPrinterProfile.type}</p>
                    <p><span className="font-medium">Model:</span> {selectedPrinterProfile.manufacturer} {selectedPrinterProfile.model}</p>
                    <p><span className="font-medium">Status:</span> 
                      <span className={selectedPrinterProfile.isActive ? 'text-green-600' : 'text-red-600'}>
                        {selectedPrinterProfile.isActive ? ' Online' : ' Offline'}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <Input
                label="Number of Copies"
                type="number"
                min={1}
                max={5}
                value={printCopies.toString()}
                onChange={(e) => setPrintCopies(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
                helpText="Maximum 5 copies allowed"
              />
            </div>
            
            <div className="space-y-3">
              <h5 className="font-medium text-gray-900">Ticket Details</h5>
              <div className="text-sm space-y-2 bg-gray-50 p-4 rounded-md">
                <div className="grid grid-cols-2 gap-2">
                  <p><span className="font-medium text-gray-700">Vehicle:</span></p>
                  <p className="text-gray-900">{ticketData.vehicleNumber}</p>
                  
                  <p><span className="font-medium text-gray-700">Type:</span></p>
                  <p className="text-gray-900">{ticketData.vehicleType}</p>
                  
                  <p><span className="font-medium text-gray-700">Driver:</span></p>
                  <p className="text-gray-900">{ticketData.driverName}</p>
                  
                  <p><span className="font-medium text-gray-700">Entry:</span></p>
                  <p className="text-gray-900">{ticketData.inTime}</p>
                  
                  {ticketData.outTime && (
                    <>
                      <p><span className="font-medium text-gray-700">Exit:</span></p>
                      <p className="text-gray-900">{ticketData.outTime}</p>
                    </>
                  )}
                  
                  {ticketData.receivedAmount && (
                    <>
                      <p><span className="font-medium text-gray-700">Amount:</span></p>
                      <p className="text-gray-900 font-semibold">₹{ticketData.receivedAmount}</p>
                    </>
                  )}
                  
                  {ticketData.paymentType && (
                    <>
                      <p><span className="font-medium text-gray-700">Payment:</span></p>
                      <p className="text-gray-900">{ticketData.paymentType}</p>
                    </>
                  )}
                </div>
                
                {ticketData.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="font-medium text-gray-700">Notes:</p>
                    <p className="text-gray-900 mt-1">{ticketData.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </ModalBody>
      
      <ModalFooter>
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="primary"
            onClick={handlePrint}
            disabled={!selectedPrinter || loading}
            loading={loading}
          >
            <PrinterIcon className="w-4 h-4 mr-2" />
            Print {printCopies > 1 ? `(${printCopies} copies)` : ''}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  )
}