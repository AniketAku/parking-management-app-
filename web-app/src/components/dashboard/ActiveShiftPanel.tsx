import React from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { useShiftLinking } from '../../hooks/useShiftLinking'

interface ActiveShiftPanelProps {
  className?: string
}

export const ActiveShiftPanel: React.FC<ActiveShiftPanelProps> = ({
  className = ''
}) => {
  const { state, metrics } = useShiftLinking()

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Active Shift Status */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium text-text-secondary flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              state.activeShiftId ? 'bg-success-500 animate-pulse' : 'bg-gray-400'
            }`}></div>
            <span>Shift Status</span>
          </h3>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <span className={`text-lg font-semibold ${
                state.activeShiftId ? 'text-success-600' : 'text-gray-500'
              }`}>
                {state.activeShiftId ? 'Active Shift' : 'No Active Shift'}
              </span>
              {state.isLinking && (
                <div className="flex items-center space-x-2 mt-1">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-600"></div>
                  <span className="text-xs text-primary-600">Linking in progress...</span>
                </div>
              )}
            </div>
            {state.activeShiftId && (
              <div className="text-xs text-text-muted">
                ID: {state.activeShiftId.slice(-8)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Shift Metrics - Only show when metrics are available */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardHeader>
              <h4 className="text-xs font-medium text-text-secondary">Sessions Linked</h4>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline space-x-2">
                <span className="text-lg font-bold text-success-600">
                  {metrics.sessionsLinkedToday}
                </span>
                <span className="text-xs text-text-muted">today</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h4 className="text-xs font-medium text-text-secondary">Payments Linked</h4>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline space-x-2">
                <span className="text-lg font-bold text-success-600">
                  {metrics.paymentsLinkedToday}
                </span>
                <span className="text-xs text-text-muted">today</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h4 className="text-xs font-medium text-text-secondary">Unlinked Items</h4>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline space-x-2">
                <span className={`text-lg font-bold ${
                  (metrics.unlinkedSessions + metrics.unlinkedPayments) > 0
                    ? 'text-warning-600'
                    : 'text-success-600'
                }`}>
                  {metrics.unlinkedSessions + metrics.unlinkedPayments}
                </span>
                <span className="text-xs text-text-muted">pending</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h4 className="text-xs font-medium text-text-secondary">Success Rate</h4>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline space-x-2">
                <span className={`text-lg font-bold ${
                  metrics.linkingSuccessRate >= 95
                    ? 'text-success-600'
                    : metrics.linkingSuccessRate >= 80
                      ? 'text-warning-600'
                      : 'text-danger-600'
                }`}>
                  {metrics.linkingSuccessRate.toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Messages */}
      {state.linkingErrors.length > 0 && (
        <Card>
          <CardHeader>
            <h4 className="text-xs font-medium text-danger-600 flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>Recent Errors ({state.linkingErrors.length})</span>
            </h4>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {state.linkingErrors.slice(-3).map((error, index) => (
                <div key={index} className="text-xs text-danger-600 bg-danger-50 p-2 rounded">
                  {error}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Operation Status */}
      {state.bulkLinkingInProgress && (
        <Card>
          <CardContent>
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
              <span className="text-sm text-primary-600 font-medium">
                Bulk linking operation in progress...
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}