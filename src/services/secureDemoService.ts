/**
 * Secure Demo Service
 * Provides realistic authentication simulation without compromising security
 */

import { securityService } from './securityService'
import type { AuthUser, AuthTokens, LoginCredentials } from '../types'

export interface DemoAuthResult {
  user: AuthUser
  tokens: AuthTokens
  isDemo: true
}

export interface DemoUser {
  id: string
  username: string
  role: 'admin' | 'user' | 'manager'
  permissions: string[]
  isActive: boolean
  isApproved: boolean
  displayName: string
  email: string
}

class SecureDemoService {
  // Demo users with realistic data (no real passwords)
  private readonly demoUsers: DemoUser[] = [
    {
      id: 'demo-admin-001',
      username: 'demo.admin',
      role: 'admin',
      permissions: ['parking:read', 'parking:write', 'parking:delete', 'users:manage', 'settings:manage'],
      isActive: true,
      isApproved: true,
      displayName: 'Demo Administrator',
      email: 'demo.admin@example.local'
    },
    {
      id: 'demo-manager-001',
      username: 'demo.manager',
      role: 'manager',
      permissions: ['parking:read', 'parking:write', 'reports:view'],
      isActive: true,
      isApproved: true,
      displayName: 'Demo Manager',
      email: 'demo.manager@example.local'
    },
    {
      id: 'demo-user-001',
      username: 'demo.user',
      role: 'user',
      permissions: ['parking:read'],
      isActive: true,
      isApproved: true,
      displayName: 'Demo User',
      email: 'demo.user@example.local'
    }
  ]

  /**
   * Environment safety check - only allow demo in development
   */
  private isDemoAllowed(): boolean {
    // Only allow demo mode in development environment
    const isDev = import.meta.env.DEV
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.includes('.local')
    
    return isDev && isLocalhost
  }

  /**
   * Simulate secure authentication flow for demo
   */
  async simulateLogin(credentials: LoginCredentials): Promise<DemoAuthResult> {
    if (!this.isDemoAllowed()) {
      throw new Error('Demo mode not available in production environment')
    }

    // Simulate authentication delay
    await new Promise(resolve => setTimeout(resolve, 800))

    // Find demo user
    const demoUser = this.demoUsers.find(user => user.username === credentials.username)
    if (!demoUser) {
      throw new Error('Demo user not found. Try: demo.admin, demo.manager, or demo.user')
    }

    // Simulate CSRF token validation
    const csrfToken = securityService.getCSRFToken()
    if (!csrfToken.isValid) {
      throw new Error('Invalid CSRF token')
    }

    // Generate secure demo tokens
    const tokens: AuthTokens = {
      accessToken: this.generateDemoToken('access', demoUser.id),
      refreshToken: this.generateDemoToken('refresh', demoUser.id),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
      tokenType: 'bearer'
    }

    // Create authenticated user object
    const authUser: AuthUser = {
      id: demoUser.id,
      username: demoUser.username,
      role: demoUser.role,
      permissions: demoUser.permissions,
      isActive: demoUser.isActive,
      isApproved: demoUser.isApproved,
      lastLogin: new Date().toISOString(),
      profile: {
        displayName: demoUser.displayName,
        email: demoUser.email,
        avatar: null
      }
    }

    // Log secure demo session start
    securityService.logSecurityEvent('demo_authentication_success', {
      userId: demoUser.id,
      username: demoUser.username,
      role: demoUser.role
    }, 'low')

    return {
      user: authUser,
      tokens,
      isDemo: true
    }
  }

  /**
   * Generate secure demo tokens
   */
  private generateDemoToken(type: 'access' | 'refresh', userId: string): string {
    const timestamp = Date.now()
    const nonce = securityService.generateNonce()
    return `demo_${type}_${userId}_${timestamp}_${nonce}`
  }

  /**
   * Validate demo token
   */
  validateDemoToken(token: string): boolean {
    if (!this.isDemoAllowed()) {
      return false
    }

    // Demo tokens should start with 'demo_'
    if (!token.startsWith('demo_')) {
      return false
    }

    // Basic token structure validation
    const parts = token.split('_')
    return parts.length >= 5 && parts[0] === 'demo'
  }

  /**
   * Simulate logout
   */
  async simulateLogout(): Promise<void> {
    if (!this.isDemoAllowed()) {
      throw new Error('Demo mode not available in production environment')
    }

    // Simulate logout delay
    await new Promise(resolve => setTimeout(resolve, 300))

    securityService.logSecurityEvent('demo_logout', {}, 'low')
  }

  /**
   * Get available demo users for demonstration
   */
  getDemoUsers(): Pick<DemoUser, 'username' | 'role' | 'displayName'>[] {
    if (!this.isDemoAllowed()) {
      return []
    }

    return this.demoUsers.map(user => ({
      username: user.username,
      role: user.role,
      displayName: user.displayName
    }))
  }

  /**
   * Check if currently in demo mode
   */
  isDemoMode(): boolean {
    return this.isDemoAllowed() && !import.meta.env.VITE_SUPABASE_URL
  }

  /**
   * Get demo mode status for UI display
   */
  getDemoStatus(): {
    isDemo: boolean
    isAllowed: boolean
    environment: string
    availableUsers: string[]
  } {
    return {
      isDemo: this.isDemoMode(),
      isAllowed: this.isDemoAllowed(),
      environment: import.meta.env.DEV ? 'development' : 'production',
      availableUsers: this.isDemoAllowed() ? this.demoUsers.map(u => u.username) : []
    }
  }
}

// Export singleton instance
export const secureDemoService = new SecureDemoService()
export default secureDemoService