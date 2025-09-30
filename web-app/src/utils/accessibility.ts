// Accessibility Utilities
// Helper functions and constants for WCAG 2.1 AA compliance

export const ARIA_LABELS = {
  // Navigation
  MAIN_NAVIGATION: 'Main navigation',
  BREADCRUMB: 'Breadcrumb navigation',
  PAGINATION: 'Pagination navigation',
  
  // Forms
  REQUIRED_FIELD: 'Required field',
  OPTIONAL_FIELD: 'Optional field',
  PASSWORD_TOGGLE: 'Toggle password visibility',
  SEARCH_BUTTON: 'Search',
  CLEAR_SEARCH: 'Clear search',
  
  // Actions
  EDIT: 'Edit',
  DELETE: 'Delete',
  SAVE: 'Save',
  CANCEL: 'Cancel',
  CLOSE: 'Close',
  BACK: 'Go back',
  NEXT: 'Next',
  PREVIOUS: 'Previous',
  
  // Status
  LOADING: 'Loading content',
  ERROR: 'Error message',
  SUCCESS: 'Success message',
  WARNING: 'Warning message',
  INFO: 'Information',
  
  // Parking specific
  VEHICLE_ENTRY: 'Register new vehicle entry',
  VEHICLE_EXIT: 'Process vehicle exit',
  PARKING_STATUS: 'Current parking status',
  PAYMENT_FORM: 'Payment information form',
} as const

export const ARIA_DESCRIPTIONS = {
  // Form fields
  VEHICLE_NUMBER: 'Enter vehicle registration number in format: AB12CD3456',
  DRIVER_PHONE: 'Enter 10-digit mobile number',
  PAYMENT_AMOUNT: 'Amount calculated based on parking duration and vehicle type',
  
  // Status indicators
  PARKED_VEHICLES: 'Number of vehicles currently parked',
  AVAILABLE_SPOTS: 'Number of available parking spots',
  DAILY_INCOME: 'Total income collected today',
  
  // Interactive elements
  SORT_COLUMN: 'Click to sort by this column',
  FILTER_OPTION: 'Select to filter results',
  DATE_PICKER: 'Select date using calendar widget',
} as const

// Focus management utilities
export const focusManager = {
  // Get all focusable elements within a container
  getFocusableElements: (container: HTMLElement): HTMLElement[] => {
    const selector = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ')
    
    return Array.from(container.querySelectorAll(selector))
  },

  // Set focus to first focusable element
  focusFirst: (container: HTMLElement): boolean => {
    const focusable = focusManager.getFocusableElements(container)
    if (focusable.length > 0) {
      focusable[0].focus()
      return true
    }
    return false
  },

  // Set focus to last focusable element
  focusLast: (container: HTMLElement): boolean => {
    const focusable = focusManager.getFocusableElements(container)
    if (focusable.length > 0) {
      focusable[focusable.length - 1].focus()
      return true
    }
    return false
  },

  // Move focus to next focusable element
  focusNext: (current: HTMLElement, container: HTMLElement): boolean => {
    const focusable = focusManager.getFocusableElements(container)
    const currentIndex = focusable.indexOf(current)
    if (currentIndex < focusable.length - 1) {
      focusable[currentIndex + 1].focus()
      return true
    }
    return false
  },

  // Move focus to previous focusable element
  focusPrevious: (current: HTMLElement, container: HTMLElement): boolean => {
    const focusable = focusManager.getFocusableElements(container)
    const currentIndex = focusable.indexOf(current)
    if (currentIndex > 0) {
      focusable[currentIndex - 1].focus()
      return true
    }
    return false
  }
}

// Keyboard navigation utilities
export const keyboardHandler = {
  // Handle arrow key navigation in lists/grids
  handleArrowKeys: (
    event: KeyboardEvent,
    container: HTMLElement,
    options: {
      orientation?: 'horizontal' | 'vertical' | 'both'
      wrap?: boolean
    } = {}
  ) => {
    const { orientation = 'both', wrap = false } = options
    
    switch (event.key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault()
          // Implementation for down navigation
        }
        break
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault()
          // Implementation for up navigation
        }
        break
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault()
          focusManager.focusNext(event.target as HTMLElement, container)
        }
        break
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault()
          focusManager.focusPrevious(event.target as HTMLElement, container)
        }
        break
      case 'Home':
        event.preventDefault()
        focusManager.focusFirst(container)
        break
      case 'End':
        event.preventDefault()
        focusManager.focusLast(container)
        break
    }
  },

  // Handle escape key for modals/dropdowns
  handleEscape: (callback: () => void) => (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      callback()
    }
  },

  // Handle Enter/Space for custom interactive elements
  handleActivation: (callback: () => void) => (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      callback()
    }
  }
}

// Screen reader utilities
export const screenReader = {
  // Generate accessible text for complex UI states
  generateStatusText: (status: {
    loading?: boolean
    error?: string
    success?: string
    count?: number
    total?: number
  }): string => {
    if (status.loading) return 'Loading content, please wait'
    if (status.error) return `Error: ${status.error}`
    if (status.success) return `Success: ${status.success}`
    if (status.count !== undefined && status.total !== undefined) {
      return `Showing ${status.count} of ${status.total} items`
    }
    return ''
  },

  // Generate accessible table cell descriptions
  generateTableCellDescription: (
    value: string | number,
    columnHeader: string,
    rowHeader?: string
  ): string => {
    const baseDesc = `${columnHeader}: ${value}`
    return rowHeader ? `${rowHeader}, ${baseDesc}` : baseDesc
  },

  // Generate accessible form validation messages
  generateValidationMessage: (
    fieldName: string,
    errors: string[],
    isRequired = false
  ): string => {
    const requiredText = isRequired ? 'Required field. ' : ''
    const errorText = errors.length > 0 ? `Errors: ${errors.join(', ')}` : ''
    return `${fieldName}. ${requiredText}${errorText}`.trim()
  }
}

// Color and contrast utilities
export const colorUtils = {
  // Convert hex to RGB
  hexToRgb: (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  },

  // Calculate relative luminance
  getLuminance: (rgb: { r: number; g: number; b: number }): number => {
    const normalize = (value: number) => {
      const normalized = value / 255
      return normalized <= 0.03928 
        ? normalized / 12.92 
        : Math.pow((normalized + 0.055) / 1.055, 2.4)
    }
    
    return 0.2126 * normalize(rgb.r) + 0.7152 * normalize(rgb.g) + 0.0722 * normalize(rgb.b)
  },

  // Calculate contrast ratio
  getContrastRatio: (color1: string, color2: string): number => {
    const rgb1 = colorUtils.hexToRgb(color1)
    const rgb2 = colorUtils.hexToRgb(color2)
    
    if (!rgb1 || !rgb2) return 0
    
    const lum1 = colorUtils.getLuminance(rgb1)
    const lum2 = colorUtils.getLuminance(rgb2)
    
    const lighter = Math.max(lum1, lum2)
    const darker = Math.min(lum1, lum2)
    
    return (lighter + 0.05) / (darker + 0.05)
  },

  // Check WCAG compliance
  checkWCAGCompliance: (ratio: number): {
    AA: { normal: boolean; large: boolean }
    AAA: { normal: boolean; large: boolean }
  } => ({
    AA: {
      normal: ratio >= 4.5,
      large: ratio >= 3
    },
    AAA: {
      normal: ratio >= 7,
      large: ratio >= 4.5
    }
  })
}

// Accessibility testing utilities
export const a11yTest = {
  // Check if element has accessible name
  hasAccessibleName: (element: HTMLElement): boolean => {
    return !!(
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      element.textContent?.trim() ||
      element.getAttribute('title')
    )
  },

  // Check if form control has label
  hasLabel: (element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): boolean => {
    return !!(
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      document.querySelector(`label[for="${element.id}"]`)
    )
  },

  // Check if interactive element is keyboard accessible
  isKeyboardAccessible: (element: HTMLElement): boolean => {
    const tabIndex = element.getAttribute('tabindex')
    const role = element.getAttribute('role')
    
    // Native interactive elements
    if (['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
      return tabIndex !== '-1'
    }
    
    // Elements with interactive roles
    if (['button', 'link', 'menuitem', 'tab'].includes(role || '')) {
      return tabIndex !== '-1'
    }
    
    return false
  },

  // Generate accessibility report for element
  generateReport: (element: HTMLElement): {
    hasAccessibleName: boolean
    isKeyboardAccessible: boolean
    hasRole: boolean
    errors: string[]
    warnings: string[]
  } => {
    const errors: string[] = []
    const warnings: string[] = []
    
    const hasAccessibleName = a11yTest.hasAccessibleName(element)
    const isKeyboardAccessible = a11yTest.isKeyboardAccessible(element)
    const hasRole = !!element.getAttribute('role')
    
    if (!hasAccessibleName) {
      errors.push('Element lacks accessible name')
    }
    
    if (!isKeyboardAccessible) {
      errors.push('Element is not keyboard accessible')
    }
    
    if (!hasRole && !['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
      warnings.push('Consider adding role attribute')
    }
    
    return {
      hasAccessibleName,
      isKeyboardAccessible,
      hasRole,
      errors,
      warnings
    }
  }
}