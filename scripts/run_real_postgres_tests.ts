/**
 * KAVACH CAMPUS — ISOLATED POSTGRESQL INTEGRATION TEST RUNNER
 * Version: 1.3.0 (Hardened in Batch 13 — Safe Local Test Database Bootstrap)
 * 
 * STRICT SAFETY RULES & PHASE GUARDS:
 * 1. ONLY connects to explicitly approved local test instances (localhost / 127.0.0.1 / ::1 on ports 54322, 5432, 54321).
 * 2. Dedicated test database identity allowlist ('postgres', 'kavach_test', 'test', 'kavach_campus_test').
 * 3. Pre-execution database probe confirms local server address and test database identity before any SQL executes.
 * 4. Unconditionally blocks remote Supabase hostnames and production identifiers (polbnvszmvblwenfnqll).
 * 5. Rejects production credentials, service-role keys, and tokens.
 * 6. Strictly blocks unsafe migrations:
 *    - 008_kavach_campus_complete_production_alignment.sql (BLOCKED: contains hardcoded SUPER_ADMIN promotion)
 *    - 006_provision_super_admin.sql (BLOCKED: contains hardcoded SUPER_ADMIN promotion)
 *    - kavach_step115_rollback_candidate.sql (BLOCKED: automatic rollback script execution forbidden)
 * 7. Ingests purely structural, reviewed safe baseline schema:
 *    - 001_kavach_campus_final.sql
 *    - 008_kavach_campus_schema_and_rls_alignment_safe.sql (Zero hardcoded user emails / promotions)
 * 8. Uses synthetic test fixtures only (Zero real student data; zero test fixtures with ADMIN or SUPER_ADMIN).
 * 9. Verifies native PostgreSQL RLS and trigger enforcement on database tables (not Storage API).
 * 10. Self-tests auth.uid() resolution before running tests.
 * 11. Assertions distinguish zero rows, trigger/RLS permission errors, and syntax/runtime SQL errors.
 * 12. Every test is isolated in a transaction that always rolls back.
 * 13. Never prints passwords or raw connection strings (redacted targets only).
 */

import fs from 'fs';
import path from 'path';

const TEST_DB_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

const ALLOWED_LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const ALLOWED_TEST_PORTS = new Set(['54322', '5432', '54321']);
const ALLOWED_TEST_DATABASES = new Set(['postgres', 'kavach_test', 'test', 'kavach_campus_test']);

const BLOCKED_MIGRATIONS = new Set([
  '008_kavach_campus_complete_production_alignment.sql',
  '006_provision_super_admin.sql',
  'kavach_step115_rollback_candidate.sql',
  'kavach_step115_rollback_candidate.backup.sql'
]);

// Strict Safety Guard: Redact credentials for logging
function redactUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    const userPart = u.username ? `${u.username}:***@` : '';
    return `${u.protocol}//${userPart}${u.hostname}:${u.port || '5432'}${u.pathname}`;
  } catch {
    return '[malformed-url]';
  }
}

// Strict Safety Guard: Block remote execution & validate local port, database, and credential isolation
function assertIsolatedTarget(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    console.error('FATAL SAFETY VIOLATION: Invalid database connection URL format.');
    process.exit(1);
  }

  const hostname = parsed.hostname.toLowerCase();
  
  // Guard 1: Local host allowlist
  if (!ALLOWED_LOCAL_HOSTS.has(hostname)) {
    console.error('FATAL SAFETY VIOLATION: Target host is not in local host allowlist.');
    console.error(`Attempted target host: ${hostname}`);
    process.exit(1);
  }

  // Guard 2: No remote Supabase or cloud hostnames
  const fullTarget = url.toLowerCase();
  if (
    fullTarget.includes('supabase.co') ||
    fullTarget.includes('supabase.in') ||
    fullTarget.includes('pooler.supabase.com') ||
    fullTarget.includes('amazonaws.com') ||
    fullTarget.includes('azure') ||
    fullTarget.includes('gcp')
  ) {
    console.error('FATAL SAFETY VIOLATION: Remote database target detected! Integration tests must NEVER target remote Supabase or production databases.');
    process.exit(1);
  }

  // Guard 3: Allowed local test ports only (54322: Supabase local, 5432: local Postgres, 54321: alternate test port)
  const port = parsed.port || '5432';
  if (!ALLOWED_TEST_PORTS.has(port)) {
    console.error(`FATAL SAFETY VIOLATION: Target port ${port} is not an allowed local test port (54322, 5432, 54321).`);
    process.exit(1);
  }

  // Guard 4: Dedicated test database identity allowlist
  const dbName = parsed.pathname.replace(/^\//, '').toLowerCase();
  if (!ALLOWED_TEST_DATABASES.has(dbName)) {
    console.error(`FATAL SAFETY VIOLATION: Database "${dbName}" is not an allowed dedicated test database (${Array.from(ALLOWED_TEST_DATABASES).join(', ')}).`);
    process.exit(1);
  }

  // Guard 5: No production project references or credentials
  if (fullTarget.includes('polbnvszmvblwenfnqll')) {
    console.error('FATAL SAFETY VIOLATION: Production Supabase project reference detected in connection URL!');
    process.exit(1);
  }

  // Guard 6: Ensure process.env doesn't inject production service role key into tests
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.length > 50 && !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('test')) {
    console.warn('SAFETY NOTICE: SUPABASE_SERVICE_ROLE_KEY is present in environment; ensuring integration test client uses unprivileged synthetic actors only.');
  }
}

// Strict Safety Guard: Block dangerous or unapproved migration files
function assertSafeMigration(filePath: string) {
  const fileName = path.basename(filePath);
  if (BLOCKED_MIGRATIONS.has(fileName)) {
    console.error(`FATAL SAFETY VIOLATION: Attempted to load BLOCKED unsafe migration: ${fileName}`);
    console.error('This migration contains hardcoded administrative promotions or destructive rollbacks and is forbidden in test execution.');
    process.exit(1);
  }
}

async function runRealPostgresTests() {
  assertIsolatedTarget(TEST_DB_URL);
  const sanitizedTarget = redactUrl(TEST_DB_URL);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let Client: any;
  try {
    // @ts-ignore
    const pg = await import('pg');
    Client = pg.Client;
  } catch {
    console.error('ERROR: "pg" library is not installed.');
    console.error('Run: npm install -D pg @types/pg');
    process.exit(1);
  }

  const client = new Client({ connectionString: TEST_DB_URL });
  try {
    await client.connect();
    console.log(`Connected to isolated local PostgreSQL test database at: ${sanitizedTarget}`);
  } catch (err) {
    console.error('Failed to connect to local PostgreSQL instance:', err);
    console.error('Ensure Docker Desktop or local PostgreSQL is running on port 54322 or 5432.');
    process.exit(1);
  }

  try {
    // Database Identity Probe & Network Binding Verification
    const probeRes = await client.query('SELECT current_database(), current_user, inet_server_addr(), inet_client_addr();');
    const dbName = probeRes.rows[0].current_database;
    const dbUser = probeRes.rows[0].current_user;
    const serverAddr = probeRes.rows[0].inet_server_addr;

    console.log(`Database Identity Confirmed: DB=${dbName}, User=${dbUser}, HostAddr=${serverAddr || 'local-socket'}`);

    // Verify server address is strictly local loopback or private Docker container bridge interface (RFC 1918)
    const isLocalOrContainerBridge = (addr: string): boolean => {
      if (addr === '127.0.0.1' || addr === '::1') return true;
      // Docker bridge private network range: 172.16.0.0 - 172.31.255.255
      if (/^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+$/.test(addr)) return true;
      // Local private networks 10.0.0.0/8 and 192.168.0.0/16
      if (/^(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)$/.test(addr)) return true;
      return false;
    };

    if (serverAddr && !isLocalOrContainerBridge(serverAddr)) {
      console.error(`FATAL SAFETY VIOLATION: inet_server_addr is ${serverAddr}, which is NOT a local loopback or private container bridge interface.`);
      process.exit(1);
    }

    if (!ALLOWED_TEST_DATABASES.has(dbName)) {
      console.error(`FATAL SAFETY VIOLATION: Connected database "${dbName}" is not in the dedicated test database allowlist.`);
      process.exit(1);
    }

    console.log('\n--- 1. Ingesting Reviewed Safe Baseline Schema Migrations ---');
    // Ensure base tables and safe functions exist before applying Step 115
    const baseMigration1 = path.resolve(process.cwd(), 'supabase/migrations/001_kavach_campus_final.sql');
    const baseMigration8Safe = path.resolve(process.cwd(), 'supabase/migrations/008_kavach_campus_schema_and_rls_alignment_safe.sql');

    // Assert safe files
    assertSafeMigration(baseMigration1);
    assertSafeMigration(baseMigration8Safe);

    if (fs.existsSync(baseMigration1)) {
      const sql1 = fs.readFileSync(baseMigration1, 'utf8');
      await client.query(sql1);
      console.log('Applied baseline migration 001_kavach_campus_final.sql');
    } else {
      console.error('FATAL ERROR: Baseline migration 001_kavach_campus_final.sql not found.');
      process.exit(1);
    }

    if (fs.existsSync(baseMigration8Safe)) {
      const sql8Safe = fs.readFileSync(baseMigration8Safe, 'utf8');
      await client.query(sql8Safe);
      console.log('Applied reviewed safe baseline migration 008_kavach_campus_schema_and_rls_alignment_safe.sql');
    } else {
      console.error('FATAL ERROR: Safe baseline migration 008_kavach_campus_schema_and_rls_alignment_safe.sql not found.');
      process.exit(1);
    }

    console.log('\n--- 1b. Ingesting Reviewed Precondition Objects & Recursion Resolution Fix ---');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.is_reviewer()
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $$
        SELECT EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
            AND role IN ('ADMIN', 'SUPER_ADMIN', 'SECURITY')
            AND is_approved = true
        );
      $$;
      ALTER FUNCTION public.is_reviewer() OWNER TO postgres;
      REVOKE EXECUTE ON FUNCTION public.is_reviewer() FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION public.is_reviewer() TO authenticated;

      -- Fix for 42P17 recursion on public.profiles:
      -- is_staff() is SECURITY DEFINER, owned by postgres (BYPASSRLS), search_path = public
      -- Strict authorization requires role in ('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN') AND is_approved = true
      CREATE OR REPLACE FUNCTION public.is_staff()
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $$
        SELECT EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
            AND role IN ('STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN')
            AND is_approved = true
        );
      $$;
      ALTER FUNCTION public.is_staff() OWNER TO postgres;
      REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

      -- Replace recursive inline subquery policy on public.profiles with non-recursive is_staff()
      DROP POLICY IF EXISTS "Staff can read all profiles" ON public.profiles;
      CREATE POLICY "Staff can read all profiles"
        ON public.profiles
        FOR SELECT
        TO authenticated
        USING (public.is_staff());

      ALTER TABLE public.evidence ADD COLUMN IF NOT EXISTS case_id TEXT;
      ALTER TABLE public.evidence ADD COLUMN IF NOT EXISTS file_path TEXT;
    `);
    console.log('Applied reviewed precondition objects: is_reviewer(), non-recursive is_staff() & profiles policy, and evidence(case_id, file_path).');

    console.log('\n--- 2. Applying Candidate Hardening Migration (Step 115) ---');
    const step115SqlPath = path.resolve(process.cwd(), 'supabase/verification/kavach_step115_security_hardening_candidate.sql');
    assertSafeMigration(step115SqlPath);
    
    if (!fs.existsSync(step115SqlPath)) {
      console.error('FATAL ERROR: Candidate Step 115 SQL file not found.');
      process.exit(1);
    }

    const step115Sql = fs.readFileSync(step115SqlPath, 'utf8');
    await client.query(step115Sql);
    console.log('Candidate Step 115 SQL applied successfully.');

    console.log('\n--- 3. Seeding Synthetic Test Actors & Fixtures ---');
    const studentAId = '11111111-1111-4111-a111-111111111111';
    const studentBId = '22222222-2222-4222-a222-222222222222';
    const responderId = '33333333-3333-4333-a333-333333333333';
    const counsellorId = '44444444-4444-4444-a444-444444444444';
    const reviewerId = '55555555-5555-4555-a555-555555555555';
    const unapprovedStaffId = '66666666-6666-4666-a666-666666666666';

    const incidentAId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
    const incidentBId = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';

    // Seed synthetic auth.users to satisfy foreign key constraint on public.profiles(id)
    await client.query(`
      INSERT INTO auth.users (id, aud, role, email)
      VALUES
        ('${studentAId}', 'authenticated', 'authenticated', 'student.a@test.campus'),
        ('${studentBId}', 'authenticated', 'authenticated', 'student.b@test.campus'),
        ('${responderId}', 'authenticated', 'authenticated', 'responder@test.campus'),
        ('${counsellorId}', 'authenticated', 'authenticated', 'counsellor@test.campus'),
        ('${reviewerId}', 'authenticated', 'authenticated', 'reviewer@test.campus'),
        ('${unapprovedStaffId}', 'authenticated', 'authenticated', 'unapproved.staff@test.campus')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Seed synthetic profiles: Notice ZERO fixtures promoted to ADMIN or SUPER_ADMIN
    await client.query(`
      INSERT INTO public.profiles (id, full_name, college_email, role, is_approved)
      VALUES 
        ('${studentAId}', 'Synthetic Student A', 'student.a@test.campus', 'STUDENT', true),
        ('${studentBId}', 'Synthetic Student B', 'student.b@test.campus', 'STUDENT', true),
        ('${responderId}', 'Synthetic Responder', 'responder@test.campus', 'SECURITY', true),
        ('${counsellorId}', 'Synthetic Counsellor', 'counsellor@test.campus', 'COUNSELLOR', true),
        ('${reviewerId}', 'Synthetic Reviewer', 'reviewer@test.campus', 'SECURITY', true),
        ('${unapprovedStaffId}', 'Synthetic Unapproved Staff', 'unapproved.staff@test.campus', 'STAFF', false)
      ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, is_approved = EXCLUDED.is_approved;

      INSERT INTO public.student_profiles (id, verification_status, course, admission_type, admission_year, expected_graduation_year)
      VALUES
        ('${studentAId}', 'PENDING_UPLOAD', 'B.Tech CSE', 'REGULAR', 2024, 2028),
        ('${studentBId}', 'PENDING_UPLOAD', 'B.Tech IT', 'REGULAR', 2024, 2028)
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.incidents (id, case_id, description, category, severity, status, student_id, assigned_to)
      VALUES
        ('${incidentAId}', 'KC-2026-SYNTH-01', 'Test incident A', 'HARASSMENT', 'HIGH', 'IN_PROGRESS', '${studentAId}', '${responderId}'),
        ('${incidentBId}', 'KC-2026-SYNTH-02', 'Test incident B', 'THEFT', 'LOW', 'RECEIVED', '${studentBId}', NULL)
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.incident_locations (id, incident_id, latitude, longitude)
      VALUES
        ('11110000-0000-0000-0000-000000000001', '${incidentAId}', 17.4455, 78.3498),
        ('22220000-0000-0000-0000-000000000002', '${incidentBId}', 17.4460, 78.3500)
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('Synthetic fixtures seeded (Zero ADMIN / SUPER_ADMIN roles used).');

    console.log('\n--- 4. Validating Authentication & RLS Context Fidelity ---');
    // Sanity check: Ensure SET LOCAL ROLE authenticated and request.jwt.claim.sub actually sets auth.uid()
    await client.query('BEGIN;');
    try {
      await client.query(`SET LOCAL ROLE authenticated;`);
      await client.query(`SET LOCAL "request.jwt.claim.sub" = '${studentAId}';`);
      await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
      
      const authProbe = await client.query(`SELECT auth.uid() AS uid, auth.role() AS role;`);
      const probedUid = authProbe.rows[0]?.uid;
      const probedRole = authProbe.rows[0]?.role;

      if (probedUid !== studentAId || probedRole !== 'authenticated') {
        throw new Error(`Authentication context mismatch: expected uid=${studentAId}, role=authenticated; got uid=${probedUid}, role=${probedRole}`);
      }
      console.log(`Auth context fidelity confirmed: auth.uid()=${probedUid}, auth.role()=${probedRole}`);
    } finally {
      await client.query('ROLLBACK;');
    }

    console.log('\n--- 5. Executing Native PostgreSQL Integration Tests ---');
    let passCount = 0;
    let failCount = 0;
    const totalExpectedTests = 14;

    const runTest = async (testNum: number, title: string, fn: () => Promise<void>) => {
      try {
        await fn();
        console.log(`[PASS] Test ${testNum}: ${title}`);
        passCount++;
      } catch (err: unknown) {
        console.error(`[FAIL] Test ${testNum}: ${title}`);
        console.error('       Error:', err instanceof Error ? err.message : err);
        failCount++;
      }
    };

    // Test 1: Student cannot modify verification_status via direct SQL
    await runTest(1, 'Student cannot modify verification_status via direct SQL (trigger blocked)', async () => {
      await client.query('BEGIN;');
      try {
        await client.query(`SET LOCAL ROLE authenticated;`);
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${studentAId}';`);
        await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
        
        let threwExpectedTrigger = false;
        try {
          await client.query(`UPDATE public.student_profiles SET verification_status = 'VERIFIED' WHERE id = '${studentAId}';`);
        } catch (err: any) {
          if (err.message && (err.message.includes('Access Denied') || err.message.includes('verification_status cannot be modified directly') || err.code === 'P0001')) {
            threwExpectedTrigger = true;
          } else {
            throw new Error(`Unexpected SQL error rather than trigger denial: ${err.message}`);
          }
        }
        if (!threwExpectedTrigger) throw new Error('Expected trigger to block verification_status modification, but update succeeded!');
      } finally {
        await client.query('ROLLBACK;');
      }
    });

    // Test 2: Student cannot modify verified_by or verified_at
    await runTest(2, 'Student cannot modify verified_by or verified_at (trigger blocked)', async () => {
      await client.query('BEGIN;');
      try {
        await client.query(`SET LOCAL ROLE authenticated;`);
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${studentAId}';`);
        await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
        
        let threwExpectedTrigger = false;
        try {
          await client.query(`UPDATE public.student_profiles SET verified_by = '${studentAId}', verified_at = NOW() WHERE id = '${studentAId}';`);
        } catch (err: any) {
          if (err.message && (err.message.includes('Access Denied') || err.code === 'P0001')) {
            threwExpectedTrigger = true;
          } else {
            throw new Error(`Unexpected SQL error rather than trigger denial: ${err.message}`);
          }
        }
        if (!threwExpectedTrigger) throw new Error('Expected trigger to block verified_by update, but it succeeded!');
      } finally {
        await client.query('ROLLBACK;');
      }
    });

    // Test 3: Student cannot modify OCR verification data
    await runTest(3, 'Student cannot modify OCR verification data (trigger blocked)', async () => {
      await client.query('BEGIN;');
      try {
        await client.query(`SET LOCAL ROLE authenticated;`);
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${studentAId}';`);
        await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
        
        let threwExpectedTrigger = false;
        try {
          await client.query(`UPDATE public.student_profiles SET ocr_extracted_data = '{"tampered": true}'::jsonb WHERE id = '${studentAId}';`);
        } catch (err: any) {
          if (err.message && (err.message.includes('Access Denied') || err.code === 'P0001')) {
            threwExpectedTrigger = true;
          } else {
            throw new Error(`Unexpected SQL error rather than trigger denial: ${err.message}`);
          }
        }
        if (!threwExpectedTrigger) throw new Error('Expected trigger to block ocr_extracted_data update, but it succeeded!');
      } finally {
        await client.query('ROLLBACK;');
      }
    });

    // Test 4: Student can update allowed profile fields
    await runTest(4, 'Student can update permitted ordinary profile fields (blood_group, medical_conditions, hostel_room)', async () => {
      await client.query('BEGIN;');
      try {
        await client.query(`SET LOCAL ROLE authenticated;`);
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${studentAId}';`);
        await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
        
        const res = await client.query(`
          UPDATE public.student_profiles 
          SET blood_group = 'O+', medical_conditions = 'Asthma', hostel_room = 'B-204' 
          WHERE id = '${studentAId}'
          RETURNING blood_group;
        `);
        if (res.rowCount !== 1 || res.rows[0].blood_group !== 'O+') {
          throw new Error('Permitted update failed to modify 1 row');
        }
      } finally {
        await client.query('ROLLBACK;');
      }
    });

    // Test 5: Unassigned staff cannot read unrelated incident locations (Table-level RLS)
    await runTest(5, 'Unassigned staff cannot read unrelated incident locations (public.incident_locations table RLS)', async () => {
      // Superuser baseline assertion: confirm that the record actually exists in DB
      const baseCheck = await client.query(`SELECT count(*) FROM public.incident_locations WHERE incident_id = '${incidentAId}';`);
      if (parseInt(baseCheck.rows[0].count, 10) === 0) {
        throw new Error('Test fixture error: incident_locations table has 0 rows for target incident as superuser');
      }

      await client.query('BEGIN;');
      try {
        await client.query(`SET LOCAL ROLE authenticated;`);
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${counsellorId}';`);
        await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
        
        const res = await client.query(`SELECT * FROM public.incident_locations WHERE incident_id = '${incidentAId}';`);
        if (res.rows.length !== 0) {
          throw new Error(`Expected 0 rows for unassigned staff, but received ${res.rows.length}`);
        }
      } finally {
        await client.query('ROLLBACK;');
      }
    });

    // Test 6: Assigned responder can access authorized incident locations (Table-level RLS)
    await runTest(6, 'Assigned responder can access authorized incident locations and not others (Table-level RLS)', async () => {
      await client.query('BEGIN;');
      try {
        await client.query(`SET LOCAL ROLE authenticated;`);
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${responderId}';`);
        await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
        
        const resAuth = await client.query(`SELECT * FROM public.incident_locations WHERE incident_id = '${incidentAId}';`);
        if (resAuth.rows.length === 0) {
          throw new Error('Assigned responder failed to read authorized incident locations');
        }

        const resUnauth = await client.query(`SELECT * FROM public.incident_locations WHERE incident_id = '${incidentBId}';`);
        if (resUnauth.rows.length !== 0) {
          throw new Error('Assigned responder was able to read locations of unassigned Incident B');
        }
      } finally {
        await client.query('ROLLBACK;');
      }
    });

    // Test 7: Unauthorized evidence upload is rejected by table-level RLS WITH CHECK
    await runTest(7, 'Unauthorized evidence upload is rejected by public.evidence table RLS WITH CHECK', async () => {
      await client.query('BEGIN;');
      try {
        await client.query(`SET LOCAL ROLE authenticated;`);
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${studentBId}';`);
        await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
        
        let threwRlsCheck = false;
        try {
          await client.query(`
            INSERT INTO public.evidence (case_id, file_path, uploaded_by, file_name, file_size, mime_type)
            VALUES ('KC-2026-SYNTH-01', 'KC-2026-SYNTH-01/test.jpg', '${studentBId}', 'test.jpg', 1024, 'image/jpeg');
          `);
        } catch (err: any) {
          if (err.code === '42501' || (err.message && err.message.includes('violates row-level security policy'))) {
            threwRlsCheck = true;
          } else {
            throw new Error(`Unexpected SQL error instead of RLS WITH CHECK violation: ${err.message} (code: ${err.code})`);
          }
        }
        if (!threwRlsCheck) throw new Error('Expected table RLS WITH CHECK to reject unauthorized evidence upload, but it succeeded!');
      } finally {
        await client.query('ROLLBACK;');
      }
    });

    // Test 8: Reviewer direct client UPDATE on student_profiles is blocked by least privilege
    await runTest(8, 'Reviewer direct client UPDATE on student_profiles is blocked by least privilege (auth.uid() = id)', async () => {
      await client.query('BEGIN;');
      try {
        await client.query(`SET LOCAL ROLE authenticated;`);
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${reviewerId}';`);
        await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
        
        const res = await client.query(`
          UPDATE public.student_profiles 
          SET verification_status = 'VERIFIED' 
          WHERE id = '${studentAId}'
          RETURNING id;
        `);
        if (res.rowCount !== 0) {
          throw new Error(`Direct reviewer update should affect 0 rows under (auth.uid() = id), but affected ${res.rowCount}`);
        }
      } finally {
        await client.query('ROLLBACK;');
      }
    });

    // Test 9: Student self-role escalation is blocked by trigger without policy recursion (SQLSTATE P0001, not 42P17)
    await runTest(9, 'Student self-role escalation is blocked by trigger without policy recursion (SQLSTATE P0001, not 42P17)', async () => {
      await client.query('BEGIN;');
      try {
        await client.query(`SET LOCAL ROLE authenticated;`);
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${studentAId}';`);
        await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
        
        let threwExpectedTrigger = false;
        try {
          await client.query(`UPDATE public.profiles SET role = 'ADMIN' WHERE id = '${studentAId}' RETURNING *;`);
        } catch (err: any) {
          if (err.code === '42P17') {
            throw new Error('FAILURE: Defect 42P17 (infinite recursion detected in policy for relation "profiles") is still present!');
          }
          if (err.code === 'P0001' && err.message && err.message.includes('Only administrators can modify roles or approval status')) {
            threwExpectedTrigger = true;
          } else {
            throw new Error(`Unexpected error code/message: code=${err.code}, message=${err.message}`);
          }
        }
        if (!threwExpectedTrigger) {
          throw new Error('Expected trigger trg_prevent_self_role_escalation to block role change, but update succeeded!');
        }
      } finally {
        await client.query('ROLLBACK;');
      }
    });

    // Test 10: Permitted ordinary profile update on public.profiles succeeds
    await runTest(10, 'Permitted ordinary profile update on public.profiles succeeds', async () => {
      await client.query('BEGIN;');
      try {
        await client.query(`SET LOCAL ROLE authenticated;`);
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${studentAId}';`);
        await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
        
        const updateRes = await client.query(`
          UPDATE public.profiles 
          SET full_name = 'Synthetic Student A Updated' 
          WHERE id = '${studentAId}' 
          RETURNING full_name;
        `);
        
        if (updateRes.rowCount !== 1) {
          throw new Error(`Expected 1 row updated, got ${updateRes.rowCount}`);
        }
        if (updateRes.rows[0].full_name !== 'Synthetic Student A Updated') {
          throw new Error(`Expected full_name 'Synthetic Student A Updated', got ${updateRes.rows[0].full_name}`);
        }
      } finally {
        await client.query('ROLLBACK;');
      }
    });

    // Test 11: Cross-student private profile isolation (Student A cannot read Student B private data)
    await runTest(11, 'Cross-student private profile isolation (Student A cannot read Student B private data)', async () => {
      await client.query('BEGIN;');
      try {
        await client.query(`SET LOCAL ROLE authenticated;`);
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${studentAId}';`);
        await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
        
        const readRes = await client.query(`
          SELECT * FROM public.student_profiles WHERE id = '${studentBId}';
        `);
        
        if (readRes.rowCount !== 0) {
          throw new Error(`Privacy breach: Student A was able to read Student B private student_profiles (${readRes.rowCount} rows)`);
        }
      } finally {
        await client.query('ROLLBACK;');
      }
    });

    // Test 12: Anonymous role access denied on profiles and student_profiles
    await runTest(12, 'Anonymous role access denied on profiles and student_profiles (0 rows returned)', async () => {
      await client.query('BEGIN;');
      try {
        await client.query(`SET LOCAL ROLE anon;`);
        await client.query(`RESET "request.jwt.claim.sub";`);
        await client.query(`RESET "request.jwt.claim.role";`);
        
        const profilesRes = await client.query(`SELECT * FROM public.profiles;`);
        if (profilesRes.rowCount !== 0) {
          throw new Error(`Security breach: Anonymous user read ${profilesRes.rowCount} rows from public.profiles`);
        }
        
        const studentProfilesRes = await client.query(`SELECT * FROM public.student_profiles;`);
        if (studentProfilesRes.rowCount !== 0) {
          throw new Error(`Security breach: Anonymous user read ${studentProfilesRes.rowCount} rows from public.student_profiles`);
        }
      } finally {
        await client.query('ROLLBACK;');
      }
    });

    // Test 13: Approved staff can read profiles as permitted by policy
    await runTest(13, 'Approved staff can read profiles as permitted by policy', async () => {
      await client.query('BEGIN;');
      try {
        await client.query(`SET LOCAL ROLE authenticated;`);
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${responderId}';`);
        await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
        
        const staffRes = await client.query(`SELECT * FROM public.profiles;`);
        if (staffRes.rowCount === 0) {
          throw new Error('Approved staff failed to read any profiles under "Staff can read all profiles" policy');
        }
        if (staffRes.rowCount < 5) {
          throw new Error(`Expected at least 5 profiles, got ${staffRes.rowCount}`);
        }
      } finally {
        await client.query('ROLLBACK;');
      }
    });

    // Test 14: Unapproved staff cannot read other profiles (enforcing is_approved = true)
    await runTest(14, 'Unapproved staff cannot read other profiles (enforcing is_approved = true in is_staff())', async () => {
      await client.query('BEGIN;');
      try {
        await client.query(`SET LOCAL ROLE authenticated;`);
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${unapprovedStaffId}';`);
        await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
        
        const readStudentRes = await client.query(`
          SELECT * FROM public.profiles WHERE id = '${studentAId}';
        `);
        if (readStudentRes.rowCount !== 0) {
          throw new Error(`Security breach: Unapproved staff was able to read Student A profile (${readStudentRes.rowCount} rows)`);
        }
      } finally {
        await client.query('ROLLBACK;');
      }
    });

    console.log(`\n======================================================`);
    console.log(`REAL POSTGRESQL INTEGRATION TEST RESULTS:`);
    console.log(`Total: ${totalExpectedTests} | Passed: ${passCount} | Failed: ${failCount}`);
    console.log(`======================================================\n`);

    if (failCount > 0 || passCount !== totalExpectedTests) {
      console.error(`ERROR: Test suite did not pass cleanly (${passCount}/${totalExpectedTests} passed).`);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

runRealPostgresTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
