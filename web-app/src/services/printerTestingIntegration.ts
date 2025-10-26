/**
 * Printer Testing Integration Service
 * Bridges printer diagnostics with existing printer configuration
 */

import { printerDiagnosticService } from './printerDiagnosticService'
import type { DiagnosticReport } from './printerDiagnosticService'
import { printerConfigService } from './printerConfigService'
import type { PrinterProfile } from '../types/printerConfig'
import { log } from '../utils/secureLogger'

export interface TestingIntegrationOptions {
  enableRealTimeMonitoring?: boolean
  autoSaveResults?: boolean
  notifyOnFailure?: boolean
  generatePerformanceAlerts?: boolean
}

export interface TestSchedule {
  id: string
  printerProfileId: string
  testType: 'connection' | 'full_diagnostic' | 'performance' | 'quality'
  schedule: 'daily' | 'weekly' | 'monthly' | 'manual'
  nextRun?: Date
  lastRun?: Date
  isActive: boolean
}

export interface TestingAlert {
  id: string
  printerProfileId: string
  alertType: 'test_failed' | 'performance_degraded' | 'connection_lost' | 'maintenance_due'
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: Date
  acknowledged: boolean
}

class PrinterTestingIntegration {
  private testSchedules: Map<string, TestSchedule> = new Map()
  private testResults: Map<string, DiagnosticReport[]> = new Map()
  private alerts: TestingAlert[] = []

  async runComprehensiveTest(profile: PrinterProfile, options: TestingIntegrationOptions = {}): Promise<DiagnosticReport> {
    try {
      // Run the diagnostic
      const report = await printerDiagnosticService.runFullDiagnostic(profile)
      
      // Store results if auto-save is enabled
      if (options.autoSaveResults) {
        this.saveTestResult(profile.id, report)
      }
      
      // Check for performance issues and generate alerts
      if (options.generatePerformanceAlerts) {
        await this.checkForAlerts(profile, report)
      }
      
      // Update printer profile with latest test results
      await this.updateProfileWithTestResults(profile, report)
      
      return report
    } catch (error) {
      log.error('Comprehensive test failed', error)
      
      if (options.notifyOnFailure) {
        this.createAlert({
          printerProfileId: profile.id,
          alertType: 'test_failed',
          message: `Comprehensive test failed for ${profile.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'high'
        })
      }
      
      throw error
    }
  }

  async runQuickConnectionTest(profile: PrinterProfile): Promise<boolean> {
    try {
      const result = await printerDiagnosticService.testConnection(profile)
      
      // Update profile status
      await printerConfigService.updatePrinterStatus(profile.id, {
        isOnline: result.success,
        lastChecked: new Date(),
        connectionTime: result.connectionTime
      })
      
      return result.success
    } catch (error) {
      log.error('Quick connection test failed', error)
      return false
    }
  }

  async scheduleRegularTesting(profile: PrinterProfile, schedule: Omit<TestSchedule, 'id' | 'nextRun' | 'lastRun'>): Promise<string> {
    const scheduleId = `schedule_${profile.id}_${Date.now()}`
    const nextRun = this.calculateNextRun(schedule.schedule)
    
    const testSchedule: TestSchedule = {
      ...schedule,
      id: scheduleId,
      nextRun,
      isActive: true
    }
    
    this.testSchedules.set(scheduleId, testSchedule)
    
    // TODO: Integrate with actual scheduling system (cron jobs, etc.)
    log.info('Scheduled testing for printer', { printerName: profile.name, schedule: testSchedule })
    
    return scheduleId
  }

  async getTestHistory(printerProfileId: string): Promise<DiagnosticReport[]> {
    return this.testResults.get(printerProfileId) || []
  }

  async getActiveAlerts(printerProfileId?: string): Promise<TestingAlert[]> {
    if (printerProfileId) {
      return this.alerts.filter(alert => 
        alert.printerProfileId === printerProfileId && !alert.acknowledged
      )
    }
    return this.alerts.filter(alert => !alert.acknowledged)
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find(alert => alert.id === alertId)
    if (alert) {
      alert.acknowledged = true
    }
  }

  async generatePerformanceReport(printerProfileId: string, days: number = 30): Promise<{
    summary: string
    metrics: {
      totalTests: number
      successRate: number
      averageReliability: number
      averageQuality: number
      averageConnectionTime: number
    } | null
    trends: {
      reliabilityTrend: { change: number; direction: string }
      connectionTimeTrend: { change: number; direction: string }
      overallTrend: string
    } | null
  }> {
    const testHistory = await this.getTestHistory(printerProfileId)
    const recentTests = testHistory.filter(report => {
      const testDate = new Date(report.testStartTime)
      const cutoff = new Date(Date.now() - (days * 24 * 60 * 60 * 1000))
      return testDate > cutoff
    })

    if (recentTests.length === 0) {
      return {
        summary: 'No test data available for the specified period',
        metrics: null,
        trends: null
      }
    }

    const metrics = {
      totalTests: recentTests.length,
      successRate: (recentTests.filter(r => r.overallStatus === 'passed').length / recentTests.length) * 100,
      averageReliability: recentTests.reduce((sum, r) => sum + (r.performanceMetrics?.reliabilityScore || 0), 0) / recentTests.length,
      averageQuality: recentTests.reduce((sum, r) => sum + (r.performanceMetrics?.qualityScore || 0), 0) / recentTests.length,
      averageConnectionTime: recentTests.reduce((sum, r) => sum + (r.performanceMetrics?.averageConnectionTime || 0), 0) / recentTests.length
    }

    return {
      summary: `Analysis of ${recentTests.length} tests over ${days} days`,
      metrics,
      trends: this.calculateTrends(recentTests),
      recommendations: this.generatePerformanceRecommendations(metrics)
    }
  }

  private saveTestResult(printerProfileId: string, report: DiagnosticReport): void {
    const existing = this.testResults.get(printerProfileId) || []
    existing.push(report)
    
    // Keep only last 50 test results
    if (existing.length > 50) {
      existing.splice(0, existing.length - 50)
    }
    
    this.testResults.set(printerProfileId, existing)
  }

  private async checkForAlerts(profile: PrinterProfile, report: DiagnosticReport): Promise<void> {
    const { performanceMetrics, overallStatus, tests } = report
    
    // Check reliability score
    if (performanceMetrics && performanceMetrics.reliabilityScore < 80) {
      this.createAlert({
        printerProfileId: profile.id,
        alertType: 'performance_degraded',
        message: `Printer ${profile.name} reliability dropped to ${performanceMetrics.reliabilityScore}%`,
        severity: performanceMetrics.reliabilityScore < 60 ? 'critical' : 'high'
      })
    }
    
    // Check connection issues
    const connectionTest = tests.find(test => test.testName === 'Connection')
    if (connectionTest && !connectionTest.result.success) {
      this.createAlert({
        printerProfileId: profile.id,
        alertType: 'connection_lost',
        message: `Connection test failed for ${profile.name}`,
        severity: 'high'
      })
    }
    
    // Check for critical failures
    if (overallStatus === 'failed') {
      this.createAlert({
        printerProfileId: profile.id,
        alertType: 'test_failed',
        message: `Multiple critical tests failed for ${profile.name}`,
        severity: 'critical'
      })
    }
  }

  private createAlert(alertData: Omit<TestingAlert, 'id' | 'timestamp' | 'acknowledged'>): void {
    const alert: TestingAlert = {
      ...alertData,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      acknowledged: false
    }
    
    this.alerts.push(alert)
    log.info('Created testing alert', { alert })
  }

  private async updateProfileWithTestResults(profile: PrinterProfile, report: DiagnosticReport): Promise<void> {
    const lastTestResult = {
      success: report.overallStatus === 'passed',
      message: report.overallStatus === 'passed' ? 'All tests passed' : `${report.tests.filter(t => !t.result.success).length} tests failed`,
      timestamp: report.testEndTime || new Date(),
      responseTime: report.performanceMetrics?.averageConnectionTime
    }

    try {
      await printerConfigService.updatePrinterProfile(profile.id, {
        lastTestResult,
        updatedAt: new Date()
      })
    } catch (error) {
      log.error('Failed to update profile with test results', error)
    }
  }

  private calculateNextRun(schedule: TestSchedule['schedule']): Date {
    const now = new Date()
    switch (schedule) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000)
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000)
    }
  }

  private calculateTrends(reports: DiagnosticReport[]): {
    reliabilityTrend: { change: number; direction: string }
    connectionTimeTrend: { change: number; direction: string }
    overallTrend: string
  } | null {
    if (reports.length < 2) return null

    const sorted = reports.sort((a, b) => 
      new Date(a.testStartTime).getTime() - new Date(b.testStartTime).getTime()
    )

    const first = sorted[0]
    const last = sorted[sorted.length - 1]

    const reliabilityTrend = (last.performanceMetrics?.reliabilityScore || 0) - (first.performanceMetrics?.reliabilityScore || 0)
    const connectionTimeTrend = (last.performanceMetrics?.averageConnectionTime || 0) - (first.performanceMetrics?.averageConnectionTime || 0)

    return {
      reliabilityTrend: {
        change: reliabilityTrend,
        direction: reliabilityTrend > 0 ? 'improving' : reliabilityTrend < 0 ? 'declining' : 'stable'
      },
      connectionTimeTrend: {
        change: connectionTimeTrend,
        direction: connectionTimeTrend < 0 ? 'improving' : connectionTimeTrend > 0 ? 'declining' : 'stable'
      },
      overallTrend: reliabilityTrend > 5 && connectionTimeTrend < 50 ? 'improving' :
                   reliabilityTrend < -5 || connectionTimeTrend > 100 ? 'declining' : 'stable'
    }
  }

  private generatePerformanceRecommendations(metrics: {
    totalTests: number
    successRate: number
    averageReliability: number
    averageQuality: number
    averageConnectionTime: number
  }): string[] {
    const recommendations: string[] = []

    if (metrics.successRate < 90) {
      recommendations.push('Consider increasing test frequency to identify issues earlier')
    }

    if (metrics.averageReliability < 85) {
      recommendations.push('Reliability issues detected - schedule hardware inspection')
    }

    if (metrics.averageConnectionTime > 1000) {
      recommendations.push('Connection times are slow - check network configuration')
    }

    if (metrics.averageQuality < 75) {
      recommendations.push('Print quality declining - clean printer heads and check paper')
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance metrics are healthy - maintain current maintenance schedule')
    }

    return recommendations
  }

  // Integration with existing printer config service
  async testAllActivePrinters(): Promise<Map<string, DiagnosticReport>> {
    try {
      const profiles = await printerConfigService.getAllPrinterProfiles()
      const activeProfiles = profiles.filter(profile => profile.isActive)
      
      const results = new Map<string, DiagnosticReport>()
      
      for (const profile of activeProfiles) {
        try {
          const report = await this.runComprehensiveTest(profile, {
            autoSaveResults: true,
            generatePerformanceAlerts: true,
            notifyOnFailure: true
          })
          results.set(profile.id, report)
        } catch (error) {
          log.error('Failed to test printer', { printerName: profile.name, error })
        }
      }
      
      return results
    } catch (error) {
      log.error('Failed to test active printers', error)
      return new Map()
    }
  }

  async validatePrinterSetup(profile: PrinterProfile): Promise<{
    isValid: boolean
    issues: string[]
    recommendations: string[]
  }> {
    const issues: string[] = []
    const recommendations: string[] = []

    // Test connection
    const connectionResult = await printerDiagnosticService.testConnection(profile)
    if (!connectionResult.success) {
      issues.push(`Connection test failed: ${connectionResult.error}`)
      recommendations.push('Check printer power and connection cables')
    }

    // Validate configuration
    if (!profile.capabilities) {
      issues.push('Printer capabilities not defined')
      recommendations.push('Run printer detection to populate capabilities')
    }

    if (!profile.defaultSettings) {
      issues.push('Default print settings not configured')
      recommendations.push('Configure default print settings for optimal performance')
    }

    // Check for common issues
    if (profile.type === 'thermal' && profile.capabilities.maxWidth < 80) {
      recommendations.push('Consider using wider thermal paper for better ticket formatting')
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    }
  }
}

export const printerTestingIntegration = new PrinterTestingIntegration()

// Utility functions for UI integration
export const formatTestDuration = (startTime: Date, endTime?: Date): string => {
  if (!endTime) return 'Running...'
  
  const duration = endTime.getTime() - startTime.getTime()
  const seconds = Math.floor(duration / 1000)
  const minutes = Math.floor(seconds / 60)
  
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

export const getStatusColor = (status: string): string => {
  const colors = {
    passed: 'text-green-600',
    warning: 'text-yellow-600',
    failed: 'text-red-600',
    running: 'text-blue-600'
  }
  return colors[status as keyof typeof colors] || 'text-gray-600'
}

export const getStatusIcon = (status: string): string => {
  const icons = {
    passed: '✅',
    warning: '⚠️',
    failed: '❌',
    running: '🔄'
  }
  return icons[status as keyof typeof icons] || '❓'
}

export default printerTestingIntegration