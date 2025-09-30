/**
 * Settings Field Component  
 * Comprehensive form field component for all settings types
 */

import React, { useState } from 'react'

interface OptionType {
  value: string | number
  label: string
}

interface SettingsFieldProps {
  label: string
  description?: string
  error?: string
  required?: boolean
  className?: string
  
  // Input props
  type?: 'text' | 'number' | 'email' | 'password' | 'time' | 'color' | 'select' | 'multi-select' | 'toggle' | 'textarea'
  value?: any
  onChange?: (value: any) => void
  placeholder?: string
  disabled?: boolean
  
  // Number input props
  min?: number
  max?: number
  step?: number
  prefix?: string
  suffix?: string
  
  // Select props
  options?: OptionType[]
  
  // Textarea props
  rows?: number
  
  // Icon
  icon?: React.ComponentType<{ className?: string }>
  
  // For wrapper mode (backwards compatibility)
  children?: React.ReactNode
}

export const SettingsField: React.FC<SettingsFieldProps> = ({
  label,
  description,
  error,
  required = false,
  className = '',
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  min,
  max,
  step,
  prefix,
  suffix,
  options = [],
  rows = 4,
  icon: Icon,
  children
}) => {
  const [isFocused, setIsFocused] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!onChange) return
    
    const newValue = e.target.value
    
    if (type === 'number') {
      onChange(newValue === '' ? undefined : Number(newValue))
    } else {
      onChange(newValue)
    }
  }

  const handleMultiSelectChange = (optionValue: string | number) => {
    if (!onChange || !Array.isArray(value)) return
    
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue]
    
    onChange(newValue)
  }

  const handleToggleChange = () => {
    if (!onChange) return
    onChange(!value)
  }

  const renderInput = () => {
    // If children are provided, use wrapper mode (backwards compatibility)
    if (children) {
      return children
    }

    const baseInputClasses = `
      block w-full rounded-md border-gray-300 shadow-sm 
      focus:border-primary-500 focus:ring-primary-500 sm:text-sm
      ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
      ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}
    `.trim()

    switch (type) {
      case 'toggle':
        return (
          <button
            type="button"
            onClick={handleToggleChange}
            disabled={disabled}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${value ? 'bg-primary-600' : 'bg-gray-200'}
              ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${value ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        )

      case 'color':
        return (
          <div className="flex items-center space-x-3">
            <input
              type="color"
              value={value || '#000000'}
              onChange={handleChange}
              disabled={disabled}
              className="h-10 w-20 rounded border border-gray-300 cursor-pointer disabled:cursor-not-allowed"
            />
            <input
              type="text"
              value={value || ''}
              onChange={handleChange}
              placeholder="#000000"
              disabled={disabled}
              className={baseInputClasses}
            />
          </div>
        )

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={handleChange}
            disabled={disabled}
            className={baseInputClasses}
          >
            <option value="">Select an option</option>
            {options.map((option, index) => (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )

      case 'multi-select':
        return (
          <div className="space-y-2">
            {options.map((option, index) => {
              const isSelected = Array.isArray(value) && value.includes(option.value)
              return (
                <label key={index} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleMultiSelectChange(option.value)}
                    disabled={disabled}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:cursor-not-allowed"
                  />
                  <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                </label>
              )
            })}
          </div>
        )

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className={baseInputClasses}
          />
        )

      case 'number':
        return (
          <div className="relative">
            {prefix && (
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">{prefix}</span>
              </div>
            )}
            {Icon && (
              <div className={`absolute inset-y-0 ${prefix ? 'left-8' : 'left-0'} pl-3 flex items-center pointer-events-none`}>
                <Icon className="h-5 w-5 text-gray-400" />
              </div>
            )}
            <input
              type="number"
              value={value ?? ''}
              onChange={handleChange}
              placeholder={placeholder}
              disabled={disabled}
              min={min}
              max={max}
              step={step}
              className={`
                ${baseInputClasses}
                ${prefix || Icon ? 'pl-10' : ''}
                ${suffix ? 'pr-16' : ''}
              `}
            />
            {suffix && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">{suffix}</span>
              </div>
            )}
          </div>
        )

      default:
        return (
          <div className="relative">
            {Icon && (
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon className="h-5 w-5 text-gray-400" />
              </div>
            )}
            <input
              type={type}
              value={value || ''}
              onChange={handleChange}
              placeholder={placeholder}
              disabled={disabled}
              className={`${baseInputClasses} ${Icon ? 'pl-10' : ''}`}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </div>
        )
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
      {renderInput()}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}