import React from 'react'
import type { ComponentWithClassName, ComponentWithTestId } from '../../types'

interface LoadingSpinnerProps extends ComponentWithClassName, ComponentWithTestId {
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'secondary' | 'white' | 'gray'
  text?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  text,
  className = '',
  'data-testid': testId,
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  const colorClasses = {
    primary: 'border-primary-500',
    secondary: 'border-secondary-500',
    white: 'border-white',
    gray: 'border-gray-500',
  }

  const spinnerClasses = [
    'loading-spinner',
    sizeClasses[size],
    colorClasses[color],
    className,
  ].join(' ').trim()

  if (text) {
    return (
      <div className="flex items-center space-x-2" data-testid={testId}>
        <div className={spinnerClasses} />
        <span className="text-text-muted text-sm">{text}</span>
      </div>
    )
  }

  return <div className={spinnerClasses} data-testid={testId} />
}

interface LoadingOverlayProps extends ComponentWithClassName {
  text?: string
  transparent?: boolean
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  text = 'Loading...',
  transparent = false,
  className = '',
}) => {
  const overlayClasses = [
    'fixed inset-0 z-50 flex items-center justify-center',
    transparent ? 'bg-white bg-opacity-75' : 'bg-white',
    className,
  ].join(' ').trim()

  return (
    <div className={overlayClasses}>
      <div className="text-center">
        <LoadingSpinner size="lg" />
        {text && (
          <p className="mt-4 text-text-muted font-medium">{text}</p>
        )}
      </div>
    </div>
  )
}

interface SkeletonProps extends ComponentWithClassName {
  width?: string | number
  height?: string | number
  circle?: boolean
  lines?: number
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  circle = false,
  lines = 1,
  className = '',
}) => {
  const baseClasses = 'loading-skeleton'
  
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  }

  if (lines > 1) {
    return (
      <div className={className}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={[
              baseClasses,
              'mb-2 last:mb-0',
              index === lines - 1 ? 'w-3/4' : 'w-full', // Last line shorter
            ].join(' ')}
            style={{ height: height || '1rem' }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={[
        baseClasses,
        circle ? 'rounded-full' : 'rounded',
        className,
      ].join(' ')}
      style={style}
    />
  )
}

interface SkeletonCardProps {
  showAvatar?: boolean
  lines?: number
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  showAvatar = false,
  lines = 3,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-card p-6 animate-pulse">
      <div className="flex items-start space-x-4">
        {showAvatar && (
          <Skeleton circle width={40} height={40} />
        )}
        <div className="flex-1 space-y-2">
          <Skeleton height={20} width="60%" />
          <Skeleton lines={lines} height={16} />
        </div>
      </div>
    </div>
  )
}

interface SkeletonTableProps {
  rows?: number
  columns?: number
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-card overflow-hidden">
      {/* Header */}
      <div className="bg-light-100 border-b border-border-color p-4">
        <div className="flex space-x-4">
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} height={16} width="20%" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b border-border-color last:border-b-0 p-4">
          <div className="flex space-x-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} height={16} width="20%" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}