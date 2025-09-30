import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardContent } from '../ui/Card'
// import { Button } from '../ui/Button'
import { toast } from 'react-hot-toast'

interface QuickActionProps {
  title: string
  description: string
  icon: React.ReactNode
  action: () => void
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  disabled?: boolean
}

const QuickActionButton: React.FC<QuickActionProps> = ({
  title,
  description,
  icon,
  action,
  variant = 'primary',
  disabled = false
}) => {
  const variantStyles = {
    primary: 'bg-primary-50 hover:bg-primary-100 border-primary-200 text-primary-700',
    secondary: 'bg-secondary-50 hover:bg-secondary-100 border-secondary-200 text-secondary-700',
    success: 'bg-success-50 hover:bg-success-100 border-success-200 text-success-700',
    warning: 'bg-warning-50 hover:bg-warning-100 border-warning-200 text-warning-700',
    danger: 'bg-danger-50 hover:bg-danger-100 border-danger-200 text-danger-700',
  }

  return (
    <button
      onClick={action}
      disabled={disabled}
      className={`
        w-full p-4 rounded-lg border-2 transition-all duration-200 text-left
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md cursor-pointer'}
        ${variantStyles[variant]}
      `}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm">{title}</h4>
          <p className="text-xs opacity-75 mt-1">{description}</p>
        </div>
      </div>
    </button>
  )
}

export const QuickActions: React.FC = () => {
  const navigate = useNavigate()

  const handleNewEntry = () => {
    navigate('/entry')
    toast.success('Redirected to vehicle entry')
  }

  const handleProcessExit = () => {
    navigate('/exit')
    toast.success('Redirected to vehicle exit')
  }

  const handleViewReports = () => {
    navigate('/reports')
    toast.success('Redirected to reports')
  }

  const handleViewAnalytics = () => {
    navigate('/analytics')
    toast.success('Redirected to analytics')
  }

  const handleSearchVehicles = () => {
    navigate('/search')
    toast.success('Redirected to vehicle search')
  }

  const handleExportData = () => {
    toast.promise(
      // Simulate export process
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Preparing export...',
        success: 'Data exported successfully!',
        error: 'Export failed. Please try again.',
      }
    )
  }

  const handleSystemBackup = () => {
    toast.promise(
      // Simulate backup process
      new Promise((resolve) => setTimeout(resolve, 3000)),
      {
        loading: 'Creating system backup...',
        success: 'Backup completed successfully!',
        error: 'Backup failed. Please try again.',
      }
    )
  }

  const quickActions = [
    {
      title: 'New Vehicle Entry',
      description: 'Register a new vehicle entry',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      action: handleNewEntry,
      variant: 'success' as const
    },
    {
      title: 'Process Exit',
      description: 'Process vehicle exit and payment',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      ),
      action: handleProcessExit,
      variant: 'primary' as const
    },
    {
      title: 'Search Vehicles',
      description: 'Find and filter vehicles',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      action: handleSearchVehicles,
      variant: 'secondary' as const
    },
    {
      title: 'View Reports',
      description: 'Generate and export reports',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
      ),
      action: handleViewReports,
      variant: 'warning' as const
    },
    {
      title: 'View Analytics',
      description: 'Data insights and intelligence',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      action: handleViewAnalytics,
      variant: 'secondary' as const
    },
    {
      title: 'Export Data',
      description: 'Export parking data to CSV/Excel',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      action: handleExportData,
      variant: 'secondary' as const
    },
    {
      title: 'System Backup',
      description: 'Create system data backup',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
      ),
      action: handleSystemBackup,
      variant: 'warning' as const
    }
  ]

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-text-primary">Quick Actions</h3>
        <p className="text-sm text-text-muted mt-1">
          Frequently used operations and shortcuts
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.map((action, index) => (
            <QuickActionButton
              key={index}
              title={action.title}
              description={action.description}
              icon={action.icon}
              action={action.action}
              variant={action.variant}
            />
          ))}
        </div>
        
        {/* Additional Info Section */}
        <div className="mt-6 pt-4 border-t border-border-light">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">System Status</span>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success-500 rounded-full"></div>
              <span className="text-success-600 font-medium">Online</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-text-muted">Last Backup</span>
            <span className="text-text-secondary font-medium">
              {new Date().toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}