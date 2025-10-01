import React, { useState } from 'react'
import { useSecureAuthStore } from '../stores/secureAuthStore'

interface PasswordChangeDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function PasswordChangeDialog({ isOpen, onClose }: PasswordChangeDialogProps) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState(false)
  const [localError, setLocalError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { changePassword, error: storeError, isLoading } = useSecureAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')

    // Validate form
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setLocalError('All fields are required')
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setLocalError('New passwords do not match')
      return
    }

    if (formData.newPassword.length < 6) {
      setLocalError('New password must be at least 6 characters long')
      return
    }

    if (formData.currentPassword === formData.newPassword) {
      setLocalError('New password must be different from current password')
      return
    }

    setIsSubmitting(true)
    try {
      await changePassword({
        oldPassword: formData.currentPassword,
        newPassword: formData.newPassword
      })
      
      // Reset form and close dialog on success
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      onClose()
      
      // Show success message
      alert('Password changed successfully!')
      
    } catch (error) {
      // Error is handled by the store and displayed via storeError
      console.log('Password change failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    setLocalError('')
    onClose()
  }

  const displayError = localError || storeError

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Change Password</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
            disabled={isSubmitting || isLoading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={formData.currentPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter current password"
                disabled={isSubmitting || isLoading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter new password"
                disabled={isSubmitting || isLoading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirm new password"
                disabled={isSubmitting || isLoading}
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="showPasswords"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="showPasswords" className="ml-2 text-sm text-gray-700">
                Show passwords
              </label>
            </div>

            {displayError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {displayError}
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              disabled={isSubmitting || isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting || isLoading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}