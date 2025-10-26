-- ================================================
-- MIGRATION: Simplify Payment Types to Cash and Online
-- Created: 2024-12-26
-- Purpose: Consolidate payment types from multiple options to just Cash and Online
-- ================================================

BEGIN;

-- Step 1: Migrate existing payment data in parking_entries
-- Map all digital/card payments to 'Online'
UPDATE parking_entries
SET payment_type = 'Online'
WHERE payment_type IN ('Card', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking', 'Online');

-- Ensure Cash payments are properly labeled (handle nulls)
UPDATE parking_entries
SET payment_type = 'Cash'
WHERE payment_type = 'Cash' OR payment_type IS NULL;

-- Step 2: Update payments table if it exists (for shift management)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'payments'
    ) THEN
        -- Map all digital payment modes to 'online'
        UPDATE payments
        SET payment_mode = 'online'
        WHERE payment_mode IN ('digital', 'card', 'upi', 'online');

        -- Ensure cash payments are properly labeled
        UPDATE payments
        SET payment_mode = 'cash'
        WHERE payment_mode = 'cash';
    END IF;
END $$;

-- Step 3: Drop old constraint and add new simplified constraint for parking_entries
-- Note: Now includes 'Mixed' for multi-payment scenarios
ALTER TABLE parking_entries
DROP CONSTRAINT IF EXISTS parking_entries_payment_type_check;

ALTER TABLE parking_entries
ADD CONSTRAINT parking_entries_payment_type_check
CHECK (payment_type IN ('Cash', 'Online', 'Mixed'));

-- Step 4: Update payments table constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'payments'
    ) THEN
        ALTER TABLE payments
        DROP CONSTRAINT IF EXISTS payments_payment_mode_check;

        ALTER TABLE payments
        ADD CONSTRAINT payments_payment_mode_check
        CHECK (payment_mode IN ('cash', 'online'));
    END IF;
END $$;

-- Step 5: Add helpful comment
COMMENT ON COLUMN parking_entries.payment_type IS
'Simplified payment type: Cash (physical currency), Online (all digital payments including cards, UPI, net banking), or Mixed (combination of Cash and Online)';

COMMIT;

-- ================================================
-- VERIFICATION QUERIES (run these after migration)
-- ================================================
-- Check parking_entries payment types distribution:
-- SELECT payment_type, COUNT(*) as count
-- FROM parking_entries
-- WHERE payment_type IS NOT NULL
-- GROUP BY payment_type
-- ORDER BY payment_type;
--
-- Check payments table (if exists):
-- SELECT payment_mode, COUNT(*) as count
-- FROM payments
-- GROUP BY payment_mode
-- ORDER BY payment_mode;
-- ================================================
