/**
 * Settings Section Component
 * Groups related settings with consistent spacing
 */

import React from 'react'

interface SettingsSectionProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  description, 
  children,
  className = ''
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <div>
          <h4 className="text-base font-medium text-gray-900">{title}</h4>
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}