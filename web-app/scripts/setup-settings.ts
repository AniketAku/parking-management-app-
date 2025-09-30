/**
 * Settings Setup Script
 * Sets up basic settings data for the parking management system
 */

import { supabase } from '../src/lib/supabase'

interface BasicSetting {
  category: string
  key: string
  value: any
  description: string
  data_type: 'string' | 'number' | 'boolean' | 'json' | 'array'
}

// Essential settings for the parking system
const essentialSettings: BasicSetting[] = [
  // Business Settings
  {
    category: 'business',
    key: 'vehicle_rates',
    value: {
      'Trailer': 225,
      '6 Wheeler': 150,
      '4 Wheeler': 100,
      '2 Wheeler': 50
    },
    description: 'Daily parking rates by vehicle type (in INR)',
    data_type: 'json'
  },
  {
    category: 'business',
    key: 'overstay_penalty_rate',
    value: 50,
    description: 'Penalty rate per hour for overstaying (in INR)',
    data_type: 'number'
  },
  {
    category: 'business',
    key: 'overstay_threshold_hours',
    value: 24,
    description: 'Hours after which overstay penalty applies',
    data_type: 'number'
  },
  {
    category: 'business',
    key: 'minimum_charge_days',
    value: 1,
    description: 'Minimum number of days to charge for parking',
    data_type: 'number'
  },
  {
    category: 'business',
    key: 'operating_hours',
    value: {
      start: '06:00',
      end: '22:00',
      timezone: 'Asia/Kolkata'
    },
    description: 'Daily operating hours',
    data_type: 'json'
  },
  {
    category: 'business',
    key: 'payment_methods',
    value: ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Online'],
    description: 'Available payment methods',
    data_type: 'array'
  },
  {
    category: 'business',
    key: 'vehicle_types',
    value: ['Trailer', '6 Wheeler', '4 Wheeler', '2 Wheeler'],
    description: 'Supported vehicle types',
    data_type: 'array'
  },
  {
    category: 'business',
    key: 'entry_status_options',
    value: ['Parked', 'Exited'],
    description: 'Available status values for parking entries',
    data_type: 'array'
  },
  {
    category: 'business',
    key: 'payment_status_options',
    value: ['Paid', 'Unpaid', 'Pending'],
    description: 'Available payment status values',
    data_type: 'array'
  },
  
  // UI Theme Settings
  {
    category: 'ui_theme',
    key: 'primary_color',
    value: '#2563eb',
    description: 'Primary brand color (hex)',
    data_type: 'string'
  },
  {
    category: 'ui_theme',
    key: 'secondary_color',
    value: '#64748b',
    description: 'Secondary color (hex)',
    data_type: 'string'
  },
  {
    category: 'ui_theme',
    key: 'success_color',
    value: '#10b981',
    description: 'Success color (hex)',
    data_type: 'string'
  },
  {
    category: 'ui_theme',
    key: 'warning_color',
    value: '#f59e0b',
    description: 'Warning color (hex)',
    data_type: 'string'
  },
  {
    category: 'ui_theme',
    key: 'danger_color',
    value: '#ef4444',
    description: 'Danger/error color (hex)',
    data_type: 'string'
  },
  {
    category: 'ui_theme',
    key: 'dark_mode',
    value: false,
    description: 'Enable dark mode by default',
    data_type: 'boolean'
  },
  
  // Localization Settings
  {
    category: 'localization',
    key: 'currency_symbol',
    value: '₹',
    description: 'Currency symbol',
    data_type: 'string'
  },
  {
    category: 'localization',
    key: 'currency_code',
    value: 'INR',
    description: 'Currency code',
    data_type: 'string'
  },
  {
    category: 'localization',
    key: 'default_locale',
    value: 'en-IN',
    description: 'Default locale for formatting',
    data_type: 'string'
  },
  {
    category: 'localization',
    key: 'time_format',
    value: '12',
    description: 'Time format (12 or 24 hour)',
    data_type: 'string'
  },
  {
    category: 'localization',
    key: 'timezone',
    value: 'Asia/Kolkata',
    description: 'Default timezone',
    data_type: 'string'
  }
]

async function setupSettings() {
  console.log('🚀 Setting up Parking Management Settings...')
  
  try {
    // First, check if the app_settings table exists
    console.log('🔍 Checking for existing settings table...')
    
    const { data: existingSettings, error: checkError } = await supabase
      .from('app_settings')
      .select('key')
      .limit(1)
    
    if (checkError) {
      console.log('📋 Settings table not found. Creating basic configuration...')
      
      // If the table doesn't exist, we'll need to store settings in a simple way
      // For now, let's create the essential settings in localStorage as a fallback
      const settingsData = {
        business: {},
        ui_theme: {},
        localization: {}
      }
      
      essentialSettings.forEach(setting => {
        if (!settingsData[setting.category as keyof typeof settingsData]) {
          (settingsData as any)[setting.category] = {}
        }
        ;(settingsData as any)[setting.category][setting.key] = setting.value
      })
      
      // Store in localStorage for immediate use
      localStorage.setItem('parking_settings', JSON.stringify(settingsData))
      
      console.log('✅ Basic settings configured in localStorage')
      console.log('⚠️  Note: For full functionality, database schema needs to be applied')
      
      return settingsData
    }
    
    console.log('✅ Settings table found!')
    
    // Insert or update each setting
    for (const setting of essentialSettings) {
      console.log(`📝 Setting up: ${setting.category}.${setting.key}`)
      
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          category: setting.category,
          key: setting.key,
          value: setting.value,
          data_type: setting.data_type,
          description: setting.description,
          scope: 'system',
          default_value: setting.value,
          sort_order: 0
        }, {
          onConflict: 'category,key'
        })
      
      if (error) {
        console.warn(`⚠️  Warning setting ${setting.key}:`, error.message)
      }
    }
    
    console.log('✅ Settings setup complete!')
    
    // Test the settings
    console.log('🧪 Testing settings retrieval...')
    
    const { data: vehicleRates, error: testError } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'vehicle_rates')
      .single()
    
    if (testError) {
      console.warn('⚠️  Settings test warning:', testError.message)
    } else {
      console.log('✅ Settings test passed!')
      console.log('🚗 Vehicle rates:', vehicleRates?.value)
    }
    
    console.log('')
    console.log('🎉 Settings system is ready!')
    console.log('📝 Next steps:')
    console.log('  1. Restart your development server')
    console.log('  2. Navigate to Settings page')
    console.log('  3. Verify that settings are now editable')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
    throw error
  }
}

// Run if called directly with Node
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  setupSettings().catch(console.error)
}

export { setupSettings, essentialSettings }