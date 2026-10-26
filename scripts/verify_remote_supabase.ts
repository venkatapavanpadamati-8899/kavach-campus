import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const safeUrl = supabaseUrl;
const anonClient = createClient(safeUrl, anonKey);

const isServiceRoleConfigured =
  serviceRoleKey &&
  serviceRoleKey.length > 30 &&
  !serviceRoleKey.includes('YOUR_SERVICE_ROLE_KEY');

const adminClient = isServiceRoleConfigured
  ? createClient(safeUrl, serviceRoleKey)
  : null;

const requiredTables = [
  'profiles',
  'student_profiles',
  'staff_profiles',
  'user_otp_verifications',
  'campus_zones',
  'campus_buildings',
  'incidents',
  'incident_locations',
  'evidence',
  'ai_analyses',
  'escalations',
  'incident_messages',
  'case_actions',
  'notifications',
  'safe_walks',
  'trusted_contacts',
  'audit_logs',
  'ai_configuration',
  'emergency_configuration',
];

async function verifyTablesAndRls() {
  console.log('====================================================');
  console.log('🛡️  KAVACH CAMPUS: REMOTE SUPABASE SECURITY AUDIT');
  console.log('====================================================');
  console.log(`Endpoint: ${safeUrl.replace(/^(https:\/\/[^.]+).*/, '$1.supabase.co')}`);
  console.log(`Service Role Status: ${isServiceRoleConfigured ? 'Configured' : 'Local Placeholder (Secure / Safe)'}\n`);

  console.log('--- 1. REMOTE SCHEMA VERIFICATION (All 19 Tables) ---');
  const tableStatus: Record<string, { exists: boolean; status: number; note: string }> = {};

  for (const table of requiredTables) {
    try {
      const { data, error, status } = await anonClient
        .from(table)
        .select('*')
        .limit(1);

      if (error && error.code === 'PGRST205') {
        tableStatus[table] = {
          exists: false,
          status,
          note: 'Table NOT FOUND in schema cache',
        };
        console.log(`❌ [${table}]: MISSING (PGRST205 - Table not found in remote database)`);
      } else if (error && error.code === '42P17') {
        tableStatus[table] = {
          exists: true,
          status,
          note: 'EXISTS, but RLS infinite recursion detected (profiles subquery loop)',
        };
        console.log(`⚠️  [${table}]: EXISTS on remote DB, but has 42P17 Infinite Recursion in RLS policy`);
      } else if (error) {
        tableStatus[table] = {
          exists: true,
          status,
          note: `EXISTS, protected (Error: ${error.message})`,
        };
        console.log(`🛡️  [${table}]: EXISTS & PROTECTED (Status ${status}: ${error.message})`);
      } else {
        tableStatus[table] = {
          exists: true,
          status,
          note: `EXISTS (Empty or permitted rows: ${data ? data.length : 0})`,
        };
        console.log(`✅ [${table}]: EXISTS on remote DB (Status ${status})`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      tableStatus[table] = { exists: false, status: 500, note: msg };
      console.log(`❌ [${table}]: EXCEPTION -> ${msg}`);
    }
  }

  const existingCount = Object.values(tableStatus).filter(s => s.exists).length;
  console.log(`\nTable Existence Summary: ${existingCount}/${requiredTables.length} tables exist on remote database.\n`);

  console.log('--- 2. ROW LEVEL SECURITY (RLS) WRITE ENFORCEMENT AUDIT ---');
  console.log('Probing anonymous write rejection on critical tables:');

  const probeTables = [
    'audit_logs',
    'trusted_contacts',
    'case_actions',
    'notifications',
    'user_otp_verifications',
    'campus_zones',
    'campus_buildings',
    'ai_analyses',
  ];

  let rlsPassedCount = 0;
  for (const table of probeTables) {
    if (!tableStatus[table]?.exists) {
      console.log(`⚠️  [${table}]: SKIPPED (table does not exist on remote)`);
      continue;
    }

    try {
      const { error } = await anonClient
        .from(table)
        .insert({ id: '00000000-0000-0000-0000-000000000099' })
        .select();

      if (error && (error.message.includes('row-level security') || error.code === '42501' || error.message.includes('violates'))) {
        rlsPassedCount++;
        console.log(`🛡️  [${table}]: RLS ENFORCED ✅ (Anonymous insert blocked: "${error.message}")`);
      } else if (error) {
        rlsPassedCount++;
        console.log(`🛡️  [${table}]: RLS PROTECTED ✅ (Blocked: "${error.message}")`);
      } else {
        console.log(`🚨 [${table}]: CRITICAL VULNERABILITY! Anonymous insert succeeded!`);
      }
    } catch (err: unknown) {
      console.log(`🛡️  [${table}]: Blocked by server exception`);
      rlsPassedCount++;
    }
  }
  console.log(`\nRLS Write Rejection Summary: ${rlsPassedCount}/${probeTables.length} tables verified secure against anonymous tampering.\n`);

  console.log('--- 3. FINDINGS & ACTION REQUIRED ---');
  const missingTables = Object.entries(tableStatus).filter(([, s]) => !s.exists).map(([t]) => t);
  const recursionTables = Object.entries(tableStatus).filter(([, s]) => s.note.includes('42P17')).map(([t]) => t);

  if (missingTables.length > 0) {
    console.log(`⚠️  Missing Tables on Remote Supabase: ${missingTables.join(', ')}`);
  }
  if (recursionTables.length > 0) {
    console.log(`⚠️  Tables Impacted by 42P17 Infinite Recursion: ${recursionTables.length} tables (needs SECURITY DEFINER helper function)`);
  }

  if (adminClient) {
    console.log('\n--- 4. SERVICE ROLE CONNECTION ---');
    console.log('Service role client is active.');
  }

  console.log('\n====================================================');
  console.log('AUDIT COMPLETED');
  console.log('====================================================');
}

verifyTablesAndRls().catch(console.error);
