-- ================================================
-- SEED DATA FOR NEW ARCHITECTURE
-- Essential business settings and default admin user
-- ================================================

-- ================================================
-- CREATE DEFAULT ADMIN USER
-- ================================================

INSERT INTO users (
    username,
    password,
    role,
    is_active,
    is_approved,
    created_at
) VALUES (
    'admin',
    'admin123',
    'admin',
    true,
    true,
    NOW()
) ON CONFLICT (username) DO UPDATE SET
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    is_approved = EXCLUDED.is_approved,
    updated_at = NOW();

-- ================================================
-- BUSINESS SETTINGS (CRITICAL FOR APP FUNCTIONALITY)
-- ================================================

-- Vehicle rates and types
INSERT INTO app_config (category, key, value, description, is_system, sort_order) VALUES
('business', 'vehicle_rates', '{
    "Trailer": 225,
    "6 Wheeler": 150,
    "4 Wheeler": 100,
    "2 Wheeler": 50
}', 'Daily parking rates by vehicle type in rupees', true, 1),

('business', 'vehicle_types', '[
    "Trailer", 
    "6 Wheeler", 
    "4 Wheeler", 
    "2 Wheeler"
]', 'Available vehicle types for parking', true, 2),

-- Operating configuration
('business', 'operating_hours', '{
    "start": "06:00",
    "end": "22:00",
    "timezone": "Asia/Kolkata"
}', 'Business operating hours', true, 3),

('business', 'payment_methods', '[
    "Cash",
    "Card", 
    "UPI",
    "Net Banking",
    "Online"
]', 'Accepted payment methods', true, 4),

-- Status options
('business', 'entry_status_options', '[
    "Active",
    "Exited", 
    "Overstay"
]', 'Available entry status values', true, 5),

('business', 'payment_status_options', '[
    "Paid",
    "Pending", 
    "Partial",
    "Failed"
]', 'Available payment status values', true, 6),

-- Business rules
('business', 'minimum_charge_days', '1', 'Minimum billing period in days', true, 7),

('business', 'overstay_penalty_rate', '50', 'Additional charge for overstay (percentage)', true, 8),

('business', 'overstay_threshold_hours', '24', 'Hours before vehicle is considered overstay', true, 9),

-- Financial settings
('business', 'currency_code', '"INR"', 'Currency code for pricing', true, 10),

('business', 'tax_rate', '0', 'Tax rate percentage (if applicable)', true, 11)
ON CONFLICT (category, key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ================================================
-- UI THEME SETTINGS
-- ================================================

INSERT INTO app_config (category, key, value, description, is_system, sort_order) VALUES
('ui_theme', 'primary_color', '"#2563eb"', 'Primary brand color', false, 1),
('ui_theme', 'secondary_color', '"#64748b"', 'Secondary color', false, 2),
('ui_theme', 'success_color', '"#10b981"', 'Success state color', false, 3),
('ui_theme', 'warning_color', '"#f59e0b"', 'Warning state color', false, 4),
('ui_theme', 'danger_color', '"#ef4444"', 'Error/danger color', false, 5),
('ui_theme', 'dark_mode', 'false', 'Enable dark mode by default', false, 6),
('ui_theme', 'theme_mode', '"light"', 'Default theme mode (light/dark/auto)', false, 7)
ON CONFLICT (category, key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ================================================
-- LOCALIZATION SETTINGS
-- ================================================

INSERT INTO app_config (category, key, value, description, is_system, sort_order) VALUES
('localization', 'currency_symbol', '"₹"', 'Currency symbol for display', true, 1),
('localization', 'currency_code', '"INR"', 'ISO currency code', true, 2),
('localization', 'default_locale', '"en-IN"', 'Default locale for formatting', true, 3),
('localization', 'time_format', '"24h"', 'Time format (12h/24h)', false, 4),
('localization', 'timezone', '"Asia/Kolkata"', 'Default timezone', true, 5),
('localization', 'date_format', '"DD/MM/YYYY"', 'Date display format', false, 6)
ON CONFLICT (category, key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ================================================
-- SYSTEM SETTINGS
-- ================================================

INSERT INTO app_config (category, key, value, description, is_system, sort_order) VALUES
('system', 'app_name', '"Parking Management System"', 'Application name', true, 1),
('system', 'app_version', '"2.0.0"', 'Current application version', true, 2),
('system', 'max_parking_duration_hours', '72', 'Maximum allowed parking duration', false, 3),
('system', 'auto_exit_enabled', 'false', 'Automatically mark vehicles as exited', false, 4),
('system', 'backup_retention_days', '30', 'Days to retain backup data', true, 5),
('system', 'maintenance_mode', 'false', 'Enable maintenance mode', false, 6)
ON CONFLICT (category, key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ================================================
-- VALIDATION SETTINGS
-- ================================================

INSERT INTO app_config (category, key, value, description, is_system, sort_order) VALUES
('validation', 'vehicle_number_validation', '{
    "enabled": true,
    "pattern": "^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{1,4}$",
    "message": "Enter valid vehicle number (e.g., MH12AB1234)"
}', 'Vehicle number validation rules', false, 1),

('validation', 'driver_name_validation', '{
    "enabled": true,
    "min_length": 2,
    "max_length": 100,
    "pattern": "^[a-zA-Z\\s]+$",
    "message": "Driver name should contain only letters and spaces"
}', 'Driver name validation rules', false, 2),

('validation', 'transport_name_validation', '{
    "enabled": true,
    "min_length": 2,
    "max_length": 100,
    "message": "Transport name is required"
}', 'Transport company name validation', false, 3)
ON CONFLICT (category, key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ================================================
-- VERIFY SEED DATA
-- ================================================

-- Display summary of seeded data
DO $$
DECLARE
    business_count INTEGER;
    ui_count INTEGER;
    system_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO business_count FROM app_config WHERE category = 'business';
    SELECT COUNT(*) INTO ui_count FROM app_config WHERE category = 'ui_theme';
    SELECT COUNT(*) INTO system_count FROM app_config WHERE category = 'system';
    SELECT COUNT(*) INTO total_count FROM app_config;
    
    RAISE NOTICE '✅ Seed data completed successfully:';
    RAISE NOTICE '   Business settings: %', business_count;
    RAISE NOTICE '   UI theme settings: %', ui_count;
    RAISE NOTICE '   System settings: %', system_count;
    RAISE NOTICE '   Total settings: %', total_count;
    RAISE NOTICE '   Default admin user: created/updated';
    
    IF business_count >= 11 THEN
        RAISE NOTICE '🎉 All critical business settings seeded successfully!';
    ELSE
        RAISE WARNING '⚠️ Some business settings may be missing. Expected: 11, Found: %', business_count;
    END IF;
END $$;