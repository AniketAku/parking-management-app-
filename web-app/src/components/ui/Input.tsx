import React from 'react'
import type { ComponentWithClassName, ComponentWithTestId } from '../../types'

interface InputProps extends ComponentWithClassName, ComponentWithTestId {
  label?: string
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'search'
  placeholder?: string
  value?: string
  defaultValue?: string
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  error?: string
  helpText?: string
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
  min?: number | string
  max?: number | string
  maxLength?: number
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void
}

export const Input: React.FC<InputProps> = ({
  label,
  type = 'text',
  placeholder,
  value,
  defaultValue,
  required = false,
  disabled = false,
  readOnly = false,
  error,
  helpText,
  startIcon,
  endIcon,
  min,
  max,
  maxLength,
  className = '',
  onChange,
  onBlur,
  onFocus,
  'data-testid': testId,
}) => {
  const inputId = React.useId()
  const errorId = React.useId()
  const helpId = React.useId()
  
  const inputClasses = [
    'form-input',
    startIcon ? 'pl-10' : '',
    endIcon ? 'pr-10' : '',
    error ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-500' : '',
    className,
  ].join(' ').trim()

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
          {required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {startIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="h-5 w-5 text-gray-400">
              {startIcon}
            </div>
          </div>
        )}
        
        <input
          id={inputId}
          type={type}
          className={inputClasses}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          min={min}
          max={max}
          maxLength={maxLength}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          aria-invalid={!!error}
          aria-describedby={
            [error ? errorId : '', helpText ? helpId : '']
              .filter(Boolean)
              .join(' ') || undefined
          }
          data-testid={testId}
        />
        
        {endIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <div className="h-5 w-5 text-gray-400">
              {endIcon}
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <p id={errorId} className="form-error">
          {error}
        </p>
      )}
      
      {helpText && !error && (
        <p id={helpId} className="form-help">
          {helpText}
        </p>
      )}
    </div>
  )
}