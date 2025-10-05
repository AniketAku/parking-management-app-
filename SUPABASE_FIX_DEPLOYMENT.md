# 🚨 URGENT: Deploy Database Fix to Supabase

## Problem
The RPC function `update_parking_entry_by_id` in Supabase references non-existent columns, causing entry updates to fail.

**Error**: `DatabaseError: column "duration_minutes" does not exist`

## Root Cause
The Supabase hosted database has an outdated RPC function that tries to update columns that don't exist in the `parking_entries` table:
- `duration_minutes` ❌
- `daily_rate` ❌
- `overstay_minutes` ❌
- `penalty_fee` ❌
- `total_amount` ❌
- `shift_session_id` ❌

## Solution: Deploy Fixed RPC Function to Supabase

### Option 1: Supabase Dashboard (Recommended - No CLI Required)

1. **Open Supabase Dashboard**:
   - Go to: https://supabase.com/dashboard/project/jmckgqtjbezxhsqcfezu
   - Navigate to **SQL Editor** (left sidebar)

2. **Run This SQL**:
   ```sql
   CREATE OR REPLACE FUNCTION update_parking_entry_by_id(
       target_entry_id UUID,
       entry_updates JSONB
   )
   RETURNS JSONB
   LANGUAGE plpgsql
   SECURITY DEFINER
   AS $$
   DECLARE
       result JSONB;
       updated_entry parking_entries;
   BEGIN
       -- ✅ ONLY using columns that exist in parking_entries table
       UPDATE parking_entries
       SET
           transport_name = COALESCE((entry_updates->>'transport_name')::TEXT, transport_name),
           vehicle_number = COALESCE((entry_updates->>'vehicle_number')::TEXT, vehicle_number),
           vehicle_type = COALESCE((entry_updates->>'vehicle_type')::TEXT, vehicle_type),
           driver_name = COALESCE((entry_updates->>'driver_name')::TEXT, driver_name),
           driver_phone = COALESCE((entry_updates->>'driver_phone')::TEXT, driver_phone),
           entry_time = COALESCE((entry_updates->>'entry_time')::TIMESTAMPTZ, entry_time),
           exit_time = COALESCE((entry_updates->>'exit_time')::TIMESTAMPTZ, exit_time),
           parking_fee = COALESCE((entry_updates->>'parking_fee')::NUMERIC, parking_fee),
           actual_fee = COALESCE((entry_updates->>'actual_fee')::NUMERIC, actual_fee),
           calculated_fee = COALESCE((entry_updates->>'calculated_fee')::NUMERIC, calculated_fee),
           amount_paid = COALESCE((entry_updates->>'amount_paid')::NUMERIC, amount_paid),
           payment_type = COALESCE((entry_updates->>'payment_type')::TEXT, payment_type),
           payment_status = COALESCE((entry_updates->>'payment_status')::TEXT, payment_status),
           status = COALESCE((entry_updates->>'status')::TEXT, status),
           notes = COALESCE((entry_updates->>'notes')::TEXT, notes),
           updated_at = NOW()
       WHERE id = target_entry_id
       RETURNING * INTO updated_entry;

       IF FOUND THEN
           result := jsonb_build_object(
               'success', true,
               'message', 'Parking entry updated successfully',
               'data', row_to_json(updated_entry)
           );
       ELSE
           result := jsonb_build_object(
               'success', false,
               'message', 'Parking entry not found',
               'data', null
           );
       END IF;

       RETURN result;
   END;
   $$;
   ```

3. **Click "Run"** to execute the SQL

4. **Verify Success**:
   - You should see: `Success. No rows returned`
   - This means the function was created/updated successfully

### Option 2: Using Supabase CLI (If Available)

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Link to your project
supabase link --project-ref jmckgqtjbezxhsqcfezu

# Deploy the migration
supabase db push
```

### Option 3: Direct Database Connection

If you have database credentials with write access:

```bash
# Get connection string from Supabase Dashboard > Settings > Database
# Then run:
psql "postgresql://postgres:[YOUR-PASSWORD]@db.jmckgqtjbezxhsqcfezu.supabase.co:5432/postgres" \
  -f database/fix-update-rpc-function.sql
```

## Verification Steps

After deploying, test the fix:

1. **Reload your web app** (hard refresh: Cmd+Shift+R or Ctrl+Shift+R)

2. **Test Entry Update**:
   - Go to Search page
   - Click Edit on any entry
   - Try to save changes
   - Should work without the `duration_minutes` error

3. **Test Entry Date Editing** (Admin only):
   - Switch to admin role: `localStorage.setItem('userRole', 'admin'); location.reload()`
   - Edit an entry's date/time
   - Save changes
   - Should recalculate fee and add audit note

## What This Fix Does

✅ **Removes non-existent columns** from UPDATE statement:
- Removed: duration_minutes, daily_rate, overstay_minutes, penalty_fee, total_amount, shift_session_id

✅ **Keeps only valid columns** that exist in parking_entries:
- transport_name, vehicle_number, driver_name, entry_time, exit_time
- parking_fee, actual_fee, calculated_fee, amount_paid
- payment_type, payment_status, status, notes
- driver_phone, updated_at

✅ **Preserves SECURITY DEFINER** to bypass Row Level Security (RLS)

✅ **Returns JSONB response** with success status and data

## Quick Deploy Checklist

- [ ] Open Supabase Dashboard SQL Editor
- [ ] Copy the SQL from Option 1 above
- [ ] Click "Run"
- [ ] Verify "Success. No rows returned" message
- [ ] Hard refresh web app (Cmd+Shift+R)
- [ ] Test entry editing functionality
- [ ] Verify no more `duration_minutes` errors

## Need Help?

If you encounter issues:
1. Check Supabase Dashboard > Logs for errors
2. Verify you're logged into the correct project (jmckgqtjbezxhsqcfezu)
3. Ensure you have admin/owner permissions on the Supabase project
4. Try the SQL Editor in "Run" mode (not "Explain")

---

**Status**: ⏳ Waiting for deployment to Supabase cloud database
**Expected Result**: Entry editing will work without column errors
**Time Required**: ~2 minutes to deploy via Dashboard
