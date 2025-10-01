import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import type { AppSetting, SettingValidationResult } from '../../../types/settings'
import { AccessibleInput, AccessibleSelect, AccessibleTextarea } from '../../ui/AccessibleInput'

interface SettingsFieldRendererProps {
  setting: AppSetting
  value: any
  onChange: (value: any) => void
  onValidate?: (result: SettingValidationResult) => void
  error?: string
  warning?: string
  disabled?: boolean
  showDescription?: boolean
  isModified?: boolean
  className?: string
}

interface FieldState {
  isValidating: boolean
  validationResult?: SettingValidationResult
  showSensitive: boolean
  localValue: any
  hasLocalChanges: boolean
}

export const SettingsFieldRenderer: React.FC<SettingsFieldRendererProps> = ({
  setting,
  value,
  onChange,
  onValidate,
  error,
  warning,
  disabled = false,
  showDescription = true,
  isModified = false,
  className = ''
}) => {
  const [fieldState, setFieldState] = useState<FieldState>({
    isValidating: false,
    showSensitive: false,
    localValue: value,
    hasLocalChanges: false
  })

  // Sync local value with prop value
  useEffect(() => {
    if (!fieldState.hasLocalChanges) {
      setFieldState(prev => ({ ...prev, localValue: value }))
    }
  }, [value, fieldState.hasLocalChanges])

  const handleValueChange = useCallback((newValue: any) => {
    setFieldState(prev => ({
      ...prev,
      localValue: newValue,
      hasLocalChanges: true,
      validationResult: undefined
    }))

    // Debounced validation and change notification
    const timeoutId = setTimeout(() => {
      onChange(newValue)
      setFieldState(prev => ({ ...prev, hasLocalChanges: false }))
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [onChange])

  const handleValidation = useCallback(async (valueToValidate: any) => {
    if (!onValidate) return

    setFieldState(prev => ({ ...prev, isValidating: true }))

    try {
      // Simulate validation API call
      const validationResult: SettingValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      }

      // Basic validation based on setting constraints
      if (setting.data_type === 'number') {
        const numValue = Number(valueToValidate)
        if (isNaN(numValue)) {
          validationResult.isValid = false
          validationResult.errors.push('Must be a valid number')
        } else {
          if (setting.min_value !== undefined && numValue < setting.min_value) {
            validationResult.isValid = false
            validationResult.errors.push(`Minimum value is ${setting.min_value}`)
          }
          if (setting.max_value !== undefined && numValue > setting.max_value) {
            validationResult.isValid = false
            validationResult.errors.push(`Maximum value is ${setting.max_value}`)
          }
        }
      }

      if (setting.data_type === 'string' && typeof valueToValidate === 'string') {
        if (setting.min_length !== undefined && valueToValidate.length < setting.min_length) {
          validationResult.isValid = false
          validationResult.errors.push(`Minimum length is ${setting.min_length} characters`)
        }
        if (setting.max_length !== undefined && valueToValidate.length > setting.max_length) {
          validationResult.isValid = false
          validationResult.errors.push(`Maximum length is ${setting.max_length} characters`)
        }
      }

      if (setting.enum_values && !setting.enum_values.includes(valueToValidate)) {
        validationResult.isValid = false
        validationResult.errors.push(`Must be one of: ${setting.enum_values.join(', ')}`)
      }

      setFieldState(prev => ({ ...prev, validationResult, isValidating: false }))
      onValidate(validationResult)
    } catch (error) {
      setFieldState(prev => ({ 
        ...prev, 
        isValidating: false,
        validationResult: {
          isValid: false,
          errors: ['Validation failed'],
          warnings: []
        }
      }))
    }
  }, [setting, onValidate])

  const toggleSensitiveVisibility = useCallback(() => {
    setFieldState(prev => ({ ...prev, showSensitive: !prev.showSensitive }))
  }, [])

  const resetToDefault = useCallback(() => {
    if (setting.default_value !== undefined) {
      handleValueChange(setting.default_value)
    }
  }, [setting.default_value, handleValueChange])

  const renderField = () => {
    const commonProps = {
      id: `setting-${setting.id}`,
      value: fieldState.localValue || '',
      onChange: handleValueChange,
      onBlur: () => handleValidation(fieldState.localValue),
      disabled,
      error: error || fieldState.validationResult?.errors.join(', '),
      className: 'w-full'
    }

    switch (setting.data_type) {
      case 'string':
        if (setting.is_sensitive) {
          return (
            <div className="relative">
              <AccessibleInput
                {...commonProps}
                type={fieldState.showSensitive ? 'text' : 'password'}
                placeholder={setting.description}
                maxLength={setting.max_length}
              />
              <button
                type="button"
                onClick={toggleSensitiveVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {fieldState.showSensitive ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          )
        }

        return (
          <AccessibleInput
            {...commonProps}
            type="text"
            placeholder={setting.description}
            maxLength={setting.max_length}
          />
        )

      case 'number':
        return (
          <AccessibleInput
            {...commonProps}
            type="number"
            min={setting.min_value}
            max={setting.max_value}
            placeholder={setting.description}
          />
        )

      case 'boolean':
        return (
          <div className="flex items-center space-x-3">
            <input
              {...commonProps}
              type="checkbox"
              checked={Boolean(fieldState.localValue)}
              onChange={(e) => handleValueChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor={commonProps.id} className="text-sm text-gray-700">
              {setting.description || 'Enable this setting'}
            </label>
          </div>
        )

      case 'enum':
        if (!setting.enum_values) return null
        
        const options = setting.enum_values.map(val => ({
          value: val,
          label: val.charAt(0).toUpperCase() + val.slice(1).replace(/_/g, ' ')
        }))

        return (
          <AccessibleSelect
            {...commonProps}
            options={options}
            placeholder={`Select ${setting.key.replace(/_/g, ' ')}`}
          />
        )

      case 'json':
        return (
          <AccessibleTextarea
            {...commonProps}
            value={JSON.stringify(fieldState.localValue, null, 2)}
            onChange={(value) => {
              try {
                const parsed = JSON.parse(value)
                handleValueChange(parsed)
              } catch (e) {
                // Invalid JSON, keep as string for now
                handleValueChange(value)
              }
            }}
            placeholder="Enter valid JSON"
            rows={4}
          />
        )

      case 'array':
        const arrayValue = Array.isArray(fieldState.localValue) ? fieldState.localValue : []
        
        return (
          <div className="space-y-2">
            {arrayValue.map((item: any, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <AccessibleInput
                  value={item}
                  onChange={(newValue) => {
                    const newArray = [...arrayValue]
                    newArray[index] = newValue
                    handleValueChange(newArray)
                  }}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newArray = arrayValue.filter((_: any, i: number) => i !== index)
                    handleValueChange(newArray)
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => handleValueChange([...arrayValue, ''])}
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              + Add Item
            </button>
          </div>
        )

      default:
        return (
          <AccessibleInput
            {...commonProps}
            type="text"
            placeholder={setting.description}
          />
        )
    }
  }

  const hasValidationIssues = fieldState.validationResult?.errors.length || 
                             fieldState.validationResult?.warnings.length ||
                             error || warning

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Field Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <label
            htmlFor={`setting-${setting.id}`}
            className="block text-sm font-medium text-gray-700"
          >
            {setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </label>
          
          {/* Modified Indicator */}
          {isModified && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-2 h-2 bg-orange-500 rounded-full"
              title="Modified"
            />
          )}
          
          {/* Sensitive Data Indicator */}
          {setting.is_sensitive && (
            <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              Sensitive
            </div>
          )}
          
          {/* Required Indicator */}
          {setting.validation_rules?.required && (
            <span className="text-red-500 text-sm">*</span>
          )}
        </div>

        {/* Field Actions */}
        <div className="flex items-center space-x-2">
          {/* Validation Status */}
          {fieldState.isValidating && (
            <ArrowPathIcon className="w-4 h-4 text-blue-500 animate-spin" />
          )}
          
          {fieldState.validationResult?.isValid && !fieldState.isValidating && (
            <CheckCircleIcon className="w-4 h-4 text-green-500" />
          )}

          {/* Reset to Default */}
          {setting.default_value !== undefined && fieldState.localValue !== setting.default_value && (
            <button
              type="button"
              onClick={resetToDefault}
              className="text-xs text-blue-500 hover:text-blue-700"
              title="Reset to default"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Field Input */}
      <div className="relative">
        {renderField()}
      </div>

      {/* Field Information */}
      {showDescription && (setting.description || setting.default_value !== undefined) && (
        <div className="space-y-1">
          {setting.description && (
            <p className="text-xs text-gray-500">{setting.description}</p>
          )}
          
          {setting.default_value !== undefined && (
            <p className="text-xs text-gray-400">
              Default: {JSON.stringify(setting.default_value)}
            </p>
          )}
        </div>
      )}

      {/* Validation Messages */}
      <AnimatePresence>
        {hasValidationIssues && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1"
          >
            {/* Errors */}
            {(fieldState.validationResult?.errors.length || error) && (
              <div className="flex items-start space-x-2 text-sm text-red-600">
                <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  {fieldState.validationResult?.errors.map((err, idx) => (
                    <div key={idx}>{err}</div>
                  ))}
                  {error && <div>{error}</div>}
                </div>
              </div>
            )}

            {/* Warnings */}
            {(fieldState.validationResult?.warnings.length || warning) && (
              <div className="flex items-start space-x-2 text-sm text-yellow-600">
                <InformationCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  {fieldState.validationResult?.warnings.map((warn, idx) => (
                    <div key={idx}>{warn}</div>
                  ))}
                  {warning && <div>{warning}</div>}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Restart Required Warning */}
      {setting.requires_restart && isModified && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center space-x-2 text-sm text-orange-600 bg-orange-50 p-2 rounded"
        >
          <InformationCircleIcon className="w-4 h-4 flex-shrink-0" />
          <span>This setting requires a system restart to take effect</span>
        </motion.div>
      )}
    </div>
  )
}

export default SettingsFieldRenderer