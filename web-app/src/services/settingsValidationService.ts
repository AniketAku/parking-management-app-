/**
 * Settings Validation Service
 * Comprehensive validation system for all settings categories with
 * business logic validation, cross-field validation, and security checks.
 */

import type { 
  AppSetting, 
  SettingValidationResult, 
  SettingValidationSchema,
  BusinessSettings,
  UserManagementSettings,
  UIThemeSettings,
  SystemSettings,
  ValidationSettings,
  LocalizationSettings,
  PerformanceSettings,
  NotificationSettings,
  ReportingSettings,
  SecuritySettings,
  AllSettings
} from '../types/settings'

interface ValidationRule {
  field: string
  validator: (value: any, allSettings?: any) => ValidationError[]
  required?: boolean
  dependencies?: string[]
}

interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning' | 'info'
  code: string
  suggestion?: string
}

interface ValidationContext {
  category: string
  existingSettings: any
  userRole?: string
  systemCapabilities?: string[]
}

export class SettingsValidationService {
  private validationRules: Map<string, ValidationRule[]> = new Map()
  private customValidators: Map<string, Function> = new Map()

  constructor() {
    this.initializeValidationRules()
  }

  /**
   * Initialize all validation rules for different setting categories
   */
  private initializeValidationRules(): void {
    this.initializeBusinessValidation()
    this.initializeUserManagementValidation()
    this.initializeUIThemeValidation()
    this.initializeSystemValidation()
    this.initializeValidationRulesValidation()
    this.initializeLocalizationValidation()
    this.initializePerformanceValidation()
    this.initializeNotificationValidation()
    this.initializeReportingValidation()
    this.initializeSecurityValidation()
  }

  /**
   * Business Settings Validation Rules
   */
  private initializeBusinessValidation(): void {
    const rules: ValidationRule[] = [
      {
        field: 'vehicle_rates',
        required: true,
        validator: (rates: any) => {
          const errors: ValidationError[] = []
          
          if (!rates || typeof rates !== 'object') {
            errors.push({
              field: 'vehicle_rates',
              message: 'Vehicle rates must be provided',
              severity: 'error',
              code: 'REQUIRED_FIELD',
              suggestion: 'Configure daily rates for all vehicle types'
            })
            return errors
          }

          // Required vehicle types
          const requiredTypes = ['Trailer', '6 Wheeler', '4 Wheeler', '2 Wheeler']
          requiredTypes.forEach(type => {
            if (!rates[type] || rates[type] <= 0) {
              errors.push({
                field: 'vehicle_rates',
                message: `${type} rate must be greater than 0`,
                severity: 'error',
                code: 'INVALID_RATE',
                suggestion: `Set a positive daily rate for ${type}`
              })
            }
          })

          // Rate hierarchy validation
          const rateOrder = [
            { type: '2 Wheeler', rate: rates['2 Wheeler'] },
            { type: '4 Wheeler', rate: rates['4 Wheeler'] },
            { type: '6 Wheeler', rate: rates['6 Wheeler'] },
            { type: 'Trailer', rate: rates['Trailer'] }
          ]

          for (let i = 0; i < rateOrder.length - 1; i++) {
            if (rateOrder[i].rate && rateOrder[i + 1].rate && 
                rateOrder[i].rate >= rateOrder[i + 1].rate) {
              errors.push({
                field: 'vehicle_rates',
                message: `${rateOrder[i].type} rate should be less than ${rateOrder[i + 1].type} rate`,
                severity: 'warning',
                code: 'RATE_HIERARCHY',
                suggestion: 'Adjust rates to follow logical hierarchy: 2W < 4W < 6W < Trailer'
              })
            }
          }

          // Unusually high rates warning
          Object.entries(rates).forEach(([type, rate]) => {
            if (typeof rate === 'number' && rate > 10000) {
              errors.push({
                field: 'vehicle_rates',
                message: `${type} rate (₹${rate}) seems unusually high`,
                severity: 'warning',
                code: 'HIGH_RATE',
                suggestion: 'Verify this rate is appropriate for your location'
              })
            }
          })

          return errors
        }
      },
      {
        field: 'operating_hours',
        required: true,
        validator: (hours: any) => {
          const errors: ValidationError[] = []
          
          if (!hours?.start || !hours?.end) {
            errors.push({
              field: 'operating_hours',
              message: 'Operating hours must include start and end times',
              severity: 'error',
              code: 'REQUIRED_FIELD'
            })
            return errors
          }

          const start = new Date(`2000-01-01T${hours.start}`)
          const end = new Date(`2000-01-01T${hours.end}`)

          if (start >= end) {
            errors.push({
              field: 'operating_hours',
              message: 'Opening time must be before closing time',
              severity: 'error',
              code: 'INVALID_TIME_RANGE',
              suggestion: 'Ensure end time is after start time'
            })
          }

          const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
          if (duration < 6) {
            errors.push({
              field: 'operating_hours',
              message: `Operating hours are very short (${duration} hours)`,
              severity: 'warning',
              code: 'SHORT_HOURS',
              suggestion: 'Consider extending operating hours for better service'
            })
          }

          if (duration >= 24) {
            errors.push({
              field: 'operating_hours',
              message: 'Operating 24/7 - ensure this is intended',
              severity: 'info',
              code: 'CONTINUOUS_OPERATION'
            })
          }

          return errors
        }
      },
      {
        field: 'payment_methods',
        required: true,
        validator: (methods: string[]) => {
          const errors: ValidationError[] = []
          
          if (!methods || methods.length === 0) {
            errors.push({
              field: 'payment_methods',
              message: 'At least one payment method must be configured',
              severity: 'error',
              code: 'REQUIRED_FIELD',
              suggestion: 'Add payment methods like Cash, UPI, Credit Card'
            })
          }

          const validMethods = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Online', 'Digital Wallet']
          methods?.forEach(method => {
            if (!validMethods.includes(method)) {
              errors.push({
                field: 'payment_methods',
                message: `Unknown payment method: ${method}`,
                severity: 'warning',
                code: 'UNKNOWN_METHOD',
                suggestion: `Use one of: ${validMethods.join(', ')}`
              })
            }
          })

          if (methods?.length === 1 && methods[0] === 'Cash') {
            errors.push({
              field: 'payment_methods',
              message: 'Only cash payments accepted',
              severity: 'info',
              code: 'CASH_ONLY',
              suggestion: 'Consider adding digital payment options'
            })
          }

          return errors
        }
      },
      {
        field: 'minimum_charge_days',
        validator: (days: number) => {
          const errors: ValidationError[] = []
          
          if (days < 1) {
            errors.push({
              field: 'minimum_charge_days',
              message: 'Minimum charge days must be at least 1',
              severity: 'error',
              code: 'INVALID_VALUE'
            })
          }

          if (days > 30) {
            errors.push({
              field: 'minimum_charge_days',
              message: `Minimum charge period (${days} days) seems excessive`,
              severity: 'warning',
              code: 'HIGH_VALUE',
              suggestion: 'Consider customer impact of long minimum periods'
            })
          }

          return errors
        }
      }
    ]

    this.validationRules.set('business', rules)
  }

  /**
   * System Settings Validation Rules
   */
  private initializeSystemValidation(): void {
    const rules: ValidationRule[] = [
      {
        field: 'api_timeout_ms',
        validator: (timeout: number) => {
          const errors: ValidationError[] = []
          
          if (timeout < 1000) {
            errors.push({
              field: 'api_timeout_ms',
              message: 'API timeout too short, may cause failures',
              severity: 'warning',
              code: 'LOW_TIMEOUT',
              suggestion: 'Consider at least 5000ms for reliability'
            })
          }

          if (timeout > 60000) {
            errors.push({
              field: 'api_timeout_ms',
              message: 'API timeout very long, may impact user experience',
              severity: 'warning',
              code: 'HIGH_TIMEOUT',
              suggestion: 'Consider reducing to 30000ms or less'
            })
          }

          return errors
        }
      },
      {
        field: 'retry_attempts',
        validator: (attempts: number) => {
          const errors: ValidationError[] = []
          
          if (attempts < 1) {
            errors.push({
              field: 'retry_attempts',
              message: 'At least 1 retry attempt recommended',
              severity: 'warning',
              code: 'NO_RETRY'
            })
          }

          if (attempts > 10) {
            errors.push({
              field: 'retry_attempts',
              message: 'Too many retry attempts may impact performance',
              severity: 'warning',
              code: 'EXCESSIVE_RETRY',
              suggestion: 'Consider 3-5 attempts for optimal balance'
            })
          }

          return errors
        }
      },
      {
        field: 'retry_delay_ms',
        dependencies: ['retry_attempts'],
        validator: (delay: number, allSettings: any) => {
          const errors: ValidationError[] = []
          
          if (delay < 100) {
            errors.push({
              field: 'retry_delay_ms',
              message: 'Retry delay too short',
              severity: 'warning',
              code: 'SHORT_DELAY',
              suggestion: 'Use at least 1000ms between retries'
            })
          }

          const attempts = allSettings?.retry_attempts || 3
          const totalDelay = delay * attempts
          if (totalDelay > 30000) {
            errors.push({
              field: 'retry_delay_ms',
              message: 'Total retry time may be too long for users',
              severity: 'info',
              code: 'LONG_TOTAL_DELAY',
              suggestion: 'Consider exponential backoff or shorter delays'
            })
          }

          return errors
        }
      }
    ]

    this.validationRules.set('system', rules)
  }

  /**
   * Security Settings Validation Rules
   */
  private initializeSecurityValidation(): void {
    const rules: ValidationRule[] = [
      {
        field: 'session_inactivity_timeout',
        validator: (timeout: number) => {
          const errors: ValidationError[] = []
          
          if (timeout < 5) {
            errors.push({
              field: 'session_inactivity_timeout',
              message: 'Session timeout too short for practical use',
              severity: 'warning',
              code: 'SHORT_SESSION',
              suggestion: 'Consider at least 15 minutes'
            })
          }

          if (timeout > 1440) { // 24 hours
            errors.push({
              field: 'session_inactivity_timeout',
              message: 'Very long session timeout may pose security risks',
              severity: 'warning',
              code: 'LONG_SESSION',
              suggestion: 'Consider shorter timeout for security'
            })
          }

          return errors
        }
      },
      {
        field: 'max_login_attempts',
        validator: (attempts: number) => {
          const errors: ValidationError[] = []
          
          if (attempts < 3) {
            errors.push({
              field: 'max_login_attempts',
              message: 'Very restrictive login attempts limit',
              severity: 'warning',
              code: 'RESTRICTIVE_LIMIT',
              suggestion: 'Consider allowing at least 3-5 attempts'
            })
          }

          if (attempts > 20) {
            errors.push({
              field: 'max_login_attempts',
              message: 'High login attempts limit may weaken security',
              severity: 'warning',
              code: 'HIGH_LIMIT',
              suggestion: 'Consider reducing to 5-10 attempts'
            })
          }

          return errors
        }
      },
      {
        field: 'login_lockout_duration',
        dependencies: ['max_login_attempts'],
        validator: (duration: number, allSettings: any) => {
          const errors: ValidationError[] = []
          
          if (duration < 60) {
            errors.push({
              field: 'login_lockout_duration',
              message: 'Very short lockout duration',
              severity: 'info',
              code: 'SHORT_LOCKOUT',
              suggestion: 'Consider at least 15 minutes for security'
            })
          }

          if (duration > 86400) { // 24 hours
            errors.push({
              field: 'login_lockout_duration',
              message: 'Very long lockout may impact legitimate users',
              severity: 'warning',
              code: 'LONG_LOCKOUT',
              suggestion: 'Consider progressive lockout or manual unlock'
            })
          }

          return errors
        }
      }
    ]

    this.validationRules.set('security', rules)
  }

  /**
   * Performance Settings Validation Rules
   */
  private initializePerformanceValidation(): void {
    const rules: ValidationRule[] = [
      {
        field: 'lcp_budget_ms',
        validator: (budget: number) => {
          const errors: ValidationError[] = []
          
          if (budget > 4000) {
            errors.push({
              field: 'lcp_budget_ms',
              message: 'LCP budget exceeds recommended 2.5s for good user experience',
              severity: 'warning',
              code: 'HIGH_LCP_BUDGET',
              suggestion: 'Target 2500ms or less for optimal performance'
            })
          }

          return errors
        }
      },
      {
        field: 'bundle_size_budget_kb',
        validator: (budget: number) => {
          const errors: ValidationError[] = []
          
          if (budget > 1000) {
            errors.push({
              field: 'bundle_size_budget_kb',
              message: 'Large bundle size may impact load times',
              severity: 'warning',
              code: 'LARGE_BUNDLE',
              suggestion: 'Consider code splitting and lazy loading'
            })
          }

          return errors
        }
      }
    ]

    this.validationRules.set('performance', rules)
  }

  /**
   * Initialize other category validations (simplified for brevity)
   */
  private initializeUserManagementValidation(): void {
    this.validationRules.set('user_mgmt', [])
  }

  private initializeUIThemeValidation(): void {
    this.validationRules.set('ui_theme', [])
  }

  private initializeValidationRulesValidation(): void {
    this.validationRules.set('validation', [])
  }

  private initializeLocalizationValidation(): void {
    this.validationRules.set('localization', [])
  }

  private initializeNotificationValidation(): void {
    this.validationRules.set('notifications', [])
  }

  private initializeReportingValidation(): void {
    this.validationRules.set('reporting', [])
  }

  /**
   * Validate a single setting value
   */
  async validateSetting(
    setting: AppSetting,
    value: any,
    context?: ValidationContext
  ): Promise<SettingValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Basic type validation
      const typeErrors = this.validateDataType(setting, value)
      errors.push(...typeErrors.filter(e => e.severity === 'error').map(e => e.message))
      warnings.push(...typeErrors.filter(e => e.severity === 'warning').map(e => e.message))

      // Range validation
      const rangeErrors = this.validateRange(setting, value)
      errors.push(...rangeErrors.filter(e => e.severity === 'error').map(e => e.message))
      warnings.push(...rangeErrors.filter(e => e.severity === 'warning').map(e => e.message))

      // Business logic validation
      const businessErrors = await this.validateBusinessLogic(setting, value, context)
      errors.push(...businessErrors.filter(e => e.severity === 'error').map(e => e.message))
      warnings.push(...businessErrors.filter(e => e.severity === 'warning').map(e => e.message))

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
    } catch (error) {
      return {
        isValid: false,
        errors: ['Validation failed: ' + (error as Error).message],
        warnings: []
      }
    }
  }

  /**
   * Validate entire settings category
   */
  async validateCategory(
    category: string,
    settings: any,
    context?: ValidationContext
  ): Promise<SettingValidationResult> {
    const allErrors: ValidationError[] = []
    const rules = this.validationRules.get(category) || []

    for (const rule of rules) {
      if (rule.required && (settings[rule.field] === undefined || settings[rule.field] === null)) {
        allErrors.push({
          field: rule.field,
          message: `${rule.field} is required`,
          severity: 'error',
          code: 'REQUIRED_FIELD'
        })
        continue
      }

      if (settings[rule.field] !== undefined) {
        const fieldErrors = rule.validator(settings[rule.field], settings)
        allErrors.push(...fieldErrors)
      }
    }

    // Cross-field validation
    const crossFieldErrors = await this.validateCrossFields(category, settings, context)
    allErrors.push(...crossFieldErrors)

    const errors = allErrors.filter(e => e.severity === 'error').map(e => e.message)
    const warnings = allErrors.filter(e => e.severity === 'warning').map(e => e.message)

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate all settings (comprehensive validation)
   */
  async validateAllSettings(
    allSettings: Partial<AllSettings>,
    context?: ValidationContext
  ): Promise<SettingValidationResult> {
    const allErrors: ValidationError[] = []

    // Validate each category
    for (const [category, settings] of Object.entries(allSettings)) {
      if (settings) {
        const categoryResult = await this.validateCategory(category, settings, context)
        if (!categoryResult.isValid) {
          categoryResult.errors.forEach(error => {
            allErrors.push({
              field: `${category}.unknown`,
              message: error,
              severity: 'error',
              code: 'CATEGORY_ERROR'
            })
          })
        }
        categoryResult.warnings.forEach(warning => {
          allErrors.push({
            field: `${category}.unknown`,
            message: warning,
            severity: 'warning',
            code: 'CATEGORY_WARNING'
          })
        })
      }
    }

    // Global cross-category validation
    const globalErrors = await this.validateGlobalConstraints(allSettings, context)
    allErrors.push(...globalErrors)

    const errors = allErrors.filter(e => e.severity === 'error').map(e => e.message)
    const warnings = allErrors.filter(e => e.severity === 'warning').map(e => e.message)

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Data type validation
   */
  private validateDataType(setting: AppSetting, value: any): ValidationError[] {
    const errors: ValidationError[] = []

    switch (setting.data_type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push({
            field: setting.key,
            message: 'Must be a text value',
            severity: 'error',
            code: 'INVALID_TYPE'
          })
        }
        break

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push({
            field: setting.key,
            message: 'Must be a valid number',
            severity: 'error',
            code: 'INVALID_TYPE'
          })
        }
        break

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push({
            field: setting.key,
            message: 'Must be true or false',
            severity: 'error',
            code: 'INVALID_TYPE'
          })
        }
        break

      case 'array':
        if (!Array.isArray(value)) {
          errors.push({
            field: setting.key,
            message: 'Must be a list of values',
            severity: 'error',
            code: 'INVALID_TYPE'
          })
        }
        break

      case 'json':
        try {
          if (typeof value === 'string') {
            JSON.parse(value)
          } else if (typeof value !== 'object') {
            throw new Error('Invalid JSON')
          }
        } catch {
          errors.push({
            field: setting.key,
            message: 'Must be valid JSON',
            severity: 'error',
            code: 'INVALID_JSON'
          })
        }
        break
    }

    return errors
  }

  /**
   * Range and constraint validation
   */
  private validateRange(setting: AppSetting, value: any): ValidationError[] {
    const errors: ValidationError[] = []

    if (setting.data_type === 'number') {
      if (setting.min_value !== undefined && value < setting.min_value) {
        errors.push({
          field: setting.key,
          message: `Minimum value is ${setting.min_value}`,
          severity: 'error',
          code: 'MIN_VALUE'
        })
      }

      if (setting.max_value !== undefined && value > setting.max_value) {
        errors.push({
          field: setting.key,
          message: `Maximum value is ${setting.max_value}`,
          severity: 'error',
          code: 'MAX_VALUE'
        })
      }
    }

    if (setting.data_type === 'string') {
      if (setting.min_length !== undefined && value.length < setting.min_length) {
        errors.push({
          field: setting.key,
          message: `Minimum length is ${setting.min_length} characters`,
          severity: 'error',
          code: 'MIN_LENGTH'
        })
      }

      if (setting.max_length !== undefined && value.length > setting.max_length) {
        errors.push({
          field: setting.key,
          message: `Maximum length is ${setting.max_length} characters`,
          severity: 'error',
          code: 'MAX_LENGTH'
        })
      }
    }

    if (setting.enum_values && !setting.enum_values.includes(value)) {
      errors.push({
        field: setting.key,
        message: `Must be one of: ${setting.enum_values.join(', ')}`,
        severity: 'error',
        code: 'INVALID_ENUM'
      })
    }

    return errors
  }

  /**
   * Business logic validation
   */
  private async validateBusinessLogic(
    setting: AppSetting,
    value: any,
    context?: ValidationContext
  ): Promise<ValidationError[]> {
    // Custom business logic validation would go here
    // This could include API calls to validate business rules
    return []
  }

  /**
   * Cross-field validation within a category
   */
  private async validateCrossFields(
    category: string,
    settings: any,
    context?: ValidationContext
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = []

    // Business settings cross-field validation
    if (category === 'business') {
      // Validate that operating hours and session timeout make sense together
      if (settings.operating_hours && context?.existingSettings?.security?.session_inactivity_timeout) {
        const operatingDuration = this.calculateOperatingDuration(settings.operating_hours)
        const sessionTimeout = context.existingSettings.security.session_inactivity_timeout

        if (sessionTimeout < operatingDuration / 4) {
          errors.push({
            field: 'session_timeout_vs_hours',
            message: 'Session timeout may be too short for operating hours',
            severity: 'warning',
            code: 'CROSS_FIELD_WARNING',
            suggestion: 'Consider longer session timeout for better user experience'
          })
        }
      }
    }

    return errors
  }

  /**
   * Global cross-category validation
   */
  private async validateGlobalConstraints(
    allSettings: Partial<AllSettings>,
    context?: ValidationContext
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = []

    // Example: Validate business hours vs security settings
    if (allSettings.business?.operating_hours && allSettings.security?.session_inactivity_timeout) {
      const operatingDuration = this.calculateOperatingDuration(allSettings.business.operating_hours)
      const sessionTimeout = allSettings.security.session_inactivity_timeout

      if (sessionTimeout > operatingDuration * 60) {
        errors.push({
          field: 'global_consistency',
          message: 'Session timeout longer than daily operating hours',
          severity: 'info',
          code: 'GLOBAL_INFO',
          suggestion: 'This may be intentional for 24/7 access'
        })
      }
    }

    // Performance vs System settings validation
    if (allSettings.performance?.api_timeout_ms && allSettings.system?.api_timeout_ms) {
      if (allSettings.performance.api_timeout_ms < allSettings.system.api_timeout_ms) {
        errors.push({
          field: 'timeout_consistency',
          message: 'Performance budget lower than system timeout',
          severity: 'warning',
          code: 'INCONSISTENT_TIMEOUTS',
          suggestion: 'Align performance budgets with system timeouts'
        })
      }
    }

    return errors
  }

  /**
   * Utility method to calculate operating duration in hours
   */
  private calculateOperatingDuration(operatingHours: any): number {
    if (!operatingHours?.start || !operatingHours?.end) return 0
    
    const start = new Date(`2000-01-01T${operatingHours.start}`)
    const end = new Date(`2000-01-01T${operatingHours.end}`)
    
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  }

  /**
   * Register custom validator
   */
  registerCustomValidator(settingKey: string, validator: Function): void {
    this.customValidators.set(settingKey, validator)
  }

  /**
   * Get validation schema for a setting
   */
  getValidationSchema(setting: AppSetting): SettingValidationSchema {
    const schema: SettingValidationSchema = {
      type: setting.data_type
    }

    if (setting.min_value !== undefined) schema.minimum = setting.min_value
    if (setting.max_value !== undefined) schema.maximum = setting.max_value
    if (setting.min_length !== undefined) schema.minLength = setting.min_length
    if (setting.max_length !== undefined) schema.maxLength = setting.max_length
    if (setting.enum_values) schema.enum = setting.enum_values
    if (setting.validation_rules) {
      Object.assign(schema, setting.validation_rules)
    }

    return schema
  }
}

export const settingsValidationService = new SettingsValidationService()
export default settingsValidationService