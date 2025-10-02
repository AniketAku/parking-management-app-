// =============================================================================
// JEST ENVIRONMENT SETUP
// Event-Driven Shift Management - Environment Variables for Testing
// =============================================================================

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

// Mock timezone for consistent testing
process.env.TZ = 'UTC';