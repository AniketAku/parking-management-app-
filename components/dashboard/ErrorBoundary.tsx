// =============================================================================
// ERROR BOUNDARY COMPONENT
// Event-Driven Shift Management - Error Handling and Recovery
// =============================================================================

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  className?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${this.props.className || ''}`}
             role="alert"
             aria-live="assertive">
          <div className="flex items-center mb-4">
            <div className="bg-red-100 rounded-full p-2 mr-3">
              <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-red-800">
              Something went wrong
            </h2>
          </div>

          <div className="space-y-4">
            <p className="text-red-700">
              An unexpected error occurred while rendering this component. This might be due to:
            </p>

            <ul className="text-red-700 text-sm list-disc list-inside space-y-1">
              <li>Temporary network connectivity issues</li>
              <li>Invalid data format from the server</li>
              <li>Missing required properties or configuration</li>
              <li>Browser compatibility issues</li>
            </ul>

            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <button
                onClick={this.handleRetry}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-describedby="retry-description"
              >
                Try Again
              </button>

              <button
                onClick={() => window.location.reload()}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                aria-describedby="reload-description"
              >
                Refresh Page
              </button>
            </div>

            <div className="text-xs text-gray-500 space-y-2">
              <p id="retry-description" className="sr-only">
                Attempt to re-render the component without refreshing the entire page
              </p>
              <p id="reload-description" className="sr-only">
                Reload the entire page to reset all components and clear any cached errors
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="text-red-600 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 rounded">
                    Show Technical Details
                  </summary>
                  <div className="mt-2 p-3 bg-red-100 border border-red-200 rounded text-xs font-mono text-red-800 whitespace-pre-wrap overflow-auto max-h-40">
                    <div className="font-semibold mb-2">Error:</div>
                    <div>{this.state.error.toString()}</div>

                    {this.state.errorInfo?.componentStack && (
                      <>
                        <div className="font-semibold mt-3 mb-2">Component Stack:</div>
                        <div>{this.state.errorInfo.componentStack}</div>
                      </>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}