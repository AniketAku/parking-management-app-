import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchFilters, VehicleTable, VehicleDetailsModal, EditEntryModal } from '../components/search'
import { useSearch } from '../hooks/useSearch'
import { useParkingData } from '../hooks/useParkingData'
import { useParkingStore } from '../stores/parkingStore'
import { useUserRole } from '../hooks/useUserRole'  // 🛡️ SECURITY: Role-based permissions
import { toast } from 'react-hot-toast'
import { log } from '../utils/secureLogger'
import type { ParkingEntry } from '../types'

export const SearchPage: React.FC = () => {
  const navigate = useNavigate()
  const [selectedEntry, setSelectedEntry] = useState<ParkingEntry | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // 🛡️ SECURITY: Get user role and permissions
  const { permissions } = useUserRole()

  // Load real parking data from database
  const { entries, loading: dataLoading, error } = useParkingData()

  // Get store methods for immediate UI updates
  const { handleEntryUpdate } = useParkingStore()

  const {
    filters,
    setFilters,
    resetFilters,
    searchResults,
    loading,
    resultCount,
    exportData,
    hasActiveFilters
  } = useSearch(entries)

  const handleEntryClick = (entry: ParkingEntry) => {
    setSelectedEntry(entry)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedEntry(null)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedEntry(null)
  }

  const handleProcessExit = (entry: ParkingEntry) => {
    toast.success(`Processing exit for ${entry.vehicleNumber}`)
    navigate('/exit')
    handleCloseModal()
  }

  const handleEditEntry = (entry: ParkingEntry) => {
    setIsModalOpen(false)  // Close details modal
    setIsEditModalOpen(true)  // Open edit modal
    // Keep selectedEntry for the edit modal
  }

  const handleEditSuccess = (updatedEntry: ParkingEntry) => {
    toast.success(`Successfully updated ${updatedEntry.vehicleNumber}`)

    // Immediately update the store for instant UI synchronization
    handleEntryUpdate(updatedEntry)

    // Log for debugging
    log.debug('Entry updated via EditEntryModal - Store updated immediately', updatedEntry)

    // Close edit modal
    handleCloseEditModal()
  }

  const handleExportData = () => {
    if (resultCount === 0) {
      toast.error('No data to export')
      return
    }

    toast.promise(
      // Simulate export delay
      new Promise((resolve) => setTimeout(() => {
        exportData()
        resolve(true)
      }, 1000)),
      {
        loading: 'Preparing export...',
        success: `Exported ${resultCount} records successfully!`,
        error: 'Export failed. Please try again.',
      }
    )
  }

  return (
    <div className="space-y-6">
      {/* Fixed Page Header */}
      <div className="sticky-stats">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">
              Search & Records
            </h1>
            <p className="text-text-muted mt-1">
              Find and manage vehicle parking records with advanced filtering
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right text-sm">
              <div className="font-medium text-text-primary">
                {resultCount} records
              </div>
              <div className="text-text-muted">
                {hasActiveFilters ? 'filtered' : 'total'}
              </div>
            </div>
            
            {resultCount > 0 && (
              <button
                onClick={handleExportData}
                className="flex items-center space-x-2 px-4 py-2 bg-success-500 text-white rounded-lg hover:bg-success-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Export</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Search Filters - Always visible */}
        <div className="mt-6">
          <SearchFilters
            filters={filters}
            onFiltersChange={setFilters}
            onReset={resetFilters}
            resultsCount={resultCount}
            loading={loading || dataLoading}
          />
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-error-50 border border-error-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-error-700 font-medium">
                Failed to load parking data: {error}
              </span>
            </div>
          </div>
        )}

        {/* Results Table - Scrollable */}
        <VehicleTable
          entries={searchResults}
          loading={loading || dataLoading}
          onEntryClick={handleEntryClick}
          onExportData={handleExportData}
        />
      </div>

      {/* Vehicle Details Modal */}
      <VehicleDetailsModal
        entry={selectedEntry}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onProcessExit={handleProcessExit}
        onEdit={handleEditEntry}
      />

      {/* Edit Entry Modal */}
      <EditEntryModal
        entry={selectedEntry}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSuccess={handleEditSuccess}
        canEditEntryDates={permissions.canEditEntryDates}  // 🛡️ ADMIN-ONLY permission
      />
    </div>
  )
}