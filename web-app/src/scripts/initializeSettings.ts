/**
 * Settings Migration Initialization Script
 * Run this once after applying the database schema
 */

import { supabase } from '../lib/supabase'
import { runSettingsMigration } from '../services/settingsMigration'

async function initializeSettings() {
  console.log('🚀 Initializing Settings Management System...')
  
  try {
    // Check if database schema is applied
    const { data: tables, error: tableError } = await supabase
      .from('app_settings')
      .select('id')
      .limit(1)
    
    if (tableError) {
      console.error('❌ Database schema not found. Please apply settings-schema.sql first.')
      process.exit(1)
    }
    
    console.log('✅ Database schema detected')
    
    // Run migrations to move hard-coded values to settings
    console.log('🔄 Running settings migrations...')
    await runSettingsMigration()
    
    console.log('✅ Settings system initialized successfully!')
    console.log('📋 Summary:')
    console.log('  - Multi-level settings architecture applied')
    console.log('  - Hard-coded values migrated to database')
    console.log('  - Settings service layer activated')
    console.log('  - Admin UI ready for configuration')
    
  } catch (error) {
    console.error('❌ Settings initialization failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  initializeSettings()
}

export { initializeSettings }