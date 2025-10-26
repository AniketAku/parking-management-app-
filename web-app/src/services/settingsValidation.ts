/**
 * Settings Validation Service
 * Comprehensive validation system for settings with type checking,
 * custom rules, and runtime validation
 */

import type {
  AppSetting,
  SettingDataType,
  SettingCategory,
  SettingValidationResult,
  SettingValidationSchema,
  AllSettings,
  BusinessSettings,
  UIThemeSettings,
  SystemSettings,
  ValidationSettings,
  LocalizationSettings,
  PerformanceSettings,
  SecuritySettings,
  UserManagementSettings,
  NotificationSettings,
  ReportingSettings,
  SettingValue
} from '../types/settings'

export interface ValidationRule {
  name: string
  description: string
  validator: (value: SettingValue, setting: AppSetting, context?: ValidationContext) => ValidationRuleResult
  categories?: SettingCategory[]
  severity: 'error' | 'warning'
  async?: boolean
}

export interface ValidationRuleResult {
  isValid: boolean
  message?: string
  suggestion?: string
  details?: Record<string, SettingValue>
}

export interface ValidationContext {
  userId?: string
  locationId?: string
  relatedSettings?: Record<string, SettingValue>
  environment?: 'development' | 'staging' | 'production'
  performanceMode?: boolean
}

export interface SettingsValidationReport {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  suggestions: ValidationSuggestion[]
  performance: {
    validationTime: number
    rulesExecuted: number
    asyncRulesCount: number
  }
}

export interface ValidationError {
  key: string
  category: SettingCategory
  rule: string
  message: string
  value: SettingValue
  details?: Record<string, SettingValue>
}

export interface ValidationWarning {
  key: string
  category: SettingCategory
  rule: string
  message: string
  suggestion?: string
  impact: 'low' | 'medium' | 'high'
}

export interface ValidationSuggestion {
  key: string
  category: SettingCategory
  message: string
  suggestedValue?: SettingValue
  reason: string
  priority: 'low' | 'medium' | 'high'
}

/**
 * Settings Validation Service
 * Provides comprehensive validation for all setting types
 */
export class SettingsValidationService {
  private validationRules: Map<string, ValidationRule> = new Map()
  private typeValidators: Map<SettingDataType, (value: SettingValue) => ValidationRuleResult> = new Map()
  private categoryValidators: Map<SettingCategory, ValidationRule[]> = new Map()

  constructor() {
    this.initializeTypeValidators()
    this.initializeValidationRules()
    this.initializeCategoryValidators()
  }

  /**
   * Validate a single setting
   */
  async validateSetting(
    setting: AppSetting,
    context?: ValidationContext
  ): Promise<SettingValidationResult> {
    const startTime = Date.now()
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Type validation
      const typeResult = this.validateType(setting.value, setting.data_type)
      if (!typeResult.isValid) {
        errors.push(typeResult.message || `Invalid type for ${setting.data_type}`)
      }

      // Basic validation rules from database schema
      const basicResult = this.validateBasicRules(setting)
      if (!basicResult.isValid) {
        errors.push(...basicResult.errors)
        warnings.push(...basicResult.warnings)
      }

      // Custom validation rules
      const customResult = await this.validateCustomRules(setting, context)
      if (!customResult.isValid) {
        errors.push(...customResult.errors)
        warnings.push(...customResult.warnings)
      }

      // Category-specific validation
      const categoryResult = await this.validateCategoryRules(setting, context)
      if (!categoryResult.isValid) {
        errors.push(...categoryResult.errors)
        warnings.push(...categoryResult.warnings)
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }

    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error}`],
        warnings: []
      }
    }
  }

  /**
   * Validate multiple settings with cross-setting validation
   */
  async validateSettings(
    settings: AppSetting[],
    context?: ValidationContext
  ): Promise<SettingsValidationReport> {
    const startTime = Date.now()
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const suggestions: ValidationSuggestion[] = []
    let rulesExecuted = 0
    let asyncRulesCount = 0

    // Individual setting validation
    for (const setting of settings) {
      const result = await this.validateSetting(setting, context)
      rulesExecuted++

      if (!result.isValid) {
        result.errors.forEach(message => {
          errors.push({
            key: setting.key,
            category: setting.category,
            rule: 'individual_validation',
            message,
            value: setting.value
          })
        })
      }

      result.warnings.forEach(message => {
        warnings.push({
          key: setting.key,
          category: setting.category,
          rule: 'individual_validation',
          message,
          impact: 'medium'
        })
      })
    }

    // Cross-setting validation
    const crossValidationResult = await this.validateCrossSettings(settings, context)
    rulesExecuted += crossValidationResult.rulesExecuted
    asyncRulesCount += crossValidationResult.asyncRulesCount

    errors.push(...crossValidationResult.errors)
    warnings.push(...crossValidationResult.warnings)
    suggestions.push(...crossValidationResult.suggestions)

    const validationTime = Date.now() - startTime

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      performance: {
        validationTime,
        rulesExecuted,
        asyncRulesCount
      }
    }
  }

  /**
   * Validate strongly-typed category settings
   */
  async validateCategorySettings<T extends keyof AllSettings>(
    category: T,
    settings: Partial<AllSettings[T]>,
    context?: ValidationContext
  ): Promise<SettingValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      switch (category) {
        case 'business':
          const businessResult = this.validateBusinessSettings(settings as Partial<BusinessSettings>)
          errors.push(...businessResult.errors)
          warnings.push(...businessResult.warnings)
          break

        case 'ui_theme':
          const themeResult = this.validateUIThemeSettings(settings as Partial<UIThemeSettings>)
          errors.push(...themeResult.errors)
          warnings.push(...themeResult.warnings)
          break

        case 'system':
          const systemResult = this.validateSystemSettings(settings as Partial<SystemSettings>)
          errors.push(...systemResult.errors)
          warnings.push(...systemResult.warnings)
          break

        case 'validation':
          const validationResult = this.validateValidationSettings(settings as Partial<ValidationSettings>)
          errors.push(...validationResult.errors)
          warnings.push(...validationResult.warnings)
          break

        case 'localization':
          const localizationResult = this.validateLocalizationSettings(settings as Partial<LocalizationSettings>)
          errors.push(...localizationResult.errors)
          warnings.push(...localizationResult.warnings)
          break

        case 'performance':
          const performanceResult = this.validatePerformanceSettings(settings as Partial<PerformanceSettings>)
          errors.push(...performanceResult.errors)
          warnings.push(...performanceResult.warnings)
          break

        case 'security':
          const securityResult = this.validateSecuritySettings(settings as Partial<SecuritySettings>)
          errors.push(...securityResult.errors)
          warnings.push(...securityResult.warnings)
          break

        case 'user_mgmt':
          const userMgmtResult = this.validateUserManagementSettings(settings as Partial<UserManagementSettings>)
          errors.push(...userMgmtResult.errors)
          warnings.push(...userMgmtResult.warnings)
          break

        case 'notifications':
          const notificationResult = this.validateNotificationSettings(settings as Partial<NotificationSettings>)
          errors.push(...notificationResult.errors)
          warnings.push(...notificationResult.warnings)
          break

        case 'reporting':
          const reportingResult = this.validateReportingSettings(settings as Partial<ReportingSettings>)
          errors.push(...reportingResult.errors)
          warnings.push(...reportingResult.warnings)
          break

        default:
          warnings.push(`Unknown category: ${category}`)
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }

    } catch (error) {
      return {
        isValid: false,
        errors: [`Category validation error: ${error}`],
        warnings: []
      }
    }
  }

  // Private validation methods

  private initializeTypeValidators(): void {
    this.typeValidators.set('string', (value: SettingValue) => ({
      isValid: typeof value === 'string',
      message: typeof value === 'string' ? undefined : `Expected string, got ${typeof value}`
    }))

    this.typeValidators.set('number', (value: SettingValue) => ({
      isValid: typeof value === 'number' && !isNaN(value) && isFinite(value),
      message: typeof value === 'number' && !isNaN(value) && isFinite(value)
        ? undefined
        : `Expected valid number, got ${typeof value}`
    }))

    this.typeValidators.set('boolean', (value: SettingValue) => ({
      isValid: typeof value === 'boolean',
      message: typeof value === 'boolean' ? undefined : `Expected boolean, got ${typeof value}`
    }))

    this.typeValidators.set('json', (value: SettingValue) => {
      try {
        if (typeof value === 'object' && value !== null) {
          JSON.stringify(value) // Test serializability
          return { isValid: true }
        }
        return { isValid: false, message: 'Expected JSON-serializable object' }
      } catch (error) {
        return { isValid: false, message: 'Value is not JSON-serializable' }
      }
    })

    this.typeValidators.set('array', (value: SettingValue) => ({
      isValid: Array.isArray(value),
      message: Array.isArray(value) ? undefined : `Expected array, got ${typeof value}`
    }))

    this.typeValidators.set('enum', (value: SettingValue) => ({
      isValid: typeof value === 'string' || typeof value === 'number',
      message: typeof value === 'string' || typeof value === 'number'
        ? undefined
        : 'Expected string or number for enum value'
    }))
  }

  private initializeValidationRules(): void {
    // Vehicle rates validation
    this.validationRules.set('vehicle_rates_positive', {
      name: 'vehicle_rates_positive',
      description: 'Vehicle rates must be positive numbers',
      validator: (value: SettingValue) => {
        if (typeof value !== 'object' || Array.isArray(value) || value === null) {
          return { isValid: false, message: 'Vehicle rates must be an object' }
        }

        for (const [vehicleType, rate] of Object.entries(value)) {
          if (typeof rate !== 'number' || rate <= 0) {
            return {
              isValid: false,
              message: `Rate for ${vehicleType} must be a positive number, got ${rate}`
            }
          }
        }

        return { isValid: true }
      },
      categories: ['business'],
      severity: 'error'
    })

    // Color validation
    this.validationRules.set('color_format', {
      name: 'color_format',
      description: 'Colors must be valid hex, rgb, or CSS color names',
      validator: (value: SettingValue) => {
        const colorRegex = /^(#[0-9A-Fa-f]{3,6}|rgb\(\d+,\s*\d+,\s*\d+\)|rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)|[a-zA-Z]+)$/
        if (typeof value === 'string' && colorRegex.test(value)) {
          return { isValid: true }
        }
        return {
          isValid: false,
          message: 'Invalid color format. Use hex (#ff0000), rgb(255,0,0), or CSS color names',
          suggestion: '#3b82f6'
        }
      },
      categories: ['ui_theme'],
      severity: 'error'
    })

    // Performance budget validation
    this.validationRules.set('performance_budgets', {
      name: 'performance_budgets',
      description: 'Performance budgets should be within reasonable limits',
      validator: (value: SettingValue, setting: AppSetting) => {
        if (typeof value !== 'number') {
          return { isValid: false, message: 'Performance budget must be a number' }
        }

        const budgetLimits: Record<string, { min: number; max: number; unit: string }> = {
          'lcp_budget_ms': { min: 1000, max: 10000, unit: 'ms' },
          'fid_budget_ms': { min: 50, max: 1000, unit: 'ms' },
          'cls_budget': { min: 0.05, max: 0.5, unit: '' },
          'bundle_size_budget_kb': { min: 100, max: 5000, unit: 'KB' },
          'memory_usage_budget_mb': { min: 50, max: 1000, unit: 'MB' }
        }

        const limits = budgetLimits[setting.key]
        if (limits && (value < limits.min || value > limits.max)) {
          return {
            isValid: false,
            message: `${setting.key} should be between ${limits.min} and ${limits.max} ${limits.unit}`,
            suggestion: `Recommended: ${Math.round((limits.min + limits.max) / 2)} ${limits.unit}`
          }
        }

        return { isValid: true }
      },
      categories: ['performance'],
      severity: 'warning'
    })

    // Security validation
    this.validationRules.set('password_strength', {
      name: 'password_strength',
      description: 'Password requirements should be secure but usable',
      validator: (value: SettingValue, setting: AppSetting) => {
        if (setting.key === 'password_min_length') {
          if (typeof value !== 'number' || value < 8) {
            return {
              isValid: false,
              message: 'Password minimum length should be at least 8 characters for security',
              suggestion: '12'
            }
          }
          if (value > 32) {
            return {
              isValid: false,
              message: 'Password minimum length should not exceed 32 characters for usability'
            }
          }
        }
        return { isValid: true }
      },
      categories: ['security'],
      severity: 'warning'
    })

    // Timeout validation
    this.validationRules.set('timeout_reasonable', {
      name: 'timeout_reasonable',
      description: 'Timeout values should be reasonable for user experience',
      validator: (value: SettingValue, setting: AppSetting) => {
        if (!setting.key.includes('timeout') || typeof value !== 'number') {
          return { isValid: true }
        }

        // Convert to seconds for comparison
        let timeoutSeconds = value
        if (setting.key.includes('_ms')) {
          timeoutSeconds = value / 1000
        }

        if (timeoutSeconds < 1) {
          return {
            isValid: false,
            message: 'Timeout too short, may cause frequent failures',
            suggestion: setting.key.includes('_ms') ? '5000' : '5'
          }
        }

        if (timeoutSeconds > 300) {
          return {
            isValid: false,
            message: 'Timeout too long, poor user experience',
            suggestion: setting.key.includes('_ms') ? '30000' : '30'
          }
        }

        return { isValid: true }
      },
      categories: ['system', 'security'],
      severity: 'warning'
    })
  }

  private initializeCategoryValidators(): void {
    // Group validation rules by category
    for (const [ruleId, rule] of this.validationRules.entries()) {
      if (rule.categories) {
        for (const category of rule.categories) {
          if (!this.categoryValidators.has(category)) {
            this.categoryValidators.set(category, [])
          }
          this.categoryValidators.get(category)!.push(rule)
        }
      }
    }
  }

  private validateType(value: SettingValue, dataType: SettingDataType): ValidationRuleResult {
    const validator = this.typeValidators.get(dataType)
    if (!validator) {
      return {
        isValid: false,
        message: `Unknown data type: ${dataType}`
      }
    }
    return validator(value)
  }

  private validateBasicRules(setting: AppSetting): SettingValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Enum validation
    if (setting.enum_values && setting.enum_values.length > 0) {
      if (!setting.enum_values.includes(setting.value)) {
        errors.push(`Value "${setting.value}" not in allowed values: ${setting.enum_values.join(', ')}`)
      }
    }

    // Numeric range validation
    if (setting.data_type === 'number' && typeof setting.value === 'number') {
      if (setting.min_value !== undefined && setting.value < setting.min_value) {
        errors.push(`Value ${setting.value} below minimum ${setting.min_value}`)
      }
      if (setting.max_value !== undefined && setting.value > setting.max_value) {
        errors.push(`Value ${setting.value} above maximum ${setting.max_value}`)
      }
    }

    // String length validation
    if (setting.data_type === 'string' && typeof setting.value === 'string') {
      if (setting.min_length !== undefined && setting.value.length < setting.min_length) {
        errors.push(`String length ${setting.value.length} below minimum ${setting.min_length}`)
      }
      if (setting.max_length !== undefined && setting.value.length > setting.max_length) {
        errors.push(`String length ${setting.value.length} above maximum ${setting.max_length}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  private async validateCustomRules(
    setting: AppSetting,
    context?: ValidationContext
  ): Promise<SettingValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // Apply category-specific rules
    const categoryRules = this.categoryValidators.get(setting.category) || []

    for (const rule of categoryRules) {
      try {
        const result = rule.validator(setting.value, setting, context)
        
        if (!result.isValid) {
          if (rule.severity === 'error') {
            errors.push(result.message || `${rule.name} validation failed`)
          } else {
            warnings.push(result.message || `${rule.name} warning`)
          }
        }
      } catch (error) {
        errors.push(`Validation rule ${rule.name} failed: ${error}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  private async validateCategoryRules(
    setting: AppSetting,
    context?: ValidationContext
  ): Promise<SettingValidationResult> {
    // This would contain category-specific validation logic
    // For now, we'll use the custom rules approach
    return { isValid: true, errors: [], warnings: [] }
  }

  private async validateCrossSettings(
    settings: AppSetting[],
    context?: ValidationContext
  ): Promise<{
    errors: ValidationError[]
    warnings: ValidationWarning[]
    suggestions: ValidationSuggestion[]
    rulesExecuted: number
    asyncRulesCount: number
  }> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const suggestions: ValidationSuggestion[] = []

    // Example cross-validation: Operating hours consistency
    const businessHours = settings.find(s => s.key === 'operating_hours')
    if (businessHours && typeof businessHours.value === 'object') {
      const { start, end } = businessHours.value
      if (start && end && start >= end) {
        errors.push({
          key: 'operating_hours',
          category: 'business',
          rule: 'hours_consistency',
          message: 'Operating hours start time must be before end time',
          value: businessHours.value
        })
      }
    }

    // Example cross-validation: Performance budgets consistency
    const lcpBudget = settings.find(s => s.key === 'lcp_budget_ms')
    const fcpBudget = settings.find(s => s.key === 'fcp_budget_ms')
    if (lcpBudget && fcpBudget && 
        typeof lcpBudget.value === 'number' && typeof fcpBudget.value === 'number') {
      if (lcpBudget.value < fcpBudget.value) {
        warnings.push({
          key: 'lcp_budget_ms',
          category: 'performance',
          rule: 'performance_budget_order',
          message: 'LCP budget should typically be higher than FCP budget',
          impact: 'medium',
          suggestion: `Consider setting LCP budget to at least ${fcpBudget.value + 500}ms`
        })
      }
    }

    return {
      errors,
      warnings,
      suggestions,
      rulesExecuted: 2,
      asyncRulesCount: 0
    }
  }

  // Category-specific validation methods

  private validateBusinessSettings(settings: Partial<BusinessSettings>): SettingValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (settings.vehicle_rates) {
      const rates = settings.vehicle_rates
      const vehicleTypes = ['2 Wheeler', '4 Wheeler', '6 Wheeler', 'Trailer']
      
      for (const type of vehicleTypes) {
        if (!(type in rates)) {
          errors.push(`Missing rate for vehicle type: ${type}`)
        } else if (typeof rates[type as keyof typeof rates] !== 'number' || rates[type as keyof typeof rates] <= 0) {
          errors.push(`Invalid rate for ${type}: must be a positive number`)
        }
      }

      // Check for reasonable rate progression
      if (rates['2 Wheeler'] >= rates['4 Wheeler']) {
        warnings.push('2 Wheeler rate should typically be less than 4 Wheeler rate')
      }
    }

    if (settings.minimum_charge_days !== undefined) {
      if (typeof settings.minimum_charge_days !== 'number' || settings.minimum_charge_days < 0) {
        errors.push('Minimum charge days must be a non-negative number')
      }
      if (settings.minimum_charge_days > 30) {
        warnings.push('Minimum charge days seems high, consider customer experience')
      }
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  private validateUIThemeSettings(settings: Partial<UIThemeSettings>): SettingValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (settings.font_scale !== undefined) {
      if (typeof settings.font_scale !== 'number') {
        errors.push('Font scale must be a number')
      } else if (settings.font_scale < 0.5 || settings.font_scale > 2.0) {
        warnings.push('Font scale outside recommended range (0.5 - 2.0)')
      }
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  private validateSystemSettings(settings: Partial<SystemSettings>): SettingValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (settings.api_timeout_ms !== undefined) {
      if (typeof settings.api_timeout_ms !== 'number') {
        errors.push('API timeout must be a number')
      } else if (settings.api_timeout_ms < 1000) {
        warnings.push('API timeout less than 1 second may cause frequent failures')
      } else if (settings.api_timeout_ms > 60000) {
        warnings.push('API timeout greater than 60 seconds may impact user experience')
      }
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  private validateValidationSettings(settings: Partial<ValidationSettings>): SettingValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (settings.vehicle_number_patterns) {
      settings.vehicle_number_patterns.forEach((pattern, index) => {
        try {
          new RegExp(pattern)
        } catch (error) {
          errors.push(`Invalid regex pattern at index ${index}: ${pattern}`)
        }
      })
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  private validateLocalizationSettings(settings: Partial<LocalizationSettings>): SettingValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (settings.currency_code !== undefined) {
      if (typeof settings.currency_code !== 'string' || settings.currency_code.length !== 3) {
        errors.push('Currency code must be a 3-letter string')
      }
    }

    if (settings.timezone !== undefined) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: settings.timezone })
      } catch (error) {
        errors.push(`Invalid timezone: ${settings.timezone}`)
      }
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  private validatePerformanceSettings(settings: Partial<PerformanceSettings>): SettingValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate performance budgets are within reasonable ranges
    const budgets = {
      lcp_budget_ms: { min: 1000, max: 10000 },
      fid_budget_ms: { min: 50, max: 1000 },
      cls_budget: { min: 0.05, max: 0.5 }
    }

    for (const [key, limits] of Object.entries(budgets)) {
      const value = settings[key as keyof PerformanceSettings] as number
      if (value !== undefined) {
        if (typeof value !== 'number') {
          errors.push(`${key} must be a number`)
        } else if (value < limits.min || value > limits.max) {
          warnings.push(`${key} outside recommended range (${limits.min} - ${limits.max})`)
        }
      }
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  private validateSecuritySettings(settings: Partial<SecuritySettings>): SettingValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (settings.max_login_attempts !== undefined) {
      if (typeof settings.max_login_attempts !== 'number') {
        errors.push('Max login attempts must be a number')
      } else if (settings.max_login_attempts < 3) {
        warnings.push('Max login attempts less than 3 may be too restrictive')
      } else if (settings.max_login_attempts > 10) {
        warnings.push('Max login attempts greater than 10 may be too permissive')
      }
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  private validateUserManagementSettings(settings: Partial<UserManagementSettings>): SettingValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (settings.session_timeout_minutes !== undefined) {
      if (typeof settings.session_timeout_minutes !== 'number') {
        errors.push('Session timeout must be a number')
      } else if (settings.session_timeout_minutes < 5) {
        warnings.push('Session timeout less than 5 minutes may be too short for usability')
      }
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  private validateNotificationSettings(settings: Partial<NotificationSettings>): SettingValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (settings.daily_report_time !== undefined) {
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(settings.daily_report_time)) {
        errors.push('Daily report time must be in HH:MM format (24-hour)')
      }
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  private validateReportingSettings(settings: Partial<ReportingSettings>): SettingValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (settings.max_export_records !== undefined) {
      if (typeof settings.max_export_records !== 'number') {
        errors.push('Max export records must be a number')
      } else if (settings.max_export_records > 100000) {
        warnings.push('Max export records greater than 100,000 may cause performance issues')
      }
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  /**
   * Get available validation rules
   */
  getValidationRules(): Map<string, ValidationRule> {
    return new Map(this.validationRules)
  }

  /**
   * Add custom validation rule
   */
  addValidationRule(rule: ValidationRule): void {
    this.validationRules.set(rule.name, rule)
    
    // Update category validators
    if (rule.categories) {
      for (const category of rule.categories) {
        if (!this.categoryValidators.has(category)) {
          this.categoryValidators.set(category, [])
        }
        this.categoryValidators.get(category)!.push(rule)
      }
    }
  }

  /**
   * Remove validation rule
   */
  removeValidationRule(ruleName: string): void {
    const rule = this.validationRules.get(ruleName)
    if (rule) {
      this.validationRules.delete(ruleName)
      
      // Remove from category validators
      if (rule.categories) {
        for (const category of rule.categories) {
          const categoryRules = this.categoryValidators.get(category)
          if (categoryRules) {
            const index = categoryRules.findIndex(r => r.name === ruleName)
            if (index > -1) {
              categoryRules.splice(index, 1)
            }
          }
        }
      }
    }
  }
}

// Export singleton instance
export const settingsValidationService = new SettingsValidationService()
export default settingsValidationService