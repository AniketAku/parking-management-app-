import React, { useState } from 'react'
import { SecureLoginForm } from '../components/auth/SecureLoginForm'
import { RegistrationForm } from '../components/auth/RegistrationForm'

export const LoginPage: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false)

  const handleLoginSuccess = () => {
    // Navigation is handled by the LoginForm component through redirect
    // This callback can be used for additional actions if needed
    console.log('Login successful')
  }

  const handleRegistrationSuccess = () => {
    // Switch back to login form after successful registration
    setIsRegistering(false)
  }

  const handleSwitchToLogin = () => {
    setIsRegistering(false)
  }

  const handleSwitchToRegister = () => {
    setIsRegistering(true)
  }

  if (isRegistering) {
    return (
      <RegistrationForm
        onSuccess={handleRegistrationSuccess}
        onSwitchToLogin={handleSwitchToLogin}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Secure Login Form */}
        <SecureLoginForm />
      </div>
    </div>
  )
}