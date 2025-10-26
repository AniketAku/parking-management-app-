import type { ESCPOSCommand, ESCPOSBuilder as IESCPOSBuilder } from '../types/bluetoothPrinter'
import { log } from './secureLogger'

export class ESCPOSBuilder implements IESCPOSBuilder {
  private commands: number[] = []

  // ESC/POS Command Constants
  private static readonly ESC = 0x1B
  private static readonly GS = 0x1D
  private static readonly LF = 0x0A
  private static readonly CR = 0x0D
  private static readonly NUL = 0x00

  // Initialize printer
  init(): ESCPOSBuilder {
    this.commands.push(ESCPOSBuilder.ESC, 0x40) // ESC @ - Initialize printer
    return this
  }

  // Add text content
  text(content: string): ESCPOSBuilder {
    const encoder = new TextEncoder()
    const textBytes = encoder.encode(content)
    this.commands.push(...Array.from(textBytes))
    return this
  }

  // Bold text
  bold(enabled: boolean): ESCPOSBuilder {
    if (enabled) {
      this.commands.push(ESCPOSBuilder.ESC, 0x45, 0x01) // ESC E 1 - Bold on
    } else {
      this.commands.push(ESCPOSBuilder.ESC, 0x45, 0x00) // ESC E 0 - Bold off
    }
    return this
  }

  // Text alignment
  align(alignment: 'left' | 'center' | 'right'): ESCPOSBuilder {
    const alignmentMap = {
      'left': 0x00,
      'center': 0x01,
      'right': 0x02
    }
    this.commands.push(ESCPOSBuilder.ESC, 0x61, alignmentMap[alignment])
    return this
  }

  // Text size
  size(width: number, height: number): ESCPOSBuilder {
    const sizeValue = ((width - 1) << 4) | (height - 1)
    this.commands.push(ESCPOSBuilder.GS, 0x21, sizeValue) // GS ! - Select character size
    return this
  }

  // Line feed
  feed(lines: number = 1): ESCPOSBuilder {
    for (let i = 0; i < lines; i++) {
      this.commands.push(ESCPOSBuilder.LF)
    }
    return this
  }

  // Paper cut
  cut(type: 'full' | 'partial' = 'full'): ESCPOSBuilder {
    if (type === 'full') {
      this.commands.push(ESCPOSBuilder.GS, 0x56, 0x00) // GS V 0 - Full cut
    } else {
      this.commands.push(ESCPOSBuilder.GS, 0x56, 0x01) // GS V 1 - Partial cut
    }
    return this
  }

  // Add image (simplified for now)
  image(imageData: Uint8Array): ESCPOSBuilder {
    log.warn('Image printing not yet implemented for Bluetooth ESC/POS')
    return this
  }

  // Barcode (simplified)
  barcode(data: string, type: string = 'CODE128'): ESCPOSBuilder {
    // Simple barcode implementation - would need full ESC/POS barcode commands
    this.text(`*${data}*`)
    return this
  }

  // QR Code (simplified)
  qrCode(data: string, size: number = 6): ESCPOSBuilder {
    // Simple QR code implementation - would need full ESC/POS QR commands
    this.text(`[QR: ${data}]`)
    return this
  }

  // Build final command array
  build(): Uint8Array {
    return new Uint8Array(this.commands)
  }

  // Utility methods for common ticket formatting
  static buildParkingTicket(data: {
    ticketNumber: string
    vehicleNumber: string
    vehicleType: string
    transportName: string
    inTime: string
    driverName?: string
    notes?: string
  }): Uint8Array {
    return new ESCPOSBuilder()
      .init()
      .align('center')
      .bold(true)
      .size(2, 2)
      .text('PARKING TICKET')
      .feed(1)
      .bold(false)
      .size(1, 1)
      .text('═'.repeat(32))
      .feed(1)
      .align('left')
      .text(`Ticket No: ${data.ticketNumber}`)
      .feed(1)
      .text(`Vehicle: ${data.vehicleNumber}`)
      .feed(1)
      .text(`Type: ${data.vehicleType}`)
      .feed(1)
      .text(`Transport: ${data.transportName}`)
      .feed(1)
      .text(`Entry Time: ${data.inTime}`)
      .feed(1)
      .text(`Driver: ${data.driverName || 'N/A'}`)
      .feed(1)
      .text(data.notes ? `Notes: ${data.notes}` : '')
      .feed(2)
      .align('center')
      .text('Thank you for parking with us!')
      .feed(2)
      .cut()
      .build()
  }

  static buildExitReceipt(data: {
    ticketNumber: string
    vehicleNumber: string
    vehicleType: string
    inTime: string
    outTime: string
    parkingFee: number
    paymentType?: string
  }): Uint8Array {
    return new ESCPOSBuilder()
      .init()
      .align('center')
      .bold(true)
      .size(2, 2)
      .text('PARKING RECEIPT')
      .feed(1)
      .bold(false)
      .size(1, 1)
      .text('═'.repeat(32))
      .feed(1)
      .align('left')
      .text(`Ticket No: ${data.ticketNumber}`)
      .feed(1)
      .text(`Vehicle: ${data.vehicleNumber}`)
      .feed(1)
      .text(`Type: ${data.vehicleType}`)
      .feed(1)
      .text(`Entry: ${data.inTime}`)
      .feed(1)
      .text(`Exit: ${data.outTime}`)
      .feed(1)
      .bold(true)
      .text(`Amount: ₹${data.parkingFee.toFixed(2)}`)
      .bold(false)
      .feed(1)
      .text(`Payment: ${data.paymentType || 'Cash'}`)
      .feed(2)
      .align('center')
      .text('Thank you for your payment!')
      .feed(2)
      .cut()
      .build()
  }
}