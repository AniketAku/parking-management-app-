import React from 'react'
import type { ComponentWithChildren, ComponentWithClassName } from '../../types'

interface AlertProps extends ComponentWithChildren, ComponentWithClassName {
  variant?: 'default' | 'destructive' | 'warning' | 'success'
}

export const Alert: React.FC<AlertProps> = ({
  children,
  variant = 'default',
  className = '',
}) => {
  const variantClasses = {
    default: 'bg-blue-50 border-blue-200 text-blue-800',
    destructive: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    success: 'bg-green-50 border-green-200 text-green-800',
  }

  return (
    <div
      className={`p-4 border rounded-lg ${variantClasses[variant]} ${className}`}
      role="alert"
    >
      {children}
    </div>
  )
}

interface AlertTitleProps extends ComponentWithChildren, ComponentWithClassName {}

export const AlertTitle: React.FC<AlertTitleProps> = ({
  children,
  className = '',
}) => {
  return (
    <h5 className={`font-medium text-sm ${className}`}>
      {children}
    </h5>
  )
}

interface AlertDescriptionProps extends ComponentWithChildren, ComponentWithClassName {}

export const AlertDescription: React.FC<AlertDescriptionProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`mt-1 text-sm ${className}`}>
      {children}
    </div>
  )
}