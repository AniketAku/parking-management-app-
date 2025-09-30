import React from 'react'
import type { ComponentWithClassName, ComponentWithTestId, ParkingEntry } from '../../types'

interface BadgeProps extends ComponentWithClassName, ComponentWithTestId {
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'destructive' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  'data-testid': testId,
}) => {
  const baseClasses = 'status-badge font-medium'
  
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-primary-100 text-primary-800',
    secondary: 'bg-secondary-100 text-secondary-800',
    success: 'bg-success-100 text-success-800',
    warning: 'bg-warning-100 text-warning-800',
    danger: 'bg-danger-100 text-danger-800',
    destructive: 'bg-red-100 text-red-800',
    info: 'bg-info-100 text-info-800',
    outline: 'bg-transparent border border-gray-300 text-gray-700',
  }
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  }
  
  const combinedClasses = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className,
  ].join(' ').trim()

  return (
    <span className={combinedClasses} data-testid={testId}>
      {children}
    </span>
  )
}

// Status-specific badge components matching desktop patterns
interface StatusBadgeProps extends ComponentWithClassName, ComponentWithTestId {
  status: ParkingEntry['status'] | ParkingEntry['paymentStatus']
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  'data-testid': testId,
}) => {
  const statusConfig = {
    // Parking status
    'Parked': { variant: 'primary' as const, text: 'Parked' },
    'Exited': { variant: 'success' as const, text: 'Exited' },
    
    // Payment status
    'Paid': { variant: 'success' as const, text: 'Paid' },
    'Unpaid': { variant: 'warning' as const, text: 'Unpaid' },
    'Pending': { variant: 'info' as const, text: 'Pending' },
    'Refunded': { variant: 'secondary' as const, text: 'Refunded' },
  }
  
  const config = statusConfig[status] || { variant: 'default' as const, text: status }
  
  return (
    <Badge
      variant={config.variant}
      className={className}
      data-testid={testId}
    >
      {config.text}
    </Badge>
  )
}