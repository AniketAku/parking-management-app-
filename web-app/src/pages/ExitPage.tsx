import React from 'react'
import { VehicleExitForm } from '../components/forms/VehicleExitForm'
import { useParkingData } from '../hooks/useParkingData'
import { Card, CardHeader, CardContent } from '../components/ui'

export const ExitPage: React.FC = () => {
  // Load real parking data from database
  const { entries, loading, error } = useParkingData()
  
  const parkedVehicles = entries.filter((entry: any) => entry.status === 'Active' || entry.status === 'Parked')
  const todayExits = entries.filter((entry: any) => {
    if (entry.status !== 'Exited') return false
    const exitDate = entry.exitTime ? new Date(entry.exitTime) : null
    const today = new Date()
    return exitDate && 
           exitDate.getDate() === today.getDate() &&
           exitDate.getMonth() === today.getMonth() &&
           exitDate.getFullYear() === today.getFullYear()
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">
          Vehicle Exit
        </h1>
        
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-success-600">
              {loading ? '...' : parkedVehicles.length}
            </div>
            <div className="text-sm text-text-secondary">Currently Parked</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600">
              {loading ? '...' : todayExits.length}
            </div>
            <div className="text-sm text-text-secondary">Today's Exits</div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-error-50 border border-error-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-error-700 font-medium">
              Failed to load parking data: {error}
            </span>
          </div>
        </div>
      )}

      <VehicleExitForm />
      
      {parkedVehicles.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">
              Currently Parked Vehicles ({parkedVehicles.length})
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {parkedVehicles.slice(0, 6).map((entry: any) => (
                <div key={entry.id} className="p-4 border border-border-light rounded-lg hover:bg-surface-light transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-text-primary">{entry.vehicleNumber}</h4>
                    <span className="text-xs bg-success-100 text-success-800 px-2 py-1 rounded-full">
                      {entry.vehicleType}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mb-1">{entry.transportName}</p>
                  <p className="text-xs text-text-muted">
                    Entry: {new Date(entry.entryTime).toLocaleDateString()} {new Date(entry.entryTime).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
            {parkedVehicles.length > 6 && (
              <p className="text-center text-text-secondary mt-4">
                And {parkedVehicles.length - 6} more vehicles...
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}