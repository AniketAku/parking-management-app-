-- =============================================================================
-- SHIFT DEPOSITS TABLE
-- Tracks daily deposits made by employees to owner
-- =============================================================================

-- Drop table if exists (for clean reinstall)
DROP TABLE IF EXISTS shift_deposits CASCADE;

-- Create shift_deposits table
CREATE TABLE shift_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_session_id UUID NOT NULL REFERENCES shift_sessions(id) ON DELETE CASCADE,
  deposit_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Deposit amounts
  cash_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (cash_amount >= 0),
  digital_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (digital_amount >= 0),
  total_amount DECIMAL(10,2) GENERATED ALWAYS AS (cash_amount + digital_amount) STORED,

  -- Metadata
  deposited_by UUID REFERENCES users(id),
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_shift_deposits_shift ON shift_deposits(shift_session_id);
CREATE INDEX idx_shift_deposits_date ON shift_deposits(deposit_date);
CREATE INDEX idx_shift_deposits_user ON shift_deposits(deposited_by);

-- Enable Row Level Security
ALTER TABLE shift_deposits ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Policy 1: Admins can view ALL deposits
CREATE POLICY "Admins can view all deposits" ON shift_deposits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policy 2: Operators can view TODAY's deposits only
CREATE POLICY "Operators can view today's deposits" ON shift_deposits
  FOR SELECT
  USING (
    deposit_date = CURRENT_DATE
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'operator'
    )
  );

-- Policy 3: Viewers can view TODAY's deposits only (read-only)
CREATE POLICY "Viewers can view today's deposits" ON shift_deposits
  FOR SELECT
  USING (
    deposit_date = CURRENT_DATE
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'viewer'
    )
  );

-- Policy 4: Operators can CREATE deposits
CREATE POLICY "Operators can create deposits" ON shift_deposits
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'operator'
    )
  );

-- Policy 5: Admins can CREATE deposits
CREATE POLICY "Admins can create deposits" ON shift_deposits
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policy 6: Operators can UPDATE their own deposits from today
CREATE POLICY "Operators can update today's deposits" ON shift_deposits
  FOR UPDATE
  USING (
    deposit_date = CURRENT_DATE
    AND deposited_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'operator'
    )
  );

-- Policy 7: Admins can UPDATE any deposit
CREATE POLICY "Admins can update deposits" ON shift_deposits
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policy 8: Admins can DELETE deposits
CREATE POLICY "Admins can delete deposits" ON shift_deposits
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- =============================================================================
-- TRIGGER: Update updated_at timestamp
-- =============================================================================

CREATE OR REPLACE FUNCTION update_shift_deposits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_shift_deposits_timestamp
  BEFORE UPDATE ON shift_deposits
  FOR EACH ROW
  EXECUTE FUNCTION update_shift_deposits_updated_at();

-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT 'shift_deposits table created successfully with RLS policies' as status;
