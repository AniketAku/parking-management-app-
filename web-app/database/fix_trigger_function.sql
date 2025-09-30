-- Fix the trigger function for proper column references
-- Run this to correct the audit trigger

CREATE OR REPLACE FUNCTION log_setting_change()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id INTEGER;
  setting_key_value VARCHAR(100);
BEGIN
  -- Get current user's integer ID from auth_id
  SELECT id INTO current_user_id 
  FROM users 
  WHERE auth_id = auth.uid();

  -- Get the appropriate key field based on table
  IF TG_TABLE_NAME = 'app_settings' THEN
    setting_key_value := COALESCE(NEW.key, OLD.key);
  ELSIF TG_TABLE_NAME = 'user_settings' THEN
    setting_key_value := COALESCE(NEW.setting_key, OLD.setting_key);
  ELSIF TG_TABLE_NAME = 'location_settings' THEN
    setting_key_value := COALESCE(NEW.setting_key, OLD.setting_key);
  END IF;

  -- Log changes to settings_history
  IF TG_OP = 'DELETE' THEN
    INSERT INTO settings_history (
      setting_id, setting_key, old_value, new_value, change_type,
      changed_by, source_table, changed_at
    ) VALUES (
      OLD.id, 
      setting_key_value,
      OLD.value, NULL, 'DELETE',
      current_user_id, TG_TABLE_NAME, NOW()
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO settings_history (
      setting_id, setting_key, old_value, new_value, change_type,
      changed_by, source_table, changed_at
    ) VALUES (
      NEW.id,
      setting_key_value,
      OLD.value, NEW.value, 'UPDATE',
      current_user_id, TG_TABLE_NAME, NOW()
    );
    NEW.updated_at = NOW();
    IF TG_TABLE_NAME = 'app_settings' THEN
      NEW.updated_by = current_user_id;
    ELSIF TG_TABLE_NAME = 'location_settings' THEN
      NEW.updated_by = current_user_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO settings_history (
      setting_id, setting_key, old_value, new_value, change_type,
      changed_by, source_table, changed_at
    ) VALUES (
      NEW.id,
      setting_key_value,
      NULL, NEW.value, 'INSERT',
      current_user_id, TG_TABLE_NAME, NOW()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;