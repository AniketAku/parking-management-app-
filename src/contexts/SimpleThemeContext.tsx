import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { logger } from '../utils/enhancedLogger'

interface SimpleThemeContextType {
  isDark: boolean
  toggleTheme: () => void
  setDark: (dark: boolean) => void
}

const SimpleThemeContext = createContext<SimpleThemeContextType | null>(null)

export const useSimpleTheme = () => {
  const context = useContext(SimpleThemeContext)
  if (!context) {
    throw new Error('useSimpleTheme must be used within a SimpleThemeProvider')
  }
  return context
}

interface SimpleThemeProviderProps {
  children: React.ReactNode
}

export const SimpleThemeProvider: React.FC<SimpleThemeProviderProps> = ({ children }) => {
  const [isDark, setIsDark] = useState(false)

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement
    
    if (isDark) {
      root.classList.add('dark')
      logger.component('SimpleTheme', 'Dark theme applied')
    } else {
      root.classList.remove('dark')
      logger.component('SimpleTheme', 'Light theme applied')
    }
    
    logger.component('SimpleTheme', 'Theme classes updated', { 
      isDark, 
      hasClasses: root.className.length > 0 
    })
  }, [isDark])

  const toggleTheme = useCallback(() => {
    logger.component('SimpleTheme', 'Theme toggled', { from: isDark ? 'dark' : 'light', to: isDark ? 'light' : 'dark' })
    setIsDark(prev => !prev)
  }, [isDark])

  const setDark = useCallback((dark: boolean) => {
    logger.component('SimpleTheme', 'Theme set', { theme: dark ? 'dark' : 'light' })
    setIsDark(dark)
  }, [])

  const contextValue: SimpleThemeContextType = {
    isDark,
    toggleTheme,
    setDark,
  }
  
  return (
    <SimpleThemeContext.Provider value={contextValue}>
      {children}
    </SimpleThemeContext.Provider>
  )
}