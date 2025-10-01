/**
 * Demo Mode Indicator Component
 * Shows demo mode status and available demo users
 */

import React from 'react'
import { secureDemoService } from '../../services/secureDemoService'

export const DemoModeIndicator: React.FC = () => {
  const demoStatus = secureDemoService.getDemoStatus()

  if (!demoStatus.isDemo) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-black px-4 py-2 text-center text-sm font-medium">
      🚧 DEMO MODE - Development Environment Only
      <div className="text-xs mt-1">
        Available demo users: {demoStatus.availableUsers.join(', ')}
      </div>
    </div>
  )
}

export default DemoModeIndicator