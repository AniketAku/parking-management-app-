import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase configuration')
  console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')))
  process.exit(1)
}

console.log('🔗 Using URL:', supabaseUrl)
console.log('🔑 Using key:', serviceRoleKey.substring(0, 20) + '...')

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function insertBusinessSettings() {
  try {
    console.log('🔧 Inserting business settings with service role...\n')

    const businessSettings = [
      {
        category: 'business',
        key: 'vehicle_types',
        value: ["Trailer", "6 Wheeler", "4 Wheeler", "2 Wheeler"],
        description: 'Available vehicle types for parking'
      },
      {
        category: 'business',
        key: 'vehicle_rates',
        value: {
          "Trailer": 225,
          "6 Wheeler": 150,
          "4 Wheeler": 100,
          "2 Wheeler": 50
        },
        description: 'Daily parking rates by vehicle type'
      },
      {
        category: 'business',
        key: 'business_hours',
        value: {
          "open_time": "06:00",
          "close_time": "22:00",
          "timezone": "Asia/Kolkata"
        },
        description: 'Business operating hours'
      }
    ]

    console.log('📊 Inserting settings...')

    for (const setting of businessSettings) {
      console.log(`Inserting ${setting.key}...`)

      const { data, error } = await supabase
        .from('app_config')
        .upsert(setting, {
          onConflict: 'category,key',
          ignoreDuplicates: false
        })
        .select()

      if (error) {
        console.error(`❌ Error inserting ${setting.key}:`, error)
      } else {
        console.log(`✅ Inserted ${setting.key} successfully`)
        if (data) console.log('   Data:', data)
      }
    }

    // Verify insertion
    console.log('\n🔍 Verifying data...')
    const { data: verifyData, error: verifyError } = await supabase
      .from('app_config')
      .select('*')
      .eq('category', 'business')

    if (verifyError) {
      console.error('❌ Error verifying:', verifyError)
    } else {
      console.log('✅ Verification successful:')
      verifyData.forEach(item => {
        console.log(`   ${item.key}: ${JSON.stringify(item.value)}`)
      })
    }

    console.log('\n🎉 Settings should now load in your app!')

  } catch (error) {
    console.error('❌ Script error:', error)
  }
}

insertBusinessSettings()