-- Insert business settings into app_config table
-- Run this SQL in the Supabase SQL Editor

-- Temporarily disable RLS for setup
ALTER TABLE app_config DISABLE ROW LEVEL SECURITY;

-- Insert business settings
INSERT INTO app_config (category, key, value, description) VALUES
('business', 'vehicle_types', '["Trailer", "6 Wheeler", "4 Wheeler", "2 Wheeler"]', 'Available vehicle types for parking'),
('business', 'vehicle_rates', '{"Trailer": 225, "6 Wheeler": 150, "4 Wheeler": 100, "2 Wheeler": 50}', 'Daily parking rates by vehicle type'),
('business', 'business_hours', '{"open_time": "06:00", "close_time": "22:00", "timezone": "Asia/Kolkata"}', 'Business operating hours'),
('business', 'payment_settings', '{"accepted_methods": ["Cash", "UPI", "Card"], "currency": "INR", "tax_rate": 0.18}', 'Payment configuration'),
('business', 'penalty_settings', '{"overstay_grace_period_hours": 1, "overstay_penalty_rate": 0.5, "late_payment_penalty_days": 7, "late_payment_penalty_rate": 0.1}', 'Penalty and fee structure'),
('business', 'notification_settings', '{"enable_sms": false, "enable_email": false, "reminder_hours_before_expiry": 2}', 'Notification preferences')
ON CONFLICT (category, key)
DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = now();

-- Re-enable RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Verify the data was inserted correctly
SELECT
    category,
    key,
    value,
    description,
    created_at
FROM app_config
WHERE category = 'business'
ORDER BY key;

-- Show specific vehicle rates for verification
SELECT
    key,
    value->'Trailer' as trailer_rate,
    value->'6 Wheeler' as six_wheeler_rate,
    value->'4 Wheeler' as four_wheeler_rate,
    value->'2 Wheeler' as two_wheeler_rate
FROM app_config
WHERE category = 'business' AND key = 'vehicle_rates';