-- ================================================
-- SEED DATA FOR UNIFIED PARKING MANAGEMENT SYSTEM
-- Essential business settings and default admin user
-- Deployment-ready for Supabase
-- ================================================

-- ================================================
-- CREATE DEFAULT ADMIN USER
-- ================================================

-- Note: In production, change the default password immediately after deployment
-- Password: admin123 (bcrypt hash: $2b$10$8K8zjf6Vm4pRGYPgFEgkdub0D6J9lOyOqq2O0Hxy7qYGvVP5mzIWm)
INSERT INTO users (
    username,
    password_hash,
    role,
    full_name,
    phone,
    is_active,
    is_approved,
    created_at
) VALUES (
    'admin',
    '$2b$10$8K8zjf6Vm4pRGYPgFEgkdub0D6J9lOyOqq2O0Hxy7qYGvVP5mzIWm',
    'admin',
    'System Administrator',
    '+91-9999999999',
    true,
    true,
    NOW()
) ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
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

-- Status options (reconciled with database schema)
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
('localization', 'locale', '"en-IN"', 'Default locale for formatting', true, 3),
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
('system', 'maintenance_mode', 'false', 'Enable maintenance mode', false, 6),
('system', 'real_time_enabled', 'true', 'Enable real-time updates', false, 7)
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
    "pattern": "^[a-zA-Z\\\\s]+$",
    "message": "Driver name should contain only letters and spaces"
}', 'Driver name validation rules', false, 2),

('validation', 'transport_name_validation', '{
    "enabled": true,
    "min_length": 2,
    "max_length": 100,
    "message": "Transport name is required"
}', 'Transport company name validation', false, 3),

('validation', 'driver_phone_validation', '{
    "enabled": true,
    "pattern": "^[+]?[0-9]{10,15}$",
    "message": "Enter valid phone number (10-15 digits)"
}', 'Driver phone number validation rules', false, 4)
ON CONFLICT (category, key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ================================================
-- SAMPLE PARKING ENTRY (Optional - for demonstration)
-- ================================================

-- Insert a sample parking entry to demonstrate the system
-- Note: This is optional and can be removed for production
INSERT INTO parking_entries (
    transport_name,
    vehicle_type,
    vehicle_number,
    driver_name,
    driver_phone,
    notes,
    entry_time,
    status,
    payment_status,
    parking_fee,
    payment_type,
    created_at,
    created_by
) VALUES (
    'Demo Transport Co.',
    '4 Wheeler',
    'MH12AB1234',
    'Demo Driver',
    '+91-9876543210',
    'Sample entry for system demonstration',
    NOW() - INTERVAL '2 hours',
    'Active',
    'Pending',
    100.00,
    'Cash',
    NOW(),
    (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
) ON CONFLICT DO NOTHING;

-- ================================================
-- VERIFICATION AND SUMMARY
-- ================================================

-- Display summary of seeded data
DO $$
DECLARE
    user_count INTEGER;
    business_count INTEGER;
    ui_count INTEGER;
    system_count INTEGER;
    total_config_count INTEGER;
    entry_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO business_count FROM app_config WHERE category = 'business';
    SELECT COUNT(*) INTO ui_count FROM app_config WHERE category = 'ui_theme';
    SELECT COUNT(*) INTO system_count FROM app_config WHERE category = 'system';
    SELECT COUNT(*) INTO total_config_count FROM app_config;
    SELECT COUNT(*) INTO entry_count FROM parking_entries;

    RAISE NOTICE '✅ Seed data deployment completed successfully:';
    RAISE NOTICE '   Users created: %', user_count;
    RAISE NOTICE '   Business settings: %', business_count;
    RAISE NOTICE '   UI theme settings: %', ui_count;
    RAISE NOTICE '   System settings: %', system_count;
    RAISE NOTICE '   Total configuration items: %', total_config_count;
    RAISE NOTICE '   Sample parking entries: %', entry_count;
    RAISE NOTICE '';

    IF business_count >= 11 AND user_count >= 1 THEN
        RAISE NOTICE '🎉 All critical data seeded successfully!';
        RAISE NOTICE '📝 Default admin login: admin / admin123';
        RAISE NOTICE '⚠️  SECURITY: Change default password immediately after deployment!';
    ELSE
        RAISE WARNING '⚠️ Some critical data may be missing. Review seed data carefully.';
    END IF;
END $$;

-- ================================================
-- POST-DEPLOYMENT SECURITY CHECKLIST
-- ================================================

-- After deployment, ensure the following security measures:
-- 1. Change default admin password immediately
-- 2. Review and approve all user accounts
-- 3. Verify RLS policies are active and working
-- 4. Test user role permissions thoroughly
-- 5. Enable audit logging for all critical operations
-- 6. Configure backup and recovery procedures
-- 7. Update environment variables for production
-- 8. Enable SSL/TLS for all database connections