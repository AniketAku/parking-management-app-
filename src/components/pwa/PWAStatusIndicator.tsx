import React from 'react'
import { useNetworkStatus, usePWAUpdate } from '../../hooks/usePWA'

interface PWAStatusIndicatorProps {
  showLabels?: boolean
  className?: string
}

export const PWAStatusIndicator: React.FC<PWAStatusIndicatorProps> = ({
  showLabels = false,
  className = ''
}) => {
  const { isOnline } = useNetworkStatus()
  const { updateAvailable, applyUpdate, updating } = usePWAUpdate()

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Network Status */}
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        {showLabels && (
          <span className={`text-xs font-medium ${isOnline ? 'text-green-700' : 'text-red-700'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        )}
      </div>

      {/* Update Available */}
      {updateAvailable && (
        <button
          onClick={applyUpdate}
          disabled={updating}
          className="flex items-center space-x-1 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
          title="Update available"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          {showLabels && (
            <span>{updating ? 'Updating...' : 'Update'}</span>
          )}
        </button>
      )}
    </div>
  )
}

export const PWAOfflineIndicator: React.FC = () => {
  const { isOnline } = useNetworkStatus()

  if (isOnline) return null

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-yellow-800">
            You're currently offline
          </p>
          <p className="text-sm text-yellow-700 mt-1">
            Some features may be limited. Changes will sync when connection is restored.
          </p>
        </div>
      </div>
    </div>
  )
}