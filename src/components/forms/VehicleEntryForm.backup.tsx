import React, { useState, useMemo } from 'react'
import { Button, Input, Select, Card, CardHeader, CardBody, CardFooter } from '../ui'
import type { VehicleEntryForm as VehicleEntryFormType, ParkingEntry } from '../../types'
import type { SelectOption } from '../ui/Select'
import { useParkingStore } from '../../stores/parkingStore'
import { usePermissions } from '../../hooks/useAuth'
import { useBusinessSettings } from '../../hooks/useSettings'
import { useFormValidation } from '../../hooks/useFormValidation'
import { PrintButton } from '../printing/PrintButton'
import { SettingsSeeder } from '../admin/SettingsSeeder'
import { usePrintSettings } from '../../hooks/usePrintSettings'
import parkingEntryService from '../../services/parkingEntryService'
import toast from 'react-hot-toast'
import { useErrorHandler } from '../../hooks/useErrorHandler'


interface VehicleEntryFormProps {
  onSuccess?: (entry: ParkingEntry) => void
  onCancel?: () => void
}

export const VehicleEntryForm: React.FC<VehicleEntryFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  // Business settings with real-time updates
  const {
    vehicle_rates: vehicleRates,
    loading,
    error
  } = useBusinessSettings()

  // Standardized error handling
  const { handleError } = useErrorHandler({
    component: 'VehicleEntryForm',
    showToast: false, // We'll handle toast manually for better UX
    logErrors: true
  })

  // Derive status from settings state
  const isConfigured = !!vehicleRates && !loading && !error
  const statusText = loading 
    ? 'Loading business configuration...'
    : error 
    ? `Configuration error: ${error}`
    : isConfigured 
    ? 'Business settings loaded from database'
    : 'Using default business settings'
  
  const statusIcon = loading
    ? '🔄'
    : error
    ? '❌'
    : isConfigured
    ? '🟢'
    : '🟡'

  // Debug logging to diagnose settings propagation
  console.log('🔍 VehicleEntryForm Debug:', {
    vehicleRates,
    loading,
    error,
    isConfigured,
    statusText,
    hasVehicleRates: !!vehicleRates,
    vehicleRatesKeys: vehicleRates ? Object.keys(vehicleRates) : [],
    timestamp: new Date().toISOString()
  })
  
  // Use vehicle rates from business config with built-in fallbacks
  const effectiveRates = vehicleRates || {
    'Trailer': 225,
    '6 Wheeler': 150, 
    '4 Wheeler': 100,
    '2 Wheeler': 50
  }

  // Helper function for getting vehicle rate
  const getVehicleRate = (vehicleType: string): number => {
    if (!effectiveRates) return 0
    return effectiveRates[vehicleType] || 0
  }
  
  // Enhanced form validation with centralized rules
  const {
    validateTransportName,
    validateVehicleNumber: validateVehicleNum,
    validateDriverName,
    validateNotes,
    isRulesLoaded
  } = useFormValidation()
  
  const [formData, setFormData] = useState<VehicleEntryFormType>({
    transportName: '',
    vehicleType: 'Trailer',
    vehicleNumber: '',
    driverName: '',
    notes: '',
  })

  // Initialize with current date and time
  const getCurrentDateTime = () => {
    const now = new Date()
    const date = now.toISOString().split('T')[0]
    const time = now.toTimeString().slice(0, 5)
    return { date, time }
  }

  const [entryDateTime, setEntryDateTime] = useState(getCurrentDateTime())
  const [useCurrentTime, setUseCurrentTime] = useState(true)

  const [errors, setErrors] = useState<Partial<Record<keyof VehicleEntryFormType, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdEntry, setCreatedEntry] = useState<ParkingEntry | null>(null)

  const { createEntry } = useParkingStore()
  const { canWrite } = usePermissions()
  const { shouldAutoPrint } = usePrintSettings()

  // Create dynamic vehicle types and rates from business config
  const { vehicleTypes, rateSource } = useMemo(() => {
    const rates = effectiveRates
    
    const types: SelectOption[] = Object.entries(rates).map(([type, rate]) => ({
      value: type,
      label: `${type} (₹${Number(rate).toLocaleString()}/day)`
    }))
    
    // Determine rate source for debugging
    const source = isConfigured ? 'database' : 'fallback'
    
    console.log(`💰 Vehicle types created from ${source} rates:`, types.length, 'types')
    if (error) {
      console.log(`⚠️ Business config error: ${error}`)
    }
    
    return {
      vehicleTypes: types,
      rateSource: source
    }
  }, [effectiveRates, vehicleRates, isConfigured, error])

  // Enhanced validation using centralized rules
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof VehicleEntryFormType, string>> = {}

    // Use centralized validation functions
    const transportNameError = validateTransportName(formData.transportName)
    if (transportNameError) {
      newErrors.transportName = transportNameError
    }

    // Vehicle type validation
    if (!formData.vehicleType) {
      newErrors.vehicleType = 'Vehicle type is required'
    }

    // Vehicle number validation using centralized function
    const vehicleNumberError = validateVehicleNum(formData.vehicleNumber)
    if (vehicleNumberError) {
      newErrors.vehicleNumber = vehicleNumberError
    }

    // Driver name validation (optional)
    const driverNameError = validateDriverName(formData.driverName)
    if (driverNameError) {
      newErrors.driverName = driverNameError
    }

    // Notes validation using centralized function
    const notesError = validateNotes(formData.notes || '')
    if (notesError) {
      newErrors.notes = notesError
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof VehicleEntryFormType) => (
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'vehicleNumber' ? value.toUpperCase() : value,
    }))

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!canWrite) {
      toast.error('You do not have permission to create entries')
      return
    }

    if (!validateForm()) {
      toast.error('Please fix the form errors before submitting')
      return
    }

    setIsSubmitting(true)

    try {
      // Determine entry timestamp - use manual override if provided, otherwise current time
      const entryTimestamp = useCurrentTime 
        ? new Date().toISOString()
        : new Date(`${entryDateTime.date}T${entryDateTime.time}:00.000Z`).toISOString()

      // Create database entry request
      const entryRequest = {
        transport_name: formData.transportName.trim(),
        vehicle_type: formData.vehicleType,
        vehicle_number: formData.vehicleNumber.trim(),
        driver_name: formData.driverName.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
        calculated_fee: getVehicleRate(formData.vehicleType),
        entry_time: entryTimestamp,
      }

      // Create entry with integrated print service
      const result = await parkingEntryService.createEntry({
        ...entryRequest,
        printOptions: {
          printOnEntry: true, // Auto-print will be determined by settings
          printOptions: {
            copies: 1,
            priority: 'normal'
          }
        }
      })

      // Store created entry for printing
      setCreatedEntry(result.entry)

      // Show success message with print status
      const baseMessage = `Vehicle ${result.entry.vehicleNumber} parked successfully!`
      const printMessage = result.printResult?.success 
        ? ' Entry ticket printed.'
        : result.printResult ? ` Print ${result.printResult.error ? 'failed: ' + result.printResult.error : 'queued.'}` 
        : ''
      
      toast.success(baseMessage + printMessage, { duration: 5000 })

      // Reset form
      setFormData({
        transportName: '',
        vehicleType: 'Trailer',
        vehicleNumber: '',
        driverName: '',
        notes: '',
      })
      
      // Reset date/time to current
      setEntryDateTime(getCurrentDateTime())
      setUseCurrentTime(true)

      // Callback
      onSuccess?.(entry)

    } catch (error) {
      // Handle error with standardized error handling
      const standardizedError = await handleError(error, {
        action: 'createEntry',
        metadata: {
          vehicleNumber: formData.vehicleNumber,
          transportName: formData.transportName,
          vehicleType: formData.vehicleType
        }
      })
      
      // Show user-friendly error message
      toast.error(standardizedError.userMessage, {
        duration: standardizedError.severity === 'critical' ? 0 : 6000
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setFormData({
      transportName: '',
      vehicleType: 'Trailer',
      vehicleNumber: '',
      driverName: '',
      notes: '',
    })
    setErrors({})
    setEntryDateTime(getCurrentDateTime())
    setUseCurrentTime(true)
  }

  const handleDateTimeChange = (field: 'date' | 'time') => (value: string) => {
    setEntryDateTime(prev => ({ ...prev, [field]: value }))
    setUseCurrentTime(false)
  }

  const handleUseCurrentTimeToggle = () => {
    if (!useCurrentTime) {
      setEntryDateTime(getCurrentDateTime())
    }
    setUseCurrentTime(!useCurrentTime)
  }

  const selectedRate = getVehicleRate(formData.vehicleType)

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader
        title="Vehicle Entry"
        subtitle="Register a new vehicle entry"
      >
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Transport Name */}
            <Input
              label="Transport Name"
              value={formData.transportName}
              onChange={(e) => handleInputChange('transportName')(e.target.value)}
              placeholder="Enter transport company name"
              required
              error={errors.transportName}
              disabled={isSubmitting}
            />

            {/* Vehicle Type */}
            <Select
              label="Vehicle Type"
              options={vehicleTypes}
              value={formData.vehicleType}
              onChange={handleInputChange('vehicleType')}
              required
              error={errors.vehicleType}
              disabled={isSubmitting || loading}
            />

            {/* Vehicle Number */}
            <Input
              label="Vehicle Number"
              value={formData.vehicleNumber}
              onChange={(e) => handleInputChange('vehicleNumber')(e.target.value)}
              placeholder="e.g., MH12AB3456"
              required
              error={errors.vehicleNumber}
              disabled={isSubmitting}
              className="uppercase"
            />

            {/* Driver Name */}
            <Input
              label="Driver Name (Optional)"
              value={formData.driverName}
              onChange={(e) => handleInputChange('driverName')(e.target.value)}
              placeholder="Enter driver's full name (optional)"
              error={errors.driverName}
              disabled={isSubmitting}
            />
          </div>

          {/* Entry Date and Time */}
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-text-primary mb-3">
              Entry Date & Time
            </h3>
            
            {/* Use Current Time Toggle */}
            <div className="mb-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={useCurrentTime}
                  onChange={handleUseCurrentTimeToggle}
                  disabled={isSubmitting}
                  className="w-4 h-4 text-primary-600 rounded border-border-subtle focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-text-primary font-medium">
                  Use current date and time
                </span>
              </label>
              <p className="text-sm text-text-muted mt-1">
                Uncheck to manually set entry date and time for backdated entries
              </p>
            </div>

            {/* Manual Date and Time Inputs */}
            {!useCurrentTime && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Entry Date"
                  type="date"
                  value={entryDateTime.date}
                  onChange={(e) => handleDateTimeChange('date')(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                <Input
                  label="Entry Time"
                  type="time"
                  value={entryDateTime.time}
                  onChange={(e) => handleDateTimeChange('time')(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
            )}

            {/* Current Time Display */}
            {useCurrentTime && (
              <div className="p-3 bg-info-50 rounded-lg border border-info-200">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-info-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-info-800 font-medium">
                    Entry will be recorded at current time: {new Date().toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Notes - Full width */}
          <div className="mt-4">
            <label className="form-label">
              Notes (Optional)
            </label>
            <textarea
              className="form-textarea"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes')(e.target.value)}
              placeholder="Additional notes or remarks"
              rows={3}
              maxLength={500}
              disabled={isSubmitting}
            />
            {errors.notes && (
              <p className="form-error">{errors.notes}</p>
            )}
            {formData.notes && (
              <p className="form-help">
                {formData.notes.length}/500 characters
              </p>
            )}
          </div>

          {/* Settings Seeder Component (temporary admin utility) */}
          {(!isConfigured || error) && (
            <div className="mt-4 space-y-4">
              <div className={`p-3 rounded-lg border ${
                error 
                  ? 'bg-red-50 border-red-200'
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{statusIcon}</span>
                  <div className="text-sm">
                    <span className={`font-medium ${
                      error ? 'text-red-800' : 'text-orange-800'
                    }`}>
                      {error ? 'Configuration Error:' : 'Using fallback rates:'}
                    </span>
                    <span className={`ml-1 ${
                      error ? 'text-red-700' : 'text-orange-700'
                    }`}>
                      {error || 'Business settings not in database'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Show seeder component when settings are not configured */}
              <SettingsSeeder />
            </div>
          )}

          {/* Settings Source Indicator (for debugging) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
              <strong>Settings Status:</strong> {statusIcon} {statusText}
              {loading && ' (Loading...)'}
            </div>
          )}

          {/* Rate Display */}
          {selectedRate > 0 && (
            <div className="mt-4 p-4 bg-info-50 rounded-lg border border-info-200">
              <div className="flex items-center justify-between">
                <span className="text-info-800 font-medium">
                  Daily Rate for {formData.vehicleType}:
                </span>
                <span className="text-info-900 font-bold text-lg">
                  ₹{selectedRate.toLocaleString()}
                </span>
              </div>
              <div className="mt-1 text-xs text-info-600">
                Rate from {isConfigured ? 'business configuration' : 'default fallback'}
              </div>
            </div>
          )}
        </CardBody>

        <CardFooter>
          {createdEntry ? (
            <div className="space-y-4">
              {/* Success message with print options */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-green-800">Vehicle Parked Successfully!</h4>
                    <p className="text-sm text-green-700 mt-1">
                      {createdEntry.vehicleNumber} • {createdEntry.vehicleType} • Ticket #{createdEntry.id}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <PrintButton
                      entry={createdEntry}
                      ticketType="entry"
                      variant="success"
                      size="sm"
                      onPrintComplete={() => {
                        toast.success('Entry ticket printed successfully!')
                      }}
                      onPrintError={(error) => {
                        toast.error(`Print failed: ${error.message}`)
                      }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Form controls */}
              <div className="flex items-center space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreatedEntry(null)
                    handleReset()
                  }}
                >
                  Park Another Vehicle
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel || handleReset}
                  disabled={isSubmitting}
                >
                  {onCancel ? 'Cancel' : 'Reset'}
                </Button>
                
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSubmitting}
                  disabled={!canWrite}
                >
                  Park Vehicle
                </Button>
              </div>

              {!canWrite && (
                <p className="text-sm text-warning-600 mt-2">
                  You do not have permission to create vehicle entries
                </p>
              )}
            </div>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}