/**
 * Settings Management Demo Component
 * Demonstrates the complete settings system with all features integrated
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CogIcon,
  DocumentCheckIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  WrenchScrewdriverIcon,
  LightBulbIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { AdvancedSettingsManager } from './AdvancedSettingsManager'
import { EnhancedBusinessSettingsTab } from './EnhancedBusinessSettingsTab'
import { SmartConfigurationWizard } from './SmartConfigurationWizard'
import { SettingsValidationPanel } from './SettingsValidationPanel'
import { useAdvancedSettings } from '../../../hooks/useAdvancedSettings'

interface SettingsManagementDemoProps {
  className?: string
}

type DemoView = 'overview' | 'advanced' | 'business' | 'wizard' | 'validation'

export const SettingsManagementDemo: React.FC<SettingsManagementDemoProps> = ({
  className = ''
}) => {
  const [currentView, setCurrentView] = useState<DemoView>('overview')
  const [demoData, setDemoData] = useState({
    exportCount: 0,
    importCount: 0,
    validationRuns: 0,
    autoFixesApplied: 0,
    recommendationsGenerated: 0
  })

  const {
    settings,
    loading,
    error,
    validation,
    hasUnsavedChanges,
    hasValidationErrors,
    exportConfiguration,
    importConfiguration,
    validateSettings,
    autoFixIssue,
    getRecommendations,
    searchSettings
  } = useAdvancedSettings({ autoValidate: true, autoBackup: true })

  // Demo actions
  const handleDemoExport = async () => {
    try {
      await exportConfiguration({
        categories: ['business'],
        includeUserSettings: false
      })
      setDemoData(prev => ({ ...prev, exportCount: prev.exportCount + 1 }))
    } catch (error) {
      console.error('Demo export failed:', error)
    }
  }

  const handleDemoValidation = async () => {
    try {
      await validateSettings()
      setDemoData(prev => ({ ...prev, validationRuns: prev.validationRuns + 1 }))
    } catch (error) {
      console.error('Demo validation failed:', error)
    }
  }

  const handleDemoRecommendations = async () => {
    try {
      await getRecommendations()
      setDemoData(prev => ({ ...prev, recommendationsGenerated: prev.recommendationsGenerated + 1 }))
    } catch (error) {
      console.error('Demo recommendations failed:', error)
    }
  }

  const demoFeatures = [
    {
      id: 'advanced',
      title: 'Advanced Settings Manager',
      description: 'Complete settings interface with search, validation, and import/export',
      icon: CogIcon,
      color: 'blue',
      features: [
        'Collapsible sidebar navigation',
        'Real-time search across all settings',
        'Bulk operations and change tracking',
        'Import/export with validation',
        'Multi-category management'
      ]
    },
    {
      id: 'business',
      title: 'Enhanced Business Settings',
      description: 'Business configuration with real-time validation and auto-fix',
      icon: DocumentCheckIcon,
      color: 'green',
      features: [
        'Vehicle rates management',
        'Operating hours configuration',
        'Payment methods setup',
        'Real-time validation feedback',
        'Auto-fix suggestions'
      ]
    },
    {
      id: 'wizard',
      title: 'Smart Configuration Wizard',
      description: 'Guided setup with intelligent recommendations',
      icon: LightBulbIcon,
      color: 'purple',
      features: [
        'Context-aware detection',
        'Step-by-step configuration',
        'Location-based recommendations',
        'Business type templates',
        'Validation at each step'
      ]
    },
    {
      id: 'validation',
      title: 'Validation & Error Handling',
      description: 'Comprehensive validation with auto-fix capabilities',
      icon: ShieldCheckIcon,
      color: 'red',
      features: [
        'Business logic validation',
        'Cross-field consistency checks',
        'Auto-fix recommendations',
        'Severity-based issue classification',
        'Detailed error explanations'
      ]
    }
  ]

  const views = {
    overview: (
      <div className="space-y-8">
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CogIcon className="w-8 h-8 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Settings Status</p>
                <p className="text-lg font-semibold text-gray-700">
                  {validation.isValid ? 'Valid' : `${validation.issues.length} Issues`}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CloudArrowDownIcon className="w-8 h-8 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Exports</p>
                <p className="text-lg font-semibold text-gray-700">{demoData.exportCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <WrenchScrewdriverIcon className="w-8 h-8 text-purple-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Auto-Fixes</p>
                <p className="text-lg font-semibold text-gray-700">{demoData.autoFixesApplied}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <LightBulbIcon className="w-8 h-8 text-yellow-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Recommendations</p>
                <p className="text-lg font-semibold text-gray-700">{demoData.recommendationsGenerated}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Demo Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={handleDemoExport}
              className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <CloudArrowDownIcon className="w-4 h-4 mr-2" />
              Test Export
            </button>
            
            <button
              onClick={handleDemoValidation}
              className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              <ShieldCheckIcon className="w-4 h-4 mr-2" />
              Run Validation
            </button>
            
            <button
              onClick={handleDemoRecommendations}
              className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
            >
              <LightBulbIcon className="w-4 h-4 mr-2" />
              Get Recommendations
            </button>
            
            <button
              onClick={() => setCurrentView('advanced')}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <CogIcon className="w-4 h-4 mr-2" />
              Open Settings
            </button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {demoFeatures.map((feature) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.id}
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-lg border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setCurrentView(feature.id as DemoView)}
              >
                <div className="flex items-center mb-4">
                  <Icon className={`w-8 h-8 text-${feature.color}-500`} />
                  <h3 className="ml-3 text-lg font-medium text-gray-900">{feature.title}</h3>
                </div>
                
                <p className="text-gray-600 mb-4">{feature.description}</p>
                
                <ul className="space-y-2">
                  {feature.features.map((item, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-500">
                      <div className="w-1.5 h-1.5 bg-gray-300 rounded-full mr-2" />
                      {item}
                    </li>
                  ))}
                </ul>
                
                <div className="mt-4 text-sm text-blue-600 font-medium">
                  Click to explore →
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    ),
    advanced: <AdvancedSettingsManager onClose={() => setCurrentView('overview')} />,
    business: <EnhancedBusinessSettingsTab />,
    wizard: <SmartConfigurationWizard onComplete={() => setCurrentView('overview')} />,
    validation: <SettingsValidationPanel />
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Settings Management Demo</h1>
              {currentView !== 'overview' && (
                <button
                  onClick={() => setCurrentView('overview')}
                  className="ml-4 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  ← Back to Overview
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {hasUnsavedChanges && (
                <div className="flex items-center text-yellow-600">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2" />
                  <span className="text-sm">Unsaved changes</span>
                </div>
              )}
              
              {hasValidationErrors && (
                <div className="flex items-center text-red-600">
                  <div className="w-2 h-2 bg-red-400 rounded-full mr-2" />
                  <span className="text-sm">Validation errors</span>
                </div>
              )}
              
              <div className="text-sm text-gray-500">
                Version 1.0.0
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {views[currentView]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

export default SettingsManagementDemo