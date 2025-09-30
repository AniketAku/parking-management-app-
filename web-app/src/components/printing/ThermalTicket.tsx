import React from 'react';
import type { ThermalTicketProps } from '../../types/ticket';
import './TicketStyles.css';

const ThermalTicket: React.FC<ThermalTicketProps> = ({
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
  ticketType
}) => {
  return (
    <div className="thermal-ticket ticket-container">
      <div className="thermal-header">
        <div className="business-name-thermal">{businessName}</div>
        <div className="facility-name-thermal">{facilityName}</div>
        <div className="location-thermal">{location}</div>
        <div className="contact-thermal">Tel: {contactPhone}</div>
      </div>

      <div className="thermal-divider">================================</div>

      <div className="thermal-ticket-number">
        {ticketType === 'entry' ? 'TICKET' : 'RECEIPT'} #{ticketNumber}
      </div>

      <div className="thermal-title">
        {ticketType === 'entry' ? 'PARKING TICKET' : 'PARKING RECEIPT'}
      </div>

      <div className="thermal-divider">================================</div>

      <div className="thermal-fields">
        <div className="thermal-field-row">
          <span className="thermal-label">Vehicle:</span>
          <span className="thermal-value">{vehicleNumber}</span>
        </div>
        
        <div className="thermal-field-row">
          <span className="thermal-label">Date:</span>
          <span className="thermal-value">{date}</span>
        </div>
        
        <div className="thermal-field-row">
          <span className="thermal-label">Type:</span>
          <span className="thermal-value">{vehicleType}</span>
        </div>
        
        <div className="thermal-field-row">
          <span className="thermal-label">In:</span>
          <span className="thermal-value">{inTime}</span>
        </div>
        
        {ticketType === 'exit' && outTime && (
          <div className="thermal-field-row">
            <span className="thermal-label">Out:</span>
            <span className="thermal-value">{outTime}</span>
          </div>
        )}
        
        {ticketType === 'exit' && receivedAmount && (
          <div className="thermal-field-row thermal-amount">
            <span className="thermal-label">Paid:</span>
            <span className="thermal-value">Rs. {receivedAmount}</span>
          </div>
        )}
      </div>

      <div className="thermal-divider">================================</div>

      <div className="thermal-footer">
        <div className="thermal-terms">
          {ticketType === 'entry' ? (
            <>
              <div>• Vehicle at owner's risk</div>
              <div>• Keep ticket safe</div>
              <div>• Present at exit</div>
            </>
          ) : (
            <>
              <div>• Thank you</div>
              <div>• Keep receipt</div>
              <div>• No refund</div>
            </>
          )}
        </div>
        
        <div className="thermal-signature">
          _______________________
          <br />
          Agency Signature
        </div>
      </div>

      <div className="thermal-cut-line">
        - - - - - - - - - - - - - - - - - -
      </div>
    </div>
  );
};

export default ThermalTicket;