// Accessibility Provider Component
// Provides accessibility context and initialization for the entire application

import React, { useEffect } from 'react'
import { useTheme } from '../../hooks/useTheme'
import ColorBlindnessFilters from './ColorBlindnessFilters'

interface AccessibilityProviderProps {
  children: React.ReactNode
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const {
    preferences,
    effectiveTheme,
    effectiveMotion,
    shouldReduceMotion,
    hasReducedTransparency,
    getMotionClasses,
    getContrastClasses,
  } = useTheme()

  // Initialize accessibility features on mount
  useEffect(() => {
    // Add accessibility classes to body for global styles
    const body = document.body
    
    // Theme classes
    body.classList.remove('theme-light', 'theme-dark', 'theme-high-contrast')
    body.classList.add(`theme-${effectiveTheme}`)
    
    // Motion classes
    body.classList.remove('motion-reduce', 'motion-auto')
    body.classList.add(`motion-${shouldReduceMotion ? 'reduce' : 'auto'}`)
    
    // Font size classes
    body.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large')
    body.classList.add(`font-${preferences.fontSize}`)
    
    // High contrast
    if (preferences.highContrast) {
      body.classList.add('contrast-high')
    } else {
      body.classList.remove('contrast-high')
    }
    
    // Reduced transparency
    if (hasReducedTransparency) {
      body.classList.add('transparency-reduce')
    } else {
      body.classList.remove('transparency-reduce')
    }
    
    // Color blindness filter
    body.classList.remove('filter-protanopia', 'filter-deuteranopia', 'filter-tritanopia')
    if (preferences.colorBlindnessFilter !== 'none') {
      body.classList.add(`filter-${preferences.colorBlindnessFilter}`)
    }
    
    // Set ARIA attributes for theme state
    body.setAttribute('data-theme', effectiveTheme)
    body.setAttribute('data-motion', effectiveMotion)
    body.setAttribute('data-high-contrast', preferences.highContrast.toString())
    body.setAttribute('data-reduced-transparency', hasReducedTransparency.toString())
    body.setAttribute('data-font-size', preferences.fontSize)
    
  }, [
    effectiveTheme,
    effectiveMotion,
    shouldReduceMotion,
    hasReducedTransparency,
    preferences.fontSize,
    preferences.highContrast,
    preferences.colorBlindnessFilter,
  ])

  // Initialize skip links
  useEffect(() => {
    // Create skip links if they don't exist
    if (!document.querySelector('.skip-links')) {
      const skipLinks = document.createElement('div')
      skipLinks.className = 'skip-links'
      skipLinks.innerHTML = `
        <a href="#main-content" class="skip-link">Skip to main content</a>
        <a href="#main-navigation" class="skip-link">Skip to navigation</a>
        <a href="#search" class="skip-link">Skip to search</a>
      `
      document.body.insertBefore(skipLinks, document.body.firstChild)
    }
  }, [])

  // Add keyboard navigation detection
  useEffect(() => {
    let isKeyboardUser = false
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (!isKeyboardUser) {
          isKeyboardUser = true
          document.body.classList.add('keyboard-user')
        }
      }
    }
    
    const handleMouseDown = () => {
      if (isKeyboardUser) {
        isKeyboardUser = false
        document.body.classList.remove('keyboard-user')
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  // Add focus trap support for modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Close any open modals or dropdowns
        const openModals = document.querySelectorAll('[role="dialog"][aria-modal="true"]')
        if (openModals.length > 0) {
          const lastModal = openModals[openModals.length - 1] as HTMLElement
          const closeButton = lastModal.querySelector('[aria-label="Close"], [data-close]') as HTMLButtonElement
          if (closeButton) {
            closeButton.click()
          }
        }
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  // Add live region for announcements
  useEffect(() => {
    // Create global live region for announcements
    if (!document.querySelector('#global-live-region')) {
      const liveRegion = document.createElement('div')
      liveRegion.id = 'global-live-region'
      liveRegion.setAttribute('aria-live', 'polite')
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.className = 'sr-only'
      document.body.appendChild(liveRegion)
    }
  }, [])

  // Provide utility functions to child components
  const accessibilityUtils = {
    announceToScreenReader: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      const liveRegion = document.querySelector('#global-live-region')
      if (liveRegion) {
        liveRegion.setAttribute('aria-live', priority)
        liveRegion.textContent = message
        
        // Clear after 3 seconds
        setTimeout(() => {
          liveRegion.textContent = ''
        }, 3000)
      }
    },
    
    getMotionClasses,
    getContrastClasses,
    
    isReducedMotion: shouldReduceMotion,
    isHighContrast: preferences.highContrast,
    currentTheme: effectiveTheme,
    fontSize: preferences.fontSize,
  }

  return (
    <>
      {/* Provide accessibility context */}
      <AccessibilityContext.Provider value={accessibilityUtils}>
        {children}
      </AccessibilityContext.Provider>
      
      {/* Color blindness filters */}
      <ColorBlindnessFilters />
    </>
  )
}

// Create accessibility context
export const AccessibilityContext = React.createContext<{
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void
  getMotionClasses: (defaultClasses: string, reducedMotionClasses?: string) => string
  getContrastClasses: (normalClasses: string, highContrastClasses: string) => string
  isReducedMotion: boolean
  isHighContrast: boolean
  currentTheme: string
  fontSize: string
} | null>(null)

// Hook to use accessibility context
export const useAccessibilityContext = () => {
  const context = React.useContext(AccessibilityContext)
  if (!context) {
    throw new Error('useAccessibilityContext must be used within AccessibilityProvider')
  }
  return context
}

export default AccessibilityProvider