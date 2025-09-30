-- Supabase Database Schema for Parking Management System

-- Create users table with all required columns
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  -- email field removed as part of phone-only authentication
  role VARCHAR(20) NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator', 'viewer')),
  full_name VARCHAR(100),
  phone VARCHAR(20),
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Add missing columns if they don't exist (for existing tables)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator', 'viewer'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Create parking_entries table for parking data
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
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
-- Email index removed as email field no longer exists
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_approved ON users(is_approved);

CREATE INDEX IF NOT EXISTS idx_parking_entries_vehicle_number ON parking_entries(vehicle_number);
CREATE INDEX IF NOT EXISTS idx_parking_entries_status ON parking_entries(status);
CREATE INDEX IF NOT EXISTS idx_parking_entries_entry_time ON parking_entries(entry_time);
CREATE INDEX IF NOT EXISTS idx_parking_entries_payment_status ON parking_entries(payment_status);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY IF NOT EXISTS "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY IF NOT EXISTS "Admins can update all users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for parking_entries table
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER IF NOT EXISTS update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_parking_entries_updated_at 
  BEFORE UPDATE ON parking_entries 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();