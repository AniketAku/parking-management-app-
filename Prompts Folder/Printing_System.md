# SuperClaude Prompts for Printing Services Integration

## **🖨️ FOCUSED: Professional Parking Ticket Printing System**

**FUNDAMENTAL PRINCIPLE: PRESERVE EXISTING FUNCTIONALITY WHILE ADDING COMPREHENSIVE PRINTING CAPABILITIES**

---

## **Phase 1: Ticket Template & Layout Design**

### **Prompt 1.1: Professional Ticket Template Implementation**
```bash
/sc:analyze --existing --printing --ticket-format --physical-layout --seq --persona-frontend --magic --c7

PROFESSIONAL PARKING TICKET: Implement exact replica of physical parking ticket format with web-based printing capabilities.

Current Business Ticket Analysis:
- Business Header: "Shree Sai" + "Vansh Truck Parking"  
- Location: "@Additional MIDC Mandwa"
- Contact: "M. 9860254266"
- Ticket Number: Prominent red numbering (e.g., "13124")
- Form Fields: Vehicle No., Date, Type of Vehicle, In Time, Out Time, Received Rs.
- Authority: "Signature of Agency"
- Physical Size: Standard parking ticket dimensions (3.5" x 5")

/sc:implement --ticket-template --exact-format --print-ready --persona-frontend --magic --seq

TICKET TEMPLATE IMPLEMENTATION:

1. **React Component Structure:**
```typescript
interface ParkingTicketProps {
  // Header Information
  businessName: string          // "Shree Sai"
  facilityName: string         // "Vansh Truck Parking"
  location: string             // "@Additional MIDC Mandwa"
  contactPhone: string         // "M. 9860254266"
  
  // Ticket Details
  ticketNumber: string         // "13124" - prominent red display
  vehicleNumber: string        // Vehicle registration
  date: string                 // Entry date
  vehicleType: string          // Type of vehicle
  inTime: string              // Entry time
  outTime?: string            // Exit time (for exit receipts)
  receivedAmount?: number     // Payment amount
  
  // Print Configuration
  ticketType: 'entry' | 'exit' | 'receipt'
  printCopies: number
  showSignatureLine: boolean
}

const ParkingTicket: React.FC<ParkingTicketProps> = ({
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
  ticketType,
  showSignatureLine
}) => {
  return (
    <div className="parking-ticket">
      {/* Exact format implementation */}
    </div>
  )
}
```

2. **Print-Optimized CSS Styling:**
```css
/* Professional parking ticket styles */
.parking-ticket {
  width: 3.5in;
  height: 5in;
  padding: 0.25in;
  font-family: 'Arial', monospace;
  border: 2px solid #000;
  background: white;
  page-break-inside: avoid;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.ticket-header {
  text-align: center;
  border-bottom: 2px solid #000;
  padding-bottom: 8px;
  margin-bottom: 12px;
}

.business-name {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 2px;
}

.facility-name {
  font-size: 16px;
  font-weight: bold;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.location-contact {
  font-size: 10px;
  line-height: 1.2;
}

.ticket-number {
  color: #d32f2f;            /* Red color matching physical ticket */
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  margin: 10px 0;
  border: 1px solid #000;
  padding: 4px;
  background: white;
}

.form-fields {
  margin-top: 15px;
}

.field-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  border-bottom: 1px solid #000;
  padding-bottom: 2px;
}

.field-label {
  font-weight: bold;
  font-size: 12px;
}

.field-value {
  font-size: 12px;
  min-width: 60%;
  text-align: right;
}

.signature-section {
  margin-top: 20px;
  border-top: 2px solid #000;
  padding-top: 10px;
  text-align: center;
  font-size: 12px;
  font-weight: bold;
}

/* Print-specific media queries */
@media print {
  body { margin: 0; padding: 0; }
  .parking-ticket { 
    box-shadow: none;
    border: 2px solid #000;
    margin: 0;
  }
  .no-print { display: none !important; }
  .page-break { page-break-before: always; }
}
```

Generate professional parking ticket template matching exact physical format with print optimization.
```

### **Prompt 1.2: Multi-Format Ticket Templates**
```bash
/sc:implement --ticket-templates --multiple-formats --print-optimization --persona-frontend --magic --seq

MULTIPLE TICKET FORMATS: Create different ticket templates for various use cases and printer types.

/sc:build --feature --ticket-variants --print-ready --thermal-optimized --persona-frontend --magic

TICKET TEMPLATE VARIANTS:

1. **Entry Ticket Template:**
```typescript
const EntryTicketTemplate: React.FC<TicketProps> = ({
  businessName,
  facilityName,
  location,
  contactPhone,
  ticketNumber,
  vehicleNumber,
  date,
  vehicleType,
  inTime
}) => (
  <div className="entry-ticket">
    <div className="ticket-header">
      <div className="business-name">{businessName}</div>
      <div className="facility-name">{facilityName}</div>
      <div className="location-contact">
        <div>{location}</div>
        <div>{contactPhone}</div>
      </div>
    </div>
    
    <div className="ticket-number">No. {ticketNumber}</div>
    
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
      Signature of Agency
    </div>
  </div>
)
```

2. **Exit Receipt Template:**
```typescript
const ExitReceiptTemplate: React.FC<ExitReceiptProps> = ({
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
  receivedAmount
}) => (
  <div className="exit-receipt">
    {/* Similar header structure */}
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
      <div className="field-row">
        <span className="field-label">Amount Paid Rs.</span>
        <span className="field-value">{receivedAmount}</span>
      </div>
    </div>
    
    <div className="signature-section">
      Signature of Agency
    </div>
  </div>
)
```

3. **Thermal Printer Optimized Template:**
```css
/* Compact thermal printer format (2.75" width) */
.thermal-ticket {
  width: 2.75in;
  padding: 0.1in;
  font-size: 11px;
  line-height: 1.1;
}

.thermal-ticket .ticket-number {
  font-size: 18px;
  margin: 5px 0;
}

.thermal-ticket .field-row {
  margin-bottom: 8px;
  font-size: 10px;
}
```

Generate comprehensive ticket template system supporting entry tickets, exit receipts, and thermal printer formats.
```

---

## **Phase 2: Print Queue & Hardware Integration**

### **Prompt 2.1: Print Queue Management System**
```bash
/sc:implement --print-queue --background-processing --error-handling --persona-backend --seq

PRINT QUEUE SYSTEM: Implement robust print queue management with retry logic and error handling.

/sc:build --feature --print-queue --job-processing --retry-logic --persona-backend --seq

PRINT QUEUE IMPLEMENTATION:

1. **Print Job Management:**
```typescript
interface PrintJob {
  id: string
  ticketId: string
  ticketType: 'entry' | 'exit' | 'receipt'
  ticketData: ParkingTicketData
  printerProfile: PrinterProfile
  priority: 'normal' | 'high' | 'urgent'
  copies: number
  status: 'queued' | 'printing' | 'completed' | 'failed' | 'retrying'
  attempts: number
  maxAttempts: number
  createdAt: Date
  printedAt?: Date
  error?: string
}

interface PrintQueueService {
  // Queue operations
  addToPrintQueue(job: Omit<PrintJob, 'id' | 'status' | 'attempts' | 'createdAt'>): Promise<string>
  processPrintQueue(): Promise<void>
  retryFailedPrint(jobId: string): Promise<void>
  cancelPrintJob(jobId: string): Promise<void>
  
  // Status and monitoring
  getQueueStatus(): Promise<PrintQueueStatus>
  getPrintHistory(filters?: PrintHistoryFilters): Promise<PrintJob[]>
  
  // Event handlers
  onPrintComplete(callback: (job: PrintJob) => void): void
  onPrintError(callback: (job: PrintJob, error: Error) => void): void
}
```

2. **Background Print Processing:**
```typescript
class PrintQueueManager implements PrintQueueService {
  private queue: PriorityQueue<PrintJob> = new PriorityQueue()
  private processing = false
  private processingInterval = 1000 // 1 second
  
  constructor(private printerService: PrinterService) {
    this.startQueueProcessor()
  }
  
  async addToPrintQueue(jobData: Omit<PrintJob, 'id' | 'status' | 'attempts' | 'createdAt'>): Promise<string> {
    const job: PrintJob = {
      ...jobData,
      id: generateUniqueId(),
      status: 'queued',
      attempts: 0,
      createdAt: new Date()
    }
    
    const priority = this.calculatePriority(job.priority)
    this.queue.enqueue(job, priority)
    
    return job.id
  }
  
  private async startQueueProcessor(): Promise<void> {
    setInterval(async () => {
      if (!this.processing && !this.queue.isEmpty()) {
        await this.processNextJob()
      }
    }, this.processingInterval)
  }
  
  private async processNextJob(): Promise<void> {
    this.processing = true
    
    try {
      const job = this.queue.dequeue()
      if (job) {
        await this.executePrintJob(job)
      }
    } catch (error) {
      console.error('Print queue processing error:', error)
    } finally {
      this.processing = false
    }
  }
  
  private async executePrintJob(job: PrintJob): Promise<void> {
    job.status = 'printing'
    job.attempts++
    
    try {
      const printResult = await this.printerService.printTicket(job.ticketData, job.printerProfile)
      
      if (printResult.success) {
        job.status = 'completed'
        job.printedAt = new Date()
        this.onPrintCompleteCallbacks.forEach(callback => callback(job))
      } else {
        throw new Error(printResult.error)
      }
    } catch (error) {
      await this.handlePrintError(job, error as Error)
    }
  }
  
  private async handlePrintError(job: PrintJob, error: Error): Promise<void> {
    job.error = error.message
    
    if (job.attempts < job.maxAttempts) {
      job.status = 'retrying'
      // Re-queue with exponential backoff
      setTimeout(() => {
        this.queue.enqueue(job, this.calculatePriority(job.priority))
      }, Math.pow(2, job.attempts) * 1000)
    } else {
      job.status = 'failed'
      this.onPrintErrorCallbacks.forEach(callback => callback(job, error))
    }
  }
}
```

3. **Print Job Database Storage:**
```sql
-- Print job tracking table
CREATE TABLE print_jobs (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES parking_entries(id),
    ticket_type VARCHAR(20) NOT NULL,
    ticket_data JSONB NOT NULL,
    printer_profile VARCHAR(100) NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    copies INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'queued',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    printed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient queue processing
CREATE INDEX idx_print_jobs_queue ON print_jobs(status, priority, created_at);
CREATE INDEX idx_print_jobs_history ON print_jobs(ticket_id, created_at);
```

Generate comprehensive print queue system with background processing, retry logic, and database persistence.
```

### **Prompt 2.2: Thermal Printer Integration**
```bash
/sc:implement --thermal-printer --hardware-integration --escpos --persona-backend --seq

THERMAL PRINTER INTEGRATION: Implement direct communication with thermal printers using ESC/POS commands.

/sc:build --feature --thermal-printing --escpos --hardware --persona-backend --seq

THERMAL PRINTER IMPLEMENTATION:

1. **ESC/POS Command Generation:**
```typescript
class ESCPOSGenerator {
  private readonly commands = {
    // Printer initialization
    INIT: new Uint8Array([0x1B, 0x40]),
    
    // Text formatting
    BOLD_ON: new Uint8Array([0x1B, 0x45, 0x01]),
    BOLD_OFF: new Uint8Array([0x1B, 0x45, 0x00]),
    UNDERLINE_ON: new Uint8Array([0x1B, 0x2D, 0x01]),
    UNDERLINE_OFF: new Uint8Array([0x1B, 0x2D, 0x00]),
    
    // Text alignment
    ALIGN_LEFT: new Uint8Array([0x1B, 0x61, 0x00]),
    ALIGN_CENTER: new Uint8Array([0x1B, 0x61, 0x01]),
    ALIGN_RIGHT: new Uint8Array([0x1B, 0x61, 0x02]),
    
    // Font sizes
    FONT_SIZE_NORMAL: new Uint8Array([0x1D, 0x21, 0x00]),
    FONT_SIZE_DOUBLE_HEIGHT: new Uint8Array([0x1D, 0x21, 0x01]),
    FONT_SIZE_DOUBLE_WIDTH: new Uint8Array([0x1D, 0x21, 0x10]),
    FONT_SIZE_DOUBLE: new Uint8Array([0x1D, 0x21, 0x11]),
    
    // Paper control
    LINE_FEED: new Uint8Array([0x0A]),
    FORM_FEED: new Uint8Array([0x0C]),
    CUT_PAPER: new Uint8Array([0x1D, 0x56, 0x00]),
    
    // Special characters
    HORIZONTAL_LINE: '--------------------------------'
  }
  
  generateParkingTicket(ticketData: ParkingTicketData): Uint8Array {
    const buffer: Uint8Array[] = []
    
    // Initialize printer
    buffer.push(this.commands.INIT)
    
    // Header - centered and bold
    buffer.push(this.commands.ALIGN_CENTER)
    buffer.push(this.commands.BOLD_ON)
    buffer.push(this.textToBytes(ticketData.businessName))
    buffer.push(this.commands.LINE_FEED)
    
    buffer.push(this.commands.FONT_SIZE_DOUBLE_WIDTH)
    buffer.push(this.textToBytes(ticketData.facilityName))
    buffer.push(this.commands.FONT_SIZE_NORMAL)
    buffer.push(this.commands.LINE_FEED)
    
    buffer.push(this.commands.BOLD_OFF)
    buffer.push(this.textToBytes(ticketData.location))
    buffer.push(this.commands.LINE_FEED)
    buffer.push(this.textToBytes(ticketData.contactPhone))
    buffer.push(this.commands.LINE_FEED)
    buffer.push(this.commands.LINE_FEED)
    
    // Ticket number - large and centered
    buffer.push(this.commands.FONT_SIZE_DOUBLE)
    buffer.push(this.textToBytes(`No. ${ticketData.ticketNumber}`))
    buffer.push(this.commands.FONT_SIZE_NORMAL)
    buffer.push(this.commands.LINE_FEED)
    buffer.push(this.commands.LINE_FEED)
    
    // Horizontal line
    buffer.push(this.commands.ALIGN_LEFT)
    buffer.push(this.textToBytes(this.commands.HORIZONTAL_LINE))
    buffer.push(this.commands.LINE_FEED)
    
    // Form fields
    buffer.push(this.textToBytes(`Vehicle No.: ${ticketData.vehicleNumber}`))
    buffer.push(this.commands.LINE_FEED)
    buffer.push(this.textToBytes(`Date: ${ticketData.date}`))
    buffer.push(this.commands.LINE_FEED)
    buffer.push(this.textToBytes(`Type of Vehicle: ${ticketData.vehicleType}`))
    buffer.push(this.commands.LINE_FEED)
    buffer.push(this.textToBytes(`In Time: ${ticketData.inTime}`))
    buffer.push(this.commands.LINE_FEED)
    
    if (ticketData.outTime) {
      buffer.push(this.textToBytes(`Out Time: ${ticketData.outTime}`))
    } else {
      buffer.push(this.textToBytes('Out Time: _______________'))
    }
    buffer.push(this.commands.LINE_FEED)
    
    if (ticketData.receivedAmount) {
      buffer.push(this.textToBytes(`Received Rs. ${ticketData.receivedAmount}`))
    } else {
      buffer.push(this.textToBytes('Received Rs. _______________'))
    }
    buffer.push(this.commands.LINE_FEED)
    buffer.push(this.commands.LINE_FEED)
    
    // Signature line
    buffer.push(this.textToBytes(this.commands.HORIZONTAL_LINE))
    buffer.push(this.commands.LINE_FEED)
    buffer.push(this.commands.ALIGN_CENTER)
    buffer.push(this.textToBytes('Signature of Agency'))
    buffer.push(this.commands.LINE_FEED)
    buffer.push(this.commands.LINE_FEED)
    
    // Cut paper
    buffer.push(this.commands.CUT_PAPER)
    
    return this.combineBuffers(buffer)
  }
  
  private textToBytes(text: string): Uint8Array {
    return new TextEncoder().encode(text)
  }
  
  private combineBuffers(buffers: Uint8Array[]): Uint8Array {
    const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0)
    const result = new Uint8Array(totalLength)
    
    let offset = 0
    buffers.forEach(buffer => {
      result.set(buffer, offset)
      offset += buffer.length
    })
    
    return result
  }
}
```

2. **Printer Communication Interface:**
```typescript
interface ThermalPrinterService {
  // Connection management
  connectToPrinter(config: PrinterConnectionConfig): Promise<void>
  disconnectFromPrinter(): Promise<void>
  checkPrinterStatus(): Promise<PrinterStatus>
  
  // Printing operations
  printESCPOS(data: Uint8Array): Promise<PrintResult>
  printTicket(ticketData: ParkingTicketData): Promise<PrintResult>
  
  // Printer capabilities
  testPrint(): Promise<TestPrintResult>
  feedPaper(lines: number): Promise<void>
  cutPaper(): Promise<void>
}

class USBThermalPrinter implements ThermalPrinterService {
  private device: USBDevice | null = null
  private connected = false
  
  async connectToPrinter(config: USBPrinterConfig): Promise<void> {
    try {
      // Request USB device access
      const device = await navigator.usb.requestDevice({
        filters: [{ vendorId: config.vendorId, productId: config.productId }]
      })
      
      await device.open()
      await device.selectConfiguration(1)
      await device.claimInterface(0)
      
      this.device = device
      this.connected = true
    } catch (error) {
      throw new Error(`Failed to connect to thermal printer: ${error.message}`)
    }
  }
  
  async printESCPOS(data: Uint8Array): Promise<PrintResult> {
    if (!this.connected || !this.device) {
      throw new Error('Printer not connected')
    }
    
    try {
      await this.device.transferOut(1, data)
      return { success: true, message: 'Print job sent successfully' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
  
  async printTicket(ticketData: ParkingTicketData): Promise<PrintResult> {
    const generator = new ESCPOSGenerator()
    const escposData = generator.generateParkingTicket(ticketData)
    return await this.printESCPOS(escposData)
  }
}
```

Generate thermal printer integration with ESC/POS command generation and USB communication.
```

---

## **Phase 3: Print Settings & Configuration**

### **Prompt 3.1: Printer Configuration Management**
```bash
/sc:implement --printer-config --settings-integration --hardware-profiles --persona-backend --seq

PRINTER CONFIGURATION: Create comprehensive printer settings and hardware profile management.

/sc:build --feature --printer-profiles --configuration --settings --persona-backend --seq

PRINTER CONFIGURATION SYSTEM:

1. **Printer Profile Management:**
```typescript
interface PrinterProfile {
  id: string
  name: string
  type: 'thermal' | 'laser' | 'inkjet' | 'receipt'
  manufacturer: string
  model: string
  
  // Connection configuration
  connection: {
    type: 'usb' | 'network' | 'bluetooth' | 'serial'
    settings: USBConfig | NetworkConfig | BluetoothConfig | SerialConfig
  }
  
  // Print capabilities
  capabilities: {
    maxWidth: number      // mm
    maxHeight: number     // mm
    resolution: number    // DPI
    colorSupport: boolean
    paperSizes: string[]
    commandSet: 'ESC/POS' | 'ZPL' | 'EPL' | 'standard'
  }
  
  // Print settings
  defaultSettings: {
    paperSize: string
    orientation: 'portrait' | 'landscape'
    copies: number
    density: number       // 1-10 for thermal printers
    speed: 'fast' | 'normal' | 'high-quality'
  }
  
  isActive: boolean
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

interface USBConfig {
  vendorId: number
  productId: number
  endpoint?: number
}

interface NetworkConfig {
  ipAddress: string
  port: number
  protocol: 'ipp' | 'socket' | 'http'
}
```

2. **Print Settings Service:**
```typescript
class PrinterConfigService {
  // Printer profile management
  async createPrinterProfile(profile: Omit<PrinterProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<PrinterProfile>
  async updatePrinterProfile(id: string, updates: Partial<PrinterProfile>): Promise<PrinterProfile>
  async deletePrinterProfile(id: string): Promise<void>
  async getPrinterProfile(id: string): Promise<PrinterProfile | null>
  async getAllPrinterProfiles(): Promise<PrinterProfile[]>
  
  // Printer discovery and testing
  async discoverPrinters(): Promise<DetectedPrinter[]>
  async testPrinterConnection(profile: PrinterProfile): Promise<TestResult>
  async calibratePrinter(profileId: string): Promise<CalibrationResult>
  
  // Default printer management
  async setDefaultPrinter(profileId: string): Promise<void>
  async getDefaultPrinter(): Promise<PrinterProfile | null>
  
  // Print job defaults
  async updatePrintDefaults(settings: PrintDefaults): Promise<void>
  async getPrintDefaults(): Promise<PrintDefaults>
}
```

3. **Database Schema for Printer Configuration:**
```sql
-- Printer profiles table
CREATE TABLE printer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    manufacturer VARCHAR(50),
    model VARCHAR(50),
    connection_config JSONB NOT NULL,
    capabilities JSONB NOT NULL,
    default_settings JSONB,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Print settings table
CREATE TABLE print_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Location-specific printer assignments
CREATE TABLE location_printer_assignments (
    id SERIAL PRIMARY KEY,
    location_id INTEGER REFERENCES locations(id),
    printer_profile_id UUID REFERENCES printer_profiles(id),
    assignment_type VARCHAR(20) NOT NULL, -- 'entry', 'exit', 'receipt'
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
```

4. **Print Settings UI Integration:**
```typescript
// Integration with main settings system
interface PrintSettingsCategory {
  category: 'printing'
  settings: {
    autoPrintEntry: boolean
    autoPrintExit: boolean
    defaultCopies: number
    showPrintPreview: boolean
    printerProfiles: PrinterProfile[]
    defaultPrinterId?: string
    printQueueEnabled: boolean
    retryFailedPrints: boolean
    maxRetryAttempts: number
  }
}
```

Generate comprehensive printer configuration system integrated with main settings management.
```

### **Prompt 3.2: Print Testing & Diagnostics**
```bash
/sc:implement --print-testing --diagnostics --troubleshooting --persona-qa --seq

PRINT TESTING SYSTEM: Create comprehensive printer testing and diagnostic tools.

/sc:build --feature --printer-testing --diagnostics --troubleshooting --persona-qa --seq

PRINTER TESTING IMPLEMENTATION:

1. **Comprehensive Test Suite:**
```typescript
interface PrinterTestSuite {
  // Connection tests
  testConnection(profile: PrinterProfile): Promise<ConnectionTestResult>
  testCommunication(profile: PrinterProfile): Promise<CommunicationTestResult>
  
  // Print quality tests  
  testTextPrint(profile: PrinterProfile): Promise<TextPrintResult>
  testTicketFormat(profile: PrinterProfile): Promise<TicketFormatResult>
  testMultipleCopies(profile: PrinterProfile): Promise<MultiCopyResult>
  
  // Hardware tests
  testPaperFeed(profile: PrinterProfile): Promise<PaperFeedResult>
  testCutter(profile: PrinterProfile): Promise<CutterTestResult>
  
  // Performance tests
  testPrintSpeed(profile: PrinterProfile): Promise<SpeedTestResult>
  testContinuousPrint(profile: PrinterProfile, count: number): Promise<ContinuousTestResult>
  
  // Full diagnostic
  runFullDiagnostic(profile: PrinterProfile): Promise<DiagnosticReport>
}

class PrinterDiagnosticService implements PrinterTestSuite {
  async testConnection(profile: PrinterProfile): Promise<ConnectionTestResult> {
    const startTime = Date.now()
    
    try {
      const printer = await this.connectToPrinter(profile)
      const status = await printer.checkPrinterStatus()
      
      return {
        success: true,
        connectionTime: Date.now() - startTime,
        printerStatus: status,
        message: 'Connection successful'
      }
    } catch (error) {
      return {
        success: false,
        connectionTime: Date.now() - startTime,
        error: error.message,
        troubleshooting: this.generateTroubleshooting('connection', error)
      }
    }
  }
  
  async testTicketFormat(profile: PrinterProfile): Promise<TicketFormatResult> {
    const testTicketData: ParkingTicketData = {
      businessName: 'TEST PRINT',
      facilityName: 'Printer Test',
      location: '@Test Location',
      contactPhone: 'Test: ' + new Date().toLocaleTimeString(),
      ticketNumber: '99999',
      vehicleNumber: 'TEST-1234',
      date: new Date().toLocaleDateString(),
      vehicleType: 'Test Vehicle',
      inTime: new Date().toLocaleTimeString()
    }
    
    try {
      const printer = await this.connectToPrinter(profile)
      const result = await printer.printTicket(testTicketData)
      
      return {
        success: result.success,
        testTicketData,
        printResult: result,
        recommendations: this.generatePrintRecommendations(profile, result)
      }
    } catch (error) {
      return {
        success: false,
        testTicketData,
        error: error.message,
        troubleshooting: this.generateTroubleshooting('print', error)
      }
    }
  }
  
  async runFullDiagnostic(profile: PrinterProfile): Promise<DiagnosticReport> {
    const report: DiagnosticReport = {
      printerId: profile.id,
      printerName: profile.name,
      testStartTime: new Date(),
      tests: [],
      overallStatus: 'running',
      recommendations: []
    }
    
    // Run all tests
    const tests = [
      { name: 'Connection', test: () => this.testConnection(profile) },
      { name: 'Text Print', test: () => this.testTextPrint(profile) },
      { name: 'Ticket Format', test: () => this.testTicketFormat(profile) },
      { name: 'Paper Feed', test: () => this.testPaperFeed(profile) },
      { name: 'Print Speed', test: () => this.testPrintSpeed(profile) }
    ]
    
    for (const testCase of tests) {
      try {
        const result = await testCase.test()
        report.tests.push({
          testName: testCase.name,
          result,
          timestamp: new Date()
        })
      } catch (error) {
        report.tests.push({
          testName: testCase.name,
          result: { success: false, error: error.message },
          timestamp: new Date()
        })
      }
    }
    
    // Calculate overall status
    const failedTests = report.tests.filter(test => !test.result.success)
    report.overallStatus = failedTests.length === 0 ? 'passed' : 
                          failedTests.length <= 2 ? 'warning' : 'failed'
    
    // Generate recommendations
    report.recommendations = this.generateDiagnosticRecommendations(report)
    report.testEndTime = new Date()
    
    return report
  }
  
  private generateTroubleshooting(errorType: string, error: Error): TroubleshootingStep[] {
    const troubleshootingGuides = {
      connection: [
        { step: 1, description: 'Check printer power connection', action: 'Ensure printer is powered on' },
        { step: 2, description: 'Verify cable connections', action: 'Check USB/network cable is securely connected' },
        { step: 3, description: 'Restart printer', action: 'Turn printer off and on again' },
        { step: 4, description: 'Check printer drivers', action: 'Ensure correct printer drivers are installed' }
      ],
      print: [
        { step: 1, description: 'Check paper supply', action: 'Ensure printer has sufficient paper' },
        { step: 2, description: 'Clear print queue', action: 'Cancel any pending print jobs' },
        { step: 3, description: 'Check printer settings', action: 'Verify paper size and print settings' },
        { step: 4, description: 'Test with different document', action: 'Try printing a simple test page' }
      ]
    }
    
    return troubleshootingGuides[errorType] || []
  }
}
```

2. **Error Recovery & Troubleshooting:**
```typescript
interface PrinterErrorRecovery {
  // Common error scenarios
  handlePrinterOffline(profile: PrinterProfile): Promise<RecoveryResult>
  handlePaperJam(profile: PrinterProfile): Promise<RecoveryResult>
  handleOutOfPaper(profile: PrinterProfile): Promise<RecoveryResult>
  handleCommunicationError(profile: PrinterProfile): Promise<RecoveryResult>
  
  // Auto-recovery procedures
  attemptAutoRecovery(error: PrinterError): Promise<boolean>
  restartPrinterConnection(profile: PrinterProfile): Promise<void>
  clearPrintQueue(profile: PrinterProfile): Promise<void>
}

const PRINTER_ERROR_RECOVERY = {
  OFFLINE: {
    autoRecovery: true,
    steps: ['Check power', 'Verify connections', 'Restart printer'],
    retryDelay: 30000 // 30 seconds
  },
  
  PAPER_JAM: {
    autoRecovery: false,
    steps: ['Open printer cover', 'Remove jammed paper', 'Close cover and resume'],
    requiresManualIntervention: true
  },
  
  OUT_OF_PAPER: {
    autoRecovery: false,
    steps: ['Load paper into printer', 'Adjust paper guides', 'Resume printing'],
    retryAfterUserAction: true
  },
  
  COMMUNICATION_ERROR: {
    autoRecovery: true,
    steps: ['Check cable connections', 'Restart print service', 'Test connection'],
    retryDelay: 10000 // 10 seconds
  }
}
```

Generate comprehensive printer testing system with diagnostics, troubleshooting guides, and auto-recovery procedures.
```

---

## **Phase 4: Integration & User Interface**

### **Prompt 4.1: Print UI Components**
```bash
/sc:implement --print-ui --user-interface --integration --persona-frontend --magic --seq

PRINT USER INTERFACE: Create intuitive print management interface integrated with existing application.

/sc:build --feature --print-ui --components --integration --persona-frontend --magic

PRINT UI IMPLEMENTATION:

1. **Print Button Components:**
```typescript
interface PrintButtonProps {
  ticketData: ParkingTicketData
  ticketType: 'entry' | 'exit' | 'receipt'
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'icon'
  showPreview?: boolean
  copies?: number
  onPrintStart?: () => void
  onPrintComplete?: (result: PrintResult) => void
  onPrintError?: (error: Error) => void
}

const PrintButton: React.FC<PrintButtonProps> = ({
  ticketData,
  ticketType,
  disabled = false,
  variant = 'primary',
  showPreview = true,
  copies = 1,
  onPrintStart,
  onPrintComplete,
  onPrintError
}) => {
  const [printing, setPrinting] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  
  const handlePrint = async () => {
    if (showPreview) {
      setShowPreviewModal(true)
      return
    }
    
    await executePrint()
  }
  
  const executePrint = async () => {
    setPrinting(true)
    onPrintStart?.()
    
    try {
      const printService = new PrintService()
      const result = await printService.printTicket(ticketData, ticketType, copies)
      
      if (result.success) {
        onPrintComplete?.(result)
        // Show success notification
        toast.success(`${ticketType} ticket printed successfully`)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      onPrintError?.(error as Error)
      toast.error(`Print failed: ${error.message}`)
    } finally {
      setPrinting(false)
    }
  }
  
  return (
    <>
      <Button
        variant={variant}
        disabled={disabled || printing}
        onClick={handlePrint}
        className="print-button"
      >
        {printing ? (
          <>
            <Printer className="w-4 h-4 mr-2 animate-spin" />
            Printing...
          </>
        ) : (
          <>
            <Printer className="w-4 h-4 mr-2" />
            Print {ticketType.charAt(0).toUpperCase() + ticketType.slice(1)}
          </>
        )}
      </Button>
      
      {showPreviewModal && (
        <PrintPreviewModal
          ticketData={ticketData}
          ticketType={ticketType}
          copies={copies}
          onPrint={executePrint}
          onClose={() => setShowPreviewModal(false)}
        />
      )}
    </>
  )
}
```

2. **Print Preview Modal:**
```typescript
interface PrintPreviewModalProps {
  ticketData: ParkingTicketData
  ticketType: 'entry' | 'exit' | 'receipt'
  copies: number
  onPrint: () => Promise<void>
  onClose: () => void
}

const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  ticketData,
  ticketType,
  copies,
  onPrint,
  onClose
}) => {
  const [selectedPrinter, setSelectedPrinter] = useState<string>('')
  const [printCopies, setPrintCopies] = useState(copies)
  const [printerProfiles] = usePrinterProfiles()
  
  return (
    <Modal open={true} onClose={onClose} size="lg">
      <Modal.Header>
        <h3>Print Preview - {ticketType.charAt(0).toUpperCase() + ticketType.slice(1)} Ticket</h3>
      </Modal.Header>
      
      <Modal.Body>
        <div className="grid grid-cols-2 gap-6">
          {/* Print Preview */}
          <div className="space-y-4">
            <h4 className="font-semibold">Preview</h4>
            <div className="border rounded-lg p-4 bg-white shadow-inner">
              <ParkingTicket
                {...ticketData}
                ticketType={ticketType}
                printMode="preview"
              />
            </div>
          </div>
          
          {/* Print Options */}
          <div className="space-y-4">
            <h4 className="font-semibold">Print Options</h4>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Printer
              </label>
              <Select
                value={selectedPrinter}
                onValueChange={setSelectedPrinter}
              >
                {printerProfiles.map(printer => (
                  <SelectItem key={printer.id} value={printer.id}>
                    {printer.name} ({printer.type})
                  </SelectItem>
                ))}
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Number of Copies
              </label>
              <Input
                type="number"
                min="1"
                max="5"
                value={printCopies}
                onChange={(e) => setPrintCopies(parseInt(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <h5 className="font-medium">Ticket Details</h5>
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Vehicle:</span> {ticketData.vehicleNumber}</p>
                <p><span className="font-medium">Type:</span> {ticketData.vehicleType}</p>
                <p><span className="font-medium">Time:</span> {ticketData.inTime}</p>
                {ticketData.outTime && (
                  <p><span className="font-medium">Out Time:</span> {ticketData.outTime}</p>
                )}
                {ticketData.receivedAmount && (
                  <p><span className="font-medium">Amount:</span> Rs. {ticketData.receivedAmount}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={onPrint}
          disabled={!selectedPrinter}
        >
          <Printer className="w-4 h-4 mr-2" />
          Print {printCopies > 1 ? `(${printCopies} copies)` : ''}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
```

3. **Integration with Existing Forms:**
```typescript
// Integration with vehicle entry form
const VehicleEntryForm: React.FC = () => {
  const [formData, setFormData] = useState<VehicleEntryFormData>({})
  const [entryCreated, setEntryCreated] = useState<ParkingEntry | null>(null)
  
  const handleSubmit = async (data: VehicleEntryFormData) => {
    try {
      const entry = await createParkingEntry(data)
      setEntryCreated(entry)
      
      // Auto-print if enabled in settings
      const printSettings = await getPrintSettings()
      if (printSettings.autoPrintEntry) {
        await printEntryTicket(entry)
      }
    } catch (error) {
      toast.error('Failed to create entry')
    }
  }
  
  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>
        {/* Form fields */}
      </form>
      
      {entryCreated && (
        <div className="flex justify-center space-x-4">
          <PrintButton
            ticketData={convertToPrintData(entryCreated)}
            ticketType="entry"
            onPrintComplete={(result) => {
              toast.success('Entry ticket printed')
            }}
          />
        </div>
      )}
    </div>
  )
}
```

Generate comprehensive print UI components with preview functionality and seamless integration with existing application workflows.
```

### **Prompt 4.2: Print Service Integration**
```bash
/sc:implement --print-service --application-integration --existing-preserve --persona-backend --seq

PRINT SERVICE INTEGRATION: Integrate printing services with existing application while preserving all current functionality.

/sc:build --feature --print-integration --service-layer --preserve-existing --persona-backend --seq

PRINT SERVICE INTEGRATION:

1. **Print Service Layer:**
```typescript
class PrintService {
  constructor(
    private queueService: PrintQueueService,
    private configService: PrinterConfigService,
    private printerService: PrinterCommunicationService
  ) {}
  
  // High-level print operations
  async printEntryTicket(entryData: ParkingEntry): Promise<PrintResult> {
    const ticketData = this.convertEntryToPrintData(entryData)
    return await this.printTicket(ticketData, 'entry')
  }
  
  async printExitReceipt(exitData: ParkingExit): Promise<PrintResult> {
    const receiptData = this.convertExitToPrintData(exitData)
    return await this.printTicket(receiptData, 'receipt')
  }
  
  async printTicket(
    ticketData: ParkingTicketData, 
    ticketType: 'entry' | 'exit' | 'receipt',
    options?: PrintOptions
  ): Promise<PrintResult> {
    try {
      // Get print settings
      const printSettings = await this.configService.getPrintDefaults()
      const printerProfile = options?.printerId ? 
        await this.configService.getPrinterProfile(options.printerId) :
        await this.configService.getDefaultPrinter()
      
      if (!printerProfile) {
        throw new Error('No printer configured')
      }
      
      // Create print job
      const printJob = {
        ticketId: ticketData.ticketNumber,
        ticketType,
        ticketData,
        printerProfile,
        priority: options?.priority || 'normal',
        copies: options?.copies || printSettings.defaultCopies,
        maxAttempts: 3
      }
      
      // Add to print queue or print immediately
      if (printSettings.printQueueEnabled) {
        const jobId = await this.queueService.addToPrintQueue(printJob)
        return { success: true, message: `Print job queued: ${jobId}`, jobId }
      } else {
        return await this.printDirectly(printJob)
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
  
  private async printDirectly(job: PrintJob): Promise<PrintResult> {
    const printer = await this.printerService.connectToPrinter(job.printerProfile)
    
    for (let copy = 1; copy <= job.copies; copy++) {
      const result = await printer.printTicket(job.ticketData)
      if (!result.success) {
        throw new Error(`Print failed on copy ${copy}: ${result.error}`)
      }
    }
    
    return { success: true, message: `Printed ${job.copies} copies successfully` }
  }
  
  private convertEntryToPrintData(entry: ParkingEntry): ParkingTicketData {
    return {
      businessName: 'Shree Sai',
      facilityName: 'Vansh Truck Parking',
      location: '@Additional MIDC Mandwa',
      contactPhone: 'M. 9860254266',
      ticketNumber: entry.id.toString(),
      vehicleNumber: entry.vehicleNumber,
      date: new Date(entry.entryTime).toLocaleDateString(),
      vehicleType: entry.vehicleType,
      inTime: new Date(entry.entryTime).toLocaleTimeString()
    }
  }
  
  private convertExitToPrintData(exitData: ParkingExit): ParkingTicketData {
    return {
      businessName: 'Shree Sai',
      facilityName: 'Vansh Truck Parking',
      location: '@Additional MIDC Mandwa',
      contactPhone: 'M. 9860254266',
      ticketNumber: exitData.entryId.toString(),
      vehicleNumber: exitData.vehicleNumber,
      date: new Date(exitData.exitTime).toLocaleDateString(),
      vehicleType: exitData.vehicleType,
      inTime: new Date(exitData.entryTime).toLocaleTimeString(),
      outTime: new Date(exitData.exitTime).toLocaleTimeString(),
      receivedAmount: exitData.parkingFee
    }
  }
}
```

2. **Integration with Existing Workflows:**
```typescript
// Enhanced parking entry service with print integration
class ParkingEntryService {
  constructor(
    private parkingRepository: IParkingRepository,
    private printService: PrintService,
    private settingsService: SettingsService
  ) {}
  
  async createEntry(entryData: CreateEntryRequest): Promise<ParkingEntry> {
    // Preserve existing entry creation logic
    const entry = await this.parkingRepository.create(entryData)
    
    // Add print functionality without breaking existing flow
    const printSettings = await this.settingsService.get('printing.autoPrintEntry')
    if (printSettings) {
      try {
        await this.printService.printEntryTicket(entry)
      } catch (error) {
        // Don't fail entry creation if print fails
        console.warn('Print failed but entry created:', error.message)
      }
    }
    
    return entry
  }
  
  async processExit(exitData: ProcessExitRequest): Promise<ParkingExit> {
    // Preserve existing exit processing logic
    const exit = await this.parkingRepository.processExit(exitData)
    
    // Add print functionality
    const printSettings = await this.settingsService.get('printing.autoPrintExit')
    if (printSettings) {
      try {
        await this.printService.printExitReceipt(exit)
      } catch (error) {
        console.warn('Receipt print failed but exit processed:', error.message)
      }
    }
    
    return exit
  }
}
```

3. **Print Status & Monitoring:**
```typescript
// Print status monitoring service
class PrintStatusService {
  // Monitor print queue status
  async getPrintQueueStatus(): Promise<PrintQueueStatus> {
    return await this.queueService.getQueueStatus()
  }
  
  // Get print history with filtering
  async getPrintHistory(filters: PrintHistoryFilters): Promise<PrintJob[]> {
    return await this.queueService.getPrintHistory(filters)
  }
  
  // Monitor printer health
  async getAllPrinterStatus(): Promise<PrinterStatus[]> {
    const profiles = await this.configService.getAllPrinterProfiles()
    const statusPromises = profiles.map(async profile => {
      try {
        const printer = await this.printerService.connectToPrinter(profile)
        const status = await printer.checkPrinterStatus()
        return { printerId: profile.id, printerName: profile.name, ...status }
      } catch (error) {
        return { 
          printerId: profile.id, 
          printerName: profile.name, 
          status: 'offline', 
          error: error.message 
        }
      }
    })
    
    return await Promise.all(statusPromises)
  }
  
  // Real-time print notifications
  onPrintStatusChange(callback: (status: PrintStatusUpdate) => void): void {
    this.queueService.onPrintComplete((job) => {
      callback({ type: 'print_complete', job })
    })
    
    this.queueService.onPrintError((job, error) => {
      callback({ type: 'print_error', job, error })
    })
  }
}
```

Generate comprehensive print service integration that enhances existing workflows without breaking current functionality.
```

---

## **Implementation Summary & Success Criteria**

### **🖨️ PRINTING SYSTEM IMPLEMENTATION PHASES:**

**Phase 1: Ticket Templates (1-2 days)**
- Professional parking ticket templates matching physical format
- Multi-format support (entry, exit, receipt, thermal)
- Print-optimized CSS with exact dimensions

**Phase 2: Hardware Integration (2-3 days)**
- Print queue management with retry logic
- Thermal printer ESC/POS command generation
- USB and network printer communication

**Phase 3: Configuration (1-2 days)**
- Printer profile management system
- Print settings integration with main configuration
- Testing and diagnostic tools

**Phase 4: UI Integration (1-2 days)**
- Print buttons and preview modals
- Seamless integration with existing forms
- Print status monitoring and history

### **✅ SUCCESS CRITERIA:**

**Functionality:**
- Exact replica of physical parking ticket format
- Support for thermal, laser, and receipt printers
- Automatic printing on entry/exit (configurable)
- Print queue with background processing and retry logic
- Print preview with copy selection

**Integration:**
- Zero impact on existing application functionality
- Seamless integration with current entry/exit workflows
- Integration with main settings system
- Print history and audit trail

**Reliability:**
- Robust error handling and recovery
- Comprehensive printer diagnostics
- Queue management prevents print job loss
- Automatic retry for failed prints

**User Experience:**
- One-click printing with preview option
- Intuitive printer setup and configuration
- Clear error messages and troubleshooting
- Real-time print status updates

---

## **Phase 5: Bluetooth Printer Connectivity**

### **Prompt 5.1: Bluetooth Printer Integration**
```bash
/sc:implement --bluetooth --printer-connectivity --mobile-printing --persona-backend --seq

BLUETOOTH PRINTING: Implement comprehensive Bluetooth printer connectivity for wireless printing capabilities.

/sc:build --feature --bluetooth-printing --device-discovery --pairing --persona-backend --seq

BLUETOOTH PRINTER IMPLEMENTATION:

1. **Bluetooth Device Discovery & Management:**
```typescript
interface BluetoothPrinterService {
  // Device discovery
  scanForBluetoothPrinters(): Promise<BluetoothDevice[]>
  connectToBluetoothPrinter(deviceId: string): Promise<BluetoothPrinterConnection>
  disconnectBluetoothPrinter(deviceId: string): Promise<void>
  
  // Device management
  pairBluetoothDevice(device: BluetoothDevice): Promise<PairingResult>
  getConnectedDevices(): Promise<BluetoothDevice[]>
  removeBluetoothDevice(deviceId: string): Promise<void>
  
  // Print operations
  printViaBluetoothESCPOS(deviceId: string, data: Uint8Array): Promise<PrintResult>
  checkBluetoothPrinterStatus(deviceId: string): Promise<BluetoothPrinterStatus>
}

class BluetoothPrinterManager implements BluetoothPrinterService {
  private connectedDevices = new Map<string, BluetoothRemoteGATTServer>()
  private serviceUUID = '000018f0-0000-1000-8000-00805f9b34fb' // ESC/POS Service
  private characteristicUUID = '00002af1-0000-1000-8000-00805f9b34fb' // Print characteristic
  
  async scanForBluetoothPrinters(): Promise<BluetoothDevice[]> {
    try {
      // Request Bluetooth device access
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [this.serviceUUID] },
          { namePrefix: 'POS-' },
          { namePrefix: 'Thermal-' },
          { namePrefix: 'Receipt-' }
        ],
        optionalServices: [this.serviceUUID]
      })
      
      return [device]
    } catch (error) {
      if (error.name === 'NotFoundError') {
        throw new Error('No Bluetooth printers found. Make sure printer is discoverable.')
      }
      throw new Error(`Bluetooth scan failed: ${error.message}`)
    }
  }
  
  async connectToBluetoothPrinter(deviceId: string): Promise<BluetoothPrinterConnection> {
    try {
      const device = await this.getBluetoothDevice(deviceId)
      const server = await device.gatt.connect()
      
      // Get printing service and characteristic
      const service = await server.getPrimaryService(this.serviceUUID)
      const characteristic = await service.getCharacteristic(this.characteristicUUID)
      
      this.connectedDevices.set(deviceId, server)
      
      return {
        deviceId,
        deviceName: device.name || 'Unknown Printer',
        server,
        characteristic,
        connected: true,
        connectionTime: new Date()
      }
    } catch (error) {
      throw new Error(`Failed to connect to Bluetooth printer: ${error.message}`)
    }
  }
  
  async printViaBluetoothESCPOS(deviceId: string, data: Uint8Array): Promise<PrintResult> {
    const connection = this.connectedDevices.get(deviceId)
    if (!connection || !connection.connected) {
      throw new Error('Bluetooth printer not connected')
    }
    
    try {
      const service = await connection.getPrimaryService(this.serviceUUID)
      const characteristic = await service.getCharacteristic(this.characteristicUUID)
      
      // Send data in chunks (Bluetooth has size limitations)
      const chunkSize = 20 // Standard BLE chunk size
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize)
        await characteristic.writeValue(chunk)
        
        // Small delay between chunks
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      
      return { success: true, message: 'Bluetooth print completed successfully' }
    } catch (error) {
      return { success: false, error: `Bluetooth print failed: ${error.message}` }
    }
  }
}
```

2. **Bluetooth Printer Profile Configuration:**
```typescript
interface BluetoothPrinterProfile extends PrinterProfile {
  connection: {
    type: 'bluetooth'
    settings: BluetoothConfig
  }
}

interface BluetoothConfig {
  deviceId: string
  deviceName: string
  macAddress: string
  serviceUUID: string
  characteristicUUID: string
  autoReconnect: boolean
  connectionTimeout: number // milliseconds
  chunkSize: number // bytes per transmission
  chunkDelay: number // milliseconds between chunks
}

// Extended printer configuration for Bluetooth
const bluetoothPrinterDefaults: BluetoothConfig = {
  deviceId: '',
  deviceName: '',
  macAddress: '',
  serviceUUID: '000018f0-0000-1000-8000-00805f9b34fb',
  characteristicUUID: '00002af1-0000-1000-8000-00805f9b34fb',
  autoReconnect: true,
  connectionTimeout: 10000,
  chunkSize: 20,
  chunkDelay: 50
}
```

3. **Bluetooth Connection Management:**
```typescript
class BluetoothConnectionManager {
  private connectionAttempts = new Map<string, number>()
  private maxRetryAttempts = 3
  private reconnectDelay = 5000
  
  async maintainBluetoothConnection(deviceId: string): Promise<void> {
    const attempts = this.connectionAttempts.get(deviceId) || 0
    
    if (attempts >= this.maxRetryAttempts) {
      throw new Error(`Max reconnection attempts reached for device ${deviceId}`)
    }
    
    try {
      await this.bluetoothService.connectToBluetoothPrinter(deviceId)
      this.connectionAttempts.delete(deviceId)
    } catch (error) {
      this.connectionAttempts.set(deviceId, attempts + 1)
      
      // Retry with exponential backoff
      const delay = this.reconnectDelay * Math.pow(2, attempts)
      setTimeout(() => {
        this.maintainBluetoothConnection(deviceId)
      }, delay)
      
      throw error
    }
  }
  
  async handleBluetoothDisconnection(deviceId: string): Promise<void> {
    const printerProfile = await this.configService.getPrinterProfile(deviceId)
    
    if (printerProfile?.connection.settings.autoReconnect) {
      await this.maintainBluetoothConnection(deviceId)
    }
  }
  
  // Monitor connection status
  monitorBluetoothConnections(): void {
    setInterval(async () => {
      const connectedDevices = await this.bluetoothService.getConnectedDevices()
      
      for (const device of connectedDevices) {
        try {
          await this.bluetoothService.checkBluetoothPrinterStatus(device.id)
        } catch (error) {
          // Connection lost, attempt to reconnect
          await this.handleBluetoothDisconnection(device.id)
        }
      }
    }, 30000) // Check every 30 seconds
  }
}
```

4. **Bluetooth-Specific Error Handling:**
```typescript
interface BluetoothPrintError extends Error {
  type: 'connection' | 'pairing' | 'transmission' | 'timeout'
  deviceId: string
  bluetoothSpecific: boolean
}

class BluetoothErrorHandler {
  handleBluetoothError(error: BluetoothPrintError): ErrorRecoveryPlan {
    const recoveryPlans = {
      connection: {
        autoRecovery: true,
        steps: [
          'Check Bluetooth is enabled on device',
          'Ensure printer is powered on and discoverable',
          'Try moving closer to printer',
          'Restart Bluetooth on device'
        ],
        retryDelay: 10000
      },
      
      pairing: {
        autoRecovery: false,
        steps: [
          'Put printer in pairing mode',
          'Clear Bluetooth cache',
          'Remove device and re-pair',
          'Check printer compatibility'
        ],
        requiresUserIntervention: true
      },
      
      transmission: {
        autoRecovery: true,
        steps: [
          'Check Bluetooth signal strength',
          'Reduce transmission chunk size',
          'Increase delay between chunks',
          'Retry print job'
        ],
        retryDelay: 5000
      },
      
      timeout: {
        autoRecovery: true,
        steps: [
          'Check printer is responsive',
          'Increase connection timeout',
          'Reset Bluetooth connection',
          'Retry operation'
        ],
        retryDelay: 15000
      }
    }
    
    return recoveryPlans[error.type] || recoveryPlans.connection
  }
}
```

5. **Mobile Bluetooth Optimization:**
```typescript
// Mobile-specific Bluetooth optimizations
class MobileBluetoothOptimizer {
  // Optimize for mobile device battery and performance
  optimizeForMobile(): BluetoothOptimizationConfig {
    return {
      // Reduce scan frequency to save battery
      scanDuration: 10000, // 10 seconds max
      scanInterval: 60000, // 1 minute between scans
      
      // Optimize transmission for mobile
      preferredChunkSize: 20, // Smaller chunks for better reliability
      transmissionDelay: 100, // Longer delay for mobile processors
      
      // Connection management
      connectionTimeout: 15000, // Longer timeout for mobile
      keepAliveInterval: 45000, // 45 second keep-alive
      
      // Power management
      enableLowPowerMode: true,
      automaticDisconnect: 300000 // 5 minutes idle disconnect
    }
  }
  
  // Handle mobile-specific Bluetooth permissions
  async requestMobileBluetoothPermissions(): Promise<boolean> {
    // Check if running on mobile device
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    if (isMobile) {
      try {
        // Request location permission (required for Bluetooth on some mobile browsers)
        const locationPermission = await navigator.permissions.query({ name: 'geolocation' })
        if (locationPermission.state !== 'granted') {
          // Inform user about location requirement for Bluetooth
          throw new Error('Location permission required for Bluetooth discovery on mobile devices')
        }
        
        return true
      } catch (error) {
        console.warn('Mobile Bluetooth permission check failed:', error)
        return false
      }
    }
    
    return true
  }
}
```

Generate comprehensive Bluetooth printer connectivity with mobile optimization, connection management, and robust error handling.
```

### **Prompt 5.2: Bluetooth Printer Setup Wizard**
```bash
/sc:implement --bluetooth-setup --wizard --user-experience --persona-frontend --magic --seq

BLUETOOTH SETUP WIZARD: Create intuitive Bluetooth printer setup and pairing interface.

/sc:build --feature --bluetooth-wizard --pairing-ui --mobile-friendly --persona-frontend --magic

BLUETOOTH SETUP UI IMPLEMENTATION:

1. **Bluetooth Printer Setup Wizard:**
```typescript
interface BluetoothSetupWizardProps {
  onPrinterAdded: (printer: BluetoothPrinterProfile) => void
  onCancel: () => void
}

const BluetoothPrinterSetupWizard: React.FC<BluetoothSetupWizardProps> = ({
  onPrinterAdded,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [scanning, setScanning] = useState(false)
  const [discoveredDevices, setDiscoveredDevices] = useState<BluetoothDevice[]>([])
  const [selectedDevice, setSelectedDevice] = useState<BluetoothDevice | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [printerProfile, setPrinterProfile] = useState<Partial<BluetoothPrinterProfile>>({})
  
  const steps = [
    { id: 1, title: 'Enable Bluetooth', description: 'Ensure Bluetooth is enabled' },
    { id: 2, title: 'Discover Printers', description: 'Scan for available printers' },
    { id: 3, title: 'Select Printer', description: 'Choose your printer' },
    { id: 4, title: 'Connect & Test', description: 'Establish connection' },
    { id: 5, title: 'Configuration', description: 'Configure printer settings' }
  ]
  
  const handleScanForPrinters = async () => {
    setScanning(true)
    try {
      const devices = await bluetoothService.scanForBluetoothPrinters()
      setDiscoveredDevices(devices)
      setCurrentStep(3)
    } catch (error) {
      toast.error(`Bluetooth scan failed: ${error.message}`)
    } finally {
      setScanning(false)
    }
  }
  
  const handleDeviceSelect = async (device: BluetoothDevice) => {
    setSelectedDevice(device)
    setConnecting(true)
    
    try {
      const connection = await bluetoothService.connectToBluetoothPrinter(device.id)
      
      // Test print to verify connection
      const testResult = await bluetoothService.testBluetoothPrint(device.id)
      
      if (testResult.success) {
        setPrinterProfile({
          name: device.name || 'Bluetooth Printer',
          type: 'thermal',
          manufacturer: 'Unknown',
          model: device.name || 'Bluetooth Printer',
          connection: {
            type: 'bluetooth',
            settings: {
              deviceId: device.id,
              deviceName: device.name || '',
              macAddress: device.id,
              ...bluetoothPrinterDefaults
            }
          }
        })
        setCurrentStep(5)
      } else {
        throw new Error(testResult.error)
      }
    } catch (error) {
      toast.error(`Connection failed: ${error.message}`)
    } finally {
      setConnecting(false)
    }
  }
  
  return (
    <Modal open={true} onClose={onCancel} size="lg">
      <Modal.Header>
        <h3>Bluetooth Printer Setup</h3>
        <div className="mt-2">
          <StepIndicator steps={steps} currentStep={currentStep} />
        </div>
      </Modal.Header>
      
      <Modal.Body>
        {currentStep === 1 && (
          <BluetoothEnableStep onNext={() => setCurrentStep(2)} />
        )}
        
        {currentStep === 2 && (
          <BluetoothScanStep
            scanning={scanning}
            onScan={handleScanForPrinters}
            onNext={() => setCurrentStep(3)}
          />
        )}
        
        {currentStep === 3 && (
          <DeviceSelectionStep
            devices={discoveredDevices}
            selectedDevice={selectedDevice}
            connecting={connecting}
            onDeviceSelect={handleDeviceSelect}
            onRescan={handleScanForPrinters}
          />
        )}
        
        {currentStep === 4 && (
          <ConnectionTestStep
            device={selectedDevice}
            onNext={() => setCurrentStep(5)}
          />
        )}
        
        {currentStep === 5 && (
          <PrinterConfigurationStep
            printerProfile={printerProfile}
            onConfigChange={setPrinterProfile}
            onComplete={(profile) => {
              onPrinterAdded(profile as BluetoothPrinterProfile)
            }}
          />
        )}
      </Modal.Body>
    </Modal>
  )
}

// Individual step components
const BluetoothScanStep: React.FC<{
  scanning: boolean
  onScan: () => void
  onNext: () => void
}> = ({ scanning, onScan, onNext }) => (
  <div className="text-center py-8 space-y-6">
    <div className="space-y-4">
      <Bluetooth className="w-16 h-16 mx-auto text-blue-500" />
      <div>
        <h4 className="text-lg font-semibold">Scan for Bluetooth Printers</h4>
        <p className="text-gray-600 mt-2">
          Make sure your printer is powered on and in pairing mode
        </p>
      </div>
    </div>
    
    <div className="space-y-4">
      <Button
        onClick={onScan}
        disabled={scanning}
        size="lg"
        className="w-full"
      >
        {scanning ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Scanning for Printers...
          </>
        ) : (
          <>
            <Search className="w-4 h-4 mr-2" />
            Start Scanning
          </>
        )}
      </Button>
      
      <div className="text-sm text-gray-500">
        <p>Tips for successful pairing:</p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Keep printer within 3 feet of device</li>
          <li>Ensure printer is in discoverable mode</li>
          <li>Check printer manual for pairing instructions</li>
        </ul>
      </div>
    </div>
  </div>
)

const DeviceSelectionStep: React.FC<{
  devices: BluetoothDevice[]
  selectedDevice: BluetoothDevice | null
  connecting: boolean
  onDeviceSelect: (device: BluetoothDevice) => void
  onRescan: () => void
}> = ({ devices, selectedDevice, connecting, onDeviceSelect, onRescan }) => (
  <div className="space-y-6">
    <div className="text-center">
      <h4 className="text-lg font-semibold">Select Your Printer</h4>
      <p className="text-gray-600 mt-1">
        Found {devices.length} Bluetooth printer{devices.length !== 1 ? 's' : ''}
      </p>
    </div>
    
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {devices.map(device => (
        <div
          key={device.id}
          className={`border rounded-lg p-4 cursor-pointer transition-colors ${
            selectedDevice?.id === device.id 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => onDeviceSelect(device)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Printer className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium">
                  {device.name || 'Unknown Printer'}
                </div>
                <div className="text-sm text-gray-500">
                  {device.id}
                </div>
              </div>
            </div>
            
            {connecting && selectedDevice?.id === device.id && (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            )}
          </div>
        </div>
      ))}
    </div>
    
    {devices.length === 0 && (
      <div className="text-center py-8 text-gray-500">
        <p>No printers found</p>
        <Button variant="outline" onClick={onRescan} className="mt-3">
          Scan Again
        </Button>
      </div>
    )}
  </div>
)
```

Generate comprehensive Bluetooth printer setup wizard with step-by-step guidance, device discovery, and connection testing.
```

This systematic approach transforms the application from its current state (70% production ready) to an enterprise-grade, scalable solution while preserving all existing functionality and maintaining the excellent accessibility standards already achieved.