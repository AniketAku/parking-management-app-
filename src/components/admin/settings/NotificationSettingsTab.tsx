/**
 * Notification Settings Tab
 * Manages email notifications, browser alerts, SMS settings, and notification routing
 */

import React, { useState, useCallback } from 'react'
import {
  BellIcon,
  EnvelopeIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  UserGroupIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { SettingsSection } from './SettingsSection'
import { SettingsField } from './SettingsField'
import type { NotificationSettings } from '../../../types/settings'

interface NotificationSettingsTabProps {
  onSettingChange?: (key: string, value: any) => void
  className?: string
}

interface NotificationChannel {
  id: string
  name: string
  type: 'email' | 'browser' | 'sms' | 'webhook'
  enabled: boolean
  config: Record<string, any>
}

interface NotificationRule {
  id: string
  event: string
  title: string
  description: string
  channels: string[]
  roles: string[]
  priority: 'low' | 'medium' | 'high' | 'critical'
  enabled: boolean
}

export function NotificationSettingsTab({
  onSettingChange,
  className = ''
}: NotificationSettingsTabProps) {
  const [settings, setSettings] = useState<NotificationSettings>({
    enable_browser_notifications: true,
    enable_email_notifications: true,
    daily_report_time: '09:00',
  })

  const [channels, setChannels] = useState<NotificationChannel[]>([
    {
      id: 'browser',
      name: 'Browser Push Notifications',
      type: 'browser',
      enabled: true,
      config: {}
    },
    {
      id: 'email',
      name: 'Email Notifications',
      type: 'email',
      enabled: true,
      config: {
        smtp_server: 'smtp.gmail.com',
        smtp_port: 587,
        from_address: 'noreply@parking-system.com'
      }
    },
    {
      id: 'sms',
      name: 'SMS Alerts',
      type: 'sms',
      enabled: false,
      config: {
        provider: 'twilio',
        from_number: ''
      }
    }
  ])

  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([
    {
      id: 'vehicle_entry',
      event: 'vehicle_entry',
      title: 'Vehicle Entry',
      description: 'Notify when a vehicle enters the facility',
      channels: ['browser'],
      roles: ['admin', 'manager', 'operator'],
      priority: 'low',
      enabled: true
    },
    {
      id: 'vehicle_exit',
      event: 'vehicle_exit',
      title: 'Vehicle Exit',
      description: 'Notify when a vehicle exits the facility',
      channels: ['browser'],
      roles: ['admin', 'manager', 'operator'],
      priority: 'low',
      enabled: true
    },
    {
      id: 'payment_failed',
      event: 'payment_failed',
      title: 'Payment Failed',
      description: 'Alert when a payment transaction fails',
      channels: ['email', 'browser'],
      roles: ['admin', 'manager'],
      priority: 'high',
      enabled: true
    },
    {
      id: 'system_error',
      event: 'system_error',
      title: 'System Error',
      description: 'Critical system errors and failures',
      channels: ['email', 'browser', 'sms'],
      roles: ['admin'],
      priority: 'critical',
      enabled: true
    },
    {
      id: 'capacity_warning',
      event: 'capacity_warning',
      title: 'Capacity Warning',
      description: 'Alert when parking capacity reaches threshold',
      channels: ['email', 'browser'],
      roles: ['admin', 'manager'],
      priority: 'medium',
      enabled: true
    },
    {
      id: 'daily_report',
      event: 'daily_report',
      title: 'Daily Report',
      description: 'Daily summary report of parking activities',
      channels: ['email'],
      roles: ['admin', 'manager'],
      priority: 'low',
      enabled: true
    }
  ])

  const [loading, setLoading] = useState(false)
  const [testNotification, setTestNotification] = useState<string>('')

  const handleChange = useCallback((key: keyof NotificationSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    onSettingChange?.(key, value)
  }, [onSettingChange])

  const handleChannelToggle = useCallback((channelId: string) => {
    setChannels(prev => 
      prev.map(channel => 
        channel.id === channelId 
          ? { ...channel, enabled: !channel.enabled }
          : channel
      )
    )
  }, [])

  const handleRuleToggle = useCallback((ruleId: string) => {
    setNotificationRules(prev => 
      prev.map(rule => 
        rule.id === ruleId 
          ? { ...rule, enabled: !rule.enabled }
          : rule
      )
    )
  }, [])

  const handleRuleChannelToggle = useCallback((ruleId: string, channelId: string) => {
    setNotificationRules(prev => 
      prev.map(rule => {
        if (rule.id === ruleId) {
          const channels = rule.channels.includes(channelId)
            ? rule.channels.filter(id => id !== channelId)
            : [...rule.channels, channelId]
          return { ...rule, channels }
        }
        return rule
      })
    )
  }, [])

  const sendTestNotification = useCallback(async (type: string) => {
    setTestNotification(type)
    try {
      // Simulate sending test notification
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      if (type === 'browser' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('Test Notification', {
            body: 'This is a test notification from the Parking Management System',
            icon: '/favicon.ico'
          })
        } else if (Notification.permission !== 'denied') {
          const permission = await Notification.requestPermission()
          if (permission === 'granted') {
            new Notification('Test Notification', {
              body: 'This is a test notification from the Parking Management System',
              icon: '/favicon.ico'
            })
          }
        }
      }
      
      console.log(`Test ${type} notification sent successfully`)
    } catch (error) {
      console.error(`Failed to send test ${type} notification:`, error)
    } finally {
      setTestNotification('')
    }
  }, [])

  const handleSave = useCallback(async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      console.log('Notification settings saved:', { settings, channels, notificationRules })
    } catch (error) {
      console.error('Failed to save notification settings:', error)
    } finally {
      setLoading(false)
    }
  }, [settings, channels, notificationRules])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return ExclamationTriangleIcon
      case 'high': return ExclamationTriangleIcon
      case 'medium': return InformationCircleIcon
      case 'low': return CheckCircleIcon
      default: return InformationCircleIcon
    }
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Global Notification Settings */}
      <SettingsSection
        title="Global Notification Settings"
        description="Configure overall notification preferences and timing"
        icon={BellIcon}
      >
        <div className="space-y-6">
          <SettingsField
            label="Enable Browser Notifications"
            description="Show browser push notifications for real-time alerts"
            type="boolean"
            value={settings.enable_browser_notifications}
            onChange={(value) => handleChange('enable_browser_notifications', value)}
          />

          <SettingsField
            label="Enable Email Notifications"
            description="Send email notifications for important events"
            type="boolean"
            value={settings.enable_email_notifications}
            onChange={(value) => handleChange('enable_email_notifications', value)}
          />

          <SettingsField
            label="Daily Report Time"
            description="Time to send daily summary reports"
            type="time"
            value={settings.daily_report_time}
            onChange={(value) => handleChange('daily_report_time', value)}
          />
        </div>
      </SettingsSection>

      {/* Notification Channels */}
      <SettingsSection
        title="Notification Channels"
        description="Configure and test different notification delivery methods"
        icon={Cog6ToothIcon}
      >
        <div className="space-y-4">
          {channels.map((channel) => {
            const Icon = channel.type === 'browser' ? ComputerDesktopIcon :
                       channel.type === 'email' ? EnvelopeIcon :
                       channel.type === 'sms' ? DevicePhoneMobileIcon :
                       BellIcon

            return (
              <div key={channel.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Icon className="w-5 h-5 text-gray-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">{channel.name}</h4>
                    <p className="text-sm text-gray-500 capitalize">
                      {channel.type} notifications
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => sendTestNotification(channel.type)}
                    disabled={!channel.enabled || testNotification === channel.type}
                    className="px-3 py-1 text-xs font-medium text-primary-700 bg-primary-100 rounded-md hover:bg-primary-200 disabled:opacity-50"
                  >
                    {testNotification === channel.type ? 'Testing...' : 'Test'}
                  </button>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channel.enabled}
                      onChange={() => handleChannelToggle(channel.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>
            )
          })}
        </div>
      </SettingsSection>

      {/* Notification Rules */}
      <SettingsSection
        title="Event Notification Rules"
        description="Configure which events trigger notifications and through which channels"
        icon={UserGroupIcon}
      >
        <div className="space-y-4">
          {notificationRules.map((rule) => {
            const PriorityIcon = getPriorityIcon(rule.priority)
            
            return (
              <div key={rule.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <PriorityIcon className="w-5 h-5 text-gray-600" />
                    <div>
                      <h4 className="font-medium text-gray-900">{rule.title}</h4>
                      <p className="text-sm text-gray-500">{rule.description}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(rule.priority)}`}>
                      {rule.priority}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => handleRuleToggle(rule.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                {rule.enabled && (
                  <div className="pl-8 space-y-3">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Notification Channels</h5>
                      <div className="flex flex-wrap gap-2">
                        {channels.map((channel) => (
                          <label key={channel.id} className="inline-flex items-center">
                            <input
                              type="checkbox"
                              checked={rule.channels.includes(channel.id)}
                              onChange={() => handleRuleChannelToggle(rule.id, channel.id)}
                              disabled={!channel.enabled}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                            />
                            <span className="ml-2 text-sm text-gray-700 capitalize">
                              {channel.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">User Roles</h5>
                      <div className="flex flex-wrap gap-2">
                        {rule.roles.map((role) => (
                          <span key={role} className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
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
          {loading ? 'Saving...' : 'Save Notification Settings'}
        </button>
      </div>
    </div>
  )
}

export default NotificationSettingsTab