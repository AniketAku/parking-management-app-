import React, { useState, useEffect, useMemo } from 'react'
import { 
  Search, Settings, Upload, Download, RotateCcw, Eye, 
  Edit, Trash2, Plus, Filter, AlertTriangle, Check, X,
  Database, User, Palette, Shield, Bell, BarChart3, Zap, Globe
} from 'lucide-react'
import { Button } from '../ui'
import { Card, CardContent } from '../ui'
import { Input } from '../ui'
import { useSettings } from '../../hooks/useSettings'
import { usePermissions } from '../../hooks/useAuth'
import { settingsService } from '../../services/settingsService'
import type { 
  Setting, 
  SettingCategory, 
  SettingValidation, 
  SettingsAuditEntry,
  BulkEditOperation,
  SettingsTemplate
} from '../../types/settings'
import toast from 'react-hot-toast'

// Setting category configuration with icons and descriptions
const SETTING_CATEGORIES: Record<SettingCategory, { 
  icon: React.ComponentType, 
  label: string, 
  description: string,
  color: string
}> = {
  business: { 
    icon: Database, 
    label: 'Business Settings', 
    description: 'Parking rates, business hours, policies',
    color: 'bg-blue-500'
  },
  user_mgmt: {
    icon: User,
    label: 'User Management',
    description: 'Roles, permissions, authentication',
    color: 'bg-green-500'
  },
  user_management: {
    icon: User,
    label: 'User Management',
    description: 'Roles, permissions, authentication',
    color: 'bg-green-500'
  },
  ui_theme: { 
    icon: Palette, 
    label: 'UI & Theme', 
    description: 'Colors, branding, layout preferences',
    color: 'bg-purple-500'
  },
  system: { 
    icon: Settings, 
    label: 'System Configuration', 
    description: 'API endpoints, timeouts, caching',
    color: 'bg-gray-500'
  },
  validation: { 
    icon: Shield, 
    label: 'Validation Rules', 
    description: 'Data validation, business rules',
    color: 'bg-orange-500'
  },
  localization: { 
    icon: Globe, 
    label: 'Localization', 
    description: 'Languages, date formats, currencies',
    color: 'bg-teal-500'
  },
  notifications: { 
    icon: Bell, 
    label: 'Notifications', 
    description: 'Email settings, alerts, messaging',
    color: 'bg-yellow-500'
  },
  reporting: { 
    icon: BarChart3, 
    label: 'Reporting', 
    description: 'Report settings, data retention',
    color: 'bg-indigo-500'
  },
  security: { 
    icon: Shield, 
    label: 'Security', 
    description: 'Password policies, session timeout',
    color: 'bg-red-500'
  },
  performance: { 
    icon: Zap, 
    label: 'Performance', 
    description: 'Caching, optimization settings',
    color: 'bg-pink-500'
  }
}

interface AdvancedSettingsManagerProps {
  onClose?: () => void
}

export const AdvancedSettingsManager: React.FC<AdvancedSettingsManagerProps> = ({
  onClose
}) => {
  const { settings, loading, updateSetting, refresh } = useSettings()
  const permissions = usePermissions()
  
  // UI State
  const [activeCategory, setActiveCategory] = useState<SettingCategory>('business')
  const [searchQuery, setSearchQuery] = useState('')
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [isBulkEditMode, setIsBulkEditMode] = useState(false)
  const [selectedSettings, setSelectedSettings] = useState<Set<string>>(new Set())
  const [pendingChanges, setPendingChanges] = useState<Map<string, any>>(new Map())
  
  // Advanced Features State
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [filterLevel, setFilterLevel] = useState<'all' | 'user' | 'location' | 'system'>('all')
  const [showAuditLog, setShowAuditLog] = useState(false)
  const [auditEntries, setAuditEntries] = useState<SettingsAuditEntry[]>([])
  const [templates, setTemplates] = useState<SettingsTemplate[]>([])
  
  // Load audit log and templates
  useEffect(() => {
    const loadAdvancedData = async () => {
      try {
        const [auditData, templateData] = await Promise.all([
          settingsService.getAuditLog({ limit: 100 }),
          settingsService.getTemplates()
        ])
        setAuditEntries(auditData)
        setTemplates(templateData)
      } catch (error) {
        console.error('Failed to load advanced settings data:', error)
      }
    }
    
    loadAdvancedData()
  }, [])
  
  // Filter settings based on search and category
  const filteredSettings = useMemo(() => {
    if (!settings) return []
    
    return settings.filter(setting => {
      // Category filter
      if (setting.category !== activeCategory) return false
      
      // Level filter
      if (filterLevel !== 'all' && setting.level !== filterLevel) return false
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          setting.key.toLowerCase().includes(query) ||
          setting.description.toLowerCase().includes(query) ||
          (typeof setting.value === 'string' && setting.value.toLowerCase().includes(query))
        )
      }
      
      return true
    })
  }, [settings, activeCategory, searchQuery, filterLevel])
  
  // Permission check for setting modification
  const canModifySetting = (setting: Setting): boolean => {
    if (setting.level === 'system') return permissions.hasPermission('manage_system_settings')
    if (setting.level === 'location') return permissions.hasPermission('manage_location_settings')
    return true // User level settings
  }
  
  // Handle setting value change
  const handleSettingChange = async (setting: Setting, newValue: any) => {
    if (!canModifySetting(setting)) {
      toast.error('Insufficient permissions to modify this setting')
      return
    }
    
    if (isPreviewMode) {
      // Store in pending changes for preview
      setPendingChanges(prev => new Map(prev.set(setting.key, newValue)))
      return
    }
    
    try {
      await updateSetting(setting.key, newValue, setting.level)
      toast.success(`Updated ${setting.key}`)
    } catch (error) {
      toast.error(`Failed to update setting: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  // Apply pending changes
  const applyPendingChanges = async () => {
    try {
      const updates = Array.from(pendingChanges.entries()).map(([key, value]) => {
        const setting = settings?.find(s => s.key === key)
        return setting ? updateSetting(key, value, setting.level) : null
      }).filter(Boolean)
      
      await Promise.all(updates)
      setPendingChanges(new Map())
      setIsPreviewMode(false)
      toast.success(`Applied ${updates.length} pending changes`)
    } catch (error) {
      toast.error('Failed to apply some changes')
    }
  }
  
  // Cancel pending changes
  const cancelPendingChanges = () => {
    setPendingChanges(new Map())
    setIsPreviewMode(false)
    toast.success('Cancelled pending changes')
  }
  
  // Export settings
  const exportSettings = async () => {
    try {
      const exportData = await settingsService.exportSettings({
        categories: [activeCategory],
        includeAuditLog: true
      })
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `parking-settings-${activeCategory}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('Settings exported successfully')
    } catch (error) {
      toast.error('Failed to export settings')
    }
  }
  
  // Import settings
  const importSettings = async (file: File) => {
    try {
      const text = await file.text()
      const importData = JSON.parse(text)
      await settingsService.importSettings(importData, { validate: true })
      await refresh()
      toast.success('Settings imported successfully')
    } catch (error) {
      toast.error(`Failed to import settings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  // Reset category to defaults
  const resetCategoryToDefaults = async () => {
    if (!confirm(`Reset all ${SETTING_CATEGORIES[activeCategory].label} to default values?`)) {
      return
    }
    
    try {
      await settingsService.resetCategoryToDefaults(activeCategory)
      await refresh()
      toast.success(`${SETTING_CATEGORIES[activeCategory].label} reset to defaults`)
    } catch (error) {
      toast.error('Failed to reset settings')
    }
  }
  
  // Bulk edit operations
  const applyBulkOperation = async (operation: BulkEditOperation) => {
    try {
      const selectedSettingsList = Array.from(selectedSettings)
        .map(key => settings?.find(s => s.key === key))
        .filter(Boolean) as Setting[]
      
      await settingsService.bulkEditSettings(selectedSettingsList, operation)
      await refresh()
      setSelectedSettings(new Set())
      setIsBulkEditMode(false)
      toast.success(`Applied bulk operation to ${selectedSettingsList.length} settings`)
    } catch (error) {
      toast.error('Failed to apply bulk operation')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header with Actions */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Advanced Settings Manager
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Comprehensive configuration management for all application settings
            </p>
          </div>
          
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Mode Toggles */}
          <Button
            variant={isPreviewMode ? "primary" : "outline"}
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Preview Mode
          </Button>
          
          <Button
            variant={isBulkEditMode ? "primary" : "outline"}
            onClick={() => setIsBulkEditMode(!isBulkEditMode)}
            className="flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Bulk Edit
          </Button>
          
          {/* Import/Export */}
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importSettings(e.target.files[0])}
            />
            <Button variant="outline" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Import
            </Button>
          </label>
          
          <Button
            variant="outline"
            onClick={exportSettings}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          
          <Button
            variant="outline"
            onClick={resetCategoryToDefaults}
            className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Category
          </Button>
        </div>
        
        {/* Preview Mode Actions */}
        {isPreviewMode && pendingChanges.size > 0 && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {pendingChanges.size} pending changes
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={applyPendingChanges}
                  className="flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Apply Changes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelPendingChanges}
                  className="flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Category Sidebar */}
        <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Setting Categories
            </h2>
            <div className="space-y-1">
              {Object.entries(SETTING_CATEGORIES).map(([category, config]) => {
                const Icon = config.icon
                const isActive = activeCategory === category
                const categorySettings = settings?.filter(s => s.category === category) || []
                
                return (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category as SettingCategory)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                      ${isActive 
                        ? 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }
                    `}
                  >
                    <div className={`
                      p-1.5 rounded-md text-white text-xs
                      ${config.color}
                    `}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {config.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {categorySettings.length} settings
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          
          {/* Advanced Filters */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <button
              onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <Filter className="w-4 h-4" />
              Advanced Filters
            </button>
            
            {showAdvancedFilter && (
              <div className="mt-3 space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Setting Level
                  </label>
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value as any)}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="all">All Levels</option>
                    <option value="user">User Only</option>
                    <option value="location">Location Only</option>
                    <option value="system">System Only</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl">
            {/* Category Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                {React.createElement(SETTING_CATEGORIES[activeCategory].icon, {
                  className: "w-6 h-6 text-gray-600 dark:text-gray-400"
                })}
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {SETTING_CATEGORIES[activeCategory].label}
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                {SETTING_CATEGORIES[activeCategory].description}
              </p>
            </div>
            
            {/* Settings Grid */}
            <div className="grid gap-4">
              {filteredSettings.map((setting) => (
                <SettingCard
                  key={setting.key}
                  setting={setting}
                  isSelected={selectedSettings.has(setting.key)}
                  canModify={canModifySetting(setting)}
                  isPreviewMode={isPreviewMode}
                  isBulkEditMode={isBulkEditMode}
                  pendingValue={pendingChanges.get(setting.key)}
                  onSelectionChange={(selected) => {
                    const newSet = new Set(selectedSettings)
                    if (selected) {
                      newSet.add(setting.key)
                    } else {
                      newSet.delete(setting.key)
                    }
                    setSelectedSettings(newSet)
                  }}
                  onChange={(value) => handleSettingChange(setting, value)}
                />
              ))}
              
              {filteredSettings.length === 0 && (
                <div className="text-center py-12">
                  <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Settings Found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {searchQuery 
                      ? `No settings match your search "${searchQuery}"`
                      : `No settings in ${SETTING_CATEGORIES[activeCategory].label}`
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Bulk Edit Actions */}
      {isBulkEditMode && selectedSettings.size > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedSettings.size} settings selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => applyBulkOperation({ type: 'reset_to_default' })}
              >
                Reset to Default
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => applyBulkOperation({ type: 'export' })}
              >
                Export Selected
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setSelectedSettings(new Set())
                  setIsBulkEditMode(false)
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Individual Setting Card Component
interface SettingCardProps {
  setting: Setting
  isSelected: boolean
  canModify: boolean
  isPreviewMode: boolean
  isBulkEditMode: boolean
  pendingValue?: any
  onSelectionChange: (selected: boolean) => void
  onChange: (value: any) => void
}

const SettingCard: React.FC<SettingCardProps> = ({
  setting,
  isSelected,
  canModify,
  isPreviewMode,
  isBulkEditMode,
  pendingValue,
  onSelectionChange,
  onChange
}) => {
  const hasChanges = pendingValue !== undefined
  const displayValue = hasChanges ? pendingValue : setting.value

  return (
    <Card className={`
      relative transition-all duration-200
      ${isSelected ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20' : ''}
      ${hasChanges ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}
    `}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Setting Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {isBulkEditMode && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => onSelectionChange(e.target.checked)}
                  className="rounded border-gray-300"
                />
              )}
              
              <h3 className="font-medium text-gray-900 dark:text-white truncate">
                {setting.key}
              </h3>
              
              {/* Level Badge */}
              <span className={`
                px-2 py-0.5 text-xs rounded-full font-medium
                ${setting.level === 'system' 
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  : setting.level === 'location'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                }
              `}>
                {setting.level}
              </span>
              
              {hasChanges && (
                <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  Modified
                </span>
              )}
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {setting.description}
            </p>
            
            {/* Setting Input */}
            <SettingInput
              setting={setting}
              value={displayValue}
              disabled={!canModify || (!isPreviewMode && isBulkEditMode)}
              onChange={onChange}
            />
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1">
            {!canModify && (
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Read-only
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Dynamic Setting Input Component
interface SettingInputProps {
  setting: Setting
  value: any
  disabled: boolean
  onChange: (value: any) => void
}

const SettingInput: React.FC<SettingInputProps> = ({
  setting,
  value,
  disabled,
  onChange
}) => {
  const renderInput = () => {
    switch (setting.data_type) {
      case 'boolean':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(value)}
              disabled={disabled}
              onChange={(e) => onChange(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {Boolean(value) ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        )
      
      case 'number':
        return (
          <Input
            type="number"
            value={value || 0}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            min={setting.validation?.min}
            max={setting.validation?.max}
          />
        )
      
      case 'json':
        return (
          <textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
            disabled={disabled}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                onChange(parsed)
              } catch {
                // Keep as string if invalid JSON
                onChange(e.target.value)
              }
            }}
            rows={4}
            className="w-full p-2 text-sm border border-gray-300 rounded-lg font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        )
      
      case 'array':
        return (
          <div className="space-y-2">
            {(Array.isArray(value) ? value : []).map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={item}
                  disabled={disabled}
                  onChange={(e) => {
                    const newArray = [...(Array.isArray(value) ? value : [])]
                    newArray[index] = e.target.value
                    onChange(newArray)
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={disabled}
                  onClick={() => {
                    const newArray = [...(Array.isArray(value) ? value : [])]
                    newArray.splice(index, 1)
                    onChange(newArray)
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => {
                const newArray = [...(Array.isArray(value) ? value : []), '']
                onChange(newArray)
              }}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Item
            </Button>
          </div>
        )
      
      default:
        return (
          <Input
            type="text"
            value={String(value || '')}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            maxLength={setting.validation?.maxLength}
          />
        )
    }
  }

  return (
    <div className="space-y-2">
      {renderInput()}
      
      {/* Validation Messages */}
      {setting.validation && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {setting.validation.required && <span>Required • </span>}
          {setting.validation.min !== undefined && <span>Min: {setting.validation.min} • </span>}
          {setting.validation.max !== undefined && <span>Max: {setting.validation.max} • </span>}
          {setting.validation.pattern && <span>Pattern: {setting.validation.pattern} • </span>}
        </div>
      )}
    </div>
  )
}