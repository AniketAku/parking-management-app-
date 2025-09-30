import React, { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Button, Input } from '../ui'
import { useLogin, useCurrentUser } from '../../hooks/useAuth'
import { useConnectionStatus } from '../../hooks/useApi'
import type { LoginCredentials } from '../../types'

interface LoginFormProps {
  onSuccess?: () => void
  onSwitchToRegister?: () => void
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onSwitchToRegister }) => {
  const location = useLocation()
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: ''
  })
  
  const [rememberMe, setRememberMe] = useState(false)
  const { mutate: login, loading: loginLoading, error } = useLogin()
  const { isAuthenticated } = useCurrentUser()
  const { isOnline } = useConnectionStatus()

  // Redirect if already authenticated
  if (isAuthenticated) {
    const from = (location.state as any)?.from?.pathname || '/dashboard'
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!credentials.username.trim() || !credentials.password.trim()) {
      return
    }

    try {
      await login(credentials)
      onSuccess?.()
    } catch (error) {
      // Error handling is done by the mutation hook
    }
  }

  const handleInputChange = (field: keyof LoginCredentials) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCredentials(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }

  // Demo credentials for testing
  const fillDemoCredentials = () => {
    setCredentials({
      username: 'Aniket@123',
      password: '12345678'
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-light px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-primary-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-text-primary">
            Parking Management System
          </h2>
          <p className="mt-2 text-sm text-text-muted">
            Sign in to your account to continue
          </p>
          
          {/* Connection status */}
          {!isOnline && (
            <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-xs bg-warning-50 text-warning-700 border border-warning-200">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Offline Mode - Limited functionality
            </div>
          )}
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg shadow-sm border border-border-light p-6">
            <div className="space-y-4">
              {/* Username field */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-text-secondary mb-1">
                  Username
                </label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={credentials.username}
                  onChange={handleInputChange('username')}
                  placeholder="Enter your username"
                  className="w-full"
                  disabled={loginLoading}
                />
              </div>

              {/* Password field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={credentials.password}
                  onChange={handleInputChange('password')}
                  placeholder="Enter your password"
                  className="w-full"
                  disabled={loginLoading}
                />
              </div>

              {/* Remember me */}
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-border-light rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-text-secondary">
                  Remember me
                </label>
              </div>

              {/* Error display */}
              {error && (
                <div className="bg-danger-50 border border-danger-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <svg className="w-4 h-4 text-danger-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-medium text-danger-800">Login failed</h3>
                      <p className="text-xs text-danger-700 mt-1">
                        {error instanceof Error ? error.message : 'Invalid username or password'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                loading={loginLoading}
                disabled={!credentials.username.trim() || !credentials.password.trim()}
              >
                {loginLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>
          </div>

          {/* Demo credentials */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-center">
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="text-xs text-primary-600 hover:text-primary-500 underline"
              >
                🧪 Fill demo credentials (Aniket@123 / 12345678)
              </button>
            </div>
          )}

          {/* Registration link */}
          <div className="text-center">
            <p className="text-sm text-text-muted">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
              >
                Create Account
              </button>
            </p>
          </div>

          {/* Additional info */}
          <div className="text-center">
            <p className="text-xs text-text-muted">
              Secure parking management system • Version 2.0.0
            </p>
            {isOnline && (
              <p className="text-xs text-success-600 mt-1">
                🔒 Secure connection established
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginForm