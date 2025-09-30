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

async function createAdminUser() {
  try {
    console.log('🔧 Creating admin user...\n')

    // First, let's use PostgreSQL's crypt function to create the hash
    // We'll create the user using a SQL query that generates the hash
    const { data, error } = await supabase
      .rpc('sql', {
        query: `
          INSERT INTO users (
            id,
            username,
            password_hash,
            role,
            full_name,
            phone,
            is_active,
            is_approved,
            created_at,
            updated_at
          ) VALUES (
            gen_random_uuid(),
            'admin',
            crypt('admin123', gen_salt('bf')),
            'admin',
            'System Administrator',
            '+1-555-0000',
            true,
            true,
            now(),
            now()
          )
          ON CONFLICT (username)
          DO UPDATE SET
            password_hash = crypt('admin123', gen_salt('bf')),
            updated_at = now()
          RETURNING id, username, role;
        `
      })

    if (error) {
      console.error('❌ Error creating admin user via RPC:', error)

      // Try direct insert instead
      console.log('📝 Trying direct insert method...')

      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .upsert({
          username: 'admin',
          password_hash: '$2b$10$rB.PsKkCX/lZ6Lq2qyPPJe7tOGzVSjJP7l5oGh9T4L5XdM8dOt.NS', // bcrypt of 'admin123'
          role: 'admin',
          full_name: 'System Administrator',
          phone: '+1-555-0000',
          is_active: true,
          is_approved: true
        }, {
          onConflict: 'username'
        })
        .select()

      if (insertError) {
        console.error('❌ Error with direct insert:', insertError)
      } else {
        console.log('✅ Admin user created via direct insert')
        console.log('   Data:', insertData)
      }
    } else {
      console.log('✅ Admin user created via RPC')
      console.log('   Data:', data)
    }

    // Verify the user was created
    console.log('\n🔍 Verifying admin user...')
    const { data: verifyData, error: verifyError } = await supabase
      .from('users')
      .select('id, username, role, is_active, is_approved')
      .eq('username', 'admin')

    if (verifyError) {
      console.error('❌ Error verifying user:', verifyError)
    } else {
      console.log('✅ User verification:')
      console.log('   ', verifyData[0])
    }

    // Test login
    console.log('\n🧪 Testing login...')
    const { data: loginData, error: loginError } = await supabase
      .rpc('verify_user_password', {
        p_username: 'admin',
        p_password: 'admin123'
      })

    if (loginError) {
      console.error('❌ Login test error:', loginError)
    } else {
      console.log('✅ Login test result:')
      console.log('   ', loginData[0])

      if (loginData[0]?.is_valid) {
        console.log('\n🎉 SUCCESS! Admin user can now login with:')
        console.log('   Username: admin')
        console.log('   Password: admin123')
      } else {
        console.log('\n❌ Login still failing:', loginData[0]?.error_message)
      }
    }

  } catch (error) {
    console.error('❌ Script error:', error)
  }
}

createAdminUser()