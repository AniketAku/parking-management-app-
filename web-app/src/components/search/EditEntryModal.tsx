import React, { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal'
import { Badge } from '../ui/badge'
import { Input } from '../ui/Input'
import { Select } from '../ui/select'
import { ParkingService } from '../../services/parkingService'
import { unifiedFeeService } from '../../services/UnifiedFeeCalculationService'  // ✅ Correct import - singleton instance
import { useSettingsCategory } from '../../hooks/useSettings'
import { formatDateTime, getVehicleTypeColor } from '../../utils/helpers'
import { toast } from 'react-hot-toast'
import type { ParkingEntry } from '../../types'

interface EditEntryModalProps {
  entry: ParkingEntry | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: (updatedEntry: ParkingEntry) => void
  canEditEntryDates?: boolean  // 🛡️ ADMIN-ONLY permission flag
}

export const EditEntryModal: React.FC<EditEntryModalProps> = ({
  entry,
  isOpen,
  onClose,
  onSuccess,
  canEditEntryDates = false  // Default to false for security
}) => {
  const { settings } = useSettingsCategory('business')
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    transportName: '',
    driverName: '',
    vehicleType: '',
    notes: '',
    paymentStatus: '' as 'Paid' | 'Unpaid' | 'Pending',
    paymentType: '',
    actualFee: '',
    status: '' as 'Active' | 'Exited',  // ✅ Database uses 'Active' not 'Parked'
    entryDate: '',  // 🛡️ ADMIN-ONLY: Entry date editing
    entryTime: ''   // 🛡️ ADMIN-ONLY: Entry time editing
  })

  const [originalEntryDateTime, setOriginalEntryDateTime] = useState<string>('')  // Track original for audit trail
  const [dateValidationError, setDateValidationError] = useState<string>('')  // Future date validation

  // Initialize form data when entry changes
  useEffect(() => {
    if (entry) {
      const entryDateTime = new Date(entry.entryTime)
      const entryDateStr = entryDateTime.toISOString().split('T')[0]
      const entryTimeStr = entryDateTime.toTimeString().slice(0, 5)

      setFormData({
        transportName: entry.transportName || '',
        driverName: entry.driverName || '',
        vehicleType: entry.vehicleType || '',
        notes: entry.notes || '',
        paymentStatus: entry.paymentStatus || 'Unpaid',
        paymentType: entry.paymentType || '',
        actualFee: entry.actualFee?.toString() || '',
        status: entry.status || 'Active',  // ✅ Database uses 'Active' for parked vehicles
        entryDate: entryDateStr,
        entryTime: entryTimeStr
      })

      // Store original entry date/time for audit trail
      setOriginalEntryDateTime(entry.entryTime)
      setDateValidationError('')  // Clear any previous validation errors
    }
  }, [entry])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // 🛡️ SECURITY: Validate entry date/time when changed (prevent future dates)
    if ((field === 'entryDate' || field === 'entryTime') && canEditEntryDates) {
      const updatedDate = field === 'entryDate' ? value : formData.entryDate
      const updatedTime = field === 'entryTime' ? value : formData.entryTime

      if (updatedDate && updatedTime) {
        const entryDateTime = new Date(`${updatedDate}T${updatedTime}:00`)
        const currentTime = new Date()

        if (entryDateTime > currentTime) {
          setDateValidationError(`Entry date/time cannot be in the future (entered: ${entryDateTime.toLocaleString()})`)
        } else {
          setDateValidationError('')
        }
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!entry) return

    // 🛡️ SECURITY: Block submission if future date validation failed
    if (dateValidationError) {
      toast.error('Cannot save: Entry date is in the future', { duration: 4000 })
      return
    }

    setIsLoading(true)

    try {
      // Prepare update data - include all editable fields
      const updateData: any = {
        transport_name: formData.transportName,
        driver_name: formData.driverName,
        vehicle_type: formData.vehicleType,
        notes: formData.notes || null,
        payment_status: formData.paymentStatus,
        payment_type: formData.paymentType || null,
        actual_fee: formData.actualFee ? parseFloat(formData.actualFee) : null
      }

      // 🛡️ ADMIN-ONLY: Handle entry date/time changes with fee recalculation and audit trail
      if (canEditEntryDates && formData.entryDate && formData.entryTime) {
        const newEntryDateTime = new Date(`${formData.entryDate}T${formData.entryTime}:00`)
        const newEntryISO = newEntryDateTime.toISOString()

        // Check if entry date actually changed
        if (newEntryISO !== originalEntryDateTime) {
          console.log('🔄 Entry date changed - recalculating fees and adding audit trail', {
            original: originalEntryDateTime,
            new: newEntryISO,
            vehicleType: formData.vehicleType
          })

          // Update entry time
          updateData.entry_time = newEntryISO

          // Recalculate fee based on new entry time
          try {
            const exitTime = entry.exitTime ? new Date(entry.exitTime) : new Date()
            const recalculatedFee = await unifiedFeeService.calculateParkingFee(
              formData.vehicleType,
              newEntryISO,
              exitTime.toISOString(),
              { debugContext: `EditEntryModal - Entry date changed from ${formatDateTime(originalEntryDateTime)} to ${formatDateTime(newEntryISO)}` }
            )

            updateData.calculated_fee = recalculatedFee

            console.log('✅ Fee recalculated', {
              originalEntryTime: originalEntryDateTime,
              newEntryTime: newEntryISO,
              originalFee: entry.calculatedFee,
              recalculatedFee
            })
          } catch (feeError) {
            console.error('❌ Fee recalculation failed:', feeError)
            toast.error('Error recalculating fee. Please review manually.', { duration: 5000 })
          }

          // 📝 AUDIT TRAIL: Add automatic note about entry date change
          const auditNote = `[ADMIN] Entry date changed from ${formatDateTime(originalEntryDateTime)} to ${formatDateTime(newEntryISO)} by admin. Fee recalculated.`
          updateData.notes = formData.notes
            ? `${formData.notes}\n\n${auditNote}`
            : auditNote
        }
      }

      // ✅ Handle status changes with proper exit time logic
      if (formData.status !== entry.status) {
        updateData.status = formData.status

        // Set exit time when changing to Exited
        if (formData.status === 'Exited' && !entry.exitTime) {
          updateData.exit_time = new Date().toISOString()
        }

        // Clear exit time when reverting to Active (accidental entry correction)
        if (formData.status === 'Active' && entry.exitTime) {
          updateData.exit_time = null
          // Add audit note for status reversion
          const revertNote = `[CORRECTION] Status changed from Exited back to Active for correction.`
          updateData.notes = updateData.notes
            ? `${updateData.notes}\n\n${revertNote}`
            : revertNote
        }
      }

      const updatedEntry = await ParkingService.updateEntry(entry.id, updateData)

      toast.success('Entry updated successfully!')
      onSuccess?.(updatedEntry)
      onClose()
    } catch (error) {
      console.error('Error updating entry:', error)
      toast.error('Failed to update entry. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!entry) return null

  const vehicleTypes = settings?.vehicle_types || ['Trailer', '6 Wheeler', '4 Wheeler', '2 Wheeler']
  const paymentMethods = settings?.payment_methods || ['Cash', 'UPI', 'Card', 'Net Banking']
  const paymentStatusOptions = settings?.payment_status_options || ['Paid', 'Unpaid', 'Pending']
  // ✅ Allow changing status to Active for accidental entry correction
  const statusOptions = ['Active', 'Exited']

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit}>
        <ModalHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-text-primary">
              Edit Vehicle Entry
            </h2>
            <div className="flex items-center space-x-2">
              <Badge 
                variant="secondary" 
                className={getVehicleTypeColor(entry.vehicleType)}
              >
                {entry.vehicleType}
              </Badge>
            </div>
          </div>
        </ModalHeader>

        <ModalBody>
          <div className="space-y-6">
            {/* Vehicle Information */}
            <div className="bg-surface-light rounded-lg p-4">
              <h3 className="text-lg font-medium text-text-primary mb-4">
                Vehicle Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary">
                    Vehicle Number
                  </label>
                  <p className="mt-1 text-lg font-semibold text-text-primary">
                    {entry.vehicleNumber}
                  </p>
                </div>

                {/* 🛡️ ADMIN-ONLY: Entry Date/Time Editing */}
                {canEditEntryDates ? (
                  <>
                    <div>
                      <Input
                        label="Entry Date"
                        type="date"
                        value={formData.entryDate}
                        onChange={(e) => handleInputChange('entryDate', e.target.value)}
                        required
                        helpText="🔐 Admin-only: Changes trigger fee recalculation"
                      />
                    </div>
                    <div>
                      <Input
                        label="Entry Time"
                        type="time"
                        value={formData.entryTime}
                        onChange={(e) => handleInputChange('entryTime', e.target.value)}
                        required
                        helpText="🔐 Admin-only: Cannot be in the future"
                      />
                    </div>
                    {dateValidationError && (
                      <div className="md:col-span-2">
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-800 font-medium">
                            ⚠️ <strong>Validation Error:</strong> {dateValidationError}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-text-secondary">
                      Entry Time (Read-only)
                    </label>
                    <p className="mt-1 text-base text-text-primary">
                      {formatDateTime(entry.entryTime)}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-text-secondary">
                    Calculated Fee
                  </label>
                  <p className="mt-1 text-base text-text-primary">
                    ₹{entry.calculatedFee}
                    {canEditEntryDates && <span className="ml-2 text-xs text-text-secondary">(will recalculate if date changed)</span>}
                  </p>
                </div>
                {entry.exitTime && (
                  <div>
                    <label className="block text-sm font-medium text-text-secondary">
                      Exit Time
                    </label>
                    <p className="mt-1 text-base text-text-primary">
                      {formatDateTime(entry.exitTime)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Editable Fields */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-text-primary">
                Editable Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Transport Company"
                  type="text"
                  value={formData.transportName}
                  onChange={(e) => handleInputChange('transportName', e.target.value)}
                  required
                />

                <Input
                  label="Driver Name"
                  type="text"
                  value={formData.driverName}
                  onChange={(e) => handleInputChange('driverName', e.target.value)}
                  required
                />

                <Select
                  label="Vehicle Type"
                  value={formData.vehicleType}
                  onChange={(value) => handleInputChange('vehicleType', value)}
                  options={vehicleTypes.map(type => ({ value: type, label: type }))}
                  required
                />

                <Select
                  label="Entry Status"
                  value={formData.status}
                  onChange={(value) => handleInputChange('status', value)}
                  options={statusOptions.map(status => ({ value: status, label: status }))}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Payment Status"
                  value={formData.paymentStatus}
                  onChange={(value) => handleInputChange('paymentStatus', value)}
                  options={paymentStatusOptions.map(status => ({ value: status, label: status }))}
                  required
                />

                <Select
                  label="Payment Method"
                  value={formData.paymentType}
                  onChange={(value) => handleInputChange('paymentType', value)}
                  options={[
                    { value: '', label: 'Select method...' },
                    ...paymentMethods.map(method => ({ value: method, label: method }))
                  ]}
                />

                <Input
                  label="Actual Fee (₹)"
                  type="number"
                  value={formData.actualFee}
                  onChange={(e) => handleInputChange('actualFee', e.target.value)}
                  placeholder={`Default: ₹${entry.calculatedFee}`}
                  helpText="Leave empty to use calculated fee"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Add any additional notes..."
                  className="form-input"
                />
              </div>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-border-light rounded-lg hover:bg-surface-light transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </ModalFooter>
      </form>
    </Modal>
  )
}