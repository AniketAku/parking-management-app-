import React, { useEffect, useState } from 'react'
import { useCurrentUser, useLogout } from '../../hooks/useAuth'
import { Button } from '../ui'
import { ThemeToggle } from '../ui/ThemeToggle'
import { HeaderConnectionIndicator } from '../common/ConnectionStatus'
import { PWAStatusIndicator } from '../pwa'

interface HeaderProps {
  onToggleSidebar?: () => void
  onToggleMobileMenu?: () => void
  isMobileMenuOpen?: boolean
}

export const Header: React.FC<HeaderProps> = ({ 
  onToggleSidebar, 
  onToggleMobileMenu,
  isMobileMenuOpen = false 
}) => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const { user } = useCurrentUser()
  const { mutate: logout, loading: logoutLoading } = useLogout()

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
  }

  return (
    <header className="app-header">
      {/* Left side - Mobile menu button + Title */}
      <div className="flex items-center flex-1">
        {/* Mobile menu button */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-md text-white hover:bg-white hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 mr-3"
          aria-label="Open navigation menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center space-x-3">
          {/* Logo/Icon */}
          <div className="bg-white bg-opacity-20 rounded-lg p-2">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
          </div>
          
          {/* Title - Responsive */}
          <h1 className="app-title text-sm sm:text-lg truncate">
            <span className="hidden sm:inline">Parking Management System</span>
            <span className="sm:hidden">Parking System</span>
          </h1>
        </div>
      </div>

      {/* Right side - Time and User - Responsive */}
      <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-6">
        {/* Theme toggle and status indicators - Hidden on small screens */}
        <div className="hidden sm:flex sm:items-center sm:space-x-3">
          <ThemeToggle />
          <HeaderConnectionIndicator />
          <PWAStatusIndicator showLabels={false} />
        </div>
        
        {/* Current time - Responsive format */}
        <div className="app-clock text-xs sm:text-sm hidden md:block">
          <span className="hidden lg:inline">{formatTime(currentTime)}</span>
          <span className="lg:hidden">
            {currentTime.toLocaleString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </span>
        </div>

        {/* User info and logout - Responsive */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* User info - Hidden on very small screens */}
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-white truncate max-w-24 lg:max-w-none">
              {user?.username || 'User'}
            </div>
            <div className="text-xs text-white text-opacity-80 capitalize">
              {user?.role || 'user'}
            </div>
          </div>
          
          {/* User avatar */}
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>

          {/* Logout button - Responsive */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => logout()}
            loading={logoutLoading}
            className="bg-white bg-opacity-10 border-white border-opacity-30 text-white hover:bg-white hover:bg-opacity-20 px-2 sm:px-3"
          >
            <svg className="w-4 h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">
              {logoutLoading ? 'Logging out...' : 'Logout'}
            </span>
          </Button>
        </div>
      </div>
    </header>
  )
}