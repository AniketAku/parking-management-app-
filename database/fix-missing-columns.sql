-- FIX: Add missing columns to parking_entries table
-- Run this in Supabase SQL Editor to add missing exit/payment columns

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add actual_fee column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'parking_entries' AND column_name = 'actual_fee'
    ) THEN
        ALTER TABLE parking_entries ADD COLUMN actual_fee DECIMAL(10,2);
        RAISE NOTICE '✅ Added actual_fee column';
    ELSE
        RAISE NOTICE 'ℹ️ actual_fee column already exists';
    END IF;

    -- Add payment_method column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'parking_entries' AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE parking_entries ADD COLUMN payment_method VARCHAR(50);
        RAISE NOTICE '✅ Added payment_method column';
    ELSE
        RAISE NOTICE 'ℹ️ payment_method column already exists';
    END IF;

    -- Add calculated_fee column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'parking_entries' AND column_name = 'calculated_fee'
    ) THEN
        ALTER TABLE parking_entries ADD COLUMN calculated_fee DECIMAL(10,2);
        RAISE NOTICE '✅ Added calculated_fee column';
    ELSE
        RAISE NOTICE 'ℹ️ calculated_fee column already exists';
    END IF;

    -- Add driver_phone column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'parking_entries' AND column_name = 'driver_phone'
    ) THEN
        ALTER TABLE parking_entries ADD COLUMN driver_phone VARCHAR(20);
        RAISE NOTICE '✅ Added driver_phone column';
    ELSE
        RAISE NOTICE 'ℹ️ driver_phone column already exists';
    END IF;

    -- Update status values from 'Parked' to 'Active' if needed
    UPDATE parking_entries SET status = 'Active' WHERE status = 'Parked';

    -- Get the count of updated records
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
        RAISE NOTICE '✅ Updated % records from "Parked" to "Active" status', updated_count;
    ELSE
        RAISE NOTICE 'ℹ️ No status updates needed';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error: %', SQLERRM;
END $$;

-- Verify the columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'parking_entries'
AND column_name IN ('actual_fee', 'payment_method', 'calculated_fee', 'driver_phone')
ORDER BY column_name;

-- Show current parking entries with status
SELECT
    vehicle_number,
    status,
    payment_status,
    entry_time,
    CASE
        WHEN actual_fee IS NULL THEN 'NULL'
        ELSE actual_fee::TEXT
    END as actual_fee_status
FROM parking_entries
ORDER BY entry_time DESC
LIMIT 5;