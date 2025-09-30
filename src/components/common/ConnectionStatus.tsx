import React from 'react'
import { Badge } from '../ui/Badge'
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates'
import { formatDateTime } from '../../utils/helpers'

interface ConnectionStatusProps {
  showLastUpdate?: boolean
  size?: 'sm' | 'md' | 'lg'
  position?: 'inline' | 'fixed'
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  showLastUpdate = false,
  size = 'sm',
  position = 'inline'
}) => {
  const { connection, connect, disconnect } = useRealTimeUpdates({
    autoJoinRoom: false,
    enableNotifications: false
  })

  const getStatusConfig = () => {
    switch (connection.connectionState) {
      case 'connected':
        return {
          variant: 'success' as const,
          text: 'Connected',
          icon: '🟢',
          color: 'text-success-600'
        }
      case 'connecting':
        return {
          variant: 'warning' as const,
          text: 'Connecting...',
          icon: '🟡',
          color: 'text-warning-600'
        }
      case 'disconnected':
        return {
          variant: 'danger' as const,
          text: 'Disconnected',
          icon: '🔴',
          color: 'text-danger-600'
        }
    }
  }

  const statusConfig = getStatusConfig()

  const handleToggleConnection = async () => {
    if (connection.isConnected) {
      disconnect()
    } else {
      await connect()
    }
  }

  const containerClasses = position === 'fixed' 
    ? 'fixed bottom-4 right-4 z-50' 
    : ''

  return (
    <div className={`flex items-center space-x-2 ${containerClasses}`}>
      <div className="flex items-center space-x-1">
        <span className="text-sm">{statusConfig.icon}</span>
        <Badge variant={statusConfig.variant} size={size}>
          Real-time: {statusConfig.text}
        </Badge>
      </div>

      {showLastUpdate && connection.lastUpdate && (
        <span className="text-xs text-text-muted">
          Last update: {formatDateTime(connection.lastUpdate)}
        </span>
      )}

      {/* Connection toggle button (for debugging/manual control) */}
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={handleToggleConnection}
          className="text-xs px-2 py-1 border border-border-light rounded hover:bg-surface-light transition-colors"
          title={connection.isConnected ? 'Disconnect' : 'Connect'}
        >
          {connection.isConnected ? '🔌 Disconnect' : '🔌 Connect'}
        </button>
      )}
    </div>
  )
}

// Pulse animation for connecting state
export const ConnectionPulse: React.FC<{ isConnecting: boolean }> = ({ isConnecting }) => {
  if (!isConnecting) return null

  return (
    <div className="flex items-center space-x-2">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-warning-500 rounded-full animate-pulse"></div>
        <div className="w-2 h-2 bg-warning-500 rounded-full animate-pulse delay-75"></div>
        <div className="w-2 h-2 bg-warning-500 rounded-full animate-pulse delay-150"></div>
      </div>
      <span className="text-xs text-warning-600">Connecting to real-time updates...</span>
    </div>
  )
}

// Connection indicator for header
export const HeaderConnectionIndicator: React.FC = () => {
  const { connection } = useRealTimeUpdates({
    autoJoinRoom: false,
    enableNotifications: false
  })

  const getIndicatorColor = () => {
    switch (connection.connectionState) {
      case 'connected':
        return 'bg-success-500'
      case 'connecting':
        return 'bg-warning-500 animate-pulse'
      case 'disconnected':
        return 'bg-danger-500'
    }
  }

  return (
    <div 
      className="flex items-center space-x-2 cursor-pointer group"
      title={`Real-time updates: ${connection.connectionState}`}
    >
      <div className={`w-2 h-2 rounded-full ${getIndicatorColor()}`}></div>
      <span className="text-xs text-white opacity-80 group-hover:opacity-100 transition-opacity">
        Live
      </span>
    </div>
  )
}