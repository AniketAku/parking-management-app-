-- =============================================================================
-- MIGRATION 007: FIX SHIFT MANAGEMENT SCHEMA MISMATCHES
-- Fixes critical schema issues causing revenue = 0 and broken functionality
-- =============================================================================

-- Step 1: Add missing columns to shift_sessions table
ALTER TABLE shift_sessions
  ADD COLUMN IF NOT EXISTS employee_name TEXT,
  ADD COLUMN IF NOT EXISTS employee_id UUID,
  ADD COLUMN IF NOT EXISTS shift_start_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shift_end_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_revenue NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vehicles_entered INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vehicles_exited INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currently_parked INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS digital_collected NUMERIC(10,2) DEFAULT 0;

-- Step 2: Migrate data from old columns to new columns
UPDATE shift_sessions SET
  employee_name = operator_name,
  employee_id = user_id,
  shift_start_time = COALESCE(start_time, started_at),
  shift_end_time = COALESCE(end_time, ended_at),
  total_revenue = COALESCE(cash_collected, 0)
WHERE employee_name IS NULL;

-- Step 3: Create shift_statistics view for backward compatibility
CREATE OR REPLACE VIEW shift_statistics AS
SELECT
  ss.id as shift_id,
  ss.employee_id,
  ss.employee_name,
  ss.shift_start_time,
  ss.shift_end_time,
  ss.status,
  ss.total_revenue,
  ss.cash_collected,
  ss.digital_collected,
  ss.vehicles_entered,
  ss.vehicles_exited,
  ss.currently_parked,
  ss.opening_cash,
  ss.created_at,
  ss.updated_at,
  -- Calculate real-time metrics from parking_entries
  COALESCE(pe_stats.actual_revenue, 0) as calculated_revenue,
  COALESCE(pe_stats.actual_vehicles_entered, 0) as actual_vehicles_entered,
  COALESCE(pe_stats.actual_vehicles_exited, 0) as actual_vehicles_exited,
  COALESCE(pe_stats.actual_currently_parked, 0) as actual_currently_parked
FROM shift_sessions ss
LEFT JOIN (
  SELECT
    shift_session_id,
    COUNT(*) as actual_vehicles_entered,
    COUNT(*) FILTER (WHERE exit_time IS NOT NULL) as actual_vehicles_exited,
    COUNT(*) FILTER (WHERE exit_time IS NULL) as actual_currently_parked,
    COALESCE(SUM(COALESCE(actual_fee, calculated_fee, parking_fee))
      FILTER (WHERE status = 'Exited' OR exit_time IS NOT NULL), 0) as actual_revenue
  FROM parking_entries
  GROUP BY shift_session_id
) pe_stats ON ss.id = pe_stats.shift_session_id;

-- Step 4: Create function to sync shift statistics from parking_entries
CREATE OR REPLACE FUNCTION sync_shift_statistics(p_shift_id UUID)
RETURNS JSON AS $$
DECLARE
  v_stats RECORD;
  v_result JSON;
BEGIN
  -- Calculate accurate statistics from parking_entries
  SELECT
    COUNT(*) as vehicles_entered,
    COUNT(*) FILTER (WHERE exit_time IS NOT NULL) as vehicles_exited,
    COUNT(*) FILTER (WHERE exit_time IS NULL) as currently_parked,
    COALESCE(SUM(COALESCE(actual_fee, calculated_fee, parking_fee))
      FILTER (WHERE status = 'Exited' OR exit_time IS NOT NULL), 0) as total_revenue,
    COALESCE(SUM(COALESCE(actual_fee, calculated_fee, parking_fee))
      FILTER (WHERE (status = 'Exited' OR exit_time IS NOT NULL) AND payment_mode = 'cash'), 0) as cash_collected,
    COALESCE(SUM(COALESCE(actual_fee, calculated_fee, parking_fee))
      FILTER (WHERE (status = 'Exited' OR exit_time IS NOT NULL)
        AND payment_mode IN ('card', 'upi', 'digital', 'wallet')), 0) as digital_collected
  INTO v_stats
  FROM parking_entries
  WHERE shift_session_id = p_shift_id;

  -- Update shift_sessions with calculated statistics
  UPDATE shift_sessions
  SET
    vehicles_entered = v_stats.vehicles_entered,
    vehicles_exited = v_stats.vehicles_exited,
    currently_parked = v_stats.currently_parked,
    total_revenue = v_stats.total_revenue,
    cash_collected = v_stats.cash_collected,
    digital_collected = v_stats.digital_collected,
    updated_at = NOW()
  WHERE id = p_shift_id;

  -- Return the updated statistics
  SELECT json_build_object(
    'shift_id', p_shift_id,
    'vehicles_entered', v_stats.vehicles_entered,
    'vehicles_exited', v_stats.vehicles_exited,
    'currently_parked', v_stats.currently_parked,
    'total_revenue', v_stats.total_revenue,
    'cash_collected', v_stats.cash_collected,
    'digital_collected', v_stats.digital_collected,
    'synced_at', NOW()
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error syncing shift statistics for %: %', p_shift_id, SQLERRM;
    RETURN json_build_object(
      'error', true,
      'message', 'Failed to sync statistics',
      'shift_id', p_shift_id,
      'details', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create trigger to auto-sync shift statistics on parking_entries changes
CREATE OR REPLACE FUNCTION auto_sync_shift_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync statistics for the affected shift
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.shift_session_id IS NOT NULL THEN
      PERFORM sync_shift_statistics(NEW.shift_session_id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.shift_session_id IS NOT NULL THEN
      PERFORM sync_shift_statistics(OLD.shift_session_id);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_sync_shift_statistics ON parking_entries;

-- Create trigger
CREATE TRIGGER trigger_auto_sync_shift_statistics
  AFTER INSERT OR UPDATE OR DELETE ON parking_entries
  FOR EACH ROW
  EXECUTE FUNCTION auto_sync_shift_statistics();

-- Step 6: Create shift_report_history table for timestamp tracking
CREATE TABLE IF NOT EXISTS shift_report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_session_id UUID REFERENCES shift_sessions(id) ON DELETE CASCADE,
  generated_by_user_id UUID,
  generated_by_user_email TEXT,
  generated_at TIMESTAMPTZ NOT NULL,
  report_type VARCHAR(50),
  report_format VARCHAR(10),
  report_filters JSONB,
  file_url TEXT,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookup of last report time
CREATE INDEX IF NOT EXISTS idx_shift_report_history_shift_time
  ON shift_report_history(shift_session_id, generated_at DESC);

-- Step 7: Grant necessary permissions
GRANT SELECT ON shift_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION sync_shift_statistics(UUID) TO authenticated;
GRANT ALL ON shift_report_history TO authenticated;

-- Step 8: Sync all existing shift statistics
DO $$
DECLARE
  shift_record RECORD;
BEGIN
  FOR shift_record IN
    SELECT id FROM shift_sessions WHERE status = 'active' OR ended_at > NOW() - INTERVAL '7 days'
  LOOP
    PERFORM sync_shift_statistics(shift_record.id);
  END LOOP;

  RAISE NOTICE 'Synced statistics for all recent shifts';
END;
$$;

-- Add helpful comments
COMMENT ON VIEW shift_statistics IS 'Real-time shift statistics with calculated metrics from parking_entries';
COMMENT ON FUNCTION sync_shift_statistics(UUID) IS 'Synchronizes shift statistics from parking_entries data';
COMMENT ON TABLE shift_report_history IS 'Tracks report generation history with 1-second precision for employee activity logging';
COMMENT ON COLUMN shift_sessions.employee_name IS 'Employee name (migrated from operator_name)';
COMMENT ON COLUMN shift_sessions.employee_id IS 'Employee user ID (migrated from user_id)';
COMMENT ON COLUMN shift_sessions.shift_start_time IS 'Shift start time (migrated from start_time/started_at)';
COMMENT ON COLUMN shift_sessions.shift_end_time IS 'Shift end time (migrated from end_time/ended_at)';
COMMENT ON COLUMN shift_sessions.total_revenue IS 'Total revenue collected during shift (cash + digital)';
COMMENT ON COLUMN shift_sessions.vehicles_entered IS 'Count of vehicles that entered during shift';
COMMENT ON COLUMN shift_sessions.vehicles_exited IS 'Count of vehicles that exited during shift';
COMMENT ON COLUMN shift_sessions.currently_parked IS 'Count of vehicles currently parked from this shift';

-- Migration complete
SELECT 'Migration 007 completed successfully' as status;
