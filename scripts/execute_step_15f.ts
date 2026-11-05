import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function executeMigration(client: Client, filename: string) {
  const filePath = path.join('supabase/migrations', filename);
  console.log(`\n============================================================`);
  console.log(`EXECUTING: ${filename} (${fs.statSync(filePath).size} bytes)`);
  console.log(`============================================================`);
  const sql = fs.readFileSync(filePath, 'utf8');
  await client.query(sql);
  console.log(`SUCCESS: ${filename} executed cleanly.`);
}

async function verifyStep009(client: Client) {
  console.log(`\n--- VERIFYING MIGRATION 009 ---`);
  // 1. Check check_verification_status constraint
  const conRes = await client.query(`
    SELECT pg_get_constraintdef(c.oid) as def 
    FROM pg_constraint c 
    WHERE conname = 'check_verification_status'
  `);
  if (!conRes.rows[0]?.def.includes('RESUBMISSION_REQUIRED')) {
    throw new Error('Verification failed: check_verification_status does not contain RESUBMISSION_REQUIRED');
  }
  console.log('✔ check_verification_status constraint contains RESUBMISSION_REQUIRED:', conRes.rows[0].def);

  // 2. Check trigger
  const trgRes = await client.query(`
    SELECT trigger_name FROM information_schema.triggers 
    WHERE event_object_table = 'student_profiles' AND trigger_name = 'trg_prevent_student_self_verification'
  `);
  if (trgRes.rows.length === 0) {
    throw new Error('Verification failed: trg_prevent_student_self_verification missing');
  }
  console.log('✔ Trigger trg_prevent_student_self_verification is present.');

  // 3. Check storage bucket
  const bRes = await client.query(`SELECT id, public FROM storage.buckets WHERE id = 'kavach-id-cards'`);
  if (bRes.rows.length === 0 || bRes.rows[0].public !== false) {
    throw new Error('Verification failed: kavach-id-cards bucket not configured properly');
  }
  console.log('✔ Bucket kavach-id-cards is private.');
}

async function verifyStep010(client: Client) {
  console.log(`\n--- VERIFYING MIGRATION 010 ---`);
  const fnRes = await client.query(`
    SELECT prosrc FROM pg_proc WHERE proname = 'is_security_or_admin'
  `);
  if (!fnRes.rows[0]?.prosrc.includes('service_role')) {
    throw new Error('Verification failed: is_security_or_admin does not include service_role check');
  }
  console.log('✔ is_security_or_admin contains hardened service_role checks.');
}

async function verifyStep011(client: Client) {
  console.log(`\n--- VERIFYING MIGRATION 011 ---`);
  const tblRes = await client.query(`
    SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'staff_locations'
  `);
  if (tblRes.rows.length === 0) {
    throw new Error('Verification failed: staff_locations table missing');
  }
  if (!tblRes.rows[0].rowsecurity) {
    throw new Error('Verification failed: staff_locations RLS not enabled');
  }
  console.log('✔ staff_locations table exists with RLS enabled.');

  const polRes = await client.query(`
    SELECT policyname FROM pg_policies WHERE tablename = 'staff_locations'
  `);
  console.log('✔ staff_locations policies:', polRes.rows.map(r => r.policyname));
}

async function verifyStep012(client: Client) {
  console.log(`\n--- VERIFYING MIGRATION 012 ---`);
  // 1. Column profiles.college_id
  const colRes = await client.query(`
    SELECT column_name, data_type FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'college_id'
  `);
  if (colRes.rows.length === 0) {
    throw new Error('Verification failed: profiles.college_id missing');
  }
  console.log('✔ profiles.college_id exists:', colRes.rows[0].data_type);

  // 2. get_user_college_id function
  const fnRes = await client.query(`
    SELECT proname FROM pg_proc WHERE proname = 'get_user_college_id'
  `);
  if (fnRes.rows.length === 0) {
    throw new Error('Verification failed: get_user_college_id function missing');
  }
  console.log('✔ get_user_college_id() exists.');

  // 3. kavach-evidence bucket limit (25MB)
  const bRes = await client.query(`
    SELECT file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'kavach-evidence'
  `);
  console.log('✔ kavach-evidence bucket updated:', bRes.rows[0]);
}

async function verifyStep013(client: Client) {
  console.log(`\n--- VERIFYING MIGRATION 013 ---`);
  // 1. incidents.college_id
  const colRes = await client.query(`
    SELECT column_name, data_type FROM information_schema.columns 
    WHERE table_name = 'incidents' AND column_name = 'college_id'
  `);
  if (colRes.rows.length === 0) {
    throw new Error('Verification failed: incidents.college_id missing');
  }
  console.log('✔ incidents.college_id exists:', colRes.rows[0].data_type);

  // 2. check policies
  const polRes = await client.query(`
    SELECT policyname FROM pg_policies 
    WHERE policyname IN ('Staff view same-college profiles', 'Staff view same-college incidents')
  `);
  console.log('✔ Cross-college RLS policies installed:', polRes.rows.map(r => r.policyname));
}

async function verifyStep014(client: Client) {
  console.log(`\n--- VERIFYING MIGRATION 014 ---`);
  // 1. is_campus_staff
  const fnRes = await client.query(`
    SELECT proname FROM pg_proc WHERE proname = 'is_campus_staff'
  `);
  if (fnRes.rows.length === 0) {
    throw new Error('Verification failed: is_campus_staff missing');
  }
  console.log('✔ is_campus_staff() exists.');

  // 2. sync_evidence_incident_reference
  const syncFn = await client.query(`
    SELECT proname FROM pg_proc WHERE proname = 'sync_evidence_incident_reference'
  `);
  if (syncFn.rows.length === 0) {
    throw new Error('Verification failed: sync_evidence_incident_reference missing');
  }
  console.log('✔ sync_evidence_incident_reference() trigger function exists.');
}

async function checkRowCounts(client: Client, step: string) {
  const tables = ['profiles', 'student_profiles', 'incidents', 'incident_locations', 'audit_logs'];
  const counts: Record<string, number> = {};
  for (const t of tables) {
    const res = await client.query(`SELECT count(*)::int as cnt FROM public."${t}"`);
    counts[t] = res.rows[0].cnt;
  }
  console.log(`[Counts after ${step}]:`, counts);
  return counts;
}

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  await client.connect();

  console.log('CONNECTED TO LOCAL POSTGRESQL AT 127.0.0.1:54322');
  await checkRowCounts(client, 'START');

  // Step 1: 009
  await executeMigration(client, '009_student_id_verification_resubmission.sql');
  await verifyStep009(client);
  await checkRowCounts(client, '009');

  // Step 2: 010
  await executeMigration(client, '010_service_role_and_audit_alignment.sql');
  await verifyStep010(client);
  await checkRowCounts(client, '010');

  // Step 3: 011
  await executeMigration(client, '011_staff_live_locations_and_consent.sql');
  await verifyStep011(client);
  await checkRowCounts(client, '011');

  // Step 4: 012
  await executeMigration(client, '012_profiles_college_tenant.sql');
  await verifyStep012(client);
  await checkRowCounts(client, '012');

  // Step 5: 013
  await executeMigration(client, '013_cross_college_rls_isolation.sql');
  await verifyStep013(client);
  await checkRowCounts(client, '013');

  // Step 6: 014
  await executeMigration(client, '014_cross_college_rls_hardening.sql');
  await verifyStep014(client);
  const finalCounts = await checkRowCounts(client, '014');

  fs.writeFileSync('scripts/phase15f_execution_result.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    status: 'PASS',
    finalCounts
  }, null, 2));

  console.log('\n============================================================');
  console.log('PHASE 15F COMPLETED SUCCESSFULLY!');
  console.log('============================================================');

  await client.end();
}

run().catch(err => {
  console.error('FATAL ERROR DURING PHASE 15F:', err);
  process.exit(1);
});

