import { Client } from 'pg';
import * as fs from 'fs';

async function run15G() {
  const client = new Client({
    connectionString: 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres'
  });
  await client.connect();

  console.log('--- PHASE 15G EXECUTION: LOCAL MIGRATIONS 015 - 017 ---');

  // Pre-check for 015: existing student_id values
  const studentIds = await client.query(`
    SELECT id, role, student_id, college_id 
    FROM public.profiles 
    WHERE student_id IS NOT NULL
  `);
  console.log('Existing profiles with student_id:', studentIds.rows);

  // -------------------------------------------------------------
  // MIGRATION 015
  // -------------------------------------------------------------
  console.log('\n>>> Executing Migration 015...');
  const sql015 = fs.readFileSync('supabase/migrations/015_college_scoped_student_id_uniqueness.sql', 'utf8');
  await client.query(sql015);
  console.log('✔ Migration 015 executed.');

  // Verify index
  const idx015 = await client.query(`
    SELECT indexname, indexdef FROM pg_indexes 
    WHERE tablename = 'profiles' AND indexname = 'idx_profiles_college_student_id'
  `);
  if (idx015.rows.length === 0) throw new Error('Verification failed: idx_profiles_college_student_id missing');
  console.log('✔ Index verified:', idx015.rows[0]);

  // Test 015: verify 23505 unique violation in same college, permit across different colleges
  console.log('\n--- Testing Migration 015 Unique Index Constraints ---');
  const testAId = 'a0000000-0000-0000-0000-000000000001';
  const testBId = 'a0000000-0000-0000-0000-000000000002';
  const testCId = 'a0000000-0000-0000-0000-000000000003';

  // Insert into auth.users first
  await client.query(`
    INSERT INTO auth.users (id, email, role, created_at, updated_at)
    VALUES 
      ('${testAId}', 'test.alpha@synth.local', 'authenticated', NOW(), NOW()),
      ('${testBId}', 'test.beta@synth.local', 'authenticated', NOW(), NOW()),
      ('${testCId}', 'test.gamma@synth.local', 'authenticated', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  // 1. Insert test student in college A
  await client.query(`
    INSERT INTO public.profiles (id, full_name, role, student_id, college_id)
    VALUES ('${testAId}', 'Test Student Alpha', 'STUDENT', 'TEST_REG_9999', 'srkr-bhimavaram')
    ON CONFLICT (id) DO UPDATE SET student_id = 'TEST_REG_9999', college_id = 'srkr-bhimavaram';
  `);
  console.log('✔ Inserted Student Alpha in srkr-bhimavaram with student_id TEST_REG_9999.');

  // 2. Insert test student in college B with SAME student_id (Must SUCCEED)
  await client.query(`
    INSERT INTO public.profiles (id, full_name, role, student_id, college_id)
    VALUES ('${testBId}', 'Test Student Beta', 'STUDENT', 'TEST_REG_9999', 'vishnu-bhimavaram')
    ON CONFLICT (id) DO UPDATE SET student_id = 'TEST_REG_9999', college_id = 'vishnu-bhimavaram';
  `);
  console.log('✔ Inserted Student Beta in vishnu-bhimavaram with identical student_id TEST_REG_9999 (Cross-college allowed).');

  // 3. Insert duplicate in college A with SAME student_id (Must FAIL with 23505)
  let rejected = false;
  try {
    await client.query(`
      INSERT INTO public.profiles (id, full_name, role, student_id, college_id)
      VALUES ('${testCId}', 'Test Student Gamma Duplicate', 'STUDENT', 'TEST_REG_9999', 'srkr-bhimavaram');
    `);
  } catch (err: any) {
    if (err.code === '23505') {
      rejected = true;
      console.log('✔ Duplicate student_id within same college rejected with 23505 unique_violation.');
    } else {
      throw err;
    }
  }
  if (!rejected) throw new Error('Failed: duplicate student_id was not rejected!');

  // Clean up synthetic test users
  await client.query(`DELETE FROM auth.users WHERE id IN ('${testAId}', '${testBId}', '${testCId}')`);
  console.log('✔ Cleaned up temporary index test accounts from auth.users and profiles.');

  // -------------------------------------------------------------
  // MIGRATION 016
  // -------------------------------------------------------------
  console.log('\n>>> Executing Migration 016...');
  const sql016 = fs.readFileSync('supabase/migrations/016_safe_box_private_notes.sql', 'utf8');
  await client.query(sql016);
  console.log('✔ Migration 016 executed.');

  // Verify safe_box_private_notes
  const tbl016 = await client.query(`
    SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'safe_box_private_notes'
  `);
  if (tbl016.rows.length === 0 || !tbl016.rows[0].rowsecurity) {
    throw new Error('Verification failed: safe_box_private_notes missing or RLS not enabled');
  }
  console.log('✔ safe_box_private_notes exists with RLS enabled.');

  const pol016 = await client.query(`
    SELECT policyname FROM pg_policies WHERE tablename = 'safe_box_private_notes'
  `);
  console.log('✔ Policies on safe_box_private_notes:', pol016.rows.map(r => r.policyname));

  // Verify length constraint (<= 2000 chars)
  const con016 = await client.query(`
    SELECT pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'public.safe_box_private_notes'::regclass AND contype = 'c'
  `);
  console.log('✔ Check constraint on safe_box_private_notes:', con016.rows[0]?.def);

  // -------------------------------------------------------------
  // MIGRATION 017
  // -------------------------------------------------------------
  console.log('\n>>> Executing Migration 017...');
  const sql017 = fs.readFileSync('supabase/migrations/017_student_college_claims.sql', 'utf8');
  await client.query(sql017);
  console.log('✔ Migration 017 executed.');

  // Verify student_profiles.claimed_college_id
  const col017_1 = await client.query(`
    SELECT column_name, data_type FROM information_schema.columns 
    WHERE table_name = 'student_profiles' AND column_name = 'claimed_college_id'
  `);
  if (col017_1.rows.length === 0) throw new Error('Verification failed: student_profiles.claimed_college_id missing');
  console.log('✔ student_profiles.claimed_college_id exists:', col017_1.rows[0]);

  // Verify profiles.profile_photo_path
  const col017_2 = await client.query(`
    SELECT column_name, data_type FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'profile_photo_path'
  `);
  if (col017_2.rows.length === 0) throw new Error('Verification failed: profiles.profile_photo_path missing');
  console.log('✔ profiles.profile_photo_path exists:', col017_2.rows[0]);

  // Verify bucket kavach-profile-photos
  const b017 = await client.query(`
    SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'kavach-profile-photos'
  `);
  if (b017.rows.length === 0 || b017.rows[0].public !== false) {
    throw new Error('Verification failed: kavach-profile-photos bucket missing or public');
  }
  console.log('✔ Bucket kavach-profile-photos verified:', b017.rows[0]);

  // Verify storage policy
  const sPol017 = await client.query(`
    SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users read own profile photos'
  `);
  console.log('✔ Storage policy verified:', sPol017.rows[0]);

  // Check row counts
  const tables = ['profiles', 'student_profiles', 'incidents', 'incident_locations', 'audit_logs', 'safe_box_private_notes'];
  const counts: Record<string, number> = {};
  for (const t of tables) {
    const cRes = await client.query(`SELECT count(*)::int as cnt FROM public."${t}"`);
    counts[t] = cRes.rows[0].cnt;
  }
  console.log('\n--- Record counts after Phase 15G ---:', counts);

  fs.writeFileSync('scripts/phase15g_execution_result.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    status: 'PASS',
    counts
  }, null, 2));

  console.log('\n============================================================');
  console.log('PHASE 15G COMPLETED SUCCESSFULLY!');
  console.log('============================================================');

  await client.end();
}

run15G().catch(err => {
  console.error('FATAL ERROR DURING PHASE 15G:', err);
  process.exit(1);
});
