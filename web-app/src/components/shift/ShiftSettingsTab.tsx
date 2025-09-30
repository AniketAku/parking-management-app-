import React, { useState, useCallback, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ShiftLinkingState, ShiftLinkingMetrics } from '../../hooks/useShiftLinking'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import toast from 'react-hot-toast'

interface ShiftSettingsTabProps {
  linkingState: ShiftLinkingState
  linkingMetrics: ShiftLinkingMetrics
  onRefresh: () => Promise<void>
  isLoading: boolean
}

interface ShiftSettings {
  // Shift Management
  autoLinkSessions: boolean
  autoLinkPayments: boolean
  requireStartingCash: boolean
  requireEndingCash: boolean
  allowEmergencyEnd: boolean

  // Notifications
  notifyShiftStart: boolean
  notifyShiftEnd: boolean
  notifyHandover: boolean
  notifyLowCash: boolean
  lowCashThreshold: number

  // Reporting
  autoGenerateReports: boolean
  reportFormat: 'pdf' | 'excel' | 'csv'
  includeAnalytics: boolean
  includeCashReconciliation: boolean
  includeVehicleActivity: boolean

  // Cache & Performance
  enableCaching: boolean
  cacheTimeout: number
  maxCacheSize: number

  // Advanced Settings
  shiftTimeout: number
  handoverGracePeriod: number
  maxShiftDuration: number
  minimumShiftDuration: number
}

const defaultSettings: ShiftSettings = {
  // Shift Management
  autoLinkSessions: true,
  autoLinkPayments: true,
  requireStartingCash: true,
  requireEndingCash: true,
  allowEmergencyEnd: true,

  // Notifications
  notifyShiftStart: true,
  notifyShiftEnd: true,
  notifyHandover: true,
  notifyLowCash: false,
  lowCashThreshold: 1000,

  // Reporting
  autoGenerateReports: false,
  reportFormat: 'pdf',
  includeAnalytics: true,
  includeCashReconciliation: true,
  includeVehicleActivity: false,

  // Cache & Performance
  enableCaching: true,
  cacheTimeout: 300, // 5 minutes
  maxCacheSize: 1000,

  // Advanced Settings
  shiftTimeout: 43200, // 12 hours
  handoverGracePeriod: 300, // 5 minutes
  maxShiftDuration: 86400, // 24 hours
  minimumShiftDuration: 1800 // 30 minutes
}

export const ShiftSettingsTab: React.FC<ShiftSettingsTabProps> = ({
  linkingState,
  linkingMetrics,
  onRefresh,
  isLoading
}) => {
  const [settings, setSettings] = useState<ShiftSettings>(defaultSettings)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Load settings from localStorage or database
  const loadSettings = useCallback(async () => {
    try {
      setSettingsLoading(true)

      // Try to load from localStorage first
      const localSettings = localStorage.getItem('shiftSettings')
      if (localSettings) {
        const parsed = JSON.parse(localSettings)
        setSettings({ ...defaultSettings, ...parsed })
      }

      // TODO: Load from database if user-specific settings are implemented
      // For now, we'll use localStorage as the storage mechanism

    } catch (error) {
      console.error('Failed to load settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setSettingsLoading(false)
    }
  }, [])

  // Save settings to localStorage
  const saveSettings = useCallback(async () => {
    try {
      setSaving(true)

      // Save to localStorage
      localStorage.setItem('shiftSettings', JSON.stringify(settings))

      // TODO: Save to database if user-specific settings are implemented

      toast.success('Settings saved successfully')
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }, [settings])

  // Reset to default settings
  const resetSettings = useCallback(() => {
    setSettings(defaultSettings)
    setHasUnsavedChanges(true)
    toast.info('Settings reset to defaults')
  }, [])

  // Handle setting changes
  const updateSetting = useCallback(<K extends keyof ShiftSettings>(
    key: K,
    value: ShiftSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasUnsavedChanges(true)
  }, [])

  // Load settings on component mount
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Test notification function
  const testNotification = useCallback(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Shift Management Test', {
          body: 'Notifications are working correctly!',
          icon: '/favicon.ico'
        })
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('Shift Management Test', {
              body: 'Notifications are now enabled!',
              icon: '/favicon.ico'
            })
          }
        })
      } else {
        toast.error('Notifications are blocked. Please enable them in your browser settings.')
      }
    } else {
      toast.error('Notifications are not supported in this browser.')
    }
  }, [])

  // Clear cache function
  const clearCache = useCallback(async () => {
    try {
      // Clear localStorage cache items
      const keys = Object.keys(localStorage).filter(key =>
        key.startsWith('shift_cache_') || key.startsWith('parking_cache_')
      )

      keys.forEach(key => localStorage.removeItem(key))

      // Refresh data
      await onRefresh()

      toast.success(`Cleared ${keys.length} cache items`)
    } catch (error) {
      console.error('Failed to clear cache:', error)
      toast.error('Failed to clear cache')
    }
  }, [onRefresh])

  if (isLoading || settingsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Shift Settings</h2>
        <div className="flex space-x-3">
          {hasUnsavedChanges && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
              Unsaved Changes
            </span>
          )}
          <Button onClick={resetSettings} variant="secondary" disabled={saving}>
            Reset Defaults
          </Button>
          <Button onClick={saveSettings} disabled={saving || !hasUnsavedChanges}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* Shift Management Settings */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-900">Shift Management</h3>
          <p className="text-sm text-gray-600">Configure how shifts are managed and linked</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.autoLinkSessions}
                  onChange={(e) => updateSetting('autoLinkSessions', e.target.checked)}
                  className="mr-3"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Auto-Link Sessions</span>
                  <p className="text-xs text-gray-600">Automatically link parking sessions to active shift</p>
                </div>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.autoLinkPayments}
                  onChange={(e) => updateSetting('autoLinkPayments', e.target.checked)}
                  className="mr-3"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Auto-Link Payments</span>
                  <p className="text-xs text-gray-600">Automatically link payments to active shift</p>
                </div>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.requireStartingCash}
                  onChange={(e) => updateSetting('requireStartingCash', e.target.checked)}
                  className="mr-3"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Require Starting Cash</span>
                  <p className="text-xs text-gray-600">Make starting cash amount mandatory</p>
                </div>
              </label>
            </div>

            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.requireEndingCash}
                  onChange={(e) => updateSetting('requireEndingCash', e.target.checked)}
                  className="mr-3"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Require Ending Cash</span>
                  <p className="text-xs text-gray-600">Make ending cash amount mandatory</p>
                </div>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.allowEmergencyEnd}
                  onChange={(e) => updateSetting('allowEmergencyEnd', e.target.checked)}
                  className="mr-3"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Allow Emergency End</span>
                  <p className="text-xs text-gray-600">Enable emergency shift termination</p>
                </div>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Notifications</h3>
              <p className="text-sm text-gray-600">Configure shift-related notifications</p>
            </div>
            <Button onClick={testNotification} variant="secondary" className="text-xs">
              Test Notifications
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.notifyShiftStart}
                  onChange={(e) => updateSetting('notifyShiftStart', e.target.checked)}
                  className="mr-3"
                />
                <span className="text-sm font-medium text-gray-900">Notify on Shift Start</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.notifyShiftEnd}
                  onChange={(e) => updateSetting('notifyShiftEnd', e.target.checked)}
                  className="mr-3"
                />
                <span className="text-sm font-medium text-gray-900">Notify on Shift End</span>
              </label>
            </div>

            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.notifyHandover}
                  onChange={(e) => updateSetting('notifyHandover', e.target.checked)}
                  className="mr-3"
                />
                <span className="text-sm font-medium text-gray-900">Notify on Handover</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.notifyLowCash}
                  onChange={(e) => updateSetting('notifyLowCash', e.target.checked)}
                  className="mr-3"
                />
                <span className="text-sm font-medium text-gray-900">Notify on Low Cash</span>
              </label>
            </div>
          </div>

          {settings.notifyLowCash && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Low Cash Threshold (₹)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={settings.lowCashThreshold}
                onChange={(e) => updateSetting('lowCashThreshold', parseInt(e.target.value) || 0)}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reporting Settings */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-900">Reporting</h3>
          <p className="text-sm text-gray-600">Configure automatic report generation</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.autoGenerateReports}
                  onChange={(e) => updateSetting('autoGenerateReports', e.target.checked)}
                  className="mr-3"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Auto-Generate Reports</span>
                  <p className="text-xs text-gray-600">Generate reports automatically on shift end</p>
                </div>
              </label>

              {settings.autoGenerateReports && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Format
                  </label>
                  <select
                    value={settings.reportFormat}
                    onChange={(e) => updateSetting('reportFormat', e.target.value as 'pdf' | 'excel' | 'csv')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.includeAnalytics}
                  onChange={(e) => updateSetting('includeAnalytics', e.target.checked)}
                  className="mr-3"
                />
                <span className="text-sm font-medium text-gray-900">Include Analytics</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.includeCashReconciliation}
                  onChange={(e) => updateSetting('includeCashReconciliation', e.target.checked)}
                  className="mr-3"
                />
                <span className="text-sm font-medium text-gray-900">Include Cash Reconciliation</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.includeVehicleActivity}
                  onChange={(e) => updateSetting('includeVehicleActivity', e.target.checked)}
                  className="mr-3"
                />
                <span className="text-sm font-medium text-gray-900">Include Vehicle Activity</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Performance & Cache</h3>
              <p className="text-sm text-gray-600">Optimize performance and manage cache</p>
            </div>
            <Button onClick={clearCache} variant="secondary" className="text-xs">
              Clear Cache
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.enableCaching}
                  onChange={(e) => updateSetting('enableCaching', e.target.checked)}
                  className="mr-3"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Enable Caching</span>
                  <p className="text-xs text-gray-600">Cache data to improve performance</p>
                </div>
              </label>

              {settings.enableCaching && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cache Timeout (seconds)
                    </label>
                    <input
                      type="number"
                      min="60"
                      max="3600"
                      value={settings.cacheTimeout}
                      onChange={(e) => updateSetting('cacheTimeout', parseInt(e.target.value) || 300)}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Cache Size (items)
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="10000"
                      value={settings.maxCacheSize}
                      onChange={(e) => updateSetting('maxCacheSize', parseInt(e.target.value) || 1000)}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Cache Status
                </label>
                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  <div>Sessions Linked: {linkingMetrics?.sessionsLinkedToday ?? 0}</div>
                  <div>Payments Linked: {linkingMetrics?.paymentsLinkedToday ?? 0}</div>
                  <div>Success Rate: {(linkingMetrics?.linkingSuccessRate ?? 0).toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-900">Advanced Settings</h3>
          <p className="text-sm text-gray-600">Configure timing and duration limits</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shift Timeout (seconds)
                </label>
                <input
                  type="number"
                  min="1800"
                  max="86400"
                  value={settings.shiftTimeout}
                  onChange={(e) => updateSetting('shiftTimeout', parseInt(e.target.value) || 43200)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Time before inactive shift is flagged</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Handover Grace Period (seconds)
                </label>
                <input
                  type="number"
                  min="60"
                  max="1800"
                  value={settings.handoverGracePeriod}
                  onChange={(e) => updateSetting('handoverGracePeriod', parseInt(e.target.value) || 300)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Buffer time for handover operations</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Shift Duration (seconds)
                </label>
                <input
                  type="number"
                  min="3600"
                  max="172800"
                  value={settings.maxShiftDuration}
                  onChange={(e) => updateSetting('maxShiftDuration', parseInt(e.target.value) || 86400)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Maximum allowed shift length</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Shift Duration (seconds)
                </label>
                <input
                  type="number"
                  min="300"
                  max="7200"
                  value={settings.minimumShiftDuration}
                  onChange={(e) => updateSetting('minimumShiftDuration', parseInt(e.target.value) || 1800)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum required shift length</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ShiftSettingsTab