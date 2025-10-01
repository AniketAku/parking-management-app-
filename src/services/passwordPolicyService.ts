/**
 * Password Policy Service
 * Enforces strong password requirements and provides validation
 */

export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  maxLength?: number
  forbiddenPatterns?: string[]
  forbiddenWords?: string[]
}

export interface PasswordValidationResult {
  isValid: boolean
  score: number // 0-100
  errors: string[]
  warnings: string[]
  suggestions: string[]
}

const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxLength: 128,
  forbiddenPatterns: [
    'password',
    '123456',
    'qwerty',
    'admin',
    'login',
    'user',
    'test'
  ],
  forbiddenWords: [
    'parking',
    'system',
    'app',
    'demo'
  ]
}

class PasswordPolicyService {
  private policy: PasswordPolicy

  constructor(policy: PasswordPolicy = DEFAULT_POLICY) {
    this.policy = policy
  }

  /**
   * Validate password against policy
   */
  validatePassword(password: string, username?: string): PasswordValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []
    let score = 0

    // Basic length validation
    if (password.length < this.policy.minLength) {
      errors.push(`Password must be at least ${this.policy.minLength} characters long`)
    } else {
      score += 20
    }

    if (this.policy.maxLength && password.length > this.policy.maxLength) {
      errors.push(`Password must not exceed ${this.policy.maxLength} characters`)
    }

    // Character type requirements
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumbers = /[0-9]/.test(password)
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    if (this.policy.requireUppercase && !hasUppercase) {
      errors.push('Password must contain at least one uppercase letter')
    } else if (hasUppercase) {
      score += 15
    }

    if (this.policy.requireLowercase && !hasLowercase) {
      errors.push('Password must contain at least one lowercase letter')
    } else if (hasLowercase) {
      score += 15
    }

    if (this.policy.requireNumbers && !hasNumbers) {
      errors.push('Password must contain at least one number')
    } else if (hasNumbers) {
      score += 15
    }

    if (this.policy.requireSpecialChars && !hasSpecialChars) {
      errors.push('Password must contain at least one special character (!@#$%^&*)')
    } else if (hasSpecialChars) {
      score += 15
    }

    // Check forbidden patterns
    if (this.policy.forbiddenPatterns) {
      for (const pattern of this.policy.forbiddenPatterns) {
        if (password.toLowerCase().includes(pattern.toLowerCase())) {
          errors.push(`Password cannot contain common words like "${pattern}"`)
        }
      }
    }

    if (this.policy.forbiddenWords) {
      for (const word of this.policy.forbiddenWords) {
        if (password.toLowerCase().includes(word.toLowerCase())) {
          warnings.push(`Avoid using words related to "${word}" in your password`)
        }
      }
    }

    // Check against username
    if (username && password.toLowerCase().includes(username.toLowerCase())) {
      errors.push('Password cannot contain your username')
    }

    // Additional security checks
    const commonPatterns = [
      { pattern: /^(.)\1+$/, message: 'Password cannot be all the same character' },
      { pattern: /123/, message: 'Avoid sequential numbers like "123"' },
      { pattern: /abc/i, message: 'Avoid sequential letters like "abc"' },
      { pattern: /qwe/i, message: 'Avoid keyboard patterns like "qwe"' },
    ]

    for (const { pattern, message } of commonPatterns) {
      if (pattern.test(password)) {
        warnings.push(message)
        score -= 5
      }
    }

    // Bonus points for length
    if (password.length >= 12) score += 10
    if (password.length >= 16) score += 10

    // Bonus points for character variety
    const uniqueChars = new Set(password).size
    if (uniqueChars >= password.length * 0.7) score += 10

    // Generate suggestions
    if (errors.length === 0) {
      if (score < 80) {
        suggestions.push('Consider making your password longer for better security')
      }
      if (!hasSpecialChars) {
        suggestions.push('Add special characters (!@#$%^&*) to strengthen your password')
      }
      if (password.length < 12) {
        suggestions.push('Passwords with 12+ characters are more secure')
      }
    } else {
      suggestions.push('Fix the errors above to meet password requirements')
    }

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score))

    return {
      isValid: errors.length === 0,
      score,
      errors,
      warnings,
      suggestions
    }
  }

  /**
   * Generate a strong password suggestion
   */
  generateSecurePassword(length: number = 12): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const specialChars = '!@#$%^&*(),.?":{}|<>'
    
    let password = ''
    let allChars = ''
    
    // Ensure required character types are included
    if (this.policy.requireUppercase) {
      password += uppercase[Math.floor(Math.random() * uppercase.length)]
      allChars += uppercase
    }
    
    if (this.policy.requireLowercase) {
      password += lowercase[Math.floor(Math.random() * lowercase.length)]
      allChars += lowercase
    }
    
    if (this.policy.requireNumbers) {
      password += numbers[Math.floor(Math.random() * numbers.length)]
      allChars += numbers
    }
    
    if (this.policy.requireSpecialChars) {
      password += specialChars[Math.floor(Math.random() * specialChars.length)]
      allChars += specialChars
    }
    
    // Fill remaining length
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)]
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }

  /**
   * Update password policy
   */
  updatePolicy(newPolicy: Partial<PasswordPolicy>): void {
    this.policy = { ...this.policy, ...newPolicy }
  }

  /**
   * Get current password policy
   */
  getPolicy(): PasswordPolicy {
    return { ...this.policy }
  }

  /**
   * Get password strength description
   */
  getStrengthDescription(score: number): { level: string; color: string; description: string } {
    if (score >= 90) {
      return {
        level: 'Excellent',
        color: '#10B981',
        description: 'Your password is very strong and secure'
      }
    } else if (score >= 70) {
      return {
        level: 'Strong',
        color: '#059669',
        description: 'Your password is strong and secure'
      }
    } else if (score >= 50) {
      return {
        level: 'Good',
        color: '#D97706',
        description: 'Your password is good but could be stronger'
      }
    } else if (score >= 30) {
      return {
        level: 'Fair',
        color: '#EA580C',
        description: 'Your password is weak and should be improved'
      }
    } else {
      return {
        level: 'Weak',
        color: '#DC2626',
        description: 'Your password is very weak and unsafe'
      }
    }
  }

  /**
   * Check if password has been compromised (basic check)
   */
  async checkCompromised(password: string): Promise<boolean> {
    // In a real application, you would check against HaveIBeenPwned API
    // For now, just check against very common passwords
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', '12345678',
      'qwerty', '123456789', 'letmein', '1234567890', 'welcome',
      'monkey', '1234567', 'password1', '123123', 'dragon',
      'passw0rd', 'master', 'hello', 'freedom', 'whatever',
      'qwertyuiop', 'trustno1', 'starwars', 'computer', 'michelle'
    ]
    
    return commonPasswords.includes(password.toLowerCase())
  }
}

// Export singleton instance
export const passwordPolicyService = new PasswordPolicyService()

/**
 * React hook for password validation
 */
export function usePasswordValidation() {
  return {
    validatePassword: passwordPolicyService.validatePassword.bind(passwordPolicyService),
    generatePassword: passwordPolicyService.generateSecurePassword.bind(passwordPolicyService),
    getStrengthDescription: passwordPolicyService.getStrengthDescription.bind(passwordPolicyService),
    checkCompromised: passwordPolicyService.checkCompromised.bind(passwordPolicyService),
  }
}

export default passwordPolicyService