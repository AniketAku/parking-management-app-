# Deploy Shift Expenses Feature

## Quick Deployment

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `database/tables/shift_expenses.sql`
4. Click **Run**

### Option 2: Command Line
```bash
# Set your Supabase connection string
export DATABASE_URL="your-supabase-connection-string"

# Run the migration
psql $DATABASE_URL -f database/tables/shift_expenses.sql
```

## What Gets Created

### Tables
- `shift_expenses` - Stores all shift-related expenses

### Functions
- `get_shift_total_expenses(shift_id)` - Returns total expenses for a shift
- `get_shift_current_cash(shift_id)` - Calculates Opening Cash + Revenue - Expenses

### Security
- Row Level Security (RLS) enabled
- Users can only add expenses to their active shifts
- Users can view all expenses (for reporting)
- Users can only delete/update their own shift expenses

### Expense Categories
- Maintenance
- Supplies
- Staff
- Utilities
- Other

## Verification

After deployment, verify with:
```sql
-- Check table exists
SELECT * FROM shift_expenses LIMIT 1;

-- Test current cash calculation
SELECT get_shift_current_cash('your-shift-id');

-- Test total expenses
SELECT get_shift_total_expenses('your-shift-id');
```

## Next Steps
1. Deploy the database schema (above)
2. Restart your development server: `npm run dev`
3. Navigate to Shift Management → Expenses tab
4. Test adding an expense
5. Verify Current Cash updates in Shift Overview
