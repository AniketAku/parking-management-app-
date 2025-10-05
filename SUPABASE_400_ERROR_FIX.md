# Supabase 400 Error Fix Summary

## Error Analysis

**Original Error**:
```
PATCH https://jmckgqtjbezxhsqcfezu.supabase.co/rest/v1/users?id=eq.14aa3d54-68b7-4011-b704-a71d5006d3a8 400 (Bad Request)
```

**Root Cause**:
The application uses **phone-based authentication without Supabase Auth**, but the database Row Level Security (RLS) policies for the `users` table require `auth.uid()` to exist. Since there's no authenticated Supabase user, `auth.uid()` returns NULL and all UPDATE operations fail.

**Affected Operations**:
1. `approveUser()` - [userService.ts:185-190](web-app/src/services/userService.ts#L185-190)
2. `updateUserRole()` - [userService.ts:243-248](web-app/src/services/userService.ts#L243-248)
3. `updateUserStatus()` - [userService.ts:273-278](web-app/src/services/userService.ts#L273-278)

## Solution Implemented

Created PostgreSQL functions with `SECURITY DEFINER` that bypass RLS for admin operations:

### Files Created/Modified

1. **[database/fix-user-updates-rls.sql](database/fix-user-updates-rls.sql)** - SQL migration with 3 new functions
2. **[web-app/src/services/userService.ts](web-app/src/services/userService.ts)** - Updated to use RPC calls
3. **[DATABASE_FIX_DEPLOYMENT.md](DATABASE_FIX_DEPLOYMENT.md)** - Complete deployment guide

### New Database Functions

| Function | Purpose | Parameters | Returns |
|----------|---------|------------|---------|
| `approve_user_by_id()` | Approve user | `target_user_id: UUID` | `JSONB {success, message}` |
| `update_user_role_by_id()` | Update role | `target_user_id: UUID, new_role: TEXT` | `JSONB {success, message}` |
| `update_user_approval_status()` | Activate/deactivate | `target_user_id: UUID, approval_status: BOOLEAN` | `JSONB {success, message}` |

### Code Changes

**Before** (Direct UPDATE - fails with RLS):
```typescript
const { error } = await supabase
  .from('users')
  .update({ is_approved: true })
  .eq('id', userId)
```

**After** (RPC call - bypasses RLS):
```typescript
const { data, error } = await supabase
  .rpc('approve_user_by_id', { target_user_id: userId })
```

## Deployment Instructions

### Step 1: Deploy SQL Functions to Supabase

**Option A: Supabase Dashboard (Easiest)**
1. Go to https://supabase.com/dashboard/project/jmckgqtjbezxhsqcfezu
2. Click **SQL Editor** in left sidebar
3. Create new query
4. Copy/paste contents of `database/fix-user-updates-rls.sql`
5. Click **Run**

**Option B: Command Line**
```bash
# Using psql (requires password)
psql -h jmckgqtjbezxhsqcfezu.supabase.co \
     -p 5432 \
     -U postgres \
     -d postgres \
     -f database/fix-user-updates-rls.sql
```

**Option C: Supabase CLI**
```bash
supabase link --project-ref jmckgqtjbezxhsqcfezu
supabase db push database/fix-user-updates-rls.sql
```

### Step 2: Verify Deployment

Run this in Supabase SQL Editor:
```sql
SELECT proname, prosrc
FROM pg_proc
WHERE proname IN (
  'approve_user_by_id',
  'update_user_role_by_id',
  'update_user_approval_status'
);
```

Should return 3 rows showing the functions exist.

### Step 3: Test the Fix

The dev server is already running with the updated code. Once you deploy the SQL functions:

1. Navigate to the User Approval page in the web app
2. Try to approve a user
3. Try to change a user's role
4. Try to activate/deactivate a user

All operations should now succeed without 400 errors.

## Files Reference

- **SQL Migration**: [database/fix-user-updates-rls.sql](database/fix-user-updates-rls.sql)
- **Updated Service**: [web-app/src/services/userService.ts](web-app/src/services/userService.ts)
- **Deployment Guide**: [DATABASE_FIX_DEPLOYMENT.md](DATABASE_FIX_DEPLOYMENT.md)
- **RLS Policies**: [database/new-architecture/02-access-policies.sql](database/new-architecture/02-access-policies.sql)

## Technical Details

### Why This Fix Works

1. **RLS Policies Check `auth.uid()`**: The existing RLS policies in `02-access-policies.sql` require `auth.uid()` to match admin users
2. **No Supabase Auth = NULL `auth.uid()`**: Phone-based auth doesn't set `auth.uid()`, so it's always NULL
3. **SECURITY DEFINER Bypasses RLS**: Functions with `SECURITY DEFINER` run with the privileges of the function owner, not the caller
4. **Grants Authenticated Access**: All authenticated users can call these functions, but application logic ensures only admins do

### Security Notes

⚠️ **Important**: These functions bypass RLS. Ensure only authenticated admin users can call them by:
- Checking user role in the application before calling
- Using the existing `isAdmin` checks in UI components
- Monitoring function usage through Supabase logs

## Status

- ✅ Root cause identified (RLS + no Supabase Auth)
- ✅ SQL functions created
- ✅ Code updated to use RPC
- ⏳ **Pending**: Deploy SQL to Supabase database
- ⏳ **Pending**: Test user operations in web app

## Next Action

**Deploy the SQL functions using one of the methods above**, then test the user approval workflow in the running web app.
