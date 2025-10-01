/**
 * Settings System Type Definitions
 * Comprehensive type system for multi-level settings management
 */

// Core setting types
export type SettingCategory = 
  | 'business'      // Parking rates, fees, penalties
  | 'user_mgmt'     // Roles, permissions, auth settings
  | 'ui_theme'      // Colors, fonts, layout preferences
  | 'system'        // API timeouts, performance limits, printer setup, thermal printing
  | 'validation'    // Input rules, patterns, constraints
  | 'localization'  // Language, currency, date formats
  | 'notifications' // Alert settings, email preferences
  | 'reporting'     // Report defaults, export settings
  | 'security'      // Password policies, session settings
  | 'performance'   // Monitoring, caching, optimization

export type SettingDataType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'json' 
  | 'array' 
  | 'enum'

export type SettingScope = 
  | 'system'    // Global system settings (admin only)
  | 'location'  // Location-specific overrides (manager level)  
  | 'user'      // Individual user preferences

// Database entities
export interface AppSetting {
  id: string
  category: SettingCategory
  key: string
  value: any
  data_type: SettingDataType
  description?: string
  default_value?: any
  
  // Validation
  validation_rules?: Record<string, any>
  enum_values?: string[]
  min_value?: number
  max_value?: number
  min_length?: number
  max_length?: number
  
  // Metadata
  scope: SettingScope
  is_system_setting: boolean
  requires_restart: boolean
  is_sensitive: boolean
  sort_order: number
  
  // Audit
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

export interface UserSetting {
  id: string
  user_id: string
  setting_key: string
  value: any
  app_setting_id?: string
  created_at: string
  updated_at: string
}

export interface LocationSetting {
  id: string
  location_id: string
  setting_key: string
  value: any
  app_setting_id?: string
  created_at: string
  updated_at: string
  updated_by?: string
}

export interface SettingsHistory {
  id: string
  setting_id: string
  setting_key: string
  old_value?: any
  new_value: any
  change_type: 'INSERT' | 'UPDATE' | 'DELETE'
  changed_by: string
  change_reason?: string
  change_context?: Record<string, any>
  changed_at: string
  source_table: string
  source_ip?: string
  user_agent?: string
}

export interface SettingTemplate {
  id: string
  name: string
  description?: string
  category?: SettingCategory
  template_data: Record<string, any>
  is_default: boolean
  is_system_template: boolean
  applicable_business_types?: string[]
  created_at: string
  created_by?: string
  version: number
  parent_template_id?: string
}

// Strongly typed setting values
export interface BusinessSettings {
  vehicle_rates: {
    'Trailer': number
    '6 Wheeler': number 
    '4 Wheeler': number
    '2 Wheeler': number
  }
  minimum_charge_days: number
  operating_hours: {
    start: string
    end: string
    timezone: string
  }
  payment_methods: string[]
  vehicle_types: string[]
  entry_status_options: string[]
  payment_status_options: string[]
}

export interface UserManagementSettings {
  user_roles: string[]
  session_timeout_minutes: number
  auto_refresh_token: boolean
  persist_session: boolean
  password_min_length: number
  password_require_special: boolean
}

export interface UIThemeSettings {
  primary_colors: Record<string, string>
  secondary_colors: Record<string, string>
  accent_colors: Record<string, string>
  vehicle_type_colors: Record<string, string>
  font_family: string[]
  font_scale: number
  dark_mode: boolean
  theme_mode: 'light' | 'dark' | 'auto'
}

export interface SystemSettings {
  auto_refresh_token: boolean
  realtime_events_per_second: number
  detect_session_in_url: boolean
  api_timeout_ms: number
  retry_attempts: number
  retry_delay_ms: number
}

export interface ValidationSettings {
  enable_form_validation: boolean
  require_field_validation: boolean
  validate_on_change: boolean
  validate_on_submit: boolean
  show_validation_errors: boolean
  max_validation_errors: number
  validation_timeout_ms: number
  vehicle_number_patterns?: string[]
  driver_name_min_length?: number
  driver_name_max_length?: number
  phone_number_pattern?: string
  transport_name_max_length?: number
}

export interface LocalizationSettings {
  default_locale: string
  currency_symbol: string
  currency_code: string
  date_format: string
  time_format: '12' | '24'
  timezone: string
}

export interface PerformanceSettings {
  lcp_budget_ms: number
  fid_budget_ms: number
  cls_budget: number
  fcp_budget_ms: number
  ttfb_budget_ms: number
  bundle_size_budget_kb: number
  memory_usage_budget_mb: number
  accessibility_score_min: number
}

export interface NotificationSettings {
  enable_browser_notifications: boolean
  enable_email_notifications: boolean
  daily_report_time: string
}

export interface ReportingSettings {
  default_report_period: 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'this_year' | 'custom'
  export_formats: string[]
  max_export_records: number
  chart_colors: string[]
}

export interface SecuritySettings {
  enable_audit_logging: boolean
  session_inactivity_timeout: number
  max_login_attempts: number
  login_lockout_duration: number
}

export interface PrintingSettings {
  // Thermal Printer Settings
  enable_thermal_printing: boolean
  default_paper_width: 'thermal-2.75' | 'thermal-3' | 'thermal-4'
  auto_cut_enabled: boolean
  print_test_page_on_connect: boolean
  
  // Print Queue Settings
  max_concurrent_jobs: number
  retry_failed_jobs: boolean
  max_retry_attempts: number
  job_timeout_seconds: number
  
  // Ticket Settings
  print_duplicate_tickets: boolean
  include_qr_codes: boolean
  business_logo_enabled: boolean
  ticket_footer_text: string
  
  // Connection Settings
  auto_discover_printers: boolean
  connection_timeout_ms: number
  enable_printer_status_monitoring: boolean
  status_check_interval_ms: number
  
  // Hardware Profile Integration
  default_printer_profile_id?: string
  fallback_printer_profile_id?: string
  enable_printer_profiles: boolean
  auto_assign_detected_printers: boolean
  
  // Advanced Queue Management
  print_queue_enabled: boolean
  max_queue_size: number
  queue_timeout_minutes: number
  background_printing: boolean
  batch_printing_enabled: boolean
  
  // Quality and Calibration
  default_print_quality: 'draft' | 'normal' | 'high' | 'best'
  enable_calibration: boolean
  auto_calibration: boolean
  
  // Security and Audit
  require_auth_to_print: boolean
  audit_print_jobs: boolean
  restrict_printer_access: boolean
}

// Complete settings interface
export interface AllSettings {
  business: BusinessSettings
  user_mgmt: UserManagementSettings
  ui_theme: UIThemeSettings
  system: SystemSettings
  validation: ValidationSettings
  localization: LocalizationSettings
  performance: PerformanceSettings
  notifications: NotificationSettings
  reporting: ReportingSettings
  security: SecuritySettings
  system: SystemSettings & PrintingSettings
}

// Service interfaces
export interface SettingsServiceOptions {
  userId?: string
  locationId?: string
  enableCache?: boolean
  cacheTimeout?: number
}

export interface SettingValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface BulkUpdateResult {
  key: string
  success: boolean
  error_message?: string
}

export interface SettingsExportData {
  settings: AppSetting[]
  user_settings?: UserSetting[]
  location_settings?: LocationSetting[]
  templates: SettingTemplate[]
  exported_at: string
  exported_by: string
}

export interface SettingsImportOptions {
  overwrite_existing: boolean
  validate_only: boolean
  ignore_system_settings: boolean
  target_scope?: SettingScope
}

export interface SettingsChangeEvent {
  key: string
  old_value?: any
  new_value: any
  category: SettingCategory
  scope: SettingScope
  changed_by: string
  timestamp: string
}

// Hook return types
export interface UseSettingsReturn<T = any> {
  value: T | undefined
  loading: boolean
  error: string | null
  setValue: (newValue: T) => Promise<void>
  reset: () => Promise<void>
  isModified: boolean
}

export interface UseSettingsCategoryReturn<T = Record<string, any>> {
  settings: T
  loading: boolean
  error: string | null
  updateSetting: (key: string, value: any) => Promise<void>
  bulkUpdate: (updates: Partial<T>) => Promise<BulkUpdateResult[]>
  reset: () => Promise<void>
  export: () => Promise<SettingsExportData>
}

// Search and filtering
export interface SettingsSearchOptions {
  category?: SettingCategory
  scope?: SettingScope
  query?: string
  is_system_setting?: boolean
  is_sensitive?: boolean
  modified_since?: string
}

export interface SettingsSearchResult {
  settings: AppSetting[]
  total_count: number
  has_more: boolean
}

// Migration types
export interface SettingsMigration {
  id: string
  name: string
  description: string
  version: string
  up: () => Promise<void>
  down: () => Promise<void>
  dependencies: string[]
}

export interface MigrationStatus {
  migration_id: string
  applied_at: string
  success: boolean
  error_message?: string
}

// Cache types
export interface SettingsCacheEntry {
  value: any
  timestamp: number
  expires_at: number
  key: string
  scope_hash: string
}

export type SettingsCacheStore = Map<string, SettingsCacheEntry>

// Validation schema types (JSON Schema compatible)
export interface SettingValidationSchema {
  type: string
  properties?: Record<string, any>
  required?: string[]
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  enum?: any[]
  items?: any
  additionalProperties?: boolean
}

// UI Component props
export interface SettingsFormFieldProps {
  setting: AppSetting
  value: any
  onChange: (value: any) => void
  error?: string
  disabled?: boolean
  showDescription?: boolean
}

export interface SettingsCategoryTabProps {
  category: SettingCategory
  settings: AppSetting[]
  values: Record<string, any>
  onChange: (key: string, value: any) => void
  errors: Record<string, string>
  loading?: boolean
}

// Permission checking
export interface SettingsPermissions {
  canRead: (setting: AppSetting) => boolean
  canWrite: (setting: AppSetting) => boolean
  canDelete: (setting: AppSetting) => boolean
  canExport: (category?: SettingCategory) => boolean
  canImport: (category?: SettingCategory) => boolean
  canManageTemplates: () => boolean
}

// Audit and history
export interface SettingsAuditQuery {
  setting_key?: string
  changed_by?: string
  change_type?: 'INSERT' | 'UPDATE' | 'DELETE'
  from_date?: string
  to_date?: string
  limit?: number
  offset?: number
}

export interface SettingsAuditResult {
  history: SettingsHistory[]
  total_count: number
  has_more: boolean
}

// Real-time updates
export interface SettingsSubscriptionOptions {
  category?: SettingCategory
  keys?: string[]
  scope?: SettingScope
  include_metadata?: boolean
}

export type SettingsSubscriptionCallback = (event: SettingsChangeEvent) => void

export interface SettingsSubscription {
  id: string
  callback: SettingsSubscriptionCallback
  options?: SettingsSubscriptionOptions
  unsubscribe: () => void
  isActive: boolean
}

// Error types
export class SettingsValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: any,
    public validation_rule: any
  ) {
    super(message)
    this.name = 'SettingsValidationError'
  }
}

export class SettingsPermissionError extends Error {
  constructor(message: string, public setting_key: string, public required_permission: string) {
    super(message)
    this.name = 'SettingsPermissionError'
  }
}

export class SettingsNotFoundError extends Error {
  constructor(message: string, public setting_key: string) {
    super(message)
    this.name = 'SettingsNotFoundError'
  }
}

// Real-time sync types
export type SettingsConflictResolution = 
  | 'server_wins'          // Server value always takes precedence
  | 'client_wins'          // Client value always takes precedence  
  | 'timestamp_based'      // Most recent change wins
  | 'merge_deep'          // Deep merge objects, timestamp for primitives

export type SettingsRealtimeStatus = 
  | 'disconnected'         // Not connected to real-time sync
  | 'connecting'           // Attempting to connect
  | 'connected'            // Successfully connected and syncing
  | 'error'               // Connection error occurred
  | 'reconnecting'        // Attempting to reconnect
  | 'disconnecting'       // Graceful disconnect in progress

export interface SettingsSyncEvent {
  type: 'sync' | 'conflict' | 'error' | 'reconnect' | 'offline_queued'
  key: string
  value?: any
  category: SettingCategory
  client_id: string
  timestamp: number
  metadata?: Record<string, any>
}

export interface SettingsBroadcastMessage {
  type: 'setting_change' | 'bulk_update' | 'sync_request' | 'heartbeat'
  client_id: string
  session_id: string
  timestamp: number
  data: {
    key?: string
    value?: any
    keys?: string[]
    values?: Record<string, any>
    metadata?: Record<string, any>
  }
}

export interface SettingsConflictInfo {
  key: string
  local_value: any
  remote_value: any
  local_timestamp: number
  remote_timestamp: number
  resolution_strategy: SettingsConflictResolution
  resolved_value: any
  resolution_source: 'local' | 'remote' | 'merged'
}

export interface SettingsOfflineQueueInfo {
  total_queued: number
  oldest_timestamp: number
  newest_timestamp: number
  operations: {
    set: number
    delete: number
    reset: number
  }
}

export interface SettingsNetworkInfo {
  is_online: boolean
  connection_quality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown'
  last_sync_timestamp?: number
  sync_lag_ms?: number
  failed_syncs_count: number
}

// Legacy types for backward compatibility
export type VehicleRates = BusinessSettings['vehicle_rates']
export type ThemeSettings = Partial<UIThemeSettings>

// Extended for specific component usage
export interface VehicleRatesSetting {
  'Trailer': number
  '6 Wheeler': number
  '4 Wheeler': number
  '2 Wheeler': number
}

// Additional bulk operation result
export interface BulkUpdateResult {
  key: string
  success: boolean
  error?: string | null
}