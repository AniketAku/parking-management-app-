/**
 * Settings Header Component
 * Header with save/discard actions and template management
 */

import React from 'react'
import {
  CheckIcon,
  XMarkIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface SettingsHeaderProps {
  unsavedChanges: number
  onSave: () => Promise<void>
  onDiscard: () => void
  onShowTemplates: () => void
  onExport?: () => void
  onImport?: () => void
  templatesCount?: number
  className?: string
}

export function SettingsHeader({
  unsavedChanges,
  onSave,
  onDiscard,
  onShowTemplates,
  onExport,
  onImport,
  templatesCount = 0,
  className = ''
}: SettingsHeaderProps) {
  const [saving, setSaving] = React.useState(false)

  const handleSave = async () => {
    try {
      setSaving(true)
      await onSave()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`bg-white border-b border-gray-200 px-6 py-4 ${className}`}>
      <div className="flex items-center justify-between">
        {/* Title and status */}
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-900">
            Settings Management
          </h1>
          
          {unsavedChanges > 0 && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full">
              <ExclamationTriangleIcon className="w-4 h-4" />
              <span className="text-sm font-medium">
                {unsavedChanges} unsaved change{unsavedChanges !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {/* Import/Export */}
          <div className="flex items-center space-x-2">
            {onImport && (
              <button
                onClick={onImport}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                title="Import settings"
              >
                <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
                Import
              </button>
            )}
            
            {onExport && (
              <button
                onClick={onExport}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                title="Export settings"
              >
                <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                Export
              </button>
            )}
          </div>

          {/* Templates */}
          <button
            onClick={onShowTemplates}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
            Templates
            {templatesCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                {templatesCount}
              </span>
            )}
          </button>

          {/* Save/Discard actions */}
          {unsavedChanges > 0 && (
            <div className="flex items-center space-x-2 pl-3 border-l border-gray-300">
              <button
                onClick={onDiscard}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                <XMarkIcon className="w-4 h-4 mr-2" />
                Discard
              </button>
              
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin border-2 border-white border-t-transparent rounded-full" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsHeader