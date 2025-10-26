# Authentication System Fix - Deployment Guide

## Problem Summary

The application uses **custom phone-based authentication** with integer IDs, but some components were trying to use Supabase Auth patterns (UUID-based). This caused:

- ❌ 406 (Not Acceptable) errors when querying users table
- ❌ RLS policies blocking session validation
- ❌ Deposit form not displaying due to authentication failures

## Solution Overview

✅ **Created proper RLS policies** for custom authentication system
✅ **Created secure view** (`users_public`) that excludes `password_hash`
✅ **Updated validation** to use secure view
✅ **Fixed DepositsTab** to read role directly from user object

## Deployment Steps

### Step 1: Deploy RLS Migration to Supabase

```bash
# Navigate to the migration file
cd /Users/aniketawchat/Downloads/Parking\ App\ 2

# Copy the migration SQL
cat database/migrations/009_fix_custom_auth_rls.sql
```

Then in **Supabase Dashboard**:

1. Go to **SQL Editor**
2. Create new query
3. Paste the contents of `009_fix_custom_auth_rls.sql`
4. Click **Run**
5. Verify success message appears

### Step 2: Verify RLS Policies

In Supabase Dashboard → **Authentication** → **Policies**:

You should see these policies on the `users` table:
- ✅ Allow read access for authentication
- ✅ Service role can insert users
- ✅ Service role can update users
- ✅ Service role can delete users

### Step 3: Verify Secure View

In Supabase Dashboard → **Database** → **Views**:

You should see:
- ✅ `users_public` view (excludes password_hash)

### Step 4: Test Authentication

1. **Clear browser storage**: `localStorage.clear()` in browser console
2. **Refresh the page**
3. **Login** with your credentials
4. **Navigate to Deposits tab**
5. **Verify** the "Record New Deposit" form appears

## What Changed

### Files Modified

1. **`database/migrations/009_fix_custom_auth_rls.sql`** (NEW)
   - Proper RLS policies for custom authentication
   - Secure view that excludes password_hash

2. **`web-app/src/services/secureAuthService.ts`**
   - Changed from `users` table to `users_public` view
   - Lines 259, 282: Now queries secure view

3. **`web-app/src/components/shift/DepositsTab.tsx`**
   - Reads role directly from user object
   - Removed failed database query attempt
   - Lines 63-82: Simplified role fetching

## Architecture Details

### Custom Authentication Flow

```
User Login
  ↓
RPC: verify_user_password (server-side)
  ↓
Generate Custom JWT Tokens
  ↓
Store in Zustand + LocalStorage
  ↓
Session Validation via users_public view
  ↓
Role-based access control
```

### Security Features

- ✅ Password hashing via bcrypt (server-side)
- ✅ RPC functions for secure operations
- ✅ Custom JWT tokens (15min access, 7 day refresh)
- ✅ Rate limiting on login attempts
- ✅ RLS policies protect sensitive data
- ✅ `users_public` view never exposes password_hash

## Troubleshooting

### If Deposit Form Still Doesn't Show

1. **Check console logs**:
   ```
   🔍 DEPOSITS - User object: { id, username, role, permissions }
   ```
   - Verify `role` is present and equals 'admin' or 'operator'

2. **Check authentication**:
   ```javascript
   // In browser console
   localStorage.getItem('secure-auth-storage')
   ```
   - Should contain user data with role

3. **Check RLS policies**:
   - Run this in Supabase SQL Editor:
   ```sql
   SELECT * FROM users_public LIMIT 1;
   ```
   - Should return user data without password_hash

### If Session Validation Fails

The validation now uses `users_public` view which should work with RLS. If you still get errors:

1. Verify the view was created successfully
2. Check that SELECT policy allows reading from users table
3. Clear localStorage and login again

## Next Steps

After deploying, the authentication system should work properly:

- ✅ Users can login with phone-based auth
- ✅ Sessions validate correctly
- ✅ Deposit form displays for admin/operator roles
- ✅ No more 406 errors from RLS policies

## Support

If you encounter issues:
1. Check browser console for error messages
2. Check Supabase logs in Dashboard
3. Verify RLS policies are applied correctly
4. Ensure migration SQL ran without errors
