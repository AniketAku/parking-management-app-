import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useThemeSettings } from '../hooks/useSettings'
import type { Theme, MotionPreference } from '../hooks/useTheme'
import { logger } from '../utils/enhancedLogger'

interface ThemeContextType {
  preferences: {
    theme: Theme
    fontSize: 'small' | 'medium' | 'large' | 'extra-large'
    motionPreference: MotionPreference
    highContrast: boolean
    reducedTransparency: boolean
    colorBlindnessFilter: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'
  }
  systemPreferences: {
    prefersDark: boolean
    prefersReducedMotion: boolean
    prefersHighContrast: boolean
    prefersReducedTransparency: boolean
  }
  effectiveTheme: Theme
  effectiveMotion: 'reduce' | 'no-preference'
  
  // Setters
  setTheme: (theme: Theme) => void
  setFontSize: (fontSize: 'small' | 'medium' | 'large' | 'extra-large') => void
  setMotionPreference: (motionPreference: MotionPreference) => void
  toggleHighContrast: () => void
  toggleReducedTransparency: () => void
  setColorBlindnessFilter: (filter: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia') => void
  resetToDefaults: () => void
  
  // Helpers
  getMotionClasses: (defaultClasses: string, reducedMotionClasses?: string) => string
  getContrastClasses: (normalClasses: string, highContrastClasses: string) => string
  
  // Computed values
  isDark: boolean
  isHighContrast: boolean
  shouldReduceMotion: boolean
  hasReducedTransparency: boolean
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export const useThemeContext = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { settings, updateSetting } = useThemeSettings()
  const [systemPreferences, setSystemPreferences] = useState({
    prefersDark: false,
    prefersReducedMotion: false,
    prefersHighContrast: false,
    prefersReducedTransparency: false,
  })

  // Detect system preferences
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
    const reducedTransparencyQuery = window.matchMedia('(prefers-reduced-transparency: reduce)')

    const updateSystemPreferences = () => {
      setSystemPreferences({
        prefersDark: darkModeQuery.matches,
        prefersReducedMotion: reducedMotionQuery.matches,
        prefersHighContrast: highContrastQuery.matches,
        prefersReducedTransparency: reducedTransparencyQuery.matches,
      })
    }

    updateSystemPreferences()
    
    darkModeQuery.addEventListener('change', updateSystemPreferences)
    reducedMotionQuery.addEventListener('change', updateSystemPreferences)
    highContrastQuery.addEventListener('change', updateSystemPreferences)
    reducedTransparencyQuery.addEventListener('change', updateSystemPreferences)

    return () => {
      darkModeQuery.removeEventListener('change', updateSystemPreferences)
      reducedMotionQuery.removeEventListener('change', updateSystemPreferences)
      highContrastQuery.removeEventListener('change', updateSystemPreferences)
      reducedTransparencyQuery.removeEventListener('change', updateSystemPreferences)
    }
  }, [])

  // Apply theme classes to document
  useEffect(() => {
    if (!settings) return

    const root = document.documentElement
    
    // Determine effective theme
    let effectiveTheme: Theme = 'light'
    
    if (settings.theme_mode === 'dark') {
      effectiveTheme = 'dark'
    } else if (settings.theme_mode === 'auto' && systemPreferences.prefersDark) {
      effectiveTheme = 'dark'  
    } else if (settings.dark_mode) {
      effectiveTheme = 'dark'
    }

    // Apply/remove dark class
    if (effectiveTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    logger.component('ThemeContext', 'Applied theme', { 
      effectiveTheme, 
      userSettings: settings ? 'loaded' : 'pending',
      systemPreferences 
    })
  }, [settings, systemPreferences])

  const preferences = {
    theme: (settings?.theme_mode === 'auto' && systemPreferences.prefersDark) ? 'dark' as Theme : 
           (settings?.dark_mode ? 'dark' as Theme : 'light' as Theme),
    fontSize: 'medium' as const,
    motionPreference: 'auto' as MotionPreference,
    highContrast: false,
    reducedTransparency: false,
    colorBlindnessFilter: 'none' as const,
  }

  const effectiveTheme: Theme = preferences.theme
  const effectiveMotion: 'reduce' | 'no-preference' = systemPreferences.prefersReducedMotion ? 'reduce' : 'no-preference'
  const isDark = effectiveTheme === 'dark'
  const isHighContrast = false
  const shouldReduceMotion = effectiveMotion === 'reduce'
  const hasReducedTransparency = false

  const setTheme = useCallback(async (theme: Theme) => {
    try {
      if (theme === 'dark') {
        await updateSetting('dark_mode', true)
        await updateSetting('theme_mode', 'dark')
      } else {
        await updateSetting('dark_mode', false)
        await updateSetting('theme_mode', 'light')
      }
    } catch (error) {
      console.error('Failed to update theme setting:', error)
    }
  }, [updateSetting])

  const setFontSize = useCallback((fontSize: 'small' | 'medium' | 'large' | 'extra-large') => {
    logger.component('ThemeContext', 'Font size changed', { fontSize })
  }, [])

  const setMotionPreference = useCallback((motionPreference: MotionPreference) => {
    logger.component('ThemeContext', 'Motion preference changed', { motionPreference })
  }, [])

  const toggleHighContrast = useCallback(() => {
    logger.component('ThemeContext', 'High contrast toggled')
  }, [])

  const toggleReducedTransparency = useCallback(() => {
    logger.component('ThemeContext', 'Reduced transparency toggled')
  }, [])

  const setColorBlindnessFilter = useCallback((filter: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia') => {
    logger.component('ThemeContext', 'Color blindness filter changed', { filter })
  }, [])

  const resetToDefaults = useCallback(async () => {
    try {
      await updateSetting('dark_mode', false)
      await updateSetting('theme_mode', 'auto')
    } catch (error) {
      console.error('Failed to reset theme settings:', error)
    }
  }, [updateSetting])

  const getMotionClasses = useCallback((defaultClasses: string, reducedMotionClasses: string = '') => {
    return shouldReduceMotion && reducedMotionClasses ? reducedMotionClasses : defaultClasses
  }, [shouldReduceMotion])

  const getContrastClasses = useCallback((normalClasses: string, highContrastClasses: string) => {
    return isHighContrast ? highContrastClasses : normalClasses
  }, [isHighContrast])

  const contextValue: ThemeContextType = {
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
    getMotionClasses,
    getContrastClasses,
    isDark,
    isHighContrast,
    shouldReduceMotion,
    hasReducedTransparency,
  }
  
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}