import React, { useState } from 'react'
import { VehicleEntryForm } from '../components/forms'
import { Button } from '../components/ui'
import { PrintModal } from '../components/printing'
import type { ParkingEntry } from '../types'
import { useParkingStore } from '../stores/parkingStore'

export const EntryPage: React.FC = () => {
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [lastEntry, setLastEntry] = useState<ParkingEntry | null>(null)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const statistics = useParkingStore(state => state.statistics)

  const handleEntrySuccess = (entry: ParkingEntry) => {
    setLastEntry(entry)
    setShowSuccessMessage(true)
    
    // Hide success message after 5 seconds
    setTimeout(() => {
      setShowSuccessMessage(false)
    }, 5000)
  }

  const handleNewEntry = () => {
    setShowSuccessMessage(false)
    setLastEntry(null)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Vehicle Entry
          </h1>
          <p className="text-text-muted mt-1">
            Register new vehicles for parking
          </p>
        </div>
        
        {/* Quick Stats */}
        <div className="flex items-center space-x-6 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600">
              {statistics.parkedVehicles}
            </div>
            <div className="text-text-muted">Currently Parked</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success-600">
              {statistics.todayEntries}
            </div>
            <div className="text-text-muted">Today's Entries</div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {showSuccessMessage && lastEntry && (
        <div className="bg-success-50 border border-success-200 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-success-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-success-800">
                Vehicle Parked Successfully!
              </h3>
              <div className="mt-2 text-sm text-success-700">
                <p>
                  <strong>{lastEntry.vehicleNumber}</strong> ({lastEntry.vehicleType}) 
                  has been registered for parking. Daily rate: <strong>₹{lastEntry.calculatedFee}</strong>
                </p>
              </div>
              <div className="mt-4 flex gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPrintModal(true)}
                >
                  🖨️ Print Entry Ticket
                </Button>
                <Button
                  size="sm"
                  variant="success"
                  onClick={handleNewEntry}
                >
                  Register Another Vehicle
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Entry Form */}
      <VehicleEntryForm 
        onSuccess={handleEntrySuccess}
      />

      {/* Instructions */}
      <div className="bg-info-50 rounded-lg p-6">
        <h3 className="text-info-800 font-medium mb-3">
          Entry Instructions
        </h3>
        <div className="text-info-700 text-sm space-y-2">
          <ul className="list-disc list-inside space-y-1">
            <li>Ensure all vehicle details are accurate before submitting</li>
            <li>Vehicle number will be automatically formatted</li>
            <li>Daily parking rates are automatically calculated based on vehicle type</li>
            <li>Payment collection can be done during exit processing</li>
            <li>Additional notes can be added for special instructions</li>
          </ul>
        </div>
      </div>

      {/* Print Modal */}
      {showPrintModal && lastEntry && (
        <PrintModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          entryData={{
            id: lastEntry.id,
            vehicle_number: lastEntry.vehicleNumber,
            vehicle_type: lastEntry.vehicleType,
            entry_time: lastEntry.entryTime,
            serial: lastEntry.serial
          }}
          ticketType="entry"
        />
      )}
    </div>
  )
}