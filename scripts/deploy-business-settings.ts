/**
 * Business Settings Migration Script
 * Seeds essential business configuration data to resolve RLS policy issues
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Create Supabase client for Node.js environment
const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration in environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)
import { readFile } from 'fs/promises'
import { join } from 'path'

async function deployBusinessSettings() {
  console.log('🌱 Seeding Business Settings to Database...')
  
  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), 'src', 'database', 'migrate-seed-business-settings.sql')
    const migrationSQL = await readFile(migrationPath, 'utf-8')
    
    console.log('📄 Executing business settings migration...')
    
    // Execute the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('❌ Migration failed with RPC error:', error)
      
      // Try alternative approach - direct inserts using the corrected seeder logic
      console.log('🔄 Trying alternative approach with individual inserts...')
      
      const businessSettings = [
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

      // Try inserting via upsert with proper conflict handling
      const { data: upsertData, error: upsertError } = await supabase
        .from('app_settings')
        .upsert(businessSettings, { 
          onConflict: 'category,key',
          ignoreDuplicates: true 
        })
        .select()

      if (upsertError) {
        console.error('❌ Alternative approach also failed:', upsertError)
        throw upsertError
      } else {
        console.log('✅ Business settings seeded via upsert!')
        console.log(`📊 Inserted ${upsertData?.length || businessSettings.length} business settings`)
      }
    } else {
      console.log('✅ Migration executed successfully!')
      console.log('📊 Migration result:', data)
    }
    
    // Verify the settings were inserted
    console.log('🧪 Verifying business settings...')
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('app_settings')
      .select('category, key, value')
      .eq('category', 'business')
      .order('sort_order')
    
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError)
    } else {
      console.log('✅ Verification successful!')
      console.log(`📊 Found ${verifyData.length} business settings:`)
      verifyData.forEach((setting, index) => {
        console.log(`   ${index + 1}. ${setting.key}`)
      })
      
      if (verifyData.length === 9) {
        console.log('🎉 All 9 business settings successfully seeded!')
      } else {
        console.warn(`⚠️ Expected 9 settings, but found ${verifyData.length}`)
      }
    }
    
    console.log('')
    console.log('📝 Next steps:')
    console.log('  1. Refresh the Vehicle Entry form')
    console.log('  2. Verify "Using fallback rates" warning disappears') 
    console.log('  3. Test that settings changes sync across components')
    console.log('  4. Remove temporary SettingsSeeder component')
    
  } catch (error) {
    console.error('❌ Business settings seeding failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  deployBusinessSettings()
}

export { deployBusinessSettings }