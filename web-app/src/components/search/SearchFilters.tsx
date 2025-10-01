import React, { useState } from 'react'
import { Card, CardHeader, CardContent } from '../ui'
import { Input, Select } from '../ui'
import type { SearchFilters as SearchFiltersType } from '../../types'

interface SearchFiltersProps {
  filters: SearchFiltersType
  onFiltersChange: (filters: SearchFiltersType) => void
  onReset: () => void
  resultsCount?: number
  loading?: boolean
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
  resultsCount = 0,
  loading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleInputChange = (field: keyof SearchFiltersType) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    onFiltersChange({
      ...filters,
      [field]: e.target.value || undefined
    })
  }

  const handleSelectChange = (field: keyof SearchFiltersType) => (
    value: string
  ) => {
    onFiltersChange({
      ...filters,
      [field]: value || undefined
    })
  }

  const handleDateChange = (field: 'dateFrom' | 'dateTo') => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const dateValue = e.target.value ? new Date(e.target.value) : undefined
    onFiltersChange({
      ...filters,
      [field]: dateValue
    })
  }

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value !== undefined && value !== '').length
  }

  const formatDateForInput = (date?: Date) => {
    return date ? date.toISOString().split('T')[0] : ''
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-text-primary">Search Filters</h3>
            {getActiveFiltersCount() > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                {getActiveFiltersCount()} active
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {resultsCount > 0 && (
              <span className="text-sm text-text-muted">
                {loading ? 'Searching...' : `${resultsCount} results`}
              </span>
            )}
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-text-muted hover:text-text-primary transition-colors"
            >
              <svg 
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Quick Search */}
        <div className="mb-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="Quick search by vehicle number, transport name, or driver..."
              value={filters.vehicleNumber || ''}
              onChange={handleInputChange('vehicleNumber')}
              className="w-full pl-10"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        {isExpanded && (
          <div className="space-y-4 border-t border-border-light pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Vehicle Number */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Vehicle Number
                </label>
                <Input
                  type="text"
                  placeholder="e.g., KA05MN1234"
                  value={filters.vehicleNumber || ''}
                  onChange={handleInputChange('vehicleNumber')}
                />
              </div>

              {/* Transport Name */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Transport Company
                </label>
                <Input
                  type="text"
                  placeholder="e.g., ABC Transport"
                  value={filters.transportName || ''}
                  onChange={handleInputChange('transportName')}
                />
              </div>

              {/* Vehicle Type */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Vehicle Type
                </label>
                <Select
                  value={filters.vehicleType || ''}
                  onChange={handleSelectChange('vehicleType')}
                  options={[
                    { value: '', label: 'All Types' },
                    { value: 'Trailer', label: 'Trailer' },
                    { value: '6 Wheeler', label: '6 Wheeler' },
                    { value: '4 Wheeler', label: '4 Wheeler' },
                    { value: '2 Wheeler', label: '2 Wheeler' }
                  ]}
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Status
                </label>
                <Select
                  value={filters.status || ''}
                  onChange={handleSelectChange('status')}
                  options={[
                    { value: '', label: 'All Status' },
                    { value: 'Parked', label: 'Currently Parked' },
                    { value: 'Exited', label: 'Exited' }
                  ]}
                />
              </div>

              {/* Payment Status */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Payment Status
                </label>
                <Select
                  value={filters.paymentStatus || ''}
                  onChange={handleSelectChange('paymentStatus')}
                  options={[
                    { value: '', label: 'All Payment Status' },
                    { value: 'Paid', label: 'Paid' },
                    { value: 'Unpaid', label: 'Unpaid' },
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Refunded', label: 'Refunded' }
                  ]}
                />
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Date From
                </label>
                <input
                  type="date"
                  value={formatDateForInput(filters.dateFrom)}
                  onChange={handleDateChange('dateFrom')}
                  className="w-full px-3 py-2 border border-border-light rounded-lg focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Date To
                </label>
                <input
                  type="date"
                  value={formatDateForInput(filters.dateTo)}
                  onChange={handleDateChange('dateTo')}
                  className="w-full px-3 py-2 border border-border-light rounded-lg focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border-light">
              <div className="text-sm text-text-muted">
                {getActiveFiltersCount() > 0 ? (
                  `${getActiveFiltersCount()} filter${getActiveFiltersCount() > 1 ? 's' : ''} applied`
                ) : (
                  'No filters applied'
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={onReset}
                  disabled={getActiveFiltersCount() === 0}
                  className="px-4 py-2 text-sm border border-border-light rounded-lg hover:bg-surface-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear All
                </button>
                
                <button
                  onClick={() => setIsExpanded(false)}
                  className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}