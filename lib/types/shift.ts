// =============================================================================
// SHIFT MANAGEMENT TYPES & INTERFACES
// Event-Driven Flexible Architecture Types
// =============================================================================

export type ShiftStatus = 'active' | 'completed' | 'emergency_ended';
export type ChangeType = 'normal' | 'emergency' | 'extended' | 'overlap';

// Core shift session interface
export interface ShiftSession {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_phone?: string;
  shift_start_time: string;
  shift_end_time?: string;
  status: ShiftStatus;
  opening_cash_amount: number;
  closing_cash_amount?: number;
  cash_discrepancy?: number;
  shift_notes?: string;
  shift_duration_minutes?: number;
  created_at: string;
  updated_at: string;
}

// Shift change audit interface
export interface ShiftChange {
  id: string;
  previous_shift_session_id?: string;
  new_shift_session_id?: string;
  change_timestamp: string;
  handover_notes?: string;
  cash_transferred?: number;
  pending_issues?: string;
  outgoing_employee_id?: string;
  outgoing_employee_name?: string;
  incoming_employee_id?: string;
  incoming_employee_name?: string;
  change_type: ChangeType;
  supervisor_approved: boolean;
  supervisor_id?: string;
  supervisor_name?: string;
  change_duration_seconds?: number;
  created_at: string;
}

// Shift statistics view
export interface ShiftStatistics {
  shift_id: string;
  employee_name: string;
  shift_start_time: string;
  shift_end_time?: string;
  status: ShiftStatus;
  opening_cash_amount: number;
  closing_cash_amount?: number;
  cash_discrepancy?: number;
  shift_duration_minutes?: number;
  total_parking_entries: number;
  total_parking_revenue: number;
  average_parking_fee: number;
}

// API Request/Response Types
export interface StartShiftRequest {
  employee_id: string;
  employee_name: string;
  employee_phone?: string;
  opening_cash_amount: number;
  shift_notes?: string;
}

export interface EndShiftRequest {
  closing_cash_amount: number;
  shift_notes?: string;
}

export interface HandoverRequest {
  closing_cash_amount: number;
  handover_notes: string;
  pending_issues?: string;
  incoming_employee_id: string;
  incoming_employee_name: string;
  incoming_employee_phone?: string;
  change_type?: ChangeType;
  supervisor_id?: string;
}

export interface EmergencyEndRequest {
  reason: string;
  supervisor_id: string;
  closing_cash_amount?: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface ShiftReport {
  shift_id: string;
  employee_name: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  opening_cash: number;
  closing_cash: number;
  cash_difference: number;
  total_parking_entries: number;
  total_revenue: number;
  average_transaction: number;
  parking_breakdown: {
    vehicle_type: string;
    count: number;
    revenue: number;
  }[];
  status: ShiftStatus;
  notes?: string;
}

export interface HandoverResult {
  previous_shift: ShiftSession;
  new_shift: ShiftSession;
  shift_report: ShiftReport;
  handover_timestamp: string;
  change_id: string;
}

export interface DashboardData {
  active_shift: ShiftSession | null;
  shift_statistics: ShiftStatistics | null;
  recent_parking_entries: number;
  current_cash_position: number;
  hourly_revenue: number;
  daily_summary: {
    total_shifts: number;
    total_revenue: number;
    total_entries: number;
    average_shift_duration: number;
  };
  real_time_stats: {
    entries_last_hour: number;
    revenue_last_hour: number;
    active_parking_spots: number;
  };
}

// Real-time event types
export interface ShiftRealtimeEvent {
  type: 'shift-started' | 'shift-ended' | 'shift-handover' | 'emergency-end' | 'parking-update';
  timestamp: string;
  data: {
    shift_id: string;
    employee_name: string;
    [key: string]: any;
  };
}

export interface RealtimeSubscription {
  channel: string;
  event: string;
  callback: (payload: any) => void;
}

// Validation schemas
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Export and reporting types
export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  date_range?: {
    start: string;
    end: string;
  };
  include_parking_details?: boolean;
  include_cash_reconciliation?: boolean;
}

export interface ReportFilter {
  employee_id?: string;
  date_range?: {
    start: string;
    end: string;
  };
  status?: ShiftStatus;
  min_duration?: number;
  max_duration?: number;
  has_discrepancy?: boolean;
}

// Database function return types
export interface SystemValidation {
  tables_created: boolean;
  functions_created: boolean;
  triggers_created: boolean;
  overall_status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  timestamp: string;
}

export interface TestResult {
  test_name: string;
  result: 'PASS' | 'FAIL';
  details: string;
}