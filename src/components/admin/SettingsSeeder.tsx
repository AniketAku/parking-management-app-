/**
 * Settings Seeder Component
 * Admin utility to check and seed missing business settings
 */

import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { seedBusinessSettings, checkBusinessSettingsStatus } from '../../utils/seedBusinessSettings'

interface SeedingStatus {
  isChecking: boolean
  isSeeding: boolean
  status: any
  result: any
  lastChecked: Date | null
}

export const SettingsSeeder: React.FC = () => {
  const [state, setState] = useState<SeedingStatus>({
    isChecking: false,
    isSeeding: false,
    status: null,
    result: null,
    lastChecked: null
  })

  const checkStatus = async () => {
    setState(prev => ({ ...prev, isChecking: true }))
    
    try {
      const status = await checkBusinessSettingsStatus()
      setState(prev => ({
        ...prev,
        status,
        lastChecked: new Date(),
        isChecking: false
      }))
    } catch (error) {
      console.error('Error checking settings status:', error)
      setState(prev => ({ ...prev, isChecking: false }))
    }
  }

  const runSeeder = async () => {
    setState(prev => ({ ...prev, isSeeding: true }))
    
    try {
      const result = await seedBusinessSettings()
      setState(prev => ({
        ...prev,
        result,
        isSeeding: false
      }))
      
      // Refresh status after seeding
      if (result.success) {
        await checkStatus()
      }
    } catch (error) {
      console.error('Error seeding settings:', error)
      setState(prev => ({ ...prev, isSeeding: false }))
    }
  }

  return (
    <Card className="border-2 border-orange-200 bg-orange-50">
      <CardHeader>
        <h3 className="text-lg font-semibold text-orange-800">
          🛠️ Database Settings Seeder
        </h3>
        <p className="text-sm text-orange-700">
          Check and seed missing business settings in the database
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Check */}
        <div>
          <div className="flex gap-3 mb-3">
            <Button 
              onClick={checkStatus}
              disabled={state.isChecking}
              variant="outline"
              size="sm"
            >
              {state.isChecking ? 'Checking...' : 'Check Status'}
            </Button>
            
            {state.status?.needsSeeding && (
              <Button 
                onClick={runSeeder}
                disabled={state.isSeeding}
                className="bg-orange-600 hover:bg-orange-700 text-white"
                size="sm"
              >
                {state.isSeeding ? 'Seeding...' : 'Seed Missing Settings'}
              </Button>
            )}
          </div>

          {state.lastChecked && (
            <p className="text-xs text-gray-500 mb-2">
              Last checked: {state.lastChecked.toLocaleString()}
            </p>
          )}
        </div>

        {/* Status Display */}
        {state.status && (
          <div className="bg-white rounded-lg p-3 border border-orange-200">
            <h4 className="font-medium text-gray-800 mb-2">Settings Status</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Expected:</span>
                <span className="ml-2 font-medium">{state.status.total}</span>
              </div>
              <div>
                <span className="text-gray-600">Existing:</span>
                <span className="ml-2 font-medium text-green-600">{state.status.existing}</span>
              </div>
              <div>
                <span className="text-gray-600">Missing:</span>
                <span className="ml-2 font-medium text-red-600">{state.status.missing}</span>
              </div>
            </div>
            
            {state.status.missingKeys.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-red-700 mb-1">Missing Settings:</p>
                <ul className="text-xs text-red-600 space-y-1">
                  {state.status.missingKeys.map((key: string) => (
                    <li key={key}>• {key}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Seeding Result */}
        {state.result && (
          <div className={`rounded-lg p-3 border ${
            state.result.success 
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <h4 className="font-medium mb-1">
              {state.result.success ? '✅ Success' : '❌ Error'}
            </h4>
            <p className="text-sm">{state.result.message}</p>
            
            {state.result.success && state.result.settings && (
              <div className="mt-2">
                <p className="text-sm font-medium">Seeded Settings:</p>
                <ul className="text-xs space-y-1 mt-1">
                  {state.result.settings.map((key: string) => (
                    <li key={key}>• {key}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <h4 className="font-medium text-blue-800 mb-1">Instructions</h4>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. Click "Check Status" to see what settings are missing</li>
            <li>2. If settings are missing, click "Seed Missing Settings"</li>
            <li>3. Refresh the page after seeding to see the changes</li>
            <li>4. Remove this component once seeding is complete</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}