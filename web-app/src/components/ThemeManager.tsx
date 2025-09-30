/**
 * Theme Manager Component
 * Applies theme settings to CSS custom properties and manages dark mode
 */

import { useEffect } from 'react'
import { useThemeSettings } from '../hooks/useSettings'

// Theme CSS custom properties mapping
const THEME_CSS_VARS = {
  // Primary colors
  '--color-primary': 'primary_color',
  '--color-primary-50': 'primary_color',
  '--color-primary-100': 'primary_color',
  '--color-primary-500': 'primary_color',
  '--color-primary-600': 'primary_color',
  '--color-primary-700': 'primary_color',
  
  // Secondary colors  
  '--color-secondary': 'secondary_color',
  '--color-secondary-500': 'secondary_color',
  '--color-secondary-600': 'secondary_color',
  
  // Status colors
  '--color-success': 'success_color',
  '--color-success-500': 'success_color',
  '--color-success-600': 'success_color',
  
  '--color-warning': 'warning_color',
  '--color-warning-500': 'warning_color',
  '--color-warning-600': 'warning_color',
  
  '--color-danger': 'danger_color',
  '--color-danger-500': 'danger_color',
  '--color-danger-600': 'danger_color',
  
  // Font scale
  '--font-scale': 'font_scale',
} as const

// Generate color variations (lighter/darker shades)
function generateColorVariations(baseColor: string) {
  // Simple color manipulation - in production you'd use a proper color library
  const hex = baseColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  return {
    50: `rgb(${Math.min(255, r + 80)}, ${Math.min(255, g + 80)}, ${Math.min(255, b + 80)})`,
    100: `rgb(${Math.min(255, r + 60)}, ${Math.min(255, g + 60)}, ${Math.min(255, b + 60)})`,
    200: `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)})`,
    300: `rgb(${Math.min(255, r + 20)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)})`,
    400: `rgb(${Math.min(255, r + 10)}, ${Math.min(255, g + 10)}, ${Math.min(255, b + 10)})`,
    500: baseColor, // Base color
    600: `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`,
    700: `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`,
    800: `rgb(${Math.max(0, r - 60)}, ${Math.max(0, g - 60)}, ${Math.max(0, b - 60)})`,
    900: `rgb(${Math.max(0, r - 80)}, ${Math.max(0, g - 80)}, ${Math.max(0, b - 80)})`,
  }
}

// Apply theme to CSS custom properties (batched for performance)
function applyThemeToCSS(settings: any) {
  const root = document.documentElement

  // Batch all CSS property updates to minimize reflows
  requestAnimationFrame(() => {
    // Apply primary color variations
    if (settings.primary_color) {
      const variations = generateColorVariations(settings.primary_color)
      Object.entries(variations).forEach(([shade, color]) => {
        root.style.setProperty(`--color-primary-${shade}`, color)
      })
      root.style.setProperty('--color-primary', settings.primary_color)
    }

    // Apply secondary color variations
    if (settings.secondary_color) {
      const variations = generateColorVariations(settings.secondary_color)
      Object.entries(variations).forEach(([shade, color]) => {
        root.style.setProperty(`--color-secondary-${shade}`, color)
      })
      root.style.setProperty('--color-secondary', settings.secondary_color)
    }

    // Apply success color variations
    if (settings.success_color) {
      const variations = generateColorVariations(settings.success_color)
      Object.entries(variations).forEach(([shade, color]) => {
        root.style.setProperty(`--color-success-${shade}`, color)
      })
      root.style.setProperty('--color-success', settings.success_color)
    }

    // Apply warning color variations
    if (settings.warning_color) {
      const variations = generateColorVariations(settings.warning_color)
      Object.entries(variations).forEach(([shade, color]) => {
        root.style.setProperty(`--color-warning-${shade}`, color)
      })
      root.style.setProperty('--color-warning', settings.warning_color)
    }

    // Apply danger color variations
    if (settings.danger_color) {
      const variations = generateColorVariations(settings.danger_color)
      Object.entries(variations).forEach(([shade, color]) => {
        root.style.setProperty(`--color-danger-${shade}`, color)
      })
      root.style.setProperty('--color-danger', settings.danger_color)
    }

    // Apply font scale
    if (settings.font_scale) {
      root.style.setProperty('--font-scale', settings.font_scale.toString())
    }
  })
  
  // Apply dark mode
  if (settings.dark_mode !== undefined) {
    if (settings.dark_mode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
  
  // Handle theme mode (auto detection)
  if (settings.theme_mode) {
    switch (settings.theme_mode) {
      case 'auto':
        // Use system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        if (prefersDark) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
        break
      case 'dark':
        document.documentElement.classList.add('dark')
        break
      case 'light':
        document.documentElement.classList.remove('dark')
        break
    }
  }
}

// Update Tailwind config dynamically
function updateTailwindColors(settings: any) {
  // This would require a more complex implementation in a real app
  // For now, we'll just apply the CSS custom properties
  // console.log('Theme updated:', settings) // Disabled for performance
}

export function ThemeManager() {
  const { settings, loading } = useThemeSettings()
  
  useEffect(() => {
    // console.log('🎭 ThemeManager: Settings changed', { settings, loading }) // Disabled for performance
    if (!loading && settings) {
      // console.log('🎭 ThemeManager: Applying theme to CSS', settings) // Disabled for performance
      applyThemeToCSS(settings)
      updateTailwindColors(settings)
    }
  }, [settings, loading])
  
  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (settings?.theme_mode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      
      const handleChange = (e: MediaQueryListEvent) => {
        if (e.matches) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }
      
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [settings?.theme_mode])
  
  // Apply initial theme on mount
  useEffect(() => {
    // Apply fallback/default theme if no settings loaded yet
    if (!settings) {
      const defaultTheme = {
        primary_color: '#2563eb',
        secondary_color: '#64748b',
        success_color: '#10b981',
        warning_color: '#f59e0b',
        danger_color: '#ef4444',
        dark_mode: false,
        theme_mode: 'auto',
        font_scale: 1
      }
      applyThemeToCSS(defaultTheme)
    }
  }, [settings])
  
  return null // This component doesn't render anything
}

// Export utility functions for use in other components
export { applyThemeToCSS, generateColorVariations }