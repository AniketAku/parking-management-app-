/**
 * Business Rules Validation Service
 * Comprehensive validation for business rules configuration
 */

import type {
  ParkingRateConfig,
  TimeBasedModifier,
  LocationRateOverride,
  PromotionRule,
  CustomerSegmentRule,
  BusinessRulesEngine as EngineConfig,
  BusinessRuleValidation,
  FeeCalculationResult
} from '../types/businessRules'

export interface ValidationRule {
  name: string
  description: string
  severity: 'error' | 'warning' | 'info'
  category: 'rate' | 'modifier' | 'promotion' | 'engine' | 'business_logic'
  validator: (value: any, context?: any) => ValidationResult
}

export interface ValidationResult {
  isValid: boolean
  message?: string
  suggestedFix?: string
}

export interface ValidationContext {
  allRates: ParkingRateConfig[]
  allModifiers: TimeBasedModifier[]
  allPromotions: PromotionRule[]
  engineConfig: EngineConfig
  existingData?: any
}

export class BusinessRulesValidator {
  private validationRules: ValidationRule[] = []

  constructor() {
    this.initializeValidationRules()
  }

  /**
   * Initialize comprehensive validation rules
   */
  private initializeValidationRules(): void {
    this.validationRules = [
      // Rate Configuration Validations
      {
        name: 'positive_base_rate',
        description: 'Base rate must be positive',
        severity: 'error',
        category: 'rate',
        validator: (config: ParkingRateConfig) => {
          const isValid = config.baseRate > 0
          return {
            isValid,
            message: isValid ? undefined : `Base rate ${config.baseRate} must be positive`,
            suggestedFix: 'Set base rate to a positive value (e.g., 50, 100)'
          }
        }
      },
      
      {
        name: 'reasonable_rate_range',
        description: 'Rate should be within reasonable business range',
        severity: 'warning',
        category: 'rate',
        validator: (config: ParkingRateConfig) => {
          const isValid = config.baseRate >= 10 && config.baseRate <= 10000
          return {
            isValid,
            message: isValid ? undefined : `Rate ${config.baseRate} seems unusually ${config.baseRate < 10 ? 'low' : 'high'}`,
            suggestedFix: 'Consider reviewing if this rate aligns with business expectations'
          }
        }
      },

      {
        name: 'minimum_charge_consistency',
        description: 'Minimum charge should not exceed base rate significantly',
        severity: 'warning',
        category: 'rate',
        validator: (config: ParkingRateConfig) => {
          const isValid = config.minimumCharge <= config.baseRate * 2
          return {
            isValid,
            message: isValid ? undefined : `Minimum charge ${config.minimumCharge} is much higher than base rate ${config.baseRate}`,
            suggestedFix: 'Consider adjusting minimum charge to be closer to base rate'
          }
        }
      },

      {
        name: 'overstay_threshold_positive',
        description: 'Overstay threshold must be positive',
        severity: 'error',
        category: 'rate',
        validator: (config: ParkingRateConfig) => {
          const isValid = config.overstayThresholdHours > 0
          return {
            isValid,
            message: isValid ? undefined : `Overstay threshold ${config.overstayThresholdHours} must be positive`,
            suggestedFix: 'Set overstay threshold to positive hours (e.g., 24, 48)'
          }
        }
      },

      {
        name: 'overstay_penalty_reasonable',
        description: 'Overstay penalty should be reasonable',
        severity: 'warning',
        category: 'rate',
        validator: (config: ParkingRateConfig) => {
          const isValid = config.overstayPenaltyRate >= 0 && config.overstayPenaltyRate <= config.baseRate * 5
          return {
            isValid,
            message: isValid ? undefined : `Overstay penalty ${config.overstayPenaltyRate} seems ${config.overstayPenaltyRate < 0 ? 'negative' : 'excessive'}`,
            suggestedFix: 'Set penalty between 0 and 5x base rate for fairness'
          }
        }
      },

      // Vehicle Type Validations
      {
        name: 'vehicle_type_not_empty',
        description: 'Vehicle type name cannot be empty',
        severity: 'error',
        category: 'rate',
        validator: (config: ParkingRateConfig) => {
          const isValid = config.vehicleType.trim().length > 0
          return {
            isValid,
            message: isValid ? undefined : 'Vehicle type name cannot be empty',
            suggestedFix: 'Provide a descriptive vehicle type name'
          }
        }
      },

      {
        name: 'unique_vehicle_type',
        description: 'Vehicle type must be unique',
        severity: 'error',
        category: 'rate',
        validator: (config: ParkingRateConfig, context: ValidationContext) => {
          const duplicates = context?.allRates.filter(r => 
            r.vehicleType === config.vehicleType && r !== config
          ) || []
          const isValid = duplicates.length === 0
          return {
            isValid,
            message: isValid ? undefined : `Vehicle type "${config.vehicleType}" already exists`,
            suggestedFix: 'Use a unique vehicle type name or update the existing configuration'
          }
        }
      },

      // Time Modifier Validations
      {
        name: 'modifier_multiplier_positive',
        description: 'Modifier multiplier must be positive',
        severity: 'error',
        category: 'modifier',
        validator: (modifier: TimeBasedModifier) => {
          const isValid = modifier.multiplier > 0
          return {
            isValid,
            message: isValid ? undefined : `Modifier multiplier ${modifier.multiplier} must be positive`,
            suggestedFix: 'Set multiplier to positive value (1.0 = no change, >1.0 = increase, 0-1.0 = discount)'
          }
        }
      },

      {
        name: 'modifier_time_range_valid',
        description: 'Time range must have valid start and end times',
        severity: 'error',
        category: 'modifier',
        validator: (modifier: TimeBasedModifier) => {
          if (!modifier.timeRange) return { isValid: true }
          
          const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
          const startValid = timeRegex.test(modifier.timeRange.start)
          const endValid = timeRegex.test(modifier.timeRange.end)
          
          const isValid = startValid && endValid
          return {
            isValid,
            message: isValid ? undefined : 'Time range must be in HH:MM format (e.g., 09:00, 17:30)',
            suggestedFix: 'Use 24-hour format: HH:MM (e.g., 09:00 for 9 AM, 17:30 for 5:30 PM)'
          }
        }
      },

      {
        name: 'modifier_date_range_valid',
        description: 'Date range must have valid dates',
        severity: 'error',
        category: 'modifier',
        validator: (modifier: TimeBasedModifier) => {
          if (!modifier.dateRange) return { isValid: true }
          
          const startDate = new Date(modifier.dateRange.start)
          const endDate = new Date(modifier.dateRange.end)
          
          const isValid = !isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate <= endDate
          return {
            isValid,
            message: isValid ? undefined : 'Date range must have valid start and end dates with start <= end',
            suggestedFix: 'Use YYYY-MM-DD format and ensure start date is before or equal to end date'
          }
        }
      },

      // Promotion Validations
      {
        name: 'promotion_discount_valid',
        description: 'Promotion discount must be reasonable',
        severity: 'error',
        category: 'promotion',
        validator: (promotion: PromotionRule) => {
          let isValid = true
          let message: string | undefined

          if (promotion.discountType === 'percentage') {
            isValid = promotion.discountValue >= 0 && promotion.discountValue <= 100
            if (!isValid) {
              message = `Percentage discount ${promotion.discountValue}% must be between 0-100%`
            }
          } else if (promotion.discountType === 'flat') {
            isValid = promotion.discountValue >= 0
            if (!isValid) {
              message = `Flat discount ${promotion.discountValue} cannot be negative`
            }
          } else if (promotion.discountType === 'free_hours') {
            isValid = promotion.discountValue >= 0 && promotion.discountValue <= 168 // Max 1 week
            if (!isValid) {
              message = `Free hours ${promotion.discountValue} must be between 0-168 hours`
            }
          }

          return {
            isValid,
            message,
            suggestedFix: 'Adjust discount value to be within reasonable range'
          }
        }
      },

      {
        name: 'promotion_validity_period',
        description: 'Promotion must have valid validity period',
        severity: 'error',
        category: 'promotion',
        validator: (promotion: PromotionRule) => {
          const startDate = new Date(promotion.validFrom)
          const endDate = new Date(promotion.validTo)
          
          const isValid = !isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate <= endDate
          return {
            isValid,
            message: isValid ? undefined : 'Promotion validity period must have valid dates with start <= end',
            suggestedFix: 'Ensure valid dates in YYYY-MM-DD format with start date before end date'
          }
        }
      },

      // Engine Configuration Validations
      {
        name: 'max_parking_spots_positive',
        description: 'Maximum parking spots must be positive',
        severity: 'error',
        category: 'engine',
        validator: (config: EngineConfig) => {
          const isValid = config.maxParkingSpots > 0
          return {
            isValid,
            message: isValid ? undefined : `Maximum parking spots ${config.maxParkingSpots} must be positive`,
            suggestedFix: 'Set maximum parking spots to a positive number reflecting actual capacity'
          }
        }
      },

      {
        name: 'capacity_warning_threshold_reasonable',
        description: 'Capacity warning threshold should be reasonable',
        severity: 'warning',
        category: 'engine',
        validator: (config: EngineConfig) => {
          const isValid = config.capacityWarningThreshold > 0 && config.capacityWarningThreshold <= 100
          return {
            isValid,
            message: isValid ? undefined : `Capacity warning threshold ${config.capacityWarningThreshold}% should be between 1-100%`,
            suggestedFix: 'Set threshold between 70-90% for optimal warning timing'
          }
        }
      },

      {
        name: 'currency_code_valid',
        description: 'Currency code should be valid ISO format',
        severity: 'warning',
        category: 'engine',
        validator: (config: EngineConfig) => {
          const validCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'CNY']
          const isValid = validCurrencies.includes(config.currencyCode)
          return {
            isValid,
            message: isValid ? undefined : `Currency code "${config.currencyCode}" is not a common ISO currency code`,
            suggestedFix: 'Use standard ISO currency codes like USD, EUR, GBP, INR, etc.'
          }
        }
      },

      // Business Logic Validations
      {
        name: 'rate_hierarchy_logical',
        description: 'Rate hierarchy should follow logical vehicle size progression',
        severity: 'info',
        category: 'business_logic',
        validator: (_: any, context: ValidationContext) => {
          if (!context?.allRates) return { isValid: true }

          const rates = context.allRates
          const trailer = rates.find(r => r.vehicleType === 'Trailer')
          const sixWheeler = rates.find(r => r.vehicleType === '6 Wheeler')
          const fourWheeler = rates.find(r => r.vehicleType === '4 Wheeler')
          const twoWheeler = rates.find(r => r.vehicleType === '2 Wheeler')

          const isLogical = (
            (!trailer || !sixWheeler || trailer.baseRate >= sixWheeler.baseRate) &&
            (!sixWheeler || !fourWheeler || sixWheeler.baseRate >= fourWheeler.baseRate) &&
            (!fourWheeler || !twoWheeler || fourWheeler.baseRate >= twoWheeler.baseRate)
          )

          return {
            isValid: isLogical,
            message: isLogical ? undefined : 'Rate hierarchy doesn\'t follow typical size-based progression (Trailer > 6W > 4W > 2W)',
            suggestedFix: 'Consider adjusting rates to follow logical vehicle size progression'
          }
        }
      }
    ]
  }

  /**
   * Validate a single rate configuration
   */
  public validateRateConfig(config: ParkingRateConfig, context?: ValidationContext): BusinessRuleValidation {
    return this.runValidations('rate', config, context)
  }

  /**
   * Validate a time modifier
   */
  public validateTimeModifier(modifier: TimeBasedModifier, context?: ValidationContext): BusinessRuleValidation {
    return this.runValidations('modifier', modifier, context)
  }

  /**
   * Validate a promotion rule
   */
  public validatePromotionRule(promotion: PromotionRule, context?: ValidationContext): BusinessRuleValidation {
    return this.runValidations('promotion', promotion, context)
  }

  /**
   * Validate engine configuration
   */
  public validateEngineConfig(config: EngineConfig, context?: ValidationContext): BusinessRuleValidation {
    return this.runValidations('engine', config, context)
  }

  /**
   * Comprehensive validation of entire business rules system
   */
  public validateCompleteSystem(context: ValidationContext): BusinessRuleValidation {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    // Validate all rate configurations
    for (const rate of context.allRates) {
      const rateValidation = this.validateRateConfig(rate, context)
      errors.push(...rateValidation.errors)
      warnings.push(...rateValidation.warnings)
      suggestions.push(...rateValidation.suggestions)
    }

    // Validate all modifiers
    for (const modifier of context.allModifiers) {
      const modifierValidation = this.validateTimeModifier(modifier, context)
      errors.push(...modifierValidation.errors)
      warnings.push(...modifierValidation.warnings)
      suggestions.push(...modifierValidation.suggestions)
    }

    // Validate all promotions
    for (const promotion of context.allPromotions) {
      const promotionValidation = this.validatePromotionRule(promotion, context)
      errors.push(...promotionValidation.errors)
      warnings.push(...promotionValidation.warnings)
      suggestions.push(...promotionValidation.suggestions)
    }

    // Validate engine configuration
    const engineValidation = this.validateEngineConfig(context.engineConfig, context)
    errors.push(...engineValidation.errors)
    warnings.push(...engineValidation.warnings)
    suggestions.push(...engineValidation.suggestions)

    // Run business logic validations
    const businessLogicValidation = this.runValidations('business_logic', null, context)
    errors.push(...businessLogicValidation.errors)
    warnings.push(...businessLogicValidation.warnings)
    suggestions.push(...businessLogicValidation.suggestions)

    return {
      isValid: errors.length === 0,
      errors: [...new Set(errors)], // Remove duplicates
      warnings: [...new Set(warnings)],
      suggestions: [...new Set(suggestions)],
      validationType: 'engine',
      validatedAt: new Date().toISOString(),
      impactAnalysis: {
        affectedRates: context.allRates.length,
        affectedCustomers: 0, // Would be calculated from actual data
        estimatedRevenueChange: 0,
        conflictingRules: []
      }
    }
  }

  /**
   * Run validations for a specific category
   */
  private runValidations(
    category: 'rate' | 'modifier' | 'promotion' | 'engine' | 'business_logic',
    value: any,
    context?: ValidationContext
  ): BusinessRuleValidation {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    const applicableRules = this.validationRules.filter(rule => rule.category === category)

    for (const rule of applicableRules) {
      try {
        const result = rule.validator(value, context)
        
        if (!result.isValid && result.message) {
          switch (rule.severity) {
            case 'error':
              errors.push(`${rule.name}: ${result.message}`)
              break
            case 'warning':
              warnings.push(`${rule.name}: ${result.message}`)
              break
            case 'info':
              suggestions.push(`${rule.name}: ${result.message}`)
              break
          }
        }
      } catch (error) {
        errors.push(`Validation error in ${rule.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      validationType: category,
      validatedAt: new Date().toISOString()
    }
  }

  /**
   * Validate fee calculation result for business logic consistency
   */
  public validateFeeCalculation(result: FeeCalculationResult): BusinessRuleValidation {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    // Check if total fee is reasonable
    if (result.totalFee < 0) {
      errors.push('Total fee cannot be negative')
    }

    if (result.totalFee === 0 && result.durationHours > 0) {
      warnings.push('Zero fee for positive duration may indicate configuration issues')
    }

    // Check calculation consistency
    const expectedTotal = result.baseFee + result.modifierFees + result.overstayPenalty + 
                         result.taxAmount - result.promotionDiscount - result.loyaltyDiscount

    if (Math.abs(result.totalFee - expectedTotal) > 0.01) {
      errors.push(`Fee calculation inconsistency: expected ${expectedTotal}, got ${result.totalFee}`)
    }

    // Check day calculation logic
    if (result.calculatedDays < 1 && result.durationHours > 0) {
      errors.push('Calculated days should be at least 1 for any positive duration')
    }

    // Check overstay logic
    if (result.isOverstay && result.overstayPenalty === 0) {
      warnings.push('Vehicle is marked as overstay but no penalty applied')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      validationType: 'business_logic',
      validatedAt: new Date().toISOString()
    }
  }

  /**
   * Get validation rule by name
   */
  public getValidationRule(name: string): ValidationRule | undefined {
    return this.validationRules.find(rule => rule.name === name)
  }

  /**
   * Get all validation rules for a category
   */
  public getValidationRules(category?: string): ValidationRule[] {
    return category 
      ? this.validationRules.filter(rule => rule.category === category)
      : this.validationRules
  }

  /**
   * Add custom validation rule
   */
  public addValidationRule(rule: ValidationRule): void {
    this.validationRules.push(rule)
  }

  /**
   * Remove validation rule by name
   */
  public removeValidationRule(name: string): boolean {
    const index = this.validationRules.findIndex(rule => rule.name === name)
    if (index >= 0) {
      this.validationRules.splice(index, 1)
      return true
    }
    return false
  }
}