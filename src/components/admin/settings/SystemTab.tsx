/**
 * System Settings Tab
 * Manages API settings, performance budgets, and system configuration
 */

import React, { useState, useCallback } from 'react'
import {
  CpuChipIcon,
  CloudIcon,
  BoltIcon,
  ChartBarIcon,
  ServerIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline'
import { useSystemSettings, usePerformanceSettings } from '../../../hooks/useSettings'
import { SettingsCard } from './SettingsCard'
import { SettingsField } from './SettingsField'
import { SettingsSection } from './SettingsSection'
import { SchemaValidator } from '../SchemaValidator'
import type { SystemSettings, PerformanceSettings } from '../../../types/settings'

interface SystemTabProps {
  onSettingChange?: (key: string, value: any) => void
  className?: string
}

export function SystemTab({
  onSettingChange,
  className = ''
}: SystemTabProps) {
  const { 
    settings: systemSettings, 
    loading: systemLoading, 
    error: systemError, 
    updateSetting: updateSystemSetting 
  } = useSystemSettings()
  
  const { 
    settings: performanceSettings, 
    loading: performanceLoading, 
    error: performanceError, 
    updateSetting: updatePerformanceSetting 
  } = usePerformanceSettings()

  const [localSystemChanges, setLocalSystemChanges] = useState<Partial<SystemSettings>>({})
  const [localPerformanceChanges, setLocalPerformanceChanges] = useState<Partial<PerformanceSettings>>({})

  const handleSystemChange = useCallback((key: keyof SystemSettings, value: any) => {
    setLocalSystemChanges(prev => ({ ...prev, [key]: value }))
    onSettingChange?.(key, value)
  }, [onSettingChange])

  const handlePerformanceChange = useCallback((key: keyof PerformanceSettings, value: any) => {
    setLocalPerformanceChanges(prev => ({ ...prev, [key]: value }))
    onSettingChange?.(key, value)
  }, [onSettingChange])

  const handleSaveSystem = useCallback(async () => {
    try {
      for (const [key, value] of Object.entries(localSystemChanges)) {
        await updateSystemSetting(key, value)
      }
      setLocalSystemChanges({})
    } catch (error) {
      console.error('Failed to save system settings:', error)
    }
  }, [localSystemChanges, updateSystemSetting])

  const handleSavePerformance = useCallback(async () => {
    try {
      for (const [key, value] of Object.entries(localPerformanceChanges)) {
        await updatePerformanceSetting(key, value)
      }
      setLocalPerformanceChanges({})
    } catch (error) {
      console.error('Failed to save performance settings:', error)
    }
  }, [localPerformanceChanges, updatePerformanceSetting])

  const getCurrentSystemValue = useCallback(<K extends keyof SystemSettings>(
    key: K
  ): SystemSettings[K] => {
    return (localSystemChanges[key] ?? systemSettings[key]) as SystemSettings[K]
  }, [localSystemChanges, systemSettings])

  const getCurrentPerformanceValue = useCallback(<K extends keyof PerformanceSettings>(
    key: K
  ): PerformanceSettings[K] => {
    return (localPerformanceChanges[key] ?? performanceSettings[key]) as PerformanceSettings[K]
  }, [localPerformanceChanges, performanceSettings])

  const hasSystemChanges = Object.keys(localSystemChanges).length > 0
  const hasPerformanceChanges = Object.keys(localPerformanceChanges).length > 0
  const loading = systemLoading || performanceLoading
  const error = systemError || performanceError

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading system settings
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-2">
        <CpuChipIcon className="w-6 h-6 text-primary-600" />
        <h2 className="text-xl font-semibold text-gray-900">System Settings</h2>
      </div>

      {/* API Configuration */}
      <SettingsCard
        title="API Configuration"
        description="Configure API timeouts, retries, and connection settings"
        icon={CloudIcon}
      >
        <SettingsSection title="Connection Settings">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SettingsField
              label="API Timeout"
              type="number"
              value={getCurrentSystemValue('api_timeout_ms') || 30000}
              onChange={(value) => handleSystemChange('api_timeout_ms', Number(value))}
              suffix="ms"
              min={1000}
              max={300000}
              step={1000}
              description="Maximum time to wait for API responses"
            />
            
            <SettingsField
              label="Retry Attempts"
              type="number"
              value={getCurrentSystemValue('retry_attempts') || 3}
              onChange={(value) => handleSystemChange('retry_attempts', Number(value))}
              min={0}
              max={10}
              description="Number of times to retry failed requests"
            />
            
            <SettingsField
              label="Retry Delay"
              type="number"
              value={getCurrentSystemValue('retry_delay_ms') || 1000}
              onChange={(value) => handleSystemChange('retry_delay_ms', Number(value))}
              suffix="ms"
              min={100}
              max={60000}
              step={100}
              description="Delay between retry attempts"
            />
            
            <SettingsField
              label="Realtime Events Rate"
              type="number"
              value={getCurrentSystemValue('realtime_events_per_second') || 50}
              onChange={(value) => handleSystemChange('realtime_events_per_second', Number(value))}
              suffix="events/sec"
              min={1}
              max={1000}
              description="Maximum realtime events per second"
            />
          </div>
        </SettingsSection>

        <SettingsSection title="Security & Authentication">
          <div className="space-y-4">
            <SettingsField
              label="Auto Refresh Token"
              type="toggle"
              value={getCurrentSystemValue('auto_refresh_token') || true}
              onChange={(value) => handleSystemChange('auto_refresh_token', value)}
              description="Automatically refresh authentication tokens before expiry"
            />
            
            <SettingsField
              label="Detect Session in URL"
              type="toggle"
              value={getCurrentSystemValue('detect_session_in_url') || false}
              onChange={(value) => handleSystemChange('detect_session_in_url', value)}
              description="Allow session detection from URL parameters (less secure)"
            />
          </div>
        </SettingsSection>

        {hasSystemChanges && (
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => setLocalSystemChanges({})}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSystem}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
            >
              Save API Settings
            </button>
          </div>
        )}
      </SettingsCard>

      {/* Performance Budgets */}
      <SettingsCard
        title="Performance Budgets"
        description="Set performance targets and monitoring thresholds"
        icon={BoltIcon}
      >
        <SettingsSection title="Core Web Vitals">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SettingsField
              label="Largest Contentful Paint (LCP)"
              type="number"
              value={getCurrentPerformanceValue('lcp_budget_ms') || 2500}
              onChange={(value) => handlePerformanceChange('lcp_budget_ms', Number(value))}
              suffix="ms"
              min={1000}
              max={10000}
              step={100}
              description="Target LCP time (good: <2.5s)"
            />
            
            <SettingsField
              label="First Input Delay (FID)"
              type="number"
              value={getCurrentPerformanceValue('fid_budget_ms') || 100}
              onChange={(value) => handlePerformanceChange('fid_budget_ms', Number(value))}
              suffix="ms"
              min={50}
              max={1000}
              step={10}
              description="Target FID time (good: <100ms)"
            />
            
            <SettingsField
              label="Cumulative Layout Shift (CLS)"
              type="number"
              value={getCurrentPerformanceValue('cls_budget') || 0.1}
              onChange={(value) => handlePerformanceChange('cls_budget', Number(value))}
              min={0}
              max={1}
              step={0.01}
              description="Target CLS score (good: <0.1)"
            />
          </div>
        </SettingsSection>

        <SettingsSection title="Loading Performance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SettingsField
              label="First Contentful Paint (FCP)"
              type="number"
              value={getCurrentPerformanceValue('fcp_budget_ms') || 1800}
              onChange={(value) => handlePerformanceChange('fcp_budget_ms', Number(value))}
              suffix="ms"
              min={500}
              max={5000}
              step={100}
              description="Target FCP time (good: <1.8s)"
            />
            
            <SettingsField
              label="Time to First Byte (TTFB)"
              type="number"
              value={getCurrentPerformanceValue('ttfb_budget_ms') || 800}
              onChange={(value) => handlePerformanceChange('ttfb_budget_ms', Number(value))}
              suffix="ms"
              min={100}
              max={3000}
              step={50}
              description="Target TTFB time (good: <800ms)"
            />
          </div>
        </SettingsSection>

        <SettingsSection title="Resource Budgets">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SettingsField
              label="Bundle Size Budget"
              type="number"
              value={getCurrentPerformanceValue('bundle_size_budget_kb') || 500}
              onChange={(value) => handlePerformanceChange('bundle_size_budget_kb', Number(value))}
              suffix="KB"
              min={100}
              max={5000}
              step={50}
              description="Maximum initial bundle size"
            />
            
            <SettingsField
              label="Memory Usage Budget"
              type="number"
              value={getCurrentPerformanceValue('memory_usage_budget_mb') || 100}
              onChange={(value) => handlePerformanceChange('memory_usage_budget_mb', Number(value))}
              suffix="MB"
              min={50}
              max={1000}
              step={10}
              description="Maximum memory usage"
            />
            
            <SettingsField
              label="Accessibility Score"
              type="number"
              value={getCurrentPerformanceValue('accessibility_score_min') || 90}
              onChange={(value) => handlePerformanceChange('accessibility_score_min', Number(value))}
              suffix="%"
              min={50}
              max={100}
              description="Minimum accessibility score"
            />
          </div>
        </SettingsSection>

        {hasPerformanceChanges && (
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => setLocalPerformanceChanges({})}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePerformance}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
            >
              Save Performance Settings
            </button>
          </div>
        )}
      </SettingsCard>

      {/* Database Management */}
      <SettingsCard
        title="Database Management"
        description="Database schema validation and migration tools"
        icon={CircleStackIcon}
      >
        <SchemaValidator />
      </SettingsCard>

      {/* System Status Information */}
      <SettingsCard
        title="System Information"
        description="Current system status and monitoring"
        icon={ChartBarIcon}
      >
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <InformationCircleIcon className="w-5 h-5 text-blue-500" />
            <h4 className="text-sm font-medium text-gray-900">Performance Monitoring</h4>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• Performance budgets help maintain optimal user experience</p>
            <p>• Monitoring alerts will trigger when budgets are exceeded</p>
            <p>• Adjust budgets based on your application requirements</p>
            <p>• Lower values provide better UX but may be harder to achieve</p>
          </div>
        </div>

        <div className="bg-amber-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
            <h4 className="text-sm font-medium text-gray-900">Important Notes</h4>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• API timeout changes require application restart to take effect</p>
            <p>• Performance budget changes affect monitoring thresholds</p>
            <p>• Reducing retry attempts may improve responsiveness but reduce reliability</p>
            <p>• Session URL detection should only be enabled for development</p>
          </div>
        </div>
      </SettingsCard>
    </div>
  )
}