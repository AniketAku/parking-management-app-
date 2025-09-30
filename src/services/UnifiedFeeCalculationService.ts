/**
 * 🎯 Unified Fee Calculation Service
 *
 * Single source of truth for ALL fee calculations across the application
 * Resolves inconsistencies between dashboard, search, reports, and forms
 *
 * Architecture Benefits:
 * ✅ Consistent vehicle type mapping
 * ✅ Standardized duration calculations
 * ✅ Unified settings integration
 * ✅ Clear fee field priority logic
 * ✅ Performance optimized with caching
 */

import { supabase } from '../lib/supabase'
import type { VehicleRates, ParkingEntry } from '../types'
import { BackwardCompatibility } from '../utils/settingsMigration'

// Cache configuration
interface CacheEntry<T> {
  data: T
  expiry: Date
}

class UnifiedFeeCalculationService {
  private static instance: UnifiedFeeCalculationService
  private vehicleRatesCache: CacheEntry<VehicleRates> | null = null
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

  // 🔒 Singleton pattern - ensures ONE calculation logic across entire app
  static getInstance(): UnifiedFeeCalculationService {
    if (!UnifiedFeeCalculationService.instance) {
      UnifiedFeeCalculationService.instance = new UnifiedFeeCalculationService()
    }
    return UnifiedFeeCalculationService.instance
  }

  private constructor() {
    console.log('🎯 UnifiedFeeCalculationService initialized - Single source of truth active')
  }

  // ============================================================================
  // 🎯 CORE CALCULATION METHODS - Used by ALL components
  // ============================================================================

  /**
   * Primary fee calculation method - replaces all scattered calculateFee functions
   */
  async calculateParkingFee(
    vehicleType: string,
    entryTime: string,
    exitTime?: string,
    debugContext?: string
  ): Promise<number> {
    try {
      console.log(`🧮 UnifiedFeeCalculationService.calculateParkingFee called by: ${debugContext || 'unknown'}`, {
        vehicleType: vehicleType,
        entryTime,
        exitTime: exitTime || 'current time'
      })

      // 1. Normalize vehicle type to handle inconsistencies
      const normalizedVehicleType = this.normalizeVehicleType(vehicleType)

      // 2. Get rate from settings (with fallback)
      const rate = await this.getVehicleRate(normalizedVehicleType)

      // 3. Calculate duration with proper 3-scenario billing logic
      const entry = new Date(entryTime)
      const exit = exitTime ? new Date(exitTime) : new Date()

      const diffMs = exit.getTime() - entry.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)

      // 🎯 NEW 3-SCENARIO BILLING LOGIC:
      // Scenario 1: Less than 24 hours = 1 day minimum charge
      // Scenario 2: 24+ hours = actual number of days (rounded up)
      const days = diffHours < 24 ? 1 : Math.ceil(diffHours / 24)

      const totalFee = days * rate

      console.log('🧮 Fee Calculation Complete (3-Scenario Logic):', {
        originalVehicleType: vehicleType,
        normalizedVehicleType,
        rate,
        diffHours: diffHours.toFixed(2),
        days,
        totalFee,
        scenario: diffHours < 24 ? 'Scenario 1: <24hrs = 1 day minimum' : `Scenario 2: ${diffHours.toFixed(1)}hrs = ${days} days`,
        calculation: `${days} days × ₹${rate} = ₹${totalFee}`
      })

      return totalFee

    } catch (error) {
      console.error('❌ UnifiedFeeCalculationService.calculateParkingFee error:', error)
      // Fallback calculation
      return this.fallbackCalculation(vehicleType, entryTime, exitTime)
    }
  }

  /**
   * Standardized duration calculation - replaces all scattered duration functions
   */
  calculateDuration(entryTime: string, exitTime?: string): string {
    const entry = new Date(entryTime)
    const exit = exitTime ? new Date(exitTime) : new Date()

    const diffMs = exit.getTime() - entry.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    if (diffHours < 1) {
      const minutes = Math.floor(diffMs / (1000 * 60))
      return `${minutes} minutes`
    } else if (diffHours < 24) {
      const hours = Math.floor(diffHours)
      const minutes = Math.floor((diffHours - hours) * 60)
      return `${hours}h ${minutes}m`
    } else {
      const days = Math.floor(diffHours / 24)
      const hours = Math.floor(diffHours % 24)
      return `${days}d ${hours}h`
    }
  }

  // ============================================================================
  // 🔄 VEHICLE TYPE NORMALIZATION - Fixes inconsistent mappings
  // ============================================================================

  /**
   * Normalize vehicle types to handle variations:
   * "6-wheeler", "6 wheeler", "6Wheeler" → "6 Wheeler"
   * "trailer", "Trailer" → "Trailer"
   */
  normalizeVehicleType(rawVehicleType: string): string {
    const cleaned = rawVehicleType.trim().toLowerCase()

    // Vehicle type mapping rules
    const typeMap: Record<string, string> = {
      // 6-wheeler variations
      '6-wheeler': '6 Wheeler',
      '6wheeler': '6 Wheeler',
      '6 wheeler': '6 Wheeler',
      'six wheeler': '6 Wheeler',

      // Trailer variations
      'trailer': 'Trailer',

      // 4-wheeler variations
      '4-wheeler': '4 Wheeler',
      '4wheeler': '4 Wheeler',
      '4 wheeler': '4 Wheeler',
      'four wheeler': '4 Wheeler',

      // 2-wheeler variations
      '2-wheeler': '2 Wheeler',
      '2wheeler': '2 Wheeler',
      '2 wheeler': '2 Wheeler',
      'two wheeler': '2 Wheeler',
      'bike': '2 Wheeler',
      'motorcycle': '2 Wheeler'
    }

    const normalized = typeMap[cleaned] || rawVehicleType

    if (normalized !== rawVehicleType) {
      console.log(`🔄 Vehicle type normalized: "${rawVehicleType}" → "${normalized}"`)
    }

    return normalized
  }

  // ============================================================================
  // ⚙️ SETTINGS INTEGRATION - Centralized rate management
  // ============================================================================

  /**
   * Get vehicle rate with settings integration and fallback logic
   */
  async getVehicleRate(vehicleType: string): Promise<number> {
    try {
      const rates = await this.loadVehicleRatesFromSettings()
      const rate = rates[vehicleType as keyof VehicleRates]

      if (rate && rate > 0) {
        console.log(`💰 Rate from settings: ${vehicleType} = ₹${rate}`)
        return rate
      }

      // Fallback rates if settings unavailable
      const fallbackRates: VehicleRates = {
        'Trailer': 225,
        '6 Wheeler': 150,
        '4 Wheeler': 100,
        '2 Wheeler': 50
      }

      const fallbackRate = fallbackRates[vehicleType as keyof VehicleRates] || 100
      console.warn(`⚠️ Using fallback rate: ${vehicleType} = ₹${fallbackRate} (Settings unavailable)`)
      return fallbackRate

    } catch (error) {
      console.error('❌ Error getting vehicle rate:', error)
      return 100 // Ultimate fallback
    }
  }

  /**
   * Load vehicle rates from settings with caching
   */
  private async loadVehicleRatesFromSettings(): Promise<VehicleRates> {
    // Check cache first
    if (this.vehicleRatesCache && new Date() < this.vehicleRatesCache.expiry) {
      console.log('📋 Using cached vehicle rates')
      return this.vehicleRatesCache.data
    }

    try {
      console.log('🔄 Loading vehicle rates from settings...')
      const rates = await BackwardCompatibility.getSettingWithFallback('vehicle_rates', {
        'Trailer': 225,
        '6 Wheeler': 150,
        '4 Wheeler': 100,
        '2 Wheeler': 50
      }, {
        timeout: 5000,
        retries: 2
      })

      // Cache the result
      this.vehicleRatesCache = {
        data: rates,
        expiry: new Date(Date.now() + this.CACHE_DURATION_MS)
      }

      console.log('✅ Vehicle rates loaded from settings:', rates)
      return rates

    } catch (error) {
      console.error('❌ Failed to load vehicle rates from settings:', error)

      // Return fallback rates
      const fallbackRates: VehicleRates = {
        'Trailer': 225,
        '6 Wheeler': 150,
        '4 Wheeler': 100,
        '2 Wheeler': 50
      }

      return fallbackRates
    }
  }

  // ============================================================================
  // 💰 FEE EXTRACTION - Handles multiple database fee fields consistently
  // ============================================================================

  /**
   * Extract revenue amount with consistent priority logic
   * Priority: parking_fee (user's actual payment) → actual_fee (manual override) → calculated_fee (system calculation) → amount_paid (legacy) → 0
   */
  getRevenueAmount(entry: any): number {
    const amount = entry.parkingFee ??
                  entry.actualFee ??
                  entry.calculatedFee ??
                  entry.amountPaid ?? 0

    console.log(`💰 Revenue extracted: ₹${amount} from ${this.getFeeSource(entry)} field`)
    return amount
  }

  /**
   * Identify which fee field was used (for debugging/auditing)
   * Matches the priority order in getRevenueAmount
   */
  getFeeSource(entry: any): 'parking_fee' | 'manual' | 'calculated' | 'legacy' | 'none' {
    if (entry.parkingFee !== undefined && entry.parkingFee !== null) return 'parking_fee'
    if (entry.actualFee !== undefined && entry.actualFee !== null) return 'manual'
    if (entry.calculatedFee !== undefined && entry.calculatedFee !== null) return 'calculated'
    if (entry.amountPaid !== undefined && entry.amountPaid !== null) return 'legacy'
    return 'none'
  }

  /**
   * Check if entry has manual amount override
   */
  hasManualAmount(entry: any): boolean {
    return entry.actualFee !== undefined && entry.actualFee !== null
  }

  // ============================================================================
  // 🛡️ FALLBACK & ERROR HANDLING
  // ============================================================================

  /**
   * Fallback calculation when main calculation fails
   */
  private fallbackCalculation(vehicleType: string, entryTime: string, exitTime?: string): number {
    console.warn('⚠️ Using fallback calculation')

    const fallbackRates: Record<string, number> = {
      'Trailer': 225,
      '6 Wheeler': 150,
      '4 Wheeler': 100,
      '2 Wheeler': 50
    }

    const normalizedType = this.normalizeVehicleType(vehicleType)
    const rate = fallbackRates[normalizedType] || 100

    const entry = new Date(entryTime)
    const exit = exitTime ? new Date(exitTime) : new Date()
    const diffHours = (exit.getTime() - entry.getTime()) / (1000 * 60 * 60)

    // 🎯 Apply same 3-scenario logic in fallback
    const days = diffHours < 24 ? 1 : Math.ceil(diffHours / 24)

    console.warn('⚠️ Fallback calculation with 3-scenario logic:', {
      vehicleType: normalizedType,
      rate,
      diffHours: diffHours.toFixed(2),
      days,
      scenario: diffHours < 24 ? 'Scenario 1: <24hrs = 1 day minimum' : `Scenario 2: ${diffHours.toFixed(1)}hrs = ${days} days`
    })

    return days * rate
  }

  /**
   * Clear cache (useful for settings updates)
   */
  clearCache(): void {
    this.vehicleRatesCache = null
    console.log('🗑️ UnifiedFeeCalculationService cache cleared')
  }

  // ============================================================================
  // 📊 UTILITY METHODS
  // ============================================================================

  /**
   * Format currency consistently across the app
   */
  formatCurrency(amount: number): string {
    return `₹${amount.toLocaleString('en-IN')}`
  }

  /**
   * Get service status for debugging
   */
  getServiceStatus(): {
    hasCachedRates: boolean
    cacheExpiry: Date | null
    version: string
  } {
    return {
      hasCachedRates: this.vehicleRatesCache !== null,
      cacheExpiry: this.vehicleRatesCache?.expiry || null,
      version: '1.0.0'
    }
  }
}

// Export singleton instance
export const unifiedFeeService = UnifiedFeeCalculationService.getInstance()

// Export class for testing
export { UnifiedFeeCalculationService }