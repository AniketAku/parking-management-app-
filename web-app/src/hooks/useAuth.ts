import { useCallback } from 'react'
import { useSecureAuthStore } from '../stores/secureAuthStore'
import { useMutation } from './useApi'
import type { LoginCredentials } from '../types'

export function useLogin() {
  const login = useSecureAuthStore(state => state.login)

  return useMutation(
    async (credentials: LoginCredentials) => {
      await login(credentials)
    },
    {
      showSuccessToast: '✅ Login successful! Welcome back.',
      showErrorToast: true
    }
  )
}

export function useLogout() {
  const logout = useSecureAuthStore(state => state.logout)

  return useMutation(
    async () => {
      logout()
    },
    {
      showSuccessToast: '👋 Logged out successfully',
      showErrorToast: false // Don't show error toast for logout
    }
  )
}

export function useRefreshToken() {
  const refreshToken = useSecureAuthStore(state => state.refreshToken)

  return useMutation(
    async () => {
      await refreshToken()
    },
    {
      showErrorToast: false // Token refresh should be silent
    }
  )
}

export function useAuthRestore() {
  const setLoading = useSecureAuthStore(state => state.setLoading)

  const restore = useCallback(async () => {
    setLoading(true)
    
    try {
      // Auth store handles its own persistence, so just indicate loading is done
      return true
    } catch (error) {
      // Failed to restore authentication
      return false
    } finally {
      setLoading(false)
    }
  }, [setLoading])

  return { restore }
}

export function useAuthValidation() {
  const { user, tokens } = useSecureAuthStore()

  const validateAuth = useCallback(() => {
    return {
      isAuthenticated: !!(user && tokens),
      hasUser: !!user,
      hasToken: !!tokens,
      isAdmin: user?.role === 'admin',
      hasPermission: (permission: string) => 
        user?.permissions?.includes(permission) || user?.role === 'admin'
    }
  }, [user, tokens])

  return validateAuth()
}

export function useCurrentUser() {
  const result = useSecureAuthStore(state => {
    const isLoading = state.isLoading || !state.hasHydrated
    // Debug logging disabled for performance
    // console.log('🔍 [useCurrentUser] Called with state:', {
    //   hasUser: !!state.user,
    //   isAuthenticated: state.isAuthenticated,
    //   hasHydrated: state.hasHydrated,
    //   isLoadingStore: state.isLoading,
    //   finalIsLoading: isLoading
    // })

    return {
      user: state.user,
      isAuthenticated: state.isAuthenticated,
      // Ensure loading state is true until both hydration and initialization complete
      isLoading: isLoading,
      isAdmin: state.user?.role === 'admin',
      permissions: state.user?.permissions || []
    }
  })

  return result
}

export function usePermissions() {
  const { user, hasPermission } = useSecureAuthStore()

  return {
    canRead: hasPermission('parking:read'),
    canWrite: hasPermission('parking:write'),
    canDelete: hasPermission('parking:delete'),
    canAdmin: user?.role === 'admin',
    hasPermission
  }
}