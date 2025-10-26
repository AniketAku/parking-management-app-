# 🚀 Supabase Migration Guide - Fix Shift Management

## Critical Database Changes Required

Your shift management system is broken because of database schema mismatches. You need to apply the migration to your Supabase database.

## 📋 Migration Files Created

1. **`database/migrations/007_fix_shift_management_schema.sql`** - Initial migration (has issues, skip this)
2. **`database/migrations/008_fix_shift_management_complete.sql`** - ✅ **USE THIS ONE**

## 🎯 How to Apply Migration to Supabase

### Option 1: Supabase SQL Editor (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project: "Parking App"

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy Migration SQL**
   - Open file: `database/migrations/008_fix_shift_management_complete.sql`
   - Copy the entire contents

4. **Paste and Run**
   - Paste the SQL into the SQL Editor
   - Click "Run" button
   - Wait for confirmation message

5. **Verify Success**
   - You should see: "Migration 008 completed successfully"
   - Check notices for: "Added shift_session_id column", "shift_statistics view: Created ✓"

### Option 2: Supabase CLI (Alternative)

```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Run migration
supabase db push
```

## 📊 What This Migration Does

### 1. Adds Missing Columns to `shift_sessions`
- `shift_session_id` - Links parking entries to shifts
- `payment_mode` - Tracks cash vs digital payments
- `employee_name`, `employee_id` - Employee tracking
- `shift_start_time`, `shift_end_time` - Proper time tracking
- `total_revenue`, `vehicles_entered`, `vehicles_exited`, `currently_parked` - Statistics

### 2. Creates `shift_statistics` View
Real-time statistics view that calculates:
- Actual revenue from parking_entries
- Vehicle counts (entered, exited, currently parked)
- Cash vs digital revenue breakdown

### 3. Creates `sync_shift_statistics()` Function
- Syncs shift statistics from parking_entries
- Calculates revenue accurately
- Updates shift_sessions table

### 4. Creates Auto-Sync Trigger
- Automatically updates shift statistics when parking entries change
- Ensures real-time accuracy

### 5. Creates `shift_report_history` Table
- Tracks report generation with 1-second precision
- Logs which employee generated which report
- Enables employee activity tracking

### 6. Links Existing Data
- Automatically links today's parking entries to active shift
- Syncs statistics for active shifts

## 🔍 Verification Steps

After running the migration, verify:

```sql
-- 1. Check new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'shift_sessions'
ORDER BY ordinal_position;

-- 2. Check shift_statistics view
SELECT * FROM shift_statistics LIMIT 1;

-- 3. Check parking_entries has shift_session_id
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'parking_entries'
  AND column_name = 'shift_session_id';

-- 4. Check shift_report_history table
SELECT * FROM shift_report_history LIMIT 1;

-- 5. Test sync function
SELECT sync_shift_statistics('<active-shift-id>');
```

## ⚠️ Important Notes

1. **Backup First**: Supabase automatically creates backups, but verify your backup settings
2. **No Data Loss**: This migration only adds columns and views, doesn't delete anything
3. **Existing Data**: Old columns (start_time, operator_name) remain unchanged
4. **New Columns**: New columns are populated from existing data where possible

## 🐛 If Migration Fails

### Error: "column already exists"
- Safe to ignore - column was already added
- Continue with next steps

### Error: "view already exists"
- Drop the view first:
  ```sql
  DROP VIEW IF EXISTS shift_statistics CASCADE;
  ```
- Re-run the migration

### Error: "function already exists"
- Replace the function:
  ```sql
  CREATE OR REPLACE FUNCTION sync_shift_statistics...
  ```

## 📝 After Migration - Testing

1. **Refresh Shift Management Page**
   - Go to Shift Management in your app
   - Revenue should now show correct values (not 0)
   - Refresh button should work
   - Quick action buttons will be functional after code update

2. **Check Console Logs**
   - Open browser DevTools
   - Look for: "📊 SHIFT OVERVIEW - Shift stats from view:"
   - Should show actual revenue values

3. **Test Report Generation**
   - Go to Reports tab in Shift Management
   - Generate a report
   - Check `shift_report_history` table for timestamp

## 🚦 Next Steps After Migration

The migration fixes the database. You still need to:

1. ✅ **Database Schema** - DONE (after you run migration)
2. ⏳ **Fix Refresh Button** - Code change needed
3. ⏳ **Fix Quick Action Buttons** - Code change needed
4. ⏳ **Replace Duplicate Report Service** - Code change needed
5. ⏳ **Add Expense Logging** - Future feature

## 📞 Support

If you encounter issues:
1. Check Supabase logs in dashboard
2. Verify your project has proper permissions
3. Ensure you're connected to the right project
4. Contact if migration errors persist
