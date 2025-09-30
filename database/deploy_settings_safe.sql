-- Safe Settings Deployment Script
-- Handles role compatibility and missing tables gracefully

-- Step 1: Check prerequisites
DO $$
BEGIN
  -- Check if locations table exists, create minimal version if needed
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'locations') THEN
    CREATE TABLE locations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      address TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Insert default location
    INSERT INTO locations (id, name, address) VALUES (1, 'Default Location', 'Main Parking Facility');
    
    RAISE NOTICE 'Created minimal locations table';
  END IF;
  
  -- Ensure users have location_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'location_id') THEN
    ALTER TABLE users ADD COLUMN location_id INTEGER DEFAULT 1 REFERENCES locations(id);
    RAISE NOTICE 'Added location_id to users table';
  END IF;
END $$;

-- Step 2: Apply the settings schema (corrected for roles)
\i settings-schema-fixed.sql

-- Step 3: Apply seed data
\i settings-seed-data.sql

-- Step 4: Update any existing 'manager' references to 'operator' (fallback safety)
UPDATE users SET role = 'operator' WHERE role = 'manager';

-- Step 5: Verification
SELECT 'Settings system deployed successfully!' as status;
SELECT COUNT(*) as total_settings FROM app_settings;
SELECT category, COUNT(*) as count FROM app_settings GROUP BY category ORDER BY category;