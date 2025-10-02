// =============================================================================
// CONNECTION STATUS COMPONENT
// Event-Driven Shift Management - Real-time Connection Status Display
// =============================================================================

import React from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
  lastUpdate?: string | null;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  lastUpdate,
  className = ''
}) => {
  const formatLastUpdate = (timestamp: string): string => {
    const now = new Date();
    const updateTime = new Date(timestamp);
    const diffMs = now.getTime() - updateTime.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);

    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else {
      return updateTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${
      isConnected
        ? 'bg-green-50 border-green-200 text-green-800'
        : 'bg-red-50 border-red-200 text-red-800'
    } ${className}`}>
      <div className="flex items-center space-x-3">
        {/* Connection Status Indicator */}
        <div className="relative">
          <div className={`w-3 h-3 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {isConnected && (
              <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75"></div>
            )}
          </div>
        </div>

        {/* Status Text */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
          <span className="font-semibold text-sm">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>

          {lastUpdate && (
            <span className="text-xs opacity-75">
              Last update: {formatLastUpdate(lastUpdate)}
            </span>
          )}
        </div>
      </div>

      {/* Connection Details */}
      <div className="flex items-center space-x-2">
        {isConnected ? (
          <div className="flex items-center space-x-1 text-xs">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="hidden sm:inline">Real-time sync active</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1 text-xs">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="hidden sm:inline">Connection lost</span>
          </div>
        )}
      </div>
    </div>
  );
};