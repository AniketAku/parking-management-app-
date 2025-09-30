import React from 'react'
import type { ComponentWithClassName, ComponentWithTestId } from '../../types'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps extends ComponentWithClassName, ComponentWithTestId {
  label?: string
  options?: SelectOption[]
  value?: string
  defaultValue?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  helpText?: string
  onChange?: (value: string) => void
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void
  onFocus?: (e: React.FocusEvent<HTMLSelectElement>) => void
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  defaultValue,
  placeholder,
  required = false,
  disabled = false,
  error,
  helpText,
  className = '',
  onChange,
  onBlur,
  onFocus,
  'data-testid': testId,
}) => {
  const selectId = React.useId()
  const errorId = React.useId()
  const helpId = React.useId()
  
  const selectClasses = [
    'form-select',
    error ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-500' : '',
    className,
  ].join(' ').trim()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange?.(e.target.value)
  }

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={selectId} className="form-label">
          {label}
          {required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}
      
      <select
        id={selectId}
        className={selectClasses}
        value={value}
        defaultValue={defaultValue}
        required={required}
        disabled={disabled}
        onChange={handleChange}
        onBlur={onBlur}
        onFocus={onFocus}
        aria-invalid={!!error}
        aria-describedby={
          [error ? errorId : '', helpText ? helpId : '']
            .filter(Boolean)
            .join(' ') || undefined
        }
        data-testid={testId}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        
        {options?.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      
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

// Modern Select components for shadcn/ui compatibility
export const SelectTrigger: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>
    {children}
  </div>
)

export const SelectValue: React.FC<{ placeholder?: string; className?: string }> = ({ placeholder, className = '' }) => (
  <span className={`block truncate ${className}`}>{placeholder}</span>
)

export const SelectContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`relative z-50 min-w-[8rem] overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-md ${className}`}>
    {children}
  </div>
)

export const SelectItem: React.FC<{ children: React.ReactNode; value: string; className?: string }> = ({ children, value, className = '' }) => (
  <div className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-slate-100 focus:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className}`}>
    {children}
  </div>
)