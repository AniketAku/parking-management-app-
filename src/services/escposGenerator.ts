/**
 * ESC/POS Command Generator
 * Generates ESC/POS commands for thermal printers with comprehensive formatting support
 */

import type {
  ParkingTicketData,
  ESCPOSCommands,
  TextFormatting,
  ThermalPrinterSettings
} from '../types/thermalPrinter';

export class ESCPOSGenerator {
  private readonly commands: ESCPOSCommands = {
    // Printer initialization and control
    INIT: new Uint8Array([0x1B, 0x40]), // ESC @
    RESET: new Uint8Array([0x1B, 0x40]), // ESC @
    
    // Text formatting
    BOLD_ON: new Uint8Array([0x1B, 0x45, 0x01]), // ESC E 1
    BOLD_OFF: new Uint8Array([0x1B, 0x45, 0x00]), // ESC E 0
    UNDERLINE_ON: new Uint8Array([0x1B, 0x2D, 0x01]), // ESC - 1
    UNDERLINE_OFF: new Uint8Array([0x1B, 0x2D, 0x00]), // ESC - 0
    ITALIC_ON: new Uint8Array([0x1B, 0x34]), // ESC 4
    ITALIC_OFF: new Uint8Array([0x1B, 0x35]), // ESC 5
    
    // Text alignment
    ALIGN_LEFT: new Uint8Array([0x1B, 0x61, 0x00]), // ESC a 0
    ALIGN_CENTER: new Uint8Array([0x1B, 0x61, 0x01]), // ESC a 1
    ALIGN_RIGHT: new Uint8Array([0x1B, 0x61, 0x02]), // ESC a 2
    
    // Font sizes
    FONT_SIZE_NORMAL: new Uint8Array([0x1D, 0x21, 0x00]), // GS ! 0
    FONT_SIZE_DOUBLE_HEIGHT: new Uint8Array([0x1D, 0x21, 0x01]), // GS ! 1
    FONT_SIZE_DOUBLE_WIDTH: new Uint8Array([0x1D, 0x21, 0x10]), // GS ! 16
    FONT_SIZE_DOUBLE: new Uint8Array([0x1D, 0x21, 0x11]), // GS ! 17
    FONT_SIZE_LARGE: new Uint8Array([0x1D, 0x21, 0x22]), // GS ! 34
    
    // Paper control
    LINE_FEED: new Uint8Array([0x0A]), // LF
    FORM_FEED: new Uint8Array([0x0C]), // FF
    CUT_PAPER: new Uint8Array([0x1D, 0x56, 0x00]), // GS V 0
    CUT_PAPER_PARTIAL: new Uint8Array([0x1D, 0x56, 0x01]), // GS V 1
    FEED_LINES: (lines: number) => new Uint8Array([0x1B, 0x64, lines]), // ESC d n
    
    // Barcode and QR codes
    BARCODE_MODE: new Uint8Array([0x1D, 0x6B]), // GS k
    QR_CODE_SIZE: (size: number) => new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size]),
    QR_CODE_CORRECTION: (level: number) => new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, level]),
    
    // Special formatting
    HORIZONTAL_LINE: '--------------------------------',
    DOUBLE_LINE: '================================'
  };

  private settings: ThermalPrinterSettings;

  constructor(settings?: Partial<ThermalPrinterSettings>) {
    this.settings = {
      paperWidth: 80, // mm
      printDensity: 8,
      printSpeed: 5,
      cutterEnabled: true,
      autoCut: true,
      encoding: 'utf-8',
      timeout: 5000,
      ...settings
    };
  }

  /**
   * Generate complete parking ticket with ESC/POS commands
   */
  generateParkingTicket(ticketData: ParkingTicketData): Uint8Array {
    const buffer: Uint8Array[] = [];

    // Initialize printer
    buffer.push(this.commands.INIT);
    buffer.push(this.setEncoding(this.settings.encoding));
    
    // Header section - Business information
    this.addHeader(buffer, ticketData);
    
    // Ticket number section
    this.addTicketNumber(buffer, ticketData);
    
    // Vehicle and timing information
    this.addVehicleDetails(buffer, ticketData);
    
    // Payment information (if exit ticket)
    if (ticketData.ticketType === 'exit') {
      this.addPaymentDetails(buffer, ticketData);
    }
    
    // Footer section
    this.addFooter(buffer, ticketData);
    
    // Cut paper if enabled
    if (this.settings.cutterEnabled && this.settings.autoCut) {
      buffer.push(this.commands.CUT_PAPER);
    }

    return this.combineBuffers(buffer);
  }

  /**
   * Add business header with formatting
   */
  private addHeader(buffer: Uint8Array[], ticketData: ParkingTicketData): void {
    // Center alignment for header
    buffer.push(this.commands.ALIGN_CENTER);
    
    // Business name - bold and large
    buffer.push(this.commands.BOLD_ON);
    buffer.push(this.commands.FONT_SIZE_DOUBLE_WIDTH);
    buffer.push(this.textToBytes(ticketData.businessName));
    buffer.push(this.commands.LINE_FEED);
    
    // Facility name - normal size but bold
    buffer.push(this.commands.FONT_SIZE_NORMAL);
    buffer.push(this.textToBytes(ticketData.facilityName));
    buffer.push(this.commands.LINE_FEED);
    buffer.push(this.commands.BOLD_OFF);
    
    // Contact information
    buffer.push(this.textToBytes(ticketData.location));
    buffer.push(this.commands.LINE_FEED);
    buffer.push(this.textToBytes(ticketData.contactPhone));
    buffer.push(this.commands.LINE_FEED);
    buffer.push(this.commands.LINE_FEED);
  }

  /**
   * Add prominent ticket number
   */
  private addTicketNumber(buffer: Uint8Array[], ticketData: ParkingTicketData): void {
    // Large centered ticket number
    buffer.push(this.commands.ALIGN_CENTER);
    buffer.push(this.commands.BOLD_ON);
    buffer.push(this.commands.FONT_SIZE_DOUBLE);
    buffer.push(this.textToBytes(`TICKET NO.`));
    buffer.push(this.commands.LINE_FEED);
    buffer.push(this.textToBytes(ticketData.ticketNumber));
    buffer.push(this.commands.FONT_SIZE_NORMAL);
    buffer.push(this.commands.BOLD_OFF);
    buffer.push(this.commands.LINE_FEED);
    buffer.push(this.commands.LINE_FEED);
  }

  /**
   * Add vehicle and timing details
   */
  private addVehicleDetails(buffer: Uint8Array[], ticketData: ParkingTicketData): void {
    // Left align for details
    buffer.push(this.commands.ALIGN_LEFT);
    
    // Separator line
    buffer.push(this.textToBytes(this.commands.HORIZONTAL_LINE));
    buffer.push(this.commands.LINE_FEED);
    
    // Vehicle information
    buffer.push(this.formatLine('Vehicle No.', ticketData.vehicleNumber));
    buffer.push(this.formatLine('Date', ticketData.date));
    buffer.push(this.formatLine('Vehicle Type', ticketData.vehicleType));
    buffer.push(this.formatLine('In Time', ticketData.inTime));
    
    if (ticketData.outTime) {
      buffer.push(this.formatLine('Out Time', ticketData.outTime));
    } else {
      buffer.push(this.formatLine('Out Time', '_______________'));
    }
    
    // Duration for exit tickets
    if (ticketData.duration) {
      buffer.push(this.formatLine('Duration', ticketData.duration));
    }
    
    buffer.push(this.commands.LINE_FEED);
  }

  /**
   * Add payment details for exit tickets
   */
  private addPaymentDetails(buffer: Uint8Array[], ticketData: ParkingTicketData): void {
    if (ticketData.ticketType !== 'exit') return;
    
    // Payment section separator
    buffer.push(this.textToBytes(this.commands.HORIZONTAL_LINE));
    buffer.push(this.commands.LINE_FEED);
    
    // Rate information
    if (ticketData.rate) {
      buffer.push(this.formatLine('Rate', `Rs. ${ticketData.rate}`));
    }
    
    // Amount received - bold for emphasis
    if (ticketData.receivedAmount) {
      buffer.push(this.commands.BOLD_ON);
      buffer.push(this.formatLine('Amount Received', `Rs. ${ticketData.receivedAmount}`));
      buffer.push(this.commands.BOLD_OFF);
    } else {
      buffer.push(this.formatLine('Amount Received', 'Rs. _______________'));
    }
    
    buffer.push(this.commands.LINE_FEED);
  }

  /**
   * Add footer with signature line
   */
  private addFooter(buffer: Uint8Array[], ticketData: ParkingTicketData): void {
    // Terms and conditions (optional)
    buffer.push(this.commands.ALIGN_CENTER);
    buffer.push(this.textToBytes('* Keep this ticket safe *'));
    buffer.push(this.commands.LINE_FEED);
    
    if (ticketData.ticketType === 'entry') {
      buffer.push(this.textToBytes('* Present at exit *'));
      buffer.push(this.commands.LINE_FEED);
    }
    
    buffer.push(this.commands.LINE_FEED);
    
    // Signature line
    buffer.push(this.commands.ALIGN_LEFT);
    buffer.push(this.textToBytes(this.commands.HORIZONTAL_LINE));
    buffer.push(this.commands.LINE_FEED);
    buffer.push(this.commands.ALIGN_CENTER);
    buffer.push(this.textToBytes('Signature of Agency'));
    buffer.push(this.commands.LINE_FEED);
    buffer.push(this.commands.LINE_FEED);
    
    // Timestamp
    buffer.push(this.commands.ALIGN_RIGHT);
    buffer.push(this.textToBytes(`Printed: ${new Date().toLocaleString()}`));
    buffer.push(this.commands.LINE_FEED);
    buffer.push(this.commands.LINE_FEED);
  }

  /**
   * Generate test print pattern
   */
  generateTestPrint(): Uint8Array {
    const buffer: Uint8Array[] = [];
    
    buffer.push(this.commands.INIT);
    buffer.push(this.commands.ALIGN_CENTER);
    
    // Test header
    buffer.push(this.commands.BOLD_ON);
    buffer.push(this.commands.FONT_SIZE_DOUBLE);
    buffer.push(this.textToBytes('PRINTER TEST'));
    buffer.push(this.commands.FONT_SIZE_NORMAL);
    buffer.push(this.commands.BOLD_OFF);
    buffer.push(this.commands.LINE_FEED);
    buffer.push(this.commands.LINE_FEED);
    
    // Font size test
    buffer.push(this.commands.ALIGN_LEFT);
    buffer.push(this.textToBytes('Normal text'));
    buffer.push(this.commands.LINE_FEED);
    
    buffer.push(this.commands.BOLD_ON);
    buffer.push(this.textToBytes('Bold text'));
    buffer.push(this.commands.BOLD_OFF);
    buffer.push(this.commands.LINE_FEED);
    
    buffer.push(this.commands.UNDERLINE_ON);
    buffer.push(this.textToBytes('Underlined text'));
    buffer.push(this.commands.UNDERLINE_OFF);
    buffer.push(this.commands.LINE_FEED);
    
    // Size variations
    buffer.push(this.commands.FONT_SIZE_DOUBLE_HEIGHT);
    buffer.push(this.textToBytes('Double Height'));
    buffer.push(this.commands.FONT_SIZE_NORMAL);
    buffer.push(this.commands.LINE_FEED);
    
    buffer.push(this.commands.FONT_SIZE_DOUBLE_WIDTH);
    buffer.push(this.textToBytes('Double Width'));
    buffer.push(this.commands.FONT_SIZE_NORMAL);
    buffer.push(this.commands.LINE_FEED);
    
    // Alignment test
    buffer.push(this.commands.LINE_FEED);
    buffer.push(this.commands.ALIGN_LEFT);
    buffer.push(this.textToBytes('Left aligned'));
    buffer.push(this.commands.LINE_FEED);
    
    buffer.push(this.commands.ALIGN_CENTER);
    buffer.push(this.textToBytes('Center aligned'));
    buffer.push(this.commands.LINE_FEED);
    
    buffer.push(this.commands.ALIGN_RIGHT);
    buffer.push(this.textToBytes('Right aligned'));
    buffer.push(this.commands.LINE_FEED);
    
    // Character set test
    buffer.push(this.commands.ALIGN_LEFT);
    buffer.push(this.commands.LINE_FEED);
    buffer.push(this.textToBytes('Character test: 0123456789'));
    buffer.push(this.commands.LINE_FEED);
    buffer.push(this.textToBytes('Special chars: @#$%&*()[]{}'));
    buffer.push(this.commands.LINE_FEED);
    
    // Separator lines
    buffer.push(this.commands.LINE_FEED);
    buffer.push(this.textToBytes(this.commands.HORIZONTAL_LINE));
    buffer.push(this.commands.LINE_FEED);
    buffer.push(this.textToBytes(this.commands.DOUBLE_LINE));
    buffer.push(this.commands.LINE_FEED);
    buffer.push(this.commands.LINE_FEED);
    
    // Test complete
    buffer.push(this.commands.ALIGN_CENTER);
    buffer.push(this.commands.BOLD_ON);
    buffer.push(this.textToBytes('TEST COMPLETE'));
    buffer.push(this.commands.BOLD_OFF);
    buffer.push(this.commands.LINE_FEED);
    buffer.push(this.commands.LINE_FEED);
    
    // Cut paper
    buffer.push(this.commands.CUT_PAPER);
    
    return this.combineBuffers(buffer);
  }

  /**
   * Generate raw text with formatting
   */
  generateFormattedText(text: string, formatting?: TextFormatting): Uint8Array {
    const buffer: Uint8Array[] = [];
    
    // Apply formatting
    if (formatting) {
      if (formatting.alignment === 'center') buffer.push(this.commands.ALIGN_CENTER);
      else if (formatting.alignment === 'right') buffer.push(this.commands.ALIGN_RIGHT);
      else buffer.push(this.commands.ALIGN_LEFT);
      
      if (formatting.bold) buffer.push(this.commands.BOLD_ON);
      if (formatting.underline) buffer.push(this.commands.UNDERLINE_ON);
      if (formatting.italic) buffer.push(this.commands.ITALIC_ON);
      
      switch (formatting.fontSize) {
        case 'double-height':
          buffer.push(this.commands.FONT_SIZE_DOUBLE_HEIGHT);
          break;
        case 'double-width':
          buffer.push(this.commands.FONT_SIZE_DOUBLE_WIDTH);
          break;
        case 'double':
          buffer.push(this.commands.FONT_SIZE_DOUBLE);
          break;
        case 'large':
          buffer.push(this.commands.FONT_SIZE_LARGE);
          break;
        default:
          buffer.push(this.commands.FONT_SIZE_NORMAL);
      }
    }
    
    // Add text
    buffer.push(this.textToBytes(text));
    buffer.push(this.commands.LINE_FEED);
    
    // Reset formatting
    if (formatting) {
      buffer.push(this.commands.FONT_SIZE_NORMAL);
      if (formatting.bold) buffer.push(this.commands.BOLD_OFF);
      if (formatting.underline) buffer.push(this.commands.UNDERLINE_OFF);
      if (formatting.italic) buffer.push(this.commands.ITALIC_OFF);
      buffer.push(this.commands.ALIGN_LEFT);
    }
    
    return this.combineBuffers(buffer);
  }

  /**
   * Generate QR code for ticket
   */
  generateQRCode(data: string, size: number = 6): Uint8Array {
    const buffer: Uint8Array[] = [];
    
    // QR Code setup
    buffer.push(this.commands.QR_CODE_SIZE(size));
    buffer.push(this.commands.QR_CODE_CORRECTION(1)); // Error correction level M
    
    // Store data
    const dataBytes = this.textToBytes(data);
    const length = dataBytes.length;
    buffer.push(new Uint8Array([0x1D, 0x28, 0x6B, length + 3, 0x00, 0x31, 0x50, 0x30]));
    buffer.push(dataBytes);
    
    // Print QR code
    buffer.push(new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]));
    
    return this.combineBuffers(buffer);
  }

  /**
   * Utility methods
   */
  
  private textToBytes(text: string): Uint8Array {
    // Handle different encodings
    switch (this.settings.encoding) {
      case 'utf-8':
        return new TextEncoder().encode(text);
      case 'cp437':
      case 'cp850':
      case 'cp858':
      case 'cp860':
      case 'cp863':
      case 'cp865':
      case 'cp866':
      case 'cp1252':
        // For now, fallback to UTF-8. In production, use proper encoding libraries
        return new TextEncoder().encode(text);
      default:
        return new TextEncoder().encode(text);
    }
  }

  private setEncoding(encoding: string): Uint8Array {
    // ESC/POS character set selection
    // This is a simplified implementation
    switch (encoding) {
      case 'cp437':
        return new Uint8Array([0x1B, 0x74, 0x00]); // ESC t 0
      case 'cp850':
        return new Uint8Array([0x1B, 0x74, 0x02]); // ESC t 2
      default:
        return new Uint8Array([0x1B, 0x74, 0x00]); // Default to CP437
    }
  }

  private formatLine(label: string, value: string): Uint8Array {
    const maxWidth = 32; // Typical thermal printer width
    const labelWidth = 12;
    const paddedLabel = label.padEnd(labelWidth, ' ');
    const remainingWidth = maxWidth - labelWidth - 2;
    const formattedValue = value.length > remainingWidth 
      ? value.substring(0, remainingWidth - 3) + '...'
      : value;
    
    const line = `${paddedLabel}: ${formattedValue}`;
    const result = this.textToBytes(line);
    return this.combineWithLineFeed(result);
  }

  private combineWithLineFeed(data: Uint8Array): Uint8Array {
    const result = new Uint8Array(data.length + this.commands.LINE_FEED.length);
    result.set(data, 0);
    result.set(this.commands.LINE_FEED, data.length);
    return result;
  }

  private combineBuffers(buffers: Uint8Array[]): Uint8Array {
    const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
    const result = new Uint8Array(totalLength);
    
    let offset = 0;
    buffers.forEach(buffer => {
      result.set(buffer, offset);
      offset += buffer.length;
    });
    
    return result;
  }
}