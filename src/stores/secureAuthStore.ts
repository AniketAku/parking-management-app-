import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { AuthUser, AuthTokens, LoginCredentials } from '../types'
import { secureAuthService, type AuthResult, type RegistrationData, type PasswordChangeRequest } from '../services/secureAuthService'
import { supabase } from '../lib/supabase'

interface SecureAuthState {
  user: AuthUser | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
  hasHydrated: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  register: (userData: RegistrationData) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  changePassword: (request: PasswordChangeRequest) => Promise<void>
  validateSession: () => Promise<boolean>
  requestPasswordReset: (username: string) => Promise<void>
  resetPassword: (newPassword: string) => Promise<void>
  clearError: () => void
  setUser: (user: AuthUser) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  hasPermission: (permission: string) => boolean
  isTokenExpired: () => boolean
  getAuthHeader: () => string | null
  initializeAuth: () => Promise<void>
}

export const useSecureAuthStore = create<SecureAuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        hasHydrated: false,
        error: null,

        initializeAuth: async () => {
          const currentState = get()
          console.log('🔐 [InitAuth] Starting authentication initialization...')
          console.log('🔍 [InitAuth] Current state before init:', {
            hasUser: !!currentState.user,
            hasTokens: !!currentState.tokens,
            isAuthenticated: currentState.isAuthenticated,
            hasHydrated: currentState.hasHydrated,
            isLoading: currentState.isLoading
          })

          // Don't re-initialize if already in progress
          if (currentState.isLoading) {
            console.log('⚠️ [InitAuth] Already initializing, skipping...')
            return
          }

          set({ isLoading: true })

          try {

            // Check if we have persisted user and tokens
            if (currentState.user && currentState.tokens) {
              console.log('📦 Found persisted auth data, validating session...')
              console.log('👤 User data:', { name: currentState.user.name, role: currentState.user.role })

              // Validate session is still good
              console.log('⏳ Calling validateSession...')
              const validation = await secureAuthService.validateSession()
              console.log('✅ Validation result:', validation)

              if (validation.isValid && validation.user) {
                console.log('✅ Session valid, restoring authentication')

                // Update tokens from current session
                const { data: { session } } = await supabase.auth.getSession()
                console.log('🔗 Supabase session:', { hasSession: !!session, user: session?.user?.id })

                const tokens: AuthTokens = session ? {
                  accessToken: session.access_token,
                  refreshToken: session.refresh_token,
                  expiresAt: new Date(session.expires_at! * 1000),
                } : currentState.tokens

                set({
                  user: validation.user,
                  tokens,
                  isAuthenticated: !!(validation.user && tokens),
                  isLoading: false,
                  error: null
                })

                console.log('🎉 Authentication restored successfully')
                return
              } else {
                console.log('❌ Session invalid, validation result:', validation)
                console.log('🧹 Clearing persisted data...')
                await secureAuthService.logout()
              }
            } else {
              console.log('📭 No persisted auth data found')
              console.log('🔍 Checking what we have:', {
                user: currentState.user,
                tokens: currentState.tokens
              })
            }

            // No valid persisted auth or validation failed
            console.log('🚫 Setting unauthenticated state')
            set({
              user: null,
              tokens: null,
              isAuthenticated: false,
              isLoading: false,
              error: null
            })

          } catch (error) {
            console.error('❌ Auth initialization failed:', error)
            set({
              user: null,
              tokens: null,
              isAuthenticated: false,
              isLoading: false,
              error: null
            })
          }
        },

        login: async (credentials: LoginCredentials) => {
          set({ isLoading: true, error: null })
          
          try {
            // Secure login attempt initiated
            
            // Always use production-ready secure auth service
            const authService = secureAuthService
            
            const result: AuthResult = await authService.login(credentials)
            
            set({
              user: result.user,
              tokens: result.tokens,
              isAuthenticated: true,
              isLoading: false,
              error: null
            })

            console.log('✅ Secure login successful')
          } catch (error) {
            console.error('❌ Secure login failed:', error)
            const errorMessage = error instanceof Error ? error.message : 'Login failed'
            
            set({
              user: null,
              tokens: null,
              isAuthenticated: false,
              isLoading: false,
              error: errorMessage
            })
            
            throw error
          }
        },

        register: async (userData: RegistrationData) => {
          set({ isLoading: true, error: null })
          
          try {
            const result: AuthResult = await secureAuthService.register(userData)
            
            set({
              user: result.user,
              tokens: result.tokens,
              isAuthenticated: true,
              isLoading: false,
              error: null
            })

            console.log('✅ Registration successful')
          } catch (error) {
            console.error('❌ Registration failed:', error)
            const errorMessage = error instanceof Error ? error.message : 'Registration failed'
            
            set({
              user: null,
              tokens: null,
              isAuthenticated: false,
              isLoading: false,
              error: errorMessage
            })
            
            throw error
          }
        },

        logout: async () => {
          set({ isLoading: true })
          
          try {
            await secureAuthService.logout()
            
            set({
              user: null,
              tokens: null,
              isAuthenticated: false,
              isLoading: false,
              error: null
            })

            console.log('✅ Secure logout successful')
          } catch (error) {
            console.error('❌ Logout error:', error)
            // Force logout even if API call fails
            set({
              user: null,
              tokens: null,
              isAuthenticated: false,
              isLoading: false,
              error: null
            })
          }
        },

        refreshToken: async () => {
          const { tokens } = get()
          
          if (!tokens?.refreshToken) {
            throw new Error('No refresh token available')
          }

          try {
            const newTokens = await secureAuthService.refreshToken()
            
            set({ 
              tokens: newTokens,
              error: null 
            })
            
            console.log('✅ Token refreshed successfully')
          } catch (error) {
            console.error('❌ Token refresh failed:', error)
            
            // Force logout on refresh failure
            await get().logout()
            throw new Error('Session expired. Please login again.')
          }
        },

        changePassword: async (request: PasswordChangeRequest) => {
          const { user } = get()
          
          if (!user) {
            throw new Error('User not authenticated')
          }

          set({ isLoading: true, error: null })

          try {
            await secureAuthService.changePassword(request)
            
            set({ 
              isLoading: false, 
              error: null 
            })

            console.log('✅ Password changed successfully')
          } catch (error) {
            console.error('❌ Password change failed:', error)
            const errorMessage = error instanceof Error ? error.message : 'Password change failed'
            
            set({ 
              isLoading: false, 
              error: errorMessage 
            })
            
            throw error
          }
        },

        validateSession: async () => {
          try {
            const validation = await secureAuthService.validateSession()
            
            if (!validation.isValid) {
              // Session invalid, clear state
              set({
                user: null,
                tokens: null,
                isAuthenticated: false,
                error: null
              })
              return false
            }

            if (validation.needsRefresh) {
              await get().refreshToken()
            }

            if (validation.user && validation.isValid) {
              set({
                user: validation.user,
                isAuthenticated: true,
                error: null
              })
            }

            return validation.isValid
          } catch (error) {
            console.error('Session validation failed:', error)
            
            set({
              user: null,
              tokens: null,
              isAuthenticated: false,
              error: null
            })
            
            return false
          }
        },

        requestPasswordReset: async (username: string) => {
          set({ isLoading: true, error: null })
          
          try {
            await secureAuthService.requestPasswordReset(username)
            
            set({ 
              isLoading: false, 
              error: null 
            })

            console.log('✅ Password reset email sent')
          } catch (error) {
            console.error('❌ Password reset request failed:', error)
            const errorMessage = error instanceof Error ? error.message : 'Password reset failed'
            
            set({ 
              isLoading: false, 
              error: errorMessage 
            })
            
            throw error
          }
        },

        resetPassword: async (newPassword: string) => {
          set({ isLoading: true, error: null })
          
          try {
            await secureAuthService.resetPassword(newPassword)
            
            set({ 
              isLoading: false, 
              error: null 
            })

            console.log('✅ Password reset successful')
          } catch (error) {
            console.error('❌ Password reset failed:', error)
            const errorMessage = error instanceof Error ? error.message : 'Password reset failed'
            
            set({ 
              isLoading: false, 
              error: errorMessage 
            })
            
            throw error
          }
        },

        clearError: () => set({ error: null }),
        setUser: (user: AuthUser) => set({ user }),
        setLoading: (loading: boolean) => set({ isLoading: loading }),
        setError: (error: string | null) => set({ error }),

        hasPermission: (permission: string) => {
          const { user } = get()
          return secureAuthService.hasPermission(user, permission)
        },

        isTokenExpired: () => {
          const { tokens } = get()
          if (!tokens?.expiresAt) return true
          
          // Consider token expired if it expires in the next 5 minutes
          const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)
          return tokens.expiresAt <= fiveMinutesFromNow
        },

        getAuthHeader: () => {
          const { tokens } = get()
          return tokens?.accessToken ? `Bearer ${tokens.accessToken}` : null
        }
      }),
      {
        name: 'secure-auth-storage',
        partialize: (state) => ({
          user: state.user,
          tokens: state.tokens
          // Note: isAuthenticated is derived from user && tokens existence
        }),
        // Encrypt sensitive data in localStorage using new storage API
        storage: {
          getItem: (name) => {
            const str = localStorage.getItem(name)
            if (!str) return null
            try {
              return JSON.parse(atob(str))
            } catch {
              return null
            }
          },
          setItem: (name, value) => {
            const serialized = JSON.stringify(value)
            const encoded = btoa(serialized) // Basic encoding, use proper encryption in production
            localStorage.setItem(name, encoded)
          },
          removeItem: (name) => localStorage.removeItem(name)
        },
        // Custom rehydration to properly derive isAuthenticated
        onRehydrateStorage: () => (state) => {
          console.log('🚀 [Rehydration] Starting Zustand rehydration...')
          if (state) {
            console.log('📥 [Rehydration] Raw persisted state:', {
              hasUser: !!state.user,
              hasTokens: !!state.tokens,
              wasAuthenticated: state.isAuthenticated,
              wasHydrated: state.hasHydrated
            })

            // Derive isAuthenticated from persisted user and tokens
            state.isAuthenticated = !!(state.user && state.tokens)
            // Mark as hydrated to prevent race conditions
            state.hasHydrated = true

            console.log('✅ [Rehydration] Auth state rehydrated:', {
              hasUser: !!state.user,
              hasTokens: !!state.tokens,
              isAuthenticated: state.isAuthenticated,
              hasHydrated: state.hasHydrated
            })
          } else {
            console.log('📭 [Rehydration] No persisted state found')
          }
        }
      }
    ),
    { name: 'secure-auth-store' }
  )
)


// Setup authentication state change listener for token management only
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('🔐 Auth state changed:', event)

  // Only handle token refresh and logout events
  // Login and session restoration are handled by initializeAuth() and login() methods
  if (event === 'TOKEN_REFRESHED' && session) {
    console.log('🔄 Token refreshed by Supabase')
    // Token refreshed, update tokens
    const tokens: AuthTokens = {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: new Date(session.expires_at! * 1000),
    }

    const currentState = useSecureAuthStore.getState()
    useSecureAuthStore.setState({
      tokens,
      isAuthenticated: !!(currentState.user && tokens),
      error: null
    })
  } else if (event === 'SIGNED_OUT') {
    console.log('👋 Signed out by Supabase')
    // Session ended, clear store
    useSecureAuthStore.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    })
  }
  // Note: SIGNED_IN events are ignored to prevent conflicts with initializeAuth()
})