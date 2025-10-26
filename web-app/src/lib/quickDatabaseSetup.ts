import { supabase } from './supabase'
import { log } from '../utils/secureLogger'

/**
 * Quick database setup - run this from browser console if you can't access Supabase SQL editor
 */
export const quickDatabaseSetup = async () => {
  log.info('Starting quick database setup')
  
  try {
    // Try to add missing columns (will fail gracefully if they already exist)
    log.debug('Step 1: Checking database structure')
    
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
      log.debug('Insert test result', { message: insertError.message })

      if (insertError.message.includes('is_approved')) {
        log.error('Missing is_approved column - you need to run the SQL manually')
        return {
          success: false,
          message: 'Missing database columns. Please run the SQL script in Supabase dashboard.',
          sqlFile: 'database-update.sql'
        }
      }
      
      if (insertError.message.includes('auth_id')) {
        log.error('Missing auth_id column - you need to run the SQL manually')
        return {
          success: false,
          message: 'Missing database columns. Please run the SQL script in Supabase dashboard.',
          sqlFile: 'database-update.sql'
        }
      }
      
      if (insertError.message.includes('row-level security')) {
        log.error('RLS policy blocking - you need to update policies manually')
        return {
          success: false,
          message: 'Row-level security is blocking operations. Please run the SQL script in Supabase dashboard.',
          sqlFile: 'database-update.sql'
        }
      }
    } else {
      log.debug('Test insert successful - cleaning up')
      // Clean up test user
      await supabase
        .from('users')
        .delete()
        .eq('username', 'test_user_temp')
    }
    
    // Try to create/update the admin user
    log.debug('Step 2: Setting up admin user')
    
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
      log.error('Admin user creation error', { message: adminError.message })
      return {
        success: false,
        message: `Failed to create admin user: ${adminError.message}`
      }
    }
    
    log.success('Database setup completed successfully')
    
    return {
      success: true,
      message: 'Database setup completed. You can now try logging in with admin/password123'
    }
    
  } catch (error) {
    log.error('Database setup failed', error)
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