# URGENT: Shift Management Schema Deployment Required

## Critical Issue

**Error**: `PGRST204 - Could not find the 'closing_cash_amount' column of 'shift_sessions' in the schema cache`

**Root Cause**: The shift management schema migration has NOT been deployed to Supabase yet. The code is using the correct column names from the migration file, but the actual database table still has different columns.

## Current Status

### ✅ What's Been Fixed (Code Side)
- ShiftOverviewTab.tsx - Using correct column names
- ShiftOperationsTab.tsx - Using correct column names
- ShiftReportService.ts - Using correct column names
- ShiftHistoryTab.tsx - Using correct column names

### ❌ What's Missing (Database Side)
- Shift management migration NOT deployed to Supabase
- Database still has old/different column structure
- Schema cache doesn't know about new columns

## Required Deployment

### File to Deploy
**Location**: `database/migrations/001_create_shift_management_schema.sql`

**What it creates**:
```sql
CREATE TABLE shift_sessions (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL,
  employee_name VARCHAR(255) NOT NULL,
  employee_phone VARCHAR(20),
  shift_start_time TIMESTAMPTZ NOT NULL,
  shift_end_time TIMESTAMPTZ NULL,
  status shift_status_enum,
  opening_cash_amount DECIMAL(10,2),
  closing_cash_amount DECIMAL(10,2),
  shift_notes TEXT,
  ...
)
```

### Deployment Steps

1. **Open Supabase SQL Editor**
   - Go to https://supabase.com/dashboard/project/jmckgqtjbezxhsqcfezu/sql/new
   - Or navigate to: Project → SQL Editor → New Query

2. **Copy Migration SQL**
   - Open `database/migrations/001_create_shift_management_schema.sql`
   - Copy the ENTIRE file contents

3. **Execute in Supabase**
   - Paste into SQL Editor
   - Click "Run" button
   - Wait for success confirmation

4. **Verify Deployment**
   ```sql
   -- Run this query to check the schema:
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'shift_sessions'
   ORDER BY ordinal_position;
   ```

   Expected columns:
   - employee_id
   - employee_name
   - shift_start_time
   - shift_end_time
   - opening_cash_amount
   - closing_cash_amount
   - shift_notes

5. **Refresh Schema Cache**
   - After deployment, Supabase automatically updates the schema cache
   - May take 30-60 seconds to propagate
   - Test by trying a shift operation again

## Additional Deployments Needed

### 1. Parking Entries RLS Fix
**File**: `database/fix-parking-entries-rls.sql`
**Purpose**: Fix 400 Bad Request errors when updating parking entries
**Status**: Not deployed yet

### 2. Other Supporting Files
Check if these need deployment:
- `database/migrations/002_setup_realtime_integration.sql`
- `database/migrations/003_setup_row_level_security.sql`
- `database/functions/shift_linking_functions.sql`

## Testing After Deployment

1. **Start New Shift**
   - Go to Shift Management → Operations
   - Click "Start New Shift"
   - Enter operator name and opening cash
   - Verify it creates successfully

2. **End Shift**
   - With active shift, click "End Current Shift"
   - Enter ending cash
   - Verify UPDATE works without errors

3. **Handover**
   - With active shift, click "Handover"
   - Enter new operator details
   - Verify handover completes

4. **View History**
   - Go to Shift Management → History
   - Verify employee names display correctly
   - Test filtering and sorting

5. **Generate Reports**
   - Go to Shift Management → Reports
   - Select date range
   - Generate PDF/Excel report
   - Verify employee names appear

## Demo Mode Issue

The demo mode mock in `web-app/src/lib/supabase.ts` also needs updating (lines 220-236):

```typescript
// Current (wrong):
const mockShiftData = [{
  user_id: 'demo-user-001',
  start_time: new Date().toISOString(),
  cash_collected: 0,
  digital_collected: 0,
  // ...
}]

// Should be (correct):
const mockShiftData = [{
  employee_id: 'demo-user-001',
  employee_name: 'Demo Operator',
  shift_start_time: new Date().toISOString(),
  shift_end_time: null,
  opening_cash_amount: 0,
  closing_cash_amount: null,
  shift_notes: null,
  // ...
}]
```

## Priority Order

1. **CRITICAL** ⚠️ Deploy shift management migration (001_create_shift_management_schema.sql)
2. **HIGH** Deploy parking entries RLS fix (fix-parking-entries-rls.sql)
3. **MEDIUM** Deploy supporting migrations (002, 003, functions)
4. **LOW** Fix demo mode mock data

## Quick Fix (Temporary)

If you can't deploy immediately, you can temporarily revert the code to use old column names, but this is NOT recommended. The proper fix is to deploy the migration.

## Verification Commands

After deployment, run in Supabase SQL Editor:

```sql
-- 1. Check shift_sessions table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'shift_sessions'
);

-- 2. List all columns
\d shift_sessions

-- 3. Check for specific columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'shift_sessions'
  AND column_name IN ('closing_cash_amount', 'shift_start_time', 'employee_name');

-- 4. Test insert
INSERT INTO shift_sessions (
  employee_id,
  employee_name,
  shift_start_time,
  opening_cash_amount,
  status
) VALUES (
  gen_random_uuid(),
  'Test Operator',
  NOW(),
  1000,
  'active'
) RETURNING id;
```

## Expected Result

After successful deployment:
- ✅ No more PGRST204 errors
- ✅ Shift operations work correctly
- ✅ Employee names display properly
- ✅ Cash amounts show correctly
- ✅ Reports generate successfully
