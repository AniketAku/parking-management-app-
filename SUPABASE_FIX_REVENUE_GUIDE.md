# 🔧 Fix Revenue Showing Zero - Supabase Migration Guide

## Problem
Revenue is showing ₹0 because:
1. `shift_sessions` table is missing revenue columns
2. `parking_entries` aren't linked to shifts (no `shift_session_id`)
3. No automatic sync trigger exists

## Solution - Apply 2 Migrations in Order

### Step 1: Add Revenue Columns to shift_sessions

**Go to Supabase Dashboard → SQL Editor → New Query**

Copy and paste this entire migration:

```sql
-- =============================================================================
-- MIGRATION 007: ADD REVENUE COLUMNS TO SHIFT_SESSIONS
-- =============================================================================

-- Add revenue tracking columns to shift_sessions if they don't exist
DO $$
BEGIN
  -- Add total_revenue column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shift_sessions' AND column_name = 'total_revenue'
  ) THEN
    ALTER TABLE shift_sessions ADD COLUMN total_revenue NUMERIC(10,2) DEFAULT 0;
    RAISE NOTICE 'Added total_revenue column';
  END IF;

  -- Add cash_collected column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shift_sessions' AND column_name = 'cash_collected'
  ) THEN
    ALTER TABLE shift_sessions ADD COLUMN cash_collected NUMERIC(10,2) DEFAULT 0;
    RAISE NOTICE 'Added cash_collected column';
  END IF;

  -- Add digital_collected column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shift_sessions' AND column_name = 'digital_collected'
  ) THEN
    ALTER TABLE shift_sessions ADD COLUMN digital_collected NUMERIC(10,2) DEFAULT 0;
    RAISE NOTICE 'Added digital_collected column';
  END IF;

  -- Add vehicles_entered column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shift_sessions' AND column_name = 'vehicles_entered'
  ) THEN
    ALTER TABLE shift_sessions ADD COLUMN vehicles_entered INTEGER DEFAULT 0;
    RAISE NOTICE 'Added vehicles_entered column';
  END IF;

  -- Add vehicles_exited column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shift_sessions' AND column_name = 'vehicles_exited'
  ) THEN
    ALTER TABLE shift_sessions ADD COLUMN vehicles_exited INTEGER DEFAULT 0;
    RAISE NOTICE 'Added vehicles_exited column';
  END IF;

  -- Add currently_parked column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shift_sessions' AND column_name = 'currently_parked'
  ) THEN
    ALTER TABLE shift_sessions ADD COLUMN currently_parked INTEGER DEFAULT 0;
    RAISE NOTICE 'Added currently_parked column';
  END IF;
END $$;

SELECT 'Migration 007 completed - Revenue columns added' as status;
```

**Click "Run"** → Should see success message

---

### Step 2: Create Shift Linking and Statistics

**In the same SQL Editor, create a new query**

Copy and paste Migration 008 from the file:
`/database/migrations/008_fix_shift_management_complete.sql`

**Click "Run"** → Should see success message

---

## Step 3: Fix VehicleEntryForm to Link New Entries

The migration links EXISTING entries, but NEW entries also need to be linked.

I'll create a fix for the VehicleEntryForm next.

---

## Verification

After running both migrations, check in Supabase SQL Editor:

```sql
-- Check if columns exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'shift_sessions'
AND column_name IN ('total_revenue', 'vehicles_entered', 'vehicles_exited', 'currently_parked');

-- Check if view exists
SELECT viewname FROM pg_views WHERE viewname = 'shift_statistics';

-- Check if parking entries are linked
SELECT COUNT(*) as total_entries,
       COUNT(shift_session_id) as linked_entries
FROM parking_entries;

-- Check revenue
SELECT id, employee_name, total_revenue, vehicles_entered
FROM shift_sessions
WHERE status = 'active';
```

**Expected Results:**
- ✅ 4 columns found (total_revenue, vehicles_entered, vehicles_exited, currently_parked)
- ✅ shift_statistics view exists
- ✅ Parking entries have shift_session_id populated
- ✅ Revenue shows actual value (not 0)

---

## Quick Fix Commands

### If Migration Fails:
1. Check error message carefully
2. Make sure you're in the correct Supabase project
3. Try running migrations one at a time
4. Check if columns already exist before adding

### If Revenue Still Zero After Migration:
Run this to manually sync:
```sql
-- Get active shift ID
SELECT id FROM shift_sessions WHERE status = 'active' LIMIT 1;

-- Manually sync (replace 'shift-id-here' with actual ID)
SELECT sync_shift_statistics('shift-id-here');
```

---

## Next Steps After Migration

1. ✅ Revenue should show correctly
2. ✅ Refresh button will work
3. ⏳ Need to fix VehicleEntryForm (next task)
4. ⏳ Test creating new parking entries
