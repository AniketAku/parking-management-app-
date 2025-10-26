-- =============================================================================
-- MIGRATION 007: ADD REVENUE COLUMNS TO SHIFT_SESSIONS
-- Must be run BEFORE migration 008
-- =============================================================================

-- Add all missing columns to shift_sessions if they don't exist
DO $$
BEGIN
  -- Add opening_cash column (if not exists)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shift_sessions' AND column_name = 'opening_cash'
  ) THEN
    ALTER TABLE shift_sessions ADD COLUMN opening_cash NUMERIC(10,2) DEFAULT 0;
    RAISE NOTICE 'Added opening_cash column';
  END IF;

  -- Add total_revenue column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shift_sessions' AND column_name = 'total_revenue'
  ) THEN
    ALTER TABLE shift_sessions ADD COLUMN total_revenue NUMERIC(10,2) DEFAULT 0;
    RAISE NOTICE 'Added total_revenue column';
  END IF;

  -- Add cash_collected column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shift_sessions' AND column_name = 'cash_collected'
  ) THEN
    ALTER TABLE shift_sessions ADD COLUMN cash_collected NUMERIC(10,2) DEFAULT 0;
    RAISE NOTICE 'Added cash_collected column';
  END IF;

  -- Add digital_collected column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shift_sessions' AND column_name = 'digital_collected'
  ) THEN
    ALTER TABLE shift_sessions ADD COLUMN digital_collected NUMERIC(10,2) DEFAULT 0;
    RAISE NOTICE 'Added digital_collected column';
  END IF;

  -- Add vehicles_entered column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shift_sessions' AND column_name = 'vehicles_entered'
  ) THEN
    ALTER TABLE shift_sessions ADD COLUMN vehicles_entered INTEGER DEFAULT 0;
    RAISE NOTICE 'Added vehicles_entered column';
  END IF;

  -- Add vehicles_exited column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shift_sessions' AND column_name = 'vehicles_exited'
  ) THEN
    ALTER TABLE shift_sessions ADD COLUMN vehicles_exited INTEGER DEFAULT 0;
    RAISE NOTICE 'Added vehicles_exited column';
  END IF;

  -- Add currently_parked column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shift_sessions' AND column_name = 'currently_parked'
  ) THEN
    ALTER TABLE shift_sessions ADD COLUMN currently_parked INTEGER DEFAULT 0;
    RAISE NOTICE 'Added currently_parked column';
  END IF;
END $$;

-- Verify columns were added
SELECT 'Migration 007 completed - Revenue columns added to shift_sessions' as status;
