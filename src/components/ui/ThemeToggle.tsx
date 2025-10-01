import React from 'react'
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline'
import { useThemeContext } from '../../contexts/ThemeContext'
import type { Theme } from '../../hooks/useTheme'

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
  variant?: 'button' | 'dropdown'
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '',
  showLabel = false,
  variant = 'button'
}) => {
  const { 
    preferences,
    effectiveTheme,
    setTheme,
    isDark,
    getMotionClasses
  } = useThemeContext()

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
  }

  const getThemeIcon = (theme: Theme, size = 'w-5 h-5') => {
    switch (theme) {
      case 'dark':
        return <MoonIcon className={size} />
      case 'light':
        return <SunIcon className={size} />
      case 'high-contrast':
        return <ComputerDesktopIcon className={size} />
      default:
        return <SunIcon className={size} />
    }
  }

  const getThemeLabel = (theme: Theme) => {
    switch (theme) {
      case 'dark':
        return 'Dark'
      case 'light':
        return 'Light'
      case 'high-contrast':
        return 'High Contrast'
      default:
        return 'Light'
    }
  }

  if (variant === 'button') {
    // Simple toggle button between light/dark
    return (
      <button
        onClick={() => handleThemeChange(isDark ? 'light' : 'dark')}
        className={`
          group flex items-center justify-center p-2.5 rounded-xl
          text-gray-600 dark:text-gray-300
          hover:bg-gray-100/80 dark:hover:bg-gray-700/80 
          hover:text-gray-800 dark:hover:text-gray-100
          active:scale-95 hover:scale-105
          focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 dark:focus:ring-offset-gray-900
          border border-transparent hover:border-gray-200/50 dark:hover:border-gray-600/50
          backdrop-blur-sm shadow-sm hover:shadow-md
          ${getMotionClasses('transition-all duration-300 ease-out', 'transition-none')}
          ${className}
        `}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        {isDark ? (
          <SunIcon className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300 text-amber-500 dark:text-amber-400" />
        ) : (
          <MoonIcon className="w-5 h-5 group-hover:-rotate-12 transition-transform duration-300 text-slate-600 dark:text-slate-400" />
        )}
        {showLabel && (
          <span className="ml-2.5 text-sm font-medium group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors duration-200">
            {isDark ? 'Light' : 'Dark'}
          </span>
        )}
      </button>
    )
  }

  // Dropdown variant with all theme options
  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center space-x-1">
        {(['light', 'dark', 'high-contrast'] as Theme[]).map((theme) => (
          <button
            key={theme}
            onClick={() => handleThemeChange(theme)}
            className={`
              group flex items-center justify-center p-2.5 rounded-xl text-sm font-medium
              ${preferences.theme === theme
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 ring-2 ring-primary-500/20 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-700/60 hover:text-gray-800 dark:hover:text-gray-100 hover:shadow-sm'
              }
              focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 dark:focus:ring-offset-gray-900
              border border-transparent hover:border-gray-200/50 dark:hover:border-gray-600/30
              backdrop-blur-sm active:scale-95 hover:scale-105
              ${getMotionClasses('transition-all duration-300 ease-out', 'transition-none')}
            `}
            title={`Switch to ${getThemeLabel(theme)} mode`}
            aria-label={`Switch to ${getThemeLabel(theme)} mode`}
          >
            {getThemeIcon(theme)}
            {showLabel && (
              <span className="ml-2">
                {getThemeLabel(theme)}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// Accessibility settings toggle
export const AccessibilityToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const {
    preferences,
    toggleHighContrast,
    toggleReducedTransparency,
    setMotionPreference,
    setColorBlindnessFilter,
    isHighContrast,
    shouldReduceMotion,
    hasReducedTransparency
  } = useThemeContext()

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          High Contrast
        </label>
        <button
          onClick={toggleHighContrast}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full
            ${isHighContrast ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}
            transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          `}
          role="switch"
          aria-checked={isHighContrast}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200
              ${isHighContrast ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Reduce Motion
        </label>
        <button
          onClick={() => setMotionPreference(shouldReduceMotion ? 'auto' : 'reduce')}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full
            ${shouldReduceMotion ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}
            transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          `}
          role="switch"
          aria-checked={shouldReduceMotion}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200
              ${shouldReduceMotion ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Reduce Transparency
        </label>
        <button
          onClick={toggleReducedTransparency}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full
            ${hasReducedTransparency ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}
            transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          `}
          role="switch"
          aria-checked={hasReducedTransparency}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200
              ${hasReducedTransparency ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>
    </div>
  )
}