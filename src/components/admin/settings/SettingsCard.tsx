/**
 * Settings Card Component
 * Wrapper for settings sections with consistent styling
 */

import React from 'react'

interface SettingsCardProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export const SettingsCard: React.FC<SettingsCardProps> = ({
  title,
  description,
  children,
  className = ''
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}