// =============================================================================
// JEST SETUP
// Event-Driven Shift Management - Test Setup and Global Mocks
// =============================================================================

import '@testing-library/jest-dom';

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

// Mock fetch globally
global.fetch = jest.fn();

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock timers for realtime testing
jest.useFakeTimers();

// Setup for each test
beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Cleanup after each test
afterEach(() => {
  jest.restoreAllMocks();
});

// Global test utilities
global.testUtils = {
  // Helper to create mock API responses
  createMockResponse: (data, success = true, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({
      success,
      data,
      timestamp: new Date().toISOString(),
      ...(success ? {} : { error: 'Test error' }),
    }),
  }),

  // Helper to create mock shift data
  createMockShift: (overrides = {}) => ({
    id: 'test-shift-123',
    employee_id: 'test-emp-123',
    employee_name: 'Test Employee',
    employee_phone: '+1234567890',
    shift_start_time: '2024-01-01T10:00:00Z',
    shift_end_time: null,
    status: 'active',
    opening_cash_amount: 100.00,
    closing_cash_amount: null,
    cash_discrepancy: null,
    shift_notes: 'Test shift',
    shift_duration_minutes: null,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
    ...overrides,
  }),

  // Helper to create mock parking entry
  createMockParkingEntry: (overrides = {}) => ({
    id: 'test-entry-123',
    vehicle_number: 'ABC123',
    vehicle_type: 'Car',
    entry_time: '2024-01-01T11:00:00Z',
    exit_time: null,
    status: 'parked',
    parking_fee: 50.00,
    shift_session_id: 'test-shift-123',
    created_at: '2024-01-01T11:00:00Z',
    updated_at: '2024-01-01T11:00:00Z',
    ...overrides,
  }),

  // Helper to create mock dashboard data
  createMockDashboardData: (overrides = {}) => ({
    active_shift: global.testUtils.createMockShift(),
    shift_statistics: {
      shift_id: 'test-shift-123',
      employee_name: 'Test Employee',
      shift_start_time: '2024-01-01T10:00:00Z',
      shift_end_time: null,
      status: 'active',
      opening_cash_amount: 100.00,
      closing_cash_amount: null,
      cash_discrepancy: null,
      shift_duration_minutes: null,
      total_parking_entries: 5,
      total_parking_revenue: 250.00,
      average_parking_fee: 50.00,
    },
    recent_parking_entries: 5,
    current_cash_position: 350.00,
    hourly_revenue: 100.00,
    daily_summary: {
      total_shifts: 2,
      total_revenue: 500.00,
      total_entries: 10,
      average_shift_duration: 480,
    },
    real_time_stats: {
      entries_last_hour: 3,
      revenue_last_hour: 150.00,
      active_parking_spots: 8,
    },
    ...overrides,
  }),

  // Helper to wait for async operations
  waitForAsync: () => new Promise(resolve => setTimeout(resolve, 0)),

  // Helper to advance timers
  advanceTimers: (ms) => {
    jest.advanceTimersByTime(ms);
    return global.testUtils.waitForAsync();
  },
};