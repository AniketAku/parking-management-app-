// Core domain types matching desktop application

export interface ParkingEntry {
  id: string
  serial?: number          // AUTO: Auto-incrementing serial number from database
  transportName: string
  vehicleType: 'Trailer' | '6 Wheeler' | '4 Wheeler' | '2 Wheeler'
  vehicleNumber: string
  driverName: string
  driverPhone?: string     // NEW: Driver phone number field
  notes?: string
  entryTime: Date
  exitTime?: Date
  status: 'Active' | 'Exited' | 'Overstay'  // UPDATED: Changed from 'Parked' to 'Active', added 'Overstay'
  paymentStatus: 'Paid' | 'Pending' | 'Partial' | 'Failed'  // UPDATED: New database values
  paymentType?: 'Cash' | 'Card' | 'UPI' | 'Net Banking' | 'Online'  // UPDATED: Match business settings
  parkingFee?: number      // UPDATED: Renamed from calculatedFee/actualFee to match database
  actualFee?: number       // Database field: actual fee paid
  calculatedFee?: number   // Database field: calculated fee
  createdBy?: string       // Database field for audit trail
  lastModified?: Date      // NEW: Database field for compatibility
  createdAt: Date
  updatedAt: Date
}

export interface Statistics {
  activeVehicles: number    // UPDATED: Changed from parkedVehicles to match new status
  exitedVehicles: number
  overstayVehicles: number  // NEW: Added overstay tracking
  totalIncome: number
  unpaidVehicles: number
  todayEntries: number
  todayExits: number
  todayIncome: number
}

// New API-compatible statistics type
export interface ParkingStatistics {
  parkedVehicles: number      // Currently active/parked vehicles
  activeVehicles?: number     // Alias for parkedVehicles
  exitedVehicles: number      // Total vehicles that have exited
  todayEntries: number
  todayExits: number
  todayIncome: number
  totalIncome: number         // All-time total income
  unpaidVehicles: number
  overstayingVehicles: number // Keep consistent with service
  overstayVehicles?: number   // Alias for consistency
  averageStayDuration: number
  occupancyRate: number
}

export interface VehicleRates {
  'Trailer': number
  '6 Wheeler': number
  '4 Wheeler': number
  '2 Wheeler': number
}

// Form types
export interface VehicleEntryForm {
  transportName: string
  vehicleType: ParkingEntry['vehicleType']
  vehicleNumber: string
  driverName: string
  driverPhone?: string      // NEW: Added driver phone field
  notes?: string
}

export interface VehicleExitForm {
  vehicleNumber: string
  exitTime: Date
  paymentStatus: ParkingEntry['paymentStatus']
  paymentType?: ParkingEntry['paymentType']
  amountPaid?: number
  notes?: string
}

export interface SearchFilters {
  vehicleNumber?: string
  transportName?: string
  status?: ParkingEntry['status']
  vehicleType?: ParkingEntry['vehicleType']
  paymentStatus?: ParkingEntry['paymentStatus']
  dateFrom?: Date
  dateTo?: Date
}

// API types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// UI State types
export interface LoadingState {
  isLoading: boolean
  error: string | null
}

export interface NotificationState {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  createdAt: Date
}

// User and Auth types
export interface User {
  id: string
  username: string
  role: 'admin' | 'operator' | 'viewer'
  phone: string  // Required for phone-only registration
  fullName?: string
  createdAt: Date
  lastLogin?: Date
}

// API-compatible auth user type
export interface AuthUser {
  id: string
  username: string
  role: 'admin' | 'user'
  permissions?: string[]
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: Date
}

export interface LoginCredentials {
  username: string
  password: string
}

// Theme and UI types
export type Theme = 'light' | 'dark' | 'system'

export interface UIPreferences {
  theme: Theme
  sidebarCollapsed: boolean
  tablePageSize: number
  defaultView: 'dashboard' | 'entry' | 'exit' | 'search'
}

// Socket events for real-time updates
export interface SocketEvents {
  'parking:entry': ParkingEntry
  'parking:exit': ParkingEntry
  'parking:update': ParkingEntry
  'parking:delete': { id: string }
  'parking:statistics': Statistics
}

// Error types
export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface AppError {
  type: 'validation' | 'network' | 'auth' | 'server' | 'unknown'
  message: string
  details?: ValidationError[]
  timestamp: Date
}

// Chart and report types
export interface ChartDataPoint {
  name: string
  value: number
  color?: string
}

export interface ReportData {
  period: 'daily' | 'weekly' | 'monthly'
  startDate: Date
  endDate: Date
  totalEntries: number
  totalExits: number
  totalIncome: number
  averageStayDuration: number
  occupancyRate: number
  peakHours: { hour: number; count: number }[]
  vehicleTypeBreakdown: { type: string; count: number; percentage: number }[]
}

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'pdf'
  dateRange: { start: Date; end: Date }
  filters: SearchFilters
  includeStatistics: boolean
}

// Route types
export type RouteParams = {
  id?: string
}

export type NavigationItem = {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  current: boolean
  badge?: number
}

// Form validation types
export type FieldValidation = {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => string | undefined
}

export type FormValidationRules<T> = {
  [K in keyof T]?: FieldValidation
}

// WebSocket connection state
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface ConnectionState {
  status: ConnectionStatus
  lastConnected?: Date
  error?: string
  retryCount: number
}

// Feature flags
export interface FeatureFlags {
  enableRealTimeUpdates: boolean
  enableNotifications: boolean
  enableExports: boolean
  enableAdvancedSearch: boolean
  enableMobileApp: boolean
}

// Component props helper types
export interface ComponentWithChildren {
  children: React.ReactNode
}

export interface ComponentWithClassName {
  className?: string
}

export interface ComponentWithTestId {
  'data-testid'?: string
}