// Accessibility Hooks
// Custom hooks for accessibility features and WCAG compliance

import React, { useEffect, useRef, useState, useCallback } from 'react'

// Hook for managing focus trap in modals and overlays
export const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLElement>(null)
  const firstFocusableRef = useRef<HTMLElement | null>(null)
  const lastFocusableRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const focusableArray = Array.from(focusableElements) as HTMLElement[]
    firstFocusableRef.current = focusableArray[0]
    lastFocusableRef.current = focusableArray[focusableArray.length - 1]

    // Focus first element when trap activates
    if (firstFocusableRef.current) {
      firstFocusableRef.current.focus()
    }

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusableRef.current) {
          e.preventDefault()
          lastFocusableRef.current?.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusableRef.current) {
          e.preventDefault()
          firstFocusableRef.current?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleTabKey)
    return () => container.removeEventListener('keydown', handleTabKey)
  }, [isActive])

  return containerRef
}

// Hook for managing skip links
export const useSkipLinks = () => {
  const skipToContent = useCallback(() => {
    const mainContent = document.getElementById('main-content')
    if (mainContent) {
      mainContent.focus()
      mainContent.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  const skipToNavigation = useCallback(() => {
    const navigation = document.getElementById('main-navigation')
    if (navigation) {
      navigation.focus()
      navigation.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  return { skipToContent, skipToNavigation }
}

// Hook for screen reader announcements
export const useScreenReader = () => {
  const [announcement, setAnnouncement] = useState('')

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // Clear previous announcement
    setAnnouncement('')
    
    // Set new announcement after a brief delay to ensure screen readers pick it up
    setTimeout(() => {
      setAnnouncement(message)
      // Auto-clear after announcement
      setTimeout(() => setAnnouncement(''), 1000)
    }, 100)
  }, [])

  const AnnouncementRegion = () => React.createElement('div', {
    'aria-live': 'polite',
    'aria-atomic': 'true',
    className: 'sr-only',
    role: 'status'
  }, announcement)

  return { announce, AnnouncementRegion }
}

// Hook for keyboard navigation
export const useKeyboardNavigation = () => {
  const [isKeyboardUser, setIsKeyboardUser] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsKeyboardUser(true)
      }
    }

    const handleMouseDown = () => {
      setIsKeyboardUser(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  return { isKeyboardUser }
}

// Hook for managing reduced motion preferences
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return { prefersReducedMotion }
}

// Hook for high contrast mode detection
export const useHighContrast = () => {
  const [highContrast, setHighContrast] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)')
    setHighContrast(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setHighContrast(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return { highContrast }
}

// Hook for managing form accessibility
export const useFormAccessibility = (formId: string) => {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [fieldStates, setFieldStates] = useState<Record<string, 'valid' | 'invalid' | 'pending'>>({})

  const setFieldError = useCallback((fieldName: string, error: string) => {
    setErrors(prev => ({ ...prev, [fieldName]: error }))
    setFieldStates(prev => ({ ...prev, [fieldName]: 'invalid' }))
  }, [])

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const { [fieldName]: _, ...rest } = prev
      return rest
    })
    setFieldStates(prev => ({ ...prev, [fieldName]: 'valid' }))
  }, [])

  const getFieldProps = useCallback((fieldName: string, isRequired = false) => {
    const hasError = !!errors[fieldName]
    const errorId = `${formId}-${fieldName}-error`
    const descriptionId = `${formId}-${fieldName}-description`

    return {
      'aria-invalid': hasError,
      'aria-required': isRequired,
      'aria-describedby': hasError ? errorId : descriptionId,
      id: `${formId}-${fieldName}`,
    }
  }, [errors, formId])

  const getErrorProps = useCallback((fieldName: string) => {
    const errorId = `${formId}-${fieldName}-error`
    return {
      id: errorId,
      role: 'alert',
      'aria-live': 'polite' as const,
    }
  }, [formId])

  return {
    errors,
    fieldStates,
    setFieldError,
    clearFieldError,
    getFieldProps,
    getErrorProps,
  }
}

// Hook for managing live regions for dynamic content
export const useLiveRegion = () => {
  const [politeContent, setPoliteContent] = useState('')
  const [assertiveContent, setAssertiveContent] = useState('')

  const announcePolite = useCallback((content: string) => {
    setPoliteContent('')
    setTimeout(() => setPoliteContent(content), 100)
  }, [])

  const announceAssertive = useCallback((content: string) => {
    setAssertiveContent('')
    setTimeout(() => setAssertiveContent(content), 100)
  }, [])

  const LiveRegions = () => React.createElement(React.Fragment, null,
    React.createElement('div', {
      'aria-live': 'polite',
      'aria-atomic': 'true',
      className: 'sr-only',
      role: 'status'
    }, politeContent),
    React.createElement('div', {
      'aria-live': 'assertive',
      'aria-atomic': 'true',
      className: 'sr-only',
      role: 'alert'
    }, assertiveContent)
  )

  return { announcePolite, announceAssertive, LiveRegions }
}

// Hook for managing color contrast requirements
export const useColorContrast = () => {
  const checkContrast = useCallback((foreground: string, background: string): number => {
    // Simplified contrast calculation (in real app, use proper color parsing)
    // This is a placeholder - use a proper contrast calculation library
    return 4.5 // WCAG AA minimum
  }, [])

  const meetsAA = useCallback((ratio: number) => ratio >= 4.5, [])
  const meetsAAA = useCallback((ratio: number) => ratio >= 7, [])

  return { checkContrast, meetsAA, meetsAAA }
}