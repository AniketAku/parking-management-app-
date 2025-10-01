import React, { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal'
import { Badge } from '../ui/badge'
import { Input } from '../ui/Input'
import { Select } from '../ui/select'
import { ParkingService } from '../../services/parkingService'
import { useSettingsCategory } from '../../hooks/useSettings'
import { formatDateTime, getVehicleTypeColor } from '../../utils/helpers'
import { toast } from 'react-hot-toast'
import type { ParkingEntry } from '../../types'

interface EditEntryModalProps {
  entry: ParkingEntry | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: (updatedEntry: ParkingEntry) => void
}

export const EditEntryModal: React.FC<EditEntryModalProps> = ({
  entry,
  isOpen,
  onClose,
  onSuccess
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
    status: '' as 'Parked' | 'Exited'
  })

  // Initialize form data when entry changes
  useEffect(() => {
    if (entry) {
      setFormData({
        transportName: entry.transportName || '',
        driverName: entry.driverName || '',
        vehicleType: entry.vehicleType || '',
        notes: entry.notes || '',
        paymentStatus: entry.paymentStatus || 'Unpaid',
        paymentType: entry.paymentType || '',
        actualFee: entry.actualFee?.toString() || '',
        status: entry.status || 'Parked'
      })
    }
  }, [entry])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!entry) return

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

      // Only allow status change from Parked to Exited, not the reverse
      if (entry.status === 'Parked' && formData.status === 'Exited') {
        updateData.status = 'Exited'
        updateData.exit_time = new Date().toISOString()
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
  const statusOptions = entry.status === 'Parked' ? ['Parked', 'Exited'] : ['Exited']

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
            {/* Read-only Vehicle Information */}
            <div className="bg-surface-light rounded-lg p-4">
              <h3 className="text-lg font-medium text-text-primary mb-4">
                Vehicle Information (Read-only)
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
                <div>
                  <label className="block text-sm font-medium text-text-secondary">
                    Entry Time
                  </label>
                  <p className="mt-1 text-base text-text-primary">
                    {formatDateTime(entry.entryTime)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary">
                    Calculated Fee
                  </label>
                  <p className="mt-1 text-base text-text-primary">
                    ₹{entry.calculatedFee}
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