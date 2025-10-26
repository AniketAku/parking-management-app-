/**
 * Enhanced Security Service
 * Provides comprehensive security measures including CSRF protection, security headers,
 * input validation, rate limiting, and security monitoring
 */

import { log } from '../utils/secureLogger'

export interface SecurityHeaders {
  'X-CSRF-Token': string
  'X-Content-Type-Options': string
  'X-Frame-Options': string
  'X-XSS-Protection': string
  'Referrer-Policy': string
  'Permissions-Policy': string
  'Strict-Transport-Security'?: string
  'Content-Security-Policy'?: string
  'X-Request-ID': string
}

export interface CSRFToken {
  token: string
  expiresAt: Date
  isValid: boolean
}

export interface RateLimitResult {
  allowed: boolean
  attemptsLeft: number
  retryAfter?: number
  blocked?: boolean
}

export interface SecurityEventLog {
  timestamp: string
  event: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  details: any
  userAgent: string
  url: string
  ip?: string
  sessionId?: string
}

class SecurityService {
  private static readonly CSRF_TOKEN_KEY = 'csrf_token'
  private static readonly CSRF_EXPIRY_KEY = 'csrf_expiry'
  private static readonly CSRF_VALIDITY_MINUTES = 30 // Reduced from 60 for better security
  private static readonly SESSION_FINGERPRINT_KEY = 'session_fingerprint'
  
  // Enhanced rate limiting configurations
  private readonly rateLimitConfigs = {
    login: { maxAttempts: 5, windowMs: 15 * 60 * 1000, blockMs: 30 * 60 * 1000 },
    password_change: { maxAttempts: 3, windowMs: 5 * 60 * 1000, blockMs: 10 * 60 * 1000 },
    password_reset: { maxAttempts: 3, windowMs: 60 * 60 * 1000, blockMs: 2 * 60 * 60 * 1000 },
    api_call: { maxAttempts: 100, windowMs: 60 * 1000, blockMs: 5 * 60 * 1000 }
  }

  /**
   * Generate a new CSRF token
   */
  generateCSRFToken(): CSRFToken {
    const token = this.generateSecureToken(32)
    const expiresAt = new Date(Date.now() + SecurityService.CSRF_VALIDITY_MINUTES * 60 * 1000)
    
    // Store in localStorage with expiry
    localStorage.setItem(SecurityService.CSRF_TOKEN_KEY, token)
    localStorage.setItem(SecurityService.CSRF_EXPIRY_KEY, expiresAt.toISOString())
    
    return {
      token,
      expiresAt,
      isValid: true
    }
  }

  /**
   * Get current CSRF token or generate new one if expired
   */
  getCSRFToken(): CSRFToken {
    const storedToken = localStorage.getItem(SecurityService.CSRF_TOKEN_KEY)
    const storedExpiry = localStorage.getItem(SecurityService.CSRF_EXPIRY_KEY)
    
    if (!storedToken || !storedExpiry) {
      return this.generateCSRFToken()
    }
    
    const expiresAt = new Date(storedExpiry)
    const now = new Date()
    
    if (now >= expiresAt) {
      // Token expired, generate new one
      return this.generateCSRFToken()
    }
    
    return {
      token: storedToken,
      expiresAt,
      isValid: true
    }
  }

  /**
   * Validate CSRF token
   */
  validateCSRFToken(providedToken: string): boolean {
    const currentToken = this.getCSRFToken()
    return currentToken.isValid && currentToken.token === providedToken
  }

  /**
   * Clear CSRF token (for logout)
   */
  clearCSRFToken(): void {
    localStorage.removeItem(SecurityService.CSRF_TOKEN_KEY)
    localStorage.removeItem(SecurityService.CSRF_EXPIRY_KEY)
  }

  /**
   * Get enhanced security headers for API requests
   */
  getSecurityHeaders(): SecurityHeaders {
    const csrfToken = this.getCSRFToken()
    
    const headers: SecurityHeaders = {
      'X-CSRF-Token': csrfToken.token,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'X-Request-ID': this.generateRequestId()
    }

    // Add HSTS for HTTPS environments
    if (window.location.protocol === 'https:') {
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
    }

    // Add CSP for all environments with appropriate restrictions
    headers['Content-Security-Policy'] = this.generateCSP()

    return headers
  }

  /**
   * Generate Content Security Policy
   */
  private generateCSP(): string {
    const apiUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:8000'
    const apiDomain = new URL(apiUrl).origin
    
    return [
      "default-src 'self'",
      `connect-src 'self' ${apiDomain} https://*.supabase.co wss://*.supabase.co`,
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // React dev tools
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "media-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join('; ')
  }

  /**
   * Generate unique request ID for tracking
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${this.generateSecureToken(8)}`
  }

  /**
   * Generate cryptographically secure token
   */
  private generateSecureToken(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
    const values = new Uint8Array(length)
    crypto.getRandomValues(values)
    
    return Array.from(values)
      .map(value => charset[value % charset.length])
      .join('')
  }

  /**
   * Sanitize user input to prevent XSS
   */
  sanitizeInput(input: string): string {
    const div = document.createElement('div')
    div.textContent = input
    return div.innerHTML
  }

  /**
   * Validate URL to prevent open redirect attacks
   */
  isValidRedirectURL(url: string): boolean {
    try {
      const urlObj = new URL(url, window.location.origin)
      // Only allow same-origin redirects
      return urlObj.origin === window.location.origin
    } catch {
      return false
    }
  }

  /**
   * Check if running in secure context
   */
  isSecureContext(): boolean {
    return window.isSecureContext || window.location.protocol === 'https:'
  }

  /**
   * Generate nonce for inline scripts/styles
   */
  generateNonce(): string {
    return this.generateSecureToken(16)
  }

  /**
   * Create secure cookie settings
   */
  getSecureCookieOptions(): {
    secure: boolean
    sameSite: 'strict' | 'lax' | 'none'
    httpOnly: boolean
  } {
    return {
      secure: this.isSecureContext(),
      sameSite: 'strict',
      httpOnly: true // Note: This is for server-side cookie setting
    }
  }

  /**
   * Enhanced rate limiting for sensitive operations
   */
  rateLimitCheck(operation: keyof typeof this.rateLimitConfigs): RateLimitResult {
    const config = this.rateLimitConfigs[operation] || this.rateLimitConfigs.api_call
    const key = `security_rate_limit_${operation}`
    const now = Date.now()
    
    const stored = localStorage.getItem(key)
    let attempts: { 
      count: number; 
      firstAttempt: number; 
      lastAttempt: number; 
      blockedUntil?: number 
    } = {
      count: 0,
      firstAttempt: now,
      lastAttempt: now
    }
    
    if (stored) {
      try {
        attempts = JSON.parse(stored)
      } catch {
        attempts = { count: 0, firstAttempt: now, lastAttempt: now }
      }
    }
    
    // Check if currently blocked
    if (attempts.blockedUntil && attempts.blockedUntil > now) {
      return {
        allowed: false,
        attemptsLeft: 0,
        retryAfter: Math.ceil((attempts.blockedUntil - now) / 1000),
        blocked: true
      }
    }
    
    // Check if window has expired
    if (now - attempts.firstAttempt > config.windowMs) {
      attempts = { count: 1, firstAttempt: now, lastAttempt: now }
    } else {
      attempts.count++
      attempts.lastAttempt = now
    }
    
    // Apply blocking if limit exceeded
    const allowed = attempts.count <= config.maxAttempts
    if (!allowed) {
      attempts.blockedUntil = now + config.blockMs
      
      this.logSecurityEvent('rate_limit_exceeded', {
        operation,
        attempts: attempts.count,
        blockDurationMs: config.blockMs
      }, 'high')
    }
    
    localStorage.setItem(key, JSON.stringify(attempts))
    
    return {
      allowed,
      attemptsLeft: Math.max(0, config.maxAttempts - attempts.count),
      retryAfter: allowed ? undefined : Math.ceil((attempts.blockedUntil! - now) / 1000),
      blocked: !allowed
    }
  }

  /**
   * Clear rate limit for successful operations
   */
  clearRateLimit(operation: string): void {
    const key = `security_rate_limit_${operation}`
    localStorage.removeItem(key)
  }

  /**
   * Initialize security service
   */
  initialize(): void {
    // Generate initial CSRF token
    this.generateCSRFToken()
    
    // Set up security event listeners
    this.setupSecurityEventListeners()
    
    // Security Service initialized successfully
  }

  /**
   * Setup security-related event listeners
   */
  private setupSecurityEventListeners(): void {
    // Clear tokens on storage events (multiple tabs)
    window.addEventListener('storage', (event) => {
      if (event.key === 'auth_token' && !event.newValue) {
        // Auth token was cleared in another tab
        this.clearCSRFToken()
      }
    })

    // Refresh CSRF token periodically
    setInterval(() => {
      const token = this.getCSRFToken()
      if (!token.isValid || new Date() >= new Date(token.expiresAt.getTime() - 5 * 60 * 1000)) {
        // Refresh token 5 minutes before expiry
        this.generateCSRFToken()
      }
    }, 5 * 60 * 1000) // Check every 5 minutes
  }

  /**
   * Generate device fingerprint for session tracking
   */
  generateDeviceFingerprint(): string {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
      navigator.maxTouchPoints || 0
    ]
    
    const fingerprint = btoa(components.join('|')).replace(/[+/]/g, c => ({'+':'-', '/':'_'}[c]!))
    localStorage.setItem(SecurityService.SESSION_FINGERPRINT_KEY, fingerprint)
    
    return fingerprint
  }

  /**
   * Get current device fingerprint
   */
  getDeviceFingerprint(): string {
    const stored = localStorage.getItem(SecurityService.SESSION_FINGERPRINT_KEY)
    return stored || this.generateDeviceFingerprint()
  }

  /**
   * Validate session integrity
   */
  validateSessionIntegrity(): boolean {
    const currentFingerprint = this.generateDeviceFingerprint()
    const storedFingerprint = localStorage.getItem(SecurityService.SESSION_FINGERPRINT_KEY)
    
    if (!storedFingerprint) {
      localStorage.setItem(SecurityService.SESSION_FINGERPRINT_KEY, currentFingerprint)
      return true
    }
    
    // Allow minor variations but detect major changes
    const similarity = this.calculateSimilarity(currentFingerprint, storedFingerprint)
    
    if (similarity < 0.8) {
      this.logSecurityEvent('session_integrity_violation', {
        expected: storedFingerprint,
        actual: currentFingerprint,
        similarity
      }, 'high')
      return false
    }
    
    return true
  }

  /**
   * Calculate similarity between two strings (simple Jaccard index)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.split(''))
    const set2 = new Set(str2.split(''))
    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])
    
    return intersection.size / union.size
  }

  /**
   * Enhanced security event logging
   */
  logSecurityEvent(
    event: string, 
    details?: any, 
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): void {
    const logEntry: SecurityEventLog = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.getDeviceFingerprint()
    }
    
    // Log with appropriate level
    if (severity === 'critical') {
      log.error('Security Event', logEntry)
    } else if (severity === 'high') {
      log.warn('Security Event', logEntry)
    } else {
      log.info('Security Event', logEntry)
    }
    
    // Store critical events locally for audit
    if (severity === 'critical' || severity === 'high') {
      this.storeSecurityEvent(logEntry)
    }
    
    // In production, send to security monitoring service
    if (import.meta.env.PROD) {
      this.sendToSecurityMonitoring(logEntry).catch(error => log.error('Failed to send to security monitoring', error))
    }
  }

  /**
   * Store security events locally for audit
   */
  private storeSecurityEvent(event: SecurityEventLog): void {
    try {
      const key = 'security_events'
      const stored = localStorage.getItem(key)
      const events: SecurityEventLog[] = stored ? JSON.parse(stored) : []
      
      events.push(event)
      
      // Keep only last 100 events
      if (events.length > 100) {
        events.splice(0, events.length - 100)
      }
      
      localStorage.setItem(key, JSON.stringify(events))
    } catch (error) {
      log.error('Failed to store security event', error)
    }
  }

  /**
   * Send security event to monitoring service
   */
  private async sendToSecurityMonitoring(event: SecurityEventLog): Promise<void> {
    try {
      const response = await fetch('/api/security/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getSecurityHeaders()
        },
        body: JSON.stringify(event)
      })
      
      if (!response.ok) {
        log.warn('Failed to send security event to monitoring service')
      }
    } catch (error) {
      log.warn('Security monitoring service unavailable', error)
    }
  }

  /**
   * Get stored security events for audit
   */
  getSecurityEvents(): SecurityEventLog[] {
    try {
      const stored = localStorage.getItem('security_events')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }
}

// Export singleton instance
export const securityService = new SecurityService()

/**
 * React hook for security operations
 */
export function useSecurity() {
  return {
    getCSRFToken: securityService.getCSRFToken.bind(securityService),
    getSecurityHeaders: securityService.getSecurityHeaders.bind(securityService),
    sanitizeInput: securityService.sanitizeInput.bind(securityService),
    isValidRedirectURL: securityService.isValidRedirectURL.bind(securityService),
    rateLimitCheck: securityService.rateLimitCheck.bind(securityService),
    clearRateLimit: securityService.clearRateLimit.bind(securityService)
  }
}

export default securityService