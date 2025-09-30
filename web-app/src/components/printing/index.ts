export { ParkingTicket, DEFAULT_BUSINESS_INFO } from './ParkingTicket'
export { PrintModal } from './PrintModal'
export { default as EntryTicket } from './EntryTicket';
export { default as ExitReceipt } from './ExitReceipt';
export { default as ThermalTicket } from './ThermalTicket';
export { default as TicketPrinter } from './TicketPrinter';
export { default as TicketPreview } from './TicketPreview';
export { default as PrintQueueManager } from './PrintQueueManager';
export { default as PrintQueueStatus } from './PrintQueueStatus';

// Thermal Printing Components
export { default as ThermalPrinterManager } from './ThermalPrinterManager';
export { default as ThermalPrintDemo } from './ThermalPrintDemo';

// Types
export type { ParkingTicketProps } from './ParkingTicket'
export type { 
  EntryTicketProps, 
  ExitReceiptProps, 
  ThermalTicketProps, 
  TicketBaseProps,
  PrintSettings 
} from '../../types/ticket';
export type {
  PrintJob,
  PrintQueueStatus as PrintQueueStatusType,
  PrinterProfile,
  PrintJobCreate,
  PrintHistoryFilters
} from '../../types/printQueue';
export type {
  ParkingTicketData,
  ThermalPrinterService,
  ThermalPrinterProfile,
  PrinterStatus,
  PrintResult,
  ThermalPrinterCapabilities,
  ThermalPrinterSettings
} from '../../types/thermalPrinter';