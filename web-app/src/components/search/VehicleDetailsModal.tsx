import React from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal'
import { Badge, StatusBadge } from '../ui/badge'
import {
  formatDateTime,
  formatCurrency,
  getVehicleTypeColor,
  calculateDuration,
  getRevenueAmount,
  hasManualAmount,
  getRevenueSource
} from '../../utils/helpers'
import { isCurrentlyParked } from '../../utils/statusHelpers'
import type { ParkingEntry } from '../../types'

interface VehicleDetailsModalProps {
  entry: ParkingEntry | null
  isOpen: boolean
  onClose: () => void
  onProcessExit?: (entry: ParkingEntry) => void
  onEdit?: (entry: ParkingEntry) => void
}

export const VehicleDetailsModal: React.FC<VehicleDetailsModalProps> = ({
  entry,
  isOpen,
  onClose,
  onProcessExit,
  onEdit
}) => {
  if (!entry) return null


  const duration = isCurrentlyParked(entry.status)
    ? calculateDuration(entry.entryTime)
    : entry.exitTime
      ? calculateDuration(entry.entryTime, entry.exitTime)
      : 'N/A'

  const getStatusBadge = () => {
    if (isCurrentlyParked(entry.status)) {
      return (
        <StatusBadge 
          status={entry.status}
        />
      )
    }
    return <StatusBadge status={entry.status} />
  }

  const getPaymentBadge = () => {
    return <StatusBadge status={entry.paymentStatus} />
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text-primary">
            Vehicle Details
          </h2>
          <div className="flex items-center space-x-2">
            {getStatusBadge()}
            <Badge 
              variant="secondary" 
              className={getVehicleTypeColor(entry.vehicleType)}
            >
              {entry.vehicleType}
            </Badge>
          </div>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className="space-y-6">
          {/* Vehicle Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-text-primary border-b border-border-light pb-2">
                Vehicle Information
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-text-secondary">
                    Vehicle Number
                  </label>
                  <p className="mt-1 text-lg font-semibold text-text-primary">
                    {entry.vehicleNumber}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary">
                    Transport Company
                  </label>
                  <p className="mt-1 text-base text-text-primary">
                    {entry.transportName}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary">
                    Driver Name
                  </label>
                  <p className="mt-1 text-base text-text-primary">
                    {entry.driverName}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary">
                    Vehicle Type
                  </label>
                  <p className="mt-1">
                    <Badge 
                      variant="secondary" 
                      className={getVehicleTypeColor(entry.vehicleType)}
                    >
                      {entry.vehicleType}
                    </Badge>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-text-primary border-b border-border-light pb-2">
                Parking Details
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-text-secondary">
                    Entry Time
                  </label>
                  <p className="mt-1 text-base text-text-primary">
                    {formatDateTime(entry.entryTime)}
                  </p>
                </div>
                
                {entry.exitTime && (
                  <div>
                    <label className="block text-sm font-medium text-text-secondary">
                      Exit Time
                    </label>
                    <p className="mt-1 text-base text-text-primary">
                      {formatDateTime(entry.exitTime)}
                    </p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary">
                    Parking Duration
                  </label>
                  <p className="mt-1 text-base text-text-primary">
                    {duration}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary">
                    Current Status
                  </label>
                  <p className="mt-1">
                    {getStatusBadge()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="border-t border-border-light pt-6">
            <h3 className="text-lg font-medium text-text-primary mb-4">
              Payment Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary">
                  Payment Status
                </label>
                <p className="mt-1">
                  {getPaymentBadge()}
                </p>
              </div>
              
              {entry.paymentType && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary">
                    Payment Method
                  </label>
                  <p className="mt-1 text-base text-text-primary">
                    {entry.paymentType}
                  </p>
                </div>
              )}
              
              {getRevenueAmount(entry) > 0 && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary">
                    {hasManualAmount(entry) ? 'Amount Received' : 'Calculated Fee'} 
                    <span className="text-xs text-text-muted ml-1">({getRevenueSource(entry)})</span>
                  </label>
                  <p className="mt-1 text-lg font-semibold text-success-600">
                    {formatCurrency(getRevenueAmount(entry))}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Additional Notes */}
          {entry.notes && (
            <div className="border-t border-border-light pt-6">
              <h3 className="text-lg font-medium text-text-primary mb-2">
                Notes
              </h3>
              <div className="bg-surface-light rounded-lg p-4">
                <p className="text-base text-text-primary whitespace-pre-wrap">
                  {entry.notes}
                </p>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="border-t border-border-light pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-text-muted">
              <div>
                <span className="font-medium">Created:</span> {formatDateTime(entry.createdAt)}
              </div>
              <div>
                <span className="font-medium">Last Updated:</span> {formatDateTime(entry.updatedAt)}
              </div>
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <div className="flex items-center justify-between w-full">
          <div className="flex space-x-3">
            {onEdit && (
              <button
                onClick={() => onEdit(entry)}
                className="px-4 py-2 text-sm border border-border-light rounded-lg hover:bg-surface-light transition-colors"
              >
                Edit Details
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-border-light rounded-lg hover:bg-surface-light transition-colors"
            >
              Close
            </button>
            
            {isCurrentlyParked(entry.status) && onProcessExit && (
              <button
                onClick={() => onProcessExit(entry)}
                className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Process Exit
              </button>
            )}
          </div>
        </div>
      </ModalFooter>
    </Modal>
  )
}