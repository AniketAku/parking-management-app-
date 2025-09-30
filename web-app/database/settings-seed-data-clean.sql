-- ===================================================================
-- SETTINGS SEED DATA - CLEAN VERSION
-- Compatible with clean_deploy_settings.sql schema
-- ===================================================================

-- Business Configuration Settings
INSERT INTO app_settings (category, key, value, data_type, description, default_value, scope, validation_rules, sort_order) VALUES

-- Vehicle Rates
('business', 'vehicle_rates', '{"Trailer": 225, "6 Wheeler": 150, "4 Wheeler": 100, "2 Wheeler": 50}', 'json', 'Daily parking rates by vehicle type (in INR)', '{"Trailer": 225, "6 Wheeler": 150, "4 Wheeler": 100, "2 Wheeler": 50}', 'system', '{"type": "object"}', 1),

-- Penalty Configuration
('business', 'overstay_penalty_rate', '50', 'number', 'Penalty rate per hour for overstaying (in INR)', '50', 'system', '{"type": "number", "minimum": 0, "maximum": 1000}', 2),
('business', 'overstay_threshold_hours', '24', 'number', 'Hours after which overstay penalty applies', '24', 'system', '{"type": "number", "minimum": 1, "maximum": 168}', 3),
('business', 'minimum_charge_days', '1', 'number', 'Minimum number of days to charge for parking', '1', 'system', '{"type": "number", "minimum": 1, "maximum": 7}', 4),

-- Operating Hours
('business', 'operating_hours', '{"start": "06:00", "end": "22:00", "timezone": "Asia/Kolkata"}', 'json', 'Daily operating hours', '{"start": "06:00", "end": "22:00", "timezone": "Asia/Kolkata"}', 'location', '{"type": "object"}', 5),

-- Payment Methods
('business', 'payment_methods', '["Cash", "Credit Card", "Debit Card", "UPI", "Net Banking"]', 'array', 'Available payment methods', '["Cash", "Credit Card", "Debit Card", "UPI"]', 'location', '{"type": "array"}', 6),

-- Currency and Tax
('business', 'currency_code', '"INR"', 'string', 'Default currency code', '"INR"', 'system', '{"type": "string"}', 7),
('business', 'tax_rate', '0', 'number', 'Tax rate as decimal (0.18 = 18%)', '0', 'system', '{"type": "number", "minimum": 0, "maximum": 1}', 8),

-- User Management Settings
('user_mgmt', 'user_roles', '["admin", "operator", "viewer"]', 'array', 'Available user roles', '["admin", "operator", "viewer"]', 'system', '{"type": "array"}', 10),
('user_mgmt', 'default_user_role', '"operator"', 'string', 'Default role for new users', '"operator"', 'system', '{"type": "string"}', 11),
('user_mgmt', 'require_approval', 'true', 'boolean', 'Require admin approval for new users', 'true', 'system', '{"type": "boolean"}', 12),
('user_mgmt', 'session_timeout', '480', 'number', 'Session timeout in minutes', '480', 'system', '{"type": "number"}', 13),
('user_mgmt', 'max_login_attempts', '5', 'number', 'Maximum failed login attempts', '5', 'system', '{"type": "number"}', 14),

-- UI Theme Settings
('ui_theme', 'primary_color', '"#2563eb"', 'string', 'Primary brand color (hex)', '"#2563eb"', 'system', '{"type": "string"}', 20),
('ui_theme', 'secondary_color', '"#64748b"', 'string', 'Secondary color (hex)', '"#64748b"', 'system', '{"type": "string"}', 21),
('ui_theme', 'success_color', '"#10b981"', 'string', 'Success color (hex)', '"#10b981"', 'system', '{"type": "string"}', 22),
('ui_theme', 'warning_color', '"#f59e0b"', 'string', 'Warning color (hex)', '"#f59e0b"', 'system', '{"type": "string"}', 23),
('ui_theme', 'danger_color', '"#ef4444"', 'string', 'Danger/error color (hex)', '"#ef4444"', 'system', '{"type": "string"}', 24),

('ui_theme', 'default_theme', '"light"', 'string', 'Default theme mode', '"light"', 'user', '{"type": "string"}', 25),
('ui_theme', 'font_family', '"Inter, system-ui, sans-serif"', 'string', 'Default font family', '"Inter, system-ui, sans-serif"', 'system', '{"type": "string"}', 26),
('ui_theme', 'font_size_base', '16', 'number', 'Base font size in pixels', '16', 'user', '{"type": "number"}', 27),

-- System Settings
('system', 'api_timeout', '30000', 'number', 'API request timeout in milliseconds', '30000', 'system', '{"type": "number"}', 30),
('system', 'max_file_size', '5242880', 'number', 'Maximum file upload size in bytes (5MB)', '5242880', 'system', '{"type": "number"}', 31),
('system', 'backup_retention_days', '30', 'number', 'Days to retain backup files', '30', 'system', '{"type": "number"}', 32),
('system', 'maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', 'false', 'system', '{"type": "boolean"}', 33),

-- Validation Settings
('validation', 'vehicle_number_pattern', '"^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$"', 'string', 'Regex pattern for vehicle number validation', '"^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$"', 'system', '{"type": "string"}', 40),
('validation', 'phone_number_pattern', '"^[6-9]\\d{9}$"', 'string', 'Regex pattern for phone number validation', '"^[6-9]\\d{9}$"', 'system', '{"type": "string"}', 41),
('validation', 'min_password_length', '8', 'number', 'Minimum password length', '8', 'system', '{"type": "number"}', 42),

-- Localization Settings
('localization', 'default_language', '"en"', 'string', 'Default language code', '"en"', 'system', '{"type": "string"}', 50),
('localization', 'supported_languages', '["en", "hi", "mr"]', 'array', 'Supported language codes', '["en", "hi", "mr"]', 'system', '{"type": "array"}', 51),
('localization', 'date_format', '"DD/MM/YYYY"', 'string', 'Default date format', '"DD/MM/YYYY"', 'user', '{"type": "string"}', 52),
('localization', 'time_format', '"HH:mm"', 'string', 'Default time format (24h)', '"HH:mm"', 'user', '{"type": "string"}', 53),
('localization', 'timezone', '"Asia/Kolkata"', 'string', 'Default timezone', '"Asia/Kolkata"', 'location', '{"type": "string"}', 54),

-- Notification Settings
('notifications', 'email_enabled', 'true', 'boolean', 'Enable email notifications', 'true', 'system', '{"type": "boolean"}', 60),
('notifications', 'sms_enabled', 'false', 'boolean', 'Enable SMS notifications', 'false', 'system', '{"type": "boolean"}', 61),
('notifications', 'overstay_alert_enabled', 'true', 'boolean', 'Enable overstay alerts', 'true', 'location', '{"type": "boolean"}', 62),
('notifications', 'daily_report_enabled', 'true', 'boolean', 'Enable daily report emails', 'true', 'location', '{"type": "boolean"}', 63),

-- Reporting Settings  
('reporting', 'default_export_format', '"csv"', 'string', 'Default export format', '"csv"', 'user', '{"type": "string"}', 70),
('reporting', 'max_export_records', '10000', 'number', 'Maximum records in single export', '10000', 'system', '{"type": "number"}', 71),
('reporting', 'report_retention_days', '90', 'number', 'Days to retain generated reports', '90', 'system', '{"type": "number"}', 72),

-- Security Settings
('security', 'force_https', 'true', 'boolean', 'Force HTTPS connections', 'true', 'system', '{"type": "boolean"}', 80),
('security', 'session_secure_cookies', 'true', 'boolean', 'Use secure cookies', 'true', 'system', '{"type": "boolean"}', 81),
('security', 'password_complexity', 'true', 'boolean', 'Enforce password complexity', 'true', 'system', '{"type": "boolean"}', 82),

-- Performance Settings
('performance', 'cache_duration', '300', 'number', 'Cache duration in seconds', '300', 'system', '{"type": "number"}', 90),
('performance', 'max_concurrent_users', '100', 'number', 'Maximum concurrent users', '100', 'system', '{"type": "number"}', 91),
('performance', 'database_query_timeout', '30', 'number', 'Database query timeout in seconds', '30', 'system', '{"type": "number"}', 92);

-- Setting Templates (simplified to match schema)
INSERT INTO setting_templates (name, description, category, template_data, is_default, is_system_template) VALUES

-- Default Business Template
('Default Business Configuration', 'Standard parking business settings', 'business', 
'{
  "vehicle_rates": {"Trailer": 225, "6 Wheeler": 150, "4 Wheeler": 100, "2 Wheeler": 50},
  "overstay_penalty_rate": 50,
  "operating_hours": {"start": "06:00", "end": "22:00"},
  "payment_methods": ["Cash", "UPI", "Credit Card"]
}', true, true),

-- Small Lot Template
('Small Parking Lot', 'Configuration for small parking facilities', 'business',
'{
  "vehicle_rates": {"4 Wheeler": 80, "2 Wheeler": 40},
  "overstay_penalty_rate": 30,
  "operating_hours": {"start": "07:00", "end": "20:00"},
  "payment_methods": ["Cash", "UPI"]
}', false, true),

-- Premium Service Template  
('Premium Parking Service', 'High-end parking facility configuration', 'business',
'{
  "vehicle_rates": {"Trailer": 300, "6 Wheeler": 200, "4 Wheeler": 150, "2 Wheeler": 75},
  "overstay_penalty_rate": 100,
  "operating_hours": {"start": "24/7", "end": "24/7"},
  "payment_methods": ["Cash", "Credit Card", "Debit Card", "UPI", "Net Banking"]
}', false, true),

-- Dark Theme Template
('Dark Theme', 'Dark mode color scheme', 'ui_theme',
'{
  "primary_color": "#3b82f6",
  "secondary_color": "#6b7280", 
  "success_color": "#10b981",
  "warning_color": "#f59e0b",
  "danger_color": "#ef4444",
  "default_theme": "dark"
}', false, true);

-- Success message
SELECT 'Settings seed data applied successfully!' as status;
SELECT COUNT(*) as total_settings FROM app_settings;
SELECT category, COUNT(*) as settings_count FROM app_settings GROUP BY category ORDER BY category;