# Database RLS Fix Deployment Guide

## Problem Description

The application uses phone-based authentication without Supabase Auth, but RLS policies expect `auth.uid()` to exist. This causes UPDATE operations on the `users` table to fail with 400 Bad Request errors.

## Solution

Create `SECURITY DEFINER` PostgreSQL functions that bypass RLS for admin operations.

## Deployment Steps

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/jmckgqtjbezxhsqcfezu

2. Navigate to **SQL Editor** in the left sidebar

3. Create a new query and paste the contents of `database/fix-user-updates-rls.sql`

4. Click **Run** to execute the SQL

5. Verify functions were created:
   ```sql
   SELECT proname, prosrc
   FROM pg_proc
   WHERE proname IN ('approve_user_by_id', 'update_user_role_by_id', 'update_user_approval_status');
   ```

### Option 2: psql Command Line

```bash
# Set the database password
export PGPASSWORD='your-supabase-db-password'

# Run the SQL file
psql -h jmckgqtjbezxhsqcfezu.supabase.co \
     -p 5432 \
     -U postgres \
     -d postgres \
     -f database/fix-user-updates-rls.sql
```

### Option 3: Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref jmckgqtjbezxhsqcfezu

# Run the migration
supabase db push database/fix-user-updates-rls.sql
```

## Functions Created

### 1. `approve_user_by_id(target_user_id UUID)`
- **Purpose**: Approves a user by setting `is_approved = true`
- **Returns**: `JSONB { success: boolean, message: string }`
- **Security**: `SECURITY DEFINER` - bypasses RLS
- **Usage**:
  ```typescript
  const { data, error } = await supabase
    .rpc('approve_user_by_id', { target_user_id: userId })
  ```

### 2. `update_user_role_by_id(target_user_id UUID, new_role TEXT)`
- **Purpose**: Updates user role (admin | operator | viewer)
- **Returns**: `JSONB { success: boolean, message: string }`
- **Security**: `SECURITY DEFINER` - bypasses RLS
- **Validation**: Ensures role is one of: 'admin', 'operator', 'viewer'
- **Usage**:
  ```typescript
  const { data, error } = await supabase
    .rpc('update_user_role_by_id', {
      target_user_id: userId,
      new_role: 'admin'
    })
  ```

### 3. `update_user_approval_status(target_user_id UUID, approval_status BOOLEAN)`
- **Purpose**: Activates/deactivates user account
- **Returns**: `JSONB { success: boolean, message: string }`
- **Security**: `SECURITY DEFINER` - bypasses RLS
- **Usage**:
  ```typescript
  const { data, error } = await supabase
    .rpc('update_user_approval_status', {
      target_user_id: userId,
      approval_status: true
    })
  ```

## Code Changes

The following functions in `web-app/src/services/userService.ts` have been updated to use RPC:

1. `approveUser()` - Now calls `approve_user_by_id()`
2. `updateUserRole()` - Now calls `update_user_role_by_id()`
3. `updateUserStatus()` - Now calls `update_user_approval_status()`

## Verification

After deployment, test the functions:

```sql
-- Test approve_user_by_id
SELECT approve_user_by_id('14aa3d54-68b7-4011-b704-a71d5006d3a8');

-- Test update_user_role_by_id
SELECT update_user_role_by_id('14aa3d54-68b7-4011-b704-a71d5006d3a8', 'admin');

-- Test update_user_approval_status
SELECT update_user_approval_status('14aa3d54-68b7-4011-b704-a71d5006d3a8', true);
```

Expected response format:
```json
{
  "success": true,
  "message": "User approved successfully"
}
```

## Security Considerations

⚠️ **Important**: These functions use `SECURITY DEFINER` which bypasses RLS. They should only be called by authenticated admin users. Consider adding additional authorization checks in the application layer.

## Rollback

If you need to rollback, run:

```sql
DROP FUNCTION IF EXISTS approve_user_by_id(UUID);
DROP FUNCTION IF EXISTS update_user_role_by_id(UUID, TEXT);
DROP FUNCTION IF EXISTS update_user_approval_status(UUID, BOOLEAN);
```

Then revert `userService.ts` to use direct table updates (will still fail with RLS, but reverts the code changes).

## Next Steps

1. Deploy the SQL functions to Supabase
2. Restart the dev server (`npm run dev`)
3. Test user approval, role updates, and status changes
4. Monitor for any RLS-related errors
