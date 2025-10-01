import React from 'react';
import type { EntryTicketProps } from '../../types/ticket';
import './TicketStyles.css';

const EntryTicket: React.FC<EntryTicketProps> = ({
  businessName,
  facilityName,
  location,
  contactPhone,
  ticketNumber,
  vehicleNumber,
  date,
  vehicleType,
  inTime
}) => {
  return (
    <div className="entry-ticket ticket-container">
      <div className="ticket-header">
        <div className="business-name">{businessName}</div>
        <div className="facility-name">{facilityName}</div>
        <div className="location">{location}</div>
        <div className="contact">Tel: {contactPhone}</div>
      </div>

      <div className="ticket-number">
        TICKET NO. {ticketNumber}
      </div>

      <div className="ticket-title">PARKING TICKET</div>

      <div className="form-fields">
        <div className="field-row">
          <span className="field-label">Vehicle No.</span>
          <span className="field-value">{vehicleNumber}</span>
        </div>
        
        <div className="field-row">
          <span className="field-label">Date:</span>
          <span className="field-value">{date}</span>
        </div>
        
        <div className="field-row">
          <span className="field-label">Type of Vehicle</span>
          <span className="field-value">{vehicleType}</span>
        </div>
        
        <div className="field-row">
          <span className="field-label">In Time</span>
          <span className="field-value">{inTime}</span>
        </div>
        
        <div className="field-row">
          <span className="field-label">Out Time</span>
          <span className="field-value">_________________</span>
        </div>
        
        <div className="field-row">
          <span className="field-label">Received Rs.</span>
          <span className="field-value">_________________</span>
        </div>
      </div>

      <div className="signature-section">
        <div className="signature-line">
          Signature of Agency
        </div>
      </div>

      <div className="ticket-footer">
        <div className="terms">
          • Vehicle parked at owner's risk
          • Lost ticket will be charged full day rate
          • Ticket must be produced at exit
        </div>
      </div>
    </div>
  );
};

export default EntryTicket;