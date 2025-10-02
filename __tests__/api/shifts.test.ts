// =============================================================================
// SHIFT MANAGEMENT API TESTS
// Event-Driven Shift Management - Comprehensive Test Suite
// =============================================================================

import { createMocks } from 'node-mocks-http';
import startShiftHandler from '../../pages/api/shifts/start';
import endShiftHandler from '../../pages/api/shifts/end/[id]';
import activeShiftHandler from '../../pages/api/shifts/active';
import handoverHandler from '../../pages/api/shifts/handover';
import emergencyEndHandler from '../../pages/api/shifts/emergency/[id]';
import dashboardHandler from '../../pages/api/shifts/dashboard';

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  typedSupabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          range: jest.fn(),
        })),
        gte: jest.fn(() => ({
          lte: jest.fn(),
        })),
        neq: jest.fn(),
        order: jest.fn(() => ({
          range: jest.fn(),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(),
      })),
    })),
    rpc: jest.fn(),
  },
  ShiftRealtimeManager: {
    getInstance: jest.fn(() => ({
      broadcastShiftEvent: jest.fn(),
    })),
  },
}));

describe('/api/shifts/start', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start a new shift successfully', async () => {
    const { typedSupabaseAdmin } = require('../../lib/supabase');

    // Mock no existing active shift
    typedSupabaseAdmin.from().select().eq().single.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116' }, // No rows returned
    });

    // Mock successful shift creation
    typedSupabaseAdmin.rpc.mockResolvedValueOnce({
      data: 'new-shift-id',
      error: null,
    });

    // Mock fetch new shift data
    typedSupabaseAdmin.from().select().eq().single.mockResolvedValueOnce({
      data: {
        id: 'new-shift-id',
        employee_id: 'emp-123',
        employee_name: 'John Doe',
        employee_phone: '+1234567890',
        shift_start_time: '2024-01-01T10:00:00Z',
        status: 'active',
        opening_cash_amount: 100.00,
      },
      error: null,
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        employee_id: 'emp-123',
        employee_name: 'John Doe',
        employee_phone: '+1234567890',
        opening_cash_amount: 100.00,
        shift_notes: 'Starting morning shift',
      },
    });

    await startShiftHandler(req, res);

    expect(res._getStatusCode()).toBe(201);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('new-shift-id');
    expect(data.data.employee_name).toBe('John Doe');
  });

  it('should reject if active shift already exists', async () => {
    const { typedSupabaseAdmin } = require('../../lib/supabase');

    // Mock existing active shift
    typedSupabaseAdmin.from().select().eq().single.mockResolvedValueOnce({
      data: {
        id: 'existing-shift-id',
        employee_name: 'Jane Smith',
        status: 'active',
      },
      error: null,
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        employee_id: 'emp-123',
        employee_name: 'John Doe',
        opening_cash_amount: 100.00,
      },
    });

    await startShiftHandler(req, res);

    expect(res._getStatusCode()).toBe(409);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toContain('Active shift already exists');
  });

  it('should validate required fields', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        employee_id: '',
        employee_name: '',
        opening_cash_amount: -10,
      },
    });

    await startShiftHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toContain('Validation failed');
  });

  it('should reject non-POST methods', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await startShiftHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toBe('Method not allowed');
  });
});

describe('/api/shifts/end/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should end an active shift successfully', async () => {
    const { typedSupabaseAdmin } = require('../../lib/supabase');

    // Mock existing active shift
    typedSupabaseAdmin.from().select().eq().single.mockResolvedValueOnce({
      data: {
        id: 'shift-123',
        employee_name: 'John Doe',
        status: 'active',
        opening_cash_amount: 100.00,
      },
      error: null,
    });

    // Mock successful shift end
    typedSupabaseAdmin.rpc.mockResolvedValueOnce({
      data: {
        shift_id: 'shift-123',
        employee_name: 'John Doe',
        closing_cash: 150.00,
        cash_difference: 50.00,
      },
      error: null,
    });

    // Mock fetch completed shift
    typedSupabaseAdmin.from().select().eq().single.mockResolvedValueOnce({
      data: {
        id: 'shift-123',
        employee_name: 'John Doe',
        status: 'completed',
        closing_cash_amount: 150.00,
      },
      error: null,
    });

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'shift-123' },
      body: {
        closing_cash_amount: 150.00,
        shift_notes: 'Shift completed successfully',
      },
    });

    await endShiftHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.shift_id).toBe('shift-123');
  });

  it('should reject if shift not found', async () => {
    const { typedSupabaseAdmin } = require('../../lib/supabase');

    typedSupabaseAdmin.from().select().eq().single.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116' },
    });

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'nonexistent-shift' },
      body: {
        closing_cash_amount: 150.00,
      },
    });

    await endShiftHandler(req, res);

    expect(res._getStatusCode()).toBe(404);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toContain('Active shift not found');
  });
});

describe('/api/shifts/active', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return active shift data', async () => {
    const { typedSupabaseAdmin } = require('../../lib/supabase');

    // Mock active shift
    typedSupabaseAdmin.rpc.mockResolvedValueOnce({
      data: {
        id: 'active-shift-123',
        employee_name: 'John Doe',
        status: 'active',
        opening_cash_amount: 100.00,
      },
      error: null,
    });

    // Mock shift statistics
    typedSupabaseAdmin.from().select().eq().single.mockResolvedValueOnce({
      data: {
        shift_id: 'active-shift-123',
        total_parking_entries: 10,
        total_parking_revenue: 500.00,
      },
      error: null,
    });

    // Mock parking data
    typedSupabaseAdmin.from().select().eq.mockResolvedValueOnce({
      data: [
        { id: '1', parking_fee: 50.00, status: 'parked', created_at: '2024-01-01T10:00:00Z' },
        { id: '2', parking_fee: 30.00, status: 'exited', created_at: '2024-01-01T11:00:00Z' },
      ],
      error: null,
    });

    const { req, res } = createMocks({
      method: 'GET',
    });

    await activeShiftHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.active_shift).toBeTruthy();
    expect(data.data.active_shift.id).toBe('active-shift-123');
  });

  it('should return null when no active shift', async () => {
    const { typedSupabaseAdmin } = require('../../lib/supabase');

    typedSupabaseAdmin.rpc.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const { req, res } = createMocks({
      method: 'GET',
    });

    await activeShiftHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.active_shift).toBeNull();
    expect(data.message).toContain('No active shift found');
  });
});

describe('/api/shifts/handover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should perform handover successfully', async () => {
    const { typedSupabaseAdmin } = require('../../lib/supabase');

    // Mock get current active shift
    typedSupabaseAdmin.rpc.mockResolvedValueOnce({
      data: {
        id: 'current-shift-123',
        employee_id: 'emp-1',
        employee_name: 'John Doe',
        status: 'active',
      },
      error: null,
    });

    // Mock end shift
    typedSupabaseAdmin.rpc.mockResolvedValueOnce({
      data: { shift_id: 'current-shift-123' },
      error: null,
    });

    // Mock start new shift
    typedSupabaseAdmin.rpc.mockResolvedValueOnce({
      data: 'new-shift-456',
      error: null,
    });

    // Mock fetch shift data
    typedSupabaseAdmin.from().select().eq().single
      .mockResolvedValueOnce({
        data: { id: 'current-shift-123', status: 'completed' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: 'new-shift-456', status: 'active' },
        error: null,
      });

    // Mock insert shift change
    typedSupabaseAdmin.from().insert.mockResolvedValueOnce({
      error: null,
    });

    // Mock update parking entries
    typedSupabaseAdmin.from().update().eq().eq.mockResolvedValueOnce({
      error: null,
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        closing_cash_amount: 150.00,
        handover_notes: 'Handover to night shift',
        incoming_employee_id: 'emp-2',
        incoming_employee_name: 'Jane Smith',
        change_type: 'normal',
      },
    });

    await handoverHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.message).toContain('Shift handover completed');
  });

  it('should reject handover to same employee', async () => {
    const { typedSupabaseAdmin } = require('../../lib/supabase');

    typedSupabaseAdmin.rpc.mockResolvedValueOnce({
      data: {
        id: 'current-shift-123',
        employee_id: 'emp-1',
        employee_name: 'John Doe',
        status: 'active',
      },
      error: null,
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        closing_cash_amount: 150.00,
        handover_notes: 'Handover notes',
        incoming_employee_id: 'emp-1', // Same as current employee
        incoming_employee_name: 'John Doe',
      },
    });

    await handoverHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toContain('cannot be the same');
  });
});

describe('/api/shifts/emergency/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should perform emergency end with supervisor authorization', async () => {
    const { typedSupabaseAdmin } = require('../../lib/supabase');

    // Mock existing active shift
    typedSupabaseAdmin.from().select().eq().single
      .mockResolvedValueOnce({
        data: {
          id: 'shift-123',
          employee_id: 'emp-1',
          employee_name: 'John Doe',
          status: 'active',
          opening_cash_amount: 100.00,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: 'supervisor-123',
          email: 'supervisor@example.com',
          raw_user_meta_data: { role: 'supervisor' },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: 'shift-123',
          status: 'emergency_ended',
          closing_cash_amount: 100.00,
        },
        error: null,
      });

    // Mock emergency end operations
    typedSupabaseAdmin.from().update().eq.mockResolvedValueOnce({ error: null });
    typedSupabaseAdmin.rpc.mockResolvedValueOnce({ data: {}, error: null });
    typedSupabaseAdmin.from().insert.mockResolvedValueOnce({ error: null });

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'shift-123' },
      body: {
        reason: 'System emergency',
        supervisor_id: 'supervisor-123',
        closing_cash_amount: 100.00,
      },
    });

    await emergencyEndHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.message).toContain('Emergency shift termination completed');
  });

  it('should reject without supervisor authorization', async () => {
    const { typedSupabaseAdmin } = require('../../lib/supabase');

    // Mock existing active shift
    typedSupabaseAdmin.from().select().eq().single
      .mockResolvedValueOnce({
        data: {
          id: 'shift-123',
          status: 'active',
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'shift-123' },
      body: {
        reason: 'System emergency',
        supervisor_id: 'invalid-supervisor',
      },
    });

    await emergencyEndHandler(req, res);

    expect(res._getStatusCode()).toBe(401);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid supervisor authorization');
  });
});

describe('/api/shifts/dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return comprehensive dashboard data', async () => {
    const { typedSupabaseAdmin } = require('../../lib/supabase');

    // Mock active shift
    typedSupabaseAdmin.rpc.mockResolvedValueOnce({
      data: {
        id: 'active-shift-123',
        employee_name: 'John Doe',
        status: 'active',
        opening_cash_amount: 100.00,
      },
      error: null,
    });

    // Mock statistics and parking data
    typedSupabaseAdmin.from().select().eq().single.mockResolvedValueOnce({
      data: { total_parking_entries: 15, total_parking_revenue: 750.00 },
      error: null,
    });

    typedSupabaseAdmin.from().select().eq.mockResolvedValueOnce({
      data: [
        { parking_fee: 50.00, status: 'parked', created_at: '2024-01-01T10:00:00Z' },
        { parking_fee: 30.00, status: 'exited', created_at: '2024-01-01T11:00:00Z' },
      ],
      error: null,
    });

    // Mock daily summary queries
    typedSupabaseAdmin.from().select()
      .gte().lt.mockResolvedValueOnce({
        data: [{ id: '1', shift_duration_minutes: 480 }],
        error: null,
      })
      .gte().lt.mockResolvedValueOnce({
        data: [{ parking_fee: 50.00 }, { parking_fee: 30.00 }],
        error: null,
      });

    const { req, res } = createMocks({
      method: 'GET',
    });

    await dashboardHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.active_shift).toBeTruthy();
    expect(data.data.daily_summary).toBeTruthy();
    expect(data.data.real_time_stats).toBeTruthy();
  });
});

// Integration test helpers
export const testHelpers = {
  createTestShift: (overrides = {}) => ({
    employee_id: 'test-emp-123',
    employee_name: 'Test Employee',
    employee_phone: '+1234567890',
    opening_cash_amount: 100.00,
    shift_notes: 'Test shift',
    ...overrides,
  }),

  createTestHandover: (overrides = {}) => ({
    closing_cash_amount: 150.00,
    handover_notes: 'Test handover',
    incoming_employee_id: 'test-emp-456',
    incoming_employee_name: 'Incoming Employee',
    change_type: 'normal' as const,
    ...overrides,
  }),

  createTestEmergencyEnd: (overrides = {}) => ({
    reason: 'Test emergency',
    supervisor_id: 'test-supervisor-123',
    closing_cash_amount: 100.00,
    ...overrides,
  }),

  mockSupabaseSuccess: (mockData: any) => {
    const { typedSupabaseAdmin } = require('../../lib/supabase');
    typedSupabaseAdmin.rpc.mockResolvedValueOnce({
      data: mockData,
      error: null,
    });
    return typedSupabaseAdmin;
  },

  mockSupabaseError: (errorMessage: string) => {
    const { typedSupabaseAdmin } = require('../../lib/supabase');
    typedSupabaseAdmin.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error(errorMessage),
    });
    return typedSupabaseAdmin;
  },
};