/**
 * Reporting Settings Tab
 * Manages report defaults, export configurations, scheduled reports, and data visualization
 */

import React, { useState, useCallback } from 'react'
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  ClockIcon,
  PaintBrushIcon,
  TableCellsIcon,
  EnvelopeIcon,
  CalendarIcon,
  CogIcon,
  EyeIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { SettingsSection } from './SettingsSection'
import { SettingsField } from './SettingsField'
import type { ReportingSettings } from '../../../types/settings'

interface ReportingSettingsTabProps {
  onSettingChange?: (key: string, value: any) => void
  className?: string
}

interface ReportTemplate {
  id: string
  name: string
  description: string
  type: 'summary' | 'detailed' | 'financial' | 'occupancy' | 'custom'
  enabled: boolean
  schedule?: string
  recipients: string[]
}

interface ChartTheme {
  id: string
  name: string
  colors: string[]
  preview: string
}

export function ReportingSettingsTab({
  onSettingChange,
  className = ''
}: ReportingSettingsTabProps) {
  const [settings, setSettings] = useState<ReportingSettings>({
    default_report_period: 'last_7_days',
    export_formats: ['pdf', 'csv', 'xlsx'],
    max_export_records: 10000,
    chart_colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']
  })

  const [advancedSettings, setAdvancedSettings] = useState({
    // Export Settings
    include_charts_in_export: true,
    high_quality_charts: true,
    compress_large_exports: true,
    export_timeout_minutes: 10,
    
    // Scheduling
    enable_scheduled_reports: true,
    max_scheduled_reports: 20,
    default_delivery_time: '08:00',
    
    // Data Settings
    include_raw_data: false,
    anonymize_personal_data: true,
    data_freshness_minutes: 5,
    
    // Performance
    report_cache_duration: 30, // minutes
    enable_background_generation: true,
    parallel_report_generation: 3
  })

  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([
    {
      id: 'daily_summary',
      name: 'Daily Summary',
      description: 'Daily overview of parking activities and revenue',
      type: 'summary',
      enabled: true,
      schedule: '0 9 * * *', // Daily at 9 AM
      recipients: ['admin@example.com']
    },
    {
      id: 'weekly_financial',
      name: 'Weekly Financial Report',
      description: 'Weekly revenue and payment analysis',
      type: 'financial',
      enabled: true,
      schedule: '0 9 * * 1', // Monday at 9 AM
      recipients: ['admin@example.com', 'manager@example.com']
    },
    {
      id: 'monthly_occupancy',
      name: 'Monthly Occupancy Analysis',
      description: 'Monthly parking utilization and capacity trends',
      type: 'occupancy',
      enabled: false,
      schedule: '0 9 1 * *', // First day of month at 9 AM
      recipients: ['admin@example.com']
    }
  ])

  const [chartThemes, setChartThemes] = useState<ChartTheme[]>([
    {
      id: 'default',
      name: 'Default Blue',
      colors: ['#3B82F6', '#1D4ED8', '#1E40AF', '#1E3A8A'],
      preview: 'linear-gradient(90deg, #3B82F6, #1D4ED8, #1E40AF, #1E3A8A)'
    },
    {
      id: 'emerald',
      name: 'Emerald Green',
      colors: ['#10B981', '#059669', '#047857', '#065F46'],
      preview: 'linear-gradient(90deg, #10B981, #059669, #047857, #065F46)'
    },
    {
      id: 'sunset',
      name: 'Sunset Orange',
      colors: ['#F59E0B', '#D97706', '#B45309', '#92400E'],
      preview: 'linear-gradient(90deg, #F59E0B, #D97706, #B45309, #92400E)'
    },
    {
      id: 'professional',
      name: 'Professional Gray',
      colors: ['#6B7280', '#4B5563', '#374151', '#1F2937'],
      preview: 'linear-gradient(90deg, #6B7280, #4B5563, #374151, #1F2937)'
    }
  ])

  const [selectedTheme, setSelectedTheme] = useState('default')
  const [loading, setLoading] = useState(false)

  const handleChange = useCallback((key: keyof ReportingSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    onSettingChange?.(key, value)
  }, [onSettingChange])

  const handleAdvancedChange = useCallback((key: string, value: any) => {
    setAdvancedSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleTemplateToggle = useCallback((templateId: string) => {
    setReportTemplates(prev =>
      prev.map(template =>
        template.id === templateId
          ? { ...template, enabled: !template.enabled }
          : template
      )
    )
  }, [])

  const handleExportFormatToggle = useCallback((format: string) => {
    setSettings(prev => ({
      ...prev,
      export_formats: prev.export_formats.includes(format)
        ? prev.export_formats.filter(f => f !== format)
        : [...prev.export_formats, format]
    }))
  }, [])

  const generateSampleReport = useCallback(async (templateId: string) => {
    try {
      console.log(`Generating sample report for template: ${templateId}`)
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Create a mock download
      const blob = new Blob(['Sample report content'], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sample-${templateId}-report.txt`
      a.click()
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Failed to generate sample report:', error)
    }
  }, [])

  const handleSave = useCallback(async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      console.log('Reporting settings saved:', { 
        settings, 
        advancedSettings, 
        reportTemplates, 
        selectedTheme 
      })
    } catch (error) {
      console.error('Failed to save reporting settings:', error)
    } finally {
      setLoading(false)
    }
  }, [settings, advancedSettings, reportTemplates, selectedTheme])

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Default Report Settings */}
      <SettingsSection
        title="Default Report Settings"
        description="Configure default report parameters and data ranges"
        icon={ChartBarIcon}
      >
        <div className="space-y-6">
          <SettingsField
            label="Default Report Period"
            description="Default time period for new reports"
            type="select"
            value={settings.default_report_period}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'yesterday', label: 'Yesterday' },
              { value: 'last_7_days', label: 'Last 7 Days' },
              { value: 'last_30_days', label: 'Last 30 Days' },
              { value: 'this_month', label: 'This Month' },
              { value: 'last_month', label: 'Last Month' },
              { value: 'this_year', label: 'This Year' },
              { value: 'custom', label: 'Custom Range' }
            ]}
            onChange={(value) => handleChange('default_report_period', value)}
          />

          <SettingsField
            label="Maximum Export Records"
            description="Maximum number of records allowed in exported reports"
            type="number"
            value={settings.max_export_records}
            min={1000}
            max={100000}
            step={1000}
            onChange={(value) => handleChange('max_export_records', value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Export Formats
            </label>
            <div className="space-y-2">
              {['pdf', 'csv', 'xlsx', 'json'].map(format => (
                <label key={format} className="inline-flex items-center mr-6">
                  <input
                    type="checkbox"
                    checked={settings.export_formats.includes(format)}
                    onChange={() => handleExportFormatToggle(format)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 uppercase font-medium">
                    {format}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Chart & Visualization Settings */}
      <SettingsSection
        title="Charts & Visualization"
        description="Configure chart appearance and data visualization settings"
        icon={PaintBrushIcon}
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Chart Color Theme
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {chartThemes.map(theme => (
                <div
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`cursor-pointer p-3 rounded-lg border-2 transition-colors ${
                    selectedTheme === theme.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div 
                    className="h-8 w-full rounded mb-2"
                    style={{ background: theme.preview }}
                  />
                  <p className="text-xs font-medium text-gray-900">{theme.name}</p>
                </div>
              ))}
            </div>
          </div>

          <SettingsField
            label="Include Charts in Exports"
            description="Include charts and graphs in PDF exports"
            type="boolean"
            value={advancedSettings.include_charts_in_export}
            onChange={(value) => handleAdvancedChange('include_charts_in_export', value)}
          />

          <SettingsField
            label="High Quality Charts"
            description="Generate high-resolution charts (larger file sizes)"
            type="boolean"
            value={advancedSettings.high_quality_charts}
            onChange={(value) => handleAdvancedChange('high_quality_charts', value)}
          />
        </div>
      </SettingsSection>

      {/* Report Templates */}
      <SettingsSection
        title="Report Templates"
        description="Configure and manage automated report templates"
        icon={DocumentTextIcon}
      >
        <div className="space-y-4">
          {reportTemplates.map(template => (
            <div key={template.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <DocumentArrowDownIcon className="w-5 h-5 text-gray-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">{template.name}</h4>
                    <p className="text-sm text-gray-500">{template.description}</p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    {template.type}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => generateSampleReport(template.id)}
                    className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Preview
                  </button>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={template.enabled}
                      onChange={() => handleTemplateToggle(template.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>

              {template.enabled && template.schedule && (
                <div className="pl-8 pt-3 border-t border-gray-100">
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="w-4 h-4" />
                      <span>Schedule: {template.schedule}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <EnvelopeIcon className="w-4 h-4" />
                      <span>Recipients: {template.recipients.length}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* Advanced Settings */}
      <SettingsSection
        title="Advanced Configuration"
        description="Performance, caching, and data processing settings"
        icon={CogIcon}
      >
        <div className="space-y-6">
          <SettingsField
            label="Enable Scheduled Reports"
            description="Allow automatic generation and delivery of scheduled reports"
            type="boolean"
            value={advancedSettings.enable_scheduled_reports}
            onChange={(value) => handleAdvancedChange('enable_scheduled_reports', value)}
          />

          <SettingsField
            label="Report Cache Duration"
            description="How long to cache generated reports (minutes)"
            type="number"
            value={advancedSettings.report_cache_duration}
            min={0}
            max={1440}
            step={5}
            onChange={(value) => handleAdvancedChange('report_cache_duration', value)}
          />

          <SettingsField
            label="Data Freshness Interval"
            description="How often to refresh data for real-time reports (minutes)"
            type="number"
            value={advancedSettings.data_freshness_minutes}
            min={1}
            max={60}
            onChange={(value) => handleAdvancedChange('data_freshness_minutes', value)}
          />

          <SettingsField
            label="Compress Large Exports"
            description="Automatically compress exports larger than 10MB"
            type="boolean"
            value={advancedSettings.compress_large_exports}
            onChange={(value) => handleAdvancedChange('compress_large_exports', value)}
          />

          <SettingsField
            label="Anonymize Personal Data"
            description="Remove or mask personal information in exported reports"
            type="boolean"
            value={advancedSettings.anonymize_personal_data}
            onChange={(value) => handleAdvancedChange('anonymize_personal_data', value)}
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
          {loading ? 'Saving...' : 'Save Reporting Settings'}
        </button>
      </div>
    </div>
  )
}

export default ReportingSettingsTab