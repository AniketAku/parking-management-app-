/**
 * Security Settings Tab
 * Manages security policies, audit logging, authentication security, and compliance settings
 */

import React, { useState, useCallback } from 'react'
import {
  ShieldCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  KeyIcon,
  EyeIcon,
  LockClosedIcon,
  BellAlertIcon,
  ComputerDesktopIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'
import { SettingsSection } from './SettingsSection'
import { SettingsField } from './SettingsField'
import type { SecuritySettings } from '../../../types/settings'

interface SecuritySettingsTabProps {
  onSettingChange?: (key: string, value: any) => void
  className?: string
}

export function SecuritySettingsTab({
  onSettingChange,
  className = ''
}: SecuritySettingsTabProps) {
  const [settings, setSettings] = useState<SecuritySettings>({
    enable_audit_logging: true,
    session_inactivity_timeout: 30, // minutes
    max_login_attempts: 5,
    login_lockout_duration: 15, // minutes
  })

  const [advancedSettings, setAdvancedSettings] = useState({
    // Data Protection
    encrypt_sensitive_data: true,
    secure_cookie_settings: true,
    enforce_https: true,
    
    // Access Control
    enable_ip_whitelist: false,
    allowed_ip_addresses: '',
    enable_two_factor_auth: false,
    
    // Security Monitoring
    log_failed_login_attempts: true,
    alert_on_suspicious_activity: true,
    security_scan_frequency: 'daily',
    
    // Compliance
    gdpr_compliance_mode: false,
    data_retention_days: 365,
    auto_delete_old_logs: true,
  })

  const [loading, setLoading] = useState(false)
  const [securityScore, setSecurityScore] = useState(78)

  const handleChange = useCallback((key: keyof SecuritySettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    onSettingChange?.(key, value)
    // Recalculate security score
    calculateSecurityScore({ ...settings, [key]: value })
  }, [onSettingChange, settings])

  const handleAdvancedChange = useCallback((key: string, value: any) => {
    setAdvancedSettings(prev => ({ ...prev, [key]: value }))
    calculateSecurityScore(settings, { ...advancedSettings, [key]: value })
  }, [settings, advancedSettings])

  const calculateSecurityScore = useCallback((coreSettings = settings, advanced = advancedSettings) => {
    let score = 0
    const maxScore = 100
    
    // Core security settings (50 points)
    if (coreSettings.enable_audit_logging) score += 10
    if (coreSettings.session_inactivity_timeout <= 30) score += 10
    if (coreSettings.max_login_attempts <= 5) score += 15
    if (coreSettings.login_lockout_duration >= 10) score += 15
    
    // Advanced settings (50 points)
    if (advanced.encrypt_sensitive_data) score += 15
    if (advanced.enforce_https) score += 10
    if (advanced.enable_two_factor_auth) score += 15
    if (advanced.log_failed_login_attempts) score += 5
    if (advanced.alert_on_suspicious_activity) score += 5
    
    setSecurityScore(Math.min(score, maxScore))
  }, [settings, advancedSettings])

  const handleSave = useCallback(async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      console.log('Security settings saved:', { settings, advancedSettings })
    } catch (error) {
      console.error('Failed to save security settings:', error)
    } finally {
      setLoading(false)
    }
  }, [settings, advancedSettings])

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getSecurityRecommendations = () => {
    const recommendations = []
    if (!settings.enable_audit_logging) recommendations.push('Enable audit logging for compliance')
    if (settings.session_inactivity_timeout > 30) recommendations.push('Reduce session timeout for better security')
    if (!advancedSettings.enable_two_factor_auth) recommendations.push('Enable two-factor authentication')
    if (!advancedSettings.encrypt_sensitive_data) recommendations.push('Enable data encryption')
    if (!advancedSettings.enforce_https) recommendations.push('Enforce HTTPS connections')
    return recommendations
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Security Overview */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Security Score</h3>
            <p className="text-sm text-blue-700">
              Current security configuration rating based on best practices
            </p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-2xl font-bold ${getSecurityScoreColor(securityScore)}`}>
              {securityScore}/100
            </div>
            <div className="mt-2 text-sm text-blue-600">
              {securityScore >= 80 ? 'Excellent' : securityScore >= 60 ? 'Good' : 'Needs Improvement'}
            </div>
          </div>
        </div>
        
        {getSecurityRecommendations().length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">🔒 Security Recommendations:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              {getSecurityRecommendations().map((rec, index) => (
                <li key={index}>• {rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Core Security Settings */}
      <SettingsSection
        title="Authentication Security"
        description="Configure login security and session management"
        icon={LockClosedIcon}
      >
        <div className="space-y-6">
          <SettingsField
            label="Enable Audit Logging"
            description="Log all user actions and system events for security monitoring"
            type="boolean"
            value={settings.enable_audit_logging}
            onChange={(value) => handleChange('enable_audit_logging', value)}
          />

          <SettingsField
            label="Session Inactivity Timeout"
            description="Automatically log out users after inactive period (minutes)"
            type="number"
            value={settings.session_inactivity_timeout}
            min={5}
            max={120}
            onChange={(value) => handleChange('session_inactivity_timeout', value)}
          />

          <SettingsField
            label="Maximum Login Attempts"
            description="Lock account after this many failed login attempts"
            type="number"
            value={settings.max_login_attempts}
            min={3}
            max={10}
            onChange={(value) => handleChange('max_login_attempts', value)}
          />

          <SettingsField
            label="Account Lockout Duration"
            description="How long to lock accounts after failed login attempts (minutes)"
            type="number"
            value={settings.login_lockout_duration}
            min={5}
            max={60}
            onChange={(value) => handleChange('login_lockout_duration', value)}
          />
        </div>
      </SettingsSection>

      {/* Data Protection */}
      <SettingsSection
        title="Data Protection"
        description="Configure data encryption and secure communications"
        icon={ShieldCheckIcon}
      >
        <div className="space-y-6">
          <SettingsField
            label="Encrypt Sensitive Data"
            description="Encrypt sensitive data at rest using AES-256 encryption"
            type="boolean"
            value={advancedSettings.encrypt_sensitive_data}
            onChange={(value) => handleAdvancedChange('encrypt_sensitive_data', value)}
          />

          <SettingsField
            label="Secure Cookie Settings"
            description="Use secure, HTTP-only cookies with SameSite protection"
            type="boolean"
            value={advancedSettings.secure_cookie_settings}
            onChange={(value) => handleAdvancedChange('secure_cookie_settings', value)}
          />

          <SettingsField
            label="Enforce HTTPS"
            description="Redirect all HTTP traffic to HTTPS and use HSTS headers"
            type="boolean"
            value={advancedSettings.enforce_https}
            onChange={(value) => handleAdvancedChange('enforce_https', value)}
          />
        </div>
      </SettingsSection>

      {/* Access Control */}
      <SettingsSection
        title="Access Control"
        description="Configure IP restrictions and multi-factor authentication"
        icon={GlobeAltIcon}
      >
        <div className="space-y-6">
          <SettingsField
            label="Enable Two-Factor Authentication"
            description="Require 2FA for all user accounts"
            type="boolean"
            value={advancedSettings.enable_two_factor_auth}
            onChange={(value) => handleAdvancedChange('enable_two_factor_auth', value)}
          />

          <SettingsField
            label="Enable IP Whitelist"
            description="Restrict access to specific IP addresses"
            type="boolean"
            value={advancedSettings.enable_ip_whitelist}
            onChange={(value) => handleAdvancedChange('enable_ip_whitelist', value)}
          />

          {advancedSettings.enable_ip_whitelist && (
            <SettingsField
              label="Allowed IP Addresses"
              description="Comma-separated list of allowed IP addresses or ranges"
              type="textarea"
              value={advancedSettings.allowed_ip_addresses}
              placeholder="192.168.1.0/24, 10.0.0.1, 203.0.113.0/24"
              onChange={(value) => handleAdvancedChange('allowed_ip_addresses', value)}
            />
          )}
        </div>
      </SettingsSection>

      {/* Security Monitoring */}
      <SettingsSection
        title="Security Monitoring"
        description="Configure security alerts and monitoring"
        icon={EyeIcon}
      >
        <div className="space-y-6">
          <SettingsField
            label="Log Failed Login Attempts"
            description="Keep detailed logs of failed authentication attempts"
            type="boolean"
            value={advancedSettings.log_failed_login_attempts}
            onChange={(value) => handleAdvancedChange('log_failed_login_attempts', value)}
          />

          <SettingsField
            label="Alert on Suspicious Activity"
            description="Send notifications for suspicious user behavior"
            type="boolean"
            value={advancedSettings.alert_on_suspicious_activity}
            onChange={(value) => handleAdvancedChange('alert_on_suspicious_activity', value)}
          />

          <SettingsField
            label="Security Scan Frequency"
            description="How often to run automated security scans"
            type="select"
            value={advancedSettings.security_scan_frequency}
            options={[
              { value: 'hourly', label: 'Hourly' },
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' }
            ]}
            onChange={(value) => handleAdvancedChange('security_scan_frequency', value)}
          />
        </div>
      </SettingsSection>

      {/* Compliance Settings */}
      <SettingsSection
        title="Compliance & Data Retention"
        description="Configure compliance settings and data retention policies"
        icon={DocumentTextIcon}
      >
        <div className="space-y-6">
          <SettingsField
            label="GDPR Compliance Mode"
            description="Enable GDPR compliance features and data protection controls"
            type="boolean"
            value={advancedSettings.gdpr_compliance_mode}
            onChange={(value) => handleAdvancedChange('gdpr_compliance_mode', value)}
          />

          <SettingsField
            label="Data Retention Period"
            description="How long to keep user data and audit logs (days)"
            type="number"
            value={advancedSettings.data_retention_days}
            min={30}
            max={2555}
            onChange={(value) => handleAdvancedChange('data_retention_days', value)}
          />

          <SettingsField
            label="Auto-Delete Old Logs"
            description="Automatically delete logs older than retention period"
            type="boolean"
            value={advancedSettings.auto_delete_old_logs}
            onChange={(value) => handleAdvancedChange('auto_delete_old_logs', value)}
          />
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
          {loading ? 'Saving...' : 'Save Security Settings'}
        </button>
      </div>
    </div>
  )
}

export default SecuritySettingsTab