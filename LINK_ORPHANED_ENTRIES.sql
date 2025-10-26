-- ============================================================================
-- LINK ORPHANED PARKING ENTRIES TO ACTIVE SHIFT
-- ============================================================================
-- Purpose: Links all parking entries that don't have a shift_session_id
--          to the current active shift session
-- Date: 2025-10-11
-- ============================================================================

-- Step 1: Show current state (verification before)
SELECT
  'BEFORE UPDATE' as status,
  COUNT(*) as orphaned_entries,
  SUM(CASE WHEN parking_fee > 0 THEN parking_fee ELSE 0 END) as total_orphaned_revenue
FROM parking_entries
WHERE shift_session_id IS NULL
  AND status = 'Exited'
  AND payment_status IN ('Paid', 'paid');

-- Step 2: Show the active shift
SELECT
  'ACTIVE SHIFT' as info,
  id as shift_id,
  shift_start_time,
  opening_cash,
  status
FROM shift_sessions
WHERE status = 'active'
ORDER BY shift_start_time DESC
LIMIT 1;

-- Step 3: Update orphaned entries with active shift link
-- This also adds payment_mode for database trigger
UPDATE parking_entries
SET
  shift_session_id = (
    SELECT id
    FROM shift_sessions
    WHERE status = 'active'
    ORDER BY shift_start_time DESC
    LIMIT 1
  ),
  payment_mode = CASE
    WHEN LOWER(payment_type) = 'cash' THEN 'cash'
    ELSE 'digital'
  END,
  updated_at = NOW()
WHERE shift_session_id IS NULL
  AND status = 'Exited'
  AND payment_status = 'Paid'  -- Keep capitalized per CHECK constraint
  AND EXISTS (
    SELECT 1
    FROM shift_sessions
    WHERE status = 'active'
  );

-- Step 4: Show results after update (verification after)
SELECT
  'AFTER UPDATE' as status,
  COUNT(*) as still_orphaned,
  COUNT(CASE WHEN shift_session_id IS NOT NULL THEN 1 END) as linked_entries
FROM parking_entries
WHERE status = 'Exited'
  AND payment_status IN ('Paid', 'paid');

-- Step 5: Show updated shift statistics
SELECT
  'UPDATED STATISTICS' as info,
  ss.id as shift_id,
  ss.opening_cash,
  COUNT(pe.id) as total_vehicles,
  SUM(CASE WHEN pe.payment_status = 'paid' THEN pe.parking_fee ELSE 0 END) as total_revenue,
  SUM(CASE WHEN pe.payment_mode = 'cash' THEN pe.parking_fee ELSE 0 END) as cash_revenue,
  SUM(CASE WHEN pe.payment_mode = 'digital' THEN pe.parking_fee ELSE 0 END) as digital_revenue
FROM shift_sessions ss
LEFT JOIN parking_entries pe ON pe.shift_session_id = ss.id
WHERE ss.status = 'active'
GROUP BY ss.id, ss.opening_cash;

-- ============================================================================
-- EXPECTED RESULTS:
-- - BEFORE: 2 orphaned entries with ₹2,700 total revenue
-- - AFTER: 0 orphaned entries, all linked to active shift
-- - STATISTICS: Should show ₹2,700 revenue in shift statistics view
-- ============================================================================
