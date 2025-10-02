#!/bin/bash
# =============================================================================
# SHIFT MANAGEMENT SYSTEM - SIMPLE RELIABLE DEPLOYMENT
# =============================================================================

echo "🚀 Starting Shift Management System Deployment..."
echo "=================================================="

# Database connection settings
DB_HOST="${DB_HOST:-db.jmckgqtjbezxhsqcfezu.supabase.co}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-postgres}"
DB_USER="${DB_USER:-postgres}"
export PGPASSWORD="${PGPASSWORD:-Takalghat@007}"

echo "📋 Deployment Details:"
echo "  Database: $DB_NAME@$DB_HOST:$DB_PORT"
echo "  User: $DB_USER"
echo ""

# Test connection
echo "🔍 Testing database connection..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -c "SELECT 1;" >/dev/null 2>&1; then
    echo "❌ ERROR: Cannot connect to database"
    echo "Please check your connection settings and try again."
    exit 1
fi
echo "✅ Database connection successful"
echo ""

# Deploy the reliable script
echo "📦 Deploying shift management system..."
echo ""

if psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -f "database/deploy_reliable.sql"; then
    echo ""
    echo "=================================================="
    echo "✅ SHIFT MANAGEMENT SYSTEM DEPLOYED SUCCESSFULLY!"
    echo "=================================================="
    echo ""
    echo "🎯 System Features:"
    echo "  ✓ Event-driven shift sessions"
    echo "  ✓ Real-time dashboard updates"
    echo "  ✓ Comprehensive audit trail"
    echo "  ✓ Row Level Security"
    echo "  ✓ Automatic parking integration"
    echo "  ✓ Cash reconciliation"
    echo ""
    echo "🚀 Quick Test Commands:"
    echo "  # Validate system"
    echo "  SELECT validate_shift_system();"
    echo ""
    echo "  # Start first shift"
    echo "  SELECT start_shift(auth.uid(), 'Your Name', '+phone', 100.00);"
    echo ""
    echo "  # Check active shift"
    echo "  SELECT * FROM get_current_active_shift();"
    echo ""
    echo "  # View statistics"
    echo "  SELECT * FROM shift_statistics;"
    echo ""
else
    echo "❌ ERROR: Deployment failed"
    echo "Check the error messages above for details."
    exit 1
fi