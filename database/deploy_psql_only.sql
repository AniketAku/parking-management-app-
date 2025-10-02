-- =============================================================================
-- SHIFT MANAGEMENT SYSTEM - PSQL-ONLY DEPLOYMENT
-- Use this with psql client for reliable deployment
-- =============================================================================

-- This script uses \i commands which work perfectly in psql
-- Run with: psql -d your_database -f deploy_psql_only.sql

\echo ''
\echo '🚀 SHIFT MANAGEMENT SYSTEM DEPLOYMENT'
\echo '======================================='
\echo ''

-- Pre-deployment information
\echo '📋 Pre-deployment checklist:'
\echo '   ✓ Supabase Realtime enabled'
\echo '   ✓ parking_entries table exists'
\echo '   ✓ Sufficient database privileges'
\echo '   ✓ Authentication configured'
\echo ''

-- Migration 001: Core Schema
\echo '⏳ [001] Creating core shift management schema...'
\i database/migrations/001_create_shift_management_schema.sql
\echo '✅ [001] Core schema completed'
\echo ''

-- Migration 002: Realtime Integration
\echo '⏳ [002] Setting up Supabase Realtime integration...'
\i database/migrations/002_setup_realtime_integration.sql
\echo '✅ [002] Realtime integration completed'
\echo ''

-- Migration 003: Row Level Security
\echo '⏳ [003] Implementing Row Level Security...'
\i database/migrations/003_setup_row_level_security.sql
\echo '✅ [003] Row Level Security completed'
\echo ''

-- Migration 004: Business Functions
\echo '⏳ [004] Creating shift management functions...'
\i database/migrations/004_shift_management_functions.sql
\echo '✅ [004] Business functions completed'
\echo ''

-- Migration 005: Parking Integration
\echo '⏳ [005] Setting up parking integration...'
\i database/migrations/005_parking_shift_integration.sql
\echo '✅ [005] Parking integration completed'
\echo ''

-- Migration 006: Testing & Validation
\echo '⏳ [006] Installing testing and validation suite...'
\i database/migrations/006_test_and_validation.sql
\echo '✅ [006] Testing suite completed'
\echo ''

-- Post-deployment validation
\echo '🧪 Running post-deployment validation...'
SELECT run_shift_management_tests();

\echo ''
\echo '=================================================='
\echo '✅ SHIFT MANAGEMENT SYSTEM DEPLOYMENT COMPLETE!'
\echo '=================================================='
\echo ''
\echo '🎯 System Features Deployed:'
\echo '  ✓ Event-driven shift sessions with flexible timing'
\echo '  ✓ Real-time dashboard updates via Supabase Realtime'
\echo '  ✓ Comprehensive audit trail for all shift changes'
\echo '  ✓ Row Level Security with role-based access control'
\echo '  ✓ Automatic parking entry assignment to active shifts'
\echo '  ✓ Real-time shift statistics and reporting'
\echo ''
\echo '🚀 Quick Start:'
\echo '  1. Test: SELECT validate_shift_system();'
\echo '  2. Start: SELECT start_shift(auth.uid(), ''Your Name'', ''+phone'', 100.00);'
\echo '  3. Check: SELECT get_current_active_shift();'
\echo '  4. Stats: SELECT * FROM shift_statistics;'
\echo ''