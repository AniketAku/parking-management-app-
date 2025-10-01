/**
 * User Management Settings Tab
 * Manages user roles, permissions, authentication, and user administration
 */

import React, { useState, useCallback } from 'react'
import {
  UserGroupIcon,
  ShieldCheckIcon,
  ClockIcon,
  KeyIcon,
  UsersIcon,
  LockClosedIcon,
  EyeSlashIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline'
import { SettingsSection } from './SettingsSection'
import { SettingsField } from './SettingsField'
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

  return (
    <div className={`space-y-8 ${className}`}>
      {/* User Roles Management */}
      <SettingsSection
        title="User Roles & Permissions"
        description="Configure user roles and access levels"
        icon={UserGroupIcon}
      >
        <div className="space-y-6">
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
    </div>
  )
}

export default UserManagementTab