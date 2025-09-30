import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupAppConfig() {
  try {
    console.log('🔧 Setting up business settings...\n')

    // First, check if table exists
    console.log('🔍 Checking if app_config table exists...')
    const { data: tableCheck, error: tableError } = await supabase
      .from('app_config')
      .select('id')
      .limit(1)

    if (tableError && tableError.code === '42P01') {
      console.log('❌ app_config table does not exist')
      console.log('📝 Please run the SQL script create-app-config-table.sql manually in Supabase SQL Editor')
      console.log('   or create the table structure first.')
      return
    } else if (tableError) {
      console.log('❌ Error checking table:', tableError)
      return
    } else {
      console.log('✅ app_config table exists')
    }

    // Check current data
    console.log('🔍 Checking existing data...')
    const { data: existingData, error: existingError } = await supabase
      .from('app_config')
      .select('*')
      .eq('category', 'business')

    if (existingError) {
      console.log('❌ Error checking existing data:', existingError)
      console.log('📝 This is likely due to Row Level Security (RLS)')
      console.log('💡 Solution: Temporarily disable RLS or use service role key')

      // Let's try to create a simple structure that works around RLS
      console.log('\n🔧 Trying alternative approach...')

      console.log('📝 Please run this SQL in Supabase SQL Editor:')
      console.log(`
-- Temporarily disable RLS for setup
ALTER TABLE app_config DISABLE ROW LEVEL SECURITY;

-- Insert business settings
INSERT INTO app_config (category, key, value, description) VALUES
('business', 'vehicle_types', '["Trailer", "6 Wheeler", "4 Wheeler", "2 Wheeler"]', 'Available vehicle types'),
('business', 'vehicle_rates', '{"Trailer": 225, "6 Wheeler": 150, "4 Wheeler": 100, "2 Wheeler": 50}', 'Daily parking rates'),
('business', 'business_hours', '{"open_time": "06:00", "close_time": "22:00", "timezone": "Asia/Kolkata"}', 'Business hours'),
('business', 'payment_settings', '{"accepted_methods": ["Cash", "UPI", "Card"], "currency": "INR", "tax_rate": 0.18}', 'Payment settings'),
('business', 'penalty_settings', '{"overstay_grace_period_hours": 1, "overstay_penalty_rate": 0.5}', 'Penalty settings'),
('business', 'notification_settings', '{"enable_sms": false, "enable_email": false, "reminder_hours_before_expiry": 2}', 'Notifications')
ON CONFLICT (category, key) DO UPDATE SET
value = EXCLUDED.value,
description = EXCLUDED.description,
updated_at = now();

-- Re-enable RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Verify data
SELECT category, key, value FROM app_config WHERE category = 'business';
`)

      return
    }

    if (existingData && existingData.length > 0) {
      console.log('✅ Found existing business settings:')
      existingData.forEach(setting => {
        console.log(`   ${setting.key}: ${JSON.stringify(setting.value)}`)
      })
      console.log('\n🎉 Business settings are already configured!')
    } else {
      console.log('ℹ️ No business settings found - this explains the fallback rates')
      console.log('📝 Please run the manual SQL insertion shown above')
    }

  } catch (error) {
    console.error('❌ Script error:', error)
    console.log('\n📝 Manual setup required. Please run the create-app-config-table.sql file in Supabase SQL Editor')
  }
}

setupAppConfig()