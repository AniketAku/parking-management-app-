import React from 'react'
import { usePWAInstall } from '../../hooks/usePWA'
import { Button } from '../ui'

interface PWAInstallPromptProps {
  onInstall?: (success: boolean) => void
  onDismiss?: () => void
  compact?: boolean
  className?: string
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  onInstall,
  onDismiss,
  compact = false,
  className = ''
}) => {
  const { canInstall, isInstalled, installing, install } = usePWAInstall()

  // Don't show if already installed or can't install
  if (isInstalled || !canInstall) return null

  const handleInstall = async () => {
    const success = await install()
    onInstall?.(success)
  }

  const handleDismiss = () => {
    onDismiss?.()
  }

  if (compact) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900">Install App</span>
        </div>
        <div className="flex space-x-2">
          <Button
            size="sm"
            onClick={handleInstall}
            loading={installing}
            className="bg-primary-600 hover:bg-primary-700"
          >
            {installing ? 'Installing...' : 'Install'}
          </Button>
          <button
            onClick={handleDismiss}
            className="text-sm text-gray-500 hover:text-gray-700 px-2"
          >
            Later
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">
            Install Parking System
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Install our app for faster access and offline functionality. 
            Get notifications for important updates and enjoy a native app experience.
          </p>
          
          <div className="mt-4 flex items-center space-x-4">
            <h4 className="text-sm font-medium text-gray-900">Features:</h4>
            <ul className="flex space-x-4 text-sm text-gray-600">
              <li className="flex items-center space-x-1">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Offline Access</span>
              </li>
              <li className="flex items-center space-x-1">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Notifications</span>
              </li>
              <li className="flex items-center space-x-1">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Fast Loading</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex justify-end space-x-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDismiss}
        >
          Maybe Later
        </Button>
        <Button
          size="sm"
          onClick={handleInstall}
          loading={installing}
          className="bg-primary-600 hover:bg-primary-700"
        >
          {installing ? 'Installing...' : 'Install Now'}
        </Button>
      </div>
    </div>
  )
}

// Banner version for header/footer
export const PWAInstallBanner: React.FC<Pick<PWAInstallPromptProps, 'onInstall' | 'onDismiss'>> = ({
  onInstall,
  onDismiss
}) => {
  const { canInstall, isInstalled, installing, install } = usePWAInstall()

  if (isInstalled || !canInstall) return null

  const handleInstall = async () => {
    const success = await install()
    onInstall?.(success)
  }

  return (
    <div className="bg-primary-50 border-b border-primary-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-primary-800">
                Install the Parking System app for a better experience
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              size="sm"
              variant="outline"
              onClick={handleInstall}
              loading={installing}
              className="border-primary-300 text-primary-700 hover:bg-primary-100"
            >
              {installing ? 'Installing...' : 'Install'}
            </Button>
            <button
              onClick={onDismiss}
              className="text-primary-600 hover:text-primary-800 p-1"
              aria-label="Dismiss install banner"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}