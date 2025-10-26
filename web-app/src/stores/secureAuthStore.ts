import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { AuthUser, AuthTokens, LoginCredentials } from '../types'
import { secureAuthService, type AuthResult, type RegistrationData, type PasswordChangeRequest } from '../services/secureAuthService'
import { supabase } from '../lib/supabase'
import { log } from '../utils/secureLogger'

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
          log.debug('Starting authentication initialization', {
            hasUser: !!currentState.user,
            hasTokens: !!currentState.tokens,
            isAuthenticated: currentState.isAuthenticated,
            hasHydrated: currentState.hasHydrated,
            isLoading: currentState.isLoading
          })

          // Don't re-initialize if already in progress
          if (currentState.isLoading) {
            log.debug('Already initializing, skipping')
            return
          }

          set({ isLoading: true })

          try {

            // Check if we have persisted user and tokens
            if (currentState.user && currentState.tokens) {
              log.debug('Found persisted auth data, validating session', {
                name: currentState.user.name,
                role: currentState.user.role
              })

              // Validate session is still good
              const validation = await secureAuthService.validateSession()
              log.debug('Validation result', { isValid: validation.isValid, hasUser: !!validation.user })

              if (validation.isValid && validation.user) {
                log.info('Session valid, restoring authentication')

                // Update tokens from current session
                const { data: { session } } = await supabase.auth.getSession()
                log.debug('Supabase session', { hasSession: !!session, userId: session?.user?.id })

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

                log.success('Authentication restored successfully')
                return
              } else {
                log.warn('Session invalid, clearing persisted data', { validationResult: validation })
                await secureAuthService.logout()
              }
            } else {
              log.debug('No persisted auth data found', {
                hasUser: !!currentState.user,
                hasTokens: !!currentState.tokens
              })
            }

            // No valid persisted auth or validation failed
            log.debug('Setting unauthenticated state')
            set({
              user: null,
              tokens: null,
              isAuthenticated: false,
              isLoading: false,
              error: null
            })

          } catch (error) {
            log.error('Auth initialization failed', error)
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

            log.success('Secure login successful')
          } catch (error) {
            log.error('Secure login failed', error)
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

            log.success('Registration successful')
          } catch (error) {
            log.error('Registration failed', error)
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

            log.success('Secure logout successful')
          } catch (error) {
            log.error('Logout error', error)
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

            log.info('Token refreshed successfully')
          } catch (error) {
            log.error('Token refresh failed', error)

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

            log.success('Password changed successfully')
          } catch (error) {
            log.error('Password change failed', error)
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
            log.error('Session validation failed', error)
            
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

            log.success('Password reset email sent')
          } catch (error) {
            log.error('Password reset request failed', error)
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

            log.success('Password reset successful')
          } catch (error) {
            log.error('Password reset failed', error)
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
          log.debug('Starting Zustand rehydration')
          if (state) {
            log.debug('Raw persisted state', {
              hasUser: !!state.user,
              hasTokens: !!state.tokens,
              wasAuthenticated: state.isAuthenticated,
              wasHydrated: state.hasHydrated
            })

            // Derive isAuthenticated from persisted user and tokens
            state.isAuthenticated = !!(state.user && state.tokens)
            // Mark as hydrated to prevent race conditions
            state.hasHydrated = true

            log.info('Auth state rehydrated', {
              hasUser: !!state.user,
              hasTokens: !!state.tokens,
              isAuthenticated: state.isAuthenticated,
              hasHydrated: state.hasHydrated
            })
          } else {
            log.debug('No persisted state found')
          }
        }
      }
    ),
    { name: 'secure-auth-store' }
  )
)


// Setup authentication state change listener for token management only
supabase.auth.onAuthStateChange(async (event, session) => {
  log.debug('Auth state changed', { event })

  // Only handle token refresh and logout events
  // Login and session restoration are handled by initializeAuth() and login() methods
  if (event === 'TOKEN_REFRESHED' && session) {
    log.info('Token refreshed by Supabase')
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
    log.info('Signed out by Supabase')
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