/**
 * Desktop Title Bar Component
 * Provides custom title bar with window controls for desktop app
 */

import React from 'react'
import { useDesktopWindow, useDesktopSystem } from '../../hooks/useDesktopAPI'

interface DesktopTitleBarProps {
  title?: string
  showControls?: boolean
  className?: string
}

export const DesktopTitleBar: React.FC<DesktopTitleBarProps> = ({
  title = 'Parking Management System',
  showControls = true,
  className = ''
}) => {
  const { minimize, maximize, close } = useDesktopWindow()
  const { systemInfo } = useDesktopSystem()

  const handleMinimize = () => {
    minimize()
  }

  const handleMaximize = () => {
    maximize()
  }

  const handleClose = () => {
    close()
  }

  const isMac = systemInfo?.platform === 'darwin'

  return (
    <div className={`desktop-title-bar ${className}`}>
      <div className="title-bar-content">
        <div className="title-bar-left">
          <div className="app-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="app-title">{title}</span>
        </div>

        {showControls && (
          <div className={`title-bar-controls ${isMac ? 'mac-controls' : 'windows-controls'}`}>
            {isMac ? (
              // macOS style controls (left side)
              <>
                <button
                  className="title-bar-button close-button mac-close"
                  onClick={handleClose}
                  aria-label="Close"
                >
                  <span></span>
                </button>
                <button
                  className="title-bar-button minimize-button mac-minimize"
                  onClick={handleMinimize}
                  aria-label="Minimize"
                >
                  <span></span>
                </button>
                <button
                  className="title-bar-button maximize-button mac-maximize"
                  onClick={handleMaximize}
                  aria-label="Maximize"
                >
                  <span></span>
                </button>
              </>
            ) : (
              // Windows/Linux style controls (right side)
              <>
                <button
                  className="title-bar-button minimize-button"
                  onClick={handleMinimize}
                  aria-label="Minimize"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M0 6h12v1H0z"/>
                  </svg>
                </button>
                <button
                  className="title-bar-button maximize-button"
                  onClick={handleMaximize}
                  aria-label="Maximize"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M1 1v10h10V1H1zM0 0h12v12H0V0z"/>
                  </svg>
                </button>
                <button
                  className="title-bar-button close-button"
                  onClick={handleClose}
                  aria-label="Close"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M6 4.586L2.707 1.293 1.293 2.707 4.586 6l-3.293 3.293 1.414 1.414L6 7.414l3.293 3.293 1.414-1.414L7.414 6l3.293-3.293-1.414-1.414L6 4.586z"/>
                  </svg>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .desktop-title-bar {
          display: flex;
          height: 32px;
          background-color: var(--title-bar-bg, #f6f6f6);
          border-bottom: 1px solid var(--title-bar-border, #e0e0e0);
          user-select: none;
          -webkit-app-region: drag;
        }

        .title-bar-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 0 8px;
        }

        .title-bar-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .app-icon {
          display: flex;
          align-items: center;
          color: var(--title-bar-icon-color, #666);
        }

        .app-title {
          font-size: 13px;
          font-weight: 500;
          color: var(--title-bar-text-color, #333);
        }

        .title-bar-controls {
          display: flex;
          align-items: center;
          -webkit-app-region: no-drag;
        }

        .windows-controls {
          gap: 0;
        }

        .mac-controls {
          gap: 8px;
          order: -1;
        }

        .title-bar-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .title-bar-button:hover {
          background-color: var(--title-bar-button-hover, rgba(0, 0, 0, 0.1));
        }

        .title-bar-button svg {
          color: var(--title-bar-button-color, #666);
        }

        /* Windows/Linux controls */
        .minimize-button:hover svg,
        .maximize-button:hover svg {
          color: var(--title-bar-button-hover-color, #333);
        }

        .close-button:hover {
          background-color: #e81123;
        }

        .close-button:hover svg {
          color: white;
        }

        /* macOS controls */
        .mac-close, .mac-minimize, .mac-maximize {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          position: relative;
        }

        .mac-close {
          background-color: #ff5f57;
        }

        .mac-minimize {
          background-color: #ffbd2e;
        }

        .mac-maximize {
          background-color: #28cd41;
        }

        .mac-close span, .mac-minimize span, .mac-maximize span {
          display: none;
        }

        .mac-close:hover span {
          display: block;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 1px;
          background-color: #4d0000;
        }

        .mac-close:hover span::after {
          content: '';
          position: absolute;
          width: 8px;
          height: 1px;
          background-color: #4d0000;
          transform: rotate(90deg);
        }

        /* Dark theme support */
        @media (prefers-color-scheme: dark) {
          .desktop-title-bar {
            background-color: var(--title-bar-bg-dark, #2d2d2d);
            border-bottom-color: var(--title-bar-border-dark, #404040);
          }

          .app-title {
            color: var(--title-bar-text-color-dark, #e0e0e0);
          }

          .app-icon {
            color: var(--title-bar-icon-color-dark, #b0b0b0);
          }

          .title-bar-button:hover {
            background-color: var(--title-bar-button-hover-dark, rgba(255, 255, 255, 0.1));
          }

          .title-bar-button svg {
            color: var(--title-bar-button-color-dark, #b0b0b0);
          }

          .minimize-button:hover svg,
          .maximize-button:hover svg {
            color: var(--title-bar-button-hover-color-dark, #e0e0e0);
          }
        }
      `}</style>
    </div>
  )
}

export default DesktopTitleBar