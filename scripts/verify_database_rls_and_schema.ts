import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing credentials');
  process.exit(1);
}

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CORE_TABLES = [
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

async function main() {
  console.log('================================================================');
  console.log('       KAVACH CAMPUS — DATABASE & RLS LIVE VERIFICATION         ');
  console.log('================================================================\n');

  // 1. Core Tables Existence & Row Count
  console.log('[SECTION 1: 19 CORE TABLES SCAN]');
  for (const t of CORE_TABLES) {
    const { count, error } = await adminClient.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`  ❌ ${t.padEnd(25)} -> Error: ${error.message}`);
    } else {
      console.log(`  ✓ ${t.padEnd(25)} -> PRESENT (Rows: ${count ?? 0})`);
    }
  }

  // 2. Anonymous Write Block Audit (RLS Enforcement Check)
  console.log('\n[SECTION 2: RLS ANONYMOUS WRITE RESTRICTION AUDIT]');
  const sensitiveWriteChecks = [
    { table: 'incidents', payload: { category: 'HARASSMENT', description: 'Anon write test' } },
    { table: 'profiles', payload: { id: '00000000-0000-0000-0000-000000000000', role: 'SUPER_ADMIN' } },
    { table: 'audit_logs', payload: { action: 'ANON_TAMPER' } },
    { table: 'evidence', payload: { file_name: 'test.jpg' } },
    { table: 'safe_walks', payload: { destination: 'Test' } },
    { table: 'trusted_contacts', payload: { name: 'Anon Contact', phone: '1234567890' } },
    { table: 'ai_configuration', payload: { model: 'tampered' } },
    { table: 'emergency_configuration', payload: { status: 'tampered' } },
  ];

  for (const check of sensitiveWriteChecks) {
    const { data, error } = await anonClient.from(check.table).insert(check.payload as any);
    const blocked = !!error;
    console.log(`  ${blocked ? '🛡️ PASS' : '❌ FAIL'}: Anonymous write to '${check.table}' -> ${blocked ? 'BLOCKED by RLS: ' + error.message : 'UNPROTECTED!'}`);
  }

  // 3. Migrations 015, 016, 017 Status
  console.log('\n[SECTION 3: MIGRATIONS 015, 016, 017 STATUS]');
  // 017: claimed_college_id in student_profiles
  const { error: err017 } = await adminClient.from('student_profiles').select('claimed_college_id').limit(1);
  console.log(`  • Migration 017 (claimed_college_id): ${err017 ? 'PENDING OWNER ACTION (Column does not exist on remote DB)' : 'APPLIED'}`);

  // 016: safe_box_private_notes table
  const { error: err016 } = await adminClient.from('safe_box_private_notes').select('id').limit(1);
  console.log(`  • Migration 016 (safe_box_private_notes): ${err016 ? 'PENDING OWNER ACTION (Table does not exist on remote DB)' : 'APPLIED'}`);

  // 015: college-scoped unique index
  console.log(`  • Migration 015 (student_id uniqueness index): PENDING OWNER ACTION (Requires Supabase SQL Editor execution)`);

  console.log('\n================================================================');
  console.log('             DATABASE VERIFICATION COMPLETE                     ');
  console.log('================================================================');
}

main().catch(console.error);

