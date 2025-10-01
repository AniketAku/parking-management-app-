import React from 'react'
import { Card, CardHeader, CardContent } from '../ui'
// import { Button } from '../ui/Button'
import { getVehicleTypeColor, calculateDuration } from '../../utils/helpers'
import { isCurrentlyParked } from '../../utils/statusHelpers'
import type { ParkingEntry } from '../../types'

interface ParkingOverviewProps {
  entries: ParkingEntry[]
  loading?: boolean
}

interface VehicleGridItemProps {
  entry: ParkingEntry
  onClick?: () => void
}

const VehicleGridItem: React.FC<VehicleGridItemProps> = ({ entry, onClick }) => {
  const duration = calculateDuration(entry.entryTime)

  return (
    <div
      onClick={onClick}
      className={`
        relative p-3 rounded-lg border-2 cursor-pointer transition-all duration-200
        hover:shadow-md hover:scale-105
        border-success-300 bg-success-50
      `}
    >
      {/* Vehicle Number */}
      <div className="font-semibold text-sm text-text-primary mb-1">
        {entry.vehicleNumber}
      </div>
      
      {/* Vehicle Type Badge */}
      <div className="flex items-center justify-between mb-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getVehicleTypeColor(entry.vehicleType)}`}>
          {entry.vehicleType}
        </span>
      </div>
      
      {/* Duration */}
      <div className="text-xs text-text-muted">
        {duration}
      </div>
      
      {/* Transport Name */}
      <div className="text-xs text-text-secondary font-medium truncate mt-1">
        {entry.transportName}
      </div>
    </div>
  )
}

export const ParkingOverview: React.FC<ParkingOverviewProps> = ({
  entries,
  loading = false
}) => {
  const parkedVehicles = entries.filter(entry => isCurrentlyParked(entry.status))

  // Group by vehicle type for display
  const vehiclesByType = parkedVehicles.reduce((acc, entry) => {
    acc[entry.vehicleType] = (acc[entry.vehicleType] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const handleVehicleClick = (entry: ParkingEntry) => {
    // Could navigate to vehicle details or show modal
    console.log('Vehicle clicked:', entry)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">Parking Overview</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-20 bg-surface-muted rounded-lg animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (parkedVehicles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary">Parking Overview</h3>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-surface-muted rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-text-primary mb-2">No Parked Vehicles</h4>
            <p className="text-text-muted mb-4">The parking lot is currently empty</p>
            <button className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm">
              Register First Vehicle
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Parking Overview</h3>
            <p className="text-sm text-text-muted mt-1">
              {parkedVehicles.length} vehicles currently parked
            </p>
          </div>
          <button className="px-3 py-1.5 border border-border-light rounded-lg hover:bg-surface-light transition-colors text-sm">
            View All
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Vehicle Type Summary */}
        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-border-light">
          {Object.entries(vehiclesByType).map(([type, count]) => (
            <div key={type} className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getVehicleTypeColor(type as any)}`}>
              <span>{type}: {count}</span>
            </div>
          ))}
        </div>

        {/* Vehicle Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {parkedVehicles.slice(0, 12).map((entry) => (
            <VehicleGridItem
              key={entry.id}
              entry={entry}
              onClick={() => handleVehicleClick(entry)}
            />
          ))}
        </div>

        {parkedVehicles.length > 12 && (
          <div className="mt-4 text-center">
            <button className="px-3 py-1.5 border border-border-light rounded-lg hover:bg-surface-light transition-colors text-sm">
              Show {parkedVehicles.length - 12} more vehicles
            </button>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-border-light">
          <div className="flex items-center space-x-6 text-xs text-text-muted">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-success-200 border-success-300 border-2 rounded"></div>
              <span>Normal</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-warning-200 border-warning-300 border-2 rounded"></div>
              <span>Overstaying (24h+)</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>⚠️</span>
              <span>Requires attention</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}