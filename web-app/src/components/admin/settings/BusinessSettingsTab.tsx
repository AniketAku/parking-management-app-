/**
 * Business Settings Tab
 * Manages parking rates, fees, penalties, and business rules
 */

import React, { useState, useCallback } from 'react'
import {
  CurrencyDollarIcon,
  ClockIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  CreditCardIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useBusinessSettings, useCurrencyFormatter } from '../../../hooks/useSettings'
import { SettingsCard } from './SettingsCard'
import { SettingsField } from './SettingsField'
import { SettingsSection } from './SettingsSection'
import type { BusinessSettings } from '../../../types/settings'

interface BusinessSettingsTabProps {
  onSettingChange?: (key: string, value: any) => void
  className?: string
}

export function BusinessSettingsTab({
  onSettingChange,
  className = ''
}: BusinessSettingsTabProps) {
  const { settings, loading, error, updateSetting, refresh } = useBusinessSettings()
  const { formatCurrency } = useCurrencyFormatter()
  const [localChanges, setLocalChanges] = useState<Partial<BusinessSettings>>({})

  const handleLocalChange = useCallback((key: keyof BusinessSettings, value: any) => {
    setLocalChanges(prev => ({ ...prev, [key]: value }))
    onSettingChange?.(key, value)
  }, [onSettingChange])

  const handleSave = useCallback(async () => {
    try {
      for (const [key, value] of Object.entries(localChanges)) {
        await updateSetting(key, value)
      }
      setLocalChanges({})
    } catch (error) {
      console.error('Failed to save business settings:', error)
    }
  }, [localChanges, updateSetting])

  const handleReset = useCallback(async () => {
    try {
      refresh()
      setLocalChanges({})
    } catch (error) {
      console.error('Failed to reset business settings:', error)
    }
  }, [refresh])

  const getCurrentValue = useCallback(<K extends keyof BusinessSettings>(
    key: K
  ): BusinessSettings[K] => {
    return (localChanges[key] ?? settings[key]) as BusinessSettings[K]
  }, [localChanges, settings])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Settings</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    )
  }

  const vehicleRates = getCurrentValue('vehicle_rates') || {
    'Trailer': 225,
    '6 Wheeler': 150,
    '4 Wheeler': 100,
    '2 Wheeler': 50
  }

  const operatingHours = getCurrentValue('operating_hours') || {
    start: '06:00',
    end: '22:00',
    timezone: 'Asia/Kolkata'
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Vehicle Rates Section */}
      <SettingsSection
        title="Vehicle Rates"
        description="Daily parking rates for different vehicle types"
        icon={CurrencyDollarIcon}
      >
        <SettingsCard>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(vehicleRates).map(([vehicleType, rate]) => (
              <SettingsField
                key={vehicleType}
                label={vehicleType}
                description={`Daily rate for ${vehicleType.toLowerCase()}`}
                type="number"
                value={rate}
                onChange={(value) => {
                  const newRates = { ...vehicleRates, [vehicleType]: Number(value) }
                  handleLocalChange('vehicle_rates', newRates)
                }}
                prefix="₹"
                min={0}
                step={25}
              />
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Rate Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {Object.entries(vehicleRates).map(([type, rate]) => (
                <div key={type} className="text-center">
                  <div className="font-medium text-blue-900">{type}</div>
                  <div className="text-blue-600">{formatCurrency(rate)}/day</div>
                </div>
              ))}
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>


      {/* Operating Hours */}
      <SettingsSection
        title="Operating Hours"
        description="Set daily operating hours and timezone"
        icon={ClockIcon}
      >
        <SettingsCard>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SettingsField
              label="Opening Time"
              description="Daily opening time"
              type="time"
              value={operatingHours.start}
              onChange={(value) => {
                const newHours = { ...operatingHours, start: value }
                handleLocalChange('operating_hours', newHours)
              }}
            />
            
            <SettingsField
              label="Closing Time"
              description="Daily closing time"
              type="time"
              value={operatingHours.end}
              onChange={(value) => {
                const newHours = { ...operatingHours, end: value }
                handleLocalChange('operating_hours', newHours)
              }}
            />
            
            <SettingsField
              label="Timezone"
              description="Operating timezone"
              type="select"
              value={operatingHours.timezone}
              onChange={(value) => {
                const newHours = { ...operatingHours, timezone: value }
                handleLocalChange('operating_hours', newHours)
              }}
              options={[
                { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
                { value: 'Asia/Mumbai', label: 'Asia/Mumbai (IST)' },
                { value: 'UTC', label: 'UTC' },
                { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
                { value: 'Europe/London', label: 'Europe/London (GMT/BST)' }
              ]}
            />
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* Payment Methods */}
      <SettingsSection
        title="Payment Methods"
        description="Configure available payment options"
        icon={CreditCardIcon}
      >
        <SettingsCard>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(getCurrentValue('payment_methods') || []).map((method: string, index: number) => (
                <div
                  key={index}
                  className="flex items-center p-3 border border-gray-200 rounded-md bg-gray-50"
                >
                  <CreditCardIcon className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-sm font-medium text-gray-900">{method}</span>
                </div>
              ))}
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <SettingsField
                label="Available Payment Methods"
                description="Select which payment methods to accept"
                type="multi-select"
                value={getCurrentValue('payment_methods') || []}
                onChange={(value) => handleLocalChange('payment_methods', value)}
                options={[
                  { value: 'Cash', label: 'Cash' },
                  { value: 'Credit Card', label: 'Credit Card' },
                  { value: 'Debit Card', label: 'Debit Card' },
                  { value: 'UPI', label: 'UPI' },
                  { value: 'Online', label: 'Online Banking' },
                  { value: 'Digital Wallet', label: 'Digital Wallet' },
                  { value: 'N/A', label: 'N/A (No Payment)' }
                ]}
              />
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* Vehicle Types */}
      <SettingsSection
        title="Vehicle Types"
        description="Configure supported vehicle categories"
        icon={TruckIcon}
      >
        <SettingsCard>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(getCurrentValue('vehicle_types') || []).map((type: string, index: number) => (
                <div
                  key={index}
                  className="flex items-center p-3 border border-gray-200 rounded-md"
                >
                  <TruckIcon className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-sm font-medium text-gray-900">{type}</span>
                </div>
              ))}
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <SettingsField
                label="Supported Vehicle Types"
                description="Define which vehicle types can park"
                type="multi-select"
                value={getCurrentValue('vehicle_types') || []}
                onChange={(value) => handleLocalChange('vehicle_types', value)}
                options={[
                  { value: 'Trailer', label: 'Trailer / Heavy Truck' },
                  { value: '6 Wheeler', label: '6 Wheeler / Medium Truck' },
                  { value: '4 Wheeler', label: '4 Wheeler / Car' },
                  { value: '2 Wheeler', label: '2 Wheeler / Motorcycle' },
                  { value: 'Bus', label: 'Bus' },
                  { value: 'Van', label: 'Van / Light Commercial' }
                ]}
              />
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* Status Options */}
      <SettingsSection
        title="Status Options"
        description="Configure available status values for entries and payments"
        icon={ArrowPathIcon}
      >
        <SettingsCard>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SettingsField
              label="Entry Status Options"
              description="Available status values for parking entries"
              type="multi-select"
              value={getCurrentValue('entry_status_options') || []}
              onChange={(value) => handleLocalChange('entry_status_options', value)}
              options={[
                { value: 'Parked', label: 'Parked' },
                { value: 'Exited', label: 'Exited' },
                { value: 'Overstay', label: 'Overstay' },
                { value: 'Reserved', label: 'Reserved' }
              ]}
            />
            
            <SettingsField
              label="Payment Status Options"
              description="Available payment status values"
              type="multi-select"
              value={getCurrentValue('payment_status_options') || []}
              onChange={(value) => handleLocalChange('payment_status_options', value)}
              options={[
                { value: 'Paid', label: 'Paid' },
                { value: 'Unpaid', label: 'Unpaid' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Refunded', label: 'Refunded' },
                { value: 'Partial', label: 'Partial Payment' }
              ]}
            />
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* Actions */}
      {Object.keys(localChanges).length > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {Object.keys(localChanges).length} unsaved changes
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default BusinessSettingsTab