/**
 * Settings Templates Hook
 * Provides comprehensive template management functionality
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import type { 
  SettingTemplate, 
  AllSettings, 
  SettingCategory,
  SettingValidationResult 
} from '../types/settings'

interface UseSettingsTemplatesOptions {
  enableAutoSave?: boolean
  enableValidation?: boolean
  cacheTemplates?: boolean
}

interface UseSettingsTemplatesReturn {
  // Template management
  templates: SettingTemplate[]
  loading: boolean
  error: string | null
  
  // CRUD operations
  createTemplate: (name: string, description: string, settings: Partial<AllSettings>, options?: CreateTemplateOptions) => Promise<SettingTemplate>
  updateTemplate: (id: string, updates: Partial<SettingTemplate>) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>
  duplicateTemplate: (id: string, newName?: string) => Promise<SettingTemplate>
  
  // Template application
  applyTemplate: (templateId: string) => Promise<Partial<AllSettings>>
  previewTemplate: (templateId: string) => SettingTemplate | null
  validateTemplate: (templateId: string) => Promise<SettingValidationResult>
  
  // Import/Export
  exportTemplate: (templateId: string) => Promise<string>
  importTemplate: (templateData: string | SettingTemplate) => Promise<SettingTemplate>
  exportAllTemplates: () => Promise<string>
  
  // Filtering and search
  searchTemplates: (query: string) => SettingTemplate[]
  filterByCategory: (category: SettingCategory | 'all') => SettingTemplate[]
  filterByBusinessType: (businessType: string) => SettingTemplate[]
  
  // State management
  selectedTemplate: SettingTemplate | null
  setSelectedTemplate: (template: SettingTemplate | null) => void
  favorites: string[]
  toggleFavorite: (templateId: string) => void
  
  // Utilities
  getTemplateById: (id: string) => SettingTemplate | null
  getSystemTemplates: () => SettingTemplate[]
  getUserTemplates: () => SettingTemplate[]
  refreshTemplates: () => Promise<void>
}

interface CreateTemplateOptions {
  category?: SettingCategory
  businessTypes?: string[]
  isDefault?: boolean
  version?: number
}

// Mock API functions (replace with actual API calls)
const mockApi = {
  async fetchTemplates(): Promise<SettingTemplate[]> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const stored = localStorage.getItem('settings_templates')
    if (stored) {
      return JSON.parse(stored)
    }
    
    // Return default templates
    return [
      {
        id: 'small-business',
        name: 'Small Business Setup',
        description: 'Optimized settings for small parking lots (10-50 spaces)',
        category: 'business',
        template_data: {
          business: {
            vehicle_rates: { 'Trailer': 150, '6 Wheeler': 100, '4 Wheeler': 75, '2 Wheeler': 25 },
            operating_hours: { start: '06:00', end: '20:00', timezone: 'Asia/Kolkata' },
            payment_methods: ['Cash', 'UPI', 'Credit Card'],
            vehicle_types: ['Trailer', '6 Wheeler', '4 Wheeler', '2 Wheeler'],
            entry_status_options: ['Parked', 'Exited'],
            payment_status_options: ['Paid', 'Unpaid']
          },
          security: {
            enable_audit_logging: false,
            session_inactivity_timeout: 60,
            max_login_attempts: 5,
            login_lockout_duration: 15
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
            operating_hours: { start: '00:00', end: '23:59', timezone: 'Asia/Kolkata' },
            payment_methods: ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Online'],
            vehicle_types: ['Trailer', '6 Wheeler', '4 Wheeler', '2 Wheeler', 'Bus'],
            entry_status_options: ['Parked', 'Exited', 'Overstay', 'Reserved'],
            payment_status_options: ['Paid', 'Unpaid', 'Pending', 'Refunded']
          },
          security: {
            enable_audit_logging: true,
            session_inactivity_timeout: 30,
            max_login_attempts: 3,
            login_lockout_duration: 30
          },
          performance: {
            lcp_budget_ms: 2000,
            fid_budget_ms: 75,
            cls_budget: 0.08,
            fcp_budget_ms: 1500,
            ttfb_budget_ms: 600,
            bundle_size_budget_kb: 300,
            memory_usage_budget_mb: 75,
            accessibility_score_min: 95
          }
        },
        is_default: false,
        is_system_template: true,
        applicable_business_types: ['Large Commercial Facility', 'Shopping Mall', 'Airport Parking'],
        created_at: '2024-01-01T00:00:00Z',
        version: 1
      }
    ]
  },

  async saveTemplate(template: SettingTemplate): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200))
    
    const stored = localStorage.getItem('settings_templates')
    const templates = stored ? JSON.parse(stored) : []
    
    const existingIndex = templates.findIndex((t: SettingTemplate) => t.id === template.id)
    if (existingIndex >= 0) {
      templates[existingIndex] = template
    } else {
      templates.push(template)
    }
    
    localStorage.setItem('settings_templates', JSON.stringify(templates))
  },

  async deleteTemplate(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200))
    
    const stored = localStorage.getItem('settings_templates')
    if (stored) {
      const templates = JSON.parse(stored)
      const filtered = templates.filter((t: SettingTemplate) => t.id !== id)
      localStorage.setItem('settings_templates', JSON.stringify(filtered))
    }
  },

  async validateTemplate(template: SettingTemplate): Promise<SettingValidationResult> {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const errors: string[] = []
    const warnings: string[] = []
    
    // Basic validation
    if (!template.name.trim()) {
      errors.push('Template name is required')
    }
    
    if (!template.template_data || Object.keys(template.template_data).length === 0) {
      errors.push('Template must contain settings data')
    }
    
    // Business logic validation
    if (template.template_data.business) {
      const business = template.template_data.business as any
      if (business.vehicle_rates) {
        Object.entries(business.vehicle_rates).forEach(([type, rate]) => {
          if (typeof rate !== 'number' || rate < 0) {
            errors.push(`Invalid rate for ${type}: ${rate}`)
          }
          if (rate > 1000) {
            warnings.push(`High rate for ${type}: ₹${rate}`)
          }
        })
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
}

export function useSettingsTemplates(options: UseSettingsTemplatesOptions = {}): UseSettingsTemplatesReturn {
  const {
    enableAutoSave = true,
    enableValidation = true,
    cacheTemplates = true
  } = options

  const [templates, setTemplates] = useState<SettingTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<SettingTemplate | null>(null)
  const [favorites, setFavorites] = useState<string[]>([])

  // Load templates on mount
  useEffect(() => {
    refreshTemplates()
  }, [])

  // Load favorites from localStorage
  useEffect(() => {
    const storedFavorites = localStorage.getItem('settings_template_favorites')
    if (storedFavorites) {
      setFavorites(JSON.parse(storedFavorites))
    }
  }, [])

  const refreshTemplates = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const loadedTemplates = await mockApi.fetchTemplates()
      setTemplates(loadedTemplates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }, [])

  const createTemplate = useCallback(async (
    name: string,
    description: string,
    settings: Partial<AllSettings>,
    options: CreateTemplateOptions = {}
  ): Promise<SettingTemplate> => {
    const template: SettingTemplate = {
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      description: description.trim(),
      category: options.category,
      template_data: settings,
      is_default: options.isDefault || false,
      is_system_template: false,
      applicable_business_types: options.businessTypes,
      created_at: new Date().toISOString(),
      version: options.version || 1
    }

    if (enableValidation) {
      const validation = await mockApi.validateTemplate(template)
      if (!validation.isValid) {
        throw new Error(`Template validation failed: ${validation.errors.join(', ')}`)
      }
    }

    await mockApi.saveTemplate(template)
    setTemplates(prev => [...prev, template])
    return template
  }, [enableValidation])

  const updateTemplate = useCallback(async (id: string, updates: Partial<SettingTemplate>) => {
    const template = templates.find(t => t.id === id)
    if (!template) {
      throw new Error(`Template not found: ${id}`)
    }

    const updatedTemplate = { 
      ...template, 
      ...updates,
      version: (template.version || 1) + 1
    }

    if (enableValidation) {
      const validation = await mockApi.validateTemplate(updatedTemplate)
      if (!validation.isValid) {
        throw new Error(`Template validation failed: ${validation.errors.join(', ')}`)
      }
    }

    await mockApi.saveTemplate(updatedTemplate)
    setTemplates(prev => prev.map(t => t.id === id ? updatedTemplate : t))
  }, [templates, enableValidation])

  const deleteTemplate = useCallback(async (id: string) => {
    const template = templates.find(t => t.id === id)
    if (!template) {
      throw new Error(`Template not found: ${id}`)
    }

    if (template.is_system_template) {
      throw new Error('Cannot delete system templates')
    }

    await mockApi.deleteTemplate(id)
    setTemplates(prev => prev.filter(t => t.id !== id))
    
    if (selectedTemplate?.id === id) {
      setSelectedTemplate(null)
    }
  }, [templates, selectedTemplate])

  const duplicateTemplate = useCallback(async (id: string, newName?: string): Promise<SettingTemplate> => {
    const template = templates.find(t => t.id === id)
    if (!template) {
      throw new Error(`Template not found: ${id}`)
    }

    const duplicated: SettingTemplate = {
      ...template,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newName || `${template.name} (Copy)`,
      is_system_template: false,
      created_at: new Date().toISOString(),
      version: 1
    }

    await mockApi.saveTemplate(duplicated)
    setTemplates(prev => [...prev, duplicated])
    return duplicated
  }, [templates])

  const applyTemplate = useCallback(async (templateId: string): Promise<Partial<AllSettings>> => {
    const template = templates.find(t => t.id === templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    if (enableValidation) {
      const validation = await mockApi.validateTemplate(template)
      if (!validation.isValid) {
        throw new Error(`Template validation failed: ${validation.errors.join(', ')}`)
      }
    }

    return template.template_data as Partial<AllSettings>
  }, [templates, enableValidation])

  const previewTemplate = useCallback((templateId: string): SettingTemplate | null => {
    return templates.find(t => t.id === templateId) || null
  }, [templates])

  const validateTemplate = useCallback(async (templateId: string): Promise<SettingValidationResult> => {
    const template = templates.find(t => t.id === templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    return await mockApi.validateTemplate(template)
  }, [templates])

  const exportTemplate = useCallback(async (templateId: string): Promise<string> => {
    const template = templates.find(t => t.id === templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    return JSON.stringify(template, null, 2)
  }, [templates])

  const importTemplate = useCallback(async (templateData: string | SettingTemplate): Promise<SettingTemplate> => {
    let template: SettingTemplate

    if (typeof templateData === 'string') {
      try {
        template = JSON.parse(templateData)
      } catch (err) {
        throw new Error('Invalid JSON format')
      }
    } else {
      template = templateData
    }

    // Generate new ID and mark as user template
    template.id = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    template.is_system_template = false
    template.created_at = new Date().toISOString()

    if (enableValidation) {
      const validation = await mockApi.validateTemplate(template)
      if (!validation.isValid) {
        throw new Error(`Template validation failed: ${validation.errors.join(', ')}`)
      }
    }

    await mockApi.saveTemplate(template)
    setTemplates(prev => [...prev, template])
    return template
  }, [enableValidation])

  const exportAllTemplates = useCallback(async (): Promise<string> => {
    const exportData = {
      templates,
      exported_at: new Date().toISOString(),
      version: '1.0'
    }
    return JSON.stringify(exportData, null, 2)
  }, [templates])

  const searchTemplates = useCallback((query: string): SettingTemplate[] => {
    if (!query.trim()) return templates

    const searchTerm = query.toLowerCase()
    return templates.filter(template => 
      template.name.toLowerCase().includes(searchTerm) ||
      template.description?.toLowerCase().includes(searchTerm) ||
      template.applicable_business_types?.some(type => 
        type.toLowerCase().includes(searchTerm)
      )
    )
  }, [templates])

  const filterByCategory = useCallback((category: SettingCategory | 'all'): SettingTemplate[] => {
    if (category === 'all') return templates
    return templates.filter(template => template.category === category)
  }, [templates])

  const filterByBusinessType = useCallback((businessType: string): SettingTemplate[] => {
    return templates.filter(template => 
      template.applicable_business_types?.includes(businessType)
    )
  }, [templates])

  const toggleFavorite = useCallback((templateId: string) => {
    const newFavorites = favorites.includes(templateId)
      ? favorites.filter(id => id !== templateId)
      : [...favorites, templateId]
    
    setFavorites(newFavorites)
    localStorage.setItem('settings_template_favorites', JSON.stringify(newFavorites))
  }, [favorites])

  const getTemplateById = useCallback((id: string): SettingTemplate | null => {
    return templates.find(t => t.id === id) || null
  }, [templates])

  const systemTemplates = useMemo(() => 
    templates.filter(t => t.is_system_template), [templates]
  )

  const userTemplates = useMemo(() => 
    templates.filter(t => !t.is_system_template), [templates]
  )

  return {
    // Template management
    templates,
    loading,
    error,
    
    // CRUD operations
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    
    // Template application
    applyTemplate,
    previewTemplate,
    validateTemplate,
    
    // Import/Export
    exportTemplate,
    importTemplate,
    exportAllTemplates,
    
    // Filtering and search
    searchTemplates,
    filterByCategory,
    filterByBusinessType,
    
    // State management
    selectedTemplate,
    setSelectedTemplate,
    favorites,
    toggleFavorite,
    
    // Utilities
    getTemplateById,
    getSystemTemplates: () => systemTemplates,
    getUserTemplates: () => userTemplates,
    refreshTemplates
  }
}