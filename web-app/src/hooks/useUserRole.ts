import { useState, useEffect } from 'react'

export type UserRole = 'admin' | 'operator' | 'viewer'

interface UserContext {
  role: UserRole
  permissions: {
    canAccessAdvancedAnalytics: boolean
    canAccessBusinessIntelligence: boolean
    canManageEntries: boolean
    canProcessPayments: boolean
    canViewReports: boolean
    canEditEntryDates: boolean  // 🛡️ ADMIN-ONLY: Critical permission for entry date modification
  }
}

export const useUserRole = (): UserContext => {
  const [role, setRole] = useState<UserRole>('viewer')

  useEffect(() => {
    // In a real application, this would be determined by authentication
    // For now, we'll simulate getting the role from localStorage or default to admin for testing
    const savedRole = localStorage.getItem('userRole') as UserRole
    if (savedRole && ['admin', 'operator', 'viewer'].includes(savedRole)) {
      setRole(savedRole)
    } else {
      // Default to admin for development/testing
      setRole('admin')
      localStorage.setItem('userRole', 'admin')
    }
  }, [])

  const getPermissions = (userRole: UserRole) => {
    switch (userRole) {
      case 'admin':
        return {
          canAccessAdvancedAnalytics: true,
          canAccessBusinessIntelligence: true,
          canManageEntries: true,
          canProcessPayments: true,
          canViewReports: true,
          canEditEntryDates: true  // 🛡️ ADMIN-ONLY: Entry date editing is restricted to admin
        }
      case 'operator':
        return {
          canAccessAdvancedAnalytics: false,
          canAccessBusinessIntelligence: false,
          canManageEntries: true,
          canProcessPayments: true,
          canViewReports: true,
          canEditEntryDates: false  // 🚫 OPERATORS CANNOT EDIT ENTRY DATES (fraud prevention)
        }
      case 'viewer':
        return {
          canAccessAdvancedAnalytics: false,
          canAccessBusinessIntelligence: false,
          canManageEntries: false,
          canProcessPayments: false,
          canViewReports: true,
          canEditEntryDates: false  // 🚫 VIEWERS CANNOT EDIT ENTRY DATES
        }
      default:
        return {
          canAccessAdvancedAnalytics: false,
          canAccessBusinessIntelligence: false,
          canManageEntries: false,
          canProcessPayments: false,
          canViewReports: true,
          canEditEntryDates: false  // 🚫 DEFAULT: NO ENTRY DATE EDITING
        }
    }
  }

  return {
    role,
    permissions: getPermissions(role)
  }
}

// Utility function to set user role (for development/testing)
export const setUserRole = (newRole: UserRole) => {
  localStorage.setItem('userRole', newRole)
  // Force page reload to apply new role
  window.location.reload()
}