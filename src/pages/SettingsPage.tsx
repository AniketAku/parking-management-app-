import React from 'react'
import { SettingsManager } from '../components/admin/SettingsManager'
import type { SettingCategory } from '../types/settings'

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
          console.log(`Setting changed: ${category}.${key} = ${value}`)
        }}
      />
    </div>
  )
}