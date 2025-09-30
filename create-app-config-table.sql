-- Create app_config table for business settings
-- Run this SQL in the Supabase SQL Editor

-- Create the app_config table
CREATE TABLE IF NOT EXISTS app_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(category, key)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_app_config_category ON app_config(category);
CREATE INDEX IF NOT EXISTS idx_app_config_category_key ON app_config(category, key);

-- Enable Row Level Security
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read settings
CREATE POLICY "Allow authenticated users to read app_config" ON app_config
FOR SELECT TO authenticated USING (true);

-- Create policy to allow admins to manage settings
CREATE POLICY "Allow admin users to manage app_config" ON app_config
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
        AND users.is_active = true
    )
);

-- Insert default business settings
INSERT INTO app_config (category, key, value, description) VALUES
-- Vehicle Types
('business', 'vehicle_types', '["Trailer", "6 Wheeler", "4 Wheeler", "2 Wheeler"]', 'Available vehicle types for parking'),

-- Vehicle Rates (daily rates in rupees)
('business', 'vehicle_rates', '{
    "Trailer": 225,
    "6 Wheeler": 150,
    "4 Wheeler": 100,
    "2 Wheeler": 50
}', 'Daily parking rates by vehicle type'),

-- Business Hours
('business', 'business_hours', '{
    "open_time": "06:00",
    "close_time": "22:00",
    "timezone": "Asia/Kolkata"
}', 'Business operating hours'),

-- Payment Settings
('business', 'payment_settings', '{
    "accepted_methods": ["Cash", "UPI", "Card"],
    "currency": "INR",
    "tax_rate": 0.18
}', 'Payment configuration'),

-- Penalty Settings
('business', 'penalty_settings', '{
    "overstay_grace_period_hours": 1,
    "overstay_penalty_rate": 0.5,
    "late_payment_penalty_days": 7,
    "late_payment_penalty_rate": 0.1
}', 'Penalty and fee structure'),

-- Notification Settings
('business', 'notification_settings', '{
    "enable_sms": false,
    "enable_email": false,
    "reminder_hours_before_expiry": 2
}', 'Notification preferences')

ON CONFLICT (category, key)
DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = now();

-- Verify the data was inserted
SELECT
    category,
    key,
    value,
    description,
    created_at
FROM app_config
WHERE category = 'business'
ORDER BY key;