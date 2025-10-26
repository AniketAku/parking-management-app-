import React, { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { Card, CardHeader, CardContent } from '../ui'
import { PrintModal } from '../printing'
import { PrintButton } from '../printing/PrintButton'
import { useParkingData } from '../../hooks/useParkingData'
import { useParkingStore } from '../../stores/parkingStore'
import parkingEntryService from '../../services/parkingEntryService'
import printStatusService from '../../services/printStatusService'
import { useBusinessSettings } from '../../hooks/useSettings'
import { useShiftLinking } from '../../hooks/useShiftLinking'
import { shiftLinkingService } from '../../services/ShiftLinkingService'
import { toast } from 'react-hot-toast'
import { log } from '../../utils/secureLogger'
import {
  formatCurrency,
  validateVehicleNumber
} from '../../utils/helpers'
import { unifiedFeeService } from '../../services/UnifiedFeeCalculationService'
import type { ParkingEntry, PaymentBreakdown } from '../../types'

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
  payments: PaymentBreakdown[]
  currentPaymentMode: 'Cash' | 'Online'
  onPaymentModeChange: (value: 'Cash' | 'Online') => void
  currentPaymentAmount: string
  onPaymentAmountChange: (value: string) => void
  currentPaymentTransactionId: string
  onPaymentTransactionIdChange: (value: string) => void
  currentPaymentNotes: string
  onPaymentNotesChange: (value: string) => void
  notes: string
  onNotesChange: (value: string) => void
  calculatedFee: number
  onAddPayment: () => void
  onRemovePayment: (id: string) => void
  onProcessExit: () => void
  loading?: boolean
  hasInvalidDuration?: boolean
}

const ExitPaymentForm: React.FC<ExitPaymentFormProps> = ({
  payments,
  currentPaymentMode,
  onPaymentModeChange,
  currentPaymentAmount,
  onPaymentAmountChange,
  currentPaymentTransactionId,
  onPaymentTransactionIdChange,
  currentPaymentNotes,
  onPaymentNotesChange,
  notes,
  onNotesChange,
  calculatedFee,
  onAddPayment,
  onRemovePayment,
  onProcessExit,
  loading,
  hasInvalidDuration
}) => {
  const [showMultiPayment, setShowMultiPayment] = React.useState(false)
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const remaining = calculatedFee - totalPaid
  const isComplete = Math.abs(remaining) < 0.01

  return (
    <Card className="border-2 border-warning-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">Exit & Payment</h3>
          <button
            onClick={() => setShowMultiPayment(!showMultiPayment)}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {showMultiPayment ? '← Simple Payment' : 'Split Payment?'}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showMultiPayment ? (
          /* Simple Single Payment Mode */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Payment Method *
                </label>
                <select
                  value={currentPaymentMode}
                  onChange={(e) => onPaymentModeChange(e.target.value as 'Cash' | 'Online')}
                  className="w-full px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:border-primary-500 transition-colors"
                >
                  <option value="Cash">💵 Cash</option>
                  <option value="Online">💳 Online</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Amount Received *
                </label>
                <input
                  type="number"
                  value={currentPaymentAmount}
                  onChange={(e) => onPaymentAmountChange(e.target.value)}
                  placeholder={`Fee: ${formatCurrency(calculatedFee)}`}
                  className="w-full px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:border-primary-500 transition-colors"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {currentPaymentMode === 'Online' && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Transaction ID (Optional)
                </label>
                <input
                  type="text"
                  value={currentPaymentTransactionId}
                  onChange={(e) => onPaymentTransactionIdChange(e.target.value)}
                  placeholder="Enter transaction reference..."
                  className="w-full px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>
            )}

            <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Parking Fee:</span>
                <span className="text-xl font-bold text-primary-600">{formatCurrency(calculatedFee)}</span>
              </div>
            </div>
          </>
        ) : (
          /* Multi-Payment Mode */
          <>
            <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg space-y-4">
              <h4 className="font-semibold text-text-primary">Add Payment</h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Payment Mode *
                  </label>
                  <select
                    value={currentPaymentMode}
                    onChange={(e) => onPaymentModeChange(e.target.value as 'Cash' | 'Online')}
                    className="w-full px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:border-primary-500 transition-colors"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Online">Online</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Amount *
                  </label>
                  <input
                    type="number"
                    value={currentPaymentAmount}
                    onChange={(e) => onPaymentAmountChange(e.target.value)}
                    placeholder={remaining > 0 ? `Remaining: ${formatCurrency(remaining)}` : '0.00'}
                    className="w-full px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:border-primary-500 transition-colors"
                    min="0"
                    step="0.01"
                  />
                </div>

                {currentPaymentMode === 'Online' && (
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Transaction ID
                    </label>
                    <input
                      type="text"
                      value={currentPaymentTransactionId}
                      onChange={(e) => onPaymentTransactionIdChange(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:border-primary-500 transition-colors"
                    />
                  </div>
                )}
              </div>

              <Button
                onClick={onAddPayment}
                disabled={!currentPaymentAmount || parseFloat(currentPaymentAmount) <= 0}
                variant="primary"
                className="w-full"
              >
                Add Payment
              </Button>
            </div>

            {/* Payments List */}
            {payments.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-text-primary">Payments Added</h4>
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-success-50 border border-success-200 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-text-primary">
                        {payment.mode}: {formatCurrency(payment.amount)}
                      </p>
                      {payment.transactionId && (
                        <p className="text-sm text-text-secondary">Transaction: {payment.transactionId}</p>
                      )}
                    </div>
                    <button
                      onClick={() => onRemovePayment(payment.id!)}
                      className="text-error-600 hover:text-error-700 font-medium px-3 py-1"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Payment Summary */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-text-secondary">Parking Fee:</span>
                <span className="font-semibold text-text-primary">{formatCurrency(calculatedFee)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-text-secondary">Total Paid:</span>
                <span className="font-semibold text-text-primary">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                <span className="text-sm font-medium text-text-secondary">Remaining:</span>
                <span className={`font-bold text-lg ${remaining > 0 ? 'text-warning-600' : 'text-success-600'}`}>
                  {formatCurrency(remaining)}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Exit Notes */}
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

        {/* Process Exit Button */}
        <div className="flex justify-end pt-4 border-t border-border-light">
          <Button
            onClick={onProcessExit}
            disabled={loading || (!showMultiPayment && !currentPaymentAmount) || (showMultiPayment && (!isComplete || payments.length === 0)) || hasInvalidDuration}
            variant="success"
            className="px-8 py-3 text-base font-semibold"
          >
            {loading ? 'Processing...' : 'Process Exit'}
          </Button>
        </div>

        {hasInvalidDuration && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-medium">
              🚨 <strong>Invalid Entry Detected:</strong> This vehicle has a future entry date. Exit processing is disabled.
            </p>
            <p className="text-xs text-red-600 mt-1">
              Please contact administrator to correct the entry time before proceeding.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface VehicleExitFormProps {
  selectedVehicleNumber?: string
  onVehicleProcessed?: () => void
  hideSearch?: boolean
}

export const VehicleExitForm: React.FC<VehicleExitFormProps> = ({
  selectedVehicleNumber,
  onVehicleProcessed,
  hideSearch = false
}) => {
  // Get real data from database and settings
  const { entries } = useParkingData()
  const { exitVehicle, refreshEntries, refreshStatistics } = useParkingStore()
  const { settings: businessSettings, loading: settingsLoading } = useBusinessSettings()
  const vehicleRates = businessSettings?.vehicle_rates

  // Shift linking hook to get active shift ID
  const { state: shiftLinkingState } = useShiftLinking()

  // Mock user for now
  const user = { name: 'Admin', role: 'admin' }

  const [searchVehicleNumber, setSearchVehicleNumber] = useState('')
  const [foundEntry, setFoundEntry] = useState<ParkingEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)

  // Payment form state - support for multiple payments
  const [paymentType, setPaymentType] = useState('')
  const [actualAmount, setActualAmount] = useState('')
  const [exitNotes, setExitNotes] = useState('')
  const [payments, setPayments] = useState<PaymentBreakdown[]>([])
  const [currentPaymentMode, setCurrentPaymentMode] = useState<'Cash' | 'Online'>('Cash')
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState('')
  const [currentPaymentTransactionId, setCurrentPaymentTransactionId] = useState('')
  const [currentPaymentNotes, setCurrentPaymentNotes] = useState('')

  const [calculatedFee, setCalculatedFee] = useState(0)
  const [duration, setDuration] = useState('')
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [exitedEntry, setExitedEntry] = useState<ParkingEntry | null>(null)
  const [hasInvalidDuration, setHasInvalidDuration] = useState(false)

  // Auto-populate search when vehicle is selected from parent
  useEffect(() => {
    if (selectedVehicleNumber && selectedVehicleNumber !== searchVehicleNumber) {
      setSearchVehicleNumber(selectedVehicleNumber)
      // Auto-trigger search
      setTimeout(() => {
        searchVehicle(selectedVehicleNumber)
      }, 100)
    }
  }, [selectedVehicleNumber])

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
          setHasInvalidDuration(false) // Valid duration

          log.debug('VehicleExitForm: Fee calculated using unified service', {
            vehicleType: foundEntry.vehicleType,
            fee,
            duration: dur
          })

        } catch (error) {
          log.error('VehicleExitForm: Fee calculation error', error)

          // 🛡️ SECURITY: Check if error is due to invalid duration (future entry date)
          if (error instanceof Error && error.message.includes('Invalid parking duration')) {
            setHasInvalidDuration(true)
            setDuration('Invalid (Future entry date)')
            setCalculatedFee(0)
            toast.error('⚠️ Invalid Entry: This vehicle has a future entry date. Cannot process exit.', {
              duration: 6000,
              icon: '🚨'
            })
          } else {
            toast.error('Error calculating parking fee. Please try again.', { duration: 3000 })
          }
        }
      }

      calculateFeeAndDuration()
    }
  }, [foundEntry])

  const searchVehicle = async (vehicleNumber?: string) => {
    const searchNumber = vehicleNumber || searchVehicleNumber

    if (!searchNumber.trim()) {
      toast.error('Please enter a vehicle number')
      return
    }

    if (!validateVehicleNumber(searchNumber)) {
      toast.error('Please enter a valid Indian vehicle number')
      return
    }

    setLoading(true)

    try {
      const normalizedSearch = searchNumber.replace(/\s/g, '').toUpperCase()
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
      log.error('Vehicle search error', error)
    } finally {
      setLoading(false)
    }
  }
  
  const processExit = async () => {
    if (!foundEntry || !user) {
      toast.error('Missing required information')
      return
    }

    // Determine if we're using simple mode or multi-payment mode
    const isSimpleMode = payments.length === 0 && currentPaymentAmount
    let paymentsToProcess: PaymentBreakdown[] = []

    if (isSimpleMode) {
      // Simple mode: create single payment from current fields
      const amount = parseFloat(currentPaymentAmount)
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid payment amount')
        return
      }

      paymentsToProcess = [{
        id: Date.now().toString(),
        mode: currentPaymentMode,
        amount,
        transactionId: currentPaymentTransactionId || undefined,
        notes: currentPaymentNotes || undefined
      }]
    } else {
      // Multi-payment mode: validate payments array
      if (payments.length === 0) {
        toast.error('Please add at least one payment')
        return
      }
      paymentsToProcess = payments
    }

    // Calculate total from payments
    const totalPaid = paymentsToProcess.reduce((sum, p) => sum + p.amount, 0)

    // Validate total matches calculated fee (with small tolerance for rounding)
    if (Math.abs(totalPaid - calculatedFee) > 0.01) {
      toast.error(`Payment total (${formatCurrency(totalPaid)}) must match parking fee (${formatCurrency(calculatedFee)})`)
      return
    }

    setProcessing(true)

    try {
      // ✅ Use shift-aware exit service with payment breakdown
      const result = await shiftLinkingService.processVehicleExitWithShift(
        foundEntry.id,
        paymentsToProcess,
        exitNotes || foundEntry.notes
      )

      if (!result.success) {
        toast.error(result.message)
        return
      }

      // Determine final payment type for display
      const hasCash = paymentsToProcess.some(p => p.mode === 'Cash')
      const hasOnline = paymentsToProcess.some(p => p.mode === 'Online')
      const finalPaymentType = hasCash && hasOnline ? 'Mixed' : (hasCash ? 'Cash' : 'Online')

      // Store exited entry for potential reprinting
      setExitedEntry({
        ...result.entry,
        parkingFee: totalPaid,
        paymentType: finalPaymentType,
        exitTime: new Date(),
        status: 'Exited'
      })

      // Show success message
      toast.success(`Vehicle ${foundEntry.vehicleNumber} exited successfully! Fee: ${formatCurrency(totalPaid)}`, { duration: 5000 })

      // Refresh store data to update dashboard and search views
      await refreshEntries()
      await refreshStatistics()

      // Reset form
      setSearchVehicleNumber('')
      setFoundEntry(null)
      setPaymentType('')
      setActualAmount('')
      setExitNotes('')
      setPayments([])
      setCurrentPaymentMode('Cash')
      setCurrentPaymentAmount('')
      setCurrentPaymentTransactionId('')
      setCurrentPaymentNotes('')
      setCalculatedFee(0)
      setDuration('')

    } catch (error) {
      toast.error('Error processing vehicle exit')
      log.error('Exit processing error', error)
    } finally {
      setProcessing(false)
    }
  }
  
  const addPayment = () => {
    if (!currentPaymentAmount || parseFloat(currentPaymentAmount) <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }

    const amount = parseFloat(currentPaymentAmount)
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)

    // Check if adding this payment would exceed the parking fee
    if (totalPaid + amount > calculatedFee) {
      toast.error(`Payment amount would exceed parking fee. Remaining: ${formatCurrency(calculatedFee - totalPaid)}`)
      return
    }

    const newPayment: PaymentBreakdown = {
      id: Date.now().toString(),
      mode: currentPaymentMode,
      amount,
      transactionId: currentPaymentTransactionId || undefined,
      notes: currentPaymentNotes || undefined
    }

    setPayments([...payments, newPayment])
    setCurrentPaymentAmount('')
    setCurrentPaymentTransactionId('')
    setCurrentPaymentNotes('')
    toast.success('Payment added')
  }

  const removePayment = (paymentId: string) => {
    setPayments(payments.filter(p => p.id !== paymentId))
    toast.success('Payment removed')
  }

  const resetForm = () => {
    setSearchVehicleNumber('')
    setFoundEntry(null)
    setPaymentType('')
    setActualAmount('')
    setExitNotes('')
    setPayments([])
    setCurrentPaymentMode('Cash')
    setCurrentPaymentAmount('')
    setCurrentPaymentTransactionId('')
    setCurrentPaymentNotes('')
    setCalculatedFee(0)
    setDuration('')
    setExitedEntry(null)

    // Notify parent that vehicle has been processed
    if (onVehicleProcessed) {
      onVehicleProcessed()
    }
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
      {!hideSearch && (
        <VehicleSearch
          vehicleNumber={searchVehicleNumber}
          onChange={setSearchVehicleNumber}
          onSearch={searchVehicle}
          loading={loading}
        />
      )}

      {foundEntry && (
        <>
          <VehicleDetails
            entry={foundEntry}
            calculatedFee={calculatedFee}
            duration={duration}
            vehicleRatesLoaded={!!vehicleRates}
          />
          
          <ExitPaymentForm
            payments={payments}
            currentPaymentMode={currentPaymentMode}
            onPaymentModeChange={setCurrentPaymentMode}
            currentPaymentAmount={currentPaymentAmount}
            onPaymentAmountChange={setCurrentPaymentAmount}
            currentPaymentTransactionId={currentPaymentTransactionId}
            onPaymentTransactionIdChange={setCurrentPaymentTransactionId}
            currentPaymentNotes={currentPaymentNotes}
            onPaymentNotesChange={setCurrentPaymentNotes}
            notes={exitNotes}
            onNotesChange={setExitNotes}
            calculatedFee={calculatedFee}
            onAddPayment={addPayment}
            onRemovePayment={removePayment}
            onProcessExit={processExit}
            loading={processing}
            hasInvalidDuration={hasInvalidDuration}
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