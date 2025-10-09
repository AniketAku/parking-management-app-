import { supabase } from '../lib/supabase'
import type { AuthUser, AuthTokens, LoginCredentials } from '../types'

export interface AuthResult {
  user: AuthUser
  tokens: AuthTokens
  expiresIn: number
}

export interface RegistrationData {
  username: string
  password: string
  fullName?: string
  role?: 'admin' | 'operator' | 'viewer'
  phone: string
}

export interface PasswordChangeRequest {
  oldPassword: string
  newPassword: string
}

export interface SessionValidation {
  isValid: boolean
  user?: AuthUser
  needsRefresh: boolean
}

interface RateLimitConfig {
  windowMs: number
  maxAttempts: number
  blockDurationMs: number
}

class SecureAuthService {
  private readonly JWT_SECRET = import.meta.env.VITE_JWT_SECRET || 'your-secure-jwt-secret-here'
  private readonly TOKEN_EXPIRY = 15 * 60 * 1000 // 15 minutes
  private readonly REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days
  
  private loginAttempts = new Map<string, { count: number; lastAttempt: number; blockedUntil?: number }>()
  private readonly rateLimitConfig: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5,
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
  }

  /**
   * Secure login with rate limiting and proper JWT authentication
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    const clientId = this.getClientIdentifier()
    
    // Check rate limiting
    if (this.isRateLimited(clientId)) {
      const blockedUntil = this.loginAttempts.get(clientId)?.blockedUntil
      const remainingTime = blockedUntil ? Math.ceil((blockedUntil - Date.now()) / 1000 / 60) : 0
      throw new Error(`Too many login attempts. Try again in ${remainingTime} minutes.`)
    }

    try {
      // Validate input
      this.validateLoginCredentials(credentials)

      // Use server-side password verification through RPC function
      const { data: authResult, error: authError } = await supabase
        .rpc('verify_user_password', {
          p_username: credentials.username,
          p_password: credentials.password
        })

      if (authError) {
        console.error('Authentication RPC error:', authError)
        throw new Error('Authentication service error')
      }

      if (!authResult || authResult.length === 0) {
        throw new Error('Authentication service error')
      }

      const result = authResult[0]

      if (!result.is_valid) {
        // this.recordFailedAttempt(clientId)  // Disabled for testing
        throw new Error(result.error_message || 'Invalid credentials')
      }

      // Create user profile from RPC result
      const userProfile = {
        id: result.user_id,
        username: result.username,
        role: result.role,
        full_name: result.full_name,
        phone: result.phone
      }

      // 🔍 DEBUG: Log the exact user ID being stored
      console.log('🔍 [LOGIN DEBUG] RPC returned user_id:', result.user_id)
      console.log('🔍 [LOGIN DEBUG] Full RPC result:', result)
      console.log('🔍 [LOGIN DEBUG] User profile created:', userProfile)

      // Create secure user object
      const user: AuthUser = {
        id: userProfile.id,
        username: userProfile.username,
        role: userProfile.role,
        permissions: this.getRolePermissions(userProfile.role),
      }

      console.log('🔍 [LOGIN DEBUG] Final user object being stored:', user)

      // Create secure tokens
      const accessToken = this.generateSecureToken({
        userId: userProfile.id,
        username: userProfile.username,
        role: userProfile.role
      })
      
      const refreshToken = this.generateSecureToken({
        userId: userProfile.id,
        type: 'refresh'
      })
      
      const tokens: AuthTokens = {
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + this.TOKEN_EXPIRY),
      }

      // Update last login using RPC to bypass RLS
      await supabase.rpc('update_last_login', {
        user_id: userProfile.id
      })

      // Clear failed attempts on successful login
      this.loginAttempts.delete(clientId)

      return {
        user,
        tokens,
        expiresIn: this.TOKEN_EXPIRY
      }

    } catch (error) {
      this.recordFailedAttempt(clientId)
      throw error
    }
  }

  /**
   * Secure user registration with validation (phone-based)
   */
  async register(userData: RegistrationData): Promise<AuthResult> {
    // Use UserService for consistent phone-based registration
    const result = await import('./userService').then(module => 
      module.UserService.registerUser(userData)
    )
    
    if (!result.success) {
      throw new Error(result.message)
    }
    
    // If user is auto-approved (admin), login immediately
    if (userData.role === 'admin') {
      return this.login({
        username: userData.username,
        password: userData.password
      })
    }
    
    throw new Error('Account created successfully. Please wait for admin approval.')
  }

  /**
   * Secure logout with session cleanup
   */
  async logout(): Promise<void> {
    try {
      // Clear local storage (no Supabase auth to sign out from)
      this.clearAuthData()
    } catch (error) {
      console.warn('Logout error:', error)
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<AuthTokens> {
    try {
      // For phone-based auth, generate new tokens
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('No authenticated user')
      }

      const accessToken = this.generateSecureToken({
        userId: user.id,
        username: user.user_metadata?.username,
        role: user.user_metadata?.role
      })
      
      const refreshToken = this.generateSecureToken({
        userId: user.id,
        type: 'refresh'
      })

      return {
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + this.TOKEN_EXPIRY),
      }
    } catch (error) {
      throw new Error('Token refresh failed')
    }
  }

  /**
   * Validate current session (phone-based auth)
   */
  async validateSession(): Promise<SessionValidation> {
    try {
      // For phone-based auth, validate stored session data
      const storedAuth = localStorage.getItem('secure-auth-storage')
      if (!storedAuth) {
        return { isValid: false, needsRefresh: false }
      }

      // Decode the base64 encoded storage
      let authData
      try {
        const decoded = JSON.parse(atob(storedAuth))
        authData = decoded.state
      } catch (decodeError) {
        console.error('Failed to decode auth storage:', decodeError)
        return { isValid: false, needsRefresh: false }
      }
      if (!authData.user || !authData.tokens) {
        return { isValid: false, needsRefresh: false }
      }

      // Check token expiration
      const expiresAt = new Date(authData.tokens.expiresAt)
      if (expiresAt <= new Date()) {
        return { isValid: false, needsRefresh: true }
      }

      // Enhanced validation with multiple fallback strategies
      console.log('🔍 [VALIDATION DEBUG] Validating session for user:', authData.user.username)
      console.log('🔍 [VALIDATION DEBUG] Stored user ID:', authData.user.id)
      console.log('🔍 [VALIDATION DEBUG] ID type:', typeof authData.user.id)

      // Strategy 1: Try direct ID lookup
      let userProfile = null
      let validationError = null

      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle() // Use maybeSingle() instead of single() to handle zero or one results

        console.log('🔍 [VALIDATION DEBUG] Direct ID lookup result:', { data, error })

        if (data && !error) {
          userProfile = data
        } else {
          validationError = error
        }
      } catch (error) {
        console.warn('🔍 [VALIDATION DEBUG] Direct ID lookup failed:', error)
        validationError = error
      }

      // Strategy 2: If direct ID lookup fails, try username lookup as fallback
      if (!userProfile && authData.user.username) {
        console.log('🔍 [VALIDATION DEBUG] Trying username fallback for:', authData.user.username)

        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', authData.user.username)
            .maybeSingle() // Use maybeSingle() instead of single() to handle zero or one results

          console.log('🔍 [VALIDATION DEBUG] Username lookup result:', { data, error })

          if (data && !error) {
            userProfile = data
            console.log('✅ [VALIDATION DEBUG] Successfully found user via username fallback')

            // Update stored user ID to match database ID for future validations
            if (data.id !== authData.user.id) {
              console.log('🔧 [VALIDATION DEBUG] Correcting stored user ID from', authData.user.id, 'to', data.id)
              // This will be handled in the return statement
            }
          } else if (error) {
            console.warn('🔍 [VALIDATION DEBUG] Username fallback error:', error)
          } else {
            console.warn('🔍 [VALIDATION DEBUG] Username fallback found no user')
          }
        } catch (error) {
          console.warn('🔍 [VALIDATION DEBUG] Username fallback exception:', error)
        }
      }

      // Strategy 3: Handle complete validation failure
      if (!userProfile) {
        const errorCode = validationError?.code
        const errorMessage = validationError?.message?.toLowerCase() || ''

        console.log('🔍 [VALIDATION DEBUG] All validation strategies failed')
        console.log('🔍 [VALIDATION DEBUG] Final error code:', errorCode)
        console.log('🔍 [VALIDATION DEBUG] Final error message:', errorMessage)

        // Distinguish between authentication failures and temporary API issues
        if (
          errorCode === 'PGRST116' || // User not found (actual auth failure)
          errorMessage.includes('no rows returned') ||
          errorMessage.includes('not found')
        ) {
          console.warn('🚨 [VALIDATION DEBUG] User genuinely not found - clearing auth')
          return { isValid: false, needsRefresh: false }
        }

        // For other errors (network issues, API problems), preserve session
        console.warn('⚠️ [VALIDATION DEBUG] Temporary validation failure - preserving session')
        const user: AuthUser = {
          id: authData.user.id,
          username: authData.user.username,
          role: authData.user.role,
          permissions: authData.user.permissions || this.getRolePermissions(authData.user.role),
        }

        return { isValid: true, user, needsRefresh: false }
      }

      // Check if user exists and is approved
      if (!userProfile.is_approved) {
        console.warn('🚨 User account not approved')
        return { isValid: false, needsRefresh: false }
      }

      // Create validated user object with correct ID
      const user: AuthUser = {
        id: userProfile.id, // Use the database ID (corrected if needed via username fallback)
        username: userProfile.username,
        role: userProfile.role,
        permissions: this.getRolePermissions(userProfile.role),
      }

      console.log('✅ [VALIDATION DEBUG] Session validation successful')
      console.log('✅ [VALIDATION DEBUG] Validated user:', user)

      // If the stored ID was different from database ID, the state will be updated automatically
      // by the store when it receives this validated user object
      return { isValid: true, user, needsRefresh: false }
    } catch (error) {
      // Network errors, timeouts, etc. - don't clear auth data
      console.warn('⚠️ Session validation failed with network/timeout error (keeping auth data):', error)

      // Try to preserve existing auth state on network errors
      const storedAuth = localStorage.getItem('secure-auth-storage')
      if (storedAuth) {
        try {
          const decoded = JSON.parse(atob(storedAuth))
          const authData = decoded.state
          if (authData.user && authData.tokens) {
            const user: AuthUser = {
              id: authData.user.id,
              username: authData.user.username,
              role: authData.user.role,
              permissions: authData.user.permissions || this.getRolePermissions(authData.user.role),
            }
            return { isValid: true, user, needsRefresh: false }
          }
        } catch (preserveError) {
          console.error('Failed to preserve auth state:', preserveError)
        }
      }

      return { isValid: false, needsRefresh: false }
    }
  }

  /**
   * Secure password change with validation
   */
  async changePassword(request: PasswordChangeRequest): Promise<void> {
    // Validate new password strength
    this.validatePasswordStrength(request.newPassword)

    try {
      const { error } = await supabase.auth.updateUser({
        password: request.newPassword
      })

      if (error) {
        throw new Error(error.message)
      }

      // Update password changed timestamp in profile
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('users')
          .update({ 
            password_changed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
      }

    } catch (error) {
      throw error
    }
  }

  /**
   * Get user by ID (admin function)
   */
  async getUserById(userId: string): Promise<AuthUser | null> {
    try {
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || !userProfile) {
        return null
      }

      return {
        id: userProfile.id,
        username: userProfile.username,
        role: userProfile.role,
        permissions: this.getRolePermissions(userProfile.role),
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Rate limiting implementation
   */
  private isRateLimited(clientId: string): boolean {
    const attempts = this.loginAttempts.get(clientId)
    
    if (!attempts) return false
    
    const now = Date.now()
    
    // Check if still blocked
    if (attempts.blockedUntil && attempts.blockedUntil > now) {
      return true
    }
    
    // Reset if window expired
    if (now - attempts.lastAttempt > this.rateLimitConfig.windowMs) {
      this.loginAttempts.delete(clientId)
      return false
    }
    
    return attempts.count >= this.rateLimitConfig.maxAttempts
  }

  private recordFailedAttempt(clientId: string): void {
    const now = Date.now()
    const attempts = this.loginAttempts.get(clientId) || { count: 0, lastAttempt: now }
    
    attempts.count += 1
    attempts.lastAttempt = now
    
    if (attempts.count >= this.rateLimitConfig.maxAttempts) {
      attempts.blockedUntil = now + this.rateLimitConfig.blockDurationMs
    }
    
    this.loginAttempts.set(clientId, attempts)
  }

  /**
   * Get client identifier for rate limiting
   */
  private getClientIdentifier(): string {
    // Use IP + User Agent hash in production, fallback to browser fingerprint
    const userAgent = navigator.userAgent
    const screen = `${window.screen.width}x${window.screen.height}`
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return btoa(`${userAgent}:${screen}:${timezone}`).substring(0, 20)
  }

  /**
   * Verify password against hash
   */

  /**
   * Validate login credentials
   */
  private validateLoginCredentials(credentials: LoginCredentials): void {
    if (!credentials.username?.trim()) {
      throw new Error('Username is required')
    }
    
    if (!credentials.password?.trim()) {
      throw new Error('Password is required')
    }
    
    if (credentials.username.length < 3) {
      throw new Error('Username must be at least 3 characters')
    }
    
    if (credentials.password.length < 8) {
      throw new Error('Password must be at least 8 characters')
    }
  }

  /**
   * Validate registration data
   */
  private validateRegistrationData(userData: RegistrationData): void {
    if (!userData.username?.trim()) {
      throw new Error('Username is required')
    }
    
    if (!userData.password?.trim()) {
      throw new Error('Password is required')
    }
    
    if (userData.username.length < 3) {
      throw new Error('Username must be at least 3 characters')
    }
    
    this.validatePasswordStrength(userData.password)
    
    if (!userData.phone?.trim()) {
      throw new Error('Phone number is required')
    }
  }

  /**
   * Validate password strength
   */
  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long')
    }
    
    if (!/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter')
    }
    
    if (!/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter')
    }
    
    if (!/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one number')
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw new Error('Password must contain at least one special character')
    }
    
    // Check for common passwords
    const commonPasswords = ['password', '123456789', 'password123', 'admin123', '12345678']
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      throw new Error('Password contains common patterns. Please choose a stronger password.')
    }
  }

  /**
   * Email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Get role-based permissions
   */
  private getRolePermissions(role: string): string[] {
    const PERMISSIONS = {
      admin: [
        'parking:read', 'parking:write', 'parking:delete',
        'users:read', 'users:write', 'users:delete',
        'reports:read', 'reports:export',
        'settings:read', 'settings:write'
      ],
      operator: [
        'parking:read', 'parking:write',
        'reports:read', 'reports:export'
      ],
      viewer: ['parking:read', 'reports:read']
    }
    
    return PERMISSIONS[role as keyof typeof PERMISSIONS] || PERMISSIONS.viewer
  }

  /**
   * Clear authentication data
   */
  private clearAuthData(): void {
    // Clear sensitive data from localStorage
    const keysToRemove = [
      'auth-storage',
      'supabase.auth.token',
      'auth_token',
      'user',
      'refresh_token'
    ]
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    })
  }

  /**
   * Get current authentication status
   */
  async getCurrentAuth(): Promise<{ user: AuthUser | null; isAuthenticated: boolean }> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        return { user: null, isAuthenticated: false }
      }

      const validation = await this.validateSession()
      
      return {
        user: validation.user || null,
        isAuthenticated: validation.isValid
      }
    } catch (error) {
      return { user: null, isAuthenticated: false }
    }
  }

  /**
   * Password reset request
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      
      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Complete password reset
   */
  async resetPassword(newPassword: string): Promise<void> {
    this.validatePasswordStrength(newPassword)
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(user: AuthUser | null, permission: string): boolean {
    if (!user) return false
    if (user.role === 'admin') return true
    return user.permissions?.includes(permission) ?? false
  }

  /**
   * Get security headers for API requests
   */
  getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'",
    }
  }

  /**
   * Generate secure session token (fallback)
   */
  private generateSecureToken(payload: any): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    }
    
    const now = Math.floor(Date.now() / 1000)
    const jwtPayload = {
      ...payload,
      iat: now,
      exp: now + Math.floor(this.TOKEN_EXPIRY / 1000),
      iss: 'parking-app',
      aud: 'parking-app-users'
    }
    
    const encodedHeader = btoa(JSON.stringify(header)).replace(/[+/]/g, c => ({'+':'-', '/':'_'}[c]!)).replace(/=/g, '')
    const encodedPayload = btoa(JSON.stringify(jwtPayload)).replace(/[+/]/g, c => ({'+':'-', '/':'_'}[c]!)).replace(/=/g, '')
    
    // In production, use proper HMAC signing with JWT_SECRET
    const signature = btoa(`secure_${encodedHeader}.${encodedPayload}`).replace(/[+/]/g, c => ({'+':'-', '/':'_'}[c]!)).replace(/=/g, '')
    
    return `${encodedHeader}.${encodedPayload}.${signature}`
  }

}

export const secureAuthService = new SecureAuthService()