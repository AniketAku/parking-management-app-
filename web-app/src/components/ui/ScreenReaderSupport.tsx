// Screen Reader Support Components
// Optimized components for screen reader accessibility and semantic markup

import React, { useEffect, useRef, useState } from 'react'
import { screenReader } from '../../utils/accessibility'
import { useLiveRegion, useScreenReader } from '../../hooks/useAccessibility'

interface VisuallyHiddenProps {
  children: React.ReactNode
  focusable?: boolean
}

export const VisuallyHidden: React.FC<VisuallyHiddenProps> = ({ 
  children, 
  focusable = false 
}) => {
  return (
    <span 
      className={focusable ? 'sr-only focus:not-sr-only' : 'sr-only'}
    >
      {children}
    </span>
  )
}

interface LiveRegionProps {
  children: React.ReactNode
  type?: 'polite' | 'assertive' | 'off'
  atomic?: boolean
  relevant?: 'additions' | 'removals' | 'text' | 'all'
  className?: string
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
  children,
  type = 'polite',
  atomic = true,
  relevant = 'all',
  className = 'sr-only',
}) => {
  return (
    <div
      aria-live={type}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={className}
      role={type === 'assertive' ? 'alert' : 'status'}
    >
      {children}
    </div>
  )
}

interface StatusAnnouncerProps {
  message: string
  priority?: 'polite' | 'assertive'
  clear?: boolean
}

export const StatusAnnouncer: React.FC<StatusAnnouncerProps> = ({
  message,
  priority = 'polite',
  clear = true,
}) => {
  const [currentMessage, setCurrentMessage] = useState('')

  useEffect(() => {
    if (message) {
      setCurrentMessage(message)
      
      if (clear) {
        const timer = setTimeout(() => setCurrentMessage(''), 3000)
        return () => clearTimeout(timer)
      }
    }
  }, [message, clear])

  return (
    <LiveRegion type={priority}>
      {currentMessage}
    </LiveRegion>
  )
}

interface LoadingAnnouncerProps {
  loading: boolean
  loadingText?: string
  completedText?: string
  errorText?: string
  error?: string | null
}

export const LoadingAnnouncer: React.FC<LoadingAnnouncerProps> = ({
  loading,
  loadingText = 'Loading content, please wait',
  completedText = 'Content loaded successfully',
  errorText = 'Failed to load content',
  error,
}) => {
  const [announcement, setAnnouncement] = useState('')
  const prevLoadingRef = useRef(loading)

  useEffect(() => {
    const wasLoading = prevLoadingRef.current
    prevLoadingRef.current = loading

    if (loading && !wasLoading) {
      setAnnouncement(loadingText)
    } else if (!loading && wasLoading) {
      if (error) {
        setAnnouncement(`${errorText}: ${error}`)
      } else {
        setAnnouncement(completedText)
      }
    }
  }, [loading, error, loadingText, completedText, errorText])

  return (
    <StatusAnnouncer 
      message={announcement} 
      priority={error ? 'assertive' : 'polite'} 
    />
  )
}

interface ProgressAnnouncerProps {
  value: number
  max: number
  label?: string
  announceEvery?: number
}

export const ProgressAnnouncer: React.FC<ProgressAnnouncerProps> = ({
  value,
  max,
  label = 'Progress',
  announceEvery = 10,
}) => {
  const [lastAnnounced, setLastAnnounced] = useState(-1)
  const percentage = Math.round((value / max) * 100)
  
  useEffect(() => {
    const shouldAnnounce = 
      percentage === 0 ||
      percentage === 100 ||
      (percentage > 0 && percentage % announceEvery === 0 && percentage !== lastAnnounced)
    
    if (shouldAnnounce) {
      setLastAnnounced(percentage)
    }
  }, [percentage, announceEvery, lastAnnounced])

  const announcement = percentage === lastAnnounced 
    ? `${label} ${percentage}% complete`
    : ''

  return (
    <StatusAnnouncer message={announcement} priority="polite" />
  )
}

interface FormValidationAnnouncerProps {
  errors: Record<string, string>
  touched: Record<string, boolean>
  fieldLabels: Record<string, string>
}

export const FormValidationAnnouncer: React.FC<FormValidationAnnouncerProps> = ({
  errors,
  touched,
  fieldLabels,
}) => {
  const [announcement, setAnnouncement] = useState('')
  const prevErrorsRef = useRef<Record<string, string>>({})

  useEffect(() => {
    const prevErrors = prevErrorsRef.current
    const newErrors: string[] = []
    const fixedErrors: string[] = []

    // Check for new errors
    Object.keys(errors).forEach(field => {
      if (touched[field] && errors[field] && !prevErrors[field]) {
        const fieldLabel = fieldLabels[field] || field
        newErrors.push(`${fieldLabel}: ${errors[field]}`)
      }
    })

    // Check for fixed errors
    Object.keys(prevErrors).forEach(field => {
      if (!errors[field] && prevErrors[field]) {
        const fieldLabel = fieldLabels[field] || field
        fixedErrors.push(`${fieldLabel} error resolved`)
      }
    })

    let message = ''
    if (newErrors.length > 0) {
      message = `Form errors: ${newErrors.join(', ')}`
    } else if (fixedErrors.length > 0) {
      message = fixedErrors.join(', ')
    }

    if (message) {
      setAnnouncement(message)
    }

    prevErrorsRef.current = { ...errors }
  }, [errors, touched, fieldLabels])

  return (
    <StatusAnnouncer 
      message={announcement} 
      priority="assertive" 
    />
  )
}

interface TableAnnouncerProps {
  caption: string
  rowCount: number
  columnCount: number
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  filterInfo?: string
}

export const TableAnnouncer: React.FC<TableAnnouncerProps> = ({
  caption,
  rowCount,
  columnCount,
  sortColumn,
  sortDirection,
  filterInfo,
}) => {
  const { announce } = useScreenReader()

  useEffect(() => {
    let message = `Table ${caption} with ${rowCount} rows and ${columnCount} columns`
    
    if (sortColumn && sortDirection) {
      message += `, sorted by ${sortColumn} ${sortDirection === 'asc' ? 'ascending' : 'descending'}`
    }
    
    if (filterInfo) {
      message += `, ${filterInfo}`
    }

    announce(message)
  }, [caption, rowCount, columnCount, sortColumn, sortDirection, filterInfo, announce])

  return null
}

interface DataTableProps {
  caption: string
  headers: Array<{
    key: string
    label: string
    sortable?: boolean
    width?: string
  }>
  rows: Array<Record<string, React.ReactNode>>
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (column: string) => void
  loading?: boolean
  emptyMessage?: string
}

export const AccessibleDataTable: React.FC<DataTableProps> = ({
  caption,
  headers,
  rows,
  sortColumn,
  sortDirection,
  onSort,
  loading = false,
  emptyMessage = 'No data available',
}) => {
  const tableId = React.useId()
  const captionId = `${tableId}-caption`

  return (
    <div className="overflow-x-auto">
      <table 
        className="w-full border-collapse"
        aria-labelledby={captionId}
        role="table"
      >
        <caption 
          id={captionId}
          className="sr-only"
        >
          {caption}
        </caption>
        
        <thead>
          <tr role="row">
            {headers.map((header) => (
              <th
                key={header.key}
                role="columnheader"
                scope="col"
                className={`border border-border-color bg-light-100 px-4 py-2 text-left font-medium ${
                  header.sortable ? 'cursor-pointer hover:bg-light-200' : ''
                }`}
                style={{ width: header.width }}
                tabIndex={header.sortable ? 0 : undefined}
                aria-sort={
                  sortColumn === header.key
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : header.sortable
                    ? 'none'
                    : undefined
                }
                onClick={header.sortable ? () => onSort?.(header.key) : undefined}
                onKeyDown={
                  header.sortable
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onSort?.(header.key)
                        }
                      }
                    : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <span>{header.label}</span>
                  {header.sortable && (
                    <span 
                      className="ml-2 text-xs"
                      aria-hidden="true"
                    >
                      {sortColumn === header.key
                        ? sortDirection === 'asc'
                          ? '↑'
                          : '↓'
                        : '↕'
                      }
                    </span>
                  )}
                </div>
                {header.sortable && (
                  <VisuallyHidden>
                    {sortColumn === header.key
                      ? `Sorted ${sortDirection === 'asc' ? 'ascending' : 'descending'}`
                      : 'Click to sort'
                    }
                  </VisuallyHidden>
                )}
              </th>
            ))}
          </tr>
        </thead>
        
        <tbody>
          {loading ? (
            <tr>
              <td 
                colSpan={headers.length}
                className="border border-border-color px-4 py-8 text-center"
              >
                <div className="flex items-center justify-center space-x-2">
                  <div className="loading-spinner" aria-hidden="true" />
                  <span>Loading data...</span>
                </div>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td 
                colSpan={headers.length}
                className="border border-border-color px-4 py-8 text-center text-text-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex} role="row">
                {headers.map((header, cellIndex) => (
                  <td
                    key={header.key}
                    role="gridcell"
                    className="border border-border-color px-4 py-2"
                    aria-describedby={cellIndex === 0 ? `${tableId}-row-${rowIndex}-description` : undefined}
                  >
                    {row[header.key]}
                    {cellIndex === 0 && (
                      <VisuallyHidden id={`${tableId}-row-${rowIndex}-description`}>
                        Row {rowIndex + 1} of {rows.length}
                      </VisuallyHidden>
                    )}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      
      <TableAnnouncer
        caption={caption}
        rowCount={rows.length}
        columnCount={headers.length}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        filterInfo={loading ? 'Loading data' : undefined}
      />
      
      <LoadingAnnouncer
        loading={loading}
        loadingText="Loading table data"
        completedText="Table data loaded"
      />
    </div>
  )
}

interface PaginationAnnouncerProps {
  currentPage: number
  totalPages: number
  totalItems?: number
  itemsPerPage?: number
}

export const PaginationAnnouncer: React.FC<PaginationAnnouncerProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
}) => {
  const [announcement, setAnnouncement] = useState('')
  const prevPageRef = useRef(currentPage)

  useEffect(() => {
    if (prevPageRef.current !== currentPage) {
      let message = `Page ${currentPage} of ${totalPages}`
      
      if (totalItems && itemsPerPage) {
        const startItem = (currentPage - 1) * itemsPerPage + 1
        const endItem = Math.min(currentPage * itemsPerPage, totalItems)
        message += `, showing items ${startItem} to ${endItem} of ${totalItems}`
      }
      
      setAnnouncement(message)
      prevPageRef.current = currentPage
    }
  }, [currentPage, totalPages, totalItems, itemsPerPage])

  return (
    <StatusAnnouncer message={announcement} priority="polite" />
  )
}

interface SearchResultsAnnouncerProps {
  query: string
  totalResults: number
  loading: boolean
  error?: string | null
}

export const SearchResultsAnnouncer: React.FC<SearchResultsAnnouncerProps> = ({
  query,
  totalResults,
  loading,
  error,
}) => {
  const [announcement, setAnnouncement] = useState('')
  const prevQueryRef = useRef('')
  const prevLoadingRef = useRef(loading)

  useEffect(() => {
    const queryChanged = prevQueryRef.current !== query
    const loadingChanged = prevLoadingRef.current !== loading

    if (queryChanged && query) {
      setAnnouncement(`Searching for "${query}"`)
    } else if (loadingChanged && !loading) {
      if (error) {
        setAnnouncement(`Search failed: ${error}`)
      } else if (query) {
        setAnnouncement(
          totalResults === 0
            ? `No results found for "${query}"`
            : `Found ${totalResults} result${totalResults === 1 ? '' : 's'} for "${query}"`
        )
      }
    }

    prevQueryRef.current = query
    prevLoadingRef.current = loading
  }, [query, totalResults, loading, error])

  return (
    <StatusAnnouncer 
      message={announcement} 
      priority={error ? 'assertive' : 'polite'} 
    />
  )
}