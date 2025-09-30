import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import EntryTicket from './EntryTicket';
import ExitReceipt from './ExitReceipt';
import ThermalTicket from './ThermalTicket';
import type { EntryTicketProps, ExitReceiptProps, ThermalTicketProps, PrintSettings } from '../../types/ticket';

interface TicketPrinterProps {
  ticketType: 'entry' | 'exit' | 'thermal';
  ticketData: EntryTicketProps | ExitReceiptProps | ThermalTicketProps;
  printSettings?: PrintSettings;
  onPrintStart?: () => void;
  onPrintComplete?: () => void;
  onPrintError?: (error: Error) => void;
}

const TicketPrinter: React.FC<TicketPrinterProps> = ({
  ticketType,
  ticketData,
  printSettings = {
    paperSize: 'A4',
    orientation: 'portrait',
    margins: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
  },
  onPrintStart,
  onPrintComplete,
  onPrintError
}) => {
  const ticketRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: ticketRef,
    documentTitle: `${ticketType.toUpperCase()}_${ticketData.ticketNumber}`,
    onBeforeGetContent: () => {
      onPrintStart?.();
      return Promise.resolve();
    },
    onAfterPrint: () => {
      onPrintComplete?.();
    },
    onPrintError: (errorLocation, error) => {
      onPrintError?.(new Error(`Print error at ${errorLocation}: ${error}`));
    },
    pageStyle: `
      @page {
        size: ${printSettings.paperSize === 'thermal-2.75' ? '2.75in auto' : 
               printSettings.paperSize === 'thermal-3' ? '3in auto' : 'A4'};
        margin: ${printSettings.margins.top} ${printSettings.margins.right} ${printSettings.margins.bottom} ${printSettings.margins.left};
      }
      
      @media print {
        body { 
          -webkit-print-color-adjust: exact; 
          print-color-adjust: exact;
        }
        
        ${printSettings.paperSize.includes('thermal') ? `
          .ticket-container {
            width: 100%;
            max-width: none;
            margin: 0;
            padding: 0.1in;
            border: none;
            font-size: 9px;
          }
        ` : ''}
      }
    `
  });

  const renderTicket = () => {
    switch (ticketType) {
      case 'entry':
        return <EntryTicket {...(ticketData as EntryTicketProps)} />;
      case 'exit':
        return <ExitReceipt {...(ticketData as ExitReceiptProps)} />;
      case 'thermal':
        return <ThermalTicket {...(ticketData as ThermalTicketProps)} />;
      default:
        return null;
    }
  };

  return (
    <div className="ticket-printer-container">
      <div className="ticket-preview">
        <div ref={ticketRef}>
          {renderTicket()}
        </div>
      </div>
      
      <div className="print-controls">
        <button 
          className="btn-primary print-button"
          onClick={handlePrint}
          type="button"
        >
          Print {ticketType.charAt(0).toUpperCase() + ticketType.slice(1)}
        </button>
      </div>
    </div>
  );
};

export default TicketPrinter;