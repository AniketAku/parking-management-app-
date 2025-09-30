import React, { useState } from 'react'
import { useSecureAuthStore } from '../stores/secureAuthStore'
import PasswordChangeDialog from './PasswordChangeDialog'

export default function UserProfile() {
  const { user, logout } = useSecureAuthStore()
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)

  if (!user) {
    return null
  }

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      logout()
    }
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-900">User Profile</h2>
        </div>

        <div className="space-y-6">
          {/* User Information */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
                {user.username}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                  {user.role}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User ID
              </label>
              <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 font-mono text-sm">
                {user.id}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Login
              </label>
              <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
                {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permissions
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {user.permissions?.map((permission) => (
                <div
                  key={permission}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                >
                  {permission}
                </div>
              )) || <div className="text-gray-500 text-sm">No permissions assigned</div>}
            </div>
          </div>

          {/* Actions */}
          <div className="border-t pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowPasswordDialog(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Change Password
              </button>

              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Dialog */}
      <PasswordChangeDialog 
        isOpen={showPasswordDialog} 
        onClose={() => setShowPasswordDialog(false)} 
      />
    </div>
  )
}