/**
 * UI Theme Settings Tab
 * Manages colors, fonts, and visual appearance
 */

import React, { useState, useCallback } from 'react'
import {
  PaintBrushIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  EyeIcon,
  SwatchIcon
} from '@heroicons/react/24/outline'
import { useThemeSettings } from '../../../hooks/useSettings'
import { useThemeContext } from '../../../contexts/ThemeContext'
import { SettingsCard } from './SettingsCard'
import { SettingsField } from './SettingsField'
import { SettingsSection } from './SettingsSection'
import { AccessibilityToggle } from '../../ui/ThemeToggle'
import type { UIThemeSettings } from '../../../types/settings'

interface UIThemeTabProps {
  onSettingChange?: (key: string, value: any) => void
  className?: string
}


export function UIThemeTab({
  onSettingChange,
  className = ''
}: UIThemeTabProps) {
  const { settings, loading, error, updateSetting, reset } = useThemeSettings()
  const themeContext = useThemeContext()
  const [localChanges, setLocalChanges] = useState<Partial<UIThemeSettings>>({})
  const [previewMode, setPreviewMode] = useState(false)

  const handleLocalChange = useCallback((key: keyof UIThemeSettings, value: any) => {
    setLocalChanges(prev => ({ ...prev, [key]: value }))
    onSettingChange?.(key, value)
  }, [onSettingChange])

  const handleSave = useCallback(async () => {
    try {
      console.log('🎨 UIThemeTab: Starting save process...', localChanges)
      for (const [key, value] of Object.entries(localChanges)) {
        console.log(`🎨 UIThemeTab: Saving ${key} = ${value}`)
        await updateSetting(key, value)
        console.log(`🎨 UIThemeTab: Successfully saved ${key}`)
      }
      setLocalChanges({})
      console.log('🎨 UIThemeTab: Save completed successfully!')
    } catch (error) {
      console.error('🎨 UIThemeTab: Failed to save UI theme settings:', error)
    }
  }, [localChanges, updateSetting])

  const getCurrentValue = useCallback(<K extends keyof UIThemeSettings>(
    key: K
  ): UIThemeSettings[K] => {
    return (localChanges[key] ?? settings[key]) as UIThemeSettings[K]
  }, [localChanges, settings])

  const primaryColor = getCurrentValue('primary_color') || '#2563eb'
  const secondaryColor = getCurrentValue('secondary_color') || '#64748b'
  const successColor = getCurrentValue('success_color') || '#10b981'
  const warningColor = getCurrentValue('warning_color') || '#f59e0b'
  const dangerColor = getCurrentValue('danger_color') || '#ef4444'
  const darkMode = getCurrentValue('dark_mode') || false

  const hasChanges = Object.keys(localChanges).length > 0

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
              Error loading UI theme settings
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
          <PaintBrushIcon className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">UI Theme Settings</h2>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md ${
              previewMode 
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <EyeIcon className="w-4 h-4 mr-2" />
            Preview
          </button>
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

      {/* Color Scheme Section */}
      <SettingsCard
        title="Color Scheme"
        description="Configure the primary colors for your application"
        icon={SwatchIcon}
      >
        <SettingsSection title="Brand Colors">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SettingsField
              label="Primary Color"
              type="color"
              value={primaryColor}
              onChange={(value) => handleLocalChange('primary_color', value)}
              description="Main brand color for buttons, links, and highlights"
            />
            <SettingsField
              label="Secondary Color"
              type="color"
              value={secondaryColor}
              onChange={(value) => handleLocalChange('secondary_color', value)}
              description="Secondary brand color for subtle elements"
            />
          </div>
        </SettingsSection>

        <SettingsSection title="Status Colors">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SettingsField
              label="Success Color"
              type="color"
              value={successColor}
              onChange={(value) => handleLocalChange('success_color', value)}
              description="For success messages and positive actions"
            />
            <SettingsField
              label="Warning Color"
              type="color"
              value={warningColor}
              onChange={(value) => handleLocalChange('warning_color', value)}
              description="For warnings and caution messages"
            />
            <SettingsField
              label="Danger Color"
              type="color"
              value={dangerColor}
              onChange={(value) => handleLocalChange('danger_color', value)}
              description="For errors and destructive actions"
            />
          </div>
        </SettingsSection>
      </SettingsCard>

      {/* Theme Mode Section */}
      <SettingsCard
        title="Theme Mode"
        description="Configure light/dark mode preferences"
        icon={darkMode ? MoonIcon : SunIcon}
      >
        <SettingsSection title="Appearance">
          <div className="space-y-4">
            <SettingsField
              label="Dark Mode"
              type="toggle"
              value={darkMode}
              onChange={(value) => handleLocalChange('dark_mode', value)}
              description="Enable dark mode for better viewing in low light"
            />
            
            <SettingsField
              label="Theme Mode"
              type="select"
              value={getCurrentValue('theme_mode') || 'auto'}
              onChange={(value) => handleLocalChange('theme_mode', value)}
              description="Auto mode follows your system preferences"
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'auto', label: 'Auto' }
              ]}
            />

            {/* Current Theme Context Status */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Current Theme Status
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Active Theme:</span>
                  <span className="ml-2 font-medium capitalize text-gray-900 dark:text-gray-100">
                    {themeContext.effectiveTheme}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">System Prefers:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                    {themeContext.systemPreferences.prefersDark ? 'Dark' : 'Light'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Font Size:</span>
                  <span className="ml-2 font-medium capitalize text-gray-900 dark:text-gray-100">
                    {themeContext.preferences.fontSize}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">High Contrast:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                    {themeContext.isHighContrast ? 'On' : 'Off'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </SettingsSection>
      </SettingsCard>

      {/* Accessibility Settings Section */}
      <SettingsCard
        title="Accessibility Settings"
        description="Configure accessibility features for better usability"
        icon={EyeIcon}
      >
        <SettingsSection title="Visual Preferences">
          <AccessibilityToggle />
        </SettingsSection>
      </SettingsCard>

      {/* Preview Section */}
      {previewMode && (
        <SettingsCard
          title="Theme Preview"
          description="Preview how your theme settings will look"
          icon={EyeIcon}
        >
          <div className="space-y-4">
            <div className="p-4 border rounded-lg" style={{ backgroundColor: primaryColor + '10' }}>
              <h3 className="font-medium" style={{ color: primaryColor }}>
                Primary Color Preview
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                This is how primary colored elements will appear
              </p>
              <div className="flex space-x-2 mt-3">
                <button 
                  className="px-4 py-2 rounded text-white text-sm"
                  style={{ backgroundColor: primaryColor }}
                >
                  Primary Button
                </button>
                <button 
                  className="px-4 py-2 rounded border text-sm"
                  style={{ borderColor: primaryColor, color: primaryColor }}
                >
                  Secondary Button
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { color: successColor, label: 'Success', type: 'success' },
                { color: warningColor, label: 'Warning', type: 'warning' },
                { color: dangerColor, label: 'Error', type: 'error' }
              ].map(({ color, label, type }) => (
                <div 
                  key={type}
                  className="p-3 rounded border"
                  style={{ backgroundColor: color + '15', borderColor: color + '40' }}
                >
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm font-medium" style={{ color: color }}>
                      {label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {type} message styling
                  </p>
                </div>
              ))}
            </div>
          </div>
        </SettingsCard>
      )}
    </div>
  )
}