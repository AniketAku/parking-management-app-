-- ===================================================================
-- CRITICAL FIX: Populate empty app_config table
-- Solves "No business settings found" and ₹0 vehicle rates issue
-- ===================================================================

-- First, check if app_config table exists and create if missing
-- Note: This assumes PostgreSQL/Supabase environment
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

-- Clear any existing data to ensure clean state
DELETE FROM app_config WHERE category IN ('business', 'ui_theme', 'system', 'localization', 'validation');

-- ===================================================================
-- BUSINESS SETTINGS (Critical for VehicleEntryForm)
-- ===================================================================

INSERT INTO app_config (category, "key", "value", description, is_system, sort_order) VALUES

-- Vehicle Rates (CRITICAL - fixes ₹0 rates issue)
('business', 'vehicle_rates', '{"Trailer": 225, "6 Wheeler": 150, "4 Wheeler": 100, "2 Wheeler": 50}', 'Daily parking rates by vehicle type (in INR)', true, 1),

-- Vehicle Types (CRITICAL - provides dropdown options)
('business', 'vehicle_types', '["Trailer", "6 Wheeler", "4 Wheeler", "2 Wheeler"]', 'Supported vehicle types', true, 2),

-- Operating Hours
('business', 'operating_hours', '{"start": "06:00", "end": "22:00", "timezone": "Asia/Kolkata"}', 'Daily operating hours', true, 3),

-- Payment Methods
('business', 'payment_methods', '["Cash", "Credit Card", "Debit Card", "UPI", "Online", "N/A"]', 'Available payment methods', true, 4),

-- Entry/Exit Status Options
('business', 'entry_status_options', '["Active", "Exited"]', 'Available entry status values', true, 5),
('business', 'payment_status_options', '["Paid", "Pending", "Unpaid", "Refunded"]', 'Available payment status values', true, 6),

-- Business Rules
('business', 'minimum_charge_days', '1', 'Minimum number of days to charge for parking', true, 7),
('business', 'overstay_penalty_rate', '50', 'Penalty rate per hour for overstaying (in INR)', true, 8),
('business', 'overstay_threshold_hours', '24', 'Hours after which overstay penalty applies', true, 9),

-- Localization
('business', 'currency_code', '"INR"', 'ISO currency code', true, 10),
('business', 'tax_rate', '0', 'Tax rate percentage', true, 11);

-- ===================================================================
-- UI THEME SETTINGS (Basic for proper display)
-- ===================================================================

INSERT INTO app_config (category, "key", "value", description, is_system, sort_order) VALUES

-- Colors
('ui_theme', 'primary_color', '"#2563eb"', 'Primary theme color', false, 20),
('ui_theme', 'secondary_color', '"#64748b"', 'Secondary theme color', false, 21),
('ui_theme', 'success_color', '"#10b981"', 'Success color', false, 22),
('ui_theme', 'warning_color', '"#f59e0b"', 'Warning color', false, 23),
('ui_theme', 'danger_color', '"#ef4444"', 'Danger color', false, 24),

-- Theme Mode
('ui_theme', 'dark_mode', 'false', 'Enable dark mode theme', false, 25),
('ui_theme', 'theme_mode', '"light"', 'Theme mode selection', false, 26);

-- ===================================================================
-- SYSTEM SETTINGS (Basic configuration)
-- ===================================================================

INSERT INTO app_config (category, "key", "value", description, is_system, sort_order) VALUES

-- App Configuration
('system', 'app_name', '"Parking Management System"', 'Application name', true, 30),
('system', 'app_version', '"1.0.0"', 'Application version', true, 31),
('system', 'maintenance_mode', 'false', 'Enable maintenance mode', true, 32),

-- API Configuration
('system', 'api_timeout_ms', '30000', 'API request timeout in milliseconds', true, 33),
('system', 'auto_refresh_token', 'true', 'Automatically refresh Supabase auth tokens', true, 34);

-- ===================================================================
-- LOCALIZATION SETTINGS (Regional configuration)
-- ===================================================================

INSERT INTO app_config (category, "key", "value", description, is_system, sort_order) VALUES

-- Locale Configuration
('localization', 'default_locale', '"en-IN"', 'Default locale for date/currency formatting', false, 40),
('localization', 'currency_symbol', '"₹"', 'Currency symbol to display', false, 41),
('localization', 'currency_code', '"INR"', 'ISO currency code', false, 42),
('localization', 'timezone', '"Asia/Kolkata"', 'Default timezone', false, 43),
('localization', 'date_format', '"dd-MM-yyyy"', 'Date display format', false, 44),
('localization', 'time_format', '"12"', 'Time format (12 or 24 hour)', false, 45);

-- ===================================================================
-- VALIDATION SETTINGS (Form validation rules)
-- ===================================================================

INSERT INTO app_config (category, "key", "value", description, is_system, sort_order) VALUES

-- Form Validation
('validation', 'driver_name_min_length', '2', 'Minimum length for driver name', true, 50),
('validation', 'driver_name_max_length', '100', 'Maximum length for driver name', true, 51),
('validation', 'transport_name_max_length', '200', 'Maximum length for transport company name', true, 52),
('validation', 'phone_number_pattern', '"^[0-9]{10}$"', 'Regex pattern for phone number validation', true, 53);

-- ===================================================================
-- VERIFICATION & LOGGING
-- ===================================================================

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_app_config_category ON app_config(category);
CREATE INDEX IF NOT EXISTS idx_app_config_key ON app_config("key");

-- Display results
DO $$
DECLARE
  total_count INTEGER;
  business_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM app_config;
  SELECT COUNT(*) INTO business_count FROM app_config WHERE category = 'business';

  RAISE NOTICE '✅ Settings populated successfully!';
  RAISE NOTICE 'Total settings: %', total_count;
  RAISE NOTICE 'Business settings: %', business_count;
  RAISE NOTICE 'Expected result: VehicleEntryForm should now show proper rates (₹225 Trailer, ₹150 6-Wheeler, etc.)';
END $$;

-- Show sample of business settings for verification
SELECT
  category,
  "key",
  "value",
  description
FROM app_config
WHERE category = 'business'
ORDER BY sort_order;