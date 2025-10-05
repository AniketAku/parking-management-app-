# Parking Entries 400 Error Fix

## Error Analysis

**Error**:
```
PATCH https://jmckgqtjbezxhsqcfezu.supabase.co/rest/v1/parking_entries?id=eq.d3f1f61c-be49-48c4-8048-37dffb8be1a0&select=* 400 (Bad Request)
```

**Root Cause**:
Same as the `users` table issue - RLS policies require `auth.uid()` but phone-based authentication means `auth.uid()` is NULL, causing all UPDATE operations to fail.

**Affected Operation**:
- `updateEntry()` in [parkingService.ts:178-232](web-app/src/services/parkingService.ts#L178-232)

## Solution Implemented

Created a `SECURITY DEFINER` PostgreSQL function that bypasses RLS for parking entry updates.

### Files Created/Modified

1. **[database/fix-parking-entries-rls.sql](database/fix-parking-entries-rls.sql)** - SQL migration with new function
2. **[web-app/src/services/parkingService.ts](web-app/src/services/parkingService.ts)** - Updated to use RPC

### New Database Function

| Function | Purpose | Parameters | Returns |
|----------|---------|------------|---------|
| `update_parking_entry_by_id()` | Update parking entry | `target_entry_id: UUID, entry_updates: JSONB` | `JSONB {success, message, data}` |

### Code Changes

**Before** (Direct UPDATE - fails with RLS):
```typescript
const { data, error } = await supabase
  .from('parking_entries')
  .update(safeUpdateData)
  .eq('id', id)
  .select()
  .single()
```

**After** (RPC call - bypasses RLS):
```typescript
const { data, error } = await supabase
  .rpc('update_parking_entry_by_id', {
    target_entry_id: id,
    entry_updates: updateData
  })
```

## Deployment Instructions

### Step 1: Deploy SQL Function

**Copy and paste** the contents of `database/fix-parking-entries-rls.sql` into Supabase SQL Editor:

1. Go to: https://supabase.com/dashboard/project/jmckgqtjbezxhsqcfezu/sql/new
2. Paste the SQL from `database/fix-parking-entries-rls.sql`
3. Click **Run**

### Step 2: Verify Deployment

```sql
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'update_parking_entry_by_id';
```

Should return 1 row showing the function exists.

### Step 3: Test the Fix

The dev server is already running with updated code. Once you deploy the SQL:

1. Navigate to the parking entry page
2. Try to update a parking entry (exit time, status, payment, etc.)
3. Should succeed without 400 error

## Function Details

The `update_parking_entry_by_id()` function accepts JSONB for flexible updates:

```sql
CREATE OR REPLACE FUNCTION update_parking_entry_by_id(
    target_entry_id UUID,
    entry_updates JSONB
)
```

**Supported Fields**:
- vehicle_number, vehicle_type, driver_name, driver_phone
- entry_time, exit_time, status, notes
- parking_fee, payment_type, total_amount
- duration_minutes, daily_rate
- overstay_minutes, penalty_fee
- shift_session_id

The function uses `COALESCE` to only update fields provided in the JSONB object.

## Security Notes

⚠️ **Important**: This function uses `SECURITY DEFINER` which bypasses RLS. Ensure only authenticated admin/operator users can update parking entries through application logic.

## Status

- ✅ Root cause identified (same RLS issue as users table)
- ✅ SQL function created
- ✅ Code updated to use RPC
- ⏳ **Pending**: Deploy SQL to Supabase database
- ⏳ **Pending**: Test parking entry updates in web app

## Related Fixes

- [SUPABASE_400_ERROR_FIX.md](SUPABASE_400_ERROR_FIX.md) - Users table RLS fix (same pattern)
