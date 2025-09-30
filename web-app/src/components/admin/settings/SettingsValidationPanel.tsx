import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  ClockIcon,
  UserIcon,
  GlobeAltIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import type { 
  SettingValidationResult, 
  AppSetting, 
  SettingCategory,
  BusinessSettings 
} from '../../../types/settings'

interface ValidationIssue {
  id: string
  category: SettingCategory
  settingKey: string
  severity: 'error' | 'warning' | 'info'
  message: string
  suggestion?: string
  autoFixable?: boolean
}

interface SettingsValidationPanelProps {
  settings: Record<SettingCategory, any>
  onValidationComplete?: (results: SettingValidationResult) => void
  onAutoFix?: (issues: ValidationIssue[]) => Promise<void>
  className?: string
}

interface ValidationState {
  isValidating: boolean
  issues: ValidationIssue[]
  lastValidated: Date | null
  totalChecks: number
  passedChecks: number
}

export const SettingsValidationPanel: React.FC<SettingsValidationPanelProps> = ({
  settings,
  onValidationComplete,
  onAutoFix,
  className = ''
}) => {
  const [validationState, setValidationState] = useState<ValidationState>({
    isValidating: false,
    issues: [],
    lastValidated: null,
    totalChecks: 0,
    passedChecks: 0
  })

  // Business Logic Validation Rules
  const validateBusinessSettings = useCallback((businessSettings: BusinessSettings): ValidationIssue[] => {
    const issues: ValidationIssue[] = []
    
    // Vehicle rates validation
    if (businessSettings.vehicle_rates) {
      const rates = businessSettings.vehicle_rates
      
      // Check for zero or negative rates
      Object.entries(rates).forEach(([vehicleType, rate]) => {
        if (rate <= 0) {
          issues.push({
            id: `rate_zero_${vehicleType}`,
            category: 'business',
            settingKey: 'vehicle_rates',
            severity: 'error',
            message: `${vehicleType} rate cannot be zero or negative`,
            suggestion: 'Set a positive daily rate for this vehicle type',
            autoFixable: false
          })
        }
      })

      // Check rate hierarchy (2W < 4W < 6W < Trailer)
      const expectedOrder = ['2 Wheeler', '4 Wheeler', '6 Wheeler', 'Trailer']
      for (let i = 0; i < expectedOrder.length - 1; i++) {
        const current = rates[expectedOrder[i] as keyof typeof rates]
        const next = rates[expectedOrder[i + 1] as keyof typeof rates]
        
        if (current && next && current >= next) {
          issues.push({
            id: `rate_hierarchy_${i}`,
            category: 'business',
            settingKey: 'vehicle_rates',
            severity: 'warning',
            message: `${expectedOrder[i]} rate (₹${current}) should be less than ${expectedOrder[i + 1]} rate (₹${next})`,
            suggestion: 'Adjust rates to follow the logical hierarchy: 2W < 4W < 6W < Trailer',
            autoFixable: true
          })
        }
      }

      // Check for unusually high rates
      Object.entries(rates).forEach(([vehicleType, rate]) => {
        if (rate > 5000) {
          issues.push({
            id: `rate_high_${vehicleType}`,
            category: 'business',
            settingKey: 'vehicle_rates',
            severity: 'warning',
            message: `${vehicleType} rate (₹${rate}) seems unusually high`,
            suggestion: 'Verify this rate is correct for your location',
            autoFixable: false
          })
        }
      })
    }

    // Operating hours validation
    if (businessSettings.operating_hours) {
      const { start, end } = businessSettings.operating_hours
      
      if (start && end) {
        const startTime = new Date(`2000-01-01T${start}`)
        const endTime = new Date(`2000-01-01T${end}`)
        
        if (startTime >= endTime) {
          issues.push({
            id: 'operating_hours_invalid',
            category: 'business',
            settingKey: 'operating_hours',
            severity: 'error',
            message: 'Opening time must be before closing time',
            suggestion: 'Adjust operating hours to have a valid time range',
            autoFixable: false
          })
        }

        // Check for 24/7 operations
        const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
        if (duration >= 24) {
          issues.push({
            id: 'operating_hours_24_7',
            category: 'business',
            settingKey: 'operating_hours',
            severity: 'info',
            message: 'Operating 24/7 - consider if this is intended',
            suggestion: 'Verify if round-the-clock operations are required',
            autoFixable: false
          })
        }

        // Check for very short operating hours
        if (duration < 8) {
          issues.push({
            id: 'operating_hours_short',
            category: 'business',
            settingKey: 'operating_hours',
            severity: 'warning',
            message: `Operating hours are quite short (${duration} hours)`,
            suggestion: 'Consider if extended hours would be beneficial',
            autoFixable: false
          })
        }
      }
    }

    // Payment methods validation
    if (businessSettings.payment_methods) {
      if (businessSettings.payment_methods.length === 0) {
        issues.push({
          id: 'no_payment_methods',
          category: 'business',
          settingKey: 'payment_methods',
          severity: 'error',
          message: 'No payment methods configured',
          suggestion: 'Add at least one payment method (Cash, Card, UPI, etc.)',
          autoFixable: true
        })
      }

      // Check for cash-only operations
      if (businessSettings.payment_methods.length === 1 && businessSettings.payment_methods[0] === 'Cash') {
        issues.push({
          id: 'cash_only',
          category: 'business',
          settingKey: 'payment_methods',
          severity: 'info',
          message: 'Only cash payments accepted',
          suggestion: 'Consider adding digital payment options for customer convenience',
          autoFixable: false
        })
      }
    }

    // Minimum charge days validation
    if (businessSettings.minimum_charge_days) {
      if (businessSettings.minimum_charge_days > 7) {
        issues.push({
          id: 'min_charge_high',
          category: 'business',
          settingKey: 'minimum_charge_days',
          severity: 'warning',
          message: `Minimum charge period is ${businessSettings.minimum_charge_days} days`,
          suggestion: 'Consider if this minimum period is customer-friendly',
          autoFixable: false
        })
      }
    }

    return issues
  }, [])

  // Cross-category validation
  const validateCrossCategory = useCallback((allSettings: Record<SettingCategory, any>): ValidationIssue[] => {
    const issues: ValidationIssue[] = []

    // Business vs Security validation
    if (allSettings.business?.operating_hours && allSettings.security?.session_inactivity_timeout) {
      const operatingHours = allSettings.business.operating_hours
      const sessionTimeout = allSettings.security.session_inactivity_timeout

      if (operatingHours.start && operatingHours.end) {
        const startTime = new Date(`2000-01-01T${operatingHours.start}`)
        const endTime = new Date(`2000-01-01T${operatingHours.end}`)
        const operatingDurationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60)

        if (sessionTimeout < operatingDurationMinutes / 2) {
          issues.push({
            id: 'session_timeout_short',
            category: 'security',
            settingKey: 'session_inactivity_timeout',
            severity: 'warning',
            message: 'Session timeout might be too short for operating hours',
            suggestion: 'Consider increasing session timeout for better user experience',
            autoFixable: true
          })
        }
      }
    }

    // Performance vs Business validation
    if (allSettings.performance?.api_timeout_ms && allSettings.business?.vehicle_rates) {
      const apiTimeout = allSettings.performance.api_timeout_ms
      if (apiTimeout < 5000) {
        issues.push({
          id: 'api_timeout_short',
          category: 'performance',
          settingKey: 'api_timeout_ms',
          severity: 'warning',
          message: 'API timeout might be too short for complex operations',
          suggestion: 'Consider increasing timeout to at least 5 seconds',
          autoFixable: true
        })
      }
    }

    return issues
  }, [])

  // Run comprehensive validation
  const runValidation = useCallback(async () => {
    setValidationState(prev => ({ ...prev, isValidating: true }))

    try {
      let allIssues: ValidationIssue[] = []
      let totalChecks = 0
      let passedChecks = 0

      // Business settings validation
      if (settings.business) {
        const businessIssues = validateBusinessSettings(settings.business)
        allIssues = [...allIssues, ...businessIssues]
        totalChecks += 10 // Number of business checks
        passedChecks += (10 - businessIssues.length)
      }

      // Cross-category validation
      const crossCategoryIssues = validateCrossCategory(settings)
      allIssues = [...allIssues, ...crossCategoryIssues]
      totalChecks += 5 // Number of cross-category checks
      passedChecks += (5 - crossCategoryIssues.length)

      // Additional category validations would go here...

      const validationResult: SettingValidationResult = {
        isValid: allIssues.filter(issue => issue.severity === 'error').length === 0,
        errors: allIssues.filter(issue => issue.severity === 'error').map(issue => issue.message),
        warnings: allIssues.filter(issue => issue.severity === 'warning').map(issue => issue.message)
      }

      setValidationState({
        isValidating: false,
        issues: allIssues,
        lastValidated: new Date(),
        totalChecks,
        passedChecks
      })

      onValidationComplete?.(validationResult)
    } catch (error) {
      console.error('Validation failed:', error)
      setValidationState(prev => ({ ...prev, isValidating: false }))
    }
  }, [settings, validateBusinessSettings, validateCrossCategory, onValidationComplete])

  // Auto-fix issues
  const handleAutoFix = useCallback(async () => {
    const autoFixableIssues = validationState.issues.filter(issue => issue.autoFixable)
    
    if (autoFixableIssues.length > 0 && onAutoFix) {
      try {
        await onAutoFix(autoFixableIssues)
        // Re-run validation after auto-fix
        await runValidation()
      } catch (error) {
        console.error('Auto-fix failed:', error)
      }
    }
  }, [validationState.issues, onAutoFix, runValidation])

  // Run validation when settings change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      runValidation()
    }, 1000) // Debounce validation

    return () => clearTimeout(timeoutId)
  }, [settings, runValidation])

  const getIssueIcon = (severity: ValidationIssue['severity']) => {
    switch (severity) {
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
      case 'info':
        return <InformationCircleIcon className="w-5 h-5 text-blue-500" />
    }
  }

  const getIssueColors = (severity: ValidationIssue['severity']) => {
    switch (severity) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  const errorCount = validationState.issues.filter(issue => issue.severity === 'error').length
  const warningCount = validationState.issues.filter(issue => issue.severity === 'warning').length
  const infoCount = validationState.issues.filter(issue => issue.severity === 'info').length
  const autoFixableCount = validationState.issues.filter(issue => issue.autoFixable).length

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShieldCheckIcon className="w-6 h-6 text-gray-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Settings Validation</h3>
              <p className="text-sm text-gray-600">
                Automated checks for configuration issues and best practices
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {validationState.lastValidated && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <ClockIcon className="w-4 h-4" />
                <span>Last checked: {validationState.lastValidated.toLocaleTimeString()}</span>
              </div>
            )}

            <button
              onClick={runValidation}
              disabled={validationState.isValidating}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 ${validationState.isValidating ? 'animate-spin' : ''}`} />
              <span>Re-validate</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="px-6 py-4 bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{validationState.passedChecks}</div>
            <div className="text-sm text-gray-600">Passed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{errorCount}</div>
            <div className="text-sm text-gray-600">Errors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
            <div className="text-sm text-gray-600">Warnings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{infoCount}</div>
            <div className="text-sm text-gray-600">Suggestions</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Validation Score</span>
            <span>{validationState.totalChecks > 0 ? Math.round((validationState.passedChecks / validationState.totalChecks) * 100) : 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-green-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ 
                width: validationState.totalChecks > 0 
                  ? `${(validationState.passedChecks / validationState.totalChecks) * 100}%` 
                  : '0%' 
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* Issues List */}
      <div className="px-6 py-4">
        {validationState.isValidating ? (
          <div className="flex items-center justify-center py-8">
            <ArrowPathIcon className="w-6 h-6 text-blue-500 animate-spin mr-2" />
            <span className="text-gray-600">Running validation checks...</span>
          </div>
        ) : validationState.issues.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Issues Found</h4>
              {autoFixableCount > 0 && (
                <button
                  onClick={handleAutoFix}
                  className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Auto-fix {autoFixableCount} issues</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {validationState.issues.map((issue, index) => (
                  <motion.div
                    key={issue.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-lg border ${getIssueColors(issue.severity)}`}
                  >
                    <div className="flex items-start space-x-3">
                      {getIssueIcon(issue.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium">{issue.message}</h5>
                          {issue.autoFixable && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              Auto-fixable
                            </span>
                          )}
                        </div>
                        {issue.suggestion && (
                          <p className="text-sm mt-1 opacity-80">{issue.suggestion}</p>
                        )}
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-xs opacity-60">
                            {issue.category} → {issue.settingKey}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">All Checks Passed!</h4>
            <p className="text-gray-600">
              Your settings configuration looks great. No issues found.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsValidationPanel