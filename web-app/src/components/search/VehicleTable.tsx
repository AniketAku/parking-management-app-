import React, { useState } from 'react'
import { Card, CardHeader, CardContent } from '../ui'
import { Badge, StatusBadge } from '../ui/Badge'
import { useBusinessSettings } from '../../hooks/useSettings'
import {
  formatDateTime,
  formatCurrency,
  getVehicleTypeColor,
  calculateDuration,
  calculateParkingFee,
  getRevenueAmount,
  getRevenueSource
} from '../../utils/helpers'
import { isCurrentlyParked } from '../../utils/statusHelpers'
import type { ParkingEntry } from '../../types'

interface VehicleTableProps {
  entries: ParkingEntry[]
  loading?: boolean
  onEntryClick?: (entry: ParkingEntry) => void
  onExportData?: () => void
}

interface PaginationConfig {
  currentPage: number
  itemsPerPage: number
  totalItems: number
  totalPages: number
}

interface SortConfig {
  key: keyof ParkingEntry
  direction: 'asc' | 'desc'
}

const TableHeader: React.FC<{
  label: string
  sortKey: keyof ParkingEntry
  sortConfig: SortConfig | null
  onSort: (key: keyof ParkingEntry) => void
}> = ({ label, sortKey, sortConfig, onSort }) => {
  const isSorted = sortConfig?.key === sortKey
  
  return (
    <th 
      onClick={() => onSort(sortKey)}
      className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-light transition-colors"
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        <svg 
          className={`w-3 h-3 transition-transform ${
            isSorted 
              ? (sortConfig.direction === 'asc' ? 'rotate-0' : 'rotate-180')
              : 'opacity-50'
          }`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10l5 5 5-5z" />
        </svg>
      </div>
    </th>
  )
}

const LoadingSkeleton: React.FC = () => (
  <>
    {[...Array(5)].map((_, i) => (
      <tr key={i} className="animate-pulse">
        {[...Array(8)].map((_, j) => (
          <td key={j} className="px-6 py-4">
            <div className="h-4 bg-surface-muted rounded"></div>
          </td>
        ))}
      </tr>
    ))}
  </>
)

const EmptyState: React.FC<{ hasFilters: boolean }> = ({ hasFilters }) => (
  <tr>
    <td colSpan={8} className="px-6 py-12 text-center">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-12 h-12 bg-surface-muted rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-medium text-text-primary">
            {hasFilters ? 'No matching records found' : 'No vehicle records yet'}
          </h3>
          <p className="text-text-muted mt-1">
            {hasFilters 
              ? 'Try adjusting your search filters to find what you\'re looking for.'
              : 'Vehicle records will appear here once you start registering vehicles.'
            }
          </p>
        </div>
      </div>
    </td>
  </tr>
)

export const VehicleTable: React.FC<VehicleTableProps> = ({
  entries,
  loading = false,
  onEntryClick,
  onExportData
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  
  // Get vehicle rates from settings
  const { settings: businessSettings } = useBusinessSettings()
  const vehicleRates = businessSettings?.vehicle_rates

  const handleSort = (key: keyof ParkingEntry) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null
      }
      return { key, direction: 'asc' }
    })
  }

  const sortedEntries = React.useMemo(() => {
    return [...entries].sort((a, b) => {
      // If there's a specific sort config, use it
      if (sortConfig) {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]
        
        if (aValue instanceof Date && bValue instanceof Date) {
          return sortConfig.direction === 'asc' 
            ? aValue.getTime() - bValue.getTime()
            : bValue.getTime() - aValue.getTime()
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue)
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
        }
        
        return 0
      }
      
      // Default sorting: unpaid first, then by entry time (newest first)
      // First priority: Unpaid status
      if (a.paymentStatus === 'Unpaid' && b.paymentStatus !== 'Unpaid') return -1
      if (a.paymentStatus !== 'Unpaid' && b.paymentStatus === 'Unpaid') return 1
      
      // Second priority: Entry time (newest first)
      return new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime()
    })
  }, [entries, sortConfig])

  // Pagination calculations
  const totalPages = Math.ceil(sortedEntries.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedEntries = sortedEntries.slice(startIndex, endIndex)

  // Reset to first page when entries change or items per page changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [entries.length, itemsPerPage])

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset to first page
  }

  const getStatusBadge = (entry: ParkingEntry) => {
    return <StatusBadge status={entry.status} />
  }

  const getPaymentBadge = (paymentStatus: ParkingEntry['paymentStatus']) => {
    return <StatusBadge status={paymentStatus} />
  }

  const getDuration = (entry: ParkingEntry) => {
    if (isCurrentlyParked(entry.status)) {
      return calculateDuration(entry.entryTime)
    }
    
    if (entry.exitTime) {
      return calculateDuration(entry.entryTime, entry.exitTime)
    }
    
    return 'N/A'
  }

  const getAmountDisplay = (entry: ParkingEntry) => {
    // For parked vehicles, always calculate dynamically since fee increases with time
    // For exited vehicles, use stored revenue amount (manual override or system calculation)
    if (isCurrentlyParked(entry.status)) {
      // Only use manual override (actualFee) if explicitly set, otherwise calculate dynamically
      if (entry.actualFee !== null && entry.actualFee !== undefined) {
        return formatCurrency(entry.actualFee)
      }
      
      // Calculate current parking fee dynamically
      try {
        const currentFee = calculateParkingFee(
          entry.vehicleType,
          entry.entryTime,
          undefined,
          vehicleRates
        )
        return formatCurrency(currentFee)
      } catch (error) {
        console.warn('Error calculating current parking fee:', error)
        return formatCurrency(entry.calculatedFee || 0)
      }
    }
    
    // For exited vehicles, use the revenue amount with priority: actualFee > calculatedFee > amountPaid
    const revenueAmount = getRevenueAmount(entry)
    if (revenueAmount > 0) {
      return formatCurrency(revenueAmount)
    }
    
    // For exited vehicles without stored revenue, calculate dynamically
    if (entry.status === 'Exited' && entry.exitTime) {
      try {
        const calculatedFee = calculateParkingFee(
          entry.vehicleType,
          entry.entryTime,
          entry.exitTime,
          vehicleRates
        )
        return formatCurrency(calculatedFee)
      } catch (error) {
        console.warn('Error calculating parking fee:', error)
      }
    }
    
    return 'N/A'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Vehicle Records</h3>
            <p className="text-sm text-text-muted mt-1">
              {loading ? 'Loading...' : `${entries.length} record${entries.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          
          {entries.length > 0 && onExportData && (
            <button
              onClick={onExportData}
              className="flex items-center space-x-2 px-4 py-2 text-sm bg-success-500 text-white rounded-lg hover:bg-success-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export Data</span>
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="min-w-full divide-y divide-border-light">
            <thead className="sticky-table-header">
              <tr>
                <TableHeader
                  label="Vehicle Number"
                  sortKey="vehicleNumber"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <TableHeader
                  label="Transport"
                  sortKey="transportName"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <TableHeader
                  label="Type"
                  sortKey="vehicleType"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <TableHeader
                  label="Entry Time"
                  sortKey="entryTime"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Duration
                </th>
                <TableHeader
                  label="Status"
                  sortKey="status"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <TableHeader
                  label="Payment"
                  sortKey="paymentStatus"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            
            <tbody className="bg-white divide-y divide-border-light">
              {loading ? (
                <LoadingSkeleton />
              ) : entries.length === 0 ? (
                <EmptyState hasFilters={false} />
              ) : (
                paginatedEntries.map((entry) => (
                  <tr 
                    key={entry.id}
                    onClick={() => onEntryClick?.(entry)}
                    className={`hover:bg-surface-light transition-colors ${
                      onEntryClick ? 'cursor-pointer' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-text-primary">
                        {entry.vehicleNumber}
                      </div>
                      <div className="text-sm text-text-muted">
                        {entry.driverName}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text-primary">
                        {entry.transportName}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        variant="secondary" 
                        className={getVehicleTypeColor(entry.vehicleType)}
                      >
                        {entry.vehicleType}
                      </Badge>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text-primary">
                        {formatDateTime(entry.entryTime)}
                      </div>
                      {entry.exitTime && (
                        <div className="text-xs text-text-muted">
                          Exit: {formatDateTime(entry.exitTime)}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text-primary">
                        {getDuration(entry)}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(entry)}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPaymentBadge(entry.paymentStatus)}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                      {getAmountDisplay(entry)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {entries.length > 0 && (
          <div className="px-6 py-4 border-t border-border-light bg-surface-light">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
              {/* Results info and items per page picker */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="text-sm text-text-muted">
                  Showing {startIndex + 1}-{Math.min(endIndex, entries.length)} of {entries.length} results
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-text-muted">Show:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                    className="form-select !py-2 !px-3 text-sm min-w-[80px] w-auto"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-text-muted">per page</span>
                </div>
              </div>

              {/* Navigation controls */}
              {totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  {/* Previous button */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-border-light rounded-md hover:bg-surface-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>

                  {/* Page numbers */}
                  <div className="flex items-center space-x-1">
                    {/* First page */}
                    {currentPage > 3 && (
                      <>
                        <button
                          onClick={() => handlePageChange(1)}
                          className="px-3 py-1 text-sm border border-border-light rounded-md hover:bg-surface-light transition-colors"
                        >
                          1
                        </button>
                        {currentPage > 4 && (
                          <span className="px-2 text-sm text-text-muted">...</span>
                        )}
                      </>
                    )}

                    {/* Current page range */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                      if (pageNum > totalPages) return null
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 text-sm border rounded-md transition-colors ${
                            pageNum === currentPage
                              ? 'bg-primary-500 text-white border-primary-500'
                              : 'border-border-light hover:bg-surface-light'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    }).filter(Boolean)}

                    {/* Last page */}
                    {currentPage < totalPages - 2 && (
                      <>
                        {currentPage < totalPages - 3 && (
                          <span className="px-2 text-sm text-text-muted">...</span>
                        )}
                        <button
                          onClick={() => handlePageChange(totalPages)}
                          className="px-3 py-1 text-sm border border-border-light rounded-md hover:bg-surface-light transition-colors"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Next button */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-border-light rounded-md hover:bg-surface-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}

              {/* Sort info */}
              {sortConfig && (
                <div className="text-xs text-text-muted">
                  Sorted by {sortConfig.key} ({sortConfig.direction === 'asc' ? 'ascending' : 'descending'})
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}