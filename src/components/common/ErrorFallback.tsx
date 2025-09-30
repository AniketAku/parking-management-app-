/**
 * Error Fallback Component
 * Provides user-friendly error display for error boundaries
 */

import React from 'react'
import { AppError, ErrorHandler } from '../../utils/errorHandler'

export interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetErrorBoundary
}) => {
  const standardizedError = error instanceof AppError 
    ? error 
    : ErrorHandler.standardizeError(error)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-lg">❌</span>
            </div>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">
              Something went wrong
            </h3>
            <p className="text-sm text-gray-500">
              {standardizedError.userMessage}
            </p>
          </div>
        </div>
        
        <div className="mt-4">
          <button
            onClick={resetErrorBoundary}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Try Again
          </button>
        </div>
        
        {import.meta.env.DEV && (
          <details className="mt-4">
            <summary className="text-sm text-gray-600 cursor-pointer">
              Technical Details
            </summary>
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(standardizedError.toJSON(), null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

export default ErrorFallback