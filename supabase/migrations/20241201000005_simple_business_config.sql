-- Simple Business Configuration System
-- Clean, reliable business settings for parking management

-- Create simple business configuration table
CREATE TABLE business_config (
    setting_key TEXT PRIMARY KEY,
    setting_value JSONB NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    is_editable BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS for security
ALTER TABLE business_config ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read business config
CREATE POLICY "Allow authenticated users to read business config"
    ON business_config FOR SELECT
    TO authenticated
    USING (true);

-- Allow admins to manage business config
CREATE POLICY "Allow admins to manage business config"
    ON business_config FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Insert essential business configuration
INSERT INTO business_config (setting_key, setting_value, description, category) VALUES
('vehicle_rates', '{"Trailer": 225, "6 Wheeler": 150, "4 Wheeler": 100, "2 Wheeler": 50}', 'Daily parking rates by vehicle type', 'rates'),
('business_hours', '{"start": "06:00", "end": "22:00", "timezone": "Asia/Kolkata"}', 'Operating hours for parking facility', 'operations'),
('company_info', '{"name": "Parking Management System", "address": "", "phone": "", "email": "", "gst": ""}', 'Company information for receipts and documents', 'company'),
('payment_types', '["Cash", "Online", "Card", "UPI"]', 'Accepted payment methods', 'payments'),
('overstay_penalty', '1.5', 'Penalty multiplier for vehicles exceeding time limits', 'rates'),
('currency', '"INR"', 'Default currency for all transactions', 'general'),
('tax_rate', '18', 'GST percentage for tax calculations', 'rates');

-- Create index for performance
CREATE INDEX idx_business_config_category ON business_config(category);

-- Success notification
DO $$
BEGIN
    RAISE NOTICE '✅ Simple business configuration system created successfully';
    RAISE NOTICE '📊 Vehicle rates configured: Trailer=₹225, 6Wheeler=₹150, 4Wheeler=₹100, 2Wheeler=₹50';
    RAISE NOTICE '🎯 Business settings are now ready for use';
END $$;