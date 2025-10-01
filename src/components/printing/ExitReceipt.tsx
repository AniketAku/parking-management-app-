import React from 'react';
import type { ExitReceiptProps } from '../../types/ticket';
import './TicketStyles.css';

const ExitReceipt: React.FC<ExitReceiptProps> = ({
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
  duration,
  rate
}) => {
  return (
    <div className="exit-receipt ticket-container">
      <div className="ticket-header">
        <div className="business-name">{businessName}</div>
        <div className="facility-name">{facilityName}</div>
        <div className="location">{location}</div>
        <div className="contact">Tel: {contactPhone}</div>
      </div>

      <div className="ticket-number">
        RECEIPT NO. {ticketNumber}
      </div>

      <div className="receipt-title">PARKING RECEIPT</div>

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
          <span className="field-value">{outTime}</span>
        </div>
        
        {duration && (
          <div className="field-row">
            <span className="field-label">Duration</span>
            <span className="field-value">{duration}</span>
          </div>
        )}
        
        {rate && (
          <div className="field-row">
            <span className="field-label">Rate</span>
            <span className="field-value">Rs. {rate}</span>
          </div>
        )}
        
        <div className="field-row amount-row">
          <span className="field-label">Amount Paid Rs.</span>
          <span className="field-value amount-value">{receivedAmount}</span>
        </div>
      </div>

      <div className="signature-section">
        <div className="signature-line">
          Signature of Agency
        </div>
      </div>

      <div className="ticket-footer">
        <div className="thank-you">Thank you for using our parking facility</div>
        <div className="terms">
          • Please keep this receipt for your records
          • No refund after vehicle exit
        </div>
      </div>
    </div>
  );
};

export default ExitReceipt;