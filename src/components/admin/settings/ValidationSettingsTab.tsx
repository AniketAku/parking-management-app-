/**
 * Validation Settings Tab
 * Manages form validation rules, data validation, input constraints, and file upload validation
 */

import React, { useState, useCallback } from 'react'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentCheckIcon,
  ShieldCheckIcon,
  AdjustmentsHorizontalIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  ClockIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import { SettingsSection } from './SettingsSection'
import { SettingsField } from './SettingsField'
import type { ValidationSettings } from '../../../types/settings'

interface ValidationSettingsTabProps {
  onSettingChange?: (key: string, value: any) => void
  className?: string
}

interface ValidationRule {
  id: string
  field: string
  rule_type: 'required' | 'min_length' | 'max_length' | 'pattern' | 'custom'
  value: string | number
  message: string
  enabled: boolean
}

interface FileValidationRule {
  id: string
  file_type: string
  max_size_mb: number
  allowed_extensions: string[]
  scan_for_viruses: boolean
  validate_content: boolean
  enabled: boolean
}

export function ValidationSettingsTab({
  onSettingChange,
  className = ''
}: ValidationSettingsTabProps) {
  const [settings, setSettings] = useState<ValidationSettings>({
    enable_form_validation: true,
    require_field_validation: true,
    validate_on_change: true,
    validate_on_submit: true,
    show_validation_errors: true,
    max_validation_errors: 10,
    validation_timeout_ms: 5000,
  })

  const [advancedSettings, setAdvancedSettings] = useState({
    // Input Validation
    enable_real_time_validation: true,
    debounce_validation_ms: 500,
    enable_server_side_validation: true,
    cache_validation_results: true,
    validation_cache_ttl_minutes: 30,
    
    // Data Validation
    enable_data_sanitization: true,
    sanitize_html_input: true,
    validate_data_types: true,
    enforce_data_constraints: true,
    validate_foreign_keys: true,
    
    // Security Validation
    enable_xss_protection: true,
    enable_sql_injection_protection: true,
    validate_csrf_tokens: true,
    rate_limit_validation_requests: true,
    max_validation_requests_per_minute: 100,
    
    // File Validation
    enable_file_validation: true,
    scan_uploads_for_malware: false,
    validate_file_signatures: true,
    restrict_file_types: true,
    
    // Performance
    async_validation_enabled: true,
    batch_validation_requests: true,
    max_concurrent_validations: 10,
  })

  const [validationRules, setValidationRules] = useState<ValidationRule[]>([
    {
      id: 'vehicle_number_required',
      field: 'vehicle_number',
      rule_type: 'required',
      value: '',
      message: 'Vehicle number is required',
      enabled: true
    },
    {
      id: 'vehicle_number_pattern',
      field: 'vehicle_number',
      rule_type: 'pattern',
      value: '^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$',
      message: 'Invalid vehicle number format',
      enabled: true
    },
    {
      id: 'contact_phone_pattern',
      field: 'contact_phone',
      rule_type: 'pattern',
      value: '^[0-9]{10}$',
      message: 'Phone number must be 10 digits',
      enabled: true
    },
    {
      id: 'email_pattern',
      field: 'email',
      rule_type: 'pattern',
      value: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
      message: 'Invalid email format',
      enabled: true
    },
    {
      id: 'driver_name_min_length',
      field: 'driver_name',
      rule_type: 'min_length',
      value: 2,
      message: 'Driver name must be at least 2 characters',
      enabled: true
    }
  ])

  const [fileValidationRules, setFileValidationRules] = useState<FileValidationRule[]>([
    {
      id: 'documents',
      file_type: 'Document',
      max_size_mb: 10,
      allowed_extensions: ['pdf', 'doc', 'docx', 'txt'],
      scan_for_viruses: false,
      validate_content: true,
      enabled: true
    },
    {
      id: 'images',
      file_type: 'Image',
      max_size_mb: 5,
      allowed_extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      scan_for_viruses: false,
      validate_content: true,
      enabled: true
    },
    {
      id: 'archives',
      file_type: 'Archive',
      max_size_mb: 50,
      allowed_extensions: ['zip', 'rar', '7z', 'tar', 'gz'],
      scan_for_viruses: true,
      validate_content: true,
      enabled: false
    }
  ])

  const [loading, setLoading] = useState(false)

  const handleChange = useCallback((key: keyof ValidationSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    onSettingChange?.(key, value)
  }, [onSettingChange])

  const handleAdvancedChange = useCallback((key: string, value: any) => {
    setAdvancedSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleRuleToggle = useCallback((ruleId: string) => {
    setValidationRules(prev =>
      prev.map(rule =>
        rule.id === ruleId
          ? { ...rule, enabled: !rule.enabled }
          : rule
      )
    )
  }, [])

  const handleFileRuleToggle = useCallback((ruleId: string) => {
    setFileValidationRules(prev =>
      prev.map(rule =>
        rule.id === ruleId
          ? { ...rule, enabled: !rule.enabled }
          : rule
      )
    )
  }, [])

  const testValidationRule = useCallback(async (rule: ValidationRule) => {
    console.log(`Testing validation rule: ${rule.id}`)
    // Simulate validation test
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const testValues = {
      vehicle_number: 'MH12AB1234',
      contact_phone: '9876543210',
      email: 'test@example.com',
      driver_name: 'John Doe'
    }
    
    const testValue = testValues[rule.field as keyof typeof testValues] || ''
    
    let isValid = false
    switch (rule.rule_type) {
      case 'required':
        isValid = testValue.length > 0
        break
      case 'min_length':
        isValid = testValue.length >= Number(rule.value)
        break
      case 'max_length':
        isValid = testValue.length <= Number(rule.value)
        break
      case 'pattern':
        const regex = new RegExp(rule.value as string)
        isValid = regex.test(testValue)
        break
      default:
        isValid = true
    }
    
    alert(`Validation Test Result:\nField: ${rule.field}\nTest Value: "${testValue}"\nRule: ${rule.rule_type}\nResult: ${isValid ? 'PASS' : 'FAIL'}`)
  }, [])

  const handleSave = useCallback(async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      console.log('Validation settings saved:', { 
        settings, 
        advancedSettings, 
        validationRules, 
        fileValidationRules 
      })
    } catch (error) {
      console.error('Failed to save validation settings:', error)
    } finally {
      setLoading(false)
    }
  }, [settings, advancedSettings, validationRules, fileValidationRules])

  const getRuleTypeColor = (ruleType: string) => {
    switch (ruleType) {
      case 'required': return 'bg-red-100 text-red-800'
      case 'pattern': return 'bg-blue-100 text-blue-800'
      case 'min_length': return 'bg-green-100 text-green-800'
      case 'max_length': return 'bg-yellow-100 text-yellow-800'
      case 'custom': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Form Validation Settings */}
      <SettingsSection
        title="Form Validation"
        description="Configure form validation behavior and error handling"
        icon={CheckCircleIcon}
      >
        <div className="space-y-6">
          <SettingsField
            label="Enable Form Validation"
            description="Enable client-side form validation for all forms"
            type="boolean"
            value={settings.enable_form_validation}
            onChange={(value) => handleChange('enable_form_validation', value)}
          />

          <SettingsField
            label="Require Field Validation"
            description="Enforce validation rules on all form fields"
            type="boolean"
            value={settings.require_field_validation}
            onChange={(value) => handleChange('require_field_validation', value)}
          />

          <SettingsField
            label="Validate on Change"
            description="Run validation as user types in form fields"
            type="boolean"
            value={settings.validate_on_change}
            onChange={(value) => handleChange('validate_on_change', value)}
          />

          <SettingsField
            label="Validate on Submit"
            description="Run validation when user submits the form"
            type="boolean"
            value={settings.validate_on_submit}
            onChange={(value) => handleChange('validate_on_submit', value)}
          />

          <SettingsField
            label="Show Validation Errors"
            description="Display validation error messages to users"
            type="boolean"
            value={settings.show_validation_errors}
            onChange={(value) => handleChange('show_validation_errors', value)}
          />

          <SettingsField
            label="Max Validation Errors"
            description="Maximum number of validation errors to display"
            type="number"
            value={settings.max_validation_errors}
            min={1}
            max={50}
            onChange={(value) => handleChange('max_validation_errors', value)}
          />

          <SettingsField
            label="Validation Timeout"
            description="Maximum time to wait for validation (milliseconds)"
            type="number"
            value={settings.validation_timeout_ms}
            min={1000}
            max={30000}
            step={1000}
            onChange={(value) => handleChange('validation_timeout_ms', value)}
          />
        </div>
      </SettingsSection>

      {/* Validation Rules */}
      <SettingsSection
        title="Validation Rules"
        description="Configure specific validation rules for form fields"
        icon={DocumentCheckIcon}
      >
        <div className="space-y-4">
          {validationRules.map(rule => (
            <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <ShieldCheckIcon className="w-5 h-5 text-gray-600" />
                  <div>
                    <h4 className="font-medium text-gray-900 capitalize">
                      {rule.field.replace('_', ' ')}
                    </h4>
                    <p className="text-sm text-gray-500">{rule.message}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRuleTypeColor(rule.rule_type)}`}>
                    {rule.rule_type}
                  </span>
                  {rule.rule_type !== 'required' && (
                    <span className="text-sm text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded">
                      {rule.value}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => testValidationRule(rule)}
                    className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
                  >
                    Test
                  </button>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => handleRuleToggle(rule.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* File Upload Validation */}
      <SettingsSection
        title="File Upload Validation"
        description="Configure file upload restrictions and validation"
        icon={ArrowUpTrayIcon}
      >
        <div className="space-y-6">
          <SettingsField
            label="Enable File Validation"
            description="Validate uploaded files for type, size, and content"
            type="boolean"
            value={advancedSettings.enable_file_validation}
            onChange={(value) => handleAdvancedChange('enable_file_validation', value)}
          />

          <SettingsField
            label="Scan for Malware"
            description="Scan uploaded files for viruses and malware"
            type="boolean"
            value={advancedSettings.scan_uploads_for_malware}
            onChange={(value) => handleAdvancedChange('scan_uploads_for_malware', value)}
          />

          <SettingsField
            label="Validate File Signatures"
            description="Verify file content matches file extension"
            type="boolean"
            value={advancedSettings.validate_file_signatures}
            onChange={(value) => handleAdvancedChange('validate_file_signatures', value)}
          />

          <div className="space-y-4 mt-6">
            <h4 className="text-sm font-medium text-gray-700">File Type Rules</h4>
            {fileValidationRules.map(rule => (
              <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <DocumentTextIcon className="w-5 h-5 text-gray-600" />
                    <div>
                      <h5 className="font-medium text-gray-900">{rule.file_type}</h5>
                      <p className="text-sm text-gray-500">
                        Max: {rule.max_size_mb}MB | Extensions: {rule.allowed_extensions.join(', ')}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => handleFileRuleToggle(rule.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
                
                <div className="pl-8 space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-4">
                    <span className={rule.scan_for_viruses ? 'text-green-600' : 'text-gray-500'}>
                      {rule.scan_for_viruses ? '✓' : '○'} Virus Scanning
                    </span>
                    <span className={rule.validate_content ? 'text-green-600' : 'text-gray-500'}>
                      {rule.validate_content ? '✓' : '○'} Content Validation
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SettingsSection>

      {/* Advanced Validation Settings */}
      <SettingsSection
        title="Advanced Validation"
        description="Advanced validation features and performance settings"
        icon={CogIcon}
      >
        <div className="space-y-6">
          <SettingsField
            label="Real-time Validation"
            description="Validate inputs in real-time as user types"
            type="boolean"
            value={advancedSettings.enable_real_time_validation}
            onChange={(value) => handleAdvancedChange('enable_real_time_validation', value)}
          />

          <SettingsField
            label="Validation Debounce"
            description="Delay before running validation (milliseconds)"
            type="number"
            value={advancedSettings.debounce_validation_ms}
            min={0}
            max={2000}
            step={100}
            onChange={(value) => handleAdvancedChange('debounce_validation_ms', value)}
          />

          <SettingsField
            label="Server-side Validation"
            description="Enable validation on the server for security"
            type="boolean"
            value={advancedSettings.enable_server_side_validation}
            onChange={(value) => handleAdvancedChange('enable_server_side_validation', value)}
          />

          <SettingsField
            label="Cache Validation Results"
            description="Cache validation results to improve performance"
            type="boolean"
            value={advancedSettings.cache_validation_results}
            onChange={(value) => handleAdvancedChange('cache_validation_results', value)}
          />

          <SettingsField
            label="XSS Protection"
            description="Protect against Cross-Site Scripting attacks"
            type="boolean"
            value={advancedSettings.enable_xss_protection}
            onChange={(value) => handleAdvancedChange('enable_xss_protection', value)}
          />

          <SettingsField
            label="SQL Injection Protection"
            description="Validate inputs to prevent SQL injection"
            type="boolean"
            value={advancedSettings.enable_sql_injection_protection}
            onChange={(value) => handleAdvancedChange('enable_sql_injection_protection', value)}
          />

          <SettingsField
            label="Rate Limit Validation"
            description="Limit number of validation requests per minute"
            type="boolean"
            value={advancedSettings.rate_limit_validation_requests}
            onChange={(value) => handleAdvancedChange('rate_limit_validation_requests', value)}
          />

          <SettingsField
            label="Max Concurrent Validations"
            description="Maximum number of simultaneous validation operations"
            type="number"
            value={advancedSettings.max_concurrent_validations}
            min={1}
            max={50}
            onChange={(value) => handleAdvancedChange('max_concurrent_validations', value)}
          />
        </div>
      </SettingsSection>

      {/* Save Button */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Validation Settings'}
        </button>
      </div>
    </div>
  )
}

export default ValidationSettingsTab