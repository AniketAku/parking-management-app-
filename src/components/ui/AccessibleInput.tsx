// Accessible Input Components
// WCAG 2.1 AA compliant form inputs with comprehensive accessibility features

import React, { forwardRef, useState, useId } from 'react'
import type { ComponentWithClassName, ComponentWithTestId } from '../../types'
import { ARIA_LABELS, ARIA_DESCRIPTIONS } from '../../utils/accessibility'

interface BaseAccessibleInputProps extends ComponentWithClassName, ComponentWithTestId {
  label: string
  error?: string
  help?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  onFocus?: () => void
}

// Accessible Text Input
interface AccessibleTextInputProps extends BaseAccessibleInputProps {
  type?: 'text' | 'email' | 'tel' | 'url'
  autoComplete?: string
  maxLength?: number
  pattern?: string
  inputMode?: 'text' | 'numeric' | 'tel' | 'email' | 'url'
}

export const AccessibleTextInput = forwardRef<HTMLInputElement, AccessibleTextInputProps>(({
  label,
  error,
  help,
  required = false,
  disabled = false,
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  type = 'text',
  autoComplete,
  maxLength,
  pattern,
  inputMode,
  className = '',
  'data-testid': testId,
}, ref) => {
  const inputId = useId()
  const errorId = `${inputId}-error`
  const helpId = `${inputId}-help`
  const [isFocused, setIsFocused] = useState(false)

  const hasError = !!error
  const describedBy = [
    help ? helpId : '',
    hasError ? errorId : '',
  ].filter(Boolean).join(' ')

  const handleFocus = () => {
    setIsFocused(true)
    onFocus?.()
  }

  const handleBlur = () => {
    setIsFocused(false)
    onBlur?.()
  }

  const inputClasses = [
    'form-input',
    'transition-colors duration-200',
    hasError ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-200' : 'border-border-color focus:border-primary-500 focus:ring-primary-200',
    disabled ? 'bg-light-100 cursor-not-allowed' : 'bg-white',
    isFocused ? 'ring-2' : '',
    className
  ].join(' ').trim()

  return (
    <div className="form-group">
      <label 
        htmlFor={inputId}
        className={`form-label ${required ? 'required' : ''}`}
      >
        {label}
        {required && (
          <span 
            className="text-danger-500 ml-1" 
            aria-label={ARIA_LABELS.REQUIRED_FIELD}
          >
            *
          </span>
        )}
      </label>
      
      {help && (
        <p id={helpId} className="form-help">
          {help}
        </p>
      )}
      
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          maxLength={maxLength}
          pattern={pattern}
          inputMode={inputMode}
          className={inputClasses}
          aria-invalid={hasError}
          aria-required={required}
          aria-describedby={describedBy || undefined}
          data-testid={testId}
        />
      </div>
      
      {hasError && (
        <div 
          id={errorId}
          role="alert"
          aria-live="polite"
          className="form-error mt-1"
        >
          {error}
        </div>
      )}
    </div>
  )
})

AccessibleTextInput.displayName = 'AccessibleTextInput'

// Accessible Password Input
interface AccessiblePasswordInputProps extends Omit<BaseAccessibleInputProps, 'type'> {
  showPasswordToggle?: boolean
  autoComplete?: string
}

export const AccessiblePasswordInput = forwardRef<HTMLInputElement, AccessiblePasswordInputProps>(({
  label,
  error,
  help,
  required = false,
  disabled = false,
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  showPasswordToggle = true,
  autoComplete = 'current-password',
  className = '',
  'data-testid': testId,
}, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const inputId = useId()
  const errorId = `${inputId}-error`
  const helpId = `${inputId}-help`
  const toggleId = `${inputId}-toggle`

  const hasError = !!error
  const describedBy = [
    help ? helpId : '',
    hasError ? errorId : '',
    showPasswordToggle ? `${toggleId}-description` : '',
  ].filter(Boolean).join(' ')

  const handleFocus = () => {
    setIsFocused(true)
    onFocus?.()
  }

  const handleBlur = () => {
    setIsFocused(false)
    onBlur?.()
  }

  const togglePassword = () => {
    setShowPassword(!showPassword)
  }

  const inputClasses = [
    'form-input',
    'pr-12', // Space for toggle button
    'transition-colors duration-200',
    hasError ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-200' : 'border-border-color focus:border-primary-500 focus:ring-primary-200',
    disabled ? 'bg-light-100 cursor-not-allowed' : 'bg-white',
    isFocused ? 'ring-2' : '',
    className
  ].join(' ').trim()

  return (
    <div className="form-group">
      <label 
        htmlFor={inputId}
        className={`form-label ${required ? 'required' : ''}`}
      >
        {label}
        {required && (
          <span 
            className="text-danger-500 ml-1" 
            aria-label={ARIA_LABELS.REQUIRED_FIELD}
          >
            *
          </span>
        )}
      </label>
      
      {help && (
        <p id={helpId} className="form-help">
          {help}
        </p>
      )}
      
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          className={inputClasses}
          aria-invalid={hasError}
          aria-required={required}
          aria-describedby={describedBy || undefined}
          data-testid={testId}
        />
        
        {showPasswordToggle && (
          <>
            <button
              id={toggleId}
              type="button"
              onClick={togglePassword}
              disabled={disabled}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 hover:bg-light-100 disabled:opacity-50"
              aria-label={showPassword ? 'Hide password' : ARIA_LABELS.PASSWORD_TOGGLE}
              aria-pressed={showPassword}
              aria-controls={inputId}
            >
              <span className="text-lg" aria-hidden="true">
                {showPassword ? '🙈' : '👁️'}
              </span>
            </button>
            <div 
              id={`${toggleId}-description`} 
              className="sr-only"
            >
              Click to {showPassword ? 'hide' : 'show'} password
            </div>
          </>
        )}
      </div>
      
      {hasError && (
        <div 
          id={errorId}
          role="alert"
          aria-live="polite"
          className="form-error mt-1"
        >
          {error}
        </div>
      )}
    </div>
  )
})

AccessiblePasswordInput.displayName = 'AccessiblePasswordInput'

// Accessible Select
interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface AccessibleSelectProps extends BaseAccessibleInputProps {
  options: SelectOption[]
  emptyOption?: string
  multiple?: boolean
}

export const AccessibleSelect = forwardRef<HTMLSelectElement, AccessibleSelectProps>(({
  label,
  error,
  help,
  required = false,
  disabled = false,
  value,
  onChange,
  onBlur,
  onFocus,
  options,
  emptyOption,
  multiple = false,
  className = '',
  'data-testid': testId,
}, ref) => {
  const selectId = useId()
  const errorId = `${selectId}-error`
  const helpId = `${selectId}-help`
  const [isFocused, setIsFocused] = useState(false)

  const hasError = !!error
  const describedBy = [
    help ? helpId : '',
    hasError ? errorId : '',
  ].filter(Boolean).join(' ')

  const handleFocus = () => {
    setIsFocused(true)
    onFocus?.()
  }

  const handleBlur = () => {
    setIsFocused(false)
    onBlur?.()
  }

  const selectClasses = [
    'form-select',
    'transition-colors duration-200',
    hasError ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-200' : 'border-border-color focus:border-primary-500 focus:ring-primary-200',
    disabled ? 'bg-light-100 cursor-not-allowed' : 'bg-white',
    isFocused ? 'ring-2' : '',
    className
  ].join(' ').trim()

  return (
    <div className="form-group">
      <label 
        htmlFor={selectId}
        className={`form-label ${required ? 'required' : ''}`}
      >
        {label}
        {required && (
          <span 
            className="text-danger-500 ml-1" 
            aria-label={ARIA_LABELS.REQUIRED_FIELD}
          >
            *
          </span>
        )}
      </label>
      
      {help && (
        <p id={helpId} className="form-help">
          {help}
        </p>
      )}
      
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          required={required}
          disabled={disabled}
          multiple={multiple}
          className={selectClasses}
          aria-invalid={hasError}
          aria-required={required}
          aria-describedby={describedBy || undefined}
          data-testid={testId}
        >
          {emptyOption && (
            <option value="">
              {emptyOption}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>
      
      {hasError && (
        <div 
          id={errorId}
          role="alert"
          aria-live="polite"
          className="form-error mt-1"
        >
          {error}
        </div>
      )}
    </div>
  )
})

AccessibleSelect.displayName = 'AccessibleSelect'

// Accessible Textarea
interface AccessibleTextareaProps extends BaseAccessibleInputProps {
  rows?: number
  maxLength?: number
  resize?: boolean
}

export const AccessibleTextarea = forwardRef<HTMLTextAreaElement, AccessibleTextareaProps>(({
  label,
  error,
  help,
  required = false,
  disabled = false,
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  rows = 4,
  maxLength,
  resize = true,
  className = '',
  'data-testid': testId,
}, ref) => {
  const textareaId = useId()
  const errorId = `${textareaId}-error`
  const helpId = `${textareaId}-help`
  const counterId = `${textareaId}-counter`
  const [isFocused, setIsFocused] = useState(false)

  const hasError = !!error
  const currentLength = value?.length || 0
  const showCounter = !!maxLength
  
  const describedBy = [
    help ? helpId : '',
    hasError ? errorId : '',
    showCounter ? counterId : '',
  ].filter(Boolean).join(' ')

  const handleFocus = () => {
    setIsFocused(true)
    onFocus?.()
  }

  const handleBlur = () => {
    setIsFocused(false)
    onBlur?.()
  }

  const textareaClasses = [
    'form-textarea',
    'transition-colors duration-200',
    hasError ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-200' : 'border-border-color focus:border-primary-500 focus:ring-primary-200',
    disabled ? 'bg-light-100 cursor-not-allowed' : 'bg-white',
    isFocused ? 'ring-2' : '',
    resize ? 'resize-y' : 'resize-none',
    className
  ].join(' ').trim()

  return (
    <div className="form-group">
      <label 
        htmlFor={textareaId}
        className={`form-label ${required ? 'required' : ''}`}
      >
        {label}
        {required && (
          <span 
            className="text-danger-500 ml-1" 
            aria-label={ARIA_LABELS.REQUIRED_FIELD}
          >
            *
          </span>
        )}
      </label>
      
      {help && (
        <p id={helpId} className="form-help">
          {help}
        </p>
      )}
      
      <div className="relative">
        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          className={textareaClasses}
          aria-invalid={hasError}
          aria-required={required}
          aria-describedby={describedBy || undefined}
          data-testid={testId}
        />
      </div>
      
      {showCounter && (
        <div 
          id={counterId}
          className="form-counter mt-1"
          aria-live="polite"
        >
          {currentLength} / {maxLength} characters
        </div>
      )}
      
      {hasError && (
        <div 
          id={errorId}
          role="alert"
          aria-live="polite"
          className="form-error mt-1"
        >
          {error}
        </div>
      )}
    </div>
  )
})

AccessibleTextarea.displayName = 'AccessibleTextarea'