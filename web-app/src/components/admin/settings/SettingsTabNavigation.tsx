import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BuildingOffice2Icon, 
  UserGroupIcon, 
  PaintBrushIcon,
  CogIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  BellIcon,
  DocumentChartBarIcon,
  ChartBarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import type { SettingCategory } from '../../../types/settings'

interface SettingsTab {
  id: SettingCategory
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  badge?: number
  isComplete?: boolean
}

interface SettingsTabNavigationProps {
  activeTab: SettingCategory
  onTabChange: (tab: SettingCategory) => void
  completedTabs?: SettingCategory[]
  pendingChanges?: Record<SettingCategory, number>
  className?: string
}

const SETTINGS_TABS: SettingsTab[] = [
  {
    id: 'business',
    name: 'Business Rules',
    description: 'Parking rates, fees, operating hours',
    icon: BuildingOffice2Icon,
    color: 'blue'
  },
  {
    id: 'user_mgmt',
    name: 'User Management',
    description: 'Roles, permissions, authentication',
    icon: UserGroupIcon,
    color: 'purple'
  },
  {
    id: 'ui_theme',
    name: 'UI & Themes',
    description: 'Colors, fonts, layout preferences',
    icon: PaintBrushIcon,
    color: 'pink'
  },
  {
    id: 'system',
    name: 'System Settings',
    description: 'API timeouts, performance limits',
    icon: CogIcon,
    color: 'gray'
  },
  {
    id: 'security',
    name: 'Security',
    description: 'Password policies, session settings',
    icon: ShieldCheckIcon,
    color: 'red'
  },
  {
    id: 'validation',
    name: 'Validation Rules',
    description: 'Input patterns, constraints',
    icon: CheckCircleIcon,
    color: 'green'
  },
  {
    id: 'localization',
    name: 'Localization',
    description: 'Language, currency, date formats',
    icon: GlobeAltIcon,
    color: 'indigo'
  },
  {
    id: 'notifications',
    name: 'Notifications',
    description: 'Alert settings, email preferences',
    icon: BellIcon,
    color: 'yellow'
  },
  {
    id: 'reporting',
    name: 'Reporting',
    description: 'Report defaults, export settings',
    icon: DocumentChartBarIcon,
    color: 'cyan'
  },
  {
    id: 'performance',
    name: 'Performance',
    description: 'Monitoring, caching, optimization',
    icon: ChartBarIcon,
    color: 'orange'
  }
]

export const SettingsTabNavigation: React.FC<SettingsTabNavigationProps> = ({
  activeTab,
  onTabChange,
  completedTabs = [],
  pendingChanges = {},
  className = ''
}) => {
  const [hoveredTab, setHoveredTab] = useState<SettingCategory | null>(null)

  const getTabColorClasses = (tab: SettingsTab, isActive: boolean, isHovered: boolean) => {
    const baseClasses = isActive 
      ? `bg-${tab.color}-50 border-${tab.color}-200 text-${tab.color}-800`
      : isHovered 
        ? `bg-${tab.color}-25 border-${tab.color}-100 text-${tab.color}-600`
        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
    
    return baseClasses
  }

  const isTabComplete = (tabId: SettingCategory) => completedTabs.includes(tabId)
  const hasPendingChanges = (tabId: SettingCategory) => (pendingChanges[tabId] || 0) > 0

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Settings Categories</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure your parking management system
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="p-2">
        <div className="space-y-1">
          {SETTINGS_TABS.map((tab) => {
            const isActive = activeTab === tab.id
            const isHovered = hoveredTab === tab.id
            const isComplete = isTabComplete(tab.id)
            const pendingCount = pendingChanges[tab.id] || 0
            
            return (
              <motion.button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                onMouseEnter={() => setHoveredTab(tab.id)}
                onMouseLeave={() => setHoveredTab(null)}
                className={`
                  w-full text-left p-4 rounded-lg border transition-all duration-200
                  ${isActive 
                    ? `bg-${tab.color}-50 border-${tab.color}-200 text-${tab.color}-800 shadow-sm` 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                  }
                  focus:outline-none focus:ring-2 focus:ring-${tab.color}-500 focus:ring-opacity-50
                `}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center justify-between">
                  {/* Tab Icon and Content */}
                  <div className="flex items-center space-x-3">
                    <div className={`
                      p-2 rounded-lg transition-colors duration-200
                      ${isActive 
                        ? `bg-${tab.color}-100 text-${tab.color}-600` 
                        : 'bg-gray-100 text-gray-500'
                      }
                    `}>
                      <tab.icon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-sm">{tab.name}</h3>
                        
                        {/* Completion Indicator */}
                        {isComplete && (
                          <CheckCircleIcon className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      
                      <p className={`
                        text-xs mt-1 line-clamp-1
                        ${isActive ? 'text-gray-600' : 'text-gray-500'}
                      `}>
                        {tab.description}
                      </p>
                    </div>
                  </div>

                  {/* Status Indicators */}
                  <div className="flex items-center space-x-2">
                    {/* Pending Changes Badge */}
                    <AnimatePresence>
                      {pendingCount > 0 && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className={`
                            inline-flex items-center justify-center w-5 h-5 text-xs font-medium
                            rounded-full bg-orange-100 text-orange-600
                          `}
                        >
                          {pendingCount > 9 ? '9+' : pendingCount}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Active Tab Indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className={`w-2 h-2 rounded-full bg-${tab.color}-500`}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </div>
                </div>

                {/* Expanded Description on Hover */}
                <AnimatePresence>
                  {isHovered && !isActive && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-3 pt-3 border-t border-gray-100"
                    >
                      <p className="text-xs text-gray-500">
                        Click to configure {tab.name.toLowerCase()} for your parking system
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Footer with Progress */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{completedTabs.length}</span> of{' '}
            <span className="font-medium">{SETTINGS_TABS.length}</span> categories configured
          </div>
          
          {/* Progress Bar */}
          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-green-500"
              initial={{ width: 0 }}
              animate={{ 
                width: `${(completedTabs.length / SETTINGS_TABS.length) * 100}%` 
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsTabNavigation