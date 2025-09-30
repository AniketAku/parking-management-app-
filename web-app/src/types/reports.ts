// Comprehensive report generation types for parking management system

import type { ParkingEntry } from './index'

// Report Type Definitions
export type ReportType = 'daily' | 'weekly' | 'monthly' | 'custom'

export type QuickSelectOption =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'

// Date Boundary Configuration
export interface DateBoundary {
  startDate: Date
  endDate: Date
}

export interface ReportDateSelection {
  type: ReportType
  quickSelect?: QuickSelectOption
  customRange?: DateBoundary
  autoCalculated: boolean
}

// Data Inclusion Logic
export interface DataInclusionCriteria {
  includeActiveSessions: boolean
  includeCompletedSessions: boolean
  includeExpenses: boolean
  includePendingPayments: boolean
  includePartialPayments: boolean
}

// Report Content Structure
export interface DailyReportContent {
  date: string
  totalSessions: number
  activeSessions: number
  completedSessions: number
  revenue: number
  expenses: number
  netIncome: number
  hourlyBreakdown: HourlyBreakdown[]
  vehicleTypeBreakdown: VehicleTypeBreakdown[]
  paymentMethodBreakdown: PaymentMethodBreakdown[]
}

export interface WeeklyReportContent {
  weekStart: string
  weekEnd: string
  dailyBreakdown: DailyReportContent[]
  weeklyTotals: WeeklyTotals
  weeklyAverages: WeeklyAverages
  peakDay: PeakAnalysis
}

export interface MonthlyReportContent {
  month: string
  year: number
  weeklyBreakdown: WeeklyReportContent[]
  monthlyTotals: MonthlyTotals
  monthlyTrends: MonthlyTrends
  bestPerformingDays: PeakAnalysis[]
  worstPerformingDays: PeakAnalysis[]
}

export interface CustomReportContent {
  startDate: string
  endDate: string
  totalDays: number
  dailyBreakdown?: DailyReportContent[]
  weeklyBreakdown?: WeeklyReportContent[]
  monthlyBreakdown?: MonthlyReportContent[]
  summary: ReportSummary
}

// Supporting Data Structures
export interface HourlyBreakdown {
  hour: number
  entries: number
  exits: number
  revenue: number
  occupancy: number
}

export interface VehicleTypeBreakdown {
  vehicleType: string
  count: number
  percentage: number
  revenue: number
  averageStayDuration: number
}

export interface PaymentMethodBreakdown {
  paymentMethod: string
  count: number
  amount: number
  percentage: number
}

export interface WeeklyTotals {
  totalSessions: number
  totalRevenue: number
  totalExpenses: number
  netIncome: number
  averageOccupancy: number
}

export interface WeeklyAverages {
  avgSessionsPerDay: number
  avgRevenuePerDay: number
  avgStayDuration: number
  avgRevenuePerSession: number
}

export interface MonthlyTotals {
  totalSessions: number
  totalRevenue: number
  totalExpenses: number
  netIncome: number
  totalWorkingDays: number
}

export interface MonthlyTrends {
  revenueGrowth: number
  sessionGrowth: number
  averageSessionValueTrend: number
  occupancyTrend: number
}

export interface PeakAnalysis {
  date: string
  sessions: number
  revenue: number
  occupancyRate: number
  description: string
}

export interface ReportSummary {
  totalSessions: number
  totalRevenue: number
  totalExpenses: number
  netIncome: number
  averageStayDuration: number
  averageRevenuePerSession: number
  occupancyRate: number
  topVehicleType: string
  topPaymentMethod: string
}

// Export Configuration
export interface ExportConfig {
  format: 'pdf' | 'excel' | 'csv'
  includeCharts: boolean
  includeHourlyBreakdown: boolean
  includeDailyBreakdown: boolean
  includeWeeklyBreakdown: boolean
  includeExpenseDetails: boolean
  customFileName?: string
}

export interface ExportResult {
  success: boolean
  fileName: string
  fileUrl?: string
  downloadLink?: string
  error?: string
}

// Report Generation Request
export interface ReportGenerationRequest {
  type: ReportType
  dateSelection: ReportDateSelection
  dataInclusionCriteria: DataInclusionCriteria
  exportConfig?: ExportConfig
  cacheKey?: string
}

// Report Generation Response
export interface ReportGenerationResponse {
  success: boolean
  reportId: string
  reportType: ReportType
  dateRange: DateBoundary
  generatedAt: Date
  data: DailyReportContent | WeeklyReportContent | MonthlyReportContent | CustomReportContent
  metadata: ReportMetadata
  cacheInfo?: CacheInfo
  error?: string
}

export interface ReportMetadata {
  totalRecordsProcessed: number
  processingTimeMs: number
  dataSource: 'live' | 'cached'
  generatedBy: string
  reportVersion: string
}

export interface CacheInfo {
  cached: boolean
  cacheKey: string
  cacheExpiry?: Date
  cacheHit: boolean
}

// Performance Optimization
export interface ReportCache {
  key: string
  reportType: ReportType
  dateRange: DateBoundary
  data: any
  createdAt: Date
  expiresAt: Date
  size: number
}

export interface PerformanceMetrics {
  queryTime: number
  processingTime: number
  cacheHitRate: number
  memoryUsage: number
  recordsProcessed: number
}

// UI State Management
export interface ReportUIState {
  selectedReportType: ReportType
  selectedQuickOption?: QuickSelectOption
  customDateRange?: DateBoundary
  isGenerating: boolean
  isExporting: boolean
  currentReport?: ReportGenerationResponse
  error?: string
  lastGenerated?: Date
}

// Validation Rules
export interface ReportValidationRules {
  maxDateRange: number // days
  maxRecordsPerReport: number
  allowFutureDates: boolean
  minimumDateRange: number // days
  requireExpenseData: boolean
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Real-time Updates
export interface ReportUpdateEvent {
  reportId: string
  updateType: 'data_change' | 'cache_invalidation' | 'generation_complete'
  affectedDateRange: DateBoundary
  timestamp: Date
}

// Expense Integration (if expenses are tracked separately)
export interface ExpenseEntry {
  id: string
  date: Date
  category: string
  description: string
  amount: number
  paymentMethod: string
  createdBy: string
  tags?: string[]
}

export interface ExpenseCategory {
  id: string
  name: string
  description: string
  budgetLimit?: number
  color: string
}

// Report Templates (for future extensibility)
export interface ReportTemplate {
  id: string
  name: string
  description: string
  reportType: ReportType
  defaultDateRange: ReportDateSelection
  defaultInclusions: DataInclusionCriteria
  defaultExportConfig: ExportConfig
  isDefault: boolean
  createdBy: string
  createdAt: Date
}

// Analytics Integration
export interface ReportAnalytics {
  reportId: string
  viewCount: number
  exportCount: number
  lastViewed: Date
  lastExported: Date
  averageGenerationTime: number
  popularExportFormats: { format: string; count: number }[]
}