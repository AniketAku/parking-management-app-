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

async function debugAuth() {
  try {
    console.log('🔍 Debugging authentication system...\n')

    // Check if users table exists and get admin user
    console.log('1. Checking admin user in database:')
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, username, role, is_active, is_approved, password_hash, created_at')
      .eq('username', 'admin')

    if (userError) {
      console.error('❌ Error querying users:', userError)
    } else if (!users || users.length === 0) {
      console.log('⚠️  No admin user found in database')
    } else {
      const admin = users[0]
      console.log('✅ Admin user found:')
      console.log('   - ID:', admin.id)
      console.log('   - Username:', admin.username)
      console.log('   - Role:', admin.role)
      console.log('   - Active:', admin.is_active)
      console.log('   - Approved:', admin.is_approved)
      console.log('   - Password hash length:', admin.password_hash?.length || 'none')
      console.log('   - Created:', admin.created_at)
    }

    console.log('\n2. Testing RPC function:')

    // Test the RPC function directly
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('verify_user_password', {
        p_username: 'admin',
        p_password: 'admin123'
      })

    if (rpcError) {
      console.error('❌ RPC function error:', rpcError)
    } else {
      console.log('✅ RPC function response:')
      console.log('   Result:', rpcResult)
    }

    console.log('\n3. Database connection test:')
    const { data: connectionTest, error: connError } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (connError) {
      console.error('❌ Connection error:', connError)
    } else {
      console.log('✅ Database connection successful')
    }

  } catch (error) {
    console.error('❌ Debug script error:', error)
  }
}

debugAuth()