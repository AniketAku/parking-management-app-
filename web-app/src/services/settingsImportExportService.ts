/**
 * Settings Import/Export Service
 * Handles configuration backup, restore, versioning, and migration
 */

import { validateAllSettings } from './settingsValidationService'
import type { 
  AllSettings, 
  SettingsExportData, 
  SettingsImportOptions, 
  SettingCategory,
  ValidationResult,
  SettingsVersion,
  SettingsMigration 
} from '../types/settings'

// Current schema version
const CURRENT_SCHEMA_VERSION = '1.0.0'

// Export format metadata
interface ExportMetadata {
  version: string
  exportDate: string
  appVersion: string
  exportedBy: string
  categories: SettingCategory[]
  checksum: string
}

// Complete export data structure
interface CompleteExportData {
  metadata: ExportMetadata
  settings: Partial<AllSettings>
  schema: {
    version: string
    migrations: SettingsMigration[]
  }
}

// Import result with detailed feedback
interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
  warnings: string[]
  validation: ValidationResult
  appliedMigrations: string[]
}

/**
 * Settings Import/Export Service
 */
class SettingsImportExportService {
  /**
   * Export settings to JSON format
   */
  async exportSettings(options: {
    categories?: SettingCategory[]
    includeUserSettings?: boolean
    includeLocationSettings?: boolean
    includeSystemSettings?: boolean
  } = {}): Promise<SettingsExportData> {
    try {
      // Get current settings (in a real app, this would come from your state/API)
      const allSettings = await this.getCurrentSettings()
      
      // Filter categories based on options
      const categoriesToExport = options.categories || Object.keys(allSettings) as SettingCategory[]
      const filteredSettings: Partial<AllSettings> = {}
      
      categoriesToExport.forEach(category => {
        if (allSettings[category]) {
          filteredSettings[category] = allSettings[category]
        }
      })
      
      // Apply scope filters
      if (!options.includeUserSettings) {
        // Remove user-specific settings
        Object.keys(filteredSettings).forEach(key => {
          const category = filteredSettings[key as SettingCategory]
          if (category) {
            Object.keys(category).forEach(settingKey => {
              const setting = category[settingKey]
              if (setting.scope === 'user') {
                delete category[settingKey]
              }
            })
          }
        })
      }
      
      if (!options.includeSystemSettings) {
        // Remove system-specific settings
        Object.keys(filteredSettings).forEach(key => {
          const category = filteredSettings[key as SettingCategory]
          if (category) {
            Object.keys(category).forEach(settingKey => {
              const setting = category[settingKey]
              if (setting.scope === 'system') {
                delete category[settingKey]
              }
            })
          }
        })
      }
      
      // Create export metadata
      const metadata: ExportMetadata = {
        version: CURRENT_SCHEMA_VERSION,
        exportDate: new Date().toISOString(),
        appVersion: await this.getAppVersion(),
        exportedBy: await this.getCurrentUser(),
        categories: categoriesToExport,
        checksum: await this.calculateChecksum(filteredSettings)
      }
      
      // Create complete export data
      const exportData: CompleteExportData = {
        metadata,
        settings: filteredSettings,
        schema: {
          version: CURRENT_SCHEMA_VERSION,
          migrations: this.getAvailableMigrations()
        }
      }
      
      return {
        data: JSON.stringify(exportData, null, 2),
        filename: `parking-settings-${new Date().toISOString().split('T')[0]}.json`,
        metadata: {
          categories: categoriesToExport,
          settingsCount: this.countSettings(filteredSettings),
          size: JSON.stringify(exportData).length
        }
      }
    } catch (error) {
      throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Import settings from JSON data
   */
  async importSettings(
    fileContent: string,
    options: SettingsImportOptions = {
      overwrite_existing: false,
      validate_only: false,
      ignore_system_settings: false,
      target_scope: 'system'
    }
  ): Promise<ImportResult> {
    try {
      // Parse and validate JSON
      let importData: CompleteExportData
      try {
        importData = JSON.parse(fileContent)
      } catch (error) {
        throw new Error('Invalid JSON format')
      }
      
      // Validate export structure
      if (!importData.metadata || !importData.settings) {
        throw new Error('Invalid export file structure')
      }
      
      // Check version compatibility and apply migrations if needed
      const migrationResult = await this.applyMigrations(importData)
      if (!migrationResult.success) {
        throw new Error(`Migration failed: ${migrationResult.errors.join(', ')}`)
      }
      
      // Verify checksum if available
      if (importData.metadata.checksum) {
        const calculatedChecksum = await this.calculateChecksum(importData.settings)
        if (calculatedChecksum !== importData.metadata.checksum) {
          console.warn('Checksum mismatch - file may be corrupted or modified')
        }
      }
      
      // Validate imported settings
      const validationResult = await validateAllSettings(importData.settings)
      
      if (options.validate_only) {
        return {
          success: validationResult.isValid,
          imported: 0,
          skipped: 0,
          errors: validationResult.issues
            .filter(i => i.severity === 'error')
            .map(i => i.message),
          warnings: validationResult.issues
            .filter(i => i.severity === 'warning')
            .map(i => i.message),
          validation: validationResult,
          appliedMigrations: migrationResult.appliedMigrations
        }
      }
      
      // Apply import filters
      const filteredSettings = this.applyImportFilters(importData.settings, options)
      
      // Import settings
      let imported = 0
      let skipped = 0
      const errors: string[] = []
      const warnings: string[] = []
      
      for (const [categoryKey, categorySettings] of Object.entries(filteredSettings)) {
        const category = categoryKey as SettingCategory
        
        if (!categorySettings) continue
        
        for (const [settingKey, setting] of Object.entries(categorySettings)) {
          try {
            const shouldImport = await this.shouldImportSetting(
              category,
              settingKey,
              setting,
              options
            )
            
            if (shouldImport.import) {
              await this.updateSetting(category, settingKey, setting.value)
              imported++
            } else {
              skipped++
              if (shouldImport.reason) {
                warnings.push(`Skipped ${category}.${settingKey}: ${shouldImport.reason}`)
              }
            }
          } catch (error) {
            errors.push(`Failed to import ${category}.${settingKey}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      }
      
      // Final validation after import
      const currentSettings = await this.getCurrentSettings()
      const finalValidation = await validateAllSettings(currentSettings)
      
      return {
        success: errors.length === 0,
        imported,
        skipped,
        errors,
        warnings,
        validation: finalValidation,
        appliedMigrations: migrationResult.appliedMigrations
      }
    } catch (error) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        validation: { isValid: false, issues: [] },
        appliedMigrations: []
      }
    }
  }
  
  /**
   * Create settings backup
   */
  async createBackup(reason = 'Manual backup'): Promise<string> {
    const exportResult = await this.exportSettings({
      includeUserSettings: true,
      includeLocationSettings: true,
      includeSystemSettings: true
    })
    
    const backupId = `backup-${Date.now()}`
    const backupData = {
      id: backupId,
      reason,
      timestamp: new Date().toISOString(),
      data: exportResult.data
    }
    
    // Store backup (in a real app, this would go to persistent storage)
    await this.storeBackup(backupId, backupData)
    
    return backupId
  }
  
  /**
   * Restore from backup
   */
  async restoreBackup(backupId: string): Promise<ImportResult> {
    const backup = await this.getBackup(backupId)
    if (!backup) {
      throw new Error('Backup not found')
    }
    
    return this.importSettings(backup.data, {
      overwrite_existing: true,
      validate_only: false,
      ignore_system_settings: false,
      target_scope: 'system'
    })
  }
  
  /**
   * List available backups
   */
  async listBackups(): Promise<Array<{
    id: string
    reason: string
    timestamp: string
    size: number
  }>> {
    // In a real app, this would query your backup storage
    return []
  }
  
  /**
   * Apply schema migrations
   */
  private async applyMigrations(importData: CompleteExportData): Promise<{
    success: boolean
    errors: string[]
    appliedMigrations: string[]
  }> {
    const appliedMigrations: string[] = []
    const errors: string[] = []
    
    try {
      const sourceVersion = importData.metadata.version || '0.0.0'
      const targetVersion = CURRENT_SCHEMA_VERSION
      
      if (sourceVersion === targetVersion) {
        return { success: true, errors: [], appliedMigrations: [] }
      }
      
      const migrations = this.getMigrationsForVersion(sourceVersion, targetVersion)
      
      for (const migration of migrations) {
        try {
          await this.applyMigration(migration, importData)
          appliedMigrations.push(migration.id)
        } catch (error) {
          errors.push(`Migration ${migration.id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
      
      return {
        success: errors.length === 0,
        errors,
        appliedMigrations
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Migration system error'],
        appliedMigrations
      }
    }
  }
  
  /**
   * Apply import filters based on options
   */
  private applyImportFilters(
    settings: Partial<AllSettings>,
    options: SettingsImportOptions
  ): Partial<AllSettings> {
    const filtered = { ...settings }
    
    if (options.ignore_system_settings) {
      Object.keys(filtered).forEach(categoryKey => {
        const category = filtered[categoryKey as SettingCategory]
        if (category) {
          Object.keys(category).forEach(settingKey => {
            if (category[settingKey].scope === 'system') {
              delete category[settingKey]
            }
          })
        }
      })
    }
    
    return filtered
  }
  
  /**
   * Determine if a setting should be imported
   */
  private async shouldImportSetting(
    category: SettingCategory,
    key: string,
    setting: any,
    options: SettingsImportOptions
  ): Promise<{ import: boolean; reason?: string }> {
    // Check if setting already exists
    const existingSetting = await this.getExistingSetting(category, key)
    
    if (existingSetting && !options.overwrite_existing) {
      return {
        import: false,
        reason: 'Setting exists and overwrite is disabled'
      }
    }
    
    // Check scope compatibility
    if (setting.scope === 'system' && options.target_scope === 'user') {
      return {
        import: false,
        reason: 'Cannot import system setting to user scope'
      }
    }
    
    return { import: true }
  }
  
  /**
   * Helper methods (would be implemented based on your actual data layer)
   */
  private async getCurrentSettings(): Promise<AllSettings> {
    // Implementation would fetch from your state management/API
    throw new Error('getCurrentSettings not implemented')
  }
  
  private async updateSetting(category: SettingCategory, key: string, value: any): Promise<void> {
    // Implementation would update your state management/API
    throw new Error('updateSetting not implemented')
  }
  
  private async getExistingSetting(category: SettingCategory, key: string): Promise<any> {
    // Implementation would fetch from your state management/API
    return null
  }
  
  private async getAppVersion(): Promise<string> {
    return '1.0.0'
  }
  
  private async getCurrentUser(): Promise<string> {
    return 'system'
  }
  
  private async calculateChecksum(data: any): Promise<string> {
    // Simple checksum implementation
    const str = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16)
  }
  
  private countSettings(settings: Partial<AllSettings>): number {
    let count = 0
    Object.values(settings).forEach(category => {
      if (category) {
        count += Object.keys(category).length
      }
    })
    return count
  }
  
  private getAvailableMigrations(): SettingsMigration[] {
    return [
      {
        id: 'v1.0.0-vehicle-rates-restructure',
        fromVersion: '0.9.0',
        toVersion: '1.0.0',
        description: 'Restructure vehicle rates format',
        apply: async (data) => {
          // Migration logic would go here
        }
      }
    ]
  }
  
  private getMigrationsForVersion(from: string, to: string): SettingsMigration[] {
    // Implementation would return applicable migrations
    return []
  }
  
  private async applyMigration(migration: SettingsMigration, data: CompleteExportData): Promise<void> {
    await migration.apply(data)
  }
  
  private async storeBackup(id: string, data: any): Promise<void> {
    // Implementation would store to persistent storage
    localStorage.setItem(`backup-${id}`, JSON.stringify(data))
  }
  
  private async getBackup(id: string): Promise<any> {
    const stored = localStorage.getItem(`backup-${id}`)
    return stored ? JSON.parse(stored) : null
  }
}

// Export singleton instance
export const settingsImportExportService = new SettingsImportExportService()

// Export individual functions for convenience
export const exportSettings = settingsImportExportService.exportSettings.bind(settingsImportExportService)
export const importSettings = settingsImportExportService.importSettings.bind(settingsImportExportService)
export const createBackup = settingsImportExportService.createBackup.bind(settingsImportExportService)
export const restoreBackup = settingsImportExportService.restoreBackup.bind(settingsImportExportService)
export const listBackups = settingsImportExportService.listBackups.bind(settingsImportExportService)

export default settingsImportExportService