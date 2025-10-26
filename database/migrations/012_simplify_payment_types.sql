-- ================================================
-- MIGRATION: Simplify Payment Types to Cash and Online
-- ================================================
-- Purpose: Consolidate payment types from (Cash, Card, Credit Card, Debit Card, UPI, Net Banking, Online)
--          to just (Cash, Online)
-- ================================================

-- Step 1: Migrate existing payment data to new simplified types
-- Map all digital/card payments to 'Online'
UPDATE parking_entries
SET payment_type = 'Online'
WHERE payment_type IN ('Card', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking', 'Online');

-- Ensure Cash payments are properly labeled
UPDATE parking_entries
SET payment_type = 'Cash'
WHERE payment_type = 'Cash' OR payment_type IS NULL;

-- Step 2: Update payments table if it exists (for shift management)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
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

-- Step 3: Drop old constraint if exists and add new simplified constraint
ALTER TABLE parking_entries
DROP CONSTRAINT IF EXISTS parking_entries_payment_type_check;

ALTER TABLE parking_entries
ADD CONSTRAINT parking_entries_payment_type_check
CHECK (payment_type IN ('Cash', 'Online'));

-- Step 4: Update payments table constraint if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        ALTER TABLE payments
        DROP CONSTRAINT IF EXISTS payments_payment_mode_check;

        ALTER TABLE payments
        ADD CONSTRAINT payments_payment_mode_check
        CHECK (payment_mode IN ('cash', 'online'));
    END IF;
END $$;

-- Step 5: Add comment for documentation
COMMENT ON COLUMN parking_entries.payment_type IS 'Simplified payment type: Cash or Online';

-- Step 6: Update any existing views or functions that reference payment types
-- (Add specific view/function updates here if needed)

-- ================================================
-- VERIFICATION QUERIES
-- ================================================
-- Run these to verify the migration:
--
-- Check parking_entries payment types:
-- SELECT payment_type, COUNT(*) FROM parking_entries GROUP BY payment_type;
--
-- Check payments table (if exists):
-- SELECT payment_mode, COUNT(*) FROM payments GROUP BY payment_mode;
-- ================================================
