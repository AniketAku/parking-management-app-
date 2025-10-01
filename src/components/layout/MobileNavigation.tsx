import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useParkingStore } from '../../stores/parkingStore'
import { usePermissions } from '../../hooks/useAuth'

export const MobileNavigation: React.FC = () => {
  const location = useLocation()
  const statistics = useParkingStore(state => state.statistics)
  const { canRead, canWrite } = usePermissions()

  // Core navigation items for mobile bottom nav
  const mobileNavItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      current: location.pathname === '/dashboard',
      icon: ({ className }: { className: string }) => (
        <svg className={className} fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
        </svg>
      ),
      label: 'Home',
    },
    {
      name: 'Vehicle Entry',
      href: '/entry',
      current: location.pathname === '/entry',
      icon: ({ className }: { className: string }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      label: 'Entry',
      requiresWrite: true,
    },
    {
      name: 'Vehicle Exit',
      href: '/exit',
      current: location.pathname === '/exit',
      icon: ({ className }: { className: string }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
        </svg>
      ),
      label: 'Exit',
      badge: statistics.parkedVehicles,
      requiresWrite: true,
    },
    {
      name: 'Search & Records',
      href: '/search',
      current: location.pathname === '/search',
      icon: ({ className }: { className: string }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      label: 'Search',
    },
    {
      name: 'Reports & Analytics',
      href: '/reports',
      current: location.pathname === '/reports',
      icon: ({ className }: { className: string }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      label: 'Reports',
    },
  ]

  // Filter navigation items based on permissions
  const allowedItems = mobileNavItems.filter(item => {
    if (item.requiresWrite && !canWrite) return false
    if (!canRead) return false
    return true
  })

  return (
    <nav className="mobile-bottom-nav">
      <div className="mobile-nav-container">
        {allowedItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              `mobile-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <div className="mobile-nav-icon-container">
              <item.icon className="mobile-nav-icon" />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="mobile-nav-badge">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="mobile-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </div>
      
      {/* Safe area padding for phones with home indicators */}
      <div className="mobile-nav-safe-area" />
    </nav>
  )
}