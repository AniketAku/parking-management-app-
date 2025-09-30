import React from 'react'
import type { ComponentWithChildren, ComponentWithClassName, ComponentWithTestId } from '../../types'

interface TableProps extends ComponentWithChildren, ComponentWithClassName, ComponentWithTestId {
  striped?: boolean
  hoverable?: boolean
}

export const Table: React.FC<TableProps> = ({
  children,
  className = '',
  'data-testid': testId,
}) => {
  const tableClasses = [
    'data-table min-w-full',
    className,
  ].join(' ').trim()

  return (
    <div className="overflow-hidden">
      <table className={tableClasses} data-testid={testId}>
        {children}
      </table>
    </div>
  )
}

interface TableHeaderProps extends ComponentWithChildren, ComponentWithClassName {}

export const TableHeader: React.FC<TableHeaderProps> = ({
  children,
  className = '',
}) => {
  const headerClasses = [
    'data-table-header',
    className,
  ].join(' ').trim()

  return (
    <thead className={headerClasses}>
      {children}
    </thead>
  )
}

interface TableBodyProps extends ComponentWithChildren, ComponentWithClassName {}

export const TableBody: React.FC<TableBodyProps> = ({
  children,
  className = '',
}) => {
  const bodyClasses = [
    'data-table-body divide-y divide-border-color',
    className,
  ].join(' ').trim()

  return (
    <tbody className={bodyClasses}>
      {children}
    </tbody>
  )
}

interface TableRowProps extends ComponentWithChildren, ComponentWithClassName {
  onClick?: () => void
  selected?: boolean
}

export const TableRow: React.FC<TableRowProps> = ({
  children,
  onClick,
  selected = false,
  className = '',
}) => {
  const rowClasses = [
    onClick ? 'cursor-pointer' : '',
    selected ? 'bg-primary-50' : '',
    className,
  ].join(' ').trim()

  return (
    <tr className={rowClasses} onClick={onClick}>
      {children}
    </tr>
  )
}

interface TableHeaderCellProps extends ComponentWithChildren, ComponentWithClassName {
  sortable?: boolean
  sortDirection?: 'asc' | 'desc' | null
  onSort?: () => void
  align?: 'left' | 'center' | 'right'
}

export const TableHeaderCell: React.FC<TableHeaderCellProps> = ({
  children,
  sortable = false,
  sortDirection = null,
  onSort,
  align = 'left',
  className = '',
}) => {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }
  
  const cellClasses = [
    'px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider',
    alignClasses[align],
    sortable ? 'cursor-pointer hover:bg-light-200 select-none' : '',
    className,
  ].join(' ').trim()

  return (
    <th className={cellClasses} onClick={sortable ? onSort : undefined}>
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortable && (
          <div className="flex flex-col">
            <svg
              className={`w-3 h-3 ${
                sortDirection === 'asc' ? 'text-primary-500' : 'text-gray-300'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            <svg
              className={`w-3 h-3 -mt-1 ${
                sortDirection === 'desc' ? 'text-primary-500' : 'text-gray-300'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
    </th>
  )
}

interface TableCellProps extends ComponentWithChildren, ComponentWithClassName {
  align?: 'left' | 'center' | 'right'
}

export const TableCell: React.FC<TableCellProps> = ({
  children,
  align = 'left',
  className = '',
}) => {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }
  
  const cellClasses = [
    'px-4 py-3 text-sm text-text-primary',
    alignClasses[align],
    className,
  ].join(' ').trim()

  return (
    <td className={cellClasses}>
      {children}
    </td>
  )
}

// Empty state component for tables
interface TableEmptyStateProps {
  message?: string
  icon?: React.ReactNode
  action?: React.ReactNode
}

export const TableEmptyState: React.FC<TableEmptyStateProps> = ({
  message = 'No data available',
  icon,
  action,
}) => {
  return (
    <TableRow>
      <TableCell className="text-center py-12" align="center">
        <div className="flex flex-col items-center space-y-3">
          {icon && (
            <div className="text-gray-400 text-4xl">
              {icon}
            </div>
          )}
          <p className="text-text-muted">{message}</p>
          {action && (
            <div>
              {action}
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}