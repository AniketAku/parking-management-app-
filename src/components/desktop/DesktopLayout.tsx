/**
 * Desktop Layout Component
 * Main layout wrapper for desktop application with integrated desktop features
 */

import React, { useEffect, useState } from 'react'
import { useIsDesktop, useDesktopEvents, useDesktopSystem } from '../../hooks/useDesktopAPI'
import DesktopTitleBar from './DesktopTitleBar'
import DesktopToolbar from './DesktopToolbar'

interface DesktopLayoutProps {
  children: React.ReactNode
  title?: string
  showTitleBar?: boolean
  showToolbar?: boolean
  onRefresh?: () => void
  onExport?: () => void
  onImport?: () => void
  onBackup?: () => void
  className?: string
}

export const DesktopLayout: React.FC<DesktopLayoutProps> = ({
  children,
  title,
  showTitleBar = true,
  showToolbar = true,
  onRefresh,
  onExport,
  onImport,
  onBackup,
  className = ''
}) => {
  const isDesktop = useIsDesktop()
  const { addEventListener, removeEventListener } = useDesktopEvents()
  const { systemInfo } = useDesktopSystem()
  const [isMaximized, setIsMaximized] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  // Handle window state changes
  useEffect(() => {
    if (!isDesktop) return

    const handleWindowFocus = (focused: boolean) => {
      document.body.classList.toggle('window-focused', focused)
    }

    const handleThemeChanged = (themeData: any) => {
      const newTheme = themeData.shouldUseDarkColors ? 'dark' : 'light'
      setTheme(newTheme)
      document.documentElement.setAttribute('data-theme', newTheme)
    }

    const handleNavigateTo = (route: string) => {
      // Handle programmatic navigation from main process
      if (window.history && route) {
        window.history.pushState(null, '', route)
      }
    }

    const handleDataUpdated = () => {
      // Trigger data refresh when main process notifies of changes
      if (onRefresh) {
        onRefresh()
      }
    }

    // Register event listeners
    addEventListener('window-focus', handleWindowFocus)
    addEventListener('theme-changed', handleThemeChanged)
    addEventListener('navigate-to', handleNavigateTo)
    addEventListener('data-updated', handleDataUpdated)

    // Cleanup
    return () => {
      removeEventListener('window-focus', handleWindowFocus)
      removeEventListener('theme-changed', handleThemeChanged)
      removeEventListener('navigate-to', handleNavigateTo)
      removeEventListener('data-updated', handleDataUpdated)
    }
  }, [isDesktop, addEventListener, removeEventListener, onRefresh])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isDesktop) return

    const handleKeyboard = (event: KeyboardEvent) => {
      const { ctrlKey, metaKey, key } = event
      const isModifierPressed = ctrlKey || metaKey

      if (isModifierPressed) {
        switch (key.toLowerCase()) {
          case 'r':
            if (onRefresh) {
              event.preventDefault()
              onRefresh()
            }
            break
          case 'e':
            if (onExport) {
              event.preventDefault()
              onExport()
            }
            break
          case 'i':
            if (onImport) {
              event.preventDefault()
              onImport()
            }
            break
          case 'b':
            if (onBackup) {
              event.preventDefault()
              onBackup()
            }
            break
        }
      } else {
        switch (key) {
          case 'F5':
            if (onRefresh) {
              event.preventDefault()
              onRefresh()
            }
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyboard)
    return () => document.removeEventListener('keydown', handleKeyboard)
  }, [isDesktop, onRefresh, onExport, onImport, onBackup])

  // Apply platform-specific styles
  useEffect(() => {
    if (isDesktop && systemInfo) {
      document.body.classList.add('desktop-app')
      document.body.classList.add(`platform-${systemInfo.platform}`)
      
      // Apply theme
      document.documentElement.setAttribute('data-theme', theme)
    }

    return () => {
      if (isDesktop) {
        document.body.classList.remove('desktop-app')
        if (systemInfo) {
          document.body.classList.remove(`platform-${systemInfo.platform}`)
        }
      }
    }
  }, [isDesktop, systemInfo, theme])

  // If not desktop, render children without desktop chrome
  if (!isDesktop) {
    return <>{children}</>
  }

  return (
    <div className={`desktop-layout ${className}`}>
      {showTitleBar && (
        <DesktopTitleBar
          title={title}
          showControls={true}
        />
      )}
      
      {showToolbar && (
        <DesktopToolbar
          onRefresh={onRefresh}
          onExport={onExport}
          onImport={onImport}
          onBackup={onBackup}
        />
      )}

      <div className="desktop-content">
        {children}
      </div>

      <style jsx>{`
        .desktop-layout {
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
          background-color: var(--app-bg, #ffffff);
        }

        .desktop-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }

        /* Global desktop app styles */
        :global(body.desktop-app) {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
                       'Helvetica Neue', Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          overflow: hidden;
        }

        :global(body.desktop-app *) {
          box-sizing: border-box;
        }

        /* Platform-specific adjustments */
        :global(body.platform-darwin) {
          --title-bar-height: 28px;
        }

        :global(body.platform-win32) {
          --title-bar-height: 32px;
        }

        :global(body.platform-linux) {
          --title-bar-height: 32px;
        }

        /* Window state styles */
        :global(body.window-focused) {
          --title-bar-opacity: 1;
        }

        :global(body:not(.window-focused)) {
          --title-bar-opacity: 0.7;
        }

        /* Theme variables - Light */
        :global([data-theme="light"]) {
          --app-bg: #ffffff;
          --app-text: #1f2937;
          --title-bar-bg: #f6f6f6;
          --title-bar-border: #e0e0e0;
          --title-bar-text-color: #333333;
          --title-bar-icon-color: #666666;
          --title-bar-button-color: #666666;
          --title-bar-button-hover: rgba(0, 0, 0, 0.1);
          --title-bar-button-hover-color: #333333;
          --toolbar-bg: #ffffff;
          --toolbar-border: #e1e5e9;
          --toolbar-button-color: #374151;
          --toolbar-button-hover: #f3f4f6;
          --toolbar-button-hover-color: #111827;
          --toolbar-button-active: #e5e7eb;
          --toolbar-separator: #e1e5e9;
          --status-bg: #f3f4f6;
          --status-text: #6b7280;
          --status-dot-online: #10b981;
          --status-dot-offline: #9ca3af;
          --success-bg-light: #dcfce7;
          --success-color: #059669;
          --primary-bg-light: #dbeafe;
          --primary-color: #2563eb;
          --info-bg-light: #f0f9ff;
          --info-color: #0284c7;
          --warning-bg-light: #fef3c7;
          --warning-color: #d97706;
        }

        /* Theme variables - Dark */
        :global([data-theme="dark"]) {
          --app-bg: #111827;
          --app-text: #f9fafb;
          --title-bar-bg: #2d2d2d;
          --title-bar-border: #404040;
          --title-bar-text-color: #e0e0e0;
          --title-bar-icon-color: #b0b0b0;
          --title-bar-button-color: #b0b0b0;
          --title-bar-button-hover: rgba(255, 255, 255, 0.1);
          --title-bar-button-hover-color: #e0e0e0;
          --toolbar-bg: #1f2937;
          --toolbar-border: #374151;
          --toolbar-button-color: #e5e7eb;
          --toolbar-button-hover: #374151;
          --toolbar-button-hover-color: #f9fafb;
          --toolbar-button-active: #4b5563;
          --toolbar-separator: #374151;
          --status-bg: #374151;
          --status-text: #9ca3af;
          --status-dot-online: #10b981;
          --status-dot-offline: #6b7280;
        }

        /* Custom scrollbars for desktop */
        :global(.desktop-app ::-webkit-scrollbar) {
          width: 8px;
          height: 8px;
        }

        :global(.desktop-app ::-webkit-scrollbar-track) {
          background-color: transparent;
        }

        :global(.desktop-app ::-webkit-scrollbar-thumb) {
          background-color: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }

        :global(.desktop-app ::-webkit-scrollbar-thumb:hover) {
          background-color: rgba(0, 0, 0, 0.3);
        }

        :global([data-theme="dark"] .desktop-app ::-webkit-scrollbar-thumb) {
          background-color: rgba(255, 255, 255, 0.2);
        }

        :global([data-theme="dark"] .desktop-app ::-webkit-scrollbar-thumb:hover) {
          background-color: rgba(255, 255, 255, 0.3);
        }

        /* Focus management for desktop */
        :global(.desktop-app *:focus-visible) {
          outline: 2px solid var(--primary-color, #2563eb);
          outline-offset: 2px;
        }

        :global(.desktop-app button:focus-visible),
        :global(.desktop-app input:focus-visible),
        :global(.desktop-app select:focus-visible),
        :global(.desktop-app textarea:focus-visible) {
          outline: 2px solid var(--primary-color, #2563eb);
          outline-offset: -2px;
        }

        /* Disable text selection for UI elements */
        :global(.desktop-app .title-bar),
        :global(.desktop-app .toolbar),
        :global(.desktop-app button) {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }

        /* Animation optimizations */
        :global(.desktop-app *) {
          -webkit-backface-visibility: hidden;
          -moz-backface-visibility: hidden;
          -webkit-perspective: 1000;
          -moz-perspective: 1000;
          -ms-perspective: 1000;
          perspective: 1000;
        }

        /* Print styles */
        @media print {
          .desktop-layout {
            height: auto;
            overflow: visible;
          }

          :global(.title-bar),
          :global(.toolbar) {
            display: none !important;
          }

          .desktop-content {
            overflow: visible;
          }
        }
      `}</style>
    </div>
  )
}

export default DesktopLayout