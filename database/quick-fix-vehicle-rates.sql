-- QUICK FIX: Just the essential vehicle rates to get system working
-- Run this in Supabase SQL Editor if you need immediate fix

-- Ensure table exists
CREATE TABLE IF NOT EXISTS app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  "key" VARCHAR(100) NOT NULL,
  "value" JSONB NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT,
  UNIQUE(category, "key")
);

-- Insert only the critical business settings
INSERT INTO app_config (category, "key", "value", description, is_system, sort_order) VALUES
('business', 'vehicle_rates', '{"Trailer": 225, "6 Wheeler": 150, "4 Wheeler": 100, "2 Wheeler": 50}', 'Daily parking rates by vehicle type (in INR)', true, 1),
('business', 'vehicle_types', '["Trailer", "6 Wheeler", "4 Wheeler", "2 Wheeler"]', 'Supported vehicle types', true, 2),
('business', 'currency_code', '"INR"', 'ISO currency code', true, 3),
('business', 'payment_methods', '["Cash", "Credit Card", "UPI"]', 'Available payment methods', true, 4),
('business', 'entry_status_options', '["Active", "Exited"]', 'Available entry status values', true, 5),
('business', 'payment_status_options', '["Paid", "Pending", "Unpaid"]', 'Available payment status values', true, 6)
ON CONFLICT (category, "key") DO UPDATE SET
  "value" = EXCLUDED."value",
  updated_at = NOW();

-- Verify the fix
SELECT
  category,
  "key",
  "value"
FROM app_config
WHERE category = 'business'
ORDER BY sort_order;