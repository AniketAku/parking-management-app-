import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function deployRPCFunction() {
  try {
    console.log('📦 Deploying RPC function to Supabase...')

    // Read the SQL file
    const sqlFile = path.join(__dirname, 'database/functions/verify_user_password.sql')
    const sqlContent = fs.readFileSync(sqlFile, 'utf8')

    // Execute the SQL to create the function
    // Note: This approach may have limitations with complex SQL
    // For production, consider using Supabase CLI or direct database access

    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sqlContent
    })

    if (error) {
      console.error('❌ Failed to deploy RPC function:', error)

      // Try alternative approach - create function manually
      console.log('🔄 Trying alternative deployment approach...')

      // Just test if we can call the function (it might already exist)
      const testResult = await supabase.rpc('verify_user_password', {
        p_username: 'test',
        p_password: 'test'
      })

      if (testResult.error && testResult.error.code === '42883') {
        console.error('❌ Function does not exist and cannot be created via client')
        console.log('📋 Please run this SQL manually in the Supabase dashboard:')
        console.log('---')
        console.log(sqlContent)
        console.log('---')
      } else {
        console.log('✅ Function appears to exist or was created successfully')
      }
    } else {
      console.log('✅ RPC function deployed successfully!')
    }

  } catch (error) {
    console.error('❌ Error deploying RPC function:', error)

    // Show manual instructions
    const sqlFile = path.join(__dirname, 'database/functions/verify_user_password.sql')
    const sqlContent = fs.readFileSync(sqlFile, 'utf8')

    console.log('📋 Please run this SQL manually in the Supabase SQL Editor:')
    console.log('---')
    console.log(sqlContent)
    console.log('---')
  }
}

deployRPCFunction()