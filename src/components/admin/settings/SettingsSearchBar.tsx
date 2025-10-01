/**
 * Settings Search Bar Component
 * Provides search, filtering, and navigation capabilities for settings
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
  TagIcon,
  ClockIcon,
  BookmarkIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import type { SettingCategory } from '../../../types/settings'

interface SettingsSearchBarProps {
  onSearch?: (query: string, filters: SearchFilters) => void
  onNavigate?: (category: SettingCategory, settingKey?: string) => void
  placeholder?: string
  className?: string
}

interface SearchFilters {
  categories: SettingCategory[]
  showSystemOnly: boolean
  showModifiedOnly: boolean
  showSensitiveOnly: boolean
}

interface SearchSuggestion {
  id: string
  title: string
  category: SettingCategory
  settingKey?: string
  description: string
  type: 'setting' | 'category' | 'feature'
  tags: string[]
}

const CATEGORY_LABELS: Record<SettingCategory, string> = {
  business: 'Business Settings',
  user_mgmt: 'User Management',
  ui_theme: 'UI & Theme',
  system: 'System Settings',
  validation: 'Validation Rules',
  localization: 'Localization',
  notifications: 'Notifications',
  reporting: 'Reports & Analytics',
  security: 'Security & Compliance',
  performance: 'Performance & Optimization',
  printing: 'Printing & Thermal Printers'
}

const SEARCH_SUGGESTIONS: SearchSuggestion[] = [
  // Business Settings
  {
    id: 'vehicle-rates',
    title: 'Vehicle Parking Rates',
    category: 'business',
    settingKey: 'vehicle_rates',
    description: 'Configure daily parking rates for different vehicle types',
    type: 'setting',
    tags: ['rates', 'pricing', 'vehicle', 'business']
  },
  {
    id: 'operating-hours',
    title: 'Operating Hours',
    category: 'business',
    settingKey: 'operating_hours',
    description: 'Set facility operating hours and timezone',
    type: 'setting',
    tags: ['hours', 'schedule', 'timezone', 'business']
  },
  
  // Security Settings
  {
    id: 'audit-logging',
    title: 'Audit Logging',
    category: 'security',
    settingKey: 'enable_audit_logging',
    description: 'Enable comprehensive audit logging',
    type: 'setting',
    tags: ['audit', 'logging', 'security', 'compliance']
  },
  {
    id: 'session-timeout',
    title: 'Session Timeout',
    category: 'security',
    settingKey: 'session_inactivity_timeout',
    description: 'Automatic session timeout duration',
    type: 'setting',
    tags: ['session', 'timeout', 'security', 'auth']
  },
  
  // Performance Settings
  {
    id: 'core-web-vitals',
    title: 'Core Web Vitals',
    category: 'performance',
    description: 'Configure performance budgets and monitoring',
    type: 'feature',
    tags: ['performance', 'vitals', 'optimization', 'metrics']
  },
  
  // Notification Settings
  {
    id: 'email-notifications',
    title: 'Email Notifications',
    category: 'notifications',
    settingKey: 'enable_email_notifications',
    description: 'Configure email notification preferences',
    type: 'setting',
    tags: ['email', 'notifications', 'alerts', 'communication']
  },
  
  // Printing Settings
  {
    id: 'thermal-printer',
    title: 'Thermal Printer Setup',
    category: 'printing',
    description: 'Configure thermal printer settings and connections',
    type: 'feature',
    tags: ['thermal', 'printer', 'tickets', 'hardware']
  },
  
  // User Management
  {
    id: 'user-roles',
    title: 'User Roles & Permissions',
    category: 'user_mgmt',
    description: 'Manage user roles and access permissions',
    type: 'feature',
    tags: ['roles', 'permissions', 'users', 'access']
  },
  
  // Categories
  {
    id: 'business-category',
    title: 'Business Settings',
    category: 'business',
    description: 'Parking rates, operating hours, payment methods',
    type: 'category',
    tags: ['business', 'rates', 'operations', 'payments']
  },
  {
    id: 'security-category',
    title: 'Security & Compliance',
    category: 'security',
    description: 'Authentication, audit logging, data protection',
    type: 'category',
    tags: ['security', 'compliance', 'audit', 'authentication']
  }
]

export function SettingsSearchBar({
  onSearch,
  onNavigate,
  placeholder = 'Search settings...',
  className = ''
}: SettingsSearchBarProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState<number>(-1)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [filters, setFilters] = useState<SearchFilters>({
    categories: [],
    showSystemOnly: false,
    showModifiedOnly: false,
    showSensitiveOnly: false
  })

  const searchInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filteredSuggestions = SEARCH_SUGGESTIONS.filter(suggestion => {
    if (!query.trim()) return true
    
    const searchTerms = query.toLowerCase().split(' ')
    const searchableText = [
      suggestion.title,
      suggestion.description,
      ...suggestion.tags,
      CATEGORY_LABELS[suggestion.category]
    ].join(' ').toLowerCase()
    
    return searchTerms.every(term => searchableText.includes(term))
  }).slice(0, 8)

  const handleSearch = useCallback((searchQuery: string) => {
    if (searchQuery.trim()) {
      setRecentSearches(prev => {
        const newSearches = [searchQuery, ...prev.filter(s => s !== searchQuery)].slice(0, 5)
        return newSearches
      })
      onSearch?.(searchQuery, filters)
    }
  }, [filters, onSearch])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setSelectedSuggestion(-1)
    setIsOpen(value.length > 0 || showFilters)
  }, [showFilters])

  const handleInputFocus = useCallback(() => {
    setIsOpen(true)
  }, [])

  const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
    if (suggestion.type === 'category') {
      onNavigate?.(suggestion.category)
    } else {
      onNavigate?.(suggestion.category, suggestion.settingKey)
    }
    setQuery(suggestion.title)
    setIsOpen(false)
    searchInputRef.current?.blur()
  }, [onNavigate])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedSuggestion(prev => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedSuggestion(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedSuggestion >= 0) {
        handleSuggestionClick(filteredSuggestions[selectedSuggestion])
      } else {
        handleSearch(query)
        setIsOpen(false)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      searchInputRef.current?.blur()
    }
  }, [filteredSuggestions, selectedSuggestion, handleSuggestionClick, handleSearch, query])

  const handleClearSearch = useCallback(() => {
    setQuery('')
    setIsOpen(false)
    searchInputRef.current?.focus()
  }, [])

  const toggleCategoryFilter = useCallback((category: SettingCategory) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }))
  }, [])

  const clearAllFilters = useCallback(() => {
    setFilters({
      categories: [],
      showSystemOnly: false,
      showModifiedOnly: false,
      showSensitiveOnly: false
    })
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const hasActiveFilters = filters.categories.length > 0 || 
    filters.showSystemOnly || filters.showModifiedOnly || filters.showSensitiveOnly

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="block w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
        <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
          {query && (
            <button
              onClick={handleClearSearch}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-md transition-colors ${
              hasActiveFilters || showFilters
                ? 'text-primary-600 bg-primary-50 hover:bg-primary-100'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FunnelIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 max-h-96 overflow-auto">
          {/* Filters Section */}
          {showFilters && (
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">Filters</h4>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    Clear all
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Categories</label>
                  <div className="flex flex-wrap gap-1">
                    {(Object.entries(CATEGORY_LABELS) as [SettingCategory, string][]).map(([category, label]) => (
                      <button
                        key={category}
                        onClick={() => toggleCategoryFilter(category)}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${
                          filters.categories.includes(category)
                            ? 'bg-primary-100 text-primary-700 border border-primary-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.showSystemOnly}
                      onChange={(e) => setFilters(prev => ({ ...prev, showSystemOnly: e.target.checked }))}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-gray-700">System settings only</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.showModifiedOnly}
                      onChange={(e) => setFilters(prev => ({ ...prev, showModifiedOnly: e.target.checked }))}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-gray-700">Modified only</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div className="p-3">
              <h4 className="text-xs font-medium text-gray-700 mb-2 flex items-center">
                <ClockIcon className="h-3 w-3 mr-1" />
                Recent Searches
              </h4>
              <div className="space-y-1">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setQuery(search)
                      handleSearch(search)
                      setIsOpen(false)
                    }}
                    className="block w-full text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 rounded"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {filteredSuggestions.length > 0 && (
            <div className="py-2">
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                    selectedSuggestion === index ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`p-1 rounded ${
                        suggestion.type === 'category' ? 'bg-blue-100' :
                        suggestion.type === 'feature' ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        {suggestion.type === 'category' ? (
                          <TagIcon className="h-3 w-3 text-blue-600" />
                        ) : suggestion.type === 'feature' ? (
                          <BookmarkIcon className="h-3 w-3 text-green-600" />
                        ) : (
                          <MagnifyingGlassIcon className="h-3 w-3 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">
                          {suggestion.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {CATEGORY_LABELS[suggestion.category]} • {suggestion.description}
                        </div>
                        {suggestion.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {suggestion.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {query && filteredSuggestions.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500">
              No settings found for "{query}"
              <div className="mt-2">
                <button
                  onClick={() => handleSearch(query)}
                  className="text-primary-600 hover:text-primary-700"
                >
                  Search anyway
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SettingsSearchBar