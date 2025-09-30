// Accessibility Settings Component
// Provides UI for users to configure accessibility preferences

import React, { useState } from 'react'
import { useTheme } from '../../hooks/useTheme'
import { AccessibleTextInput, AccessibleSelect } from '../ui/AccessibleInput'
import { ARIA_LABELS } from '../../utils/accessibility'

interface AccessibilitySettingsProps {
  onClose?: () => void
  className?: string
}

export const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({
  onClose,
  className = '',
}) => {
  const {
    preferences,
    systemPreferences,
    effectiveTheme,
    effectiveMotion,
    setTheme,
    setFontSize,
    setMotionPreference,
    toggleHighContrast,
    toggleReducedTransparency,
    setColorBlindnessFilter,
    resetToDefaults,
  } = useTheme()

  const [activeTab, setActiveTab] = useState<'visual' | 'motion' | 'assistance'>('visual')

  const themeOptions = [
    { value: 'light', label: 'Light theme' },
    { value: 'dark', label: 'Dark theme' },
    { value: 'high-contrast', label: 'High contrast theme' },
  ]

  const fontSizeOptions = [
    { value: 'small', label: 'Small (87.5%)' },
    { value: 'medium', label: 'Medium (100%)' },
    { value: 'large', label: 'Large (112.5%)' },
    { value: 'extra-large', label: 'Extra Large (125%)' },
  ]

  const motionOptions = [
    { value: 'auto', label: 'Follow system preference' },
    { value: 'no-preference', label: 'Enable animations' },
    { value: 'reduce', label: 'Reduce motion' },
  ]

  const colorBlindnessOptions = [
    { value: 'none', label: 'No filter' },
    { value: 'protanopia', label: 'Protanopia (Red-blind)' },
    { value: 'deuteranopia', label: 'Deuteranopia (Green-blind)' },
    { value: 'tritanopia', label: 'Tritanopia (Blue-blind)' },
  ]

  const handleReset = () => {
    if (confirm('Reset all accessibility settings to defaults?')) {
      resetToDefaults()
    }
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl mx-auto ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 
          id="accessibility-settings-title"
          className="text-2xl font-bold text-gray-900 dark:text-white"
        >
          Accessibility Settings
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={ARIA_LABELS.CLOSE}
          >
            <span className="text-xl" aria-hidden="true">×</span>
          </button>
        )}
      </div>

      {/* Current Status */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="font-semibold mb-2">Current Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-300">Theme:</span>
            <span className="ml-2 font-medium capitalize">{effectiveTheme}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-300">Font Size:</span>
            <span className="ml-2 font-medium capitalize">{preferences.fontSize}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-300">Motion:</span>
            <span className="ml-2 font-medium">
              {effectiveMotion === 'reduce' ? 'Reduced' : 'Normal'}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-300">High Contrast:</span>
            <span className="ml-2 font-medium">
              {preferences.highContrast ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-600 mb-6">
        <nav className="-mb-px flex space-x-8" role="tablist">
          {[
            { id: 'visual', label: 'Visual', icon: '👁️' },
            { id: 'motion', label: 'Motion', icon: '🎬' },
            { id: 'assistance', label: 'Assistance', icon: '🤝' },
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              className={`py-2 px-1 border-b-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
              onClick={() => setActiveTab(tab.id as any)}
            >
              <span className="mr-2" aria-hidden="true">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        {/* Visual Settings */}
        <div
          id="visual-panel"
          role="tabpanel"
          aria-labelledby="visual-tab"
          className={activeTab === 'visual' ? 'block' : 'hidden'}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AccessibleSelect
              label="Theme"
              value={preferences.theme}
              onChange={(value) => setTheme(value as any)}
              options={themeOptions}
              help="Choose your preferred color theme"
            />

            <AccessibleSelect
              label="Font Size"
              value={preferences.fontSize}
              onChange={(value) => setFontSize(value as any)}
              options={fontSizeOptions}
              help="Adjust text size for better readability"
            />

            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="high-contrast"
                  type="checkbox"
                  checked={preferences.highContrast}
                  onChange={toggleHighContrast}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="high-contrast" className="ml-2 text-sm text-gray-900 dark:text-white">
                  Enable high contrast mode
                </label>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Increases contrast between text and background colors
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="reduced-transparency"
                  type="checkbox"
                  checked={preferences.reducedTransparency}
                  onChange={toggleReducedTransparency}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="reduced-transparency" className="ml-2 text-sm text-gray-900 dark:text-white">
                  Reduce transparency
                </label>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Makes overlays and backgrounds more opaque
              </p>
            </div>
          </div>

          <div className="mt-6">
            <AccessibleSelect
              label="Color Blindness Support"
              value={preferences.colorBlindnessFilter}
              onChange={(value) => setColorBlindnessFilter(value as any)}
              options={colorBlindnessOptions}
              help="Apply filters to assist with color vision differences"
            />
          </div>
        </div>

        {/* Motion Settings */}
        <div
          id="motion-panel"
          role="tabpanel"
          aria-labelledby="motion-tab"
          className={activeTab === 'motion' ? 'block' : 'hidden'}
        >
          <div className="space-y-6">
            <AccessibleSelect
              label="Animation Preference"
              value={preferences.motionPreference}
              onChange={(value) => setMotionPreference(value as any)}
              options={motionOptions}
              help="Control animations and transitions"
            />

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                System Preferences Detected
              </h4>
              <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <div>
                  <span className="font-medium">Dark Mode:</span>
                  <span className="ml-2">{systemPreferences.prefersDark ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div>
                  <span className="font-medium">Reduced Motion:</span>
                  <span className="ml-2">{systemPreferences.prefersReducedMotion ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div>
                  <span className="font-medium">High Contrast:</span>
                  <span className="ml-2">{systemPreferences.prefersHighContrast ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Motion Effects Preview</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-500 rounded-lg mx-auto mb-2 animate-bounce"></div>
                  <span className="text-sm">Bounce</span>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500 rounded-lg mx-auto mb-2 animate-pulse"></div>
                  <span className="text-sm">Pulse</span>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-500 rounded-lg mx-auto mb-2 animate-spin"></div>
                  <span className="text-sm">Spin</span>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Preview how animations appear with your current settings
              </p>
            </div>
          </div>
        </div>

        {/* Assistance Settings */}
        <div
          id="assistance-panel"
          role="tabpanel"
          aria-labelledby="assistance-tab"
          className={activeTab === 'assistance' ? 'block' : 'hidden'}
        >
          <div className="space-y-6">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                🎯 Keyboard Navigation
              </h4>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                Navigate the interface using keyboard shortcuts:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <kbd className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs">Tab</kbd>
                  <span className="ml-2">Next element</span>
                </div>
                <div>
                  <kbd className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs">Shift+Tab</kbd>
                  <span className="ml-2">Previous element</span>
                </div>
                <div>
                  <kbd className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs">Enter</kbd>
                  <span className="ml-2">Activate button/link</span>
                </div>
                <div>
                  <kbd className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs">Esc</kbd>
                  <span className="ml-2">Close modal/menu</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                🔊 Screen Reader Support
              </h4>
              <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                This application is optimized for screen readers with:
              </p>
              <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                <li>• Semantic HTML structure and ARIA labels</li>
                <li>• Live regions for dynamic content updates</li>
                <li>• Proper heading hierarchy and landmarks</li>
                <li>• Descriptive alt text for images and icons</li>
                <li>• Form validation announcements</li>
              </ul>
            </div>

            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">
                ⚡ Performance Notes
              </h4>
              <p className="text-sm text-purple-800 dark:text-purple-200">
                Accessibility features may slightly impact performance. Settings are automatically 
                saved and will persist across sessions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
        >
          Reset to Defaults
        </button>
        
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Settings are automatically saved
        </div>
      </div>
    </div>
  )
}

export default AccessibilitySettings