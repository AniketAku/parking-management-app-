/**
 * Business Rules Configuration Tab
 * Comprehensive UI for managing business rules and rate configurations
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  CurrencyDollarIcon,
  ClockIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  CreditCardIcon,
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { BusinessRulesEngine } from '../../../services/businessRulesEngine'
import { BusinessRulesValidator } from '../../../services/businessRulesValidator'
import type {
  ParkingRateConfig,
  TimeBasedModifier,
  PromotionRule,
  BusinessRulesEngine as EngineConfig,
  BusinessRuleValidation,
  FeeCalculationResult
} from '../../../types/businessRules'

interface BusinessRulesTabProps {
  onSave?: () => void
  className?: string
}

type ActiveTab = 'rates' | 'modifiers' | 'promotions' | 'engine' | 'preview'

export function BusinessRulesTab({ onSave, className = '' }: BusinessRulesTabProps) {
  // State management
  const [activeTab, setActiveTab] = useState<ActiveTab>('rates')
  const [rulesEngine] = useState(() => new BusinessRulesEngine())
  const [validator] = useState(() => new BusinessRulesValidator())
  const [rates, setRates] = useState<ParkingRateConfig[]>([])
  const [modifiers, setModifiers] = useState<TimeBasedModifier[]>([])
  const [promotions, setPromotions] = useState<PromotionRule[]>([])
  const [engineConfig, setEngineConfig] = useState<EngineConfig | null>(null)
  const [validation, setValidation] = useState<BusinessRuleValidation | null>(null)
  const [previewResult, setPreviewResult] = useState<FeeCalculationResult | null>(null)
  
  // Form states
  const [editingRate, setEditingRate] = useState<ParkingRateConfig | null>(null)
  const [showAddRateForm, setShowAddRateForm] = useState(false)
  const [showAddModifierForm, setShowAddModifierForm] = useState(false)
  const [showAddPromotionForm, setShowAddPromotionForm] = useState(false)
  
  // Preview form
  const [previewForm, setPreviewForm] = useState({
    vehicleType: 'Trailer',
    entryTime: '',
    exitTime: '',
    location: ''
  })

  // Initialize data
  useEffect(() => {
    loadBusinessRules()
  }, [])

  const loadBusinessRules = useCallback(() => {
    setRates(rulesEngine.getRateConfigs())
    setEngineConfig(rulesEngine.getEngineConfig())
    validateSystem()
  }, [rulesEngine])

  const validateSystem = useCallback(() => {
    const context = {
      allRates: rulesEngine.getRateConfigs(),
      allModifiers: modifiers,
      allPromotions: promotions,
      engineConfig: rulesEngine.getEngineConfig()
    }
    
    const validationResult = validator.validateCompleteSystem(context)
    setValidation(validationResult)
  }, [validator, rulesEngine, modifiers, promotions])

  // Rate management
  const handleAddRate = useCallback((rateConfig: Omit<ParkingRateConfig, 'createdAt' | 'updatedAt'>) => {
    const newRate: ParkingRateConfig = {
      ...rateConfig,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    rulesEngine.addRateConfig(newRate)
    loadBusinessRules()
    setShowAddRateForm(false)
  }, [rulesEngine, loadBusinessRules])

  const handleUpdateRate = useCallback((vehicleType: string, updates: Partial<ParkingRateConfig>) => {
    rulesEngine.updateRateConfig(vehicleType, updates)
    loadBusinessRules()
    setEditingRate(null)
  }, [rulesEngine, loadBusinessRules])

  const handleDeleteRate = useCallback((vehicleType: string) => {
    // In production, would call rulesEngine.deleteRateConfig()
    loadBusinessRules()
  }, [loadBusinessRules])

  // Preview calculation
  const handlePreviewCalculation = useCallback(() => {
    if (!previewForm.entryTime || !previewForm.exitTime) {
      alert('Please fill in entry and exit times')
      return
    }

    try {
      const result = rulesEngine.calculateFee(
        previewForm.vehicleType,
        previewForm.entryTime,
        previewForm.exitTime,
        previewForm.location || undefined
      )
      setPreviewResult(result)
      
      // Validate the calculation
      const calcValidation = validator.validateFeeCalculation(result)
      if (!calcValidation.isValid) {
        console.warn('Calculation validation issues:', calcValidation)
      }
    } catch (error) {
      alert(`Calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [rulesEngine, validator, previewForm])

  return (
    <div className={`business-rules-tab ${className}`}>
      {/* Header with validation status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Business Rules Configuration</h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage parking rates, modifiers, promotions, and business logic
              </p>
            </div>
            
            {/* Validation status */}
            <div className="flex items-center space-x-4">
              {validation && (
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                  validation.isValid 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {validation.isValid ? (
                    <CheckCircleIcon className="w-4 h-4" />
                  ) : (
                    <XCircleIcon className="w-4 h-4" />
                  )}
                  <span>
                    {validation.isValid ? 'Valid Configuration' : `${validation.errors.length} Errors`}
                  </span>
                </div>
              )}
              
              <button
                onClick={onSave}
                className="btn-primary px-4 py-2 text-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6">
          <div className="flex space-x-8 -mb-px">
            {[
              { key: 'rates', label: 'Vehicle Rates', icon: TruckIcon },
              { key: 'modifiers', label: 'Time Modifiers', icon: ClockIcon },
              { key: 'promotions', label: 'Promotions', icon: CreditCardIcon },
              { key: 'engine', label: 'Engine Config', icon: ArrowPathIcon },
              { key: 'preview', label: 'Preview & Test', icon: CalendarIcon }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as ActiveTab)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Vehicle Rates Tab */}
        {activeTab === 'rates' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Vehicle Type Rates</h3>
                <p className="text-sm text-gray-600">Configure base rates for different vehicle types</p>
              </div>
              <button
                onClick={() => setShowAddRateForm(true)}
                className="btn-primary px-4 py-2 text-sm flex items-center space-x-2"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add Rate</span>
              </button>
            </div>

            {/* Rates List */}
            <div className="space-y-4">
              {rates.map(rate => (
                <div key={rate.vehicleType} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h4 className="font-medium text-gray-900">{rate.vehicleType}</h4>
                          <p className="text-sm text-gray-600">{rate.description}</p>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                          ₹{rate.baseRate}/day
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
                        <div>
                          <span className="text-gray-500">Category:</span>
                          <span className="ml-1 capitalize">{rate.category}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Min Charge:</span>
                          <span className="ml-1">₹{rate.minimumCharge}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Overstay:</span>
                          <span className="ml-1">{rate.overstayThresholdHours}h</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Penalty:</span>
                          <span className="ml-1">₹{rate.overstayPenaltyRate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingRate(rate)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit rate"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRate(rate.vehicleType)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete rate"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {!rate.isActive && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                      ⚠️ This rate configuration is inactive
                    </div>
                  )}
                </div>
              ))}

              {rates.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <TruckIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No vehicle rates configured. Add your first rate to get started.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preview & Test Tab */}
        {activeTab === 'preview' && (
          <div className="p-6">
            <div className="grid grid-cols-2 gap-8">
              {/* Preview Form */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Fee Calculation Preview</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vehicle Type
                    </label>
                    <select
                      value={previewForm.vehicleType}
                      onChange={(e) => setPreviewForm(prev => ({ ...prev, vehicleType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {rates.map(rate => (
                        <option key={rate.vehicleType} value={rate.vehicleType}>
                          {rate.vehicleType} (₹{rate.baseRate}/day)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Entry Time
                    </label>
                    <input
                      type="datetime-local"
                      value={previewForm.entryTime}
                      onChange={(e) => setPreviewForm(prev => ({ ...prev, entryTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Exit Time
                    </label>
                    <input
                      type="datetime-local"
                      value={previewForm.exitTime}
                      onChange={(e) => setPreviewForm(prev => ({ ...prev, exitTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location (Optional)
                    </label>
                    <input
                      type="text"
                      value={previewForm.location}
                      onChange={(e) => setPreviewForm(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter location for location-specific rates"
                    />
                  </div>

                  <button
                    onClick={handlePreviewCalculation}
                    className="w-full btn-primary py-3"
                  >
                    Calculate Fee
                  </button>
                </div>
              </div>

              {/* Preview Result */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Calculation Result</h3>
                
                {previewResult ? (
                  <div className="border rounded-lg p-6 bg-gray-50">
                    {/* Total Fee */}
                    <div className="text-center mb-6">
                      <div className="text-3xl font-bold text-blue-600">
                        ₹{previewResult.totalFee.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Total Parking Fee</div>
                    </div>

                    {/* Duration Info */}
                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-gray-600">Duration:</span>
                        <span className="ml-1 font-medium">{previewResult.durationHours.toFixed(1)} hours</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Charged Days:</span>
                        <span className="ml-1 font-medium">{previewResult.calculatedDays}</span>
                      </div>
                    </div>

                    {/* Fee Breakdown */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Base Fee:</span>
                        <span>₹{previewResult.baseFee}</span>
                      </div>
                      
                      {previewResult.modifierFees > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Time Modifiers:</span>
                          <span>₹{previewResult.modifierFees}</span>
                        </div>
                      )}
                      
                      {previewResult.overstayPenalty > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Overstay Penalty:</span>
                          <span>₹{previewResult.overstayPenalty}</span>
                        </div>
                      )}
                      
                      {previewResult.promotionDiscount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Promotion Discount:</span>
                          <span>-₹{previewResult.promotionDiscount}</span>
                        </div>
                      )}
                      
                      {previewResult.taxAmount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tax:</span>
                          <span>₹{previewResult.taxAmount}</span>
                        </div>
                      )}
                    </div>

                    {/* Status Flags */}
                    <div className="mt-4 pt-4 border-t space-y-2">
                      {previewResult.isOverstay && (
                        <div className="flex items-center space-x-2 text-red-600 text-sm">
                          <ExclamationTriangleIcon className="w-4 h-4" />
                          <span>Vehicle has overstayed</span>
                        </div>
                      )}
                      
                      {previewResult.hasPromotions && (
                        <div className="flex items-center space-x-2 text-green-600 text-sm">
                          <CheckCircleIcon className="w-4 h-4" />
                          <span>Promotions applied</span>
                        </div>
                      )}
                    </div>

                    {/* Calculation Details */}
                    <div className="mt-4 pt-4 border-t text-xs text-gray-500">
                      <div>Rate: ₹{previewResult.appliedRate}/day</div>
                      <div>Method: {previewResult.calculationMethod}</div>
                      <div>Calculated: {new Date(previewResult.calculationTimestamp).toLocaleString()}</div>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-500">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Fill in the form and click "Calculate Fee" to see the result</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Other tabs would be implemented similarly */}
      </div>

      {/* Validation Panel */}
      {validation && !validation.isValid && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800 mb-2">
                Configuration Issues ({validation.errors.length} errors, {validation.warnings.length} warnings)
              </h4>
              
              {validation.errors.length > 0 && (
                <div className="mb-3">
                  <div className="text-sm font-medium text-red-700 mb-1">Errors:</div>
                  <ul className="text-sm text-red-600 space-y-1">
                    {validation.errors.map((error, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-red-400">•</span>
                        <span>{error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-yellow-700 mb-1">Warnings:</div>
                  <ul className="text-sm text-yellow-600 space-y-1">
                    {validation.warnings.map((warning, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-yellow-400">•</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}