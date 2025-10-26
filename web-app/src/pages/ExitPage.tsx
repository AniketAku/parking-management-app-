import React, { useState, useMemo, useRef } from 'react'
import { VehicleExitForm } from '../components/forms/VehicleExitForm'
import { useParkingData } from '../hooks/useParkingData'
import { Card, CardHeader, CardContent } from '../components/ui'

export const ExitPage: React.FC = () => {
  // Load real parking data from database
  const { entries, loading, error } = useParkingData()

  // Search state for dynamic filtering
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVehicleNumber, setSelectedVehicleNumber] = useState('')

  // Ref to scroll to exit form when vehicle is selected
  const exitFormRef = useRef<HTMLDivElement>(null)

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

  // Dynamic search and filter - searches last 4 digits of vehicle number
  const filteredVehicles = useMemo(() => {
    if (!searchQuery.trim()) return parkedVehicles

    const query = searchQuery.trim().toLowerCase()

    return parkedVehicles.filter((entry: any) => {
      const vehicleNumber = entry.vehicleNumber.toLowerCase().replace(/\s/g, '')

      // Search by last 4 digits
      const last4Digits = vehicleNumber.slice(-4)
      if (last4Digits.includes(query)) return true

      // Also search full vehicle number for flexibility
      if (vehicleNumber.includes(query)) return true

      // Search transport name
      if (entry.transportName.toLowerCase().includes(query)) return true

      return false
    }).sort((a: any, b: any) => {
      // Sort by relevance: exact last 4 match first, then by entry time
      const aNum = a.vehicleNumber.toLowerCase().replace(/\s/g, '')
      const bNum = b.vehicleNumber.toLowerCase().replace(/\s/g, '')
      const aLast4 = aNum.slice(-4)
      const bLast4 = bNum.slice(-4)

      const aExactMatch = aLast4 === query
      const bExactMatch = bLast4 === query

      if (aExactMatch && !bExactMatch) return -1
      if (!aExactMatch && bExactMatch) return 1

      // Sort by most recent entry time
      return new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime()
    })
  }, [parkedVehicles, searchQuery])

  // Handle vehicle card click - populate exit form and scroll to it
  const handleVehicleClick = (vehicleNumber: string) => {
    setSelectedVehicleNumber(vehicleNumber)

    // Scroll to exit form
    setTimeout(() => {
      exitFormRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }, 100)
  }

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

      {/* Quick Search Section - Search by Last 4 Digits */}
      {parkedVehicles.length > 0 && (
        <Card className="border-2 border-primary-200 bg-primary-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">
                Quick Vehicle Search
              </h3>
              <span className="text-sm text-text-secondary">
                Search by last 4 digits or vehicle number
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type last 4 digits (e.g., 1234) or full vehicle number..."
                  className="w-full px-4 py-3 border-2 border-primary-300 rounded-lg focus:outline-none focus:border-primary-500 transition-colors text-base placeholder-text-muted"
                  autoFocus
                />
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-3 text-text-secondary hover:text-text-primary transition-colors"
                  title="Clear search"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="mt-2 text-sm text-text-secondary">
                {filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? 's' : ''} found
                {filteredVehicles.length > 0 && ' - Click to select'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Exit Form - with ref for scrolling */}
      <div ref={exitFormRef}>
        <VehicleExitForm
          selectedVehicleNumber={selectedVehicleNumber}
          onVehicleProcessed={() => setSelectedVehicleNumber('')}
          hideSearch={true}
        />
      </div>

      {/* Parked Vehicles Grid - Filtered and Clickable */}
      {parkedVehicles.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-text-primary">
              {searchQuery ? `Search Results (${filteredVehicles.length})` : `Currently Parked Vehicles (${parkedVehicles.length})`}
            </h3>
          </CardHeader>
          <CardContent>
            {filteredVehicles.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 mx-auto text-text-muted mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-text-secondary">No vehicles found matching "{searchQuery}"</p>
                <p className="text-sm text-text-muted mt-1">Try searching with different digits or vehicle number</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(searchQuery ? filteredVehicles : filteredVehicles.slice(0, 6)).map((entry: any) => {
                    const last4Digits = entry.vehicleNumber.replace(/\s/g, '').slice(-4)
                    return (
                      <div
                        key={entry.id}
                        onClick={() => handleVehicleClick(entry.vehicleNumber)}
                        className="p-4 border-2 border-border-light rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all cursor-pointer group"
                        title="Click to select this vehicle for exit"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-text-primary group-hover:text-primary-600 transition-colors">
                            {entry.vehicleNumber}
                          </h4>
                          <span className="text-xs bg-success-100 text-success-800 px-2 py-1 rounded-full">
                            {entry.vehicleType}
                          </span>
                        </div>
                        <p className="text-sm text-text-secondary mb-1">{entry.transportName}</p>
                        <p className="text-xs text-text-muted">
                          Entry: {new Date(entry.entryTime).toLocaleDateString()} {new Date(entry.entryTime).toLocaleTimeString()}
                        </p>
                        <div className="mt-3 pt-2 border-t border-border-light">
                          <p className="text-xs text-primary-600 group-hover:text-primary-700 font-medium flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            Click to process exit
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {!searchQuery && parkedVehicles.length > 6 && (
                  <p className="text-center text-text-secondary mt-4">
                    Showing 6 of {parkedVehicles.length} vehicles. Use search above to find specific vehicles.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}