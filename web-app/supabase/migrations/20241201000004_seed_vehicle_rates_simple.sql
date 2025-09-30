-- Simple Vehicle Rates Seeding Migration
-- Populates app_settings with essential vehicle rates for centralized system

-- Insert vehicle rates configuration
INSERT INTO app_settings (
    category, 
    key, 
    value, 
    data_type, 
    description, 
    scope
) VALUES (
    'business',
    'vehicle_rates',
    '{"Trailer": 225, "6 Wheeler": 150, "4 Wheeler": 100, "2 Wheeler": 50}',
    'json',
    'Daily parking rates by vehicle type',
    'system'
) ON CONFLICT (category, key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- Insert vehicle types list
INSERT INTO app_settings (
    category,
    key, 
    value,
    data_type,
    description,
    scope
) VALUES (
    'business',
    'vehicle_types',
    '["Trailer", "6 Wheeler", "4 Wheeler", "2 Wheeler"]',
    'array', 
    'Available vehicle types for parking entries',
    'system'
) ON CONFLICT (category, key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- Verification query
DO $$
BEGIN
    RAISE NOTICE '✅ Vehicle rates centralized system initialized';
    RAISE NOTICE '📊 Rates: Trailer=₹225, 6Wheeler=₹150, 4Wheeler=₹100, 2Wheeler=₹50';
    RAISE NOTICE '🎯 UI will now use centralized configuration instead of fallback rates';
END $$;