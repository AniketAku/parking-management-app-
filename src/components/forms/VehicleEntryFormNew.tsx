import React, { useState, useMemo } from 'react'
import { Button, Input, Select, Card, CardHeader, CardBody, CardFooter } from '../ui'
import type { VehicleEntryForm as VehicleEntryFormType, ParkingEntry } from '../../types'
import type { SelectOption } from '../ui/Select'
import { useParkingStore } from '../../stores/parkingStore'
import { usePermissions } from '../../hooks/useAuth'
import { useBusinessSettings } from '../../hooks/useNewSettings'
import { useFormValidation } from '../../hooks/useFormValidation'
import { PrintButton } from '../printing/PrintButton'
import { usePrintSettings } from '../../hooks/usePrintSettings'
import parkingEntryService from '../../services/parkingEntryService'
import toast from 'react-hot-toast'
import { useErrorHandler } from '../../hooks/useErrorHandler'

interface VehicleEntryFormProps {
  onSuccess?: (entry: ParkingEntry) => void
  onCancel?: () => void
}

export const VehicleEntryFormNew: React.FC<VehicleEntryFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  // NEW: Use simplified settings hook
  const {
    vehicleRates,
    vehicleTypes,
    loading: settingsLoading,
    error: settingsError,
    statusText,
    statusIcon,
    isConfigured,
    hasVehicleRates,
    getVehicleRate
  } = useBusinessSettings()

  console.log('🔍 VehicleEntryForm - Business Settings State:', {
    vehicleRates,
    vehicleTypes,
    settingsLoading,
    settingsError,
    isConfigured,
    hasVehicleRates
  })

  const [formData, setFormData] = useState<VehicleEntryFormType>({
    transportName: '',
    vehicleType: '',
    vehicleNumber: '',
    driverName: '',
    notes: '',
    entryTime: new Date().toLocaleTimeString('en-GB', { hour12: false }).substring(0, 5),
    entryDate: new Date().toLocaleDateString('en-CA')
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form validation
  const { errors, validate, clearError } = useFormValidation({
    transportName: { required: true, minLength: 2 },
    vehicleType: { required: true },
    vehicleNumber: { required: true, pattern: /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{1,4}$/ },
    driverName: { required: true, minLength: 2 },
    entryTime: { required: true },
    entryDate: { required: true }
  })

  // Permissions
  const { canCreateEntries } = usePermissions()
  const { config: printConfig } = usePrintSettings()
  const { handleError } = useErrorHandler({
    component: 'VehicleEntryForm',
    showToast: true,
    logErrors: true
  })

  // Create vehicle type options
  const vehicleTypeOptions: SelectOption[] = useMemo(() => {
    if (vehicleTypes && vehicleTypes.length > 0) {
      return vehicleTypes.map(type => ({
        value: type,
        label: type
      }))
    }
    
    // Fallback if no types are configured
    return [
      { value: 'Trailer', label: 'Trailer' },
      { value: '6 Wheeler', label: '6 Wheeler' },
      { value: '4 Wheeler', label: '4 Wheeler' },
      { value: '2 Wheeler', label: '2 Wheeler' }
    ]
  }, [vehicleTypes])

  console.log('🚗 Vehicle types options:', vehicleTypeOptions)

  // Calculate daily rate for selected vehicle type
  const dailyRate = useMemo(() => {
    if (!formData.vehicleType) return 0
    return getVehicleRate(formData.vehicleType)
  }, [formData.vehicleType, getVehicleRate])

  // Handle form changes
  const handleChange = (field: keyof VehicleEntryFormType, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    clearError(field)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!canCreateEntries) {
      toast.error('You do not have permission to create parking entries')
      return
    }

    if (isSubmitting) return

    // Validate form
    const validationErrors = validate(formData)
    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.values(validationErrors)[0]
      toast.error(`Please fix the following error: ${firstError}`)
      return
    }

    try {
      setIsSubmitting(true)

      // Combine date and time
      const entryDateTime = new Date(`${formData.entryDate}T${formData.entryTime}:00`)

      const entryData: Partial<ParkingEntry> = {
        transportName: formData.transportName.trim(),
        vehicleType: formData.vehicleType,
        vehicleNumber: formData.vehicleNumber.trim().toUpperCase(),
        driverName: formData.driverName.trim(),
        notes: formData.notes?.trim() || undefined,
        entryTime: entryDateTime.toISOString(),
        status: 'Active',
        paymentStatus: 'Pending',
        calculatedFee: dailyRate
      }

      const result = await parkingEntryService.create(entryData)
      
      if (result.success && result.data) {
        toast.success('Vehicle entry created successfully!')
        
        // Reset form
        setFormData({
          transportName: '',
          vehicleType: '',
          vehicleNumber: '',
          driverName: '',
          notes: '',
          entryTime: new Date().toLocaleTimeString('en-GB', { hour12: false }).substring(0, 5),
          entryDate: new Date().toLocaleDateString('en-CA')
        })

        onSuccess?.(result.data)
      } else {
        throw new Error(result.error || 'Failed to create vehicle entry')
      }
    } catch (error) {
      console.error('Vehicle entry creation failed:', error)
      handleError(error, 'Failed to create vehicle entry')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle form reset
  const handleReset = () => {
    setFormData({
      transportName: '',
      vehicleType: '',
      vehicleNumber: '',
      driverName: '',
      notes: '',
      entryTime: new Date().toLocaleTimeString('en-GB', { hour12: false }).substring(0, 5),
      entryDate: new Date().toLocaleDateString('en-CA')
    })
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Vehicle Entry</h2>
            <div className="text-sm text-gray-600">
              Register new vehicles for parking
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardBody className="space-y-6">
            {/* Vehicle Information Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Transport Company*"
                value={formData.transportName}
                onChange={(value) => handleChange('transportName', value)}
                error={errors.transportName}
                placeholder="Enter transport company name"
                required
                disabled={isSubmitting}
              />

              <Select
                label="Vehicle Type*"
                value={formData.vehicleType}
                onChange={(value) => handleChange('vehicleType', value)}
                options={vehicleTypeOptions}
                error={errors.vehicleType}
                placeholder="Select vehicle type"
                required
                disabled={isSubmitting}
              />

              <Input
                label="Vehicle Number*"
                value={formData.vehicleNumber}
                onChange={(value) => handleChange('vehicleNumber', value.toUpperCase())}
                error={errors.vehicleNumber}
                placeholder="e.g., MH12AB1234"
                required
                disabled={isSubmitting}
              />

              <Input
                label="Driver Name*"
                value={formData.driverName}
                onChange={(value) => handleChange('driverName', value)}
                error={errors.driverName}
                placeholder="Enter driver's full name"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Timing Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                type="date"
                label="Entry Date*"
                value={formData.entryDate}
                onChange={(value) => handleChange('entryDate', value)}
                error={errors.entryDate}
                required
                disabled={isSubmitting}
              />

              <Input
                type="time"
                label="Entry Time*"
                value={formData.entryTime}
                onChange={(value) => handleChange('entryTime', value)}
                error={errors.entryTime}
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Notes Section */}
            <div>
              <Input
                label="Notes (Optional)"
                value={formData.notes}
                onChange={(value) => handleChange('notes', value)}
                placeholder="Additional notes or remarks"
                disabled={isSubmitting}
              />
            </div>

            {/* Settings Status Display */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">{statusIcon}</span>
                <span className="font-medium text-gray-700">Settings Status:</span>
                <span className="text-gray-600">{statusText}</span>
              </div>
              
              {formData.vehicleType && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Daily Rate for {formData.vehicleType}:</span>
                  <span className="ml-2 text-lg font-semibold text-green-600">
                    ₹{dailyRate}
                  </span>
                  {!hasVehicleRates && (
                    <span className="ml-2 text-orange-600">(using fallback rate)</span>
                  )}
                </div>
              )}
            </div>
          </CardBody>

          <CardFooter className="flex items-center justify-between">
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isSubmitting}
              >
                Reset
              </Button>
              
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !canCreateEntries}
                loading={isSubmitting}
              >
                {isSubmitting ? 'Creating Entry...' : 'Park Vehicle'}
              </Button>

              {printConfig.showPrintButton && (
                <PrintButton
                  type="entry"
                  disabled={!formData.vehicleNumber || isSubmitting}
                  data={{
                    transportName: formData.transportName,
                    vehicleType: formData.vehicleType,
                    vehicleNumber: formData.vehicleNumber,
                    driverName: formData.driverName,
                    entryTime: `${formData.entryDate} ${formData.entryTime}`,
                    dailyRate: dailyRate
                  }}
                />
              )}
            </div>
          </CardFooter>
        </form>
      </Card>

      {/* Entry Instructions */}
      <Card className="mt-6">
        <CardBody>
          <h3 className="font-medium text-gray-900 mb-2">Entry Instructions</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Ensure all vehicle details are accurate before submitting</li>
            <li>• Vehicle number should be in the format: MH12AB1234</li>
            <li>• Daily rates are calculated automatically based on vehicle type</li>
            <li>• Entry receipt can be printed after successful registration</li>
          </ul>
        </CardBody>
      </Card>
    </div>
  )
}

export default VehicleEntryFormNew