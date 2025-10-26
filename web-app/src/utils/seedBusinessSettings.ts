/**
 * Business Settings Seeder
 * Temporary utility to seed missing business settings in the database
 */

import { supabase } from '../lib/supabase'
import { log } from './secureLogger'

interface BusinessSettingsData {
  category: string
  key: string
  value: string
  default_value?: string
  sort_order?: number
}

const businessSettings: BusinessSettingsData[] = [
  {
    category: 'business',
    key: 'vehicle_rates',
    value: JSON.stringify({
      "Trailer": 225,
      "6 Wheeler": 150,
      "4 Wheeler": 100,
      "2 Wheeler": 50
    }),
    default_value: JSON.stringify({
      "Trailer": 225,
      "6 Wheeler": 150,
      "4 Wheeler": 100,
      "2 Wheeler": 50
    }),
    sort_order: 1
  },
  {
    category: 'business',
    key: 'vehicle_types',
    value: JSON.stringify(["Trailer", "6 Wheeler", "4 Wheeler", "2 Wheeler"]),
    default_value: JSON.stringify(["Trailer", "6 Wheeler", "4 Wheeler", "2 Wheeler"]),
    sort_order: 2
  },
  {
    category: 'business',
    key: 'operating_hours',
    value: JSON.stringify({
      "start": "06:00",
      "end": "22:00",
      "timezone": "America/New_York"
    }),
    default_value: JSON.stringify({
      "start": "06:00",
      "end": "22:00",
      "timezone": "America/New_York"
    }),
    sort_order: 3
  },
  {
    category: 'business',
    key: 'payment_methods',
    value: JSON.stringify(["Cash", "Card", "UPI", "Net Banking", "Online"]),
    default_value: JSON.stringify(["Cash", "Card", "UPI", "Net Banking", "Online"]),
    sort_order: 4
  },
  {
    category: 'business',
    key: 'entry_status_options',
    value: JSON.stringify(["Active", "Exited", "Overstay"]),
    default_value: JSON.stringify(["Active", "Exited", "Overstay"]),
    sort_order: 5
  },
  {
    category: 'business',
    key: 'payment_status_options',
    value: JSON.stringify(["Paid", "Pending", "Partial", "Failed"]),
    default_value: JSON.stringify(["Paid", "Pending", "Partial", "Failed"]),
    sort_order: 6
  },
  {
    category: 'business',
    key: 'minimum_charge_days',
    value: '1',
    default_value: '1',
    sort_order: 7
  },
  {
    category: 'business',
    key: 'overstay_penalty_rate',
    value: '50',
    default_value: '50',
    sort_order: 8
  },
  {
    category: 'business',
    key: 'overstay_threshold_hours',
    value: '24',
    default_value: '24',
    sort_order: 9
  }
]

export async function seedBusinessSettings() {
  log.info('Starting business settings seeding process')

  try {
    // Check if settings already exist
    const { data: existingSettings, error: checkError } = await supabase
      .from('app_settings')
      .select('category, key')
      .eq('category', 'business')

    if (checkError) {
      log.error('Error checking existing settings', checkError)
      throw checkError
    }

    const existingKeys = new Set(existingSettings?.map(s => s.key) || [])
    log.info('Found existing business settings', { count: existingKeys.size })

    // Filter out settings that already exist
    const settingsToInsert = businessSettings.filter(setting => !existingKeys.has(setting.key))

    if (settingsToInsert.length === 0) {
      log.success('All business settings already exist in database')
      return { success: true, message: 'All business settings already exist', inserted: 0 }
    }

    log.info('Seeding missing business settings', { count: settingsToInsert.length })

    // Insert missing settings
    const { data, error } = await supabase
      .from('app_settings')
      .insert(settingsToInsert)
      .select()

    if (error) {
      log.error('Error seeding business settings', error)
      throw error
    }

    log.success('Successfully seeded business settings', {
      count: settingsToInsert.length,
      settings: settingsToInsert.map(s => s.key)
    })

    return {
      success: true,
      message: `Successfully seeded ${settingsToInsert.length} business settings`,
      inserted: settingsToInsert.length,
      settings: settingsToInsert.map(s => s.key)
    }

  } catch (error) {
    log.error('Failed to seed business settings', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error
    }
  }
}

export async function checkBusinessSettingsStatus() {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('category, key')
      .eq('category', 'business')

    if (error) {
      throw error
    }

    const expectedKeys = businessSettings.map(s => s.key)
    const existingKeys = data?.map(s => s.key) || []
    const missingKeys = expectedKeys.filter(key => !existingKeys.includes(key))

    return {
      total: expectedKeys.length,
      existing: existingKeys.length,
      missing: missingKeys.length,
      missingKeys,
      needsSeeding: missingKeys.length > 0
    }
  } catch (error) {
    log.error('Error checking business settings status', error)
    return {
      total: 0,
      existing: 0,
      missing: 0,
      missingKeys: [],
      needsSeeding: false,
      error
    }
  }
}