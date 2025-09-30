import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  SparklesIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  GlobeAltIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  CogIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { smartConfigService, type SmartRecommendation } from '../../../services/smartConfigurationService'
import type { AllSettings, SettingCategory } from '../../../types/settings'

interface WizardStep {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  component: React.ComponentType<any>
}

interface SmartConfigurationWizardProps {
  currentSettings: Partial<AllSettings>
  onSettingsChange: (settings: Partial<AllSettings>) => void
  onComplete: (appliedRecommendations: SmartRecommendation[]) => void
  onCancel: () => void
  className?: string
}

interface WizardState {
  currentStep: number
  detectedContext: any
  recommendations: SmartRecommendation[]
  selectedRecommendations: Set<string>
  appliedSettings: Partial<AllSettings>
  isProcessing: boolean
}

// Step Components
const ContextDetectionStep: React.FC<{
  context: any
  onContextDetected: (context: any) => void
  isLoading: boolean
}> = ({ context, onContextDetected, isLoading }) => {
  useEffect(() => {
    if (!context && !isLoading) {
      smartConfigService.detectConfigurationContext().then(onContextDetected)
    }
  }, [context, isLoading, onContextDetected])

  return (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
        {isLoading ? (
          <ArrowPathIcon className="w-8 h-8 text-blue-600 animate-spin" />
        ) : (
          <GlobeAltIcon className="w-8 h-8 text-blue-600" />
        )}
      </div>
      
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Detecting Your Environment
        </h3>
        <p className="text-gray-600">
          We're analyzing your location, browser settings, and existing configuration 
          to provide personalized recommendations.
        </p>
      </div>

      {context && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 rounded-lg p-4"
        >
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800">Context Detected</span>
          </div>
          
          <div className="text-sm space-y-2">
            {context.location && (
              <div className="flex justify-between">
                <span className="text-gray-600">Location:</span>
                <span className="font-medium">{context.location.country} ({context.location.timezone})</span>
              </div>
            )}
            {context.businessType && (
              <div className="flex justify-between">
                <span className="text-gray-600">Business Type:</span>
                <span className="font-medium capitalize">{context.businessType.replace('_', ' ')}</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}

const RecommendationsStep: React.FC<{
  recommendations: SmartRecommendation[]
  selectedRecommendations: Set<string>
  onToggleRecommendation: (id: string) => void
  onSelectAll: () => void
  onSelectNone: () => void
}> = ({ 
  recommendations, 
  selectedRecommendations, 
  onToggleRecommendation,
  onSelectAll,
  onSelectNone
}) => {
  const groupedRecommendations = recommendations.reduce((acc, rec) => {
    if (!acc[rec.category]) acc[rec.category] = []
    acc[rec.category].push(rec)
    return acc
  }, {} as Record<SettingCategory, SmartRecommendation[]>)

  const getImpactColor = (impact: SmartRecommendation['impact']) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-blue-600 bg-blue-100'
    }
  }

  const getSourceIcon = (source: SmartRecommendation['source']) => {
    switch (source) {
      case 'location_based': return <GlobeAltIcon className="w-4 h-4" />
      case 'business_logic': return <BuildingOffice2Icon className="w-4 h-4" />
      case 'usage_pattern': return <ChartBarIcon className="w-4 h-4" />
      case 'best_practice': return <LightBulbIcon className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <SparklesIcon className="w-16 h-16 mx-auto text-purple-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Smart Recommendations
        </h3>
        <p className="text-gray-600">
          We found {recommendations.length} optimization opportunities for your configuration
        </p>
      </div>

      {recommendations.length > 0 && (
        <>
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <span className="text-sm text-gray-600">
              {selectedRecommendations.size} of {recommendations.length} selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={onSelectAll}
                className="text-xs bg-white border border-gray-300 rounded px-3 py-1 hover:bg-gray-50"
              >
                Select All
              </button>
              <button
                onClick={onSelectNone}
                className="text-xs bg-white border border-gray-300 rounded px-3 py-1 hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {Object.entries(groupedRecommendations).map(([category, recs]) => (
              <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h4 className="font-medium text-gray-900 capitalize">
                    {category.replace('_', ' ')} Settings
                  </h4>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {recs.map((rec) => (
                    <motion.label
                      key={rec.id}
                      className="flex items-start space-x-3 p-4 hover:bg-gray-50 cursor-pointer"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRecommendations.has(rec.id)}
                        onChange={() => onToggleRecommendation(rec.id)}
                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900">{rec.reason}</h5>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${getImpactColor(rec.impact)}`}>
                              {rec.impact} impact
                            </span>
                            <div className="text-gray-400" title={rec.source.replace('_', ' ')}>
                              {getSourceIcon(rec.source)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex justify-between">
                            <span>Current:</span>
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              {JSON.stringify(rec.currentValue)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Recommended:</span>
                            <span className="font-mono text-xs bg-green-100 px-2 py-1 rounded">
                              {JSON.stringify(rec.recommendedValue)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-gray-300 rounded-full">
                              <div 
                                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                                style={{ width: `${rec.confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">
                              {Math.round(rec.confidence * 100)}% confidence
                            </span>
                          </div>
                          
                          {rec.autoApplicable && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              Auto-applicable
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {recommendations.length === 0 && (
        <div className="text-center py-8">
          <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            Configuration Looks Great!
          </h4>
          <p className="text-gray-600">
            No optimization opportunities found. Your settings are well-configured.
          </p>
        </div>
      )}
    </div>
  )
}

const ConfirmationStep: React.FC<{
  selectedRecommendations: SmartRecommendation[]
  appliedSettings: Partial<AllSettings>
  onApply: () => void
  isApplying: boolean
}> = ({ selectedRecommendations, appliedSettings, onApply, isApplying }) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <CogIcon className="w-16 h-16 mx-auto text-green-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Review & Apply Changes
        </h3>
        <p className="text-gray-600">
          Review the changes that will be applied to your configuration
        </p>
      </div>

      {selectedRecommendations.length > 0 ? (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <InformationCircleIcon className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">Changes Summary</span>
            </div>
            <div className="text-sm text-blue-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Total Recommendations:</span>
                  <span className="ml-2">{selectedRecommendations.length}</span>
                </div>
                <div>
                  <span className="font-medium">Auto-applicable:</span>
                  <span className="ml-2">
                    {selectedRecommendations.filter(r => r.autoApplicable).length}
                  </span>
                </div>
                <div>
                  <span className="font-medium">High Impact:</span>
                  <span className="ml-2">
                    {selectedRecommendations.filter(r => r.impact === 'high').length}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Categories Affected:</span>
                  <span className="ml-2">
                    {new Set(selectedRecommendations.map(r => r.category)).size}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
            {selectedRecommendations.map((rec) => (
              <div key={rec.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900">{rec.reason}</h5>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded capitalize">
                    {rec.category.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Setting:</span> {rec.settingKey}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={onApply}
              disabled={isApplying}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 mx-auto"
            >
              {isApplying && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
              <span>{isApplying ? 'Applying Changes...' : 'Apply Configuration'}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <ExclamationTriangleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            No Changes Selected
          </h4>
          <p className="text-gray-600">
            Go back to select recommendations you'd like to apply.
          </p>
        </div>
      )}
    </div>
  )
}

export const SmartConfigurationWizard: React.FC<SmartConfigurationWizardProps> = ({
  currentSettings,
  onSettingsChange,
  onComplete,
  onCancel,
  className = ''
}) => {
  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: 0,
    detectedContext: null,
    recommendations: [],
    selectedRecommendations: new Set(),
    appliedSettings: {},
    isProcessing: false
  })

  const steps: WizardStep[] = [
    {
      id: 'detection',
      title: 'Environment Detection',
      description: 'Analyzing your setup',
      icon: GlobeAltIcon,
      component: ContextDetectionStep
    },
    {
      id: 'recommendations',
      title: 'Smart Recommendations',
      description: 'Review optimization suggestions',
      icon: SparklesIcon,
      component: RecommendationsStep
    },
    {
      id: 'confirmation',
      title: 'Apply Changes',
      description: 'Confirm and apply settings',
      icon: CogIcon,
      component: ConfirmationStep
    }
  ]

  const handleContextDetected = useCallback(async (context: any) => {
    setWizardState(prev => ({ ...prev, detectedContext: context, isProcessing: true }))
    
    try {
      const recommendations = await smartConfigService.generateRecommendations(
        currentSettings,
        context
      )
      
      setWizardState(prev => ({
        ...prev,
        recommendations,
        isProcessing: false
      }))
    } catch (error) {
      console.error('Failed to generate recommendations:', error)
      setWizardState(prev => ({ ...prev, isProcessing: false }))
    }
  }, [currentSettings])

  const handleToggleRecommendation = useCallback((id: string) => {
    setWizardState(prev => {
      const newSelected = new Set(prev.selectedRecommendations)
      if (newSelected.has(id)) {
        newSelected.delete(id)
      } else {
        newSelected.add(id)
      }
      return { ...prev, selectedRecommendations: newSelected }
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    setWizardState(prev => ({
      ...prev,
      selectedRecommendations: new Set(prev.recommendations.map(r => r.id))
    }))
  }, [])

  const handleSelectNone = useCallback(() => {
    setWizardState(prev => ({
      ...prev,
      selectedRecommendations: new Set()
    }))
  }, [])

  const handleApplyChanges = useCallback(async () => {
    setWizardState(prev => ({ ...prev, isProcessing: true }))
    
    try {
      const selectedRecs = wizardState.recommendations.filter(rec =>
        wizardState.selectedRecommendations.has(rec.id)
      )
      
      // Apply recommendations to settings
      const newSettings = { ...currentSettings }
      
      selectedRecs.forEach(rec => {
        if (!newSettings[rec.category]) {
          newSettings[rec.category] = {}
        }
        newSettings[rec.category][rec.settingKey] = rec.recommendedValue
      })
      
      onSettingsChange(newSettings)
      onComplete(selectedRecs)
    } catch (error) {
      console.error('Failed to apply changes:', error)
    } finally {
      setWizardState(prev => ({ ...prev, isProcessing: false }))
    }
  }, [wizardState.recommendations, wizardState.selectedRecommendations, currentSettings, onSettingsChange, onComplete])

  const canGoNext = () => {
    switch (wizardState.currentStep) {
      case 0: return !!wizardState.detectedContext && !wizardState.isProcessing
      case 1: return true
      case 2: return wizardState.selectedRecommendations.size > 0
      default: return false
    }
  }

  const canGoPrev = () => {
    return wizardState.currentStep > 0 && !wizardState.isProcessing
  }

  const handleNext = () => {
    if (canGoNext()) {
      setWizardState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }))
    }
  }

  const handlePrev = () => {
    if (canGoPrev()) {
      setWizardState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }))
    }
  }

  const CurrentStepComponent = steps[wizardState.currentStep].component

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <SparklesIcon className="w-12 h-12 mx-auto text-purple-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Smart Configuration Wizard
        </h2>
        <p className="text-gray-600">
          Let us help you optimize your parking management system configuration
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          {steps.map((step, index) => {
            const isActive = index === wizardState.currentStep
            const isCompleted = index < wizardState.currentStep
            const StepIcon = step.icon

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-200
                    ${isActive 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : isCompleted 
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'bg-gray-100 border-gray-300 text-gray-400'
                    }
                  `}>
                    {isCompleted ? (
                      <CheckCircleIcon className="w-6 h-6" />
                    ) : (
                      <StepIcon className="w-6 h-6" />
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <div className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-600'}`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {step.description}
                    </div>
                  </div>
                </div>
                
                {index < steps.length - 1 && (
                  <ChevronRightIcon className="w-5 h-5 text-gray-300" />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={wizardState.currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <CurrentStepComponent
              context={wizardState.detectedContext}
              onContextDetected={handleContextDetected}
              isLoading={wizardState.isProcessing}
              recommendations={wizardState.recommendations}
              selectedRecommendations={wizardState.selectedRecommendations}
              onToggleRecommendation={handleToggleRecommendation}
              onSelectAll={handleSelectAll}
              onSelectNone={handleSelectNone}
              selectedRecommendations={wizardState.recommendations.filter(rec =>
                wizardState.selectedRecommendations.has(rec.id)
              )}
              appliedSettings={wizardState.appliedSettings}
              onApply={handleApplyChanges}
              isApplying={wizardState.isProcessing}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>

        <div className="flex space-x-3">
          <button
            onClick={handlePrev}
            disabled={!canGoPrev()}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {wizardState.currentStep < steps.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canGoNext()}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <span>Next</span>
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleApplyChanges}
              disabled={wizardState.selectedRecommendations.size === 0 || wizardState.isProcessing}
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {wizardState.isProcessing && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
              <span>Complete Setup</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default SmartConfigurationWizard