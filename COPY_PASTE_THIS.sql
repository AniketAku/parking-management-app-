-- COPY AND PASTE THIS ENTIRE BLOCK INTO SUPABASE SQL EDITOR
-- This will fix your "No business settings found" and "₹0 fallback rate" issues

-- Step 1: Temporarily disable Row Level Security
ALTER TABLE app_config DISABLE ROW LEVEL SECURITY;

-- Step 2: Insert the business settings data
DELETE FROM app_config WHERE category = 'business'; -- Clear any existing data

INSERT INTO app_config (category, key, value, description) VALUES
('business', 'vehicle_types', '["Trailer", "6 Wheeler", "4 Wheeler", "2 Wheeler"]'::jsonb, 'Available vehicle types'),
('business', 'vehicle_rates', '{"Trailer": 225, "6 Wheeler": 150, "4 Wheeler": 100, "2 Wheeler": 50}'::jsonb, 'Daily parking rates');

-- Step 3: Re-enable Row Level Security
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Step 4: Verify the data is there
SELECT category, key, value FROM app_config WHERE category = 'business';

-- You should see:
-- business | vehicle_types | ["Trailer", "6 Wheeler", "4 Wheeler", "2 Wheeler"]
-- business | vehicle_rates | {"Trailer": 225, "6 Wheeler": 150, "4 Wheeler": 100, "2 Wheeler": 50}