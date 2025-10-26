import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useCurrentUser, usePermissions } from '../../hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermission?: string
  requiredRole?: 'admin' | 'user'
  fallback?: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredRole,
  fallback
}) => {
  const location = useLocation()
  const { isAuthenticated, isLoading, user } = useCurrentUser()
  const { hasPermission } = usePermissions()

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-light">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-text-muted">Authenticating...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check role requirements
  if (requiredRole && user?.role !== requiredRole) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-surface-light">
        <div className="text-center max-w-md px-4">
          <div className="bg-warning-50 rounded-full p-6 mx-auto w-20 h-20 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Access Denied</h2>
          <p className="text-text-muted mb-6">
            You don't have the required permissions to access this page.
            {requiredRole && (
              <>
                <br />
                <span className="text-sm">Required role: <span className="font-medium">{requiredRole}</span></span>
              </>
            )}
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Check permission requirements
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-surface-light">
        <div className="text-center max-w-md px-4">
          <div className="bg-warning-50 rounded-full p-6 mx-auto w-20 h-20 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Permission Required</h2>
          <p className="text-text-muted mb-6">
            You don't have the required permission to access this page.
            <br />
            <span className="text-sm">Required permission: <span className="font-medium">{requiredPermission}</span></span>
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // All checks passed - render the protected content
  return <>{children}</>
}

// Specific route protection components for common use cases
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRole="admin">
    {children}
  </ProtectedRoute>
)

export const UserRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRole="user">
    {children}
  </ProtectedRoute>
)

export const WriteProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredPermission="write">
    {children}
  </ProtectedRoute>
)

export default ProtectedRoute