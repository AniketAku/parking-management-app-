import type { ParkingEntry, VehicleRates } from '../types'
import { BackwardCompatibility } from './settingsMigration'
import { log } from './secureLogger'

// DEPRECATED: Vehicle rates should come from centralized settings, these are fallbacks only
// 🚨 WARNING: These hard-coded values will be removed in future versions
// Use getVehicleRatesFromSettings() or BackwardCompatibility.getSettingWithFallback() instead
export const VEHICLE_RATES: VehicleRates = {
  'Trailer': 225,   // ✅ Matches business default rate (fallback only)
  '6 Wheeler': 150, // ✅ Matches business default rate (fallback only)
  '4 Wheeler': 100, // ✅ Matches business default rate (fallback only)
  '2 Wheeler': 50,  // ✅ Matches business default rate (fallback only)
}

/**
 * Get vehicle rates from centralized settings with fallback to legacy values
 * Enhanced with robust error handling and timeout protection
 */
export const getVehicleRatesFromSettings = async (): Promise<VehicleRates> => {
  try {
    const rates = await BackwardCompatibility.getSettingWithFallback('vehicle_rates', VEHICLE_RATES, {
      timeout: 5000, // 5 second timeout
      retries: 2
    })
    
    // Validate rates structure
    if (typeof rates === 'object' && rates !== null && !Array.isArray(rates)) {
      // Ensure all rates are positive numbers
      const validRates: VehicleRates = {}
      for (const [type, rate] of Object.entries(rates)) {
        if (typeof rate === 'number' && rate > 0) {
          validRates[type as keyof VehicleRates] = rate
        }
      }
      
      // Only return if we have valid rates
      if (Object.keys(validRates).length > 0) {
        // Vehicle rates loaded successfully from settings
        return validRates
      }
    }
    
    // Invalid rates from settings, using fallback
    return VEHICLE_RATES
  } catch (error) {
    // Failed to load vehicle rates from settings, using fallback
    return VEHICLE_RATES
  }
}

/**
 * Generate a unique ID for parking entries
 */
export const generateId = (): string => {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 8)
  return `${timestamp}_${randomPart}`.toUpperCase()
}

/**
 * Calculate parking fee based on vehicle type and duration
 */
export const calculateFee = (
  vehicleType: keyof VehicleRates,
  entryTime: Date,
  exitTime?: Date
): number => {
  const rate = VEHICLE_RATES[vehicleType]
  if (!rate) return 0

  if (!exitTime) return rate // Daily rate for current parking

  const durationMs = exitTime.getTime() - entryTime.getTime()
  const durationHours = durationMs / (1000 * 60 * 60)
  const durationDays = Math.ceil(durationHours / 24) // Round up to full days
  
  return rate * Math.max(1, durationDays) // Minimum 1 day charge
}

/**
 * Format currency amount to Indian Rupee format
 */
export const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN')}`
}

/**
 * Format date to local string - FIXED VERSION
 */
export const formatDateTime = (date: Date | string | null | undefined): string => {
  try {
    // Handle null/undefined
    if (!date) {
      return 'Not available'
    }
    
    // Convert to Date object if it's a string
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Not available'
    }
    
    // DIRECT FIX: Format using local browser time without timezone conversion
    // This treats the stored time as if it were local time
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = dateObj.toLocaleDateString('en-IN', { month: 'short' });
    const year = dateObj.getFullYear();
    let hours = dateObj.getHours();
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    
    return `${day} ${month} ${year}, ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  } catch (error) {
    // Error formatting date
    return 'Not available'
  }
}

/**
 * Format date to date only
 */
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

/**
 * Format time to time only
 */
export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Get vehicle rate by type - PRIORITIZES CUSTOM RATES FROM SETTINGS
 */
export const getVehicleRate = (vehicleType: string, customRates?: VehicleRates): number => {
  // ⚠️ CRITICAL: Always prefer custom rates from settings over hard-coded fallbacks
  if (customRates && customRates[vehicleType as keyof VehicleRates]) {
    const rate = customRates[vehicleType as keyof VehicleRates]
    // Rate found in settings
    return rate
  }
  
  // Log when falling back to hard-coded rates (indicates settings loading issue)
  if (!customRates) {
    // Settings not provided, using fallback rate
  } else {
    // Vehicle type not found in settings, using fallback
  }
  
  const rates = VEHICLE_RATES
  const fallbackRate = rates[vehicleType as keyof VehicleRates] || 100
  // Using fallback rate
  return fallbackRate
}

/**
 * @deprecated Use UnifiedFeeCalculationService.calculateParkingFee() instead
 * This function is deprecated and will be removed in future versions
 *
 * Calculate parking fee based on vehicle type and entry time - LEGACY VERSION
 */
export const calculateParkingFee = (vehicleType: string, entryTime: string, exitTime?: string, customRates?: VehicleRates): number => {
  log.warn('DEPRECATED: calculateParkingFee() is deprecated, use UnifiedFeeCalculationService.calculateParkingFee() instead')

  const entry = new Date(entryTime)
  const exit = exitTime ? new Date(exitTime) : new Date()

  const diffMs = exit.getTime() - entry.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  const days = Math.ceil(diffHours / 24) || 1 // Minimum 1 day

  const rate = getVehicleRate(vehicleType, customRates)
  const totalFee = days * rate

  // Debug logging for fee calculation
  log.debug('LEGACY fee calculation', {
    vehicleType,
    entryTime,
    exitTime: exitTime || 'current time',
    diffHours: diffHours.toFixed(2),
    days,
    rate,
    totalFee,
    customRatesProvided: !!customRates,
    warning: 'This function is deprecated - migrate to UnifiedFeeCalculationService'
  })

  return totalFee
}

/**
 * @deprecated Use UnifiedFeeCalculationService.calculateDuration() instead
 * This function is deprecated and will be removed in future versions
 *
 * Calculate duration between entry and exit times (string format) - LEGACY VERSION
 */
export const calculateDuration = (entryTime: string, exitTime?: string): string => {
  log.warn('DEPRECATED: calculateDuration() is deprecated, use UnifiedFeeCalculationService.calculateDuration() instead')

  const entry = new Date(entryTime)
  const exit = exitTime ? new Date(exitTime) : new Date()

  const diffMs = exit.getTime() - entry.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < 1) {
    const minutes = Math.floor(diffMs / (1000 * 60))
    return `${minutes} minutes`
  } else if (diffHours < 24) {
    const hours = Math.floor(diffHours)
    const minutes = Math.floor((diffHours - hours) * 60)
    return `${hours}h ${minutes}m`
  } else {
    const days = Math.floor(diffHours / 24)
    const hours = Math.floor(diffHours % 24)
    return `${days}d ${hours}h`
  }
}

/**
 * Calculate duration between two dates (Date objects)
 */
export const calculateDurationFromDates = (startTime: Date, endTime?: Date): string => {
  const end = endTime || new Date()
  const durationMs = end.getTime() - startTime.getTime()
  
  const days = Math.floor(durationMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}

/**
 * Get validation rules from centralized settings
 * Enhanced with robust error handling and timeout protection
 */
export const getValidationRulesFromSettings = async () => {
  try {
    const [vehicleNumberRules, transportNameRules, driverNameRules] = await Promise.all([
      BackwardCompatibility.getSettingWithFallback('vehicle_number_validation', {
        pattern: '^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$',
        minLength: 4,
        maxLength: 15
      }, { timeout: 3000, retries: 1 }),
      BackwardCompatibility.getSettingWithFallback('transport_name_validation', {
        minLength: 2,
        maxLength: 100
      }, { timeout: 3000, retries: 1 }),
      BackwardCompatibility.getSettingWithFallback('driver_name_validation', {
        minLength: 2,
        maxLength: 50
      }, { timeout: 3000, retries: 1 })
    ])
    
    // Validation rules loaded from settings
    return {
      vehicleNumber: vehicleNumberRules,
      transportName: transportNameRules,
      driverName: driverNameRules
    }
  } catch (error) {
    // Failed to load validation rules from settings, using fallbacks
    return {
      vehicleNumber: {
        pattern: '^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$',
        minLength: 4,
        maxLength: 15
      },
      transportName: {
        minLength: 2,
        maxLength: 100
      },
      driverName: {
        minLength: 2,
        maxLength: 50
      }
    }
  }
}

/**
 * Validate Indian vehicle number format
 */
export const validateVehicleNumber = (vehicleNumber: string): boolean => {
  // Remove spaces and convert to uppercase
  const cleaned = vehicleNumber.replace(/\s/g, '').toUpperCase()
  
  // Indian vehicle number patterns
  const patterns = [
    /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/, // Standard format: XX00XX0000
    /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$/, // Flexible format for older vehicles
  ]
  
  return patterns.some(pattern => pattern.test(cleaned))
}

/**
 * Format vehicle number consistently
 */
export const formatVehicleNumber = (vehicleNumber: string): string => {
  const cleaned = vehicleNumber.replace(/\s/g, '').toUpperCase()
  
  // Try to format standard Indian vehicle numbers
  if (cleaned.length >= 10) {
    // Format as XX 00 XX 0000
    return cleaned.replace(/^([A-Z]{2})([0-9]{2})([A-Z]{1,2})([0-9]{4})$/, '$1 $2 $3 $4')
  }
  
  return cleaned
}


/**
 * Get vehicle type color for UI display
 */
export const getVehicleTypeColor = (vehicleType: keyof VehicleRates): string => {
  const colors = {
    'Trailer': 'bg-purple-100 text-purple-800',
    '6 Wheeler': 'bg-blue-100 text-blue-800',
    '4 Wheeler': 'bg-green-100 text-green-800',
    '2 Wheeler': 'bg-orange-100 text-orange-800',
  }
  
  return colors[vehicleType] || 'bg-gray-100 text-gray-800'
}

/**
 * Search entries by multiple criteria
 */
export const searchEntries = (
  entries: ParkingEntry[],
  searchTerm: string
): ParkingEntry[] => {
  if (!searchTerm.trim()) return entries
  
  const term = searchTerm.toLowerCase().trim()
  
  return entries.filter(entry => 
    entry.vehicleNumber.toLowerCase().includes(term) ||
    entry.transportName.toLowerCase().includes(term) ||
    entry.driverName.toLowerCase().includes(term) ||
    entry.notes?.toLowerCase().includes(term)
  )
}

/**
 * Sort entries by specified field
 */
export const sortEntries = (
  entries: ParkingEntry[],
  field: keyof ParkingEntry,
  direction: 'asc' | 'desc' = 'desc'
): ParkingEntry[] => {
  return [...entries].sort((a, b) => {
    const aValue = a[field]
    const bValue = b[field]
    
    // Handle dates
    if (aValue instanceof Date && bValue instanceof Date) {
      return direction === 'asc' 
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime()
    }
    
    // Handle strings
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }
    
    // Handle numbers
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return direction === 'asc' ? aValue - bValue : bValue - aValue
    }
    
    return 0
  })
}

/**
 * Get revenue amount with consistent priority logic
 * 🎯 BUSINESS RULE: Always prioritize manual entry over calculated amounts
 */
export const getRevenueAmount = (entry: ParkingEntry): number => {
  // Priority: 1. parkingFee (database field) → 2. actualFee (manual entry) → 3. calculatedFee (system) → 4. amountPaid (legacy) → 5. fallback
  return (entry as any).parkingFee ?? (entry as any).actualFee ?? (entry as any).calculatedFee ?? (entry as any).amountPaid ?? 0
}

/**
 * Check if entry has manual amount override
 */
export const hasManualAmount = (entry: ParkingEntry): boolean => {
  const anyEntry = entry as any
  return anyEntry.actualFee !== undefined && anyEntry.actualFee !== null
}

/**
 * Get revenue source type for auditing/debugging
 */
export const getRevenueSource = (entry: ParkingEntry): 'parking_fee' | 'manual' | 'calculated' | 'legacy' | 'none' => {
  const anyEntry = entry as any
  if (anyEntry.parkingFee !== undefined && anyEntry.parkingFee !== null) return 'parking_fee'
  if (anyEntry.actualFee !== undefined && anyEntry.actualFee !== null) return 'manual'
  if (anyEntry.calculatedFee !== undefined && anyEntry.calculatedFee !== null) return 'calculated'
  if (anyEntry.amountPaid !== undefined && anyEntry.amountPaid !== null) return 'legacy'
  return 'none'
}

/**
 * Export data to CSV format
 */
export const exportToCSV = (entries: ParkingEntry[], filename: string = 'parking_data'): void => {
  const headers = [
    'Vehicle Number',
    'Transport Name',
    'Vehicle Type',
    'Driver Name',
    'Entry Time',
    'Exit Time',
    'Status',
    'Payment Status',
    'Revenue Amount',
    'Revenue Source',
    'Duration',
    'Notes'
  ]
  
  const csvContent = [
    headers.join(','),
    ...entries.map(entry => [
      entry.vehicleNumber,
      entry.transportName,
      entry.vehicleType,
      entry.driverName,
      formatDateTime(entry.entryTime),
      entry.exitTime ? formatDateTime(entry.exitTime) : '',
      entry.status,
      entry.paymentStatus,
      getRevenueAmount(entry),
      getRevenueSource(entry),
      entry.exitTime ? calculateDurationFromDates(entry.entryTime, entry.exitTime) : calculateDurationFromDates(entry.entryTime),
      entry.notes || ''
    ].map(field => `"${field}"`).join(','))
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${formatDate(new Date()).replace(/\s/g, '_')}.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}