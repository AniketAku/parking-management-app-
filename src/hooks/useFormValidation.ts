import { useEffect, useState } from 'react'
import { getValidationRulesFromSettings } from '../utils/helpers'

interface ValidationRules {
  vehicleNumber: {
    pattern: string
    minLength: number
    maxLength: number
  }
  transportName: {
    minLength: number
    maxLength: number
  }
  driverName: {
    minLength: number
    maxLength: number
  }
  notes: {
    maxLength: number
  }
}

const DEFAULT_VALIDATION_RULES: ValidationRules = {
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
  },
  notes: {
    maxLength: 500
  }
}

export const useFormValidation = () => {
  const [validationRules, setValidationRules] = useState<ValidationRules>(DEFAULT_VALIDATION_RULES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadValidationRules = async () => {
      try {
        setLoading(true)
        const rules = await getValidationRulesFromSettings()
        
        setValidationRules({
          vehicleNumber: rules.vehicleNumber,
          transportName: rules.transportName,
          driverName: rules.driverName,
          notes: {
            maxLength: 500 // Keep notes limit as default for now
          }
        })
        setError(null)
      } catch (err) {
        console.error('Failed to load validation rules:', err)
        setError('Failed to load validation rules, using defaults')
        setValidationRules(DEFAULT_VALIDATION_RULES)
      } finally {
        setLoading(false)
      }
    }

    loadValidationRules()
  }, [])

  const validateTransportName = (value: string): string | null => {
    if (!value.trim()) {
      return 'Transport name is required'
    }
    if (value.length < validationRules.transportName.minLength) {
      return `Transport name must be at least ${validationRules.transportName.minLength} characters`
    }
    if (value.length > validationRules.transportName.maxLength) {
      return `Transport name must be less than ${validationRules.transportName.maxLength} characters`
    }
    return null
  }

  const validateVehicleNumber = (value: string): string | null => {
    if (!value.trim()) {
      return 'Vehicle number is required'
    }
    
    const cleaned = value.replace(/\s/g, '').toUpperCase()
    
    if (cleaned.length < validationRules.vehicleNumber.minLength) {
      return `Vehicle number is too short (minimum ${validationRules.vehicleNumber.minLength} characters)`
    }
    if (cleaned.length > validationRules.vehicleNumber.maxLength) {
      return `Vehicle number is too long (maximum ${validationRules.vehicleNumber.maxLength} characters)`
    }
    
    // Use centralized pattern validation
    const pattern = new RegExp(validationRules.vehicleNumber.pattern)
    if (!pattern.test(cleaned)) {
      return 'Invalid vehicle number format'
    }
    
    return null
  }

  const validateDriverName = (value: string): string | null => {
    if (!value.trim()) {
      return null // Driver name is optional
    }
    if (value.length < validationRules.driverName.minLength) {
      return `Driver name must be at least ${validationRules.driverName.minLength} characters if provided`
    }
    if (value.length > validationRules.driverName.maxLength) {
      return `Driver name must be less than ${validationRules.driverName.maxLength} characters`
    }
    return null
  }

  const validateNotes = (value: string): string | null => {
    if (!value) {
      return null // Notes are optional
    }
    if (value.length > validationRules.notes.maxLength) {
      return `Notes must be less than ${validationRules.notes.maxLength} characters`
    }
    return null
  }

  return {
    validationRules,
    loading,
    error,
    validateTransportName,
    validateVehicleNumber,
    validateDriverName,
    validateNotes,
    isRulesLoaded: !loading && !error
  }
}