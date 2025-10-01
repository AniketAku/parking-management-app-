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

async function createAppConfigTable() {
  try {
    console.log('🔧 Creating app_config table and inserting business settings...\n')

    // Create the table structure
    console.log('📝 Creating app_config table...')
    const { error: createError } = await supabase.rpc('sql', {
      query: `
        -- Create the app_config table
        CREATE TABLE IF NOT EXISTS app_config (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            category TEXT NOT NULL,
            key TEXT NOT NULL,
            value JSONB NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now(),
            UNIQUE(category, key)
        );

        -- Create index for faster queries
        CREATE INDEX IF NOT EXISTS idx_app_config_category ON app_config(category);
        CREATE INDEX IF NOT EXISTS idx_app_config_category_key ON app_config(category, key);

        -- Enable Row Level Security
        ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
      `
    })

    if (createError) {
      console.error('❌ Error creating table:', createError)
    } else {
      console.log('✅ Table created successfully')
    }

    // Create RLS policies
    console.log('🔒 Setting up Row Level Security policies...')
    const { error: policyError } = await supabase.rpc('sql', {
      query: `
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Allow authenticated users to read app_config" ON app_config;
        DROP POLICY IF EXISTS "Allow admin users to manage app_config" ON app_config;

        -- Create policy to allow authenticated users to read settings
        CREATE POLICY "Allow authenticated users to read app_config" ON app_config
        FOR SELECT TO authenticated USING (true);

        -- Create policy to allow admins to manage settings
        CREATE POLICY "Allow admin users to manage app_config" ON app_config
        FOR ALL TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND users.role = 'admin'
                AND users.is_active = true
            )
        );
      `
    })

    if (policyError) {
      console.error('❌ Error setting up policies:', policyError)
    } else {
      console.log('✅ RLS policies created successfully')
    }

    // Insert business settings using direct table inserts
    console.log('📊 Inserting business settings...')

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
      },
      {
        category: 'business',
        key: 'payment_settings',
        value: {
          "accepted_methods": ["Cash", "UPI", "Card"],
          "currency": "INR",
          "tax_rate": 0.18
        },
        description: 'Payment configuration'
      },
      {
        category: 'business',
        key: 'penalty_settings',
        value: {
          "overstay_grace_period_hours": 1,
          "overstay_penalty_rate": 0.5,
          "late_payment_penalty_days": 7,
          "late_payment_penalty_rate": 0.1
        },
        description: 'Penalty and fee structure'
      },
      {
        category: 'business',
        key: 'notification_settings',
        value: {
          "enable_sms": false,
          "enable_email": false,
          "reminder_hours_before_expiry": 2
        },
        description: 'Notification preferences'
      }
    ]

    // Insert each setting
    for (const setting of businessSettings) {
      const { error: insertError } = await supabase
        .from('app_config')
        .upsert(setting, { onConflict: 'category,key' })

      if (insertError) {
        console.error(`❌ Error inserting ${setting.key}:`, insertError)
      } else {
        console.log(`✅ Inserted ${setting.key}`)
      }
    }

    // Verify the data was inserted
    console.log('\n🔍 Verifying inserted data...')
    const { data: verifyData, error: verifyError } = await supabase
      .from('app_config')
      .select('category, key, value, description')
      .eq('category', 'business')
      .order('key')

    if (verifyError) {
      console.error('❌ Error verifying data:', verifyError)
    } else {
      console.log('✅ Business settings verification:')
      verifyData.forEach(setting => {
        console.log(`   ${setting.key}: ${JSON.stringify(setting.value)}`)
      })
    }

    console.log('\n🎉 SUCCESS! Business settings are now linked to Supabase!')
    console.log('Your vehicle rates will now load properly:')
    console.log('   Trailer: ₹225')
    console.log('   6 Wheeler: ₹150')
    console.log('   4 Wheeler: ₹100')
    console.log('   2 Wheeler: ₹50')

  } catch (error) {
    console.error('❌ Script error:', error)
  }
}

createAppConfigTable()