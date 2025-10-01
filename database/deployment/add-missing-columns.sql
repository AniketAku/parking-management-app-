-- ================================================
-- QUICK FIX: ADD MISSING COLUMNS TO EXISTING DATABASE
-- Run this if you just need to add the missing fields
-- ================================================

BEGIN;

DO $$
BEGIN
    RAISE NOTICE '🔧 Adding missing columns to existing tables...';
END $$;

-- Add missing columns to parking_entries table
DO $$
BEGIN
    -- Add driver_phone column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'parking_entries' AND column_name = 'driver_phone') THEN
        ALTER TABLE parking_entries ADD COLUMN driver_phone VARCHAR(20);
        RAISE NOTICE '✅ Added driver_phone column to parking_entries';
    ELSE
        RAISE NOTICE '⚠️ driver_phone column already exists';
    END IF;

    -- Add serial column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'parking_entries' AND column_name = 'serial') THEN
        ALTER TABLE parking_entries ADD COLUMN serial INTEGER GENERATED ALWAYS AS IDENTITY;
        RAISE NOTICE '✅ Added serial column to parking_entries';
    ELSE
        RAISE NOTICE '⚠️ serial column already exists';
    END IF;

    -- Add last_modified column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'parking_entries' AND column_name = 'last_modified') THEN
        ALTER TABLE parking_entries ADD COLUMN last_modified TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE '✅ Added last_modified column to parking_entries';
    ELSE
        RAISE NOTICE '⚠️ last_modified column already exists';
    END IF;

    -- Rename calculated_fee to parking_fee if needed
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'parking_entries' AND column_name = 'calculated_fee')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'parking_entries' AND column_name = 'parking_fee') THEN
        ALTER TABLE parking_entries RENAME COLUMN calculated_fee TO parking_fee;
        RAISE NOTICE '✅ Renamed calculated_fee to parking_fee';
    ELSE
        RAISE NOTICE '⚠️ parking_fee column already exists or calculated_fee not found';
    END IF;

    -- Rename payment_method to payment_type if needed
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'parking_entries' AND column_name = 'payment_method')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'parking_entries' AND column_name = 'payment_type') THEN
        ALTER TABLE parking_entries RENAME COLUMN payment_method TO payment_type;
        RAISE NOTICE '✅ Renamed payment_method to payment_type';
    ELSE
        RAISE NOTICE '⚠️ payment_type column already exists or payment_method not found';
    END IF;
END $$;

-- Add missing columns to users table
DO $$
BEGIN
    -- Add phone column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'users' AND column_name = 'phone') THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(20);
        RAISE NOTICE '✅ Added phone column to users';
    ELSE
        RAISE NOTICE '⚠️ phone column already exists in users';
    END IF;

    -- Add last_login column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'users' AND column_name = 'last_login') THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMPTZ;
        RAISE NOTICE '✅ Added last_login column to users';
    ELSE
        RAISE NOTICE '⚠️ last_login column already exists in users';
    END IF;
END $$;

-- Create or update the timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF TG_TABLE_NAME = 'parking_entries' AND NEW.last_modified IS NOT NULL THEN
        NEW.last_modified = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update triggers for parking_entries if the trigger exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.triggers
               WHERE trigger_name = 'update_parking_entries_updated_at') THEN
        DROP TRIGGER update_parking_entries_updated_at ON parking_entries;
    END IF;

    CREATE TRIGGER update_parking_entries_updated_at
        BEFORE UPDATE ON parking_entries
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    RAISE NOTICE '✅ Updated parking_entries timestamp trigger';
END $$;

-- Summary
DO $$
DECLARE
    driver_phone_exists BOOLEAN;
    serial_exists BOOLEAN;
    last_modified_exists BOOLEAN;
    parking_fee_exists BOOLEAN;
    payment_type_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'parking_entries' AND column_name = 'driver_phone')
    INTO driver_phone_exists;

    SELECT EXISTS(SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'parking_entries' AND column_name = 'serial')
    INTO serial_exists;

    SELECT EXISTS(SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'parking_entries' AND column_name = 'last_modified')
    INTO last_modified_exists;

    SELECT EXISTS(SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'parking_entries' AND column_name = 'parking_fee')
    INTO parking_fee_exists;

    SELECT EXISTS(SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'parking_entries' AND column_name = 'payment_type')
    INTO payment_type_exists;

    RAISE NOTICE '';
    RAISE NOTICE '🎉 COLUMN UPDATE COMPLETED!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Current Status:';
    RAISE NOTICE '   driver_phone: %', CASE WHEN driver_phone_exists THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   serial: %', CASE WHEN serial_exists THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   last_modified: %', CASE WHEN last_modified_exists THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   parking_fee: %', CASE WHEN parking_fee_exists THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   payment_type: %', CASE WHEN payment_type_exists THEN '✅' ELSE '❌' END;
    RAISE NOTICE '';

    IF driver_phone_exists AND serial_exists AND last_modified_exists
       AND parking_fee_exists AND payment_type_exists THEN
        RAISE NOTICE '🚀 All required columns are now present!';
        RAISE NOTICE '📝 You can now update your TypeScript types to match the database schema.';
        RAISE NOTICE '📖 See TYPESCRIPT-UPDATES.md for detailed instructions.';
    ELSE
        RAISE NOTICE '⚠️ Some columns may still be missing. Check the status above.';
    END IF;
    RAISE NOTICE '';
END $$;

COMMIT;