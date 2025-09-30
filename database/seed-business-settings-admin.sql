-- Business Settings Seeding Script (Admin Privileges Required)
-- Run this script in Supabase SQL Editor with admin/service role privileges
-- This script bypasses RLS policies by running with elevated database privileges

-- Temporarily disable RLS for seeding (admin only)
BEGIN;

-- Check if app_settings table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_settings') THEN
        RAISE EXCEPTION 'Table app_settings does not exist. Please ensure the table is created first.';
    END IF;
END $$;

-- Insert business settings with conflict handling for idempotency
INSERT INTO app_settings (category, key, value, default_value, sort_order, created_at, updated_at) 
VALUES 
  (
    'business', 
    'vehicle_rates', 
    '{"Trailer": 225, "6 Wheeler": 150, "4 Wheeler": 100, "2 Wheeler": 50}',
    '{"Trailer": 225, "6 Wheeler": 150, "4 Wheeler": 100, "2 Wheeler": 50}',
    1,
    NOW(),
    NOW()
  ),
  (
    'business', 
    'vehicle_types', 
    '["Trailer", "6 Wheeler", "4 Wheeler", "2 Wheeler"]',
    '["Trailer", "6 Wheeler", "4 Wheeler", "2 Wheeler"]',
    2,
    NOW(),
    NOW()
  ),
  (
    'business', 
    'operating_hours', 
    '{"start": "06:00", "end": "22:00", "timezone": "America/New_York"}',
    '{"start": "06:00", "end": "22:00", "timezone": "America/New_York"}',
    3,
    NOW(),
    NOW()
  ),
  (
    'business', 
    'payment_methods', 
    '["Cash", "Card", "UPI", "Net Banking", "Online"]',
    '["Cash", "Card", "UPI", "Net Banking", "Online"]',
    4,
    NOW(),
    NOW()
  ),
  (
    'business', 
    'entry_status_options', 
    '["Active", "Exited", "Overstay"]',
    '["Active", "Exited", "Overstay"]',
    5,
    NOW(),
    NOW()
  ),
  (
    'business', 
    'payment_status_options', 
    '["Paid", "Pending", "Partial", "Failed"]',
    '["Paid", "Pending", "Partial", "Failed"]',
    6,
    NOW(),
    NOW()
  ),
  (
    'business', 
    'minimum_charge_days', 
    '1',
    '1',
    7,
    NOW(),
    NOW()
  ),
  (
    'business', 
    'overstay_penalty_rate', 
    '50',
    '50',
    8,
    NOW(),
    NOW()
  ),
  (
    'business', 
    'overstay_threshold_hours', 
    '24',
    '24',
    9,
    NOW(),
    NOW()
  )
ON CONFLICT (category, key) DO UPDATE SET
  value = EXCLUDED.value,
  default_value = EXCLUDED.default_value,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Verify insertion success
DO $$
DECLARE
    settings_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO settings_count 
    FROM app_settings 
    WHERE category = 'business';
    
    RAISE NOTICE 'Business settings seeded successfully. Total business settings: %', settings_count;
    
    IF settings_count < 9 THEN
        RAISE WARNING 'Expected 9 business settings, but found %. Some settings may not have been inserted.', settings_count;
    ELSE
        RAISE NOTICE 'All 9 business settings successfully seeded!';
    END IF;
END $$;

COMMIT;

-- Display final verification
SELECT 
    category,
    key,
    SUBSTRING(value::text, 1, 50) || CASE WHEN LENGTH(value::text) > 50 THEN '...' ELSE '' END as value_preview,
    sort_order,
    created_at,
    updated_at
FROM app_settings 
WHERE category = 'business'
ORDER BY sort_order;