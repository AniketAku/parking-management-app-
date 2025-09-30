/**
 * Dynamic Business Rules Engine
 * Centralized business logic with configurable rules
 * Preserves exact original fee calculation behavior
 */

import type {
  ParkingRateConfig,
  TimeBasedModifier,
  LocationRateOverride,
  PromotionRule,
  CustomerSegmentRule,
  BusinessRulesEngine as EngineConfig,
  FeeCalculationResult,
  RateChangeAudit,
  BusinessRuleValidation,
  LegacyRateMapping
} from '../types/businessRules'

export class BusinessRulesEngine {
  private rates: Map<string, ParkingRateConfig> = new Map()
  private modifiers: TimeBasedModifier[] = []
  private locationOverrides: Map<string, LocationRateOverride[]> = new Map()
  private promotions: PromotionRule[] = []
  private customerSegments: CustomerSegmentRule[] = []
  private engineConfig: EngineConfig
  private auditLog: RateChangeAudit[] = []

  constructor(config?: Partial<EngineConfig>) {
    this.engineConfig = this.getDefaultEngineConfig()
    if (config) {
      this.engineConfig = { ...this.engineConfig, ...config }
    }
    
    // Initialize with legacy rates for backward compatibility
    this.initializeLegacyRates()
  }

  /**
   * Initialize with exact original rates and logic from config.py
   */
  private initializeLegacyRates(): void {
    const legacyRates: LegacyRateMapping = {
      originalVehicleTypes: ["Trailer", "6 Wheeler", "4 Wheeler", "2 Wheeler"],
      originalRates: {
        "Trailer": 225,
        "6 Wheeler": 150,
        "4 Wheeler": 100,
        "2 Wheeler": 50,
      },
      originalSettings: {
        maxParkingSpots: 100,
        overstayHours: 24,
        overstayPenaltyRate: 50.0,
      },
      migrationTimestamp: new Date().toISOString(),
      preservedLogic: {
        dayCalculationMethod: "days = time_diff.days + (1 if time_diff.seconds > 0 else 0)",
        roundingBehavior: "always_up",
        fallbackRate: 100
      }
    }

    // Convert legacy rates to new configuration format
    for (const [vehicleType, rate] of Object.entries(legacyRates.originalRates)) {
      const category = this.categorizeVehicleType(vehicleType)
      
      const rateConfig: ParkingRateConfig = {
        vehicleType,
        category,
        baseRate: rate,
        minimumCharge: rate, // Minimum 1 day charge
        roundingRule: 'up',  // Preserve original "always round up" behavior
        gracePeriodMinutes: 0, // No grace period in original system
        
        // Overstay settings from original AppSettings
        overstayThresholdHours: legacyRates.originalSettings.overstayHours,
        overstayPenaltyRate: legacyRates.originalSettings.overstayPenaltyRate,
        overstayPenaltyType: 'flat',
        
        isActive: true,
        effectiveFrom: new Date().toISOString(),
        description: `Migrated from legacy config.py - ${vehicleType} rate`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      this.rates.set(vehicleType, rateConfig)
    }

    // Update engine config with legacy settings
    this.engineConfig.maxParkingSpots = legacyRates.originalSettings.maxParkingSpots
    this.engineConfig.defaultRoundingRule = 'up'
    this.engineConfig.defaultMinimumCharge = 100 // Fallback rate
  }

  /**
   * Categorize vehicle type for business logic grouping
   */
  private categorizeVehicleType(vehicleType: string): 'light' | 'medium' | 'heavy' | 'commercial' {
    const heavyVehicles = ['Trailer']
    const mediumVehicles = ['6 Wheeler']
    const lightVehicles = ['4 Wheeler', '2 Wheeler']
    
    if (heavyVehicles.includes(vehicleType)) return 'heavy'
    if (mediumVehicles.includes(vehicleType)) return 'medium'
    if (lightVehicles.includes(vehicleType)) return 'light'
    return 'commercial'
  }

  /**
   * Calculate parking fee using exact original algorithm
   * Preserves: days = time_diff.days + (1 if time_diff.seconds > 0 else 0)
   */
  public calculateFee(
    vehicleType: string,
    entryTime: string | Date,
    exitTime: string | Date,
    location?: string,
    customerId?: string
  ): FeeCalculationResult {
    const entry = new Date(entryTime)
    const exit = new Date(exitTime)
    
    // Validate input times
    if (exit < entry) {
      throw new Error('Exit time cannot be before entry time')
    }

    // Calculate duration using exact original logic
    const timeDiff = exit.getTime() - entry.getTime()
    const days = Math.floor(timeDiff / (24 * 60 * 60 * 1000)) // Full days
    const remainingMs = timeDiff % (24 * 60 * 60 * 1000)
    
    // CRITICAL: Preserve original logic - any remaining time means +1 day
    const calculatedDays = days + (remainingMs > 0 ? 1 : 0)
    const durationHours = timeDiff / (60 * 60 * 1000)

    // Get rate configuration
    const rateConfig = this.getRateConfig(vehicleType)
    const baseRate = rateConfig.baseRate
    
    // Apply location overrides if specified
    const appliedRate = this.applyLocationOverrides(vehicleType, baseRate, location)
    
    // Calculate base fee (preserve original: days * rate)
    const baseFee = calculatedDays * appliedRate

    // Apply time-based modifiers
    const modifierFees = this.calculateModifierFees(
      vehicleType, entry, exit, baseFee, location
    )

    // Apply promotions and discounts
    const promotionDiscount = this.calculatePromotionDiscounts(
      vehicleType, durationHours, baseFee, customerId
    )

    // Apply loyalty benefits
    const loyaltyDiscount = this.calculateLoyaltyDiscounts(
      customerId, baseFee
    )

    // Calculate overstay penalty
    const overstayPenalty = this.calculateOverstayPenalty(
      vehicleType, durationHours, appliedRate
    )

    // Calculate tax if applicable
    const taxAmount = this.engineConfig.taxRate 
      ? (baseFee + modifierFees + overstayPenalty) * (this.engineConfig.taxRate / 100)
      : 0

    // Final total
    const totalFee = Math.max(0, 
      baseFee + modifierFees + overstayPenalty + taxAmount - promotionDiscount - loyaltyDiscount
    )

    // Get applied modifiers for result
    const appliedModifiers = this.getAppliedModifiers(vehicleType, entry, exit, location)

    return {
      // Input parameters
      vehicleType,
      entryTime: entry.toISOString(),
      exitTime: exit.toISOString(),
      location,
      customerId,
      
      // Duration calculations (preserve exact original behavior)
      durationHours: Number(durationHours.toFixed(2)),
      durationDays: days,
      calculatedDays, // This is the key preserved calculation
      
      // Rate information
      baseRate,
      appliedRate,
      rateModifiers: appliedModifiers,
      
      // Fee breakdown
      baseFee,
      modifierFees,
      promotionDiscount,
      loyaltyDiscount,
      overstayPenalty,
      taxAmount,
      totalFee,
      
      // Status flags
      isOverstay: durationHours > rateConfig.overstayThresholdHours,
      hasPromotions: promotionDiscount > 0,
      hasLoyaltyBenefits: loyaltyDiscount > 0,
      
      // Metadata
      calculationTimestamp: new Date().toISOString(),
      rulesVersion: '1.0.0',
      calculationMethod: this.engineConfig.calculationMethod
    }
  }

  /**
   * Get rate configuration with fallback to default
   * Preserves original RATES.get(vehicle_type, 100) behavior
   */
  private getRateConfig(vehicleType: string): ParkingRateConfig {
    const config = this.rates.get(vehicleType)
    if (config && config.isActive) {
      return config
    }

    // Fallback to default rate (preserves original behavior)
    return {
      vehicleType: 'Unknown',
      category: 'commercial',
      baseRate: 100, // Original fallback rate
      minimumCharge: 100,
      roundingRule: 'up',
      gracePeriodMinutes: 0,
      overstayThresholdHours: 24,
      overstayPenaltyRate: 50,
      overstayPenaltyType: 'flat',
      isActive: true,
      description: 'Default fallback rate',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  /**
   * Apply location-specific rate overrides
   */
  private applyLocationOverrides(
    vehicleType: string, 
    baseRate: number, 
    location?: string
  ): number {
    if (!location) return baseRate

    const overrides = this.locationOverrides.get(location) || []
    const applicableOverride = overrides.find(
      override => override.vehicleType === vehicleType && override.isActive
    )

    if (!applicableOverride) return baseRate

    switch (applicableOverride.overrideType) {
      case 'replace':
        return applicableOverride.overrideRate
      case 'multiply':
        return baseRate * applicableOverride.overrideRate
      case 'add':
        return baseRate + applicableOverride.overrideRate
      default:
        return baseRate
    }
  }

  /**
   * Calculate time-based modifier fees
   */
  private calculateModifierFees(
    vehicleType: string,
    entryTime: Date,
    exitTime: Date,
    baseFee: number,
    location?: string
  ): number {
    let totalModifier = 0

    for (const modifier of this.modifiers) {
      if (!modifier.isActive) continue
      
      // Check if modifier applies to this vehicle type
      if (modifier.vehicleTypes && !modifier.vehicleTypes.includes(vehicleType)) {
        continue
      }

      // Check if modifier applies to this location
      if (modifier.locations && location && !modifier.locations.includes(location)) {
        continue
      }

      // Check time conditions
      if (this.isModifierApplicable(modifier, entryTime, exitTime)) {
        totalModifier += baseFee * (modifier.multiplier - 1)
      }
    }

    return totalModifier
  }

  /**
   * Check if time-based modifier is applicable
   */
  private isModifierApplicable(
    modifier: TimeBasedModifier,
    entryTime: Date,
    exitTime: Date
  ): boolean {
    // Check day of week condition
    if (modifier.dayOfWeek) {
      const entryDay = entryTime.getDay()
      if (!modifier.dayOfWeek.includes(entryDay)) {
        return false
      }
    }

    // Check time range condition
    if (modifier.timeRange) {
      const entryTimeString = entryTime.toTimeString().substring(0, 5) // HH:MM
      const exitTimeString = exitTime.toTimeString().substring(0, 5)
      
      // Simple time range check (can be enhanced for cross-day ranges)
      if (entryTimeString < modifier.timeRange.start || 
          exitTimeString > modifier.timeRange.end) {
        return false
      }
    }

    // Check date range condition
    if (modifier.dateRange) {
      const entryDate = entryTime.toISOString().substring(0, 10) // YYYY-MM-DD
      if (entryDate < modifier.dateRange.start || 
          entryDate > modifier.dateRange.end) {
        return false
      }
    }

    return true
  }

  /**
   * Calculate promotion discounts
   */
  private calculatePromotionDiscounts(
    vehicleType: string,
    durationHours: number,
    baseFee: number,
    customerId?: string
  ): number {
    let totalDiscount = 0
    const currentDate = new Date().toISOString().substring(0, 10)

    for (const promotion of this.promotions) {
      if (!promotion.isActive) continue
      if (promotion.validFrom > currentDate || promotion.validTo < currentDate) continue
      
      // Check vehicle type eligibility
      if (promotion.vehicleTypes && !promotion.vehicleTypes.includes(vehicleType)) {
        continue
      }

      // Check duration conditions
      if (promotion.minimumDurationHours && durationHours < promotion.minimumDurationHours) {
        continue
      }
      if (promotion.maximumDurationHours && durationHours > promotion.maximumDurationHours) {
        continue
      }

      // Apply discount based on type
      switch (promotion.discountType) {
        case 'percentage':
          totalDiscount += baseFee * (promotion.discountValue / 100)
          break
        case 'flat':
          totalDiscount += promotion.discountValue
          break
        case 'free_hours':
          // Calculate discount for free hours (simplified)
          const hourlyRate = baseFee / Math.ceil(durationHours / 24) / 24
          totalDiscount += hourlyRate * promotion.discountValue
          break
      }
    }

    return totalDiscount
  }

  /**
   * Calculate loyalty program discounts
   */
  private calculateLoyaltyDiscounts(customerId?: string, baseFee?: number): number {
    if (!customerId || !baseFee) return 0

    // Simplified loyalty calculation
    // In real implementation, would look up customer segment from database
    return 0
  }

  /**
   * Calculate overstay penalty using exact original logic
   * Preserves: is_overstayed() check from models/entry.py:60-62
   */
  private calculateOverstayPenalty(
    vehicleType: string,
    durationHours: number,
    appliedRate: number
  ): number {
    const rateConfig = this.getRateConfig(vehicleType)
    
    // Check if overstayed (preserve original logic)
    if (durationHours <= rateConfig.overstayThresholdHours) {
      return 0
    }

    const overstayHours = durationHours - rateConfig.overstayThresholdHours
    
    // Calculate penalty using original logic
    switch (rateConfig.overstayPenaltyType) {
      case 'flat':
        // Calculate penalty days using same rounding logic as main calculation
        const penaltyDays = Math.ceil(overstayHours / 24)
        return penaltyDays * rateConfig.overstayPenaltyRate
      
      case 'percentage':
        const baseFeeForPenalty = Math.ceil(durationHours / 24) * appliedRate
        return baseFeeForPenalty * (rateConfig.overstayPenaltyRate / 100)
      
      case 'progressive':
        // Progressive penalty (can be enhanced)
        const progressiveDays = Math.ceil(overstayHours / 24)
        return progressiveDays * rateConfig.overstayPenaltyRate * 1.5
      
      default:
        return 0
    }
  }

  /**
   * Get applied modifiers for result reporting
   */
  private getAppliedModifiers(
    vehicleType: string,
    entryTime: Date,
    exitTime: Date,
    location?: string
  ): TimeBasedModifier[] {
    return this.modifiers.filter(modifier => {
      if (!modifier.isActive) return false
      if (modifier.vehicleTypes && !modifier.vehicleTypes.includes(vehicleType)) return false
      if (modifier.locations && location && !modifier.locations.includes(location)) return false
      return this.isModifierApplicable(modifier, entryTime, exitTime)
    })
  }

  /**
   * Get default engine configuration
   */
  private getDefaultEngineConfig(): EngineConfig {
    return {
      calculationMethod: 'daily',
      defaultRoundingRule: 'up',
      defaultMinimumCharge: 100,
      defaultGracePeriod: 0,
      
      currencyCode: 'INR',
      currencySymbol: '₹',
      
      maxParkingSpots: 100,
      capacityWarningThreshold: 80,
      surgePricingEnabled: false,
      
      businessHours: {
        'monday': { start: '00:00', end: '23:59', isOpen: true },
        'tuesday': { start: '00:00', end: '23:59', isOpen: true },
        'wednesday': { start: '00:00', end: '23:59', isOpen: true },
        'thursday': { start: '00:00', end: '23:59', isOpen: true },
        'friday': { start: '00:00', end: '23:59', isOpen: true },
        'saturday': { start: '00:00', end: '23:59', isOpen: true },
        'sunday': { start: '00:00', end: '23:59', isOpen: true },
      },
      
      allowNegativeFees: false,
      requirePaymentOnExit: false,
      
      trackRateChanges: true,
      requireApprovalForRateChanges: false,
      auditRetentionDays: 365
    }
  }

  // Public configuration methods
  public addRateConfig(config: ParkingRateConfig): void {
    this.rates.set(config.vehicleType, config)
    this.auditLog.push(this.createAuditEntry('create', 'rate', config.vehicleType, config))
  }

  public updateRateConfig(vehicleType: string, updates: Partial<ParkingRateConfig>): void {
    const existing = this.rates.get(vehicleType)
    if (!existing) throw new Error(`Rate config for ${vehicleType} not found`)
    
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() }
    this.rates.set(vehicleType, updated)
    this.auditLog.push(this.createAuditEntry('update', 'rate', vehicleType, updated, existing))
  }

  public getRateConfigs(): ParkingRateConfig[] {
    return Array.from(this.rates.values())
  }

  public getEngineConfig(): EngineConfig {
    return { ...this.engineConfig }
  }

  public updateEngineConfig(updates: Partial<EngineConfig>): void {
    const previous = { ...this.engineConfig }
    this.engineConfig = { ...this.engineConfig, ...updates }
    this.auditLog.push(this.createAuditEntry('update', 'engine', 'config', this.engineConfig, previous))
  }

  /**
   * Create audit trail entry
   */
  private createAuditEntry(
    changeType: 'create' | 'update' | 'delete',
    entityType: 'rate' | 'modifier' | 'promotion' | 'engine',
    entityId: string,
    newValue: any,
    previousValue?: any
  ): RateChangeAudit {
    return {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      changeType,
      entityType,
      entityId,
      previousValue,
      newValue,
      fieldChanges: [], // Could be enhanced to track specific field changes
      changedBy: 'system', // Would be actual user in production
      changeReason: 'Business rules configuration update',
      approvedBy: undefined,
      approvalRequired: this.engineConfig.requireApprovalForRateChanges,
      changedAt: new Date().toISOString(),
      impactedVehicleTypes: [entityId],
      impactedLocations: []
    }
  }

  /**
   * Get audit log
   */
  public getAuditLog(limit?: number): RateChangeAudit[] {
    const log = [...this.auditLog].reverse() // Most recent first
    return limit ? log.slice(0, limit) : log
  }

  /**
   * Validate business rules configuration
   */
  public validateConfiguration(): BusinessRuleValidation {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    // Validate rate configurations
    for (const [vehicleType, config] of this.rates) {
      if (config.baseRate <= 0) {
        errors.push(`Invalid base rate for ${vehicleType}: must be positive`)
      }
      if (config.overstayThresholdHours <= 0) {
        warnings.push(`Overstay threshold for ${vehicleType} should be positive`)
      }
      if (config.minimumCharge < config.baseRate) {
        suggestions.push(`Consider setting minimum charge for ${vehicleType} to at least base rate`)
      }
    }

    // Validate engine configuration
    if (this.engineConfig.maxParkingSpots <= 0) {
      errors.push('Maximum parking spots must be positive')
    }
    if (this.engineConfig.capacityWarningThreshold >= 100) {
      warnings.push('Capacity warning threshold should be less than 100%')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      validationType: 'engine',
      validatedAt: new Date().toISOString()
    }
  }

  /**
   * Export configuration for backup/sharing
   */
  public exportConfiguration(): any {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: 'system',
      rates: this.getRateConfigs(),
      modifiers: this.modifiers,
      locationOverrides: Array.from(this.locationOverrides.entries()),
      promotions: this.promotions,
      customerSegments: this.customerSegments,
      engineConfig: this.engineConfig,
      description: 'Business rules configuration export',
      environment: 'production',
      compatibilityVersion: '1.0.0'
    }
  }
}