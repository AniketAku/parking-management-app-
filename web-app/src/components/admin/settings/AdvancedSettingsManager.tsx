import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'

import SettingsTabNavigation from './SettingsTabNavigation'
import BusinessSettingsTab from './BusinessSettingsTab'
import { useSettings, useSettingsSearch, useSettingsExport, useSettingsImport } from '../../../hooks/useSettings'
import type { SettingCategory, SettingsExportData, SettingsImportOptions } from '../../../types/settings'

interface AdvancedSettingsManagerProps {
  className?: string
  onClose?: () => void
}

interface SettingsState {
  activeTab: SettingCategory
  searchQuery: string
  isSearchMode: boolean
  sidebarCollapsed: boolean
  pendingChanges: Record<SettingCategory, number>
  lastSaved: Date | null
}

const TAB_COMPONENTS: Record<SettingCategory, React.ComponentType<any>> = {
  business: BusinessSettingsTab,
  user_mgmt: () => <div>User Management Settings - Coming Soon</div>,
  ui_theme: () => <div>UI Theme Settings - Coming Soon</div>,
  system: () => <div>System Settings - Coming Soon</div>,
  security: () => <div>Security Settings - Coming Soon</div>,
  validation: () => <div>Validation Settings - Coming Soon</div>,
  localization: () => <div>Localization Settings - Coming Soon</div>,
  notifications: () => <div>Notification Settings - Coming Soon</div>,
  reporting: () => <div>Reporting Settings - Coming Soon</div>,
  performance: () => <div>Performance Settings - Coming Soon</div>
}

export const AdvancedSettingsManager: React.FC<AdvancedSettingsManagerProps> = ({
  className = '',
  onClose
}) => {
  const [settingsState, setSettingsState] = useState<SettingsState>({
    activeTab: 'business',
    searchQuery: '',
    isSearchMode: false,
    sidebarCollapsed: false,
    pendingChanges: {},
    lastSaved: null
  })

  const { settings: allSettings, loading, error, saveBulkSettings } = useSettings()
  const { searchResults, search, clearSearch } = useSettingsSearch()
  const { exportSettings, isExporting } = useSettingsExport()
  const { importSettings, isImporting } = useSettingsImport()

  // Handle tab changes
  const handleTabChange = useCallback((tab: SettingCategory) => {
    setSettingsState(prev => ({ ...prev, activeTab: tab, isSearchMode: false }))
  }, [])

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSettingsState(prev => ({ ...prev, searchQuery: query, isSearchMode: !!query }))
    if (query) {
      search(query)
    } else {
      clearSearch()
    }
  }, [search, clearSearch])

  // Track pending changes
  const handleSettingChange = useCallback((category: SettingCategory, key: string, value: any) => {
    setSettingsState(prev => ({
      ...prev,
      pendingChanges: {
        ...prev.pendingChanges,
        [category]: (prev.pendingChanges[category] || 0) + 1
      }
    }))
  }, [])

  // Save all changes
  const handleSaveAll = useCallback(async () => {
    try {
      await saveBulkSettings(allSettings)
      setSettingsState(prev => ({ 
        ...prev, 
        pendingChanges: {},
        lastSaved: new Date()
      }))
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }, [allSettings, saveBulkSettings])

  // Export settings
  const handleExport = useCallback(async () => {
    try {
      await exportSettings({ 
        categories: [settingsState.activeTab],
        includeUserSettings: false,
        includeLocationSettings: false
      })
    } catch (error) {
      console.error('Failed to export settings:', error)
    }
  }, [exportSettings, settingsState.activeTab])

  // Import settings
  const handleImport = useCallback(async (file: File) => {
    try {
      const options: SettingsImportOptions = {
        overwrite_existing: false,
        validate_only: false,
        ignore_system_settings: false,
        target_scope: 'system'
      }
      await importSettings(file, options)
    } catch (error) {
      console.error('Failed to import settings:', error)
    }
  }, [importSettings])

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setSettingsState(prev => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }))
  }, [])

  const ActiveTabComponent = TAB_COMPONENTS[settingsState.activeTab]
  const totalPendingChanges = Object.values(settingsState.pendingChanges).reduce((sum, count) => sum + count, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900">Loading Settings</h2>
          <p className="text-gray-600">Please wait while we load your configuration...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900">Failed to Load Settings</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex h-screen bg-gray-50 ${className}`}>
      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ width: settingsState.sidebarCollapsed ? 64 : 320 }}
        transition={{ duration: 0.3 }}
        className="bg-white border-r border-gray-200 overflow-hidden flex-shrink-0"
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {!settingsState.sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center space-x-2"
            >
              <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
              {totalPendingChanges > 0 && (
                <div className="bg-orange-100 text-orange-600 text-xs px-2 py-1 rounded-full">
                  {totalPendingChanges}
                </div>
              )}
            </motion.div>
          )}
          
          <button
            onClick={toggleSidebar}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            {settingsState.sidebarCollapsed ? <Bars3Icon className="w-5 h-5" /> : <XMarkIcon className="w-5 h-5" />}
          </button>
        </div>

        {/* Search Bar */}
        {!settingsState.sidebarCollapsed && (
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search settings..."
                value={settingsState.searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              {settingsState.searchQuery && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        {!settingsState.sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto">
            <SettingsTabNavigation
              activeTab={settingsState.activeTab}
              onTabChange={handleTabChange}
              pendingChanges={settingsState.pendingChanges}
            />
          </div>
        )}

        {/* Sidebar Footer */}
        {!settingsState.sidebarCollapsed && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <CloudArrowDownIcon className="w-4 h-4" />
                <span>Export</span>
              </button>
              
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImport(file)
                }}
                className="hidden"
                id="import-settings"
              />
              <label
                htmlFor="import-settings"
                className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <CloudArrowUpIcon className="w-4 h-4" />
                <span>Import</span>
              </label>
            </div>
          </div>
        )}
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>Settings</span>
              <ChevronRightIcon className="w-4 h-4" />
              <span className="text-gray-900 font-medium">
                {settingsState.activeTab.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {settingsState.lastSaved && (
              <div className="flex items-center space-x-1 text-sm text-green-600">
                <CheckCircleIcon className="w-4 h-4" />
                <span>Saved {settingsState.lastSaved.toLocaleTimeString()}</span>
              </div>
            )}

            {totalPendingChanges > 0 && (
              <button
                onClick={handleSaveAll}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span>Save All Changes</span>
                <div className="bg-blue-500 text-xs px-2 py-1 rounded-full">
                  {totalPendingChanges}
                </div>
              </button>
            )}

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {settingsState.isSearchMode ? (
              <motion.div
                key="search-results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-6"
              >
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Search Results for "{settingsState.searchQuery}"
                  </h2>
                  <p className="text-gray-600">
                    {searchResults.length} settings found
                  </p>
                </div>

                {searchResults.length > 0 ? (
                  <div className="space-y-4">
                    {searchResults.map((setting) => (
                      <div
                        key={setting.id}
                        className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {setting.description}
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {setting.category}
                              </span>
                              <span className="text-xs text-gray-400">
                                {setting.data_type}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              handleTabChange(setting.category)
                              setSettingsState(prev => ({ ...prev, searchQuery: '', isSearchMode: false }))
                            }}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MagnifyingGlassIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No settings found</h3>
                    <p className="text-gray-500">
                      Try adjusting your search terms or browse settings by category
                    </p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key={settingsState.activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6"
              >
                <ActiveTabComponent
                  onSettingChange={(key: string, value: any) => 
                    handleSettingChange(settingsState.activeTab, key, value)
                  }
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Loading Overlays */}
      <AnimatePresence>
        {(isExporting || isImporting) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
              <div className="text-center">
                <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {isExporting ? 'Exporting Settings...' : 'Importing Settings...'}
                </h3>
                <p className="text-gray-600 mt-2">
                  Please wait while we process your request
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AdvancedSettingsManager