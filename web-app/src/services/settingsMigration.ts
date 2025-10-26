/**
 * Settings Migration Service
 * Safely migrates hard-coded values to centralized settings system
 */

import { supabase } from '../lib/supabase'
import { settingsService } from './settingsService'
import type { SettingsMigration, MigrationStatus } from '../types/settings'
import { log } from '../utils/secureLogger'

// Migration registry
const migrations: SettingsMigration[] = [
  {
    id: 'migrate_vehicle_rates',
    name: 'Migrate Vehicle Rates',
    description: 'Move hard-coded vehicle rates from helpers.ts to settings',
    version: '1.0.0',
    dependencies: [],
    up: async () => {
      // Migration logic for vehicle rates
      const hardcodedRates = {
        'Trailer': 225,
        '6 Wheeler': 150,
        '4 Wheeler': 100,
        '2 Wheeler': 50
      }
      
      await settingsService.setSetting('vehicle_rates', hardcodedRates)
    },
    down: async () => {
      // Rollback logic - reset to defaults
      await settingsService.resetSetting('vehicle_rates')
    }
  },
  {
    id: 'migrate_theme_colors',
    name: 'Migrate Theme Colors',
    description: 'Move Tailwind color definitions to theme settings',
    version: '1.0.0',
    dependencies: [],
    up: async () => {
      // Migration logic for theme colors from tailwind.config.js
      const themeColors = {
        primary_colors: {
          "50": "#f0f5ff",
          "100": "#e0eaff", 
          "200": "#c7d9ff",
          "300": "#a5c0ff",
          "400": "#8ba2ff",
          "500": "#2A5C8F",
          "600": "#1e4a7a",
          "700": "#1a3d63",
          "800": "#163050",
          "900": "#132740"
        },
        secondary_colors: {
          "50": "#f2f7ff",
          "100": "#e6efff",
          "200": "#d0e1ff", 
          "300": "#aec8ff",
          "400": "#8ba9ff",
          "500": "#3D7BB6",
          "600": "#2d6599",
          "700": "#26517a",
          "800": "#20425c",
          "900": "#1b3443"
        },
        vehicle_type_colors: {
          "Trailer": "bg-purple-100 text-purple-800",
          "6 Wheeler": "bg-blue-100 text-blue-800", 
          "4 Wheeler": "bg-green-100 text-green-800",
          "2 Wheeler": "bg-orange-100 text-orange-800"
        }
      }
      
      for (const [key, value] of Object.entries(themeColors)) {
        await settingsService.setSetting(key, value)
      }
    },
    down: async () => {
      const keys = ['primary_colors', 'secondary_colors', 'vehicle_type_colors']
      for (const key of keys) {
        await settingsService.resetSetting(key)
      }
    }
  },
  {
    id: 'migrate_validation_rules',
    name: 'Migrate Validation Rules',
    description: 'Move hard-coded validation patterns to settings',
    version: '1.0.0',
    dependencies: [],
    up: async () => {
      const validationSettings = {
        vehicle_number_patterns: [
          '/^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/',
          '/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$/'
        ],
        driver_name_min_length: 2,
        driver_name_max_length: 100,
        phone_number_pattern: '^[0-9]{10}$',
        transport_name_max_length: 200
      }
      
      for (const [key, value] of Object.entries(validationSettings)) {
        await settingsService.setSetting(key, value)
      }
    },
    down: async () => {
      const keys = [
        'vehicle_number_patterns',
        'driver_name_min_length', 
        'driver_name_max_length',
        'phone_number_pattern',
        'transport_name_max_length'
      ]
      for (const key of keys) {
        await settingsService.resetSetting(key)
      }
    }
  },
  {
    id: 'migrate_system_config',
    name: 'Migrate System Configuration',
    description: 'Move Supabase and system configs to settings',
    version: '1.0.0',
    dependencies: [],
    up: async () => {
      const systemSettings = {
        auto_refresh_token: true,
        realtime_events_per_second: 10,
        detect_session_in_url: true,
        api_timeout_ms: 30000,
        retry_attempts: 3,
        retry_delay_ms: 1000
      }
      
      for (const [key, value] of Object.entries(systemSettings)) {
        await settingsService.setSetting(key, value)
      }
    },
    down: async () => {
      const keys = [
        'auto_refresh_token',
        'realtime_events_per_second',
        'detect_session_in_url', 
        'api_timeout_ms',
        'retry_attempts',
        'retry_delay_ms'
      ]
      for (const key of keys) {
        await settingsService.resetSetting(key)
      }
    }
  },
  {
    id: 'migrate_performance_budgets',
    name: 'Migrate Performance Settings',
    description: 'Move performance thresholds from performance.ts to settings',
    version: '1.0.0',
    dependencies: [],
    up: async () => {
      const performanceSettings = {
        lcp_budget_ms: 2500,
        fid_budget_ms: 100,
        cls_budget: 0.1,
        fcp_budget_ms: 1800,
        ttfb_budget_ms: 600,
        bundle_size_budget_kb: 500,
        memory_usage_budget_mb: 100,
        accessibility_score_min: 95
      }
      
      for (const [key, value] of Object.entries(performanceSettings)) {
        await settingsService.setSetting(key, value)
      }
    },
    down: async () => {
      const keys = [
        'lcp_budget_ms',
        'fid_budget_ms',
        'cls_budget',
        'fcp_budget_ms',
        'ttfb_budget_ms',
        'bundle_size_budget_kb',
        'memory_usage_budget_mb',
        'accessibility_score_min'
      ]
      for (const key of keys) {
        await settingsService.resetSetting(key)
      }
    }
  }
]

class SettingsMigrationService {
  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<MigrationStatus[]> {
    const results: MigrationStatus[] = []
    
    // Get applied migrations
    const { data: appliedMigrations } = await supabase
      .from('migration_status')
      .select('migration_id')
    
    const appliedIds = new Set(appliedMigrations?.map(m => m.migration_id) || [])
    
    // Run pending migrations in dependency order
    const sortedMigrations = this.sortMigrationsByDependencies(migrations)
    
    for (const migration of sortedMigrations) {
      if (appliedIds.has(migration.id)) {
        log.info('Migration already applied, skipping', { migrationId: migration.id })
        continue
      }
      
      try {
        log.info('Running migration', { migrationId: migration.id, name: migration.name })
        await migration.up()
        
        // Record successful migration
        await this.recordMigration(migration.id, true)
        
        results.push({
          migration_id: migration.id,
          applied_at: new Date().toISOString(),
          success: true
        })
        
        log.success('Migration completed successfully', { migrationId: migration.id })
      } catch (error) {
        log.error('Migration failed', { migrationId: migration.id, error })
        
        // Record failed migration
        await this.recordMigration(migration.id, false, error instanceof Error ? error.message : 'Unknown error')
        
        results.push({
          migration_id: migration.id,
          applied_at: new Date().toISOString(),
          success: false,
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        
        // Stop on first failure
        break
      }
    }
    
    return results
  }
  
  /**
   * Rollback a specific migration
   */
  async rollbackMigration(migrationId: string): Promise<boolean> {
    const migration = migrations.find(m => m.id === migrationId)
    if (!migration) {
      throw new Error(`Migration ${migrationId} not found`)
    }
    
    try {
      log.info('Rolling back migration', { migrationId, name: migration.name })
      await migration.down()
      
      // Remove migration record
      await supabase
        .from('migration_status')
        .delete()
        .eq('migration_id', migrationId)
      
      log.success('Migration rolled back successfully', { migrationId })
      return true
    } catch (error) {
      log.error('Failed to rollback migration', { migrationId, error })
      return false
    }
  }
  
  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<{
    applied: MigrationStatus[]
    pending: SettingsMigration[]
    total: number
  }> {
    const { data: appliedMigrations } = await supabase
      .from('migration_status')
      .select('*')
      .order('applied_at')
    
    const appliedIds = new Set(appliedMigrations?.map(m => m.migration_id) || [])
    const pendingMigrations = migrations.filter(m => !appliedIds.has(m.id))
    
    return {
      applied: appliedMigrations || [],
      pending: pendingMigrations,
      total: migrations.length
    }
  }
  
  /**
   * Check if all migrations are applied
   */
  async isFullyMigrated(): Promise<boolean> {
    const status = await this.getMigrationStatus()
    return status.pending.length === 0
  }
  
  /**
   * Create migration status table if it doesn't exist
   */
  async initializeMigrationTable(): Promise<void> {
    const { error } = await supabase.rpc('create_migration_table_if_not_exists')
    if (error) {
      log.error('Failed to initialize migration table', error)
      throw error
    }
  }
  
  /**
   * Migrate specific settings category
   */
  async migrateCategorySettings(category: string): Promise<void> {
    const categoryMigrations = migrations.filter(m => m.id.includes(category))
    
    for (const migration of categoryMigrations) {
      try {
        await migration.up()
        await this.recordMigration(migration.id, true)
        log.success('Category migration completed', { migrationId: migration.id })
      } catch (error) {
        log.error('Category migration failed', { migrationId: migration.id, error })
        throw error
      }
    }
  }
  
  /**
   * Generate migration script for manual execution
   */
  generateMigrationScript(): string {
    let script = '-- Settings Migration Script\n-- Run this script to migrate hard-coded values to settings\n\n'
    
    script += 'BEGIN;\n\n'
    
    // Add each setting
    migrations.forEach(migration => {
      script += `-- Migration: ${migration.name}\n`
      script += `-- Description: ${migration.description}\n`
      script += `-- Version: ${migration.version}\n\n`
      
      // This would contain the actual SQL for each migration
      // For now, we'll just add a comment
      script += `-- Execute migration: ${migration.id}\n`
      script += `-- (Implementation would include actual SQL statements)\n\n`
    })
    
    script += 'COMMIT;\n'
    
    return script
  }
  
  /**
   * Validate migration integrity
   */
  async validateMigrations(): Promise<{
    valid: boolean
    issues: string[]
  }> {
    const issues: string[] = []
    
    // Check for duplicate migration IDs
    const ids = migrations.map(m => m.id)
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
    if (duplicates.length > 0) {
      issues.push(`Duplicate migration IDs: ${duplicates.join(', ')}`)
    }
    
    // Check for circular dependencies
    const hasCycles = this.detectCircularDependencies(migrations)
    if (hasCycles) {
      issues.push('Circular dependencies detected in migrations')
    }
    
    // Validate migration functions
    for (const migration of migrations) {
      if (typeof migration.up !== 'function') {
        issues.push(`Migration ${migration.id} missing up function`)
      }
      if (typeof migration.down !== 'function') {
        issues.push(`Migration ${migration.id} missing down function`)
      }
    }
    
    return {
      valid: issues.length === 0,
      issues
    }
  }
  
  /**
   * Export current settings for backup
   */
  async createBackup(): Promise<string> {
    try {
      const backup = await settingsService.exportSettings()
      return JSON.stringify(backup, null, 2)
    } catch (error) {
      log.error('Failed to create settings backup', error)
      throw error
    }
  }
  
  // Private helper methods
  
  private sortMigrationsByDependencies(migrations: SettingsMigration[]): SettingsMigration[] {
    const sorted: SettingsMigration[] = []
    const visited = new Set<string>()
    const visiting = new Set<string>()
    
    const visit = (migration: SettingsMigration) => {
      if (visiting.has(migration.id)) {
        throw new Error(`Circular dependency detected involving ${migration.id}`)
      }
      
      if (visited.has(migration.id)) {
        return
      }
      
      visiting.add(migration.id)
      
      // Visit dependencies first
      for (const depId of migration.dependencies) {
        const dep = migrations.find(m => m.id === depId)
        if (dep) {
          visit(dep)
        }
      }
      
      visiting.delete(migration.id)
      visited.add(migration.id)
      sorted.push(migration)
    }
    
    for (const migration of migrations) {
      visit(migration)
    }
    
    return sorted
  }
  
  private detectCircularDependencies(migrations: SettingsMigration[]): boolean {
    const visited = new Set<string>()
    const visiting = new Set<string>()
    
    const hasCycle = (migrationId: string): boolean => {
      if (visiting.has(migrationId)) {
        return true
      }
      
      if (visited.has(migrationId)) {
        return false
      }
      
      visiting.add(migrationId)
      
      const migration = migrations.find(m => m.id === migrationId)
      if (migration) {
        for (const depId of migration.dependencies) {
          if (hasCycle(depId)) {
            return true
          }
        }
      }
      
      visiting.delete(migrationId)
      visited.add(migrationId)
      return false
    }
    
    for (const migration of migrations) {
      if (hasCycle(migration.id)) {
        return true
      }
    }
    
    return false
  }
  
  private async recordMigration(migrationId: string, success: boolean, errorMessage?: string): Promise<void> {
    await supabase
      .from('migration_status')
      .upsert({
        migration_id: migrationId,
        applied_at: new Date().toISOString(),
        success,
        error_message: errorMessage
      })
  }
}

// Export singleton instance
export const settingsMigrationService = new SettingsMigrationService()
export default settingsMigrationService

// Helper function to create migration status table
export const createMigrationStatusTable = async () => {
  const { error } = await supabase.rpc('execute_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS migration_status (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        migration_id VARCHAR(100) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        success BOOLEAN NOT NULL DEFAULT true,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_migration_status_id ON migration_status(migration_id);
      CREATE INDEX IF NOT EXISTS idx_migration_status_applied ON migration_status(applied_at);
    `
  })
  
  if (error) {
    log.error('Failed to create migration status table', error)
    throw error
  }
}

// Migration runner utility
export const runSettingsMigration = async (): Promise<void> => {
  try {
    log.info('Starting settings migration')
    
    // Initialize migration table
    await settingsMigrationService.initializeMigrationTable()
    
    // Validate migrations
    const validation = await settingsMigrationService.validateMigrations()
    if (!validation.valid) {
      throw new Error(`Migration validation failed: ${validation.issues.join(', ')}`)
    }
    
    // Create backup
    log.info('Creating settings backup')
    const backup = await settingsMigrationService.createBackup()
    log.success('Backup created successfully')
    
    // Run migrations
    const results = await settingsMigrationService.runMigrations()
    
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    
    log.info('Migration completed', { successful, failed })
    
    if (failed > 0) {
      log.error('Some migrations failed. Check logs for details.')
      const failedMigrations = results.filter(r => !r.success)
      failedMigrations.forEach(result => {
        log.error('Failed migration', { migrationId: result.migration_id, errorMessage: result.error_message })
      })
    }
    
    const status = await settingsMigrationService.getMigrationStatus()
    log.info('Migration status', { applied: status.applied.length, total: status.total })
    
  } catch (error) {
    log.error('Settings migration failed', error)
    throw error
  }
}