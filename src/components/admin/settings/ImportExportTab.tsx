/**
 * Import/Export Settings Tab
 * Allows users to backup, restore, and share settings configurations
 */

import React, { useState, useCallback } from 'react'
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClipboardIcon
} from '@heroicons/react/24/outline'
import { supabase } from '../../../lib/supabase'
import { SettingsCard } from './SettingsCard'
import { SettingsSection } from './SettingsSection'

interface ImportExportTabProps {
  className?: string
}

interface SettingsBackup {
  version: string
  timestamp: string
  settings: {
    business: any
    ui_theme: any
    system: any
    localization: any
    performance: any
  }
  metadata: {
    exported_by: string
    app_version: string
    total_settings: number
  }
}

export function ImportExportTab({
  className = ''
}: ImportExportTabProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [importData, setImportData] = useState<string>('')
  const [previewData, setPreviewData] = useState<SettingsBackup | null>(null)

  // Export all settings to JSON
  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true)
      setExportStatus('Gathering settings data...')

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Must be logged in to export settings')

      // Fetch all settings from different categories
      const categories = ['business', 'ui_theme', 'system', 'localization', 'performance']
      const allSettings: any = {}
      let totalSettings = 0

      for (const category of categories) {
        setExportStatus(`Exporting ${category} settings...`)
        
        const { data: categorySettings, error } = await supabase
          .from('app_settings')
          .select('key, value, description, data_type')
          .eq('category', category)

        if (error) {
          console.warn(`Failed to export ${category} settings:`, error)
          allSettings[category] = {}
        } else {
          // Convert to object format
          const settingsObj: any = {}
          categorySettings?.forEach(setting => {
            settingsObj[setting.key] = {
              value: setting.value,
              description: setting.description,
              data_type: setting.data_type
            }
          })
          allSettings[category] = settingsObj
          totalSettings += categorySettings?.length || 0
        }
      }

      // Create backup object
      const backup: SettingsBackup = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        settings: allSettings,
        metadata: {
          exported_by: user.id || 'Unknown User',
          app_version: '1.0.0',
          total_settings: totalSettings
        }
      }

      // Create and download file
      const dataStr = JSON.stringify(backup, null, 2)
      const blob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `parking-settings-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setExportStatus('Settings exported successfully!')
      setTimeout(() => setExportStatus(null), 5000)

    } catch (error) {
      console.error('Export failed:', error)
      setExportStatus(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTimeout(() => setExportStatus(null), 5000)
    } finally {
      setIsExporting(false)
    }
  }, [])

  // Preview imported settings
  const handlePreview = useCallback(() => {
    try {
      if (!importData.trim()) {
        setImportStatus('Please paste settings data first')
        return
      }

      const parsed = JSON.parse(importData) as SettingsBackup
      
      // Validate structure
      if (!parsed.version || !parsed.settings || !parsed.metadata) {
        throw new Error('Invalid settings file format')
      }

      setPreviewData(parsed)
      setImportStatus('Settings preview loaded successfully')
    } catch (error) {
      console.error('Preview failed:', error)
      setImportStatus(`Preview failed: ${error instanceof Error ? error.message : 'Invalid JSON'}`)
      setPreviewData(null)
    }
  }, [importData])

  // Import settings from JSON
  const handleImport = useCallback(async () => {
    try {
      if (!previewData) {
        setImportStatus('Please preview settings first')
        return
      }

      setIsImporting(true)
      setImportStatus('Starting import...')

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Must be logged in to import settings')

      const { data: userRecord } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single()

      const userId = userRecord?.id

      let totalImported = 0
      let totalErrors = 0

      // Import each category
      for (const [category, categorySettings] of Object.entries(previewData.settings)) {
        setImportStatus(`Importing ${category} settings...`)

        for (const [key, settingData] of Object.entries(categorySettings as any)) {
          try {
            const { error } = await supabase
              .from('app_settings')
              .upsert({
                category,
                key,
                value: settingData.value,
                data_type: settingData.data_type || 'string',
                description: settingData.description || '',
                scope: 'system',
                is_system_setting: true,
                created_by: userId,
                updated_by: userId
              }, {
                onConflict: 'category,key'
              })

            if (error) {
              console.warn(`Failed to import ${category}.${key}:`, error)
              totalErrors++
            } else {
              totalImported++
            }
          } catch (error) {
            console.warn(`Error importing ${category}.${key}:`, error)
            totalErrors++
          }
        }
      }

      setImportStatus(`Import completed! ${totalImported} settings imported, ${totalErrors} errors`)
      
      // Clear import data after successful import
      if (totalErrors === 0) {
        setImportData('')
        setPreviewData(null)
      }

      setTimeout(() => setImportStatus(null), 10000)

    } catch (error) {
      console.error('Import failed:', error)
      setImportStatus(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTimeout(() => setImportStatus(null), 5000)
    } finally {
      setIsImporting(false)
    }
  }, [previewData])

  // Copy settings to clipboard
  const handleCopyToClipboard = useCallback(async () => {
    try {
      if (!previewData) {
        setImportStatus('No settings to copy')
        return
      }

      await navigator.clipboard.writeText(JSON.stringify(previewData, null, 2))
      setImportStatus('Settings copied to clipboard!')
      setTimeout(() => setImportStatus(null), 3000)
    } catch (error) {
      setImportStatus('Failed to copy to clipboard')
      setTimeout(() => setImportStatus(null), 3000)
    }
  }, [previewData])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-2">
        <DocumentDuplicateIcon className="w-6 h-6 text-primary-600" />
        <h2 className="text-xl font-semibold text-gray-900">Import/Export Settings</h2>
      </div>

      {/* Export Settings */}
      <SettingsCard
        title="Export Settings"
        description="Download a backup of all your current settings"
        icon={ArrowDownTrayIcon}
      >
        <SettingsSection title="Create Backup">
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">What will be exported:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Business settings (vehicle rates, penalties, operating hours)</li>
                <li>• UI theme settings (colors, dark mode preferences)</li>
                <li>• System settings (API timeouts, performance budgets)</li>
                <li>• Localization settings (currency, timezone, formats)</li>
                <li>• Performance settings (monitoring thresholds)</li>
              </ul>
            </div>

            {exportStatus && (
              <div className={`rounded-md p-4 ${
                exportStatus.includes('failed') || exportStatus.includes('error')
                  ? 'bg-red-50 text-red-800'
                  : exportStatus.includes('successfully')
                  ? 'bg-green-50 text-green-800'
                  : 'bg-blue-50 text-blue-800'
              }`}>
                <div className="flex items-center">
                  {exportStatus.includes('successfully') ? (
                    <CheckCircleIcon className="w-5 h-5 mr-2" />
                  ) : exportStatus.includes('failed') ? (
                    <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
                  ) : (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  )}
                  <span className="text-sm">{exportStatus}</span>
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${
                  isExporting 
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                }`}
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                    Export Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </SettingsSection>
      </SettingsCard>

      {/* Import Settings */}
      <SettingsCard
        title="Import Settings"
        description="Restore settings from a backup file"
        icon={ArrowUpTrayIcon}
      >
        <SettingsSection title="Restore Backup">
          <div className="space-y-4">
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 mr-2" />
                <h4 className="text-sm font-medium text-amber-900">Important</h4>
              </div>
              <ul className="text-sm text-amber-800 mt-2 space-y-1">
                <li>• Importing will overwrite your current settings</li>
                <li>• Always export current settings before importing</li>
                <li>• Preview settings before importing to verify contents</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label htmlFor="settings-data" className="block text-sm font-medium text-gray-700">
                Settings Data (JSON)
              </label>
              <textarea
                id="settings-data"
                rows={8}
                className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm font-mono"
                placeholder="Paste your exported settings JSON here..."
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
              />
            </div>

            {importStatus && (
              <div className={`rounded-md p-4 ${
                importStatus.includes('failed') || importStatus.includes('error')
                  ? 'bg-red-50 text-red-800'
                  : importStatus.includes('successfully') || importStatus.includes('completed')
                  ? 'bg-green-50 text-green-800'
                  : 'bg-blue-50 text-blue-800'
              }`}>
                <div className="flex items-center">
                  {importStatus.includes('successfully') || importStatus.includes('completed') ? (
                    <CheckCircleIcon className="w-5 h-5 mr-2" />
                  ) : importStatus.includes('failed') ? (
                    <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
                  ) : (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  )}
                  <span className="text-sm">{importStatus}</span>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={handlePreview}
                disabled={!importData.trim()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Preview Settings
              </button>
              
              <button
                onClick={handleImport}
                disabled={!previewData || isImporting}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                  !previewData || isImporting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-success-600 hover:bg-success-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-success-500'
                }`}
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
                    Import Settings
                  </>
                )}
              </button>

              {previewData && (
                <button
                  onClick={handleCopyToClipboard}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <ClipboardIcon className="w-4 h-4 mr-2" />
                  Copy
                </button>
              )}
            </div>
          </div>
        </SettingsSection>

        {/* Preview Section */}
        {previewData && (
          <SettingsSection title="Settings Preview">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-900">Exported by:</span>
                  <span className="ml-2 text-gray-600">{previewData.metadata.exported_by}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Export date:</span>
                  <span className="ml-2 text-gray-600">
                    {new Date(previewData.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Total settings:</span>
                  <span className="ml-2 text-gray-600">{previewData.metadata.total_settings}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Version:</span>
                  <span className="ml-2 text-gray-600">{previewData.version}</span>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Categories included:</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(previewData.settings).map(([category, settings]) => (
                    <span
                      key={category}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                    >
                      {category} ({Object.keys(settings as any).length})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </SettingsSection>
        )}
      </SettingsCard>
    </div>
  )
}