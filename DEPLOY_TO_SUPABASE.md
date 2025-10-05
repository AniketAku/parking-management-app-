# Deploy Fee Columns to Supabase

## ⚠️ IMPORTANT: Deploy in Order

You have **TWO SQL files** to deploy to your Supabase database at:
**https://supabase.com/dashboard/project/jmckgqtjbezxhsqcfezu**

---

## Step 1: Add Fee Columns (REQUIRED FIRST)

### Go to SQL Editor
1. Open: https://supabase.com/dashboard/project/jmckgqtjbezxhsqcfezu/sql/new
2. Copy the **ENTIRE contents** of: `database/add-fee-columns-to-supabase.sql`
3. Paste into SQL Editor
4. Click **RUN**

### Expected Result:
```
ALTER TABLE (3 times - adds calculated_fee, actual_fee, amount_paid)
COMMENT (4 times - adds descriptions)
Query returns 4 rows showing all fee columns
```

### Verification Query:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'parking_entries'
  AND column_name IN ('parking_fee', 'calculated_fee', 'actual_fee', 'amount_paid')
ORDER BY column_name;
```

Should show:
- actual_fee | numeric | YES
- amount_paid | numeric | YES
- calculated_fee | numeric | YES
- parking_fee | numeric | YES

---

## Step 2: Update RPC Function (AFTER STEP 1)

### In Same SQL Editor
1. Clear the editor
2. Copy the **ENTIRE contents** of: `database/update-rpc-with-all-fees.sql`
3. Paste into SQL Editor
4. Click **RUN**

### Expected Result:
```
CREATE FUNCTION
Success. No rows returned.
```

This updates the `update_parking_entry_by_id` RPC function to handle all fee columns.

---

## Step 3: Test the Application

### Hard Refresh Your App
- **Mac**: `Cmd + Shift + R`
- **Windows/Linux**: `Ctrl + Shift + R`

### Test Entry Editing
1. Go to Search page
2. Find any parking entry
3. Click "Edit" button
4. Try editing:
   - Basic fields (transport name, vehicle number)
   - **Admin only**: Entry date (if you're admin)
5. Verify fees update correctly

---

## What These Changes Do

### New Columns Added:
- **calculated_fee**: Auto-calculated parking fee based on duration and rates
- **actual_fee**: Final fee after adjustments/discounts
- **amount_paid**: Amount actually paid by customer

### Updated RPC Function:
- Now handles all 4 fee fields: `parking_fee`, `calculated_fee`, `actual_fee`, `amount_paid`
- Maintains backward compatibility with existing entries
- Uses `COALESCE` to only update provided fields

---

## ✅ Success Checklist

- [ ] Step 1 completed: Columns added to Supabase
- [ ] Step 2 completed: RPC function updated
- [ ] App hard refreshed
- [ ] Entry editing works without errors
- [ ] Admin entry date editing recalculates fees correctly

---

## 🚨 If You Get Errors

### "column already exists"
- Safe to ignore - means columns were already added

### "function does not exist"
- Make sure you completed Step 1 first
- RPC function needs the columns to exist

### "calculated_fee does not exist" in app
- Hard refresh the browser (Cmd+Shift+R)
- Check that Step 1 completed successfully

---

## SQL File Locations

```
/Users/aniketawchat/Downloads/Parking App 2/database/
├── add-fee-columns-to-supabase.sql    ← Deploy FIRST
└── update-rpc-with-all-fees.sql       ← Deploy SECOND
```
