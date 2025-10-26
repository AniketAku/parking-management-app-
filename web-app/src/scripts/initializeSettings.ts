/**
 * Settings Migration Initialization Script
 * Run this once after applying the database schema
 */

import { supabase } from '../lib/supabase'
import { runSettingsMigration } from '../services/settingsMigration'
import { log } from '../utils/secureLogger'

async function initializeSettings() {
  log.info('Initializing Settings Management System')
  
  try {
    // Check if database schema is applied
    const { data: tables, error: tableError } = await supabase
      .from('app_settings')
      .select('id')
      .limit(1)
    
    if (tableError) {
      log.error('Database schema not found. Please apply settings-schema.sql first')
      process.exit(1)
    }

    log.success('Database schema detected')
    
    // Run migrations to move hard-coded values to settings
    log.info('Running settings migrations')
    await runSettingsMigration()

    log.success('Settings system initialized successfully', {
      summary: [
        'Multi-level settings architecture applied',
        'Hard-coded values migrated to database',
        'Settings service layer activated',
        'Admin UI ready for configuration'
      ]
    })
    
  } catch (error) {
    log.error('Settings initialization failed', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  initializeSettings()
}

export { initializeSettings }