/**
 * Performance Settings Tab
 * Manages performance monitoring, optimization settings, caching, and performance budgets
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  BoltIcon,
  ChartBarIcon,
  ClockIcon,
  CpuChipIcon,
  DevicePhoneMobileIcon,
  CloudArrowUpIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { SettingsSection } from './SettingsSection'
import { SettingsField } from './SettingsField'
import type { PerformanceSettings } from '../../../types/settings'

interface PerformanceSettingsTabProps {
  onSettingChange?: (key: string, value: any) => void
  className?: string
}

interface PerformanceMetric {
  id: string
  name: string
  current_value: number
  budget_value: number
  unit: string
  status: 'good' | 'needs_improvement' | 'poor'
  description: string
}

interface CacheConfiguration {
  id: string
  name: string
  type: 'memory' | 'disk' | 'redis' | 'cdn'
  enabled: boolean
  ttl_seconds: number
  max_size_mb: number
  hit_ratio: number
}

export function PerformanceSettingsTab({
  onSettingChange,
  className = ''
}: PerformanceSettingsTabProps) {
  const [settings, setSettings] = useState<PerformanceSettings>({
    lcp_budget_ms: 2500,
    fid_budget_ms: 100,
    cls_budget: 0.1,
    fcp_budget_ms: 1800,
    ttfb_budget_ms: 800,
    bundle_size_budget_kb: 500,
    memory_usage_budget_mb: 100,
    accessibility_score_min: 90,
  })

  const [advancedSettings, setAdvancedSettings] = useState({
    // Resource Optimization
    enable_code_splitting: true,
    enable_lazy_loading: true,
    enable_image_optimization: true,
    enable_font_optimization: true,
    
    // Caching Strategy
    enable_browser_caching: true,
    enable_service_worker: true,
    cache_static_assets: true,
    cache_api_responses: true,
    api_cache_duration_minutes: 15,
    
    // Performance Monitoring
    enable_performance_monitoring: true,
    performance_sampling_rate: 0.1,
    enable_error_tracking: true,
    enable_user_timing: true,
    
    // Network Optimization
    enable_compression: true,
    compression_level: 6,
    enable_http2_push: false,
    enable_prefetching: true,
    
    // Resource Loading
    preload_critical_resources: true,
    defer_non_critical_css: true,
    minimize_render_blocking: true,
    optimize_critical_path: true,
    
    // Database Performance
    enable_query_optimization: true,
    database_connection_pooling: true,
    enable_query_caching: true,
    slow_query_threshold_ms: 1000,
  })

  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([
    {
      id: 'lcp',
      name: 'Largest Contentful Paint',
      current_value: 2100,
      budget_value: 2500,
      unit: 'ms',
      status: 'good',
      description: 'Time to render the largest content element'
    },
    {
      id: 'fid',
      name: 'First Input Delay',
      current_value: 80,
      budget_value: 100,
      unit: 'ms',
      status: 'good',
      description: 'Delay between first user interaction and response'
    },
    {
      id: 'cls',
      name: 'Cumulative Layout Shift',
      current_value: 0.05,
      budget_value: 0.1,
      unit: '',
      status: 'good',
      description: 'Visual stability during page load'
    },
    {
      id: 'fcp',
      name: 'First Contentful Paint',
      current_value: 1600,
      budget_value: 1800,
      unit: 'ms',
      status: 'good',
      description: 'Time to render first content element'
    },
    {
      id: 'ttfb',
      name: 'Time to First Byte',
      current_value: 950,
      budget_value: 800,
      unit: 'ms',
      status: 'needs_improvement',
      description: 'Server response time'
    }
  ])

  const [cacheConfigurations, setCacheConfigurations] = useState<CacheConfiguration[]>([
    {
      id: 'browser_cache',
      name: 'Browser Cache',
      type: 'memory',
      enabled: true,
      ttl_seconds: 3600,
      max_size_mb: 50,
      hit_ratio: 0.85
    },
    {
      id: 'api_cache',
      name: 'API Response Cache',
      type: 'memory',
      enabled: true,
      ttl_seconds: 900,
      max_size_mb: 25,
      hit_ratio: 0.78
    },
    {
      id: 'static_assets',
      name: 'Static Assets Cache',
      type: 'disk',
      enabled: true,
      ttl_seconds: 86400,
      max_size_mb: 200,
      hit_ratio: 0.92
    },
    {
      id: 'cdn_cache',
      name: 'CDN Cache',
      type: 'cdn',
      enabled: false,
      ttl_seconds: 3600,
      max_size_mb: 1000,
      hit_ratio: 0.88
    }
  ])

  const [loading, setLoading] = useState(false)
  const [performanceScore, setPerformanceScore] = useState(85)

  const handleChange = useCallback((key: keyof PerformanceSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    onSettingChange?.(key, value)
    calculatePerformanceScore({ ...settings, [key]: value })
  }, [onSettingChange, settings])

  const handleAdvancedChange = useCallback((key: string, value: any) => {
    setAdvancedSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const calculatePerformanceScore = useCallback((currentSettings = settings) => {
    let score = 0
    const maxScore = 100
    
    // Core Web Vitals scoring (40 points)
    if (currentSettings.lcp_budget_ms <= 2500) score += 12
    if (currentSettings.fid_budget_ms <= 100) score += 10
    if (currentSettings.cls_budget <= 0.1) score += 10
    if (currentSettings.fcp_budget_ms <= 1800) score += 8
    
    // Resource budgets (30 points)
    if (currentSettings.bundle_size_budget_kb <= 500) score += 15
    if (currentSettings.memory_usage_budget_mb <= 100) score += 15
    
    // Accessibility and optimization (30 points)
    if (currentSettings.accessibility_score_min >= 90) score += 15
    if (currentSettings.ttfb_budget_ms <= 800) score += 15
    
    setPerformanceScore(Math.min(score, maxScore))
  }, [settings])

  const handleCacheToggle = useCallback((cacheId: string) => {
    setCacheConfigurations(prev =>
      prev.map(cache =>
        cache.id === cacheId
          ? { ...cache, enabled: !cache.enabled }
          : cache
      )
    )
  }, [])

  const runPerformanceAudit = useCallback(async () => {
    console.log('Running performance audit...')
    setLoading(true)
    try {
      // Simulate performance audit
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Update metrics with simulated results
      setPerformanceMetrics(prev => prev.map(metric => ({
        ...metric,
        current_value: metric.current_value + (Math.random() - 0.5) * metric.current_value * 0.2
      })))
      
      console.log('Performance audit completed')
    } catch (error) {
      console.error('Performance audit failed:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const clearAllCaches = useCallback(async () => {
    console.log('Clearing all caches...')
    try {
      // Simulate cache clearing
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Reset cache hit ratios
      setCacheConfigurations(prev => prev.map(cache => ({
        ...cache,
        hit_ratio: 0
      })))
      
      console.log('All caches cleared successfully')
    } catch (error) {
      console.error('Failed to clear caches:', error)
    }
  }, [])

  const handleSave = useCallback(async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      console.log('Performance settings saved:', { 
        settings, 
        advancedSettings, 
        cacheConfigurations 
      })
    } catch (error) {
      console.error('Failed to save performance settings:', error)
    } finally {
      setLoading(false)
    }
  }, [settings, advancedSettings, cacheConfigurations])

  const getPerformanceScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100'
    if (score >= 75) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getMetricStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return CheckCircleIcon
      case 'needs_improvement': return ExclamationTriangleIcon
      case 'poor': return ExclamationTriangleIcon
      default: return InformationCircleIcon
    }
  }

  const getMetricStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600'
      case 'needs_improvement': return 'text-yellow-600'
      case 'poor': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getCacheTypeIcon = (type: string) => {
    switch (type) {
      case 'memory': return CpuChipIcon
      case 'disk': return DevicePhoneMobileIcon
      case 'redis': return BoltIcon
      case 'cdn': return CloudArrowUpIcon
      default: return ArrowPathIcon
    }
  }

  useEffect(() => {
    calculatePerformanceScore()
  }, [calculatePerformanceScore])

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Performance Overview */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-green-900 mb-2">Performance Score</h3>
            <p className="text-sm text-green-700">
              Overall performance rating based on Core Web Vitals and optimization settings
            </p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-2xl font-bold ${getPerformanceScoreColor(performanceScore)}`}>
              {performanceScore}/100
            </div>
            <div className="mt-2 text-sm text-green-600">
              {performanceScore >= 90 ? 'Excellent' : performanceScore >= 75 ? 'Good' : 'Needs Work'}
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <button
            onClick={runPerformanceAudit}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
          >
            {loading ? 'Running Audit...' : 'Run Performance Audit'}
          </button>
          <button
            onClick={clearAllCaches}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            Clear All Caches
          </button>
        </div>
      </div>

      {/* Core Web Vitals */}
      <SettingsSection
        title="Core Web Vitals"
        description="Configure performance budgets for Core Web Vitals metrics"
        icon={ChartBarIcon}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SettingsField
              label="LCP Budget (ms)"
              description="Largest Contentful Paint budget"
              type="number"
              value={settings.lcp_budget_ms}
              min={1000}
              max={5000}
              step={100}
              onChange={(value) => handleChange('lcp_budget_ms', value)}
            />

            <SettingsField
              label="FID Budget (ms)"
              description="First Input Delay budget"
              type="number"
              value={settings.fid_budget_ms}
              min={50}
              max={300}
              step={10}
              onChange={(value) => handleChange('fid_budget_ms', value)}
            />

            <SettingsField
              label="CLS Budget"
              description="Cumulative Layout Shift budget"
              type="number"
              value={settings.cls_budget}
              min={0}
              max={0.5}
              step={0.01}
              onChange={(value) => handleChange('cls_budget', value)}
            />

            <SettingsField
              label="FCP Budget (ms)"
              description="First Contentful Paint budget"
              type="number"
              value={settings.fcp_budget_ms}
              min={1000}
              max={3000}
              step={100}
              onChange={(value) => handleChange('fcp_budget_ms', value)}
            />
          </div>

          {/* Current Metrics */}
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Current Performance Metrics</h4>
            <div className="space-y-3">
              {performanceMetrics.map(metric => {
                const StatusIcon = getMetricStatusIcon(metric.status)
                return (
                  <div key={metric.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <StatusIcon className={`w-5 h-5 ${getMetricStatusColor(metric.status)}`} />
                      <div>
                        <span className="text-sm font-medium text-gray-900">{metric.name}</span>
                        <p className="text-xs text-gray-500">{metric.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {metric.current_value.toFixed(metric.unit ? 0 : 2)}{metric.unit}
                      </span>
                      <div className="text-xs text-gray-500">
                        Budget: {metric.budget_value.toFixed(metric.unit ? 0 : 2)}{metric.unit}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Resource Budgets */}
      <SettingsSection
        title="Resource Budgets"
        description="Set limits for bundle size, memory usage, and accessibility"
        icon={CpuChipIcon}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SettingsField
            label="Bundle Size Budget (KB)"
            description="Maximum JavaScript bundle size"
            type="number"
            value={settings.bundle_size_budget_kb}
            min={100}
            max={2000}
            step={50}
            onChange={(value) => handleChange('bundle_size_budget_kb', value)}
          />

          <SettingsField
            label="Memory Budget (MB)"
            description="Maximum memory usage limit"
            type="number"
            value={settings.memory_usage_budget_mb}
            min={50}
            max={500}
            step={25}
            onChange={(value) => handleChange('memory_usage_budget_mb', value)}
          />

          <SettingsField
            label="TTFB Budget (ms)"
            description="Time to First Byte budget"
            type="number"
            value={settings.ttfb_budget_ms}
            min={200}
            max={2000}
            step={100}
            onChange={(value) => handleChange('ttfb_budget_ms', value)}
          />

          <SettingsField
            label="Accessibility Score Min"
            description="Minimum accessibility score (0-100)"
            type="number"
            value={settings.accessibility_score_min}
            min={50}
            max={100}
            onChange={(value) => handleChange('accessibility_score_min', value)}
          />
        </div>
      </SettingsSection>

      {/* Cache Management */}
      <SettingsSection
        title="Cache Management"
        description="Configure caching strategies and cache performance"
        icon={ArrowPathIcon}
      >
        <div className="space-y-4">
          {cacheConfigurations.map(cache => {
            const CacheIcon = getCacheTypeIcon(cache.type)
            return (
              <div key={cache.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <CacheIcon className="w-5 h-5 text-gray-600" />
                    <div>
                      <h4 className="font-medium text-gray-900">{cache.name}</h4>
                      <p className="text-sm text-gray-500 capitalize">
                        {cache.type} cache • TTL: {cache.ttl_seconds}s • Max: {cache.max_size_mb}MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {(cache.hit_ratio * 100).toFixed(1)}% hit ratio
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cache.enabled}
                        onChange={() => handleCacheToggle(cache.id)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </SettingsSection>

      {/* Optimization Settings */}
      <SettingsSection
        title="Optimization Settings"
        description="Advanced performance optimization features"
        icon={BoltIcon}
      >
        <div className="space-y-6">
          <SettingsField
            label="Enable Code Splitting"
            description="Split JavaScript bundles for better loading performance"
            type="boolean"
            value={advancedSettings.enable_code_splitting}
            onChange={(value) => handleAdvancedChange('enable_code_splitting', value)}
          />

          <SettingsField
            label="Enable Lazy Loading"
            description="Load images and components only when needed"
            type="boolean"
            value={advancedSettings.enable_lazy_loading}
            onChange={(value) => handleAdvancedChange('enable_lazy_loading', value)}
          />

          <SettingsField
            label="Enable Image Optimization"
            description="Automatically optimize images for web delivery"
            type="boolean"
            value={advancedSettings.enable_image_optimization}
            onChange={(value) => handleAdvancedChange('enable_image_optimization', value)}
          />

          <SettingsField
            label="Enable Compression"
            description="Compress responses using gzip/brotli"
            type="boolean"
            value={advancedSettings.enable_compression}
            onChange={(value) => handleAdvancedChange('enable_compression', value)}
          />

          <SettingsField
            label="Performance Monitoring"
            description="Track and report performance metrics"
            type="boolean"
            value={advancedSettings.enable_performance_monitoring}
            onChange={(value) => handleAdvancedChange('enable_performance_monitoring', value)}
          />

          <SettingsField
            label="API Cache Duration (minutes)"
            description="How long to cache API responses"
            type="number"
            value={advancedSettings.api_cache_duration_minutes}
            min={1}
            max={60}
            onChange={(value) => handleAdvancedChange('api_cache_duration_minutes', value)}
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
          {loading ? 'Saving...' : 'Save Performance Settings'}
        </button>
      </div>
    </div>
  )
}

export default PerformanceSettingsTab