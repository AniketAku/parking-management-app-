/**
 * User Management Settings Tab
 * Manages user roles, permissions, authentication, and user administration
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  UserGroupIcon,
  ShieldCheckIcon,
  ClockIcon,
  KeyIcon,
  UsersIcon,
  LockClosedIcon,
  EyeSlashIcon,
  CheckBadgeIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { SettingsSection } from './SettingsSection'
import { SettingsField } from './SettingsField'
import { CreateUserModal } from './CreateUserModal'
import { UserService, type UserProfile } from '../../../services/userService'
import type { UserManagementSettings } from '../../../types/settings'

interface UserManagementTabProps {
  onSettingChange?: (key: string, value: any) => void
  className?: string
}

export function UserManagementTab({
  onSettingChange,
  className = ''
}: UserManagementTabProps) {
  const [settings, setSettings] = useState<UserManagementSettings>({
    user_roles: ['admin', 'manager', 'operator', 'viewer'],
    session_timeout_minutes: 480, // 8 hours
    auto_refresh_token: true,
    persist_session: true,
    password_min_length: 8,
    password_require_special: true,
  })

  const [loading, setLoading] = useState(false)
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false)
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([])
  const [activeUsers, setActiveUsers] = useState<UserProfile[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  const handleChange = useCallback((key: keyof UserManagementSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    onSettingChange?.(key, value)
  }, [onSettingChange])

  const handleSave = useCallback(async () => {
    setLoading(true)
    try {
      // Here you would typically save to backend
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      console.log('User management settings saved:', settings)
    } catch (error) {
      console.error('Failed to save user management settings:', error)
    } finally {
      setLoading(false)
    }
  }, [settings])

  const handleRoleChange = useCallback((roles: string[]) => {
    handleChange('user_roles', roles)
  }, [handleChange])

  const addRole = useCallback(() => {
    const newRole = prompt('Enter new role name:')
    if (newRole && !settings.user_roles.includes(newRole)) {
      handleRoleChange([...settings.user_roles, newRole])
    }
  }, [settings.user_roles, handleRoleChange])

  const removeRole = useCallback((roleToRemove: string) => {
    if (roleToRemove === 'admin') {
      alert('Cannot remove admin role')
      return
    }
    handleRoleChange(settings.user_roles.filter(role => role !== roleToRemove))
  }, [settings.user_roles, handleRoleChange])

  // Load users on mount
  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const [pending, active] = await Promise.all([
        UserService.getPendingUsers(),
        UserService.getApprovedUsers()
      ])
      setPendingUsers(pending)
      setActiveUsers(active)
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleApproveUser = async (userId: string) => {
    try {
      const result = await UserService.approveUser(userId)
      if (result.success) {
        await loadUsers() // Reload user lists
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error('Failed to approve user:', error)
      alert('Failed to approve user')
    }
  }

  const handleRejectUser = async (userId: string) => {
    if (!confirm('Are you sure you want to reject this user? This action cannot be undone.')) {
      return
    }
    try {
      const result = await UserService.rejectUser(userId)
      if (result.success) {
        await loadUsers() // Reload user lists
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error('Failed to reject user:', error)
      alert('Failed to reject user')
    }
  }

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'operator' | 'viewer') => {
    try {
      const result = await UserService.updateUserRole(userId, newRole)
      if (result.success) {
        await loadUsers() // Reload user lists
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error('Failed to update user role:', error)
      alert('Failed to update user role')
    }
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* User Roles Management */}
      <SettingsSection
        title="User Roles & Permissions"
        description="Configure user roles and access levels"
        icon={UserGroupIcon}
      >
        <div className="space-y-6">
          {/* Create User Button */}
          <div className="flex justify-between items-center mb-4">
            <label className="block text-sm font-medium text-gray-700">
              User Management
            </label>
            <button
              onClick={() => setIsCreateUserModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create User
            </button>
          </div>

          {/* User Lists */}
          <div className="mt-6 space-y-6">
            {/* Pending Users */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">Pending Approval ({pendingUsers.length})</h3>
                <ClockIcon className="h-5 w-5 text-yellow-500" />
              </div>
              {loadingUsers ? (
                <div className="text-center py-4 text-gray-500">Loading...</div>
              ) : pendingUsers.length === 0 ? (
                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-md">
                  No pending approvals
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-gray-900">{user.username}</span>
                          <span className="text-sm text-gray-600">{user.full_name}</span>
                          <span className="text-sm text-gray-500">{user.phone}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Role: <span className="capitalize">{user.role}</span> •
                          Registered: {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproveUser(user.id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                          title="Approve User"
                        >
                          <CheckIcon className="h-4 w-4 mr-1" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectUser(user.id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                          title="Reject User"
                        >
                          <XMarkIcon className="h-4 w-4 mr-1" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Users */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">Active Users ({activeUsers.length})</h3>
                <UsersIcon className="h-5 w-5 text-green-500" />
              </div>
              {loadingUsers ? (
                <div className="text-center py-4 text-gray-500">Loading...</div>
              ) : activeUsers.length === 0 ? (
                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-md">
                  No active users
                </div>
              ) : (
                <div className="space-y-2">
                  {activeUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-gray-900">{user.username}</span>
                          <span className="text-sm text-gray-600">{user.full_name}</span>
                          <span className="text-sm text-gray-500">{user.phone}</span>
                          {user.role === 'admin' && (
                            <CheckBadgeIcon className="h-4 w-4 text-blue-500" title="Admin" />
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Role: <span className="capitalize">{user.role}</span> •
                          Last Login: {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateRole(user.id, e.target.value as 'admin' | 'operator' | 'viewer')}
                          className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="admin">Admin</option>
                          <option value="operator">Operator</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Available User Roles
            </label>
            <div className="space-y-2">
              {settings.user_roles.map((role) => (
                <div key={role} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <ShieldCheckIcon className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900 capitalize">{role}</span>
                    {role === 'admin' && (
                      <CheckBadgeIcon className="w-4 h-4 text-primary-500" title="System role" />
                    )}
                  </div>
                  {role !== 'admin' && (
                    <button
                      onClick={() => removeRole(role)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addRole}
              className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
            >
              Add New Role
            </button>
          </div>
        </div>
      </SettingsSection>

      {/* Authentication Settings */}
      <SettingsSection
        title="Authentication & Security"
        description="Configure session management and authentication policies"
        icon={LockClosedIcon}
      >
        <div className="space-y-6">
          <SettingsField
            label="Session Timeout"
            description="Automatically log out users after inactivity (minutes)"
            type="number"
            value={settings.session_timeout_minutes}
            min={5}
            max={1440}
            step={5}
            onChange={(value) => handleChange('session_timeout_minutes', value)}
          />

          <SettingsField
            label="Auto Refresh Token"
            description="Automatically refresh authentication tokens to prevent session expiry"
            type="boolean"
            value={settings.auto_refresh_token}
            onChange={(value) => handleChange('auto_refresh_token', value)}
          />

          <SettingsField
            label="Persist Session"
            description="Remember user login across browser sessions"
            type="boolean"
            value={settings.persist_session}
            onChange={(value) => handleChange('persist_session', value)}
          />
        </div>
      </SettingsSection>

      {/* Password Policy */}
      <SettingsSection
        title="Password Policy"
        description="Configure password requirements and security rules"
        icon={KeyIcon}
      >
        <div className="space-y-6">
          <SettingsField
            label="Minimum Password Length"
            description="Minimum number of characters required for passwords"
            type="number"
            value={settings.password_min_length}
            min={6}
            max={50}
            onChange={(value) => handleChange('password_min_length', value)}
          />

          <SettingsField
            label="Require Special Characters"
            description="Passwords must contain at least one special character (!@#$%^&*)"
            type="boolean"
            value={settings.password_require_special}
            onChange={(value) => handleChange('password_require_special', value)}
          />
        </div>
      </SettingsSection>

      {/* Role Permissions Matrix */}
      <SettingsSection
        title="Permission Matrix"
        description="View and configure permissions for each user role"
        icon={UsersIcon}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permission
                </th>
                {settings.user_roles.map(role => (
                  <th key={role} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[
                { name: 'Vehicle Entry', key: 'entry' },
                { name: 'Vehicle Exit', key: 'exit' },
                { name: 'Search Records', key: 'search' },
                { name: 'View Reports', key: 'reports_view' },
                { name: 'Export Data', key: 'export' },
                { name: 'User Management', key: 'users' },
                { name: 'System Settings', key: 'settings' },
                { name: 'Printer Management', key: 'printing' }
              ].map((permission) => (
                <tr key={permission.key}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {permission.name}
                  </td>
                  {settings.user_roles.map(role => (
                    <td key={`${permission.key}-${role}`} className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={role === 'admin' || (role === 'manager' && !['users', 'settings'].includes(permission.key))}
                        disabled={role === 'admin'}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50"
                        onChange={() => {/* Handle permission change */}}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsSection>

      {/* Save Button */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        onSuccess={() => {
          setIsCreateUserModalOpen(false)
          loadUsers() // Reload user lists after creating new user
        }}
      />
    </div>
  )
}

export default UserManagementTab