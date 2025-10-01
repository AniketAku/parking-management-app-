-- Full parking_entries table deployment
-- Run this in Supabase SQL Editor if table doesn't exist or needs recreation

-- Drop and recreate table (WARNING: This will delete existing data)
-- DROP TABLE IF EXISTS parking_entries CASCADE;

-- Create parking_entries table with all required columns
CREATE TABLE IF NOT EXISTS parking_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_name VARCHAR(100) NOT NULL,
  vehicle_type VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('Trailer', '6 Wheeler', '4 Wheeler', '2 Wheeler')),
  vehicle_number VARCHAR(20) NOT NULL,
  driver_name VARCHAR(100) NOT NULL,
  notes TEXT,
  entry_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exit_time TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'Parked' CHECK (status IN ('Parked', 'Exited')),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'Unpaid' CHECK (payment_status IN ('Paid', 'Unpaid', 'Pending')),
  calculated_fee DECIMAL(10,2),
  actual_fee DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parking_entries_vehicle_number ON parking_entries(vehicle_number);
CREATE INDEX IF NOT EXISTS idx_parking_entries_status ON parking_entries(status);
CREATE INDEX IF NOT EXISTS idx_parking_entries_entry_time ON parking_entries(entry_time);
CREATE INDEX IF NOT EXISTS idx_parking_entries_payment_status ON parking_entries(payment_status);

-- Enable Row Level Security
ALTER TABLE parking_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policy for parking_entries table
CREATE POLICY IF NOT EXISTS "Authenticated users can view parking entries" ON parking_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_approved = true
    )
  );

CREATE POLICY IF NOT EXISTS "Users with write permission can insert parking entries" ON parking_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_approved = true AND role IN ('admin', 'operator')
    )
  );

CREATE POLICY IF NOT EXISTS "Users with write permission can update parking entries" ON parking_entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_approved = true AND role IN ('admin', 'operator')
    )
  );

-- Create trigger to automatically update updated_at
CREATE TRIGGER IF NOT EXISTS update_parking_entries_updated_at 
  BEFORE UPDATE ON parking_entries 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Verify table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'parking_entries' 
ORDER BY ordinal_position;