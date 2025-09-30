/**
 * Simplified Settings Manager - Working Version
 * Only includes implemented components to avoid import errors
 */

import React, { useState } from 'react'
import { Tab } from '@headlessui/react'
import {
  CogIcon,
  PaintBrushIcon,
  WrenchScrewdriverIcon,
  CpuChipIcon,
  GlobeAltIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline'
import { BusinessSettingsTab } from './settings/BusinessSettingsTab'
import { UIThemeTab } from './settings/UIThemeTab'
import { SystemTab } from './settings/SystemTab'
import { LocalizationTab } from './settings/LocalizationTab'
import { ImportExportTab } from './settings/ImportExportTab'
import { SettingsInitializer } from './SettingsInitializer'

interface SettingsTab {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  component: React.ComponentType
}

// Placeholder component for other tabs
const PlaceholderTab: React.FC<{ title: string }> = ({ title }) => (
  <div className="bg-white rounded-lg shadow-sm border p-6">
    <div className="text-center py-12">
      <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-4 text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">
        This settings category will be available in a future update.
      </p>
    </div>
  </div>
)

export const SettingsManager: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')

  const settingsTabs: SettingsTab[] = [
    {
      id: 'setup',
      name: 'Setup',
      icon: WrenchScrewdriverIcon,
      component: SettingsInitializer
    },
    {
      id: 'business',
      name: 'Business',
      icon: CogIcon,
      component: BusinessSettingsTab
    },
    {
      id: 'ui_theme', 
      name: 'UI Theme',
      icon: PaintBrushIcon,
      component: UIThemeTab
    },
    {
      id: 'system',
      name: 'System',
      icon: CpuChipIcon,
      component: SystemTab
    },
    {
      id: 'localization',
      name: 'Localization',
      icon: GlobeAltIcon,
      component: LocalizationTab
    },
    {
      id: 'import_export',
      name: 'Import/Export',
      icon: DocumentDuplicateIcon,
      component: ImportExportTab
    }
  ]

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure business rules, appearance, and system behavior
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="max-w-md">
          <input
            type="text"
            placeholder="Search settings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Settings Tabs */}
      <Tab.Group>
        <div className="border-b border-gray-200">
          <Tab.List className="flex space-x-8">
            {settingsTabs.map((tab) => (
              <Tab
                key={tab.id}
                className={({ selected }) =>
                  `flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    selected
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`
                }
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.name}</span>
              </Tab>
            ))}
          </Tab.List>
        </div>

        <Tab.Panels className="mt-6">
          {settingsTabs.map((tab) => (
            <Tab.Panel key={tab.id} className="focus:outline-none">
              <tab.component />
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  )
}