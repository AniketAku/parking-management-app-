import React, { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { PrintModal } from '../printing'
import { PrintButton } from '../printing/PrintButton'
import { useParkingData } from '../../hooks/useParkingData'
import { useParkingStore } from '../../stores/parkingStore'
import parkingEntryService from '../../services/parkingEntryService'
import printStatusService from '../../services/printStatusService'
import { useBusinessSettings } from '../../hooks/useSettings'
import { toast } from 'react-hot-toast'
import {
  formatCurrency,
  validateVehicleNumber
} from '../../utils/helpers'
import { unifiedFeeService } from '../../services/UnifiedFeeCalculationService'
import type { ParkingEntry } from '../../types'

interface VehicleSearchProps {
  vehicleNumber: string
  onChange: (value: string) => void
  onSearch: () => void
  loading?: boolean
}

const VehicleSearch: React.FC<VehicleSearchProps> = ({ 
  vehicleNumber, 
  onChange, 
  onSearch, 
  loading 
}) => (
  <Card className="border-2 border-primary-100">
    <CardHeader>
      <h3 className="text-lg font-semibold text-text-primary">Vehicle Search</h3>
    </CardHeader>
    <CardContent className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Vehicle Number
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={vehicleNumber}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g., KA05MN1234"
            className="flex-1 px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:border-primary-500 transition-colors text-base"
            onKeyPress={(e) => e.key === 'Enter' && onSearch()}
          />
          <Button 
            onClick={onSearch}
            disabled={loading || !vehicleNumber.trim()}
            className="px-6"
          >
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
)

interface VehicleDetailsProps {
  entry: ParkingEntry
  calculatedFee: number
  duration: string
  vehicleRatesLoaded: boolean
}

const VehicleDetails: React.FC<VehicleDetailsProps> = ({ 
  entry, 
  calculatedFee, 
  duration,
  vehicleRatesLoaded 
}) => (
  <Card className="border-2 border-success-100">
    <CardHeader>
      <h3 className="text-lg font-semibold text-text-primary">Vehicle Details</h3>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary">
              Transport Name
            </label>
            <p className="text-base font-medium text-text-primary">{entry.transportName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary">
              Vehicle Type
            </label>
            <p className="text-base font-medium text-text-primary">{entry.vehicleType}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary">
              Vehicle Number
            </label>
            <p className="text-base font-medium text-text-primary">{entry.vehicleNumber}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary">
              Driver Name
            </label>
            <p className="text-base font-medium text-text-primary">{entry.driverName}</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary">
              Entry Time
            </label>
            <p className="text-base font-medium text-text-primary">
              {new Date(entry.entryTime).toLocaleString()}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary">
              Parking Duration
            </label>
            <p className="text-base font-medium text-text-primary">{duration}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary">
              Current Status
            </label>
            <p className={`text-base font-medium ${
              entry.status === 'Active' ? 'text-success-600' : 'text-text-primary'
            }`}>
              {entry.status}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary">
              Calculated Fee {!vehicleRatesLoaded && '(⚠️ Default Rate)'}
            </label>
            <p className="text-xl font-bold text-primary-600">
              {formatCurrency(calculatedFee)}
            </p>
            {!vehicleRatesLoaded && (
              <p className="text-xs text-warning-600 mt-1">
                Using fallback rate - verify in settings
              </p>
            )}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
)

interface ExitPaymentFormProps {
  paymentType: string
  onPaymentTypeChange: (value: string) => void
  actualAmount: string
  onActualAmountChange: (value: string) => void
  notes: string
  onNotesChange: (value: string) => void
  calculatedFee: number
  onProcessExit: () => void
  onPrintReceipt: () => void
  loading?: boolean
}

const ExitPaymentForm: React.FC<ExitPaymentFormProps> = ({
  paymentType,
  onPaymentTypeChange,
  actualAmount,
  onActualAmountChange,
  notes,
  onNotesChange,
  calculatedFee,
  onProcessExit,
  onPrintReceipt,
  loading
}) => (
  <Card className="border-2 border-warning-100">
    <CardHeader>
      <h3 className="text-lg font-semibold text-text-primary">Exit & Payment</h3>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Payment Type *
          </label>
          <select
            value={paymentType}
            onChange={(e) => onPaymentTypeChange(e.target.value)}
            className="w-full px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:border-primary-500 transition-colors"
          >
            <option value="">Select payment type</option>
            <option value="Cash">Cash</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Debit Card">Debit Card</option>
            <option value="UPI">UPI</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Amount Received *
          </label>
          <input
            type="number"
            value={actualAmount}
            onChange={(e) => onActualAmountChange(e.target.value)}
            placeholder={`Suggested: ${formatCurrency(calculatedFee)}`}
            className="w-full px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:border-primary-500 transition-colors"
            min="0"
            step="0.01"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Exit Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Any additional notes for this exit..."
          rows={3}
          className="w-full px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:border-primary-500 transition-colors resize-none"
        />
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-border-light">
        <div className="text-right">
          <p className="text-sm text-text-secondary">Calculated Fee</p>
          <p className="text-xl font-bold text-primary-600">{formatCurrency(calculatedFee)}</p>
          {actualAmount && parseFloat(actualAmount) !== calculatedFee && (
            <p className={`text-sm font-medium ${
              parseFloat(actualAmount) > calculatedFee ? 'text-success-600' : 'text-warning-600'
            }`}>
              {parseFloat(actualAmount) > calculatedFee ? 'Excess: ' : 'Shortage: '}
              {formatCurrency(Math.abs(parseFloat(actualAmount) - calculatedFee))}
            </p>
          )}
        </div>
        
        <div className="flex gap-3">
          <Button 
            onClick={onPrintReceipt}
            disabled={!paymentType || !actualAmount}
            variant="outline"
            className="px-6 py-3 text-base"
          >
            🖨️ Print Receipt
          </Button>
          
          <Button 
            onClick={onProcessExit}
            disabled={loading || !paymentType || !actualAmount}
            variant="success"
            className="px-8 py-3 text-base font-semibold"
          >
            {loading ? 'Processing...' : 'Process Exit'}
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
)

export const VehicleExitForm: React.FC = () => {
  // Get real data from database and settings
  const { entries } = useParkingData()
  const { exitVehicle, refreshEntries, refreshStatistics } = useParkingStore()
  const { settings: businessSettings, loading: settingsLoading } = useBusinessSettings()
  const vehicleRates = businessSettings?.vehicle_rates
  
  // Mock user for now
  const user = { name: 'Admin', role: 'admin' }
  
  const [searchVehicleNumber, setSearchVehicleNumber] = useState('')
  const [foundEntry, setFoundEntry] = useState<ParkingEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  
  // Payment form state
  const [paymentType, setPaymentType] = useState('')
  const [actualAmount, setActualAmount] = useState('')
  const [exitNotes, setExitNotes] = useState('')
  
  const [calculatedFee, setCalculatedFee] = useState(0)
  const [duration, setDuration] = useState('')
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [exitedEntry, setExitedEntry] = useState<ParkingEntry | null>(null)

  // Calculate fee and duration when entry is found or settings change
  useEffect(() => {
    if (foundEntry) {
      const calculateFeeAndDuration = async () => {
        try {
          // 🎯 Using UnifiedFeeCalculationService - single source of truth
          const fee = await unifiedFeeService.calculateParkingFee(
            foundEntry.vehicleType,
            foundEntry.entryTime,
            undefined,
            'VehicleExitForm'
          )
          const dur = unifiedFeeService.calculateDuration(foundEntry.entryTime)

          setCalculatedFee(fee)
          setDuration(dur)
          setActualAmount(fee.toString())

          console.log('✅ VehicleExitForm: Fee calculated using unified service', {
            vehicleType: foundEntry.vehicleType,
            fee,
            duration: dur
          })

        } catch (error) {
          console.error('❌ VehicleExitForm: Fee calculation error:', error)
          toast.error('Error calculating parking fee. Please try again.', { duration: 3000 })
        }
      }

      calculateFeeAndDuration()
    }
  }, [foundEntry])

  const searchVehicle = async () => {
    if (!searchVehicleNumber.trim()) {
      toast.error('Please enter a vehicle number')
      return
    }
    
    if (!validateVehicleNumber(searchVehicleNumber)) {
      toast.error('Please enter a valid Indian vehicle number')
      return
    }
    
    setLoading(true)
    
    try {
      const normalizedSearch = searchVehicleNumber.replace(/\s/g, '').toUpperCase()
      const entry = entries.find(e =>
        e.vehicleNumber.replace(/\s/g, '').toUpperCase() === normalizedSearch &&
        e.status === 'Active'
      )
      
      if (entry) {
        setFoundEntry(entry)
        toast.success('Vehicle found!')
      } else {
        setFoundEntry(null)
        toast.error('Vehicle not found or already exited')
      }
    } catch (error) {
      toast.error('Error searching for vehicle')
      console.error('Vehicle search error:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const processExit = async () => {
    if (!foundEntry || !user) {
      toast.error('Missing required information')
      return
    }
    
    if (!paymentType || !actualAmount) {
      toast.error('Please fill in all required payment details')
      return
    }
    
    const amountNumber = parseFloat(actualAmount)
    if (isNaN(amountNumber) || amountNumber < 0) {
      toast.error('Please enter a valid amount')
      return
    }
    
    setProcessing(true)
    
    try {
      // Process vehicle exit with integrated print service
      const result = await parkingEntryService.processExit({
        entryId: foundEntry.id,
        actualFee: amountNumber,
        paymentType: paymentType,
        exitNotes: exitNotes || foundEntry.notes,
        printOptions: {
          printOnExit: true, // Auto-print will be determined by settings
          printOptions: {
            copies: 1,
            priority: 'normal'
          }
        }
      })
      
      // Store exited entry for potential reprinting
      setExitedEntry({
        ...result.entry,
        parkingFee: amountNumber,
        paymentType: paymentType,
        exitTime: new Date(),
        status: 'Exited'
      })

      // Show success message with print status
      const baseMessage = `Vehicle ${foundEntry.vehicleNumber} exited successfully! Fee: ${formatCurrency(amountNumber)}`
      const printMessage = result.printResult?.success 
        ? ' Receipt printed.'
        : result.printResult ? ` Print ${result.printResult.error ? 'failed: ' + result.printResult.error : 'queued.'}` 
        : ''
      
      toast.success(baseMessage + printMessage, { duration: 5000 })

      // Refresh store data to update dashboard and search views
      await refreshEntries()
      await refreshStatistics()

      // Reset form
      setSearchVehicleNumber('')
      setFoundEntry(null)
      setPaymentType('')
      setActualAmount('')
      setExitNotes('')
      setCalculatedFee(0)
      setDuration('')
      
    } catch (error) {
      toast.error('Error processing vehicle exit')
      console.error('Exit processing error:', error)
    } finally {
      setProcessing(false)
    }
  }
  
  const resetForm = () => {
    setSearchVehicleNumber('')
    setFoundEntry(null)
    setPaymentType('')
    setActualAmount('')
    setExitNotes('')
    setCalculatedFee(0)
    setDuration('')
    setExitedEntry(null)
  }

  const handlePrintReceipt = () => {
    if (foundEntry && paymentType && actualAmount) {
      const tempExitedEntry = {
        ...foundEntry,
        parkingFee: parseFloat(actualAmount),
        paymentType: paymentType,
        exitTime: new Date(),
        status: 'Exited'
      }
      setExitedEntry(tempExitedEntry)
      setShowPrintModal(true)
    }
  }

  return (
    <div className="space-y-6">
      <VehicleSearch
        vehicleNumber={searchVehicleNumber}
        onChange={setSearchVehicleNumber}
        onSearch={searchVehicle}
        loading={loading}
      />
      
      {foundEntry && (
        <>
          <VehicleDetails
            entry={foundEntry}
            calculatedFee={calculatedFee}
            duration={duration}
            vehicleRatesLoaded={!!vehicleRates}
          />
          
          <ExitPaymentForm
            paymentType={paymentType}
            onPaymentTypeChange={setPaymentType}
            actualAmount={actualAmount}
            onActualAmountChange={setActualAmount}
            notes={exitNotes}
            onNotesChange={setExitNotes}
            calculatedFee={calculatedFee}
            onProcessExit={processExit}
            onPrintReceipt={handlePrintReceipt}
            loading={processing}
          />
          
          <div className="flex justify-center">
            <Button 
              onClick={resetForm}
              variant="outline"
              className="px-6"
            >
              Clear Form
            </Button>
          </div>
        </>
      )}

      {/* Print Modal */}
      {showPrintModal && exitedEntry && (
        <PrintModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          entryData={{
            id: exitedEntry.id,
            vehicle_number: exitedEntry.vehicleNumber,
            vehicle_type: exitedEntry.vehicleType,
            entry_time: exitedEntry.entryTime,
            exit_time: exitedEntry.exitTime?.toISOString(),
            parking_fee: exitedEntry.parkingFee,
            serial: exitedEntry.serial
          }}
          ticketType="exit"
        />
      )}
    </div>
  )
}