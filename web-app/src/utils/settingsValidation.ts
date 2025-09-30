/**
 * Settings Validation Utilities
 * Prevents invalid settings from corrupting the system
 */

import type { BusinessSettings, UIThemeSettings, SettingCategory } from '../types/settings'

// ================================================
// VALIDATION ERROR TYPES
// ================================================

export interface ValidationError {
  field: string
  message: string
  value: any
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  sanitizedValue?: any
}

// ================================================
// BUSINESS SETTINGS VALIDATION
// ================================================

export function validateBusinessSetting(key: keyof BusinessSettings, value: any): ValidationResult {
  const errors: ValidationError[] = []

  switch (key) {
    case 'vehicle_rates':
      return validateVehicleRates(value)

    case 'vehicle_types':
      return validateVehicleTypes(value)

    case 'operating_hours':
      return validateOperatingHours(value)

    case 'payment_methods':
      return validatePaymentMethods(value)

    case 'entry_status_options':
      return validateStatusOptions(value, 'entry')

    case 'payment_status_options':
      return validateStatusOptions(value, 'payment')

    case 'minimum_charge_days':
      return validateNumericRange(value, 1, 30, 'Minimum charge days must be between 1 and 30')

    case 'overstay_penalty_rate':
      return validateNumericRange(value, 0, 1000, 'Overstay penalty rate must be between 0 and 1000')

    case 'overstay_threshold_hours':
      return validateNumericRange(value, 1, 168, 'Overstay threshold must be between 1 and 168 hours (1 week)')

    case 'currency_code':
      return validateCurrencyCode(value)

    case 'tax_rate':
      return validateNumericRange(value, 0, 100, 'Tax rate must be between 0 and 100 percent')

    default:
      return { isValid: true, errors: [] }
  }
}

function validateVehicleRates(value: any): ValidationResult {
  const errors: ValidationError[] = []

  if (!value || typeof value !== 'object') {
    errors.push({
      field: 'vehicle_rates',
      message: 'Vehicle rates must be an object',
      value
    })
    return { isValid: false, errors }
  }

  const requiredTypes = ['Trailer', '6 Wheeler', '4 Wheeler', '2 Wheeler']
  const sanitizedRates: Record<string, number> = {}

  for (const vehicleType of requiredTypes) {
    const rate = value[vehicleType]

    if (rate === undefined || rate === null) {
      errors.push({
        field: `vehicle_rates.${vehicleType}`,
        message: `Rate for ${vehicleType} is required`,
        value: rate
      })
      continue
    }

    const numRate = Number(rate)
    if (isNaN(numRate) || numRate < 0 || numRate > 10000) {
      errors.push({
        field: `vehicle_rates.${vehicleType}`,
        message: `Rate for ${vehicleType} must be a number between 0 and 10,000`,
        value: rate
      })
    } else {
      sanitizedRates[vehicleType] = Math.round(numRate) // Round to nearest rupee
    }
  }

  // Add any extra vehicle types that are valid
  for (const [vehicleType, rate] of Object.entries(value)) {
    if (!requiredTypes.includes(vehicleType)) {
      const numRate = Number(rate)
      if (!isNaN(numRate) && numRate >= 0 && numRate <= 10000) {
        sanitizedRates[vehicleType] = Math.round(numRate)
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: errors.length === 0 ? sanitizedRates : undefined
  }
}

function validateVehicleTypes(value: any): ValidationResult {
  const errors: ValidationError[] = []

  if (!Array.isArray(value)) {
    errors.push({
      field: 'vehicle_types',
      message: 'Vehicle types must be an array',
      value
    })
    return { isValid: false, errors }
  }

  if (value.length === 0) {
    errors.push({
      field: 'vehicle_types',
      message: 'At least one vehicle type is required',
      value
    })
    return { isValid: false, errors }
  }

  const validTypes = ['Trailer', '6 Wheeler', '4 Wheeler', '2 Wheeler', 'Bus', 'Van']
  const sanitizedTypes: string[] = []

  for (const type of value) {
    if (typeof type !== 'string' || type.trim().length === 0) {
      errors.push({
        field: 'vehicle_types',
        message: 'All vehicle types must be non-empty strings',
        value: type
      })
    } else if (!validTypes.includes(type)) {
      errors.push({
        field: 'vehicle_types',
        message: `Invalid vehicle type: ${type}. Must be one of: ${validTypes.join(', ')}`,
        value: type
      })
    } else {
      sanitizedTypes.push(type.trim())
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: errors.length === 0 ? Array.from(new Set(sanitizedTypes)) : undefined
  }
}

function validateOperatingHours(value: any): ValidationResult {
  const errors: ValidationError[] = []

  if (!value || typeof value !== 'object') {
    errors.push({
      field: 'operating_hours',
      message: 'Operating hours must be an object',
      value
    })
    return { isValid: false, errors }
  }

  const { start, end, timezone } = value

  // Validate time format (HH:MM)
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/

  if (!start || !timeRegex.test(start)) {
    errors.push({
      field: 'operating_hours.start',
      message: 'Start time must be in HH:MM format (24-hour)',
      value: start
    })
  }

  if (!end || !timeRegex.test(end)) {
    errors.push({
      field: 'operating_hours.end',
      message: 'End time must be in HH:MM format (24-hour)',
      value: end
    })
  }

  if (!timezone || typeof timezone !== 'string' || timezone.trim().length === 0) {
    errors.push({
      field: 'operating_hours.timezone',
      message: 'Timezone is required',
      value: timezone
    })
  }

  const sanitizedValue = errors.length === 0 ? {
    start: start.trim(),
    end: end.trim(),
    timezone: timezone.trim()
  } : undefined

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue
  }
}

function validatePaymentMethods(value: any): ValidationResult {
  const errors: ValidationError[] = []

  if (!Array.isArray(value)) {
    errors.push({
      field: 'payment_methods',
      message: 'Payment methods must be an array',
      value
    })
    return { isValid: false, errors }
  }

  if (value.length === 0) {
    errors.push({
      field: 'payment_methods',
      message: 'At least one payment method is required',
      value
    })
    return { isValid: false, errors }
  }

  const validMethods = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Online', 'Digital Wallet', 'N/A']
  const sanitizedMethods: string[] = []

  for (const method of value) {
    if (typeof method !== 'string' || method.trim().length === 0) {
      errors.push({
        field: 'payment_methods',
        message: 'All payment methods must be non-empty strings',
        value: method
      })
    } else if (!validMethods.includes(method)) {
      errors.push({
        field: 'payment_methods',
        message: `Invalid payment method: ${method}. Must be one of: ${validMethods.join(', ')}`,
        value: method
      })
    } else {
      sanitizedMethods.push(method.trim())
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: errors.length === 0 ? Array.from(new Set(sanitizedMethods)) : undefined
  }
}

function validateStatusOptions(value: any, type: 'entry' | 'payment'): ValidationResult {
  const errors: ValidationError[] = []

  if (!Array.isArray(value)) {
    errors.push({
      field: `${type}_status_options`,
      message: 'Status options must be an array',
      value
    })
    return { isValid: false, errors }
  }

  const validOptions = type === 'entry'
    ? ['Active', 'Exited', 'Overstay', 'Reserved']
    : ['Paid', 'Pending', 'Unpaid', 'Refunded', 'Partial']

  const sanitizedOptions: string[] = []

  for (const option of value) {
    if (typeof option !== 'string' || option.trim().length === 0) {
      errors.push({
        field: `${type}_status_options`,
        message: 'All status options must be non-empty strings',
        value: option
      })
    } else if (!validOptions.includes(option)) {
      errors.push({
        field: `${type}_status_options`,
        message: `Invalid ${type} status: ${option}. Must be one of: ${validOptions.join(', ')}`,
        value: option
      })
    } else {
      sanitizedOptions.push(option.trim())
    }
  }

  // Ensure required statuses are present
  const requiredStatuses = type === 'entry' ? ['Active', 'Exited'] : ['Paid', 'Pending']
  for (const required of requiredStatuses) {
    if (!sanitizedOptions.includes(required)) {
      errors.push({
        field: `${type}_status_options`,
        message: `Required status '${required}' is missing`,
        value
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: errors.length === 0 ? Array.from(new Set(sanitizedOptions)) : undefined
  }
}

function validateCurrencyCode(value: any): ValidationResult {
  const errors: ValidationError[] = []

  if (typeof value !== 'string' || value.length !== 3) {
    errors.push({
      field: 'currency_code',
      message: 'Currency code must be a 3-letter string (e.g., INR, USD)',
      value
    })
    return { isValid: false, errors }
  }

  const validCurrencies = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD']
  const upperValue = value.toUpperCase()

  if (!validCurrencies.includes(upperValue)) {
    errors.push({
      field: 'currency_code',
      message: `Invalid currency code: ${value}. Must be one of: ${validCurrencies.join(', ')}`,
      value
    })
    return { isValid: false, errors }
  }

  return {
    isValid: true,
    errors: [],
    sanitizedValue: upperValue
  }
}

function validateNumericRange(value: any, min: number, max: number, message: string): ValidationResult {
  const errors: ValidationError[] = []

  const numValue = Number(value)
  if (isNaN(numValue) || numValue < min || numValue > max) {
    errors.push({
      field: 'numeric_value',
      message,
      value
    })
    return { isValid: false, errors }
  }

  return {
    isValid: true,
    errors: [],
    sanitizedValue: numValue
  }
}

// ================================================
// UI THEME SETTINGS VALIDATION
// ================================================

export function validateUIThemeSetting(key: keyof UIThemeSettings, value: any): ValidationResult {
  const errors: ValidationError[] = []

  switch (key) {
    case 'primary_color':
    case 'secondary_color':
    case 'success_color':
    case 'warning_color':
    case 'danger_color':
      return validateHexColor(value, key)

    case 'dark_mode':
      return validateBoolean(value, 'dark_mode')

    case 'theme_mode':
      return validateThemeMode(value)

    default:
      return { isValid: true, errors: [] }
  }
}

function validateHexColor(value: any, field: string): ValidationResult {
  const errors: ValidationError[] = []

  if (typeof value !== 'string') {
    errors.push({
      field,
      message: 'Color must be a string',
      value
    })
    return { isValid: false, errors }
  }

  const hexRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/
  if (!hexRegex.test(value)) {
    errors.push({
      field,
      message: 'Color must be a valid hex code (e.g., #2563eb)',
      value
    })
    return { isValid: false, errors }
  }

  // Normalize to 6-digit hex
  const sanitizedValue = value.length === 4
    ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
    : value.toLowerCase()

  return {
    isValid: true,
    errors: [],
    sanitizedValue
  }
}

function validateBoolean(value: any, field: string): ValidationResult {
  const errors: ValidationError[] = []

  if (typeof value !== 'boolean') {
    errors.push({
      field,
      message: 'Value must be true or false',
      value
    })
    return { isValid: false, errors }
  }

  return {
    isValid: true,
    errors: [],
    sanitizedValue: value
  }
}

function validateThemeMode(value: any): ValidationResult {
  const errors: ValidationError[] = []

  const validModes = ['light', 'dark', 'auto']
  if (!validModes.includes(value)) {
    errors.push({
      field: 'theme_mode',
      message: `Theme mode must be one of: ${validModes.join(', ')}`,
      value
    })
    return { isValid: false, errors }
  }

  return {
    isValid: true,
    errors: [],
    sanitizedValue: value
  }
}

// ================================================
// GENERIC CATEGORY VALIDATION
// ================================================

export function validateSetting(category: SettingCategory, key: string, value: any): ValidationResult {
  switch (category) {
    case 'business':
      return validateBusinessSetting(key as keyof BusinessSettings, value)

    case 'ui_theme':
      return validateUIThemeSetting(key as keyof UIThemeSettings, value)

    case 'system':
    case 'localization':
    case 'validation':
      // Basic validation for other categories
      return { isValid: true, errors: [] }

    default:
      return { isValid: true, errors: [] }
  }
}

// ================================================
// VALIDATION HELPERS
// ================================================

export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return ''

  if (errors.length === 1) {
    return errors[0].message
  }

  return errors.map((error, index) => `${index + 1}. ${error.message}`).join('\n')
}

export function hasValidationErrors(errors: ValidationError[]): boolean {
  return errors.length > 0
}

// ================================================
// EXPORT MAIN VALIDATION FUNCTION
// ================================================

export default validateSetting