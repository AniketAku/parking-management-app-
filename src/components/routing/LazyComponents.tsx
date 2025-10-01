/**
 * Lazy Components - Code Splitting Implementation
 * Route-based code splitting with performance monitoring and error boundaries
 */

import React, { Suspense, lazy, ComponentType } from 'react'
import PerformanceMonitor from '../../utils/performanceMonitor'
import { useRenderPerformance } from '../../hooks/usePerformance'

// Lazy loading wrapper with performance tracking
const createLazyComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  displayName: string
) => {
  const LazyComponent = lazy(() => {
    const startTime = performance.now()
    
    return importFn().then(module => {
      const loadTime = performance.now() - startTime
      
      PerformanceMonitor.recordMetric({
        name: `lazy-component-${displayName.toLowerCase()}`,
        value: loadTime,
        unit: 'ms',
        context: { component: displayName }
      })
      
      console.log(`📦 Lazy loaded ${displayName} in ${loadTime.toFixed(2)}ms`)
      return module
    }).catch(error => {
      const loadTime = performance.now() - startTime
      
      PerformanceMonitor.recordMetric({
        name: `lazy-component-${displayName.toLowerCase()}-error`,
        value: loadTime,
        unit: 'ms',
        context: { component: displayName, error: error.message }
      })
      
      console.error(`❌ Failed to lazy load ${displayName} after ${loadTime.toFixed(2)}ms:`, error)
      throw error
    })
  })
  
  LazyComponent.displayName = `Lazy(${displayName})`
  return LazyComponent
}

// Loading fallback component
const LoadingFallback: React.FC<{ componentName?: string }> = ({ componentName }) => {
  useRenderPerformance('LoadingFallback')
  
  return (
    <div className="loading-fallback">
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
      <div className="loading-text">
        Loading {componentName || 'component'}...
      </div>
      
      <style jsx>{`
        .loading-fallback {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          padding: 2rem;
        }
        
        .loading-spinner {
          margin-bottom: 1rem;
        }
        
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .loading-text {
          color: #666;
          font-size: 0.9rem;
          font-weight: 500;
        }
        
        @media (prefers-reduced-motion: reduce) {
          .spinner {
            animation: none;
            border-top-color: #3498db;
          }
        }
      `}</style>
    </div>
  )
}

// Error boundary for lazy components
class LazyComponentErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component error:', error, errorInfo)
    
    PerformanceMonitor.recordMetric({
      name: 'lazy-component-error',
      value: 1,
      unit: 'count',
      context: { 
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      }
    })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback
      
      if (FallbackComponent && this.state.error) {
        return <FallbackComponent error={this.state.error} />
      }
      
      return (
        <div className="error-fallback">
          <h3>⚠️ Component Failed to Load</h3>
          <p>There was an error loading this component. Please refresh the page.</p>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
          
          <style jsx>{`
            .error-fallback {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 200px;
              padding: 2rem;
              text-align: center;
              border: 2px dashed #e74c3c;
              border-radius: 8px;
              background: #fff5f5;
            }
            
            .error-fallback h3 {
              color: #e74c3c;
              margin-bottom: 1rem;
              font-size: 1.2rem;
            }
            
            .error-fallback p {
              color: #666;
              margin-bottom: 1.5rem;
              max-width: 400px;
            }
            
            .error-fallback button {
              background: #e74c3c;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 6px;
              font-weight: 500;
              cursor: pointer;
              transition: background 0.2s;
            }
            
            .error-fallback button:hover {
              background: #c0392b;
            }
          `}</style>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for lazy loading with error boundary
export const withLazyLoading = <P extends object>(
  Component: ComponentType<P>,
  componentName: string,
  fallbackComponent?: ComponentType<{ error: Error }>
) => {
  const WrappedComponent: React.FC<P> = (props) => (
    <LazyComponentErrorBoundary fallback={fallbackComponent}>
      <Suspense fallback={<LoadingFallback componentName={componentName} />}>
        <Component {...props} />
      </Suspense>
    </LazyComponentErrorBoundary>
  )
  
  WrappedComponent.displayName = `WithLazyLoading(${componentName})`
  return WrappedComponent
}

// Preload function for eager loading
export const preloadComponent = async (
  importFn: () => Promise<{ default: ComponentType<any> }>,
  componentName: string
) => {
  const startTime = performance.now()
  
  try {
    const module = await importFn()
    const loadTime = performance.now() - startTime
    
    PerformanceMonitor.recordMetric({
      name: `preload-${componentName.toLowerCase()}`,
      value: loadTime,
      unit: 'ms',
      context: { component: componentName, preloaded: true }
    })
    
    console.log(`🚀 Preloaded ${componentName} in ${loadTime.toFixed(2)}ms`)
    return module
  } catch (error) {
    const loadTime = performance.now() - startTime
    
    PerformanceMonitor.recordMetric({
      name: `preload-${componentName.toLowerCase()}-error`,
      value: loadTime,
      unit: 'ms',
      context: { component: componentName, error: (error as Error).message }
    })
    
    console.error(`❌ Failed to preload ${componentName} after ${loadTime.toFixed(2)}ms:`, error)
    throw error
  }
}

// Lazy loaded route components
export const LazyDashboard = createLazyComponent(
  () => import('../../pages/Dashboard'),
  'Dashboard'
)

export const LazyEntryPage = createLazyComponent(
  () => import('../../pages/EntryPage'),
  'EntryPage'
)

export const LazyExitPage = createLazyComponent(
  () => import('../../pages/ExitPage'),
  'ExitPage'
)

export const LazySearchPage = createLazyComponent(
  () => import('../../pages/SearchPage'),
  'SearchPage'
)

export const LazyReportsPage = createLazyComponent(
  () => import('../../pages/ReportsPage'),
  'ReportsPage'
)

export const LazySettingsPage = createLazyComponent(
  () => import('../../pages/SettingsPage'),
  'SettingsPage'
)

export const LazyUserManagement = createLazyComponent(
  () => import('../../pages/UserManagement'),
  'UserManagement'
)

export const LazyBusinessRulesTab = createLazyComponent(
  () => import('../../components/settings/BusinessRulesTab'),
  'BusinessRulesTab'
)

// Progressive loading hook
export const useProgressiveLoading = () => {
  const [loadedComponents, setLoadedComponents] = React.useState<Set<string>>(new Set())
  
  const preloadOnHover = React.useCallback((
    componentName: string,
    importFn: () => Promise<{ default: ComponentType<any> }>
  ) => {
    return () => {
      if (!loadedComponents.has(componentName)) {
        preloadComponent(importFn, componentName)
          .then(() => {
            setLoadedComponents(prev => new Set([...prev, componentName]))
          })
          .catch(error => {
            console.warn(`Failed to preload ${componentName}:`, error)
          })
      }
    }
  }, [loadedComponents])
  
  const preloadOnIdle = React.useCallback((
    components: Array<{
      name: string
      importFn: () => Promise<{ default: ComponentType<any> }>
      priority: number
    }>
  ) => {
    // Sort by priority (higher number = higher priority)
    const sortedComponents = [...components].sort((a, b) => b.priority - a.priority)
    
    const loadNext = () => {
      const nextComponent = sortedComponents.find(comp => 
        !loadedComponents.has(comp.name)
      )
      
      if (nextComponent) {
        requestIdleCallback(() => {
          preloadComponent(nextComponent.importFn, nextComponent.name)
            .then(() => {
              setLoadedComponents(prev => new Set([...prev, nextComponent.name]))
              loadNext() // Load the next component
            })
            .catch(error => {
              console.warn(`Failed to preload ${nextComponent.name}:`, error)
              loadNext() // Continue with the next component even if this one failed
            })
        })
      }
    }
    
    loadNext()
  }, [loadedComponents])
  
  return {
    loadedComponents: Array.from(loadedComponents),
    preloadOnHover,
    preloadOnIdle
  }
}

// Route-based preloading configuration
export const routePreloadConfig = [
  {
    name: 'Dashboard',
    importFn: () => import('../../pages/Dashboard'),
    priority: 10 // Highest priority - most frequently accessed
  },
  {
    name: 'EntryPage',
    importFn: () => import('../../pages/EntryPage'),
    priority: 9
  },
  {
    name: 'SearchPage',
    importFn: () => import('../../pages/SearchPage'),
    priority: 8
  },
  {
    name: 'ExitPage',
    importFn: () => import('../../pages/ExitPage'),
    priority: 7
  },
  {
    name: 'ReportsPage',
    importFn: () => import('../../pages/ReportsPage'),
    priority: 6
  },
  {
    name: 'SettingsPage',
    importFn: () => import('../../pages/SettingsPage'),
    priority: 5
  },
  {
    name: 'UserManagement',
    importFn: () => import('../../pages/UserManagement'),
    priority: 4 // Lower priority - admin feature
  }
]

export default {
  LazyDashboard,
  LazyEntryPage,
  LazyExitPage,
  LazySearchPage,
  LazyReportsPage,
  LazySettingsPage,
  LazyUserManagement,
  LazyBusinessRulesTab,
  withLazyLoading,
  preloadComponent,
  useProgressiveLoading,
  routePreloadConfig
}