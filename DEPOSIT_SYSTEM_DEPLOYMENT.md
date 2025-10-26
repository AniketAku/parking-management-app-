# Deposit System Deployment Guide

## Overview

This guide covers the deployment of the complete Deposit Management System with role-based access control.

## 🎯 What's Implemented

### 1. **Database Components**
- ✅ `shift_deposits` table with RLS policies
- ✅ Role-based access control (Admin, Operator, Viewer)
- ✅ Automatic timestamp tracking
- ✅ Foreign key relationships with shift_sessions

### 2. **Service Layer**
- ✅ `depositService.ts` - Complete deposit management API
- ✅ Real-time subscriptions
- ✅ Role-based data filtering
- ✅ Summary calculations

### 3. **UI Components**
- ✅ `DepositsTab` - Full deposit management interface
- ✅ `ShiftOverviewTab` - Updated with cash/digital revenue separation
- ✅ Role-based UI rendering
- ✅ Real-time updates

### 4. **Business Logic**
- ✅ **Correct Cash Calculation**: `Current Cash = Opening Cash + Cash Revenue - Expenses - Cash Deposits`
- ✅ **Digital Revenue Separation**: Digital payments go directly to owner (not in employee's hand)
- ✅ **Deposit Tracking**: Full audit trail of all deposits
- ✅ **Pending Cash**: Shows cash on hand not yet deposited

---

## 📋 Deployment Steps

### Step 1: Verify User Roles

The deposit system uses the existing `users` table for role-based access control. Verify your users have proper roles:

```sql
-- Check existing user roles
SELECT id, username, role, is_approved
FROM users
ORDER BY role;

-- Update user role if needed (replace 'user-id-here' with actual user ID)
UPDATE users
SET role = 'admin'  -- or 'operator' or 'viewer'
WHERE id = 'user-id-here';
```

**Role Requirements:**
- ✅ Users must have `is_approved = true` to log in
- ✅ Role must be one of: `admin`, `operator`, `viewer`

### Step 2: Deploy shift_deposits Table

1. **Open Supabase SQL Editor**
   - Go to your Supabase Dashboard
   - Navigate to **SQL Editor** (left sidebar)
   - Create a new query

2. **Execute Table Creation Script**
   - Copy the entire contents of `/database/tables/shift_deposits.sql`
   - Paste into Supabase SQL Editor
   - Click **Run** (or press Ctrl+Enter / Cmd+Enter)

3. **Verify Success**
   - You should see: `✅ shift_deposits table created successfully with RLS policies`
   - Check the **Table Editor** to confirm `shift_deposits` table exists
   - Verify RLS policies are active in **Authentication → Policies**

### Step 3: Test the Application

1. **Refresh the Web App**
   ```bash
   # App should already be running at localhost:3000
   # Just refresh your browser
   ```

2. **Navigate to Shift Management**
   - Go to **Shift Management** page
   - You should see a new **Deposits** tab

3. **Test Role-Based Access**

   **As Admin:**
   - Can view all deposits
   - Can create deposits
   - Can see all historical data

   **As Operator:**
   - Can view today's deposits only
   - Can create new deposits
   - Can update their own deposits from today

   **As Viewer:**
   - Can view today's deposits only
   - **Cannot** create or update deposits
   - Read-only access

---

## 🔍 Verification Checklist

After deployment, verify these features:

### Overview Tab
- [ ] **Cash Revenue** box shows separately (green, with cash icon)
- [ ] **Digital Revenue** box shows separately (blue, "Direct to owner" text)
- [ ] **Current Cash on Hand** calculation updated: `Opening + Cash - Expenses - Deposits`
- [ ] Cash on Hand summary shows breakdown with deposits

### Deposits Tab
- [ ] Tab appears in navigation (between Expenses and Reports)
- [ ] Summary cards show:
  - Total Cash Deposits
  - Total Digital Deposits
  - Total Deposits (count)
  - Pending Cash (not yet deposited)

- [ ] **Operator role**: Create Deposit form visible
- [ ] **Viewer role**: Form not visible (read-only)
- [ ] **Admin role**: Can see all deposits across all dates

### Create Deposit Form (Operator)
- [ ] Cash Amount field accepts numbers
- [ ] Digital Amount field accepts numbers
- [ ] Notes field optional
- [ ] Validation prevents negative amounts
- [ ] Validation requires at least one amount > 0
- [ ] Success toast on deposit creation
- [ ] Table updates in real-time

### Deposits Table
- [ ] Shows deposits with correct columns
- [ ] Date & Time formatted correctly
- [ ] Employee name shows properly
- [ ] Cash and Digital amounts color-coded (green/blue)
- [ ] Total calculates correctly
- [ ] Notes display (or "-" if empty)
- [ ] Empty state shows helpful message

---

## 🎨 UI Features

### Color Coding
- **Green** 💚: Cash amounts (employee handles physically)
- **Blue** 💙: Digital amounts (goes to owner directly)
- **Purple** 💜: Total amounts (combined)
- **Orange** 🧡: Pending cash (needs deposit)

### Real-Time Updates
- Deposits update automatically via Supabase real-time
- Overview tab refreshes when deposits are created
- No page refresh needed

---

## 💡 Business Logic Details

### Current Cash Calculation

**OLD (Incorrect)**:
```
Current Cash = Opening Cash + Total Revenue - Expenses
```

**NEW (Correct)**:
```
Current Cash = Opening Cash + Cash Revenue - Expenses - Cash Deposits
```

**Why?**
- Digital revenue never touches employee's hands
- Deposits reduce the cash the employee has
- Current Cash reflects actual physical cash on hand

### Example Scenario

```
Opening Cash: ₹10,000
Cash Revenue: ₹5,000
Digital Revenue: ₹3,000 (UPI/Card - goes to owner directly)
Expenses: ₹1,000
Cash Deposits: ₹8,000 (deposited to owner)

Current Cash = ₹10,000 + ₹5,000 - ₹1,000 - ₹8,000 = ₹6,000

✅ Employee has ₹6,000 in hand
✅ Owner received ₹8,000 cash + ₹3,000 digital = ₹11,000 total
```

---

## 🔐 Security Features

### Row Level Security (RLS)
All policies are automatically enforced:

1. **Admin Policies**
   - ✅ View all deposits
   - ✅ Create deposits
   - ✅ Update any deposit
   - ✅ Delete deposits

2. **Operator Policies**
   - ✅ View today's deposits only
   - ✅ Create deposits
   - ✅ Update own deposits from today
   - ❌ Cannot view historical data
   - ❌ Cannot delete deposits

3. **Viewer Policies**
   - ✅ View today's deposits only
   - ❌ Cannot create deposits
   - ❌ Cannot update deposits
   - ❌ Cannot delete deposits

### Data Validation
- ✅ Amounts must be >= 0
- ✅ At least one amount must be > 0
- ✅ Automatic timestamp tracking
- ✅ User tracking (who created)
- ✅ Referential integrity with shifts

---

## 🐛 Troubleshooting

### Issue: "Deposits tab not showing"
**Solution**: Clear browser cache and refresh

### Issue: "Cannot create deposit"
**Solution**:
1. Check user role in `user_roles` table
2. Verify active shift exists
3. Check browser console for errors

### Issue: "RLS policy error"
**Solution**:
1. Verify shift_deposits table has RLS enabled
2. Check policies exist: `SELECT * FROM pg_policies WHERE tablename = 'shift_deposits'`
3. Re-run the table creation script

### Issue: "Digital revenue still affecting Current Cash"
**Solution**:
1. Check that `payment_mode` is set on parking_entries
2. Verify revenue calculation in ShiftOverviewTab uses `cashRevenue` not `totalRevenue`
3. Clear browser cache

---

## 📊 Database Schema Reference

### shift_deposits Table
```sql
CREATE TABLE shift_deposits (
  id UUID PRIMARY KEY,
  shift_session_id UUID REFERENCES shift_sessions(id),
  deposit_date DATE DEFAULT CURRENT_DATE,
  cash_amount DECIMAL(10,2) >= 0,
  digital_amount DECIMAL(10,2) >= 0,
  total_amount DECIMAL(10,2) GENERATED (cash + digital),
  deposited_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Indexes
- `idx_shift_deposits_shift` on shift_session_id
- `idx_shift_deposits_date` on deposit_date
- `idx_shift_deposits_user` on deposited_by

---

## ✅ Success Criteria

Deployment is successful when:

1. ✅ shift_deposits table exists in Supabase
2. ✅ RLS policies are active and working
3. ✅ Deposits tab visible in Shift Management
4. ✅ Role-based access control functioning
5. ✅ Cash/Digital revenue separated in Overview
6. ✅ Current Cash calculation excludes digital revenue
7. ✅ Deposits reduce Current Cash correctly
8. ✅ Real-time updates working
9. ✅ No console errors

---

## 📝 Next Steps

After successful deployment:

1. **Test with Real Data**
   - Create test shifts
   - Record test deposits
   - Verify calculations

2. **User Training**
   - Train operators on deposit workflow
   - Explain cash vs digital separation
   - Show how to view deposit history

3. **Monitor Performance**
   - Check real-time updates
   - Monitor database queries
   - Verify RLS performance

---

**Status**: ✅ READY FOR DEPLOYMENT
**Date**: 2025-10-17
**Version**: 1.0.0

**Components**:
- Database: shift_deposits table with RLS
- Service: depositService.ts
- UI: DepositsTab.tsx
- Updated: ShiftOverviewTab.tsx

**Breaking Changes**: None - This is a new feature addition
