-- =====================================================================
-- CREATE APP_SETTINGS SYSTEM AND SEED VEHICLE RATES
-- This creates the settings tables and seeds your vehicle rates
-- =====================================================================

-- Step 1: Create ENUMs
DO $$ BEGIN
  CREATE TYPE setting_category AS ENUM (
    'business', 'user_mgmt', 'ui_theme', 'system', 'validation',
    'localization', 'notifications', 'reporting', 'security', 'performance'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE setting_data_type AS ENUM (
    'string', 'number', 'boolean', 'json', 'array', 'enum'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE setting_scope AS ENUM (
    'system', 'location', 'user'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category setting_category NOT NULL,
  key VARCHAR(100) NOT NULL,
  value JSONB NOT NULL,
  data_type setting_data_type NOT NULL DEFAULT 'string',
  description TEXT,
  default_value JSONB,

  -- Validation constraints
  validation_rules JSONB,
  enum_values TEXT[],
  min_value NUMERIC,
  max_value NUMERIC,
  min_length INTEGER,
  max_length INTEGER,

  -- Metadata
  scope setting_scope NOT NULL DEFAULT 'system',
  is_system_setting BOOLEAN DEFAULT false,
  requires_restart BOOLEAN DEFAULT false,
  is_sensitive BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),

  -- Constraints
  UNIQUE(category, key),
  CONSTRAINT valid_json_value CHECK (value IS NOT NULL)
);

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_app_settings_category ON app_settings(category);
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);
CREATE INDEX IF NOT EXISTS idx_app_settings_scope ON app_settings(scope);

-- Step 4: Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS Policies
DROP POLICY IF EXISTS "Admin full access to app_settings" ON app_settings;
CREATE POLICY "Admin full access to app_settings" ON app_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users read non-sensitive app_settings" ON app_settings;
CREATE POLICY "Users read non-sensitive app_settings" ON app_settings
  FOR SELECT TO authenticated
  USING (
    NOT is_sensitive OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  );

-- Step 6: Seed Vehicle Rates (YOUR EXISTING SYSTEM)
INSERT INTO app_settings (category, key, value, data_type, description, default_value, scope, validation_rules, sort_order)
VALUES (
  'business',
  'vehicle_rates',
  '{"Trailer": 225, "6 Wheeler": 150, "4 Wheeler": 100, "2 Wheeler": 50}'::jsonb,
  'json',
  'Daily parking rates by vehicle type (in INR)',
  '{"Trailer": 225, "6 Wheeler": 150, "4 Wheeler": 100, "2 Wheeler": 50}'::jsonb,
  'system',
  '{"type": "object", "properties": {"Trailer": {"type": "number", "minimum": 0}, "6 Wheeler": {"type": "number", "minimum": 0}, "4 Wheeler": {"type": "number", "minimum": 0}, "2 Wheeler": {"type": "number", "minimum": 0}}}'::jsonb,
  1
)
ON CONFLICT (category, key)
DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Step 7: Verify
SELECT
  '✅ App Settings Created' as status,
  category,
  key,
  value as "Vehicle Rates"
FROM app_settings
WHERE key = 'vehicle_rates';
