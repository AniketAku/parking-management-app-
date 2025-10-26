import type { ParkingEntry } from '../types';
import type { EntryTicketProps, ExitReceiptProps, ThermalTicketProps } from '../types/ticket';
import { log } from './secureLogger';

// Default business information - customize as needed
const DEFAULT_BUSINESS_INFO = {
  businessName: "PARKING MANAGEMENT SYSTEM",
  facilityName: "Main Parking Facility",
  location: "123 Main Street, City",
  contactPhone: "+1-234-567-8900"
};

/**
 * Generate ticket number based on entry ID and timestamp
 */
export const generateTicketNumber = (entryId: string): string => {
  const timestamp = new Date().getTime().toString().slice(-6);
  const idSuffix = entryId.slice(-4).toUpperCase();
  return `T${timestamp}${idSuffix}`;
};

/**
 * Format time for ticket display
 */
export const formatTicketTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Format date for ticket display
 */
export const formatTicketDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

/**
 * Calculate parking duration in hours and minutes
 */
export const calculateParkingDuration = (entryTime: Date, exitTime: Date): string => {
  const diffMs = exitTime.getTime() - entryTime.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m`;
  }
  return `${diffMinutes}m`;
};

/**
 * Create entry ticket data from parking entry
 */
export const createEntryTicketData = (
  entry: ParkingEntry,
  businessInfo = DEFAULT_BUSINESS_INFO
): EntryTicketProps => {
  return {
    ...businessInfo,
    ticketNumber: generateTicketNumber(entry.id),
    vehicleNumber: entry.vehicleNumber,
    date: formatTicketDate(entry.entryTime),
    vehicleType: entry.vehicleType,
    inTime: formatTicketTime(entry.entryTime)
  };
};

/**
 * Create exit receipt data from parking entry
 */
export const createExitReceiptData = (
  entry: ParkingEntry,
  businessInfo = DEFAULT_BUSINESS_INFO
): ExitReceiptProps => {
  if (!entry.exitTime) {
    throw new Error('Exit time is required for exit receipt');
  }

  const duration = calculateParkingDuration(entry.entryTime, entry.exitTime);
  const amount = entry.actualFee || entry.amountPaid || entry.calculatedFee || 0;
  
  return {
    ...businessInfo,
    ticketNumber: generateTicketNumber(entry.id),
    vehicleNumber: entry.vehicleNumber,
    date: formatTicketDate(entry.entryTime),
    vehicleType: entry.vehicleType,
    inTime: formatTicketTime(entry.entryTime),
    outTime: formatTicketTime(entry.exitTime),
    receivedAmount: amount.toString(),
    duration,
    rate: entry.calculatedFee?.toString()
  };
};

/**
 * Create thermal ticket data from parking entry
 */
export const createThermalTicketData = (
  entry: ParkingEntry,
  ticketType: 'entry' | 'exit',
  businessInfo = DEFAULT_BUSINESS_INFO
): ThermalTicketProps => {
  const baseData: ThermalTicketProps = {
    ...businessInfo,
    ticketNumber: generateTicketNumber(entry.id),
    vehicleNumber: entry.vehicleNumber,
    date: formatTicketDate(entry.entryTime),
    vehicleType: entry.vehicleType,
    inTime: formatTicketTime(entry.entryTime),
    ticketType
  };

  if (ticketType === 'exit' && entry.exitTime) {
    const amount = entry.actualFee || entry.amountPaid || entry.calculatedFee || 0;
    baseData.outTime = formatTicketTime(entry.exitTime);
    baseData.receivedAmount = amount.toString();
  }

  return baseData;
};

/**
 * Get recommended print settings based on ticket type
 */
export const getRecommendedPrintSettings = (ticketType: 'entry' | 'exit' | 'thermal') => {
  switch (ticketType) {
    case 'thermal':
      return {
        paperSize: 'thermal-2.75' as const,
        orientation: 'portrait' as const,
        margins: { top: '0.1in', right: '0.1in', bottom: '0.1in', left: '0.1in' }
      };
    case 'entry':
    case 'exit':
    default:
      return {
        paperSize: 'A4' as const,
        orientation: 'portrait' as const,
        margins: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
      };
  }
};

/**
 * Validate ticket data before printing
 */
export const validateTicketData = (ticketData: any, ticketType: string): boolean => {
  const requiredFields = ['businessName', 'ticketNumber', 'vehicleNumber', 'date', 'vehicleType'];


  for (const field of requiredFields) {
    if (!ticketData[field]) {
      log.error('Missing required field', { field });
      return false;
    }
  }

  if (ticketType === 'exit' && !ticketData.outTime) {
    log.error('Exit time is required for exit receipts');
    return false;
  }

  return true;
};

/**
 * Export ticket data as JSON for backup/storage
 */
export const exportTicketData = (ticketData: any, ticketType: string) => {
  const exportData = {
    ticketType,
    generatedAt: new Date().toISOString(),
    data: ticketData
  };

  return JSON.stringify(exportData, null, 2);
};