import React from 'react'
import type { ComponentWithChildren, ComponentWithClassName, ComponentWithTestId } from '../../types'

interface CardProps extends ComponentWithChildren, ComponentWithClassName, ComponentWithTestId {
  variant?: 'default' | 'stats'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  shadow?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  shadow = 'md',
  hover = false,
  className = '',
  'data-testid': testId,
}) => {
  const baseClasses = 'bg-white rounded-lg transition-shadow duration-200'
  
  const paddingClasses = {
    none: '',
    sm: 'p-2 sm:p-3',
    md: 'p-3 sm:p-4',
    lg: 'p-4 sm:p-6',
  }
  
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-card',
    lg: 'shadow-xl',
  }
  
  const variantClasses = {
    default: '',
    stats: 'stats-card',
  }
  
  const combinedClasses = [
    baseClasses,
    variantClasses[variant],
    variant !== 'stats' ? paddingClasses[padding] : '',
    shadowClasses[shadow],
    hover ? 'hover:shadow-card-hover cursor-pointer' : '',
    className,
  ].join(' ').trim()

  return (
    <div className={combinedClasses} data-testid={testId}>
      {children}
    </div>
  )
}

interface CardHeaderProps extends ComponentWithClassName {
  children?: React.ReactNode
  title?: string
  subtitle?: string
  action?: React.ReactNode
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  title,
  subtitle,
  action,
  className = '',
}) => {
  const headerClasses = [
    'flex items-center justify-between border-b border-border-color pb-3 sm:pb-4 mb-3 sm:mb-4',
    className,
  ].join(' ').trim()

  return (
    <div className={headerClasses}>
      <div className="flex-1">
        {title && (
          <h3 className="text-base sm:text-lg font-semibold text-text-primary">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            {subtitle}
          </p>
        )}
        {children}
      </div>
      {action && (
        <div className="flex-shrink-0 ml-2 sm:ml-4">
          {action}
        </div>
      )}
    </div>
  )
}

interface CardBodyProps extends ComponentWithChildren, ComponentWithClassName {}

export const CardBody: React.FC<CardBodyProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

interface CardContentProps extends ComponentWithChildren, ComponentWithClassName {}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

interface CardTitleProps extends ComponentWithChildren, ComponentWithClassName {}

export const CardTitle: React.FC<CardTitleProps> = ({
  children,
  className = '',
}) => {
  return (
    <h3 className={`text-lg font-semibold text-text-primary ${className}`}>
      {children}
    </h3>
  )
}

interface CardDescriptionProps extends ComponentWithChildren, ComponentWithClassName {}

export const CardDescription: React.FC<CardDescriptionProps> = ({
  children,
  className = '',
}) => {
  return (
    <p className={`text-sm text-text-muted mt-1 ${className}`}>
      {children}
    </p>
  )
}

interface CardFooterProps extends ComponentWithChildren, ComponentWithClassName {
  align?: 'left' | 'center' | 'right'
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  align = 'right',
  className = '',
}) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }
  
  const footerClasses = [
    'flex items-center border-t border-border-color pt-3 sm:pt-4 mt-3 sm:mt-4',
    alignClasses[align],
    className,
  ].join(' ').trim()

  return (
    <div className={footerClasses}>
      {children}
    </div>
  )
}