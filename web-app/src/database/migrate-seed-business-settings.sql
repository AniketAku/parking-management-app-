-- Business Settings Migration
-- Seeds essential business configuration data for the parking management system
-- Handles Row-Level Security by running with proper database privileges

BEGIN;

-- Insert business settings with proper conflict handling for idempotency
INSERT INTO app_settings (category, key, value, default_value, sort_order) 
VALUES 
  (
    'business', 
    'vehicle_rates', 
    '{"Trailer": 225, "6 Wheeler": 150, "4 Wheeler": 100, "2 Wheeler": 50}',
    '{"Trailer": 225, "6 Wheeler": 150, "4 Wheeler": 100, "2 Wheeler": 50}',
    1
  ),
  (
    'business', 
    'vehicle_types', 
    '["Trailer", "6 Wheeler", "4 Wheeler", "2 Wheeler"]',
    '["Trailer", "6 Wheeler", "4 Wheeler", "2 Wheeler"]',
    2
  ),
  (
    'business', 
    'operating_hours', 
    '{"start": "06:00", "end": "22:00", "timezone": "America/New_York"}',
    '{"start": "06:00", "end": "22:00", "timezone": "America/New_York"}',
    3
  ),
  (
    'business', 
    'payment_methods', 
    '["Cash", "Card", "UPI", "Net Banking", "Online"]',
    '["Cash", "Card", "UPI", "Net Banking", "Online"]',
    4
  ),
  (
    'business', 
    'entry_status_options', 
    '["Active", "Exited", "Overstay"]',
    '["Active", "Exited", "Overstay"]',
    5
  ),
  (
    'business', 
    'payment_status_options', 
    '["Paid", "Pending", "Partial", "Failed"]',
    '["Paid", "Pending", "Partial", "Failed"]',
    6
  ),
  (
    'business', 
    'minimum_charge_days', 
    '1',
    '1',
    7
  ),
  (
    'business', 
    'overstay_penalty_rate', 
    '50',
    '50',
    8
  ),
  (
    'business', 
    'overstay_threshold_hours', 
    '24',
    '24',
    9
  )
ON CONFLICT (category, key) DO NOTHING;

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
    END IF;
END $$;

COMMIT;