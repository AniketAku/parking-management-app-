import React, { useState } from 'react'
import type { ComponentWithChildren } from '../../types'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { MobileNavigation } from './MobileNavigation'
import '../../App.css'

interface AppLayoutProps extends ComponentWithChildren {}

interface MobileLayoutState {
  sidebarOpen: boolean
  mobileMenuOpen: boolean
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [mobileState, setMobileState] = useState<MobileLayoutState>({
    sidebarOpen: false,
    mobileMenuOpen: false
  })

  const toggleSidebar = () => {
    setMobileState(prev => ({
      ...prev,
      sidebarOpen: !prev.sidebarOpen
    }))
  }

  const toggleMobileMenu = () => {
    setMobileState(prev => ({
      ...prev,
      mobileMenuOpen: !prev.mobileMenuOpen
    }))
  }

  const closeMobileMenu = () => {
    setMobileState(prev => ({
      ...prev,
      sidebarOpen: false,
      mobileMenuOpen: false
    }))
  }

  return (
    <div className="min-h-screen bg-light-100 dark:bg-gray-900">
      {/* Fixed Header - Always visible at top */}
      <Header 
        onToggleSidebar={toggleSidebar}
        onToggleMobileMenu={toggleMobileMenu}
        isMobileMenuOpen={mobileState.mobileMenuOpen}
      />
      
      {/* Desktop layout with fixed positioning */}
      <div className="hidden lg:flex">
        {/* Fixed Desktop Sidebar */}
        <div className="app-sidebar">
          <Sidebar />
        </div>
        
        {/* Desktop Main content with proper offsets */}
        <main className="app-main-content with-sidebar flex-1">
          <div className="scrollable-content px-4 sm:px-6 py-4">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile & Tablet layout */}
      <div className="lg:hidden">
        {/* Mobile Sidebar Overlay */}
        {mobileState.sidebarOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={closeMobileMenu}
            />
            
            {/* Mobile Sidebar */}
            <div className="fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out">
              <Sidebar onClose={closeMobileMenu} mobile />
            </div>
          </>
        )}
        
        {/* Mobile Main content with header offset */}
        <main className="app-main-content">
          <div className="scrollable-content mobile-content px-4 py-4">
            <div className="max-w-4xl mx-auto">
              {children}
            </div>
          </div>
        </main>
        
        {/* Fixed Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-40">
          <MobileNavigation />
        </div>
      </div>
    </div>
  )
}