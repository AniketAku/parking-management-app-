export interface TicketBaseProps {
  businessName: string;
  facilityName: string;
  location: string;
  contactPhone: string;
  ticketNumber: string;
  vehicleNumber: string;
  date: string;
  vehicleType: string;
}

export interface EntryTicketProps extends TicketBaseProps {
  inTime: string;
}

export interface ExitReceiptProps extends TicketBaseProps {
  inTime: string;
  outTime: string;
  receivedAmount: string;
  duration?: string;
  rate?: string;
}

export interface ThermalTicketProps extends TicketBaseProps {
  inTime: string;
  outTime?: string;
  receivedAmount?: string;
  ticketType: 'entry' | 'exit';
}

export interface PrintSettings {
  paperSize: 'A4' | 'thermal-2.75' | 'thermal-3';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
}