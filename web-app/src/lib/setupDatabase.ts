import { supabase } from './supabase'
import { log } from '../utils/secureLogger'

/**
 * Database setup utility to create missing tables and columns
 */
export class DatabaseSetup {
  /**
   * Add missing columns to the users table
   */
  static async addMissingColumns(): Promise<{ success: boolean; message: string }> {
    try {
      log.info('Adding missing columns to users table')

      // Try to add the is_approved column
      const { error: approvedError } = await supabase.rpc('add_is_approved_column')

      if (approvedError && !approvedError.message.includes('already exists')) {
        log.warn('Could not add is_approved column via RPC', { error: approvedError.message })
      }
      
      // Test if the column now exists by trying to insert a test record
      const testId = 'test-column-check-' + Date.now()
      const { error: testError } = await supabase
        .from('users')
        .insert({
          id: testId,
          username: 'column_test_user',
          email: 'test@columncheck.com',
          role: 'operator',
          is_approved: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
      
      if (testError) {
        if (testError.message.includes('is_approved')) {
          return {
            success: false,
            message: 'The is_approved column still does not exist. Please add it manually in Supabase dashboard: ALTER TABLE users ADD COLUMN is_approved BOOLEAN NOT NULL DEFAULT false;'
          }
        }
        // Other error, but column might exist - try to clean up
        await supabase.from('users').delete().eq('id', testId)
        return {
          success: false,
          message: testError.message
        }
      }
      
      // Clean up test record
      await supabase.from('users').delete().eq('id', testId)
      
      return {
        success: true,
        message: 'All required columns exist in users table'
      }
    } catch (error) {
      log.error('Database setup error', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Database setup failed'
      }
    }
  }
  
  /**
   * Create admin user with simplified approach
   */
  static async createAdminUser(username: string, email: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      // First, ensure the database schema is correct
      const schemaCheck = await this.addMissingColumns()
      if (!schemaCheck.success) {
        return schemaCheck
      }
      
      log.info('Creating admin user with email', { email })
      
      // 1. Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: 'System Administrator',
          }
        }
      })
      
      if (authError) {
        if (authError.message.includes('already registered')) {
          return {
            success: false,
            message: 'Admin user already exists with this email'
          }
        }
        throw new Error(`Failed to create admin auth user: ${authError.message}`)
      }
      
      if (!authData.user) {
        throw new Error('Failed to create admin account')
      }
      
      // 2. Create admin profile in our users table
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          username,
          email,
          role: 'admin',
          full_name: 'System Administrator',
          is_approved: true, // Admin is pre-approved
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      
      if (profileError) {
        log.error('Profile creation error', profileError)
        // Try to clean up auth user
        try {
          await supabase.auth.admin.deleteUser(authData.user.id)
        } catch (cleanupError) {
          log.warn('Could not clean up auth user', cleanupError)
        }
        throw new Error(`Failed to create admin profile: ${profileError.message}`)
      }
      
      return {
        success: true,
        message: 'Admin user created successfully!'
      }
    } catch (error) {
      log.error('Admin creation error', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create admin user'
      }
    }
  }
  
  /**
   * Initialize the database and create admin user
   */
  static async initialize(): Promise<{ success: boolean; message: string }> {
    try {
      // Check if admin user already exists
      const { data: existingAdmin } = await supabase
        .from('users')
        .select('id, username, email')
        .eq('role', 'admin')
        .limit(1)
        .single()
      
      if (existingAdmin) {
        log.info('Admin user already exists', { username: existingAdmin.username })
        return {
          success: true,
          message: `Admin user already exists: ${existingAdmin.username}`
        }
      }

      // Create admin user
      log.info('No admin user found, creating one')
      return await this.createAdminUser('Aniket@123', 'aniketawachat74@gmail.com', '12345678')
    } catch (error) {
      log.error('Database initialization error', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Database initialization failed'
      }
    }
  }
}