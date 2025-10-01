import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import type { NavigationItem } from '../../types'
import { useParkingStore } from '../../stores/parkingStore'
import { usePermissions, useCurrentUser } from '../../hooks/useAuth'

interface SidebarProps {
  onClose?: () => void
  mobile?: boolean
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose, mobile = false }) => {
  const location = useLocation()
  const statistics = useParkingStore(state => state.statistics)
  const { canRead, canWrite } = usePermissions()
  const { user } = useCurrentUser()
  const isAdmin = user?.role === 'admin'

  // Navigation items matching desktop application structure
  const navigationItems: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      current: location.pathname === '/dashboard',
      icon: ({ className }) => (
        <svg className={className} fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
        </svg>
      ),
    },
    {
      name: 'Vehicle Entry',
      href: '/entry',
      current: location.pathname === '/entry',
      icon: ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
    },
    {
      name: 'Vehicle Exit',
      href: '/exit',
      current: location.pathname === '/exit',
      icon: ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
        </svg>
      ),
      badge: statistics.parkedVehicles,
    },
    {
      name: 'Search & Records',
      href: '/search',
      current: location.pathname === '/search',
      icon: ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      name: 'Reports',
      href: '/reports',
      current: location.pathname === '/reports',
      icon: ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      name: 'Analytics',
      href: '/analytics',
      current: location.pathname === '/analytics',
      icon: ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      name: 'Shift Management',
      href: '/shifts',
      current: location.pathname === '/shifts',
      icon: ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: 'User Management',
      href: '/users',
      current: location.pathname === '/users',
      icon: ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      adminOnly: true, // Add flag to identify admin-only items
    },
    {
      name: 'My Profile',
      href: '/profile',
      current: location.pathname === '/profile',
      icon: ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      name: 'System Settings',
      href: '/settings',
      current: location.pathname === '/settings',
      icon: ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      adminOnly: true, // Settings is admin-only
    },
    {
      name: 'Performance Monitor',
      href: '/performance',
      current: location.pathname === '/performance',
      icon: ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
  ]

  // Filter navigation items based on permissions
  const allowedItems = navigationItems.filter(item => {
    if (item.name === 'Vehicle Entry' && !canWrite) return false
    if (item.name === 'Vehicle Exit' && !canWrite) return false
    if ((item as any).adminOnly && !isAdmin) return false // Hide admin-only items from non-admins
    if (!canRead) return false
    return true
  })

  return (
    <aside className={`${mobile ? 'bg-gradient-to-br from-primary-800 to-primary-900 shadow-xl' : 'bg-white dark:bg-gray-900'} h-full flex flex-col border-r border-gray-200 dark:border-gray-700`}>
      {/* Navigation header */}
      <div className={`p-4 border-b ${mobile ? 'border-primary-700' : 'border-gray-200 dark:border-gray-700'} flex items-center justify-between`}>
        <h2 className={`text-sm font-medium uppercase tracking-wider ${
          mobile ? 'text-white text-opacity-80' : 'text-gray-600 dark:text-gray-300'
        }`}>
          Navigation
        </h2>
        {mobile && (
          <button
            onClick={onClose}
            className="p-2 rounded-md text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
            aria-label="Close navigation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation links */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {allowedItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={mobile ? onClose : undefined}
            className={({ isActive }) =>
              `group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ease-out ${
                isActive
                  ? mobile
                    ? 'bg-primary-700 text-white shadow-lg ring-2 ring-primary-500/30'
                    : 'bg-primary-50 text-primary-700 / dark:text-primary-300 border-r-2 border-primary-500 shadow-sm'
                  : mobile
                  ? 'text-white hover:bg-primary-700/80 hover:text-white active:scale-95'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 active:scale-95 hover:shadow-sm'
              }`
            }
          >
            <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 transition-all duration-300 ${
              mobile ? 'text-current group-hover:scale-110' : 'text-current group-hover:scale-110'
            }`} />
            <span className="flex-1 group-hover:translate-x-0.5 transition-transform duration-300">{item.name}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="bg-primary-500 dark:bg-primary-600 text-primary-100 dark:text-primary-200 text-xs font-medium px-2.5 py-1 rounded-full ml-2 shadow-sm group-hover:scale-105 transition-transform duration-300">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer with stats summary */}
      <div className={`p-4 border-t ${mobile ? 'border-primary-700' : 'border-gray-200 dark:border-gray-700'} space-y-3 bg-opacity-50 ${mobile ? 'bg-primary-900' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
        <div className={`text-xs uppercase tracking-wider font-medium ${
          mobile ? 'text-white text-opacity-60' : 'text-gray-500 dark:text-gray-400'
        }`}>
          Quick Stats
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm hover:bg-black/5 dark:hover:bg-white/5 px-2 py-1 rounded-md transition-colors duration-200">
            <span className={mobile ? 'text-white text-opacity-80' : 'text-gray-600 dark:text-gray-300'}>
              Parked
            </span>
            <span className={`font-medium ${mobile ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
              {statistics.parkedVehicles}
            </span>
          </div>
          
          <div className="flex justify-between text-sm hover:bg-black/5 dark:hover:bg-white/5 px-2 py-1 rounded-md transition-colors duration-200">
            <span className={mobile ? 'text-white text-opacity-80' : 'text-gray-600 dark:text-gray-300'}>
              Today's Income
            </span>
            <span className={`font-medium ${mobile ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
              ₹{statistics.todayIncome.toLocaleString()}
            </span>
          </div>
          
          {statistics.unpaidVehicles > 0 && (
            <div className="flex justify-between text-sm hover:bg-black/5 dark:hover:bg-white/5 px-2 py-1 rounded-md transition-colors duration-200">
              <span className={mobile ? 'text-warning-300' : 'text-warning-600 dark:text-warning-400'}>
                Unpaid
              </span>
              <span className={`font-medium ${mobile ? 'text-warning-300' : 'text-warning-600 dark:text-warning-400'}`}>
                {statistics.unpaidVehicles}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}