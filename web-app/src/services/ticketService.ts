/**
 * Professional Ticket Service
 * Handles ticket generation, printing, and business logic
 */

export interface TicketData {
  id: string
  vehicle_number: string
  vehicle_type: string
  transport_name?: string
  entry_time: string
  exit_time?: string
  parking_fee?: number
  payment_status?: string
  payment_type?: string
  serial?: number
}

export interface PrintOptions {
  ticketType: 'entry' | 'exit' | 'receipt'
  copies: number
  showSignatureLine: boolean
}

export class TicketService {
  // Business information matching physical ticket
  static readonly BUSINESS_INFO = {
    businessName: "Shree Sai",
    facilityName: "Vansh Truck Parking", 
    location: "@Additional MIDC Mandwa",
    contactPhone: "M. 9860254266"
  }

  /**
   * Generate ticket number from entry data
   * Format: DDMMXXX (date + serial)
   */
  static generateTicketNumber(entryTime: string, serial?: number): string {
    const date = new Date(entryTime)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const serialNum = (serial || Math.floor(Math.random() * 999) + 1)
      .toString().padStart(3, '0')
    
    return `${day}${month}${serialNum}`
  }

  /**
   * Format date for ticket display
   */
  static formatTicketDate(isoString: string): string {
    return new Date(isoString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short', 
      year: 'numeric'
    })
  }

  /**
   * Format time for ticket display
   */
  static formatTicketTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  /**
   * Generate HTML content for printing
   */
  static generateTicketHTML(ticketData: TicketData, options: PrintOptions): string {
    const ticketNumber = this.generateTicketNumber(ticketData.entry_time, ticketData.serial)
    const date = this.formatTicketDate(ticketData.entry_time)
    const inTime = this.formatTicketTime(ticketData.entry_time)
    const outTime = ticketData.exit_time ? this.formatTicketTime(ticketData.exit_time) : ''

    // Generate multiple copies
    const tickets = Array.from({ length: options.copies }, (_, index) => `
      <div class="parking-ticket ${index > 0 ? 'page-break' : ''}">
        <!-- Ticket Header -->
        <div class="ticket-header">
          <div class="business-name">${this.BUSINESS_INFO.businessName}</div>
          <div class="facility-name">${this.BUSINESS_INFO.facilityName}</div>
          <div class="location-contact">${this.BUSINESS_INFO.location}</div>
          <div class="location-contact">${this.BUSINESS_INFO.contactPhone}</div>
        </div>
        
        <!-- Prominent Ticket Number -->
        <div class="ticket-number">${ticketNumber}</div>
        
        <!-- Form Fields -->
        <div class="form-fields">
          <div class="field-row">
            <span class="field-label">Vehicle No.:</span>
            <span class="field-value">${ticketData.vehicle_number.toUpperCase()}</span>
          </div>
          
          <div class="field-row">
            <span class="field-label">Date:</span>
            <span class="field-value">${date}</span>
          </div>
          
          <div class="field-row">
            <span class="field-label">Type of Vehicle:</span>
            <span class="field-value">${ticketData.vehicle_type}</span>
          </div>
          
          <div class="field-row">
            <span class="field-label">In Time:</span>
            <span class="field-value">${inTime}</span>
          </div>
          
          <div class="field-row">
            <span class="field-label">Out Time:</span>
            <span class="field-value">${outTime || '_____________'}</span>
          </div>
          
          <div class="field-row">
            <span class="field-label">Received Rs.:</span>
            <span class="field-value">
              ${ticketData.parking_fee ? `₹${ticketData.parking_fee}` : '_____________'}
            </span>
          </div>
        </div>
        
        ${options.ticketType === 'exit' && ticketData.parking_fee ? `
          <!-- Amount Section for Exit Tickets -->
          <div class="amount-section">
            <div class="amount-label">TOTAL AMOUNT</div>
            <div class="amount-value">₹${ticketData.parking_fee}</div>
          </div>
        ` : ''}
        
        ${options.showSignatureLine ? `
          <!-- Signature Section -->
          <div class="signature-section">
            Signature of Agency
          </div>
        ` : ''}
      </div>
    `).join('')

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Parking Ticket - ${ticketNumber}</title>
        <meta charset="UTF-8">
        <style>
          ${this.getTicketStyles()}
        </style>
      </head>
      <body>
        <div class="ticket-container">
          ${tickets}
        </div>
      </body>
      </html>
    `
  }

  /**
   * Print ticket using browser's print functionality
   */
  static async printTicket(ticketData: TicketData, options: PrintOptions): Promise<boolean> {
    try {
      const html = this.generateTicketHTML(ticketData, options)
      
      // Create new window for printing
      const printWindow = window.open('', '_blank', 'width=800,height=600')
      
      if (!printWindow) {
        throw new Error('Failed to open print window')
      }

      printWindow.document.write(html)
      printWindow.document.close()

      // Wait for content to load then print
      return new Promise((resolve) => {
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
          resolve(true)
        }, 500)
      })
    } catch (error) {
      console.error('Failed to print ticket:', error)
      return false
    }
  }

  /**
   * Open print preview
   */
  static previewTicket(ticketData: TicketData, options: PrintOptions): void {
    try {
      const html = this.generateTicketHTML(ticketData, options)
      const ticketNumber = this.generateTicketNumber(ticketData.entry_time, ticketData.serial)
      
      // Enhanced preview with controls
      const previewHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Ticket Preview - ${ticketNumber}</title>
          <meta charset="UTF-8">
          <style>
            ${this.getTicketStyles()}
            body { padding: 20px; background: #f0f0f0; }
            .preview-controls { 
              text-align: center; 
              margin-bottom: 20px; 
              background: white; 
              padding: 15px; 
              border-radius: 8px; 
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .preview-controls h2 {
              margin: 0 0 15px 0;
              color: #333;
            }
            .preview-controls button {
              background: #2563eb;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
              margin: 0 5px;
              transition: background-color 0.2s;
            }
            .preview-controls button:hover {
              background: #1d4ed8;
            }
            .preview-controls .close-btn {
              background: #6b7280;
            }
            .preview-controls .close-btn:hover {
              background: #4b5563;
            }
          </style>
        </head>
        <body>
          <div class="preview-controls">
            <h2>Ticket Preview - ${options.ticketType.toUpperCase()}</h2>
            <p>Vehicle: ${ticketData.vehicle_number.toUpperCase()} | Copies: ${options.copies}</p>
            <button onclick="window.print()">🖨️ Print Now</button>
            <button class="close-btn" onclick="window.close()">✕ Close Preview</button>
          </div>
          <div class="ticket-container">
            ${html.match(/<div class="ticket-container">([\s\S]*?)<\/div>/)?.[1] || ''}
          </div>
        </body>
        </html>
      `
      
      const previewWindow = window.open('', '_blank', 'width=900,height=700')
      if (previewWindow) {
        previewWindow.document.write(previewHTML)
        previewWindow.document.close()
      }
    } catch (error) {
      console.error('Failed to open preview:', error)
    }
  }

  /**
   * Get professional ticket CSS styles
   */
  private static getTicketStyles(): string {
    return `
      /* Professional parking ticket print styles */
      @page {
        size: 3.5in 5in;
        margin: 0.1in;
      }

      body {
        margin: 0;
        padding: 0;
        font-family: 'Arial', monospace;
        font-size: 12px;
        line-height: 1.2;
      }

      .ticket-container {
        display: block;
      }

      .parking-ticket {
        width: 3.5in;
        height: 5in;
        padding: 0.15in;
        border: 2px solid #000;
        background: white;
        box-sizing: border-box;
        page-break-inside: avoid;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
        margin-bottom: 0.1in;
      }

      .page-break {
        page-break-before: always;
      }

      .ticket-header {
        text-align: center;
        border-bottom: 2px solid #000;
        padding-bottom: 6px;
        margin-bottom: 8px;
      }

      .business-name {
        font-size: 13px;
        font-weight: bold;
        margin-bottom: 2px;
        text-transform: uppercase;
      }

      .facility-name {
        font-size: 15px;
        font-weight: bold;
        text-transform: uppercase;
        margin-bottom: 3px;
      }

      .location-contact {
        font-size: 9px;
        line-height: 1.1;
        margin-bottom: 2px;
      }

      .ticket-number {
        color: #d32f2f !important;
        font-size: 22px;
        font-weight: bold;
        text-align: center;
        margin: 8px 0;
        border: 1px solid #000;
        padding: 3px;
        background: white;
        letter-spacing: 1px;
      }

      .form-fields {
        margin-top: 12px;
      }

      .field-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 8px;
        border-bottom: 1px solid #000;
        padding-bottom: 1px;
        min-height: 16px;
      }

      .field-label {
        font-weight: bold;
        font-size: 11px;
        flex-shrink: 0;
      }

      .field-value {
        font-size: 11px;
        text-align: right;
        flex-grow: 1;
        margin-left: 10px;
        text-transform: uppercase;
      }

      .amount-section {
        margin-top: 10px;
        border: 2px solid #000;
        padding: 5px;
        text-align: center;
        background: #f9f9f9;
      }

      .amount-label {
        font-size: 11px;
        font-weight: bold;
        margin-bottom: 2px;
      }

      .amount-value {
        font-size: 16px;
        font-weight: bold;
        color: #d32f2f;
      }

      .signature-section {
        margin-top: 15px;
        border-top: 2px solid #000;
        padding-top: 8px;
        text-align: center;
        font-size: 11px;
        font-weight: bold;
      }

      /* Print-specific styles */
      @media print {
        body { 
          margin: 0; 
          padding: 0;
        }
        .parking-ticket { 
          box-shadow: none;
          border: 2px solid #000;
          margin: 0;
          height: auto;
          min-height: 5in;
        }
        .no-print { 
          display: none !important; 
        }
        .preview-controls {
          display: none !important;
        }
      }
    `
  }
}