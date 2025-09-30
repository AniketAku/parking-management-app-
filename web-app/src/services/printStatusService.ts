import type { 
  PrintJob, 
  PrintQueueStatus, 
  PrinterStatus, 
  PrintStatistics,
  PrintQueueEvents 
} from '../types/printQueue'
import printService from './printService'
import { printQueueManager } from './printQueueService'

export interface PrintStatusUpdate {
  type: 'job' | 'queue' | 'printer' | 'statistics'
  data: any
  timestamp: Date
}

export interface PrintStatusSubscription {
  id: string
  callback: (update: PrintStatusUpdate) => void
  filters?: {
    jobTypes?: PrintJob['ticketType'][]
    printerIds?: string[]
    statusTypes?: PrintJob['status'][]
  }
}

export class PrintStatusService {
  private static instance: PrintStatusService
  private subscriptions: Map<string, PrintStatusSubscription> = new Map()
  private statusCache: Map<string, any> = new Map()
  private statisticsInterval?: NodeJS.Timeout
  private refreshInterval = 30000 // 30 seconds

  private constructor() {
    this.initializeEventListeners()
    this.startStatisticsRefresh()
  }

  static getInstance(): PrintStatusService {
    if (!PrintStatusService.instance) {
      PrintStatusService.instance = new PrintStatusService()
    }
    return PrintStatusService.instance
  }

  private initializeEventListeners(): void {
    printQueueManager.onPrintComplete((job: PrintJob) => {
      this.notifySubscribers({
        type: 'job',
        data: { ...job, event: 'completed' },
        timestamp: new Date()
      })
    })

    printQueueManager.onPrintError((job: PrintJob, error: Error) => {
      this.notifySubscribers({
        type: 'job',
        data: { ...job, event: 'failed', error: error.message },
        timestamp: new Date()
      })
    })

    printQueueManager.onQueueStatusChange((status: PrintQueueStatus) => {
      this.statusCache.set('queue', status)
      this.notifySubscribers({
        type: 'queue',
        data: status,
        timestamp: new Date()
      })
    })
  }

  private startStatisticsRefresh(): void {
    this.statisticsInterval = setInterval(async () => {
      try {
        const statistics = await this.calculateStatistics()
        this.statusCache.set('statistics', statistics)
        this.notifySubscribers({
          type: 'statistics',
          data: statistics,
          timestamp: new Date()
        })
      } catch (error) {
        console.error('Failed to refresh print statistics:', error)
      }
    }, this.refreshInterval)
  }

  private notifySubscribers(update: PrintStatusUpdate): void {
    for (const subscription of this.subscriptions.values()) {
      if (this.shouldNotifySubscriber(subscription, update)) {
        try {
          subscription.callback(update)
        } catch (error) {
          console.error('Subscriber notification error:', error)
        }
      }
    }
  }

  private shouldNotifySubscriber(subscription: PrintStatusSubscription, update: PrintStatusUpdate): boolean {
    if (!subscription.filters) return true

    if (update.type === 'job') {
      const job = update.data as PrintJob
      
      if (subscription.filters.jobTypes && 
          !subscription.filters.jobTypes.includes(job.ticketType)) {
        return false
      }
      
      if (subscription.filters.printerIds && 
          !subscription.filters.printerIds.includes(job.printerProfile.id)) {
        return false
      }
      
      if (subscription.filters.statusTypes && 
          !subscription.filters.statusTypes.includes(job.status)) {
        return false
      }
    }

    return true
  }

  subscribe(callback: (update: PrintStatusUpdate) => void, filters?: PrintStatusSubscription['filters']): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      callback,
      filters
    })

    return subscriptionId
  }

  unsubscribe(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId)
  }

  async getCurrentStatus(): Promise<{
    queue: PrintQueueStatus
    printers: PrinterStatus[]
    statistics: PrintStatistics
  }> {
    try {
      const [queueStatus, printers, statistics] = await Promise.all([
        this.getQueueStatus(),
        this.getPrinterStatuses(),
        this.getStatistics()
      ])

      return {
        queue: queueStatus,
        printers,
        statistics
      }
    } catch (error) {
      console.error('Failed to get current status:', error)
      throw error
    }
  }

  async getQueueStatus(): Promise<PrintQueueStatus> {
    try {
      return await printService.getQueueStatus()
    } catch (error) {
      console.error('Failed to get queue status:', error)
      throw error
    }
  }

  async getPrinterStatuses(): Promise<PrinterStatus[]> {
    try {
      const printers = await printService.getAvailablePrinters()
      
      return Promise.all(printers.map(async (printer) => {
        const queueStatus = await this.getQueueStatus()
        const printerJobs = (await printService.getPrintHistory())
          .filter(job => job.printerProfile.id === printer.id)

        return {
          id: printer.id,
          name: printer.name,
          isOnline: printer.isOnline,
          hasError: !printer.isOnline,
          errorMessage: !printer.isOnline ? 'Printer offline' : undefined,
          paperLevel: this.simulatePaperLevel(),
          inkLevel: printer.type !== 'thermal' ? this.simulateInkLevel() : undefined,
          queuedJobs: queueStatus.queuedJobs,
          lastPrintTime: printerJobs
            .filter(job => job.printedAt)
            .sort((a, b) => (b.printedAt?.getTime() || 0) - (a.printedAt?.getTime() || 0))[0]?.printedAt,
          totalPrints: printerJobs.filter(job => job.status === 'completed').length
        } as PrinterStatus
      }))
    } catch (error) {
      console.error('Failed to get printer statuses:', error)
      throw error
    }
  }

  async getStatistics(): Promise<PrintStatistics> {
    try {
      const cached = this.statusCache.get('statistics')
      if (cached && Date.now() - cached.timestamp < this.refreshInterval) {
        return cached
      }

      const statistics = await this.calculateStatistics()
      this.statusCache.set('statistics', { ...statistics, timestamp: Date.now() })
      return statistics
    } catch (error) {
      console.error('Failed to get print statistics:', error)
      throw error
    }
  }

  private async calculateStatistics(): Promise<PrintStatistics> {
    try {
      const history = await printService.getPrintHistory()
      const queueStatus = await printService.getQueueStatus()
      
      const totalJobs = history.length
      const successfulPrints = history.filter(job => job.status === 'completed').length
      const failedPrints = history.filter(job => job.status === 'failed').length
      
      const completedJobs = history.filter(job => job.printedAt && job.createdAt)
      const averagePrintTime = completedJobs.length > 0
        ? completedJobs.reduce((sum, job) => {
            const printTime = (job.printedAt!.getTime() - job.createdAt.getTime()) / 1000
            return sum + printTime
          }, 0) / completedJobs.length
        : 0

      const printerUsage = new Map<string, number>()
      history.forEach(job => {
        const printerId = job.printerProfile.id
        printerUsage.set(printerId, (printerUsage.get(printerId) || 0) + 1)
      })

      const mostUsedPrinter = Array.from(printerUsage.entries())
        .sort(([,a], [,b]) => b - a)[0]?.[0] || ''

      const hourlyUsage = new Map<number, number>()
      history.forEach(job => {
        const hour = job.createdAt.getHours()
        hourlyUsage.set(hour, (hourlyUsage.get(hour) || 0) + 1)
      })

      const peakPrintingHours = Array.from(hourlyUsage.entries())
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      const typeUsage = new Map<string, number>()
      history.forEach(job => {
        typeUsage.set(job.ticketType, (typeUsage.get(job.ticketType) || 0) + 1)
      })

      const printsByType = Array.from(typeUsage.entries())
        .map(([type, count]) => ({ type, count }))

      const errorRate = totalJobs > 0 ? (failedPrints / totalJobs) * 100 : 0
      const uptime = this.calculateUptime()

      return {
        totalPrintJobs: totalJobs,
        successfulPrints,
        failedPrints,
        averagePrintTime: Math.round(averagePrintTime * 100) / 100,
        mostUsedPrinter,
        peakPrintingHours,
        printsByType,
        errorRate: Math.round(errorRate * 100) / 100,
        uptime
      }
    } catch (error) {
      console.error('Error calculating print statistics:', error)
      throw error
    }
  }

  private calculateUptime(): number {
    const now = Date.now()
    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)
    
    const uptimeMs = now - dayStart.getTime()
    const totalDayMs = 24 * 60 * 60 * 1000
    
    return Math.round((uptimeMs / totalDayMs) * 100 * 100) / 100
  }

  private simulatePaperLevel(): 'high' | 'medium' | 'low' | 'empty' {
    const random = Math.random()
    if (random < 0.1) return 'empty'
    if (random < 0.2) return 'low'
    if (random < 0.5) return 'medium'
    return 'high'
  }

  private simulateInkLevel(): 'high' | 'medium' | 'low' | 'empty' {
    const random = Math.random()
    if (random < 0.05) return 'empty'
    if (random < 0.15) return 'low'
    if (random < 0.4) return 'medium'
    return 'high'
  }

  async testPrinter(printerId: string): Promise<{ success: boolean; message: string; responseTime: number }> {
    try {
      const startTime = Date.now()
      const success = await printQueueManager.testPrinter(printerId)
      const responseTime = Date.now() - startTime

      return {
        success,
        message: success ? 'Printer test successful' : 'Printer test failed',
        responseTime
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown test error',
        responseTime: 0
      }
    }
  }

  async refreshPrinterStatus(): Promise<PrinterStatus[]> {
    this.statusCache.delete('printers')
    return this.getPrinterStatuses()
  }

  destroy(): void {
    if (this.statisticsInterval) {
      clearInterval(this.statisticsInterval)
    }
    this.subscriptions.clear()
    this.statusCache.clear()
  }
}

export default PrintStatusService.getInstance()