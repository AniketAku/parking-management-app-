// Theme and Accessibility Preferences Hook
// Manages user theme preferences including high contrast and reduced motion

import { useState, useEffect, useCallback } from 'react'

export type Theme = 'light' | 'dark' | 'high-contrast'
export type MotionPreference = 'auto' | 'reduce' | 'no-preference'

export interface ThemePreferences {
  theme: Theme
  fontSize: 'small' | 'medium' | 'large' | 'extra-large'
  motionPreference: MotionPreference
  highContrast: boolean
  reducedTransparency: boolean
  colorBlindnessFilter: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'
}

const DEFAULT_PREFERENCES: ThemePreferences = {
  theme: 'light',
  fontSize: 'medium',
  motionPreference: 'auto',
  highContrast: false,
  reducedTransparency: false,
  colorBlindnessFilter: 'none',
}

const STORAGE_KEY = 'accessibility-preferences'

export const useTheme = () => {
  const [preferences, setPreferences] = useState<ThemePreferences>(DEFAULT_PREFERENCES)
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

    // Set initial values
    updateSystemPreferences()

    // Listen for changes
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

  // Load saved preferences
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed })
      }
    } catch (error) {
      console.warn('Failed to load accessibility preferences:', error)
    }
  }, [])

  // Save preferences when they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    } catch (error) {
      console.warn('Failed to save accessibility preferences:', error)
    }
  }, [preferences])

  // Apply theme classes to document
  useEffect(() => {
    const root = document.documentElement
    
    // Remove existing theme classes
    root.classList.remove('theme-light', 'theme-dark', 'theme-high-contrast')
    root.classList.remove('motion-reduce', 'motion-auto')
    root.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large')
    root.classList.remove('contrast-high', 'transparency-reduce')
    root.classList.remove('filter-protanopia', 'filter-deuteranopia', 'filter-tritanopia')

    // Determine effective theme
    let effectiveTheme = preferences.theme
    if (effectiveTheme === 'light' && systemPreferences.prefersDark) {
      effectiveTheme = 'dark'
    }
    if (preferences.highContrast || systemPreferences.prefersHighContrast) {
      effectiveTheme = 'high-contrast'
    }

    // Determine effective motion preference
    let effectiveMotion = preferences.motionPreference
    if (effectiveMotion === 'auto') {
      effectiveMotion = systemPreferences.prefersReducedMotion ? 'reduce' : 'no-preference'
    }

    // Apply classes
    root.classList.add(`theme-${effectiveTheme}`)
    root.classList.add(`motion-${effectiveMotion === 'reduce' ? 'reduce' : 'auto'}`)
    root.classList.add(`font-${preferences.fontSize}`)
    
    if (preferences.highContrast || systemPreferences.prefersHighContrast) {
      root.classList.add('contrast-high')
    }
    
    if (preferences.reducedTransparency || systemPreferences.prefersReducedTransparency) {
      root.classList.add('transparency-reduce')
    }

    if (preferences.colorBlindnessFilter !== 'none') {
      root.classList.add(`filter-${preferences.colorBlindnessFilter}`)
    }

    // Set CSS custom properties for dynamic theming
    const style = root.style
    
    if (effectiveTheme === 'high-contrast') {
      style.setProperty('--color-primary', '#000000')
      style.setProperty('--color-primary-contrast', '#ffffff')
      style.setProperty('--color-background', '#ffffff')
      style.setProperty('--color-text', '#000000')
      style.setProperty('--color-border', '#000000')
      style.setProperty('--color-focus', '#0066cc')
    } else if (effectiveTheme === 'dark') {
      style.setProperty('--color-primary', '#3b82f6')
      style.setProperty('--color-primary-contrast', '#ffffff')
      style.setProperty('--color-background', '#1f2937')
      style.setProperty('--color-text', '#f9fafb')
      style.setProperty('--color-border', '#374151')
      style.setProperty('--color-focus', '#60a5fa')
    } else {
      style.setProperty('--color-primary', '#3b82f6')
      style.setProperty('--color-primary-contrast', '#ffffff')
      style.setProperty('--color-background', '#ffffff')
      style.setProperty('--color-text', '#111827')
      style.setProperty('--color-border', '#d1d5db')
      style.setProperty('--color-focus', '#2563eb')
    }

    // Font size scaling
    const fontSizeScale = {
      small: '0.875',
      medium: '1',
      large: '1.125',
      'extra-large': '1.25'
    }
    style.setProperty('--font-scale', fontSizeScale[preferences.fontSize])

  }, [preferences, systemPreferences])

  // Theme management functions
  const setTheme = useCallback((theme: Theme) => {
    setPreferences(prev => ({ ...prev, theme }))
  }, [])

  const setFontSize = useCallback((fontSize: ThemePreferences['fontSize']) => {
    setPreferences(prev => ({ ...prev, fontSize }))
  }, [])

  const setMotionPreference = useCallback((motionPreference: MotionPreference) => {
    setPreferences(prev => ({ ...prev, motionPreference }))
  }, [])

  const toggleHighContrast = useCallback(() => {
    setPreferences(prev => ({ ...prev, highContrast: !prev.highContrast }))
  }, [])

  const toggleReducedTransparency = useCallback(() => {
    setPreferences(prev => ({ ...prev, reducedTransparency: !prev.reducedTransparency }))
  }, [])

  const setColorBlindnessFilter = useCallback((filter: ThemePreferences['colorBlindnessFilter']) => {
    setPreferences(prev => ({ ...prev, colorBlindnessFilter: filter }))
  }, [])

  const resetToDefaults = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES)
  }, [])

  // Get effective values (considering system preferences)
  const getEffectiveTheme = useCallback((): Theme => {
    if (preferences.highContrast || systemPreferences.prefersHighContrast) {
      return 'high-contrast'
    }
    if (preferences.theme === 'light' && systemPreferences.prefersDark) {
      return 'dark'
    }
    return preferences.theme
  }, [preferences, systemPreferences])

  const getEffectiveMotion = useCallback((): 'reduce' | 'no-preference' => {
    if (preferences.motionPreference === 'reduce') return 'reduce'
    if (preferences.motionPreference === 'auto' && systemPreferences.prefersReducedMotion) {
      return 'reduce'
    }
    return 'no-preference'
  }, [preferences.motionPreference, systemPreferences.prefersReducedMotion])

  // Helper to get motion-safe classes
  const getMotionClasses = useCallback((
    defaultClasses: string,
    reducedMotionClasses: string = ''
  ): string => {
    const shouldReduceMotion = getEffectiveMotion() === 'reduce'
    return shouldReduceMotion && reducedMotionClasses 
      ? reducedMotionClasses 
      : defaultClasses
  }, [getEffectiveMotion])

  // Helper to get contrast-appropriate classes
  const getContrastClasses = useCallback((
    normalClasses: string,
    highContrastClasses: string
  ): string => {
    const isHighContrast = getEffectiveTheme() === 'high-contrast'
    return isHighContrast ? highContrastClasses : normalClasses
  }, [getEffectiveTheme])

  return {
    preferences,
    systemPreferences,
    effectiveTheme: getEffectiveTheme(),
    effectiveMotion: getEffectiveMotion(),
    
    // Setters
    setTheme,
    setFontSize,
    setMotionPreference,
    toggleHighContrast,
    toggleReducedTransparency,
    setColorBlindnessFilter,
    resetToDefaults,
    
    // Helpers
    getMotionClasses,
    getContrastClasses,
    
    // Computed values
    isDark: getEffectiveTheme() === 'dark',
    isHighContrast: getEffectiveTheme() === 'high-contrast',
    shouldReduceMotion: getEffectiveMotion() === 'reduce',
    hasReducedTransparency: preferences.reducedTransparency || systemPreferences.prefersReducedTransparency,
  }
}