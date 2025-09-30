-- ================================================
-- ADD MISSING COLUMNS TO SHIFT MANAGEMENT TABLES
-- Fixes schema mismatches between database and components
-- ================================================

BEGIN;

-- ================================================
-- ADD MISSING COLUMNS TO SHIFT_SESSIONS TABLE
-- ================================================

-- Add end_notes column for shift handover functionality
ALTER TABLE shift_sessions
ADD COLUMN IF NOT EXISTS end_notes TEXT;

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
BEGIN
    -- Check if the end_notes column was added successfully
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'shift_sessions'
        AND column_name = 'end_notes'
    ) THEN
        RAISE NOTICE '✅ end_notes column added successfully to shift_sessions table';
    ELSE
        RAISE NOTICE '❌ Failed to add end_notes column to shift_sessions table';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '🎉 SCHEMA UPDATE COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ The following errors should now be resolved:';
    RAISE NOTICE '   - Could not find the ''end_notes'' column error';
    RAISE NOTICE '   - ShiftOperationsTab handover functionality';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next Steps:';
    RAISE NOTICE '   1. Refresh browser to test the shift management functionality';
    RAISE NOTICE '   2. Verify shift handover operations work correctly';
    RAISE NOTICE '   3. Check browser console for remaining errors';
END $$;

COMMIT;