import React from 'react'
import type { ComponentWithClassName, ComponentWithTestId } from '../../types'

interface StatsCardProps extends ComponentWithClassName, ComponentWithTestId {
  title: string
  value: string | number
  icon: React.ReactNode
  iconColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
  trend?: {
    value: number
    label: string
    isPositive: boolean
  }
  loading?: boolean
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  iconColor = 'primary',
  trend,
  loading = false,
  className = '',
  'data-testid': testId,
}) => {
  const iconColorClasses = {
    primary: 'bg-primary-500',
    secondary: 'bg-secondary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500',
    info: 'bg-info-500',
  }

  if (loading) {
    return (
      <div className={`stats-card ${className}`} data-testid={testId}>
        <div className="stats-card-icon bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="stats-card-content">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24" />
        </div>
      </div>
    )
  }

  return (
    <div className={`stats-card ${className}`} data-testid={testId}>
      <div className={`stats-card-icon ${iconColorClasses[iconColor]}`}>
        {icon}
      </div>
      
      <div className="stats-card-content">
        <div className="stats-card-title">
          {title}
        </div>
        
        <div className="flex items-end justify-between">
          <div className="stats-card-value">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          
          {trend && (
            <div className={`flex items-center text-xs font-medium ${
              trend.isPositive ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'
            }`}>
              <svg
                className={`w-3 h-3 mr-1 transform ${
                  trend.isPositive ? '' : 'rotate-180'
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
              <span>{trend.value}%</span>
              <span className="text-text-muted dark:text-gray-400 ml-1">{trend.label}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Predefined stats card variants matching desktop patterns
interface ParkingStatsCardProps extends ComponentWithClassName, ComponentWithTestId {
  type: 'parked' | 'exited' | 'income' | 'unpaid'
  value: string | number
  trend?: StatsCardProps['trend']
  loading?: boolean
}

export const ParkingStatsCard: React.FC<ParkingStatsCardProps> = ({
  type,
  value,
  trend,
  loading = false,
  className = '',
  'data-testid': testId,
}) => {
  const statsConfig = {
    parked: {
      title: 'Parked Vehicles',
      icon: (
        <svg fill="currentColor" viewBox="0 0 20 20" className="w-6 h-6">
          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      ),
      iconColor: 'primary' as const,
    },
    exited: {
      title: 'Exited Today',
      icon: (
        <svg fill="currentColor" viewBox="0 0 20 20" className="w-6 h-6">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
        </svg>
      ),
      iconColor: 'success' as const,
    },
    income: {
      title: "Today's Income",
      icon: (
        <svg fill="currentColor" viewBox="0 0 20 20" className="w-6 h-6">
          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
        </svg>
      ),
      iconColor: 'info' as const,
    },
    unpaid: {
      title: 'Unpaid Vehicles',
      icon: (
        <svg fill="currentColor" viewBox="0 0 20 20" className="w-6 h-6">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ),
      iconColor: 'warning' as const,
    },
  }

  const config = statsConfig[type]

  return (
    <StatsCard
      title={config.title}
      value={value}
      icon={config.icon}
      iconColor={config.iconColor}
      trend={trend}
      loading={loading}
      className={className}
      data-testid={testId}
    />
  )
}