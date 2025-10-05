-- =============================================================================
-- SHIFT MANAGEMENT SYSTEM - DATABASE SCHEMA MIGRATION (FIXED)
-- Event-Driven Flexible Architecture Implementation
-- =============================================================================
-- This version uses DROP IF EXISTS to handle partial deployments

-- Drop existing objects if they exist (idempotent migration)
DROP VIEW IF EXISTS shift_statistics CASCADE;
DROP TABLE IF EXISTS shift_changes CASCADE;
DROP TABLE IF EXISTS shift_sessions CASCADE;
DROP TYPE IF EXISTS change_type_enum CASCADE;
DROP TYPE IF EXISTS shift_status_enum CASCADE;

-- Create custom types for shift management
CREATE TYPE shift_status_enum AS ENUM ('active', 'completed', 'emergency_ended');
CREATE TYPE change_type_enum AS ENUM ('normal', 'emergency', 'extended', 'overlap');

-- =============================================================================
-- CORE SHIFT TRACKING TABLE
-- =============================================================================
-- Tracks individual shift instances with flexible timing
CREATE TABLE shift_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  employee_name VARCHAR(255) NOT NULL,
  employee_phone VARCHAR(20),
  shift_start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shift_end_time TIMESTAMPTZ NULL,
  status shift_status_enum DEFAULT 'active',
  opening_cash_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  closing_cash_amount DECIMAL(10,2) NULL,
  cash_discrepancy DECIMAL(10,2) GENERATED ALWAYS AS (
    CASE
      WHEN closing_cash_amount IS NOT NULL
      THEN closing_cash_amount - opening_cash_amount
      ELSE NULL
    END
  ) STORED,
  shift_notes TEXT,
  shift_duration_minutes INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN shift_end_time IS NOT NULL
      THEN EXTRACT(EPOCH FROM (shift_end_time - shift_start_time))::INTEGER / 60
      ELSE NULL
    END
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_cash_amounts CHECK (opening_cash_amount >= 0),
  CONSTRAINT valid_closing_cash CHECK (closing_cash_amount IS NULL OR closing_cash_amount >= 0),
  CONSTRAINT valid_shift_timing CHECK (shift_end_time IS NULL OR shift_end_time > shift_start_time),
  CONSTRAINT active_shift_has_no_end_time CHECK (
    (status = 'active' AND shift_end_time IS NULL AND closing_cash_amount IS NULL) OR
    (status != 'active' AND shift_end_time IS NOT NULL)
  )
);

-- =============================================================================
-- SHIFT CHANGES AUDIT TABLE
-- =============================================================================
-- Complete audit trail for all shift change events
CREATE TABLE shift_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  previous_shift_session_id UUID REFERENCES shift_sessions(id),
  new_shift_session_id UUID REFERENCES shift_sessions(id),
  change_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  handover_notes TEXT,
  cash_transferred DECIMAL(10,2),
  pending_issues TEXT,
  outgoing_employee_id UUID,
  outgoing_employee_name VARCHAR(255),
  incoming_employee_id UUID,
  incoming_employee_name VARCHAR(255),
  change_type change_type_enum DEFAULT 'normal',
  supervisor_approved BOOLEAN DEFAULT FALSE,
  supervisor_id UUID,
  supervisor_name VARCHAR(255),
  change_duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_change_timing CHECK (change_timestamp <= NOW()),
  CONSTRAINT valid_employees CHECK (
    (outgoing_employee_id IS NULL) = (incoming_employee_id IS NULL) OR
    (outgoing_employee_id != incoming_employee_id)
  ),
  CONSTRAINT emergency_requires_supervisor CHECK (
    change_type != 'emergency' OR
    (supervisor_approved = TRUE AND supervisor_id IS NOT NULL)
  )
);

-- =============================================================================
-- SHIFT STATISTICS VIEW
-- =============================================================================
-- Real-time shift performance metrics
CREATE VIEW shift_statistics AS
WITH shift_metrics AS (
  SELECT
    ss.id,
    ss.employee_name,
    ss.shift_start_time,
    ss.shift_end_time,
    ss.status,
    ss.opening_cash_amount,
    ss.closing_cash_amount,
    ss.cash_discrepancy,
    ss.shift_duration_minutes,

    -- Vehicle statistics (will be populated when parking integration is added)
    0 as vehicles_entered,
    0 as vehicles_exited,
    0 as vehicles_currently_parked,
    0.00 as revenue_collected,
    0.00 as outstanding_payments,

    -- Performance metrics
    CASE
      WHEN ss.shift_duration_minutes > 0
      THEN 0 / (ss.shift_duration_minutes / 60.0)
      ELSE 0
    END as vehicles_per_hour,

    CASE
      WHEN ss.shift_end_time IS NOT NULL
      THEN EXTRACT(EPOCH FROM (ss.shift_end_time - ss.shift_start_time))::INTEGER
      ELSE EXTRACT(EPOCH FROM (NOW() - ss.shift_start_time))::INTEGER
    END as current_duration_seconds

  FROM shift_sessions ss
)
SELECT * FROM shift_metrics;

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================
-- Core indexes for shift management queries
CREATE INDEX idx_shift_sessions_employee ON shift_sessions(employee_id);
CREATE INDEX idx_shift_sessions_status ON shift_sessions(status);
CREATE INDEX idx_shift_sessions_time ON shift_sessions(shift_start_time);
CREATE INDEX idx_shift_sessions_active ON shift_sessions(status) WHERE status = 'active';
CREATE INDEX idx_shift_changes_timestamp ON shift_changes(change_timestamp);
CREATE INDEX idx_shift_changes_employees ON shift_changes(outgoing_employee_id, incoming_employee_id);
CREATE INDEX idx_shift_changes_sessions ON shift_changes(previous_shift_session_id, new_shift_session_id);

-- =============================================================================
-- BUSINESS LOGIC CONSTRAINTS
-- =============================================================================
-- Ensure only one active shift exists at any time
CREATE UNIQUE INDEX idx_single_active_shift ON shift_sessions(status) WHERE status = 'active';

-- Comments for documentation
COMMENT ON TABLE shift_sessions IS 'Core table tracking individual shift instances with flexible timing determined by user actions';
COMMENT ON TABLE shift_changes IS 'Complete audit trail of all shift change events including handover details';
COMMENT ON VIEW shift_statistics IS 'Real-time view providing comprehensive shift performance metrics';
COMMENT ON INDEX idx_single_active_shift IS 'Ensures business rule: only one active shift allowed at any time';
