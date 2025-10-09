# Deploy Public Registration RLS Fix

## Issue
Public user registration fails with RLS policy error:
```
Failed to create user profile: new row violates row-level security policy for table 'users'
```

## Solution
Created RPC function `register_public_user()` with SECURITY DEFINER to bypass RLS for public registration.

## Deployment Steps

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the contents of `/database/functions/register_public_user.sql`
5. Paste and run the SQL
6. Verify success message

### Option 2: Via psql Command Line
```bash
# From project root
psql -h <YOUR_SUPABASE_HOST> \
     -p 5432 \
     -U postgres \
     -d postgres \
     -f database/functions/register_public_user.sql
```

### Option 3: Using Supabase CLI
```bash
# From project root
supabase db push --include-functions
```

## Verification

### 1. Check Function Exists
Run in SQL Editor:
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'register_public_user';
```

Expected: Should return 1 row showing the function.

### 2. Test Registration
Try registering a new user from the web app:
1. Go to login page
2. Click "Create one here"
3. Fill in registration form
4. Submit

Expected: Success message "Account created successfully! Please wait for admin approval before logging in."

### 3. Verify User Created
Run in SQL Editor:
```sql
SELECT username, phone, role, is_approved, created_at
FROM users
WHERE username = '<test_username>'
ORDER BY created_at DESC
LIMIT 1;
```

Expected: User exists with `is_approved = false`.

## What Changed

### Backend Changes
1. **New RPC Function**: `register_public_user()` (see `/database/functions/register_public_user.sql`)
   - Validates required fields
   - Checks for duplicate username/phone
   - Creates user with SECURITY DEFINER (bypasses RLS)
   - Returns JSON response with success/error

2. **UserService Update**: Modified `registerUser()` method
   - Removed direct INSERT into users table
   - Now calls `register_public_user()` RPC function
   - Simplified error handling

### Security Considerations
- Function has SECURITY DEFINER (runs with owner privileges)
- Validates all inputs before insertion
- Checks for duplicates (username and phone)
- Sets safe defaults (role='operator', is_approved=false)
- Grants execute to `anon` (unauthenticated users) and `authenticated` users

## Rollback (If Needed)

If issues occur, remove the function:
```sql
DROP FUNCTION IF EXISTS register_public_user(TEXT, TEXT, TEXT, TEXT);
```

Then revert UserService changes using git:
```bash
git checkout HEAD -- web-app/src/services/userService.ts
```

## Files Modified
- ✅ `/database/functions/register_public_user.sql` (new)
- ✅ `/web-app/src/services/userService.ts` (updated)
- ✅ `/database/DEPLOY_REGISTRATION_FIX.md` (this file)

## Next Steps
1. Deploy the RPC function to Supabase
2. Test user registration flow
3. Verify admin approval workflow
4. Monitor for any errors in production
