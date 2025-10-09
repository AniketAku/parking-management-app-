/**
 * Optimized Vehicle Table - Performance-Enhanced with React.memo and Virtual Scrolling
 * Features: Memoization, virtual scrolling for large datasets, optimized sorting
 */

import React, { useState, useMemo, useCallback, memo, useRef } from 'react'
import { FixedSizeList as List, areEqual } from 'react-window'
import { Card, CardHeader, CardContent } from '../ui'
import { Badge, StatusBadge } from '../ui/badge'
import { useBusinessSettings } from '../../hooks/useSettings'
import { useRenderPerformance } from '../../hooks/usePerformance'
import {
  formatDateTime,
  formatCurrency,
  getVehicleTypeColor,
  calculateDuration,
  calculateParkingFee,
  getRevenueAmount
} from '../../utils/helpers'
import { isCurrentlyParked } from '../../utils/statusHelpers'
import type { ParkingEntry } from '../../types'

interface OptimizedVehicleTableProps {
  entries: ParkingEntry[]
  loading?: boolean
  onEntryClick?: (entry: ParkingEntry) => void
  onExportData?: () => void
  enableVirtualization?: boolean
  virtualRowHeight?: number
  maxHeight?: number
}

interface SortConfig {
  key: keyof ParkingEntry
  direction: 'asc' | 'desc'
}

// Memoized table header component
const MemoizedTableHeader = memo<{
  label: string
  sortKey: keyof ParkingEntry
  sortConfig: SortConfig | null
  onSort: (key: keyof ParkingEntry) => void
}>(({ label, sortKey, sortConfig, onSort }) => {
  useRenderPerformance(`TableHeader-${label}`)
  
  const isSorted = sortConfig?.key === sortKey
  
  const handleSort = useCallback(() => {
    onSort(sortKey)
  }, [onSort, sortKey])

  return (
    <th 
      onClick={handleSort}
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
})
MemoizedTableHeader.displayName = 'MemoizedTableHeader'

// Memoized loading skeleton
const MemoizedLoadingSkeleton = memo<{ rowCount?: number }>(({ rowCount = 5 }) => {
  useRenderPerformance('LoadingSkeleton')
  
  const skeletonRows = useMemo(() => 
    Array.from({ length: rowCount }, (_, i) => i), 
    [rowCount]
  )

  return (
    <>
      {skeletonRows.map((i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: 8 }, (_, j) => (
            <td key={j} className="px-6 py-4">
              <div className="h-4 bg-surface-muted rounded"></div>
            </td>
          ))}
        </tr>
      ))}
    </>
  )
})
MemoizedLoadingSkeleton.displayName = 'MemoizedLoadingSkeleton'

// Memoized empty state
const MemoizedEmptyState = memo<{ hasFilters: boolean }>(({ hasFilters }) => {
  useRenderPerformance('EmptyState')
  
  return (
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
})
MemoizedEmptyState.displayName = 'MemoizedEmptyState'

// Memoized table row component for virtual scrolling
interface VirtualizedRowProps {
  index: number
  style: React.CSSProperties
  data: {
    entries: ParkingEntry[]
    onEntryClick?: (entry: ParkingEntry) => void
    vehicleRates?: any
  }
}

const VirtualizedTableRow = memo<VirtualizedRowProps>(({ index, style, data }) => {
  useRenderPerformance(`VirtualRow-${index}`)
  
  const { entries, onEntryClick, vehicleRates } = data
  const entry = entries[index]

  const getStatusBadge = useMemo(() => (
    <StatusBadge status={entry.status} />
  ), [entry.status])

  const getPaymentBadge = useMemo(() => (
    <StatusBadge status={entry.paymentStatus} />
  ), [entry.paymentStatus])

  const getDuration = useMemo(() => {
    if (isCurrentlyParked(entry.status)) {
      return calculateDuration(entry.entryTime)
    }
    
    if (entry.exitTime) {
      return calculateDuration(entry.entryTime, entry.exitTime)
    }
    
    return 'N/A'
  }, [entry.status, entry.entryTime, entry.exitTime])

  const getAmountDisplay = useMemo(() => {
    // Use the revenue amount with correct priority: actualFee > calculatedFee > amountPaid
    const revenueAmount = getRevenueAmount(entry)
    if (revenueAmount > 0) {
      return formatCurrency(revenueAmount)
    }
    
    // For exited vehicles, calculate the fee dynamically
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
    
    // For currently parked vehicles, show current calculated fee
    if (isCurrentlyParked(entry.status)) {
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
      }
    }
    
    return 'N/A'
  }, [entry.actualFee, entry.calculatedFee, entry.amountPaid, entry.status, entry.exitTime, entry.vehicleType, entry.entryTime, vehicleRates])

  const handleRowClick = useCallback(() => {
    onEntryClick?.(entry)
  }, [onEntryClick, entry])

  return (
    <tr 
      style={style}
      onClick={handleRowClick}
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
          {getDuration}
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        {getStatusBadge}
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        {getPaymentBadge}
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
        {getAmountDisplay}
      </td>
    </tr>
  )
}, areEqual)
VirtualizedTableRow.displayName = 'VirtualizedTableRow'

export const OptimizedVehicleTable: React.FC<OptimizedVehicleTableProps> = memo(({
  entries,
  loading = false,
  onEntryClick,
  onExportData,
  enableVirtualization = true,
  virtualRowHeight = 80,
  maxHeight = 600
}) => {
  useRenderPerformance('OptimizedVehicleTable')
  
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)
  const listRef = useRef<List>(null)
  
  // Get vehicle rates from settings
  const { settings: businessSettings } = useBusinessSettings()
  const vehicleRates = useMemo(() => businessSettings?.vehicle_rates, [businessSettings])

  // Memoized sort handler
  const handleSort = useCallback((key: keyof ParkingEntry) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null
      }
      return { key, direction: 'asc' }
    })
  }, [])

  // Memoized sorted entries
  const sortedEntries = useMemo(() => {
    if (!sortConfig) return entries

    return [...entries].sort((a, b) => {
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
    })
  }, [entries, sortConfig])

  // Memoized virtual list data
  const virtualListData = useMemo(() => ({
    entries: sortedEntries,
    onEntryClick,
    vehicleRates
  }), [sortedEntries, onEntryClick, vehicleRates])

  // Memoized export handler
  const handleExport = useCallback(() => {
    onExportData?.()
  }, [onExportData])

  // Determine if we should use virtualization
  const shouldVirtualize = enableVirtualization && sortedEntries.length > 50

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
              onClick={handleExport}
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
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border-light">
            <thead className="bg-surface-light">
              <tr>
                <MemoizedTableHeader
                  label="Vehicle Number"
                  sortKey="vehicleNumber"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <MemoizedTableHeader
                  label="Transport"
                  sortKey="transportName"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <MemoizedTableHeader
                  label="Type"
                  sortKey="vehicleType"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <MemoizedTableHeader
                  label="Entry Time"
                  sortKey="entryTime"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Duration
                </th>
                <MemoizedTableHeader
                  label="Status"
                  sortKey="status"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
                <MemoizedTableHeader
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
                <MemoizedLoadingSkeleton rowCount={5} />
              ) : entries.length === 0 ? (
                <MemoizedEmptyState hasFilters={false} />
              ) : shouldVirtualize ? (
                <tr>
                  <td colSpan={8} className="p-0">
                    <List
                      ref={listRef}
                      height={Math.min(maxHeight, sortedEntries.length * virtualRowHeight)}
                      itemCount={sortedEntries.length}
                      itemSize={virtualRowHeight}
                      itemData={virtualListData}
                      width="100%"
                    >
                      {VirtualizedTableRow}
                    </List>
                  </td>
                </tr>
              ) : (
                sortedEntries.map((entry) => (
                  <VirtualizedTableRow
                    key={entry.id}
                    index={sortedEntries.indexOf(entry)}
                    style={{}}
                    data={virtualListData}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Performance info and pagination placeholder */}
        {entries.length > 0 && (
          <div className="px-6 py-3 border-t border-border-light bg-surface-light">
            <div className="flex items-center justify-between">
              <div className="text-sm text-text-muted">
                Showing {entries.length} results
                {shouldVirtualize && (
                  <span className="ml-2 text-success-600">
                    (Virtualized for performance)
                  </span>
                )}
              </div>
              <div className="text-sm text-text-muted">
                {sortConfig && (
                  <span>
                    Sorted by {sortConfig.key} ({sortConfig.direction === 'asc' ? 'ascending' : 'descending'})
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})
OptimizedVehicleTable.displayName = 'OptimizedVehicleTable'