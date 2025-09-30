/**
 * Business Rules Configuration Types
 * Centralized business logic and rate configuration system
 */

export type RoundingRule = 'up' | 'down' | 'nearest'
export type CalculationMethod = 'daily' | 'hourly' | 'custom'
export type VehicleCategory = 'light' | 'medium' | 'heavy' | 'commercial'

// Base rate configuration for individual vehicle types
export interface ParkingRateConfig {
  vehicleType: string
  category: VehicleCategory
  baseRate: number
  hourlyRate?: number
  dailyMaxRate?: number
  weeklyRate?: number
  monthlyRate?: number
  
  // Fee calculation settings
  minimumCharge: number
  roundingRule: RoundingRule
  gracePeriodMinutes: number
  
  // Overstay settings
  overstayThresholdHours: number
  overstayPenaltyRate: number
  overstayPenaltyType: 'percentage' | 'flat' | 'progressive'
  
  // Status and metadata
  isActive: boolean
  effectiveFrom?: string
  effectiveTo?: string
  description?: string
  createdAt: string
  updatedAt: string
}

// Time-based rate modifiers
export interface TimeBasedModifier {
  id: string
  name: string
  description: string
  multiplier: number
  
  // Time conditions
  dayOfWeek?: number[] // 0-6 (Sunday-Saturday)
  timeRange?: {
    start: string // HH:MM format
    end: string   // HH:MM format
  }
  dateRange?: {
    start: string // YYYY-MM-DD
    end: string   // YYYY-MM-DD
  }
  
  // Application conditions
  vehicleTypes?: string[]
  locations?: string[]
  isActive: boolean
}

// Location-specific rate overrides
export interface LocationRateOverride {
  locationId: string
  locationName: string
  vehicleType: string
  overrideRate: number
  overrideType: 'replace' | 'multiply' | 'add'
  isActive: boolean
  effectiveFrom?: string
  effectiveTo?: string
}

// Promotion and discount rules
export interface PromotionRule {
  id: string
  name: string
  description: string
  discountType: 'percentage' | 'flat' | 'free_hours'
  discountValue: number
  
  // Conditions
  minimumDurationHours?: number
  maximumDurationHours?: number
  vehicleTypes?: string[]
  customerTypes?: string[]
  usageLimit?: number
  
  // Validity
  validFrom: string
  validTo: string
  isActive: boolean
}

// Customer segmentation and loyalty
export interface CustomerSegmentRule {
  segmentId: string
  segmentName: string
  description: string
  
  // Qualification criteria
  qualificationRules: {
    minimumVisits?: number
    minimumRevenue?: number
    registrationRequired?: boolean
    membershipLevel?: string
  }
  
  // Benefits
  discountPercentage?: number
  freeHours?: number
  priorityParking?: boolean
  
  isActive: boolean
}

// Dynamic business rules engine configuration
export interface BusinessRulesEngine {
  // Core calculation settings
  calculationMethod: CalculationMethod
  defaultRoundingRule: RoundingRule
  defaultMinimumCharge: number
  defaultGracePeriod: number
  
  // Global settings
  taxRate?: number
  currencyCode: string
  currencySymbol: string
  
  // Capacity management
  maxParkingSpots: number
  capacityWarningThreshold: number
  surgePricingEnabled: boolean
  surgePricingMultiplier?: number
  
  // Business hours
  businessHours: {
    [key: string]: { // Day of week
      start: string   // HH:MM
      end: string     // HH:MM
      isOpen: boolean
    }
  }
  
  // Validation settings
  allowNegativeFees: boolean
  maxFeeLimit?: number
  requirePaymentOnExit: boolean
  
  // Audit and tracking
  trackRateChanges: boolean
  requireApprovalForRateChanges: boolean
  auditRetentionDays: number
}

// Fee calculation result structure
export interface FeeCalculationResult {
  // Input parameters
  vehicleType: string
  entryTime: string
  exitTime: string
  location?: string
  customerId?: string
  
  // Duration calculations
  durationHours: number
  durationDays: number
  calculatedDays: number // After rounding
  
  // Rate information
  baseRate: number
  appliedRate: number
  rateModifiers: TimeBasedModifier[]
  
  // Fee breakdown
  baseFee: number
  modifierFees: number
  promotionDiscount: number
  loyaltyDiscount: number
  overstayPenalty: number
  taxAmount: number
  totalFee: number
  
  // Status flags
  isOverstay: boolean
  hasPromotions: boolean
  hasLoyaltyBenefits: boolean
  
  // Metadata
  calculationTimestamp: string
  rulesVersion: string
  calculationMethod: CalculationMethod
}

// Rate change audit trail
export interface RateChangeAudit {
  id: string
  changeType: 'create' | 'update' | 'delete' | 'activate' | 'deactivate'
  entityType: 'rate' | 'modifier' | 'promotion' | 'segment' | 'engine'
  entityId: string
  
  // Change details
  previousValue?: any
  newValue?: any
  fieldChanges: {
    field: string
    oldValue: any
    newValue: any
  }[]
  
  // Authorization and tracking
  changedBy: string
  changeReason: string
  approvedBy?: string
  approvalRequired: boolean
  
  // Timestamps
  changedAt: string
  approvedAt?: string
  effectiveAt?: string
  
  // Impact assessment
  impactedVehicleTypes: string[]
  impactedLocations: string[]
  estimatedRevenueImpact?: number
}

// Validation result for business rules
export interface BusinessRuleValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
  
  // Validation context
  validationType: 'rate' | 'modifier' | 'promotion' | 'engine'
  validatedAt: string
  validatedBy?: string
  
  // Impact analysis
  impactAnalysis?: {
    affectedRates: number
    affectedCustomers: number
    estimatedRevenueChange: number
    conflictingRules: string[]
  }
}

// Configuration export/import structure
export interface BusinessRulesExport {
  version: string
  exportedAt: string
  exportedBy: string
  
  // Configuration data
  rates: ParkingRateConfig[]
  modifiers: TimeBasedModifier[]
  locationOverrides: LocationRateOverride[]
  promotions: PromotionRule[]
  customerSegments: CustomerSegmentRule[]
  engineConfig: BusinessRulesEngine
  
  // Metadata
  description?: string
  environment: 'development' | 'staging' | 'production'
  compatibilityVersion: string
}

// A/B testing configuration
export interface ABTestRule {
  id: string
  name: string
  description: string
  
  // Test configuration
  trafficSplit: number // 0-100 percentage for variant
  controlRate: number
  variantRate: number
  
  // Test conditions
  vehicleTypes: string[]
  locations?: string[]
  customerSegments?: string[]
  
  // Test duration
  startDate: string
  endDate: string
  isActive: boolean
  
  // Results tracking
  controlGroup: {
    participantCount: number
    totalRevenue: number
    averageStay: number
  }
  variantGroup: {
    participantCount: number
    totalRevenue: number
    averageStay: number
  }
  
  // Statistical significance
  confidenceLevel: number
  significanceReached: boolean
  winningVariant?: 'control' | 'variant'
}

// Settings management interface
export interface BusinessRulesSettings {
  rates: ParkingRateConfig[]
  modifiers: TimeBasedModifier[]
  locationOverrides: LocationRateOverride[]
  promotions: PromotionRule[]
  customerSegments: CustomerSegmentRule[]
  engineConfig: BusinessRulesEngine
  abTests: ABTestRule[]
  
  // Metadata
  version: string
  lastUpdated: string
  lastUpdatedBy: string
  environment: string
}

// Legacy system compatibility
export interface LegacyRateMapping {
  // Original config.py structure preservation
  originalVehicleTypes: string[]
  originalRates: Record<string, number>
  originalSettings: {
    maxParkingSpots: number
    overstayHours: number
    overstayPenaltyRate: number
  }
  
  // Migration metadata
  migrationTimestamp: string
  preservedLogic: {
    dayCalculationMethod: string
    roundingBehavior: string
    fallbackRate: number
  }
}