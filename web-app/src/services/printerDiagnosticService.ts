/**
 * Comprehensive Printer Testing and Diagnostic Service
 * Provides testing, troubleshooting, and auto-recovery capabilities
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import type { PrinterProfile } from '../types/printerConfig'

interface MockPrinter {
  checkPrinterStatus(): Promise<string>
  printText(text: string): Promise<{ success: boolean }>
  printTicket(data: ParkingTicketData): Promise<{ success: boolean }>
  printMultipleCopies(text: string, copies: number): Promise<{ success: boolean; copiesPrinted: number }>
  testPaperFeed(): Promise<{ success: boolean; mechanism: string }>
  testCutter(): Promise<{ success: boolean; quality: string }>
}

export interface ConnectionTestResult {
  success: boolean
  connectionTime: number
  printerStatus?: string
  error?: string
  troubleshooting?: TroubleshootingStep[]
}

export interface CommunicationTestResult {
  success: boolean
  responseTime: number
  commandsSupported: string[]
  error?: string
  troubleshooting?: TroubleshootingStep[]
}

export interface TextPrintResult {
  success: boolean
  printTime: number
  quality: 'excellent' | 'good' | 'fair' | 'poor'
  error?: string
  troubleshooting?: TroubleshootingStep[]
}

export interface TicketFormatResult {
  success: boolean
  testTicketData: ParkingTicketData
  printResult: { success: boolean; [key: string]: unknown }
  recommendations?: string[]
  error?: string
  troubleshooting?: TroubleshootingStep[]
}

export interface MultiCopyResult {
  success: boolean
  requestedCopies: number
  actualCopies: number
  totalTime: number
  error?: string
  troubleshooting?: TroubleshootingStep[]
}

export interface PaperFeedResult {
  success: boolean
  feedMechanism: 'working' | 'slow' | 'jammed' | 'failed'
  error?: string
  troubleshooting?: TroubleshootingStep[]
}

export interface CutterTestResult {
  success: boolean
  cutQuality: 'clean' | 'rough' | 'failed'
  error?: string
  troubleshooting?: TroubleshootingStep[]
}

export interface SpeedTestResult {
  success: boolean
  printSpeed: number // pages per minute
  benchmark: 'excellent' | 'good' | 'acceptable' | 'slow'
  error?: string
  troubleshooting?: TroubleshootingStep[]
}

export interface ContinuousTestResult {
  success: boolean
  totalJobs: number
  successfulJobs: number
  failedJobs: number
  averageTime: number
  errors: string[]
  troubleshooting?: TroubleshootingStep[]
}

export interface DiagnosticReport {
  printerId: string
  printerName: string
  testStartTime: Date
  testEndTime?: Date
  tests: DiagnosticTestResult[]
  overallStatus: 'passed' | 'warning' | 'failed' | 'running'
  recommendations: string[]
  performanceMetrics?: {
    averageConnectionTime: number
    averagePrintTime: number
    reliabilityScore: number
    qualityScore: number
  }
}

export interface DiagnosticTestResult {
  testName: string
  result: ConnectionTestResult | TextPrintResult | TicketFormatResult | { success: boolean; [key: string]: unknown }
  timestamp: Date
  duration?: number
}

export interface TroubleshootingStep {
  step: number
  description: string
  action: string
  isAutomatic?: boolean
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

export interface ParkingTicketData {
  businessName: string
  facilityName: string
  location: string
  contactPhone: string
  ticketNumber: string
  vehicleNumber: string
  date: string
  vehicleType: string
  inTime: string
}

export interface RecoveryResult {
  success: boolean
  message: string
  autoRecoveryAttempted: boolean
  manualStepsRequired: TroubleshootingStep[]
}

export interface PrinterError {
  code: string
  message: string
  category: 'connection' | 'communication' | 'hardware' | 'driver' | 'paper' | 'unknown'
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: Date
}

interface PrinterTestSuite {
  testConnection(profile: PrinterProfile): Promise<ConnectionTestResult>
  testCommunication(profile: PrinterProfile): Promise<CommunicationTestResult>
  testTextPrint(profile: PrinterProfile): Promise<TextPrintResult>
  testTicketFormat(profile: PrinterProfile): Promise<TicketFormatResult>
  testMultipleCopies(profile: PrinterProfile): Promise<MultiCopyResult>
  testPaperFeed(profile: PrinterProfile): Promise<PaperFeedResult>
  testCutter(profile: PrinterProfile): Promise<CutterTestResult>
  testPrintSpeed(profile: PrinterProfile): Promise<SpeedTestResult>
  testContinuousPrint(profile: PrinterProfile, count: number): Promise<ContinuousTestResult>
  runFullDiagnostic(profile: PrinterProfile): Promise<DiagnosticReport>
}

interface PrinterErrorRecovery {
  handlePrinterOffline(profile: PrinterProfile): Promise<RecoveryResult>
  handlePaperJam(profile: PrinterProfile): Promise<RecoveryResult>
  handleOutOfPaper(profile: PrinterProfile): Promise<RecoveryResult>
  handleCommunicationError(profile: PrinterProfile): Promise<RecoveryResult>
  attemptAutoRecovery(error: PrinterError): Promise<boolean>
  restartPrinterConnection(profile: PrinterProfile): Promise<void>
  clearPrintQueue(profile: PrinterProfile): Promise<void>
}

const PRINTER_ERROR_RECOVERY = {
  OFFLINE: {
    autoRecovery: true,
    steps: ['Check power', 'Verify connections', 'Restart printer'],
    retryDelay: 30000
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
    retryDelay: 10000
  }
} as const

export class PrinterDiagnosticService implements PrinterTestSuite, PrinterErrorRecovery {
  
  async testConnection(profile: PrinterProfile): Promise<ConnectionTestResult> {
    const startTime = Date.now()
    
    try {
      const printer = await this.connectToPrinter(profile)
      const status = await printer.checkPrinterStatus()
      
      return {
        success: true,
        connectionTime: Date.now() - startTime,
        printerStatus: status,
      }
    } catch (error) {
      return {
        success: false,
        connectionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        troubleshooting: this.generateTroubleshooting('connection', error as Error)
      }
    }
  }

  async testCommunication(profile: PrinterProfile): Promise<CommunicationTestResult> {
    const startTime = Date.now()
    
    try {
      const printer = await this.connectToPrinter(profile)
      const commands = await this.testSupportedCommands(printer, profile)
      
      return {
        success: true,
        responseTime: Date.now() - startTime,
        commandsSupported: commands
      }
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        commandsSupported: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        troubleshooting: this.generateTroubleshooting('communication', error as Error)
      }
    }
  }

  async testTextPrint(profile: PrinterProfile): Promise<TextPrintResult> {
    const startTime = Date.now()
    const testText = `
PRINTER TEST - ${new Date().toLocaleString()}
========================================
Profile: ${profile.name}
Type: ${profile.type}
Model: ${profile.manufacturer} ${profile.model}

This is a printer test to verify:
- Text clarity and alignment
- Character spacing and fonts  
- Line feed functionality
- Print density settings

Test completed successfully.
========================================
`

    try {
      const printer = await this.connectToPrinter(profile)
      const result = await printer.printText(testText)
      const quality = this.assessPrintQuality(result)
      
      return {
        success: true,
        printTime: Date.now() - startTime,
        quality
      }
    } catch (error) {
      return {
        success: false,
        printTime: Date.now() - startTime,
        quality: 'poor',
        error: error instanceof Error ? error.message : 'Unknown error',
        troubleshooting: this.generateTroubleshooting('print', error as Error)
      }
    }
  }
  
  async testTicketFormat(profile: PrinterProfile): Promise<TicketFormatResult> {
    const testTicketData: ParkingTicketData = {
      businessName: 'TEST PRINT',
      facilityName: 'Printer Test',
      location: 'Test Location',
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
        error: error instanceof Error ? error.message : 'Unknown error',
        troubleshooting: this.generateTroubleshooting('print', error as Error)
      }
    }
  }

  async testMultipleCopies(profile: PrinterProfile): Promise<MultiCopyResult> {
    const requestedCopies = 3
    const startTime = Date.now()
    
    try {
      const printer = await this.connectToPrinter(profile)
      const result = await printer.printMultipleCopies('Test Copy Print', requestedCopies)
      
      return {
        success: true,
        requestedCopies,
        actualCopies: result.copiesPrinted || requestedCopies,
        totalTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        requestedCopies,
        actualCopies: 0,
        totalTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        troubleshooting: this.generateTroubleshooting('print', error as Error)
      }
    }
  }

  async testPaperFeed(profile: PrinterProfile): Promise<PaperFeedResult> {
    try {
      const printer = await this.connectToPrinter(profile)
      const feedTest = await printer.testPaperFeed()
      
      return {
        success: feedTest.success,
        feedMechanism: feedTest.mechanism || 'working'
      }
    } catch (error) {
      return {
        success: false,
        feedMechanism: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        troubleshooting: this.generateTroubleshooting('hardware', error as Error)
      }
    }
  }

  async testCutter(profile: PrinterProfile): Promise<CutterTestResult> {
    if (!profile.capabilities.cutterSupport) {
      return {
        success: true,
        cutQuality: 'clean' as const,
        error: 'Cutter not supported by this printer'
      }
    }

    try {
      const printer = await this.connectToPrinter(profile)
      const cutTest = await printer.testCutter()
      
      return {
        success: cutTest.success,
        cutQuality: cutTest.quality || 'clean'
      }
    } catch (error) {
      return {
        success: false,
        cutQuality: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        troubleshooting: this.generateTroubleshooting('hardware', error as Error)
      }
    }
  }

  async testPrintSpeed(profile: PrinterProfile): Promise<SpeedTestResult> {
    const startTime = Date.now()
    const testPages = 5
    
    try {
      const printer = await this.connectToPrinter(profile)
      
      for (let i = 0; i < testPages; i++) {
        await printer.printText(`Speed test page ${i + 1}/${testPages}`)
      }
      
      const totalTime = Date.now() - startTime
      const pagesPerMinute = (testPages / (totalTime / 1000)) * 60
      const benchmark = this.benchmarkSpeed(pagesPerMinute, profile.type)
      
      return {
        success: true,
        printSpeed: Math.round(pagesPerMinute * 100) / 100,
        benchmark
      }
    } catch (error) {
      return {
        success: false,
        printSpeed: 0,
        benchmark: 'slow',
        error: error instanceof Error ? error.message : 'Unknown error',
        troubleshooting: this.generateTroubleshooting('performance', error as Error)
      }
    }
  }

  async testContinuousPrint(profile: PrinterProfile, count: number): Promise<ContinuousTestResult> {
    const results = {
      success: false,
      totalJobs: count,
      successfulJobs: 0,
      failedJobs: 0,
      averageTime: 0,
      errors: [] as string[]
    }

    const times: number[] = []
    
    try {
      const printer = await this.connectToPrinter(profile)
      
      for (let i = 0; i < count; i++) {
        try {
          const start = Date.now()
          await printer.printText(`Continuous test ${i + 1}/${count}`)
          times.push(Date.now() - start)
          results.successfulJobs++
        } catch (error) {
          results.failedJobs++
          results.errors.push(error instanceof Error ? error.message : 'Unknown error')
        }
      }
      
      results.averageTime = times.reduce((a, b) => a + b, 0) / times.length
      results.success = results.successfulJobs > 0
      
      if (results.failedJobs > 0) {
        results.troubleshooting = this.generateTroubleshooting('continuous', new Error(`${results.failedJobs} jobs failed`))
      }
      
    } catch (error) {
      results.errors.push(error instanceof Error ? error.message : 'Unknown error')
      results.troubleshooting = this.generateTroubleshooting('continuous', error as Error)
    }

    return results
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
    
    const tests = [
      { name: 'Connection', test: () => this.testConnection(profile) },
      { name: 'Communication', test: () => this.testCommunication(profile) },
      { name: 'Text Print', test: () => this.testTextPrint(profile) },
      { name: 'Ticket Format', test: () => this.testTicketFormat(profile) },
      { name: 'Paper Feed', test: () => this.testPaperFeed(profile) },
      ...(profile.capabilities.cutterSupport ? [{ name: 'Cutter', test: () => this.testCutter(profile) }] : []),
      { name: 'Print Speed', test: () => this.testPrintSpeed(profile) }
    ]
    
    for (const testCase of tests) {
      try {
        const testStart = Date.now()
        const result = await testCase.test()
        report.tests.push({
          testName: testCase.name,
          result,
          timestamp: new Date(),
          duration: Date.now() - testStart
        })
      } catch (error) {
        report.tests.push({
          testName: testCase.name,
          result: { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          },
          timestamp: new Date()
        })
      }
    }
    
    const failedTests = report.tests.filter(test => !test.result.success)
    report.overallStatus = failedTests.length === 0 ? 'passed' : 
                          failedTests.length <= 2 ? 'warning' : 'failed'
    
    report.recommendations = this.generateDiagnosticRecommendations(report)
    report.testEndTime = new Date()
    
    report.performanceMetrics = this.calculatePerformanceMetrics(report.tests)
    
    return report
  }

  async handlePrinterOffline(profile: PrinterProfile): Promise<RecoveryResult> {
    const steps = PRINTER_ERROR_RECOVERY.OFFLINE.steps.map((step, index) => ({
      step: index + 1,
      description: step,
      action: step,
      isAutomatic: index < 2,
      severity: 'medium' as const
    }))

    if (PRINTER_ERROR_RECOVERY.OFFLINE.autoRecovery) {
      try {
        await this.restartPrinterConnection(profile)
        const testResult = await this.testConnection(profile)
        
        if (testResult.success) {
          return {
            success: true,
            message: 'Auto-recovery successful - printer is back online',
            autoRecoveryAttempted: true,
            manualStepsRequired: []
          }
        }
      } catch (error) {
        // Auto-recovery failed, provide manual steps
      }
    }

    return {
      success: false,
      message: 'Manual intervention required',
      autoRecoveryAttempted: PRINTER_ERROR_RECOVERY.OFFLINE.autoRecovery,
      manualStepsRequired: steps
    }
  }

  async handlePaperJam(profile: PrinterProfile): Promise<RecoveryResult> {
    const steps = PRINTER_ERROR_RECOVERY.PAPER_JAM.steps.map((step, index) => ({
      step: index + 1,
      description: step,
      action: step,
      isAutomatic: false,
      severity: 'high' as const
    }))

    return {
      success: false,
      message: 'Paper jam requires manual intervention',
      autoRecoveryAttempted: false,
      manualStepsRequired: steps
    }
  }

  async handleOutOfPaper(profile: PrinterProfile): Promise<RecoveryResult> {
    const steps = PRINTER_ERROR_RECOVERY.OUT_OF_PAPER.steps.map((step, index) => ({
      step: index + 1,
      description: step,
      action: step,
      isAutomatic: false,
      severity: 'medium' as const
    }))

    return {
      success: false,
      message: 'Please refill paper and resume printing',
      autoRecoveryAttempted: false,
      manualStepsRequired: steps
    }
  }

  async handleCommunicationError(profile: PrinterProfile): Promise<RecoveryResult> {
    const steps = PRINTER_ERROR_RECOVERY.COMMUNICATION_ERROR.steps.map((step, index) => ({
      step: index + 1,
      description: step,
      action: step,
      isAutomatic: index === 1,
      severity: 'high' as const
    }))

    if (PRINTER_ERROR_RECOVERY.COMMUNICATION_ERROR.autoRecovery) {
      try {
        await this.restartPrinterConnection(profile)
        await new Promise(resolve => setTimeout(resolve, PRINTER_ERROR_RECOVERY.COMMUNICATION_ERROR.retryDelay))
        
        const testResult = await this.testConnection(profile)
        if (testResult.success) {
          return {
            success: true,
            message: 'Communication restored after restart',
            autoRecoveryAttempted: true,
            manualStepsRequired: []
          }
        }
      } catch (error) {
        // Auto-recovery failed
      }
    }

    return {
      success: false,
      message: 'Communication error - manual steps required',
      autoRecoveryAttempted: true,
      manualStepsRequired: steps
    }
  }

  async attemptAutoRecovery(error: PrinterError): Promise<boolean> {
    switch (error.category) {
      case 'connection':
        // Will be implemented with actual printer profile
        return false
      case 'communication': 
        // Will be implemented with actual printer profile
        return false
      default:
        return false
    }
  }

  async restartPrinterConnection(profile: PrinterProfile): Promise<void> {
    try {
      await this.disconnectFromPrinter(profile)
      await new Promise(resolve => setTimeout(resolve, 2000))
      await this.connectToPrinter(profile)
    } catch (error) {
      throw new Error(`Failed to restart printer connection: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async clearPrintQueue(profile: PrinterProfile): Promise<void> {
    // Implementation would depend on the specific printer service
    console.log(`Clearing print queue for printer: ${profile.name}`)
  }

  private async connectToPrinter(_profile: PrinterProfile): Promise<MockPrinter> {
    // Mock implementation - would integrate with actual printer services
    return {
      checkPrinterStatus: () => Promise.resolve('online'),
      printText: (_text: string) => Promise.resolve({ success: true }),
      printTicket: (_data: ParkingTicketData) => Promise.resolve({ success: true }),
      printMultipleCopies: (_text: string, copies: number) => Promise.resolve({ success: true, copiesPrinted: copies }),
      testPaperFeed: () => Promise.resolve({ success: true, mechanism: 'working' }),
      testCutter: () => Promise.resolve({ success: true, quality: 'clean' })
    }
  }

  private async disconnectFromPrinter(_profile: PrinterProfile): Promise<void> {
    // Mock implementation - would disconnect from actual printer
  }

  private async testSupportedCommands(_printer: MockPrinter, _profile: PrinterProfile): Promise<string[]> {
    const baseCommands = ['status', 'print', 'cut']
    const supportedCommands = []
    
    for (const command of baseCommands) {
      try {
        // Mock test - would actually test each command
        supportedCommands.push(command)
      } catch {
        // Command not supported
      }
    }
    
    return supportedCommands
  }

  private assessPrintQuality(_result: { success: boolean }): 'excellent' | 'good' | 'fair' | 'poor' {
    // Mock assessment - would analyze actual print result
    return 'good'
  }

  private benchmarkSpeed(pagesPerMinute: number, printerType: string): 'excellent' | 'good' | 'acceptable' | 'slow' {
    const benchmarks = {
      thermal: { excellent: 10, good: 7, acceptable: 4 },
      laser: { excellent: 20, good: 15, acceptable: 10 },
      inkjet: { excellent: 15, good: 10, acceptable: 6 }
    }
    
    const benchmark = benchmarks[printerType as keyof typeof benchmarks] || benchmarks.thermal
    
    if (pagesPerMinute >= benchmark.excellent) return 'excellent'
    if (pagesPerMinute >= benchmark.good) return 'good'
    if (pagesPerMinute >= benchmark.acceptable) return 'acceptable'
    return 'slow'
  }

  private generateTroubleshooting(errorType: string, error: Error): TroubleshootingStep[] {
    const troubleshootingGuides: Record<string, TroubleshootingStep[]> = {
      connection: [
        { step: 1, description: 'Check printer power connection', action: 'Ensure printer is powered on', isAutomatic: false, severity: 'medium' },
        { step: 2, description: 'Verify cable connections', action: 'Check USB/network cable is securely connected', isAutomatic: false, severity: 'medium' },
        { step: 3, description: 'Restart printer', action: 'Turn printer off and on again', isAutomatic: true, severity: 'low' },
        { step: 4, description: 'Check printer drivers', action: 'Ensure correct printer drivers are installed', isAutomatic: false, severity: 'high' }
      ],
      communication: [
        { step: 1, description: 'Test printer communication', action: 'Send test command to printer', isAutomatic: true, severity: 'low' },
        { step: 2, description: 'Restart communication service', action: 'Restart printer communication service', isAutomatic: true, severity: 'medium' },
        { step: 3, description: 'Check network settings', action: 'Verify IP address and port configuration', isAutomatic: false, severity: 'medium' },
        { step: 4, description: 'Update printer firmware', action: 'Check for and install firmware updates', isAutomatic: false, severity: 'high' }
      ],
      print: [
        { step: 1, description: 'Check paper supply', action: 'Ensure printer has sufficient paper', isAutomatic: false, severity: 'low' },
        { step: 2, description: 'Clear print queue', action: 'Cancel any pending print jobs', isAutomatic: true, severity: 'low' },
        { step: 3, description: 'Check printer settings', action: 'Verify paper size and print settings', isAutomatic: false, severity: 'medium' },
        { step: 4, description: 'Test with different document', action: 'Try printing a simple test page', isAutomatic: true, severity: 'medium' }
      ],
      hardware: [
        { step: 1, description: 'Inspect paper path', action: 'Check for paper jams or obstructions', isAutomatic: false, severity: 'medium' },
        { step: 2, description: 'Clean printer heads', action: 'Perform printer head cleaning cycle', isAutomatic: true, severity: 'low' },
        { step: 3, description: 'Check mechanical components', action: 'Inspect feed rollers and cutting mechanism', isAutomatic: false, severity: 'high' },
        { step: 4, description: 'Calibrate printer', action: 'Run printer calibration procedure', isAutomatic: true, severity: 'medium' }
      ],
      performance: [
        { step: 1, description: 'Check system resources', action: 'Monitor CPU and memory usage during printing', isAutomatic: true, severity: 'low' },
        { step: 2, description: 'Optimize print settings', action: 'Adjust print quality and speed settings', isAutomatic: true, severity: 'medium' },
        { step: 3, description: 'Update drivers', action: 'Install latest printer drivers', isAutomatic: false, severity: 'medium' },
        { step: 4, description: 'Hardware upgrade', action: 'Consider upgrading printer hardware', isAutomatic: false, severity: 'high' }
      ],
      continuous: [
        { step: 1, description: 'Check error patterns', action: 'Analyze failed job error messages', isAutomatic: true, severity: 'low' },
        { step: 2, description: 'Reduce batch size', action: 'Print in smaller batches to identify issues', isAutomatic: true, severity: 'medium' },
        { step: 3, description: 'Monitor printer temperature', action: 'Check if printer is overheating', isAutomatic: false, severity: 'medium' },
        { step: 4, description: 'Service printer', action: 'Schedule professional printer maintenance', isAutomatic: false, severity: 'high' }
      ]
    }
    
    return troubleshootingGuides[errorType] || [
      { step: 1, description: 'Check general printer status', action: 'Verify printer is functioning normally', isAutomatic: true, severity: 'low' },
      { step: 2, description: 'Restart printer service', action: 'Restart the printer service or application', isAutomatic: true, severity: 'medium' },
      { step: 3, description: 'Contact support', action: 'Contact technical support for assistance', isAutomatic: false, severity: 'high' }
    ]
  }

  private generatePrintRecommendations(profile: PrinterProfile, _result: { success: boolean }): string[] {
    const recommendations: string[] = []
    
    if (profile.type === 'thermal') {
      recommendations.push('For thermal printers, ensure proper paper alignment')
      recommendations.push('Monitor print density settings for optimal quality')
    }
    
    if (profile.capabilities.cutterSupport) {
      recommendations.push('Test cutter functionality regularly')
      recommendations.push('Keep cutting mechanism clean and debris-free')
    }
    
    recommendations.push('Run diagnostic tests weekly for optimal performance')
    recommendations.push('Keep printer drivers updated to latest version')
    
    return recommendations
  }

  private generateDiagnosticRecommendations(report: DiagnosticReport): string[] {
    const recommendations: string[] = []
    const failedTests = report.tests.filter(test => !test.result.success)
    
    if (failedTests.length === 0) {
      recommendations.push('✅ All tests passed - printer is functioning optimally')
      recommendations.push('Schedule regular maintenance to maintain performance')
    } else {
      recommendations.push(`⚠️ ${failedTests.length} test(s) failed - immediate attention required`)
      
      failedTests.forEach(test => {
        recommendations.push(`🔧 Fix ${test.testName}: ${test.result.error || 'See troubleshooting steps'}`)
      })
    }
    
    if (report.overallStatus === 'warning') {
      recommendations.push('Monitor printer closely and schedule maintenance')
    } else if (report.overallStatus === 'failed') {
      recommendations.push('🚨 Critical issues detected - printer may need service')
    }
    
    return recommendations
  }

  private calculatePerformanceMetrics(tests: DiagnosticTestResult[]): DiagnosticReport['performanceMetrics'] {
    const connectionTests = tests.filter(test => test.testName === 'Connection')
    const printTests = tests.filter(test => test.testName.includes('Print'))
    
    const avgConnectionTime = connectionTests.length > 0 
      ? connectionTests.reduce((sum, test) => sum + (test.result.connectionTime || 0), 0) / connectionTests.length 
      : 0
      
    const avgPrintTime = printTests.length > 0
      ? printTests.reduce((sum, test) => sum + (test.result.printTime || test.duration || 0), 0) / printTests.length
      : 0
    
    const successfulTests = tests.filter(test => test.result.success).length
    const reliabilityScore = Math.round((successfulTests / tests.length) * 100)
    
    const qualityScore = this.calculateQualityScore(tests)
    
    return {
      averageConnectionTime: Math.round(avgConnectionTime),
      averagePrintTime: Math.round(avgPrintTime),
      reliabilityScore,
      qualityScore
    }
  }

  private calculateQualityScore(tests: DiagnosticTestResult[]): number {
    const qualityTests = tests.filter(test => test.result.quality)
    if (qualityTests.length === 0) return 80 // Default score
    
    const qualityMapping = { excellent: 100, good: 80, fair: 60, poor: 40 }
    const totalScore = qualityTests.reduce((sum, test) => {
      return sum + (qualityMapping[test.result.quality as keyof typeof qualityMapping] || 50)
    }, 0)
    
    return Math.round(totalScore / qualityTests.length)
  }

  static createTestSuiteForProfile(profile: PrinterProfile): PrinterDiagnosticService {
    return new PrinterDiagnosticService()
  }

  static async runQuickDiagnostic(profile: PrinterProfile): Promise<DiagnosticReport> {
    const service = new PrinterDiagnosticService()
    return await service.runFullDiagnostic(profile)
  }

  static async testPrinterConnection(profile: PrinterProfile): Promise<ConnectionTestResult> {
    const service = new PrinterDiagnosticService()
    return await service.testConnection(profile)
  }
}

export const printerDiagnosticService = new PrinterDiagnosticService()