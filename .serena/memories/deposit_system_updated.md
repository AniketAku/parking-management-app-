# Deposit System - Updated to Use Existing Users Table

## Date
2025-10-17

## Changes Made

### Issue Discovered
User reported that roles already exist in the app. Investigation revealed:
- App uses `users` table with `role` column (admin/operator/viewer)
- No separate `user_roles` table needed
- Role stored directly on users table with CHECK constraint

### Files Updated

#### 1. DepositsTab.tsx
**Change**: Updated role fetching to query `users` table instead of `user_roles`

**Before**:
```typescript
const { data, error } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .single()
```

**After**:
```typescript
const { data, error } = await supabase
  .from('users')
  .select('role')
  .eq('id', user.id)
  .single()
```

#### 2. shift_deposits.sql
**Change**: Updated ALL RLS policies to reference `users` table instead of `user_roles`

**Pattern Applied to All 8 Policies**:

**Before**:
```sql
EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = auth.uid()
  AND role = 'admin'
)
```

**After**:
```sql
EXISTS (
  SELECT 1 FROM users
  WHERE id = auth.uid()
  AND role = 'admin'
)
```

**Policies Updated**:
1. Admins can view all deposits (SELECT)
2. Operators can view today's deposits (SELECT)
3. Viewers can view today's deposits (SELECT)
4. Operators can create deposits (INSERT)
5. Admins can create deposits (INSERT)
6. Operators can update today's deposits (UPDATE)
7. Admins can update deposits (UPDATE)
8. Admins can delete deposits (DELETE)

#### 3. DEPOSIT_SYSTEM_DEPLOYMENT.md
**Change**: Updated deployment steps to reflect users table usage

**Before**: Step 1 was "Deploy user_roles Table" with separate table creation
**After**: Step 1 is "Verify User Roles" checking existing users table

**New Verification SQL**:
```sql
-- Check existing user roles
SELECT id, username, role, is_approved
FROM users
ORDER BY role;

-- Update user role if needed
UPDATE users
SET role = 'admin'  -- or 'operator' or 'viewer'
WHERE id = 'user-id-here';
```

#### 4. Removed File
**Deleted**: `/database/tables/user_roles.sql` (no longer needed)

## Existing Users Table Schema
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'operator' 
    CHECK (role IN ('admin', 'operator', 'viewer')),
  full_name VARCHAR(100),
  phone VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ
);
```

## Integration Points
- **useUserRole.ts**: Already uses localStorage for role (development mode)
- **UserService.ts**: Manages user creation with role assignment
- **Supabase Auth**: Uses `auth.uid()` which maps to users.id

## Deployment Status
- ✅ All code updated to use users table
- ✅ RLS policies updated correctly
- ✅ Documentation updated
- ✅ Unnecessary files removed
- ⏳ Ready for deployment (single file: shift_deposits.sql)

## Testing Checklist
- [ ] Deploy shift_deposits.sql to Supabase
- [ ] Verify users have correct roles (admin/operator/viewer)
- [ ] Test with admin role (see all deposits)
- [ ] Test with operator role (create deposits, see today only)
- [ ] Test with viewer role (read-only, today only)
- [ ] Verify RLS policies work correctly

## Key Implementation Details

### Role-Based Access Control
**Admin**:
- View ALL deposits (any date)
- Create deposits
- Update any deposit
- Delete deposits

**Operator**:
- View TODAY's deposits only
- Create deposits
- Update own deposits from today
- Cannot delete

**Viewer**:
- View TODAY's deposits only
- Read-only access
- Cannot create, update, or delete

### Authentication Flow
1. User logs in via custom auth (not Supabase Auth)
2. User ID stored in localStorage (secure-auth-storage)
3. DepositsTab fetches role from users table on mount
4. RLS policies use auth.uid() to check permissions
5. UI conditionally renders based on role
