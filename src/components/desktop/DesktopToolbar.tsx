/**
 * Desktop Toolbar Component
 * Provides desktop-specific actions and quick access tools
 */

import React, { useState } from 'react'
import { useDesktopFiles, useDesktopPrinter, useDesktopSystem } from '../../hooks/useDesktopAPI'

interface DesktopToolbarProps {
  onRefresh?: () => void
  onExport?: () => void
  onImport?: () => void
  onBackup?: () => void
  className?: string
}

export const DesktopToolbar: React.FC<DesktopToolbarProps> = ({
  onRefresh,
  onExport,
  onImport,
  onBackup,
  className = ''
}) => {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const { showExportDialog, showImportDialog, exportData, importData } = useDesktopFiles()
  const { showNotification } = useDesktopSystem()

  const handleExport = async () => {
    if (isExporting) return

    setIsExporting(true)
    try {
      const result = await showExportDialog()
      if (result && !result.canceled && result.filePath) {
        const format = result.filePath.endsWith('.json') ? 'json' : 'csv'
        const success = await exportData(result.filePath, format)
        
        if (success) {
          await showNotification({
            title: 'Export Successful',
            body: `Data exported to ${result.filePath}`,
            icon: 'success'
          })
        }
      }
      
      if (onExport) {
        onExport()
      }
    } catch (error) {
      console.error('Export failed:', error)
      await showNotification({
        title: 'Export Failed',
        body: 'Failed to export data. Please try again.',
        icon: 'error'
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async () => {
    if (isImporting) return

    setIsImporting(true)
    try {
      const result = await showImportDialog()
      if (result && !result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0]
        const importResult = await importData(filePath)
        
        if (importResult) {
          await showNotification({
            title: 'Import Successful',
            body: `Successfully imported ${importResult.importedCount} entries`,
            icon: 'success'
          })
        }
      }
      
      if (onImport) {
        onImport()
      }
    } catch (error) {
      console.error('Import failed:', error)
      await showNotification({
        title: 'Import Failed',
        body: 'Failed to import data. Please check the file format.',
        icon: 'error'
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleBackup = () => {
    if (onBackup) {
      onBackup()
    }
  }

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh()
    }
  }

  return (
    <div className={`desktop-toolbar ${className}`}>
      <div className="toolbar-section">
        <button
          className="toolbar-button refresh-button"
          onClick={handleRefresh}
          title="Refresh Data (F5)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      <div className="toolbar-separator"></div>

      <div className="toolbar-section">
        <button
          className="toolbar-button export-button"
          onClick={handleExport}
          disabled={isExporting}
          title="Export Data (Ctrl+E)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
          </svg>
          <span>{isExporting ? 'Exporting...' : 'Export'}</span>
        </button>

        <button
          className="toolbar-button import-button"
          onClick={handleImport}
          disabled={isImporting}
          title="Import Data (Ctrl+I)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 12v7h14v-7h2v7c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-7h2zm6-.67L8.41 9.92 7 11.33l5 5 5-5-1.41-1.41L13 11.33V3h-2v8.33z"/>
          </svg>
          <span>{isImporting ? 'Importing...' : 'Import'}</span>
        </button>
      </div>

      <div className="toolbar-separator"></div>

      <div className="toolbar-section">
        <button
          className="toolbar-button backup-button"
          onClick={handleBackup}
          title="Create Backup (Ctrl+B)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h10v-2H6V4h7v5h5v1.67l2 2V8l-6-6H6zm9.99 11.99L19 17l-3.01 3.01-.98-.98 1.87-1.87H13v-1.33h3.88l-1.87-1.87.98-.98z"/>
          </svg>
          <span>Backup</span>
        </button>
      </div>

      <div className="toolbar-spacer"></div>

      <div className="toolbar-section">
        <div className="status-indicator">
          <div className="status-dot online"></div>
          <span className="status-text">Desktop Mode</span>
        </div>
      </div>

      <style jsx>{`
        .desktop-toolbar {
          display: flex;
          align-items: center;
          height: 40px;
          background-color: var(--toolbar-bg, #ffffff);
          border-bottom: 1px solid var(--toolbar-border, #e1e5e9);
          padding: 0 12px;
          gap: 8px;
          user-select: none;
        }

        .toolbar-section {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .toolbar-separator {
          width: 1px;
          height: 24px;
          background-color: var(--toolbar-separator, #e1e5e9);
          margin: 0 4px;
        }

        .toolbar-spacer {
          flex: 1;
        }

        .toolbar-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border: none;
          background: transparent;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color: var(--toolbar-button-color, #374151);
          transition: all 0.2s ease;
        }

        .toolbar-button:hover:not(:disabled) {
          background-color: var(--toolbar-button-hover, #f3f4f6);
          color: var(--toolbar-button-hover-color, #111827);
        }

        .toolbar-button:active:not(:disabled) {
          background-color: var(--toolbar-button-active, #e5e7eb);
          transform: translateY(1px);
        }

        .toolbar-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .toolbar-button svg {
          flex-shrink: 0;
          color: currentColor;
        }

        .toolbar-button span {
          white-space: nowrap;
        }

        /* Specific button styles */
        .refresh-button:hover:not(:disabled) {
          background-color: var(--success-bg-light, #dcfce7);
          color: var(--success-color, #059669);
        }

        .export-button:hover:not(:disabled) {
          background-color: var(--primary-bg-light, #dbeafe);
          color: var(--primary-color, #2563eb);
        }

        .import-button:hover:not(:disabled) {
          background-color: var(--info-bg-light, #f0f9ff);
          color: var(--info-color, #0284c7);
        }

        .backup-button:hover:not(:disabled) {
          background-color: var(--warning-bg-light, #fef3c7);
          color: var(--warning-color, #d97706);
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 12px;
          background-color: var(--status-bg, #f3f4f6);
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: var(--status-dot-offline, #9ca3af);
        }

        .status-dot.online {
          background-color: var(--status-dot-online, #10b981);
          box-shadow: 0 0 4px var(--status-dot-online, #10b981);
        }

        .status-text {
          font-size: 12px;
          font-weight: 500;
          color: var(--status-text, #6b7280);
        }

        /* Dark theme support */
        @media (prefers-color-scheme: dark) {
          .desktop-toolbar {
            background-color: var(--toolbar-bg-dark, #1f2937);
            border-bottom-color: var(--toolbar-border-dark, #374151);
          }

          .toolbar-separator {
            background-color: var(--toolbar-separator-dark, #374151);
          }

          .toolbar-button {
            color: var(--toolbar-button-color-dark, #e5e7eb);
          }

          .toolbar-button:hover:not(:disabled) {
            background-color: var(--toolbar-button-hover-dark, #374151);
            color: var(--toolbar-button-hover-color-dark, #f9fafb);
          }

          .toolbar-button:active:not(:disabled) {
            background-color: var(--toolbar-button-active-dark, #4b5563);
          }

          .status-indicator {
            background-color: var(--status-bg-dark, #374151);
          }

          .status-text {
            color: var(--status-text-dark, #9ca3af);
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .toolbar-button span {
            display: none;
          }

          .toolbar-button {
            padding: 8px;
          }

          .status-indicator {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}

export default DesktopToolbar