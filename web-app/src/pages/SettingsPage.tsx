import React from 'react'
import { SettingsManager } from '../components/admin/SettingsManager'
import type { SettingCategory } from '../types/settings'
import { log } from '../utils/secureLogger'

interface SettingsPageProps {
  defaultCategory?: SettingCategory
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ 
  defaultCategory = 'business' 
}) => {
  return (
    <div className="h-screen bg-gray-50">
      <SettingsManager
        className="h-full"
        defaultCategory={defaultCategory}
        onSettingChange={(category, key, value) => {
          log.debug('Setting changed', { category, key, value })
        }}
      />
    </div>
  )
}