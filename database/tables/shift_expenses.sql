-- =============================================================================
-- SHIFT EXPENSES TABLE
-- Track expenses incurred during shift operations
-- =============================================================================

-- Drop existing table if exists
DROP TABLE IF EXISTS shift_expenses CASCADE;

-- Create shift_expenses table
CREATE TABLE shift_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_session_id UUID NOT NULL REFERENCES shift_sessions(id) ON DELETE CASCADE,
  expense_category VARCHAR(50) NOT NULL CHECK (expense_category IN ('Maintenance', 'Supplies', 'Staff', 'Utilities', 'Other')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_shift_expenses_shift_id ON shift_expenses(shift_session_id);
CREATE INDEX idx_shift_expenses_created_at ON shift_expenses(created_at);
CREATE INDEX idx_shift_expenses_category ON shift_expenses(expense_category);

-- Enable Row Level Security
ALTER TABLE shift_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view all shift expenses (read-only for reporting)
CREATE POLICY "Users can view shift expenses"
  ON shift_expenses FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS Policy: Users can add expenses to their active shifts
CREATE POLICY "Users can add expenses to their shifts"
  ON shift_expenses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shift_sessions
      WHERE id = shift_session_id
      AND employee_id = auth.uid()
      AND status = 'active'
    )
  );

-- RLS Policy: Users can delete their own shift expenses
CREATE POLICY "Users can delete their shift expenses"
  ON shift_expenses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM shift_sessions
      WHERE id = shift_session_id
      AND employee_id = auth.uid()
    )
  );

-- RLS Policy: Users can update their own shift expenses
CREATE POLICY "Users can update their shift expenses"
  ON shift_expenses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM shift_sessions
      WHERE id = shift_session_id
      AND employee_id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_shift_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_shift_expenses_updated_at
  BEFORE UPDATE ON shift_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_shift_expenses_updated_at();

-- Function to get total expenses for a shift
CREATE OR REPLACE FUNCTION get_shift_total_expenses(p_shift_session_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_total_expenses DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_expenses
  FROM shift_expenses
  WHERE shift_session_id = p_shift_session_id;

  RETURN v_total_expenses;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate current cash for a shift
CREATE OR REPLACE FUNCTION get_shift_current_cash(p_shift_session_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_opening_cash DECIMAL(10,2);
  v_total_revenue DECIMAL(10,2);
  v_total_expenses DECIMAL(10,2);
  v_current_cash DECIMAL(10,2);
BEGIN
  -- Get opening cash
  SELECT COALESCE(opening_cash_amount, 0)
  INTO v_opening_cash
  FROM shift_sessions
  WHERE id = p_shift_session_id;

  -- Get total revenue from parking entries
  SELECT COALESCE(SUM(COALESCE(parking_fee, actual_fee, calculated_fee, 0)), 0)
  INTO v_total_revenue
  FROM parking_entries
  WHERE shift_session_id = p_shift_session_id
    AND status = 'Exited';

  -- Get total expenses
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_expenses
  FROM shift_expenses
  WHERE shift_session_id = p_shift_session_id;

  -- Calculate current cash
  v_current_cash := v_opening_cash + v_total_revenue - v_total_expenses;

  RETURN v_current_cash;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE shift_expenses IS 'Tracks expenses incurred during shift operations';
COMMENT ON COLUMN shift_expenses.shift_session_id IS 'Foreign key to shift_sessions table';
COMMENT ON COLUMN shift_expenses.expense_category IS 'Category of expense: Maintenance, Supplies, Staff, Utilities, Other';
COMMENT ON COLUMN shift_expenses.amount IS 'Expense amount (must be positive)';
COMMENT ON COLUMN shift_expenses.description IS 'Optional description of the expense';
COMMENT ON COLUMN shift_expenses.created_by IS 'User who created the expense record';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON shift_expenses TO authenticated;
GRANT EXECUTE ON FUNCTION get_shift_total_expenses TO authenticated;
GRANT EXECUTE ON FUNCTION get_shift_current_cash TO authenticated;
