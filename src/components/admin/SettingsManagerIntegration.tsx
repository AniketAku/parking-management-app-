import React, { useState, useEffect } from 'react'
import { Settings, AlertCircle, CheckCircle, RefreshCw, Database } from 'lucide-react'
import { Button } from '../ui'
import { Card, CardHeader, CardContent } from '../ui'
import { AdvancedSettingsManager } from './AdvancedSettingsManager'
import { SettingsMigration } from '../../utils/settingsMigration'
import { useCentralizedSettings } from '../../hooks/useCentralizedSettings'
import { usePermissions } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

/**
 * Settings Manager Integration Component
 * Handles initialization, migration, and provides access to advanced settings management
 */

interface MigrationStatus {
  needed: boolean
  completed: boolean
  inProgress: boolean
  error: string | null
  lastChecked: Date | null
}

export const SettingsManagerIntegration: React.FC = () => {
  const { canManageSystemSettings } = usePermissions()
  const { 
    loading: settingsLoading, 
    error: settingsError, 
    refresh: refreshSettings,
    isSettingsLoaded
  } = useCentralizedSettings()
  
  const [showAdvancedManager, setShowAdvancedManager] = useState(false)
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>({
    needed: false,
    completed: false,
    inProgress: false,
    error: null,
    lastChecked: null
  })

  // Check migration status on component mount
  useEffect(() => {
    checkMigrationStatus()
  }, [])

  const checkMigrationStatus = async () => {
    try {
      setMigrationStatus(prev => ({ ...prev, inProgress: true, error: null }))
      
      const needed = await SettingsMigration.isMigrationNeeded()
      
      setMigrationStatus(prev => ({
        ...prev,
        needed,
        completed: !needed,
        inProgress: false,
        lastChecked: new Date()
      }))
      
      if (needed) {
        toast.error('Settings migration is required. Please run migration to use centralized settings.')
      } else {
        console.log('✅ Settings migration status: Up to date')
      }
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to check migration status'
      setMigrationStatus(prev => ({
        ...prev,
        error: message,
        inProgress: false
      }))
      console.error('❌ Migration status check failed:', error)
    }
  }

  const runMigration = async () => {
    if (!canManageSystemSettings) {
      toast.error('Insufficient permissions to run settings migration')
      return
    }

    try {
      setMigrationStatus(prev => ({ ...prev, inProgress: true, error: null }))
      
      // Create backup first
      toast.loading('Creating backup before migration...', { id: 'migration' })
      const backupKey = await SettingsMigration.backupCurrentSettings()
      
      // Run migration
      toast.loading('Running settings migration...', { id: 'migration' })
      await SettingsMigration.migrateLegacySettings()
      
      // Validate migration
      toast.loading('Validating migrated settings...', { id: 'migration' })
      const isValid = await SettingsMigration.validateMigratedSettings()
      
      if (isValid) {
        setMigrationStatus(prev => ({
          ...prev,
          needed: false,
          completed: true,
          inProgress: false,
          lastChecked: new Date()
        }))
        
        // Refresh settings to pick up new values
        await refreshSettings()
        
        toast.success(`Settings migration completed successfully! Backup created: ${backupKey}`, { 
          id: 'migration',
          duration: 5000
        })
      } else {
        throw new Error('Migration validation failed')
      }
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Migration failed'
      setMigrationStatus(prev => ({
        ...prev,
        error: message,
        inProgress: false
      }))
      toast.error(`Migration failed: ${message}`, { id: 'migration' })
    }
  }

  const handleOpenAdvancedManager = () => {
    if (!isSettingsLoaded && !migrationStatus.completed) {
      toast.error('Please run settings migration first')
      return
    }
    setShowAdvancedManager(true)
  }

  if (showAdvancedManager) {
    return (
      <AdvancedSettingsManager
        onClose={() => setShowAdvancedManager(false)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Settings Management
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage application configuration and settings
          </p>
        </div>
      </div>

      {/* Migration Status Card */}
      <Card className={`border-2 ${
        migrationStatus.error 
          ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
          : migrationStatus.needed 
          ? 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20'
          : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              migrationStatus.error 
                ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                : migrationStatus.needed 
                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
            }`}>
              {migrationStatus.error ? (
                <AlertCircle className="w-5 h-5" />
              ) : migrationStatus.needed ? (
                <Database className="w-5 h-5" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Settings Migration Status
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {migrationStatus.lastChecked && (
                  `Last checked: ${migrationStatus.lastChecked.toLocaleString()}`
                )}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status Information */}
            <div className="space-y-2">
              {migrationStatus.error && (
                <div className="text-red-700 dark:text-red-300">
                  <strong>Error:</strong> {migrationStatus.error}
                </div>
              )}
              
              {migrationStatus.needed && !migrationStatus.error && (
                <div className="text-orange-700 dark:text-orange-300">
                  <strong>Action Required:</strong> Settings migration is needed to centralize 
                  hard-coded configurations. This will move vehicle rates, validation rules, 
                  and other settings to the centralized management system.
                </div>
              )}
              
              {migrationStatus.completed && !migrationStatus.error && (
                <div className="text-green-700 dark:text-green-300">
                  <strong>Status:</strong> Settings migration is up to date. All configurations 
                  are centralized and ready for management.
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {migrationStatus.needed && canManageSystemSettings && (
                <Button
                  onClick={runMigration}
                  disabled={migrationStatus.inProgress}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {migrationStatus.inProgress ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Database className="w-4 h-4" />
                  )}
                  {migrationStatus.inProgress ? 'Running Migration...' : 'Run Migration'}
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={checkMigrationStatus}
                disabled={migrationStatus.inProgress}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${migrationStatus.inProgress ? 'animate-spin' : ''}`} />
                Refresh Status
              </Button>
              
              {!canManageSystemSettings && migrationStatus.needed && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Contact system administrator to run migration
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Management Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Advanced Settings Manager */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent 
            className="p-6 text-center"
            onClick={handleOpenAdvancedManager}
          >
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Settings className="w-6 h-6 text-blue-600 dark:text-blue-300" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Advanced Settings
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Comprehensive settings management with categories, search, and bulk editing
            </p>
            {!isSettingsLoaded && (
              <div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                Migration required
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings Status */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Current Status
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Settings Loading:</span>
                <span className={settingsLoading ? 'text-orange-600' : 'text-green-600'}>
                  {settingsLoading ? 'Loading...' : 'Ready'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Migration Status:</span>
                <span className={
                  migrationStatus.needed 
                    ? 'text-orange-600' 
                    : migrationStatus.completed 
                    ? 'text-green-600' 
                    : 'text-gray-600'
                }>
                  {migrationStatus.needed ? 'Required' : migrationStatus.completed ? 'Complete' : 'Checking...'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Configuration:</span>
                <span className={isSettingsLoaded ? 'text-green-600' : 'text-gray-600'}>
                  {isSettingsLoaded ? 'Centralized' : 'Legacy Mode'}
                </span>
              </div>
              {settingsError && (
                <div className="text-red-600 text-xs mt-2">
                  Error: {settingsError}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshSettings}
                disabled={settingsLoading}
                className="w-full flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${settingsLoading ? 'animate-spin' : ''}`} />
                Refresh Settings
              </Button>
              
              {canManageSystemSettings && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Future: Add settings export functionality
                    toast.info('Settings export coming soon')
                  }}
                  className="w-full"
                >
                  Export Configuration
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}