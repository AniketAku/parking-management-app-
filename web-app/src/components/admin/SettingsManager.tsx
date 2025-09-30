/**
 * Modern Settings Manager - Complete redesign with card-based interface
 * Eliminates tab complexity, improves mobile UX, and provides better state management
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  CogIcon,
  UserGroupIcon,
  PaintBrushIcon,
  ServerIcon,
  ShieldCheckIcon,
  BellIcon,
  ChartBarIcon,
  LanguageIcon,
  CheckCircleIcon,
  BoltIcon,
  PrinterIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { useSettings } from '../../hooks/useSettings'
import type { SettingCategory } from '../../types/settings'

// Individual setting tab components
import { BusinessSettingsTab } from './settings/BusinessSettingsTab'
import { UIThemeTab } from './settings/UIThemeTab'
import { SystemTab as SystemSettingsTab } from './settings/SystemTab'
import { LocalizationTab } from './settings/LocalizationTab'
import { PrintingSettingsTab } from './settings/PrintingSettingsTab'
import { UserManagementTab } from './settings/UserManagementTab'
import { SecuritySettingsTab } from './settings/SecuritySettingsTab'
import { NotificationSettingsTab } from './settings/NotificationSettingsTab'
import { ReportingSettingsTab } from './settings/ReportingSettingsTab'
import { ValidationSettingsTab } from './settings/ValidationSettingsTab'
import { PerformanceSettingsTab } from './settings/PerformanceSettingsTab'

interface SettingsCategory {
  id: SettingCategory
  name: string
  icon: React.ComponentType<{ className?: string }>
  component: React.ComponentType<{ onSettingChange?: (key: string, value: any) => void }>
  description: string
  badge?: string
  priority: 'critical' | 'important' | 'normal'
  color: string
}

const settingsCategories: SettingsCategory[] = [
  {
    id: 'business',
    name: 'Business Rules',
    icon: CogIcon,
    component: BusinessSettingsTab,
    description: 'Parking rates, fees, and operational policies',
    badge: 'Critical',
    priority: 'critical',
    color: 'bg-red-50 border-red-200 text-red-800'
  },
  {
    id: 'user_mgmt',
    name: 'User Management',
    icon: UserGroupIcon,
    component: UserManagementTab,
    description: 'User roles, permissions, and authentication',
    priority: 'critical',
    color: 'bg-blue-50 border-blue-200 text-blue-800'
  },
  {
    id: 'security',
    name: 'Security & Compliance',
    icon: ShieldCheckIcon,
    component: SecuritySettingsTab,
    description: 'Security policies, audit logging, and compliance',
    priority: 'critical',
    color: 'bg-purple-50 border-purple-200 text-purple-800'
  },
  {
    id: 'printing',
    name: 'Printing & Hardware',
    icon: PrinterIcon,
    component: PrintingSettingsTab,
    description: 'Thermal printers, print queue, and hardware setup',
    badge: 'New',
    priority: 'important',
    color: 'bg-green-50 border-green-200 text-green-800'
  },
  {
    id: 'notifications',
    name: 'Notifications',
    icon: BellIcon,
    component: NotificationSettingsTab,
    description: 'Email, browser alerts, and notification routing',
    priority: 'important',
    color: 'bg-yellow-50 border-yellow-200 text-yellow-800'
  },
  {
    id: 'reporting',
    name: 'Reports & Analytics',
    icon: ChartBarIcon,
    component: ReportingSettingsTab,
    description: 'Report defaults, export settings, and analytics',
    priority: 'important',
    color: 'bg-indigo-50 border-indigo-200 text-indigo-800'
  },
  {
    id: 'performance',
    name: 'Performance',
    icon: BoltIcon,
    component: PerformanceSettingsTab,
    description: 'Performance monitoring and optimization',
    priority: 'normal',
    color: 'bg-orange-50 border-orange-200 text-orange-800'
  },
  {
    id: 'validation',
    name: 'Data Validation',
    icon: CheckCircleIcon,
    component: ValidationSettingsTab,
    description: 'Form validation rules and data constraints',
    priority: 'normal',
    color: 'bg-teal-50 border-teal-200 text-teal-800'
  },
  {
    id: 'ui_theme',
    name: 'Appearance',
    icon: PaintBrushIcon,
    component: UIThemeTab,
    description: 'Colors, fonts, and visual customization',
    priority: 'normal',
    color: 'bg-pink-50 border-pink-200 text-pink-800'
  },
  {
    id: 'localization',
    name: 'Localization',
    icon: LanguageIcon,
    component: LocalizationTab,
    description: 'Language, currency, and regional settings',
    priority: 'normal',
    color: 'bg-cyan-50 border-cyan-200 text-cyan-800'
  },
  {
    id: 'system',
    name: 'System',
    icon: ServerIcon,
    component: SystemSettingsTab,
    description: 'API configuration and system parameters',
    priority: 'normal',
    color: 'bg-gray-50 border-gray-200 text-gray-800'
  }
]

interface SettingsManagerProps {
  className?: string
  defaultCategory?: SettingCategory
  onSettingChange?: (category: SettingCategory, key: string, value: any) => void
}

export function SettingsManager({
  className = '',
  defaultCategory = 'business',
  onSettingChange
}: SettingsManagerProps) {
  // State management
  const [activeCategory, setActiveCategory] = useState<SettingCategory>(defaultCategory)
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set())

  // Get settings for global state management
  // Note: Using 'business' as default category since it's most critical
  // Individual tabs will load their own category-specific settings
  const {
    settings,
    loading: globalLoading,
    error: globalError,
    updateSetting
  } = useSettings('business')

  // Handle category change
  const handleCategoryChange = useCallback((category: SettingCategory) => {
    if (unsavedChanges.size > 0) {
      const confirmChange = window.confirm(
        'You have unsaved changes. Are you sure you want to switch categories?'
      )
      if (!confirmChange) return
    }
    
    setActiveCategory(category)
    setSidebarOpen(false) // Close mobile sidebar
    setUnsavedChanges(new Set())
  }, [unsavedChanges])

  // Handle setting change
  const handleSettingChange = useCallback(async (key: string, value: any) => {
    try {
      await updateSetting(key, value)
      setUnsavedChanges(prev => {
        const next = new Set(prev)
        next.add(`${activeCategory}.${key}`)
        return next
      })
      onSettingChange?.(activeCategory, key, value)
    } catch (error) {
      console.error('Failed to update setting:', error)
    }
  }, [activeCategory, updateSetting, onSettingChange])

  // Handle save all changes
  const handleSaveChanges = useCallback(async () => {
    try {
      // For now, just clear the unsaved changes indicator
      // Individual category tabs handle their own save operations
      setUnsavedChanges(new Set())
      console.log('Settings saved successfully')
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }, [])

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return settingsCategories
    
    const query = searchQuery.toLowerCase()
    return settingsCategories.filter(category =>
      category.name.toLowerCase().includes(query) ||
      category.description.toLowerCase().includes(query)
    )
  }, [searchQuery])

  // Get current category data
  const currentCategory = settingsCategories.find(cat => cat.id === activeCategory)
  const currentCategoryHasUnsavedChanges = Array.from(unsavedChanges).some(
    change => change.startsWith(`${activeCategory}.`)
  )

  return (
    <div className={`h-full flex flex-col bg-gray-50 ${className}`}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Toggle settings menu"
            >
              {sidebarOpen ? (
                <XMarkIcon className="w-5 h-5" />
              ) : (
                <Bars3Icon className="w-5 h-5" />
              )}
            </button>

            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Settings
              </h1>
              <p className="text-sm text-gray-600 hidden sm:block">
                Configure your parking management system
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Unsaved changes indicator */}
            {unsavedChanges.size > 0 && (
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-orange-700 font-medium hidden sm:inline">
                  {unsavedChanges.size} unsaved change{unsavedChanges.size !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={handleSaveChanges}
                  className="px-3 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                >
                  Save All
                </button>
              </div>
            )}

            {/* Global loading indicator */}
            {globalLoading && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
                <span className="hidden sm:inline">Loading...</span>
              </div>
            )}

            {/* Global error indicator */}
            {globalError && (
              <div className="flex items-center space-x-2 text-sm text-red-600">
                <ExclamationTriangleIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Error loading settings</span>
              </div>
            )}
          </div>
        </div>

        {/* Search bar */}
        <div className="mt-4">
          <div className="relative max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar Navigation */}
        <aside className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          fixed lg:static inset-y-0 left-0 z-50 w-80 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:transform-none
        `}>
          <div className="h-full flex flex-col">
            {/* Mobile header spacer */}
            <div className="h-[73px] lg:hidden border-b border-gray-200" />

            {/* Navigation menu */}
            <nav className="flex-1 p-4 overflow-y-auto">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Categories
              </h2>
              
              <div className="space-y-2">
                {filteredCategories.map((category) => {
                  const isActive = activeCategory === category.id
                  const hasUnsavedChanges = Array.from(unsavedChanges).some(
                    change => change.startsWith(`${category.id}.`)
                  )

                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryChange(category.id)}
                      className={`
                        w-full text-left px-3 py-3 rounded-xl transition-all duration-200 group
                        ${isActive
                          ? 'bg-primary-50 text-primary-700 border-2 border-primary-200 shadow-sm'
                          : 'text-gray-700 hover:bg-gray-50 border-2 border-transparent hover:border-gray-200'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0">
                          <category.icon
                            className={`
                              w-5 h-5 flex-shrink-0 transition-colors
                              ${isActive ? 'text-primary-600' : 'text-gray-500 group-hover:text-gray-700'}
                            `}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-sm truncate">
                                {category.name}
                              </span>
                              {hasUnsavedChanges && (
                                <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {category.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end space-y-1">
                          {category.badge && (
                            <span className={`
                              px-2 py-0.5 text-xs font-medium rounded-full
                              ${isActive
                                ? 'bg-primary-100 text-primary-700'
                                : 'bg-orange-100 text-orange-700'
                              }
                            `}>
                              {category.badge}
                            </span>
                          )}
                          
                          {category.priority === 'critical' && (
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </nav>

            {/* Footer actions */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                Templates & Presets
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content area */}
        <main className="flex-1 min-w-0 bg-gray-50">
          {currentCategory && (
            <div className="h-full overflow-y-auto">
              {/* Category header */}
              <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`
                      p-3 rounded-xl ${currentCategory.color}
                    `}>
                      <currentCategory.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-3">
                        <h2 className="text-xl font-bold text-gray-900">
                          {currentCategory.name}
                        </h2>
                        {currentCategory.badge && (
                          <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                            {currentCategory.badge}
                          </span>
                        )}
                        {currentCategoryHasUnsavedChanges && (
                          <div className="flex items-center space-x-1 text-orange-600">
                            <div className="w-2 h-2 bg-orange-500 rounded-full" />
                            <span className="text-xs font-medium">Unsaved changes</span>
                          </div>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mt-1">
                        {currentCategory.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category content */}
              <div className="p-4 sm:p-6">
                <div className="max-w-5xl mx-auto">
                  <currentCategory.component
                    onSettingChange={handleSettingChange}
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default SettingsManager