import React from 'react'
import { PageHeader } from '../components/ui'
import { PerformanceDashboard } from '../components/monitoring/PerformanceDashboard'
import { usePerformance } from '../hooks/usePerformance'

const PerformancePage: React.FC = () => {
  const { metrics } = usePerformance({
    componentName: 'PerformancePage',
    trackRenders: true,
    trackMemory: true,
    trackNetwork: true
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance Monitoring"
        subtitle="Real-time performance metrics and optimization insights"
      />
      
      <div className="grid grid-cols-1 gap-6">
        {/* Performance Dashboard */}
        <div className="bg-white rounded-lg shadow-sm border">
          <PerformanceDashboard 
            autoStart={true}
            refreshInterval={5000}
            className="p-6"
          />
        </div>
        
        {/* Current Page Metrics */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Current Page Performance
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-1">
                Render Count
              </h4>
              <p className="text-2xl font-bold text-blue-600">
                {metrics.renderCount || 0}
              </p>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-1">
                Average Render Time
              </h4>
              <p className="text-2xl font-bold text-green-600">
                {metrics.renderTime ? `${metrics.renderTime.toFixed(2)}ms` : 'N/A'}
              </p>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-1">
                Memory Usage
              </h4>
              <p className="text-2xl font-bold text-purple-600">
                {metrics.memoryUsage ? `${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB` : 'N/A'}
              </p>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-1">
                Bundle Size
              </h4>
              <p className="text-2xl font-bold text-orange-600">
                {metrics.bundleSize ? `${(metrics.bundleSize / 1024).toFixed(1)}KB` : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PerformancePage