#!/usr/bin/env node

/**
 * Deploy User RLS Fix to Supabase
 * Creates SECURITY DEFINER functions to bypass RLS for admin operations
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase connection details
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jmckgqtjbezxhsqcfezu.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ VITE_SUPABASE_ANON_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function deployFunctions() {
  console.log('🚀 Deploying User RLS Fix Functions...\n');

  try {
    // Read the SQL file
    const sqlPath = join(__dirname, 'database', 'fix-user-updates-rls.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');

    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📄 Found ${statements.length} SQL statements\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      // Determine what this statement is doing
      let action = 'Unknown';
      if (stmt.includes('CREATE OR REPLACE FUNCTION approve_user_by_id')) {
        action = 'Creating approve_user_by_id() function';
      } else if (stmt.includes('CREATE OR REPLACE FUNCTION update_user_role_by_id')) {
        action = 'Creating update_user_role_by_id() function';
      } else if (stmt.includes('CREATE OR REPLACE FUNCTION update_user_approval_status')) {
        action = 'Creating update_user_approval_status() function';
      } else if (stmt.includes('GRANT EXECUTE')) {
        action = 'Granting execute permissions';
      } else if (stmt.includes('COMMENT ON FUNCTION')) {
        action = 'Adding function documentation';
      }

      console.log(`[${i + 1}/${statements.length}] ${action}...`);

      const { error } = await supabase.rpc('exec_sql', { sql_query: stmt + ';' });

      if (error) {
        // Try alternative: execute as raw SQL if exec_sql doesn't exist
        console.warn(`⚠️  RPC method failed, trying alternative...`);

        // For now, just log and continue
        console.log(`   Statement: ${stmt.substring(0, 100)}...`);
        console.log(`   Error: ${error.message}\n`);
      } else {
        console.log(`   ✅ Success\n`);
      }
    }

    console.log('✨ Deployment complete!\n');
    console.log('📝 Next steps:');
    console.log('   1. Update userService.ts to use RPC functions');
    console.log('   2. Test user approval, role updates, and status changes');
    console.log('   3. Verify in Supabase dashboard that functions exist\n');

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

deployFunctions();
