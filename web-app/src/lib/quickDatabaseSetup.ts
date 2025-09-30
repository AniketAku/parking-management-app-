import { supabase } from './supabase'

/**
 * Quick database setup - run this from browser console if you can't access Supabase SQL editor
 */
export const quickDatabaseSetup = async () => {
  console.log('🚀 Starting quick database setup...')
  
  try {
    // Try to add missing columns (will fail gracefully if they already exist)
    console.log('Step 1: Checking database structure...')
    
    // Test insert to see what columns are missing
    const testUser = {
      username: 'test_user_temp',
      email: 'test@temp.com',
      role: 'operator',
      full_name: 'Test User',
      is_approved: true,
      is_active: true,
      auth_id: '00000000-0000-0000-0000-000000000000',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { error: insertError } = await supabase
      .from('users')
      .insert(testUser)
      .select()
    
    if (insertError) {
      console.log('Insert test result:', insertError.message)
      
      if (insertError.message.includes('is_approved')) {
        console.log('❌ Missing is_approved column - you need to run the SQL manually')
        return {
          success: false,
          message: 'Missing database columns. Please run the SQL script in Supabase dashboard.',
          sqlFile: 'database-update.sql'
        }
      }
      
      if (insertError.message.includes('auth_id')) {
        console.log('❌ Missing auth_id column - you need to run the SQL manually')
        return {
          success: false,
          message: 'Missing database columns. Please run the SQL script in Supabase dashboard.',
          sqlFile: 'database-update.sql'
        }
      }
      
      if (insertError.message.includes('row-level security')) {
        console.log('❌ RLS policy blocking - you need to update policies manually')
        return {
          success: false,
          message: 'Row-level security is blocking operations. Please run the SQL script in Supabase dashboard.',
          sqlFile: 'database-update.sql'
        }
      }
    } else {
      console.log('✅ Test insert successful - cleaning up...')
      // Clean up test user
      await supabase
        .from('users')
        .delete()
        .eq('username', 'test_user_temp')
    }
    
    // Try to create/update the admin user
    console.log('Step 2: Setting up admin user...')
    
    const { error: adminError } = await supabase
      .from('users')
      .upsert({
        username: 'admin',
        email: 'aniketawachat74@gmail.com',
        role: 'admin',
        full_name: 'System Administrator',
        is_approved: true,
        is_active: true,
        auth_id: '80e13277-667d-43ec-8c49-688f7e152776',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'username'
      })
    
    if (adminError) {
      console.log('Admin user creation error:', adminError.message)
      return {
        success: false,
        message: `Failed to create admin user: ${adminError.message}`
      }
    }
    
    console.log('✅ Database setup completed successfully!')
    
    return {
      success: true,
      message: 'Database setup completed. You can now try logging in with admin/password123'
    }
    
  } catch (error) {
    console.error('Database setup failed:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Make it available globally for console access
declare global {
  interface Window {
    setupDatabase: typeof quickDatabaseSetup
  }
}

if (typeof window !== 'undefined') {
  window.setupDatabase = quickDatabaseSetup
}