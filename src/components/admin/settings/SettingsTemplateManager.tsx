/**
 * Settings Template Manager Component
 * Allows users to create, save, load, and manage settings templates
 */

import React, { useState, useCallback } from 'react'
import {
  DocumentDuplicateIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ClockIcon,
  TagIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  StarIcon,
  BuildingOfficeIcon,
  TruckIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import type { SettingTemplate, SettingCategory, AllSettings } from '../../../types/settings'

interface SettingsTemplateManagerProps {
  currentSettings: Partial<AllSettings>
  onApplyTemplate?: (template: SettingTemplate) => void
  onSettingsChange?: (settings: Partial<AllSettings>) => void
  className?: string
}

interface TemplateFormData {
  name: string
  description: string
  category: SettingCategory | 'all'
  business_types: string[]
  is_default: boolean
}

const BUSINESS_TYPES = [
  'Small Parking Lot',
  'Large Commercial Facility',
  'Shopping Mall',
  'Airport Parking',
  'Hospital Parking',
  'University Campus',
  'Residential Complex',
  'Office Building',
  'Event Venue',
  'Public Parking'
]

const TEMPLATE_CATEGORIES: Array<{ value: SettingCategory | 'all', label: string }> = [
  { value: 'all', label: 'All Settings' },
  { value: 'business', label: 'Business Settings' },
  { value: 'security', label: 'Security Settings' },
  { value: 'user_mgmt', label: 'User Management' },
  { value: 'printing', label: 'Printing Settings' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'performance', label: 'Performance' }
]

const DEFAULT_TEMPLATES: SettingTemplate[] = [
  {
    id: 'small-business',
    name: 'Small Business Setup',
    description: 'Optimized settings for small parking lots (10-50 spaces)',
    category: 'business',
    template_data: {
      business: {
        vehicle_rates: { 'Trailer': 150, '6 Wheeler': 100, '4 Wheeler': 75, '2 Wheeler': 25 },
        operating_hours: { start: '06:00', end: '20:00', timezone: 'Asia/Kolkata' },
        payment_methods: ['Cash', 'UPI', 'Credit Card']
      },
      security: {
        enable_audit_logging: false,
        session_inactivity_timeout: 60,
        max_login_attempts: 5
      }
    },
    is_default: true,
    is_system_template: true,
    applicable_business_types: ['Small Parking Lot', 'Office Building'],
    created_at: '2024-01-01T00:00:00Z',
    version: 1
  },
  {
    id: 'enterprise-setup',
    name: 'Enterprise Grade',
    description: 'High-security setup for large commercial facilities',
    template_data: {
      business: {
        vehicle_rates: { 'Trailer': 300, '6 Wheeler': 200, '4 Wheeler': 150, '2 Wheeler': 75 },
        operating_hours: { start: '00:00', end: '23:59', timezone: 'Asia/Kolkata' }
      },
      security: {
        enable_audit_logging: true,
        session_inactivity_timeout: 30,
        max_login_attempts: 3,
        login_lockout_duration: 30
      },
      performance: {
        lcp_budget_ms: 2000,
        bundle_size_budget_kb: 300,
        memory_usage_budget_mb: 75
      }
    },
    is_default: false,
    is_system_template: true,
    applicable_business_types: ['Large Commercial Facility', 'Shopping Mall', 'Airport Parking'],
    created_at: '2024-01-01T00:00:00Z',
    version: 1
  },
  {
    id: 'budget-friendly',
    name: 'Budget Friendly',
    description: 'Cost-effective settings with minimal features',
    template_data: {
      business: {
        vehicle_rates: { 'Trailer': 100, '6 Wheeler': 75, '4 Wheeler': 50, '2 Wheeler': 20 },
        payment_methods: ['Cash', 'UPI']
      },
      notifications: {
        enable_email_notifications: false,
        enable_browser_notifications: true
      }
    },
    is_default: false,
    is_system_template: true,
    applicable_business_types: ['Small Parking Lot', 'Residential Complex'],
    created_at: '2024-01-01T00:00:00Z',
    version: 1
  }
]

export function SettingsTemplateManager({
  currentSettings,
  onApplyTemplate,
  onSettingsChange,
  className = ''
}: SettingsTemplateManagerProps) {
  const [templates, setTemplates] = useState<SettingTemplate[]>(DEFAULT_TEMPLATES)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<SettingTemplate | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<SettingCategory | 'all'>('all')
  
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    description: '',
    category: 'all',
    business_types: [],
    is_default: false
  })

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter
    
    return matchesSearch && matchesCategory
  })

  const handleCreateTemplate = useCallback(async () => {
    if (!formData.name.trim()) return

    setLoading(true)
    try {
      const newTemplate: SettingTemplate = {
        id: `custom_${Date.now()}`,
        name: formData.name,
        description: formData.description,
        category: formData.category === 'all' ? undefined : formData.category,
        template_data: formData.category === 'all' 
          ? currentSettings 
          : { [formData.category]: currentSettings[formData.category] },
        is_default: formData.is_default,
        is_system_template: false,
        applicable_business_types: formData.business_types,
        created_at: new Date().toISOString(),
        version: 1
      }

      setTemplates(prev => [...prev, newTemplate])
      setShowCreateForm(false)
      setFormData({
        name: '',
        description: '',
        category: 'all',
        business_types: [],
        is_default: false
      })

      console.log('Template created:', newTemplate)
    } catch (error) {
      console.error('Failed to create template:', error)
    } finally {
      setLoading(false)
    }
  }, [formData, currentSettings])

  const handleApplyTemplate = useCallback(async (template: SettingTemplate) => {
    setLoading(true)
    try {
      onApplyTemplate?.(template)
      onSettingsChange?.(template.template_data as Partial<AllSettings>)
      setSelectedTemplate(template.id)
      console.log('Template applied:', template.name)
    } catch (error) {
      console.error('Failed to apply template:', error)
    } finally {
      setLoading(false)
    }
  }, [onApplyTemplate, onSettingsChange])

  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    setTemplates(prev => prev.filter(t => t.id !== templateId))
    if (selectedTemplate === templateId) {
      setSelectedTemplate(null)
    }
  }, [selectedTemplate])

  const handleExportTemplate = useCallback((template: SettingTemplate) => {
    const dataStr = JSON.stringify(template, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${template.name.toLowerCase().replace(/\s+/g, '-')}-template.json`
    link.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleImportTemplate = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string) as SettingTemplate
        imported.id = `imported_${Date.now()}`
        imported.is_system_template = false
        setTemplates(prev => [...prev, imported])
        console.log('Template imported:', imported.name)
      } catch (error) {
        console.error('Failed to import template:', error)
        alert('Invalid template file format')
      }
    }
    reader.readAsText(file)
  }, [])

  const handleToggleFavorite = useCallback((templateId: string) => {
    setTemplates(prev => 
      prev.map(t => 
        t.id === templateId 
          ? { ...t, is_default: !t.is_default }
          : t
      )
    )
  }, [])

  const getTemplateIcon = (template: SettingTemplate) => {
    if (template.applicable_business_types?.includes('Small Parking Lot')) return TruckIcon
    if (template.applicable_business_types?.includes('Large Commercial Facility')) return BuildingOfficeIcon
    return DocumentDuplicateIcon
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Settings Templates</h3>
          <p className="text-sm text-gray-500">
            Manage and apply pre-configured settings templates
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImportTemplate}
              className="sr-only"
            />
            <button className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center space-x-2">
              <ArrowUpTrayIcon className="w-4 h-4" />
              <span>Import</span>
            </button>
          </label>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center space-x-2 text-sm font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Create Template</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as SettingCategory | 'all')}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          {TEMPLATE_CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map(template => {
          const TemplateIcon = getTemplateIcon(template)
          const isSelected = selectedTemplate === template.id

          return (
            <div
              key={template.id}
              className={`border rounded-lg p-4 transition-all ${
                isSelected
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    template.is_system_template ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <TemplateIcon className={`w-5 h-5 ${
                      template.is_system_template ? 'text-blue-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{template.name}</h4>
                    {template.is_system_template && (
                      <span className="text-xs text-blue-600 font-medium">System Template</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleToggleFavorite(template.id)}
                    className="p-1 text-gray-400 hover:text-yellow-500"
                  >
                    {template.is_default ? (
                      <StarIconSolid className="w-4 h-4 text-yellow-500" />
                    ) : (
                      <StarIcon className="w-4 h-4" />
                    )}
                  </button>
                  <div className="relative">
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <PencilIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {template.description && (
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>
              )}

              {template.applicable_business_types && template.applicable_business_types.length > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1">
                    {template.applicable_business_types.slice(0, 2).map(type => (
                      <span key={type} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                        {type}
                      </span>
                    ))}
                    {template.applicable_business_types.length > 2 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                        +{template.applicable_business_types.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <ClockIcon className="w-3 h-3" />
                  <span>{new Date(template.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleExportTemplate(template)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Export template"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                  </button>
                  {!template.is_system_template && (
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete template"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleApplyTemplate(template)}
                    disabled={loading}
                    className="px-3 py-1 text-xs font-medium text-primary-700 bg-primary-100 rounded-md hover:bg-primary-200 disabled:opacity-50"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-8">
          <DocumentDuplicateIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">
            {searchQuery || categoryFilter !== 'all' 
              ? 'No templates match your search criteria'
              : 'No templates available'}
          </p>
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Template</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Template name..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Template description..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as SettingCategory | 'all' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {TEMPLATE_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Mark as favorite</span>
                </label>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTemplate}
                disabled={!formData.name.trim() || loading}
                className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsTemplateManager