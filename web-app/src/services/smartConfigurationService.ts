/**
 * Smart Configuration Service
 * Provides intelligent configuration management with context-aware recommendations,
 * auto-detection, and adaptive settings based on usage patterns and business intelligence.
 */

import { log } from '../utils/secureLogger'
import type {
  AppSetting,
  BusinessSettings,
  SettingCategory,
  AllSettings,
  VehicleRates
} from '../types/settings'

interface ConfigurationContext {
  businessType?: 'parking_lot' | 'toll_plaza' | 'warehouse' | 'retail'
  location?: {
    country: string
    state: string
    city: string
    timezone: string
  }
  capacity?: {
    maxVehicles: number
    averageDaily: number
    peakHours: string[]
  }
  existingData?: {
    entryCount: number
    averageStayHours: number
    popularVehicleTypes: string[]
    paymentMethods: string[]
  }
}

interface SmartRecommendation {
  id: string
  category: SettingCategory
  settingKey: string
  currentValue: any
  recommendedValue: any
  reason: string
  confidence: number // 0-1 scale
  impact: 'high' | 'medium' | 'low'
  autoApplicable: boolean
  source: 'usage_pattern' | 'best_practice' | 'location_based' | 'business_logic'
}

interface ConfigurationTemplate {
  id: string
  name: string
  description: string
  businessType: string
  settings: Partial<AllSettings>
  applicableRegions: string[]
}

export class SmartConfigurationService {
  private predefinedTemplates: ConfigurationTemplate[] = []
  private usagePatterns: Map<string, any> = new Map()
  private regionDefaults: Map<string, any> = new Map()

  constructor() {
    this.initializePredefinedTemplates()
    this.initializeRegionDefaults()
  }

  /**
   * Initialize business-specific configuration templates
   */
  private initializePredefinedTemplates(): void {
    this.predefinedTemplates = [
      {
        id: 'indian_truck_parking',
        name: 'Indian Truck Parking Lot',
        description: 'Optimized for truck parking facilities in India',
        businessType: 'truck_parking',
        applicableRegions: ['IN'],
        settings: {
          business: {
            vehicle_rates: {
              'Trailer': 250,
              '6 Wheeler': 175,
              '4 Wheeler': 75,
              '2 Wheeler': 25
            },
            minimum_charge_days: 1,
            operating_hours: {
              start: '06:00',
              end: '22:00',
              timezone: 'Asia/Kolkata'
            },
            payment_methods: ['Cash', 'UPI', 'Credit Card'],
            vehicle_types: ['Trailer', '6 Wheeler', '4 Wheeler', '2 Wheeler']
          },
          localization: {
            default_locale: 'en-IN',
            currency_symbol: '₹',
            currency_code: 'INR',
            date_format: 'DD/MM/YYYY',
            time_format: '24',
            timezone: 'Asia/Kolkata'
          }
        }
      },
      {
        id: 'us_commercial_parking',
        name: 'US Commercial Parking Facility',
        description: 'Designed for commercial parking lots in the United States',
        businessType: 'commercial_parking',
        applicableRegions: ['US'],
        settings: {
          business: {
            vehicle_rates: {
              'Trailer': 45,
              '6 Wheeler': 35,
              '4 Wheeler': 15,
              '2 Wheeler': 8
            },
            minimum_charge_days: 1,
            operating_hours: {
              start: '06:00',
              end: '23:00',
              timezone: 'America/New_York'
            },
            payment_methods: ['Credit Card', 'Debit Card', 'Cash', 'Digital Wallet'],
            vehicle_types: ['Trailer', '6 Wheeler', '4 Wheeler', '2 Wheeler']
          },
          localization: {
            default_locale: 'en-US',
            currency_symbol: '$',
            currency_code: 'USD',
            date_format: 'MM/DD/YYYY',
            time_format: '12',
            timezone: 'America/New_York'
          }
        }
      },
      {
        id: 'european_parking_hub',
        name: 'European Logistics Hub',
        description: 'Configured for European logistics and transport hubs',
        businessType: 'logistics_hub',
        applicableRegions: ['EU'],
        settings: {
          business: {
            vehicle_rates: {
              'Trailer': 35,
              '6 Wheeler': 28,
              '4 Wheeler': 12,
              '2 Wheeler': 5
            },
            minimum_charge_days: 1,
            operating_hours: {
              start: '05:00',
              end: '22:00',
              timezone: 'Europe/Berlin'
            },
            payment_methods: ['Credit Card', 'Debit Card', 'Bank Transfer'],
            vehicle_types: ['Trailer', '6 Wheeler', '4 Wheeler', '2 Wheeler']
          },
          localization: {
            default_locale: 'en-EU',
            currency_symbol: '€',
            currency_code: 'EUR',
            date_format: 'DD.MM.YYYY',
            time_format: '24',
            timezone: 'Europe/Berlin'
          }
        }
      }
    ]
  }

  /**
   * Initialize region-specific defaults
   */
  private initializeRegionDefaults(): void {
    this.regionDefaults.set('IN', {
      currency: { symbol: '₹', code: 'INR' },
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24',
      timezone: 'Asia/Kolkata',
      popularPayments: ['Cash', 'UPI', 'Credit Card'],
      businessHours: { start: '06:00', end: '22:00' }
    })

    this.regionDefaults.set('US', {
      currency: { symbol: '$', code: 'USD' },
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12',
      timezone: 'America/New_York',
      popularPayments: ['Credit Card', 'Debit Card', 'Digital Wallet'],
      businessHours: { start: '07:00', end: '23:00' }
    })

    this.regionDefaults.set('EU', {
      currency: { symbol: '€', code: 'EUR' },
      dateFormat: 'DD.MM.YYYY',
      timeFormat: '24',
      timezone: 'Europe/Berlin',
      popularPayments: ['Credit Card', 'Bank Transfer', 'Digital Wallet'],
      businessHours: { start: '06:00', end: '22:00' }
    })
  }

  /**
   * Detect configuration context from user environment and existing data
   */
  async detectConfigurationContext(): Promise<ConfigurationContext> {
    const context: ConfigurationContext = {}

    try {
      // Detect location from browser
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const locale = navigator.language || 'en'
      
      // Infer location from timezone and locale
      if (timezone.includes('Asia/Kolkata') || timezone.includes('Asia/Mumbai')) {
        context.location = {
          country: 'IN',
          state: 'Unknown',
          city: 'Unknown',
          timezone
        }
      } else if (timezone.includes('America/')) {
        context.location = {
          country: 'US',
          state: 'Unknown',
          city: 'Unknown',
          timezone
        }
      } else if (timezone.includes('Europe/')) {
        context.location = {
          country: 'EU',
          state: 'Unknown',
          city: 'Unknown',
          timezone
        }
      }

      // Detect business type from existing settings or patterns
      // This would typically analyze existing data
      context.businessType = 'parking_lot' // Default assumption

      return context
    } catch (error) {
      log.warn('Failed to detect configuration context', error)
      return context
    }
  }

  /**
   * Generate smart recommendations based on context and usage patterns
   */
  async generateRecommendations(
    currentSettings: Partial<AllSettings>,
    context: ConfigurationContext
  ): Promise<SmartRecommendation[]> {
    const recommendations: SmartRecommendation[] = []

    // Location-based recommendations
    if (context.location) {
      const locationRecs = this.generateLocationBasedRecommendations(
        currentSettings,
        context.location
      )
      recommendations.push(...locationRecs)
    }

    // Business logic recommendations
    const businessRecs = this.generateBusinessLogicRecommendations(currentSettings)
    recommendations.push(...businessRecs)

    // Usage pattern recommendations
    if (context.existingData) {
      const usageRecs = this.generateUsagePatternRecommendations(
        currentSettings,
        context.existingData
      )
      recommendations.push(...usageRecs)
    }

    // Performance optimization recommendations
    const perfRecs = this.generatePerformanceRecommendations(currentSettings)
    recommendations.push(...perfRecs)

    // Sort by confidence and impact
    return recommendations.sort((a, b) => {
      const scoreA = a.confidence * this.getImpactWeight(a.impact)
      const scoreB = b.confidence * this.getImpactWeight(b.impact)
      return scoreB - scoreA
    })
  }

  /**
   * Generate location-specific recommendations
   */
  private generateLocationBasedRecommendations(
    settings: Partial<AllSettings>,
    location: ConfigurationContext['location']
  ): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = []
    
    if (!location) return recommendations

    const regionDefaults = this.regionDefaults.get(location.country)
    if (!regionDefaults) return recommendations

    // Currency recommendations
    if (settings.localization?.currency_symbol !== regionDefaults.currency.symbol) {
      recommendations.push({
        id: 'currency_symbol_location',
        category: 'localization',
        settingKey: 'currency_symbol',
        currentValue: settings.localization?.currency_symbol,
        recommendedValue: regionDefaults.currency.symbol,
        reason: `Recommended currency symbol for ${location.country}`,
        confidence: 0.9,
        impact: 'medium',
        autoApplicable: true,
        source: 'location_based'
      })
    }

    // Timezone recommendations
    if (settings.localization?.timezone !== location.timezone) {
      recommendations.push({
        id: 'timezone_location',
        category: 'localization',
        settingKey: 'timezone',
        currentValue: settings.localization?.timezone,
        recommendedValue: location.timezone,
        reason: 'Match timezone to detected location',
        confidence: 0.95,
        impact: 'high',
        autoApplicable: true,
        source: 'location_based'
      })
    }

    // Payment methods recommendations
    const currentPayments = settings.business?.payment_methods || []
    const missingPopularPayments = regionDefaults.popularPayments.filter(
      (method: string) => !currentPayments.includes(method)
    )

    if (missingPopularPayments.length > 0) {
      recommendations.push({
        id: 'payment_methods_location',
        category: 'business',
        settingKey: 'payment_methods',
        currentValue: currentPayments,
        recommendedValue: [...currentPayments, ...missingPopularPayments],
        reason: `Add popular payment methods for ${location.country}`,
        confidence: 0.8,
        impact: 'medium',
        autoApplicable: false,
        source: 'location_based'
      })
    }

    return recommendations
  }

  /**
   * Generate business logic recommendations
   */
  private generateBusinessLogicRecommendations(
    settings: Partial<AllSettings>
  ): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = []

    if (settings.business?.vehicle_rates) {
      const rates = settings.business.vehicle_rates

      // Check rate hierarchy
      const rateOrder = [
        { type: '2 Wheeler', rate: rates['2 Wheeler'] },
        { type: '4 Wheeler', rate: rates['4 Wheeler'] },
        { type: '6 Wheeler', rate: rates['6 Wheeler'] },
        { type: 'Trailer', rate: rates['Trailer'] }
      ].filter(item => item.rate !== undefined)

      for (let i = 0; i < rateOrder.length - 1; i++) {
        if (rateOrder[i].rate >= rateOrder[i + 1].rate) {
          recommendations.push({
            id: `rate_hierarchy_${i}`,
            category: 'business',
            settingKey: 'vehicle_rates',
            currentValue: rates,
            recommendedValue: this.generateOptimalRateHierarchy(rates),
            reason: `${rateOrder[i].type} rate should be less than ${rateOrder[i + 1].type} rate`,
            confidence: 0.85,
            impact: 'medium',
            autoApplicable: true,
            source: 'business_logic'
          })
          break // Only add one hierarchy recommendation
        }
      }

      // Check for zero rates
      Object.entries(rates).forEach(([vehicleType, rate]) => {
        if (rate <= 0) {
          recommendations.push({
            id: `zero_rate_${vehicleType}`,
            category: 'business',
            settingKey: 'vehicle_rates',
            currentValue: rates,
            recommendedValue: { ...rates, [vehicleType]: this.getDefaultRate(vehicleType) },
            reason: `${vehicleType} rate cannot be zero`,
            confidence: 1.0,
            impact: 'high',
            autoApplicable: true,
            source: 'business_logic'
          })
        }
      })
    }

    // Operating hours validation
    if (settings.business?.operating_hours) {
      const { start, end } = settings.business.operating_hours
      
      if (start && end) {
        const startTime = new Date(`2000-01-01T${start}`)
        const endTime = new Date(`2000-01-01T${end}`)
        
        if (startTime >= endTime) {
          recommendations.push({
            id: 'invalid_operating_hours',
            category: 'business',
            settingKey: 'operating_hours',
            currentValue: settings.business.operating_hours,
            recommendedValue: {
              ...settings.business.operating_hours,
              start: '06:00',
              end: '22:00'
            },
            reason: 'Opening time must be before closing time',
            confidence: 1.0,
            impact: 'high',
            autoApplicable: true,
            source: 'business_logic'
          })
        }
      }
    }

    return recommendations
  }

  /**
   * Generate usage pattern-based recommendations
   */
  private generateUsagePatternRecommendations(
    settings: Partial<AllSettings>,
    usageData: NonNullable<ConfigurationContext['existingData']>
  ): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = []

    // Recommend based on popular vehicle types
    if (usageData.popularVehicleTypes.length > 0) {
      const currentVehicleTypes = settings.business?.vehicle_types || []
      const missingPopularTypes = usageData.popularVehicleTypes.filter(
        type => !currentVehicleTypes.includes(type)
      )

      if (missingPopularTypes.length > 0) {
        recommendations.push({
          id: 'popular_vehicle_types',
          category: 'business',
          settingKey: 'vehicle_types',
          currentValue: currentVehicleTypes,
          recommendedValue: [...currentVehicleTypes, ...missingPopularTypes],
          reason: 'Add vehicle types based on usage patterns',
          confidence: 0.7,
          impact: 'medium',
          autoApplicable: false,
          source: 'usage_pattern'
        })
      }
    }

    // Recommend session timeout based on average stay
    if (usageData.averageStayHours > 0) {
      const recommendedTimeout = Math.min(
        Math.max(usageData.averageStayHours * 60, 30), // Min 30 minutes
        480 // Max 8 hours
      )

      const currentTimeout = settings.security?.session_inactivity_timeout
      if (!currentTimeout || Math.abs(currentTimeout - recommendedTimeout) > 60) {
        recommendations.push({
          id: 'session_timeout_usage',
          category: 'security',
          settingKey: 'session_inactivity_timeout',
          currentValue: currentTimeout,
          recommendedValue: recommendedTimeout,
          reason: 'Optimize session timeout based on average parking duration',
          confidence: 0.6,
          impact: 'low',
          autoApplicable: true,
          source: 'usage_pattern'
        })
      }
    }

    return recommendations
  }

  /**
   * Generate performance optimization recommendations
   */
  private generatePerformanceRecommendations(
    settings: Partial<AllSettings>
  ): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = []

    // API timeout recommendations
    const currentApiTimeout = settings.system?.api_timeout_ms
    if (!currentApiTimeout || currentApiTimeout < 10000) {
      recommendations.push({
        id: 'api_timeout_performance',
        category: 'system',
        settingKey: 'api_timeout_ms',
        currentValue: currentApiTimeout,
        recommendedValue: 10000,
        reason: 'Increase API timeout for better reliability',
        confidence: 0.8,
        impact: 'medium',
        autoApplicable: true,
        source: 'best_practice'
      })
    }

    // Retry attempts recommendation
    const currentRetryAttempts = settings.system?.retry_attempts
    if (!currentRetryAttempts || currentRetryAttempts < 3) {
      recommendations.push({
        id: 'retry_attempts_performance',
        category: 'system',
        settingKey: 'retry_attempts',
        currentValue: currentRetryAttempts,
        recommendedValue: 3,
        reason: 'Increase retry attempts for better resilience',
        confidence: 0.9,
        impact: 'medium',
        autoApplicable: true,
        source: 'best_practice'
      })
    }

    return recommendations
  }

  /**
   * Get suitable template for context
   */
  getSuitableTemplate(context: ConfigurationContext): ConfigurationTemplate | null {
    if (!context.location) return null

    return this.predefinedTemplates.find(template => 
      template.applicableRegions.includes(context.location!.country) &&
      template.businessType === context.businessType
    ) || null
  }

  /**
   * Apply configuration template
   */
  applyTemplate(templateId: string): Partial<AllSettings> {
    const template = this.predefinedTemplates.find(t => t.id === templateId)
    return template ? template.settings : {}
  }

  /**
   * Auto-apply safe recommendations
   */
  getAutoApplicableRecommendations(
    recommendations: SmartRecommendation[]
  ): SmartRecommendation[] {
    return recommendations.filter(rec => 
      rec.autoApplicable && 
      rec.confidence >= 0.8 && 
      rec.impact !== 'high'
    )
  }

  /**
   * Helper methods
   */
  private getImpactWeight(impact: SmartRecommendation['impact']): number {
    switch (impact) {
      case 'high': return 3
      case 'medium': return 2
      case 'low': return 1
    }
  }

  private getDefaultRate(vehicleType: string): number {
    const defaultRates: Record<string, number> = {
      'Trailer': 225,
      '6 Wheeler': 150,
      '4 Wheeler': 100,
      '2 Wheeler': 50
    }
    return defaultRates[vehicleType] || 100
  }

  private generateOptimalRateHierarchy(currentRates: VehicleRates): VehicleRates {
    // Generate a logical rate hierarchy
    const baseRate = Math.min(...Object.values(currentRates).filter(rate => rate > 0)) || 50
    
    return {
      '2 Wheeler': baseRate,
      '4 Wheeler': baseRate * 2,
      '6 Wheeler': baseRate * 3,
      'Trailer': baseRate * 4.5
    }
  }
}

export const smartConfigService = new SmartConfigurationService()
export default smartConfigService