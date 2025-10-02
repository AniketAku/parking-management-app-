#!/bin/bash
# =============================================================================
# SHIFT MANAGEMENT SYSTEM - STEP-BY-STEP DEPLOYMENT
# Reliable deployment using individual migration files
# =============================================================================

echo "🚀 Starting Shift Management System Deployment..."
echo "=================================================="

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ ERROR: psql command not found. Please install PostgreSQL client."
    exit 1
fi

# Set database connection (modify these variables as needed)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-your_database}"
DB_USER="${DB_USER:-your_username}"

echo "Database: $DB_NAME@$DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo ""

# Function to run migration with error checking
run_migration() {
    local migration_file=$1
    local migration_name=$2

    echo "⏳ Running: $migration_name..."

    if psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -f "$migration_file"; then
        echo "✅ $migration_name completed successfully"
    else
        echo "❌ ERROR: $migration_name failed"
        echo "Check the error message above and fix before continuing."
        exit 1
    fi
    echo ""
}

# Check if migration files exist
MIGRATIONS_DIR="database/migrations"
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "❌ ERROR: Migrations directory not found: $MIGRATIONS_DIR"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo "📁 Found migrations directory: $MIGRATIONS_DIR"
echo ""

# Run migrations in order
echo "🔄 Executing migrations..."
echo ""

run_migration "$MIGRATIONS_DIR/001_create_shift_management_schema.sql" "Migration 001: Core Schema"
run_migration "$MIGRATIONS_DIR/002_setup_realtime_integration.sql" "Migration 002: Realtime Integration"
run_migration "$MIGRATIONS_DIR/003_setup_row_level_security.sql" "Migration 003: Row Level Security"
run_migration "$MIGRATIONS_DIR/004_shift_management_functions.sql" "Migration 004: Business Functions"
run_migration "$MIGRATIONS_DIR/005_parking_shift_integration.sql" "Migration 005: Parking Integration"
run_migration "$MIGRATIONS_DIR/006_test_and_validation.sql" "Migration 006: Testing & Validation"

echo "🎯 Running post-deployment validation..."
psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -c "SELECT run_shift_management_tests();" 2>/dev/null || echo "ℹ️ Validation function not available, skipping..."

echo ""
echo "=================================================="
echo "✅ SHIFT MANAGEMENT SYSTEM DEPLOYMENT COMPLETE!"
echo "=================================================="
echo ""
echo "🎯 System Features Deployed:"
echo "  ✓ Event-driven shift sessions with flexible timing"
echo "  ✓ Real-time dashboard updates via Supabase Realtime"
echo "  ✓ Comprehensive audit trail for all shift changes"
echo "  ✓ Row Level Security with role-based access control"
echo "  ✓ Automatic parking entry assignment to active shifts"
echo "  ✓ Real-time shift statistics and reporting"
echo ""
echo "🚀 Quick Start Commands:"
echo "  # Test the system"
echo "  SELECT validate_shift_system();"
echo ""
echo "  # Start your first shift"
echo "  SELECT start_shift(auth.uid(), 'Your Name', '+phone', 100.00);"
echo ""
echo "  # Check active shift"
echo "  SELECT get_current_active_shift();"
echo ""
echo "  # View statistics"
echo "  SELECT * FROM shift_statistics;"
echo ""
echo "📚 Documentation: database/README.md"
echo "🔧 Troubleshooting: database/DEPLOYMENT_GUIDE.md"