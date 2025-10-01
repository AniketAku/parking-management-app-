import React from 'react'

export interface ParkingTicketProps {
  // Business Information
  businessName: string        // "Shree Sai"
  facilityName: string       // "Vansh Truck Parking"
  location: string           // "@Additional MIDC Mandwa"
  contactPhone: string       // "M. 9860254266"
  
  // Ticket Details
  ticketNumber: string       // "13124" - prominent red display
  vehicleNumber: string      // Vehicle registration
  date: string              // Entry date
  vehicleType: string       // Type of vehicle
  inTime: string           // Entry time
  outTime?: string         // Exit time (for exit receipts)
  receivedAmount?: number  // Payment amount
  
  // Print Configuration
  ticketType: 'entry' | 'exit' | 'receipt'
  copies?: number
  showSignatureLine?: boolean
}

export const ParkingTicket: React.FC<ParkingTicketProps> = ({
  businessName,
  facilityName,
  location,
  contactPhone,
  ticketNumber,
  vehicleNumber,
  date,
  vehicleType,
  inTime,
  outTime,
  receivedAmount,
  ticketType,
  copies = 1,
  showSignatureLine = true
}) => {
  // Generate multiple copies if needed
  const tickets = Array.from({ length: copies }, (_, index) => (
    <div key={index} className={`parking-ticket ${index > 0 ? 'page-break' : ''}`}>
      {/* Ticket Header */}
      <div className="ticket-header">
        <div className="business-name">{businessName}</div>
        <div className="facility-name">{facilityName}</div>
        <div className="location-contact">{location}</div>
        <div className="location-contact">{contactPhone}</div>
      </div>
      
      {/* Prominent Ticket Number */}
      <div className="ticket-number">{ticketNumber}</div>
      
      {/* Form Fields */}
      <div className="form-fields">
        <div className="field-row">
          <span className="field-label">Vehicle No.:</span>
          <span className="field-value">{vehicleNumber}</span>
        </div>
        
        <div className="field-row">
          <span className="field-label">Date:</span>
          <span className="field-value">{date}</span>
        </div>
        
        <div className="field-row">
          <span className="field-label">Type of Vehicle:</span>
          <span className="field-value">{vehicleType}</span>
        </div>
        
        <div className="field-row">
          <span className="field-label">In Time:</span>
          <span className="field-value">{inTime}</span>
        </div>
        
        <div className="field-row">
          <span className="field-label">Out Time:</span>
          <span className="field-value">
            {outTime || '_____________'}
          </span>
        </div>
        
        <div className="field-row">
          <span className="field-label">Received Rs.:</span>
          <span className="field-value">
            {receivedAmount ? `₹${receivedAmount}` : '_____________'}
          </span>
        </div>
      </div>
      
      {/* Amount Section for Exit Tickets */}
      {ticketType === 'exit' && receivedAmount && (
        <div className="amount-section">
          <div className="amount-label">TOTAL AMOUNT</div>
          <div className="amount-value">₹{receivedAmount}</div>
        </div>
      )}
      
      {/* Signature Section */}
      {showSignatureLine && (
        <div className="signature-section">
          Signature of Agency
        </div>
      )}
    </div>
  ))

  return (
    <div className="ticket-container">
      {tickets}
    </div>
  )
}

// Default business information
export const DEFAULT_BUSINESS_INFO = {
  businessName: "Shree Sai",
  facilityName: "Vansh Truck Parking",
  location: "@Additional MIDC Mandwa",
  contactPhone: "M. 9860254266"
}