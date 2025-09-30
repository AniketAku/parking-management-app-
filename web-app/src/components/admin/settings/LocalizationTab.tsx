/**
 * Localization Settings Tab
 * Manages language, currency, date/time formats, and regional settings
 */

import React, { useState, useCallback } from 'react'
import {
  GlobeAltIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CalendarIcon,
  LanguageIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'
import { useLocalizationSettings } from '../../../hooks/useSettings'
import { SettingsCard } from './SettingsCard'
import { SettingsField } from './SettingsField'
import { SettingsSection } from './SettingsSection'
import type { LocalizationSettings } from '../../../types/settings'

interface LocalizationTabProps {
  onSettingChange?: (key: string, value: any) => void
  className?: string
}

const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'Indian Rupee (₹)', symbol: '₹' },
  { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
  { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
  { value: 'JPY', label: 'Japanese Yen (¥)', symbol: '¥' },
  { value: 'CAD', label: 'Canadian Dollar (C$)', symbol: 'C$' },
  { value: 'AUD', label: 'Australian Dollar (A$)', symbol: 'A$' },
]

const LOCALE_OPTIONS = [
  { value: 'en-IN', label: 'English (India)', example: '₹1,23,456.78' },
  { value: 'en-US', label: 'English (United States)', example: '$123,456.78' },
  { value: 'en-GB', label: 'English (United Kingdom)', example: '£123,456.78' },
  { value: 'hi-IN', label: 'हिन्दी (भारत)', example: '₹1,23,456.78' },
  { value: 'mr-IN', label: 'मराठी (भारत)', example: '₹1,23,456.78' },
  { value: 'ta-IN', label: 'தமிழ் (இந்தியா)', example: '₹1,23,456.78' },
  { value: 'te-IN', label: 'తెలుగు (భారతదేశం)', example: '₹1,23,456.78' },
  { value: 'gu-IN', label: 'ગુજરાતી (ભારત)', example: '₹1,23,456.78' },
]

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)', offset: '+05:30' },
  { value: 'America/New_York', label: 'Eastern Time (EST/EDT)', offset: '-05:00/-04:00' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT/BST)', offset: '+00:00/+01:00' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)', offset: '+09:00' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AEST/AEDT)', offset: '+10:00/+11:00' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)', offset: '-08:00/-07:00' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)', offset: '+04:00' },
  { value: 'Asia/Singapore', label: 'Singapore Standard Time (SGT)', offset: '+08:00' },
]

const DATE_FORMAT_OPTIONS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '31/12/2024' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '12/31/2024' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2024-12-31' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY', example: '31-12-2024' },
  { value: 'MMM DD, YYYY', label: 'MMM DD, YYYY', example: 'Dec 31, 2024' },
  { value: 'DD MMM YYYY', label: 'DD MMM YYYY', example: '31 Dec 2024' },
]

export function LocalizationTab({
  onSettingChange,
  className = ''
}: LocalizationTabProps) {
  const { settings, loading, error, updateSetting, reset } = useLocalizationSettings()
  const [localChanges, setLocalChanges] = useState<Partial<LocalizationSettings>>({})

  const handleLocalChange = useCallback((key: keyof LocalizationSettings, value: any) => {
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
      console.error('Failed to save localization settings:', error)
    }
  }, [localChanges, updateSetting])

  const getCurrentValue = useCallback(<K extends keyof LocalizationSettings>(
    key: K
  ): LocalizationSettings[K] => {
    return (localChanges[key] ?? settings[key]) as LocalizationSettings[K]
  }, [localChanges, settings])

  const defaultLocale = getCurrentValue('default_locale') || 'en-IN'
  const currencyCode = getCurrentValue('currency_code') || 'INR'
  const currencySymbol = getCurrentValue('currency_symbol') || '₹'
  const dateFormat = getCurrentValue('date_format') || 'DD/MM/YYYY'
  const timeFormat = getCurrentValue('time_format') || '12'
  const timezone = getCurrentValue('timezone') || 'Asia/Kolkata'

  const hasChanges = Object.keys(localChanges).length > 0

  // Handle currency change - update both code and symbol
  const handleCurrencyChange = useCallback((currencyCode: string) => {
    const currency = CURRENCY_OPTIONS.find(c => c.value === currencyCode)
    if (currency) {
      handleLocalChange('currency_code', currencyCode)
      handleLocalChange('currency_symbol', currency.symbol)
    }
  }, [handleLocalChange])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading localization settings
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Save/Reset */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <GlobeAltIcon className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Localization Settings</h2>
        </div>
        <div className="flex items-center space-x-3">
          {hasChanges && (
            <>
              <button
                onClick={() => setLocalChanges({})}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Language & Locale */}
      <SettingsCard
        title="Language & Regional Settings"
        description="Configure language, locale, and regional formatting preferences"
        icon={LanguageIcon}
      >
        <SettingsSection title="Locale Settings">
          <div className="space-y-6">
            <SettingsField
              label="Default Locale"
              type="select"
              value={defaultLocale}
              onChange={(value) => handleLocalChange('default_locale', value)}
              options={LOCALE_OPTIONS.map(locale => ({
                value: locale.value,
                label: `${locale.label} (${locale.example})`
              }))}
              description="Primary language and regional formatting for the application"
            />

            <SettingsField
              label="Timezone"
              type="select"
              value={timezone}
              onChange={(value) => handleLocalChange('timezone', value)}
              options={TIMEZONE_OPTIONS.map(tz => ({
                value: tz.value,
                label: `${tz.label} (${tz.offset})`
              }))}
              description="Default timezone for displaying dates and times"
            />
          </div>
        </SettingsSection>
      </SettingsCard>

      {/* Currency Settings */}
      <SettingsCard
        title="Currency Settings"
        description="Configure currency display and formatting"
        icon={CurrencyDollarIcon}
      >
        <SettingsSection title="Currency Configuration">
          <div className="space-y-6">
            <SettingsField
              label="Currency"
              type="select"
              value={currencyCode}
              onChange={handleCurrencyChange}
              options={CURRENCY_OPTIONS.map(currency => ({
                value: currency.value,
                label: currency.label
              }))}
              description="Primary currency for pricing and payments"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SettingsField
                label="Currency Code"
                type="text"
                value={currencyCode}
                onChange={(value) => handleLocalChange('currency_code', value)}
                description="ISO currency code (e.g., INR, USD, EUR)"
                disabled
              />

              <SettingsField
                label="Currency Symbol"
                type="text"
                value={currencySymbol}
                onChange={(value) => handleLocalChange('currency_symbol', value)}
                description="Symbol displayed with amounts"
              />
            </div>

            {/* Currency Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Currency Preview</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Small amount:</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat(defaultLocale, {
                      style: 'currency',
                      currency: currencyCode
                    }).format(50)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Large amount:</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat(defaultLocale, {
                      style: 'currency',
                      currency: currencyCode
                    }).format(123456.78)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </SettingsSection>
      </SettingsCard>

      {/* Date & Time Formats */}
      <SettingsCard
        title="Date & Time Formats"
        description="Configure how dates and times are displayed"
        icon={CalendarIcon}
      >
        <SettingsSection title="Format Configuration">
          <div className="space-y-6">
            <SettingsField
              label="Date Format"
              type="select"
              value={dateFormat}
              onChange={(value) => handleLocalChange('date_format', value)}
              options={DATE_FORMAT_OPTIONS.map(format => ({
                value: format.value,
                label: `${format.label} (${format.example})`
              }))}
              description="Format for displaying dates throughout the application"
            />

            <SettingsField
              label="Time Format"
              type="select"
              value={timeFormat}
              onChange={(value) => handleLocalChange('time_format', value)}
              options={[
                { value: '12', label: '12-hour (2:30 PM)' },
                { value: '24', label: '24-hour (14:30)' }
              ]}
              description="Format for displaying times"
            />

            {/* Date/Time Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Date & Time Preview</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current date:</span>
                  <span className="font-medium">
                    {new Intl.DateTimeFormat(defaultLocale, {
                      timeZone: timezone,
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    }).format(new Date())}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Current time:</span>
                  <span className="font-medium">
                    {new Intl.DateTimeFormat(defaultLocale, {
                      timeZone: timezone,
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: timeFormat === '12'
                    }).format(new Date())}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date & time:</span>
                  <span className="font-medium">
                    {new Intl.DateTimeFormat(defaultLocale, {
                      timeZone: timezone,
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: timeFormat === '12'
                    }).format(new Date())}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </SettingsSection>
      </SettingsCard>

      {/* Regional Information */}
      <SettingsCard
        title="Regional Information"
        description="Current locale and formatting information"
        icon={MapPinIcon}
      >
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-3">Locale Information</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• Locale settings affect number, currency, and date formatting</p>
            <p>• Changes will be reflected across the entire application</p>
            <p>• User-specific locale preferences can override these defaults</p>
            <p>• Some formatting may require a page refresh to take effect</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-50 rounded p-3">
            <div className="font-medium text-gray-900">Current Locale</div>
            <div className="text-gray-600 mt-1">{defaultLocale}</div>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <div className="font-medium text-gray-900">Timezone</div>
            <div className="text-gray-600 mt-1">{timezone}</div>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <div className="font-medium text-gray-900">Currency</div>
            <div className="text-gray-600 mt-1">{currencyCode} ({currencySymbol})</div>
          </div>
        </div>
      </SettingsCard>
    </div>
  )
}