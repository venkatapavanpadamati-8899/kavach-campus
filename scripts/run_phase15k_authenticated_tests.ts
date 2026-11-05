import { Client } from 'pg';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';

const JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';

interface Persona {
  id: string;
  email: string;
  role: string;
  college_id: string;
  name: string;
}

const PERSONAS: Record<string, Persona> = {
  studentA:   { id: 'f1000000-0000-0000-0000-000000000001', email: 'student.a@srkr.test.local', role: 'STUDENT', college_id: 'srkr-bhimavaram', name: 'Student A (SRKR)' },
  studentB:   { id: 'f1000000-0000-0000-0000-000000000002', email: 'student.b@srkr.test.local', role: 'STUDENT', college_id: 'srkr-bhimavaram', name: 'Student B (SRKR)' },
  studentC:   { id: 'f1000000-0000-0000-0000-000000000003', email: 'student.c@vitb.test.local', role: 'STUDENT', college_id: 'vishnu-bhimavaram', name: 'Student C (VITB)' },
  staffA:     { id: 'f1000000-0000-0000-0000-000000000004', email: 'staff.a@srkr.test.local',   role: 'STAFF',   college_id: 'srkr-bhimavaram', name: 'Staff A (SRKR)' },
  staffB:     { id: 'f1000000-0000-0000-0000-000000000014', email: 'staff.b@vitb.test.local',   role: 'STAFF',   college_id: 'vishnu-bhimavaram', name: 'Staff B (VITB)' },
  hodA:       { id: 'f1000000-0000-0000-0000-000000000005', email: 'hod.a@srkr.test.local',     role: 'HOD',     college_id: 'srkr-bhimavaram', name: 'HOD A (SRKR)' },
  principalA: { id: 'f1000000-0000-0000-0000-000000000006', email: 'principal.a@srkr.test.local', role: 'PRINCIPAL', college_id: 'srkr-bhimavaram', name: 'Principal A (SRKR)' },
  adminA:     { id: 'f1000000-0000-0000-0000-000000000007', email: 'admin.a@srkr.test.local',   role: 'ADMIN',   college_id: 'srkr-bhimavaram', name: 'Admin A (SRKR)' },
  superAdmin: { id: 'f1000000-0000-0000-0000-000000000008', email: 'superadmin@governance.test.local', role: 'SUPER_ADMIN', college_id: 'srkr-bhimavaram', name: 'Super Admin' }
};

interface TestResult {
  suite: string;
  testId: string;
  testName: string;
  persona: string;
  operation: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
  details?: string;
}

const testResults: TestResult[] = [];

async function runAs<T>(
  client: Client,
  persona: Persona | null,
  action: () => Promise<T>
): Promise<T> {
  await client.query('BEGIN');
  try {
    if (persona) {
      await client.query("SET LOCAL ROLE = 'authenticated'");
      await client.query(`SET LOCAL "request.jwt.claim.sub" = '${persona.id}'`);
      await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated'`);
      await client.query(`SET LOCAL "request.jwt.claim.email" = '${persona.email}'`);
      await client.query(`SET LOCAL "request.jwt.claims" = '${JSON.stringify({ sub: persona.id, role: 'authenticated', email: persona.email })}'`);
    } else {
      await client.query("SET LOCAL ROLE = 'anon'");
      await client.query(`SET LOCAL "request.jwt.claim.role" = 'anon'`);
      await client.query(`SET LOCAL "request.jwt.claims" = '{"role": "anon"}'`);
    }
    const res = await action();
    await client.query('COMMIT');
    return res;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function runPhase15KTests() {
  const adminClient = new Client({
    connectionString: 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres'
  });
  await adminClient.connect();

  console.log('--- PROVISIONING 9 SYNTHETIC TEST PERSONAS ---');
  for (const key of Object.keys(PERSONAS)) {
    const p = PERSONAS[key];
    await adminClient.query(`
      INSERT INTO auth.users (id, email, role, created_at, updated_at)
      VALUES ('${p.id}', '${p.email}', 'authenticated', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET email = '${p.email}';
    `);

    await adminClient.query(`
      INSERT INTO public.profiles (id, full_name, role, college_email, college_id, is_approved, is_active)
      VALUES ('${p.id}', '${p.name}', '${p.role}', '${p.email}', '${p.college_id}', true, true)
      ON CONFLICT (id) DO UPDATE SET 
        full_name = '${p.name}',
        role = '${p.role}',
        college_id = '${p.college_id}',
        college_email = '${p.email}',
        is_approved = true,
        is_active = true;
    `);

    if (p.role === 'STUDENT') {
      await adminClient.query(`
        INSERT INTO public.student_profiles (id, verification_status, claimed_college_id)
        VALUES ('${p.id}', 'VERIFIED', '${p.college_id}')
        ON CONFLICT (id) DO UPDATE SET verification_status = 'VERIFIED', claimed_college_id = '${p.college_id}';
      `);
    } else {
      await adminClient.query(`
        INSERT INTO public.staff_profiles (id, designation)
        VALUES ('${p.id}', 'Test Designation')
        ON CONFLICT (id) DO UPDATE SET designation = 'Test Designation';
      `);
    }
  }

  // Provision Test Incidents
  const incAId = 'e1000000-0000-0000-0000-000000000001';
  const incCId = 'e1000000-0000-0000-0000-000000000002';

  await adminClient.query(`
    INSERT INTO public.incidents (id, case_id, student_id, category, description, severity, status, college_id)
    VALUES 
      ('${incAId}', 'SRKR-CASE-001', '${PERSONAS.studentA.id}', 'Harassment', 'SRKR test incident', 'MEDIUM', 'RECEIVED', 'srkr-bhimavaram'),
      ('${incCId}', 'VITB-CASE-001', '${PERSONAS.studentC.id}', 'Theft', 'VITB test incident', 'HIGH', 'RECEIVED', 'vishnu-bhimavaram')
    ON CONFLICT (id) DO UPDATE SET 
      case_id = EXCLUDED.case_id,
      student_id = EXCLUDED.student_id,
      college_id = EXCLUDED.college_id;
  `);

  // Provision Incident Locations
  await adminClient.query(`
    INSERT INTO public.incident_locations (incident_id, latitude, longitude)
    VALUES 
      ('${incAId}', 16.544, 81.521),
      ('${incCId}', 16.568, 81.525)
    ON CONFLICT DO NOTHING;
  `);

  // Provision Evidence
  const evAId = 'a1000000-0000-0000-0000-000000000001';
  const evCId = 'a1000000-0000-0000-0000-000000000002';
  await adminClient.query(`
    INSERT INTO public.evidence (id, incident_id, case_id, uploaded_by, storage_path, file_name, file_path)
    VALUES 
      ('${evAId}', '${incAId}', 'SRKR-CASE-001', '${PERSONAS.studentA.id}', 'SRKR-CASE-001/docA.pdf', 'docA.pdf', 'SRKR-CASE-001/docA.pdf'),
      ('${evCId}', '${incCId}', 'VITB-CASE-001', '${PERSONAS.studentC.id}', 'VITB-CASE-001/docC.pdf', 'docC.pdf', 'VITB-CASE-001/docC.pdf')
    ON CONFLICT (id) DO UPDATE SET case_id = EXCLUDED.case_id;
  `);

  // Provision Storage Objects
  await adminClient.query(`
    INSERT INTO storage.objects (id, bucket_id, name, owner)
    VALUES 
      ('b1000000-0000-0000-0000-000000000001', 'kavach-evidence', 'SRKR-CASE-001/docA.pdf', '${PERSONAS.studentA.id}'),
      ('b1000000-0000-0000-0000-000000000002', 'kavach-evidence', 'VITB-CASE-001/docC.pdf', '${PERSONAS.studentC.id}'),
      ('b1000000-0000-0000-0000-000000000003', 'kavach-id-cards', '${PERSONAS.studentA.id}/idcard.jpg', '${PERSONAS.studentA.id}'),
      ('b1000000-0000-0000-0000-000000000004', 'kavach-id-cards', '${PERSONAS.studentC.id}/idcard.jpg', '${PERSONAS.studentC.id}')
    ON CONFLICT (id) DO NOTHING;
  `);

  // Provision Safe Box Note for Student A
  await adminClient.query(`
    INSERT INTO public.safe_box_private_notes (evidence_id, owner_id, private_note)
    VALUES ('${evAId}', '${PERSONAS.studentA.id}', 'Confidential Safe Box note by Student A')
    ON CONFLICT (evidence_id) DO UPDATE SET private_note = EXCLUDED.private_note;
  `);

  console.log('--- EXECUTING AUTHENTICATED TESTS ---');

  // SUITE 1: Incident Privacy
  // 1.1 Student A reads own incident
  await runAs(adminClient, PERSONAS.studentA, async () => {
    const res = await adminClient.query(`SELECT id FROM public.incidents WHERE id = '${incAId}'`);
    testResults.push({
      suite: '1. Incident Privacy',
      testId: '1.1',
      testName: 'Student A reads own incident',
      persona: 'Student A (SRKR)',
      operation: 'SELECT',
      expected: '1 row returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 1 ? 'PASS' : 'FAIL'
    });
  });

  // 1.2 Student B cannot read Student A's incident
  await runAs(adminClient, PERSONAS.studentB, async () => {
    const res = await adminClient.query(`SELECT id FROM public.incidents WHERE id = '${incAId}'`);
    testResults.push({
      suite: '1. Incident Privacy',
      testId: '1.2',
      testName: 'Student B cannot read Student A incident (Peer Isolation)',
      persona: 'Student B (SRKR)',
      operation: 'SELECT',
      expected: '0 rows returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 0 ? 'PASS' : 'FAIL'
    });
  });

  // 1.3 Student B cannot update or delete Student A's incident
  await runAs(adminClient, PERSONAS.studentB, async () => {
    const updRes = await adminClient.query(`UPDATE public.incidents SET description = 'Hacked' WHERE id = '${incAId}'`);
    testResults.push({
      suite: '1. Incident Privacy',
      testId: '1.3',
      testName: 'Student B cannot update Student A incident',
      persona: 'Student B (SRKR)',
      operation: 'UPDATE',
      expected: '0 rows affected',
      actual: `${updRes.rowCount} row(s) affected`,
      status: updRes.rowCount === 0 ? 'PASS' : 'FAIL'
    });
  });

  // 1.4 College B staff cannot access College A incidents (Cross-College Isolation)
  await runAs(adminClient, PERSONAS.staffB, async () => {
    const res = await adminClient.query(`SELECT id FROM public.incidents WHERE id = '${incAId}'`);
    testResults.push({
      suite: '1. Incident Privacy',
      testId: '1.4',
      testName: 'College B staff cannot access College A incident',
      persona: 'Staff B (VITB)',
      operation: 'SELECT',
      expected: '0 rows returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 0 ? 'PASS' : 'FAIL'
    });
  });

  // 1.5 College A staff cannot access College B incidents
  await runAs(adminClient, PERSONAS.staffA, async () => {
    const res = await adminClient.query(`SELECT id FROM public.incidents WHERE id = '${incCId}'`);
    testResults.push({
      suite: '1. Incident Privacy',
      testId: '1.5',
      testName: 'College A staff cannot access College B incident',
      persona: 'Staff A (SRKR)',
      operation: 'SELECT',
      expected: '0 rows returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 0 ? 'PASS' : 'FAIL'
    });
  });

  // 1.6 Same-college staff CAN access College A incident
  await runAs(adminClient, PERSONAS.staffA, async () => {
    const res = await adminClient.query(`SELECT id FROM public.incidents WHERE id = '${incAId}'`);
    testResults.push({
      suite: '1. Incident Privacy',
      testId: '1.6',
      testName: 'College A staff can access College A incident',
      persona: 'Staff A (SRKR)',
      operation: 'SELECT',
      expected: '1 row returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 1 ? 'PASS' : 'FAIL'
    });
  });

  // SUITE 2: Incident Location Privacy
  // 2.1 Student A reads own incident location
  await runAs(adminClient, PERSONAS.studentA, async () => {
    const res = await adminClient.query(`SELECT * FROM public.incident_locations WHERE incident_id = '${incAId}'`);
    testResults.push({
      suite: '2. Incident Location Privacy',
      testId: '2.1',
      testName: 'Student A reads own incident location',
      persona: 'Student A (SRKR)',
      operation: 'SELECT',
      expected: '1 row returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 1 ? 'PASS' : 'FAIL'
    });
  });

  // 2.2 Student B cannot read Student A incident location
  await runAs(adminClient, PERSONAS.studentB, async () => {
    const res = await adminClient.query(`SELECT * FROM public.incident_locations WHERE incident_id = '${incAId}'`);
    testResults.push({
      suite: '2. Incident Location Privacy',
      testId: '2.2',
      testName: 'Student B cannot read Student A GPS location',
      persona: 'Student B (SRKR)',
      operation: 'SELECT',
      expected: '0 rows returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 0 ? 'PASS' : 'FAIL'
    });
  });

  // 2.3 College B staff cannot read College A incident location
  await runAs(adminClient, PERSONAS.staffB, async () => {
    const res = await adminClient.query(`SELECT * FROM public.incident_locations WHERE incident_id = '${incAId}'`);
    testResults.push({
      suite: '2. Incident Location Privacy',
      testId: '2.3',
      testName: 'College B staff cannot read College A GPS location',
      persona: 'Staff B (VITB)',
      operation: 'SELECT',
      expected: '0 rows returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 0 ? 'PASS' : 'FAIL'
    });
  });

  // 2.4 College A staff CAN read College A incident location
  await runAs(adminClient, PERSONAS.staffA, async () => {
    const res = await adminClient.query(`SELECT * FROM public.incident_locations WHERE incident_id = '${incAId}'`);
    testResults.push({
      suite: '2. Incident Location Privacy',
      testId: '2.4',
      testName: 'College A staff can read same-college incident GPS location',
      persona: 'Staff A (SRKR)',
      operation: 'SELECT',
      expected: '1 row returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 1 ? 'PASS' : 'FAIL'
    });
  });

  // SUITE 3: Evidence Privacy
  // 3.1 Student A reads own evidence
  await runAs(adminClient, PERSONAS.studentA, async () => {
    const res = await adminClient.query(`SELECT id FROM public.evidence WHERE id = '${evAId}'`);
    testResults.push({
      suite: '3. Evidence Privacy',
      testId: '3.1',
      testName: 'Student A reads own evidence',
      persona: 'Student A (SRKR)',
      operation: 'SELECT',
      expected: '1 row returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 1 ? 'PASS' : 'FAIL'
    });
  });

  // 3.2 Student B cannot read Student A evidence
  await runAs(adminClient, PERSONAS.studentB, async () => {
    const res = await adminClient.query(`SELECT id FROM public.evidence WHERE id = '${evAId}'`);
    testResults.push({
      suite: '3. Evidence Privacy',
      testId: '3.2',
      testName: 'Student B cannot read Student A evidence',
      persona: 'Student B (SRKR)',
      operation: 'SELECT',
      expected: '0 rows returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 0 ? 'PASS' : 'FAIL'
    });
  });

  // 3.3 College B staff cannot read College A evidence
  await runAs(adminClient, PERSONAS.staffB, async () => {
    const res = await adminClient.query(`SELECT id FROM public.evidence WHERE id = '${evAId}'`);
    testResults.push({
      suite: '3. Evidence Privacy',
      testId: '3.3',
      testName: 'College B staff cannot read College A evidence',
      persona: 'Staff B (VITB)',
      operation: 'SELECT',
      expected: '0 rows returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 0 ? 'PASS' : 'FAIL'
    });
  });

  // 3.4 Storage: College B staff cannot read College A evidence storage object
  await runAs(adminClient, PERSONAS.staffB, async () => {
    const res = await adminClient.query(`SELECT id FROM storage.objects WHERE name = 'SRKR-CASE-001/docA.pdf'`);
    testResults.push({
      suite: '3. Evidence Privacy',
      testId: '3.4',
      testName: 'College B staff cannot read College A evidence storage file',
      persona: 'Staff B (VITB)',
      operation: 'SELECT',
      expected: '0 rows returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 0 ? 'PASS' : 'FAIL'
    });
  });

  // 3.5 Storage: College A staff CAN read College A evidence storage object
  await runAs(adminClient, PERSONAS.staffA, async () => {
    const res = await adminClient.query(`SELECT id FROM storage.objects WHERE name = 'SRKR-CASE-001/docA.pdf'`);
    testResults.push({
      suite: '3. Evidence Privacy',
      testId: '3.5',
      testName: 'College A staff can read same-college evidence storage file',
      persona: 'Staff A (SRKR)',
      operation: 'SELECT',
      expected: '1 row returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 1 ? 'PASS' : 'FAIL'
    });
  });

  // SUITE 4: Student Profile Privacy
  // 4.1 Student A reads own student_profile
  await runAs(adminClient, PERSONAS.studentA, async () => {
    const res = await adminClient.query(`SELECT id FROM public.student_profiles WHERE id = '${PERSONAS.studentA.id}'`);
    testResults.push({
      suite: '4. Student Profile Privacy',
      testId: '4.1',
      testName: 'Student A reads own student profile',
      persona: 'Student A (SRKR)',
      operation: 'SELECT',
      expected: '1 row returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 1 ? 'PASS' : 'FAIL'
    });
  });

  // 4.2 Student B cannot read Student A student_profile
  await runAs(adminClient, PERSONAS.studentB, async () => {
    const res = await adminClient.query(`SELECT id FROM public.student_profiles WHERE id = '${PERSONAS.studentA.id}'`);
    testResults.push({
      suite: '4. Student Profile Privacy',
      testId: '4.2',
      testName: 'Student B cannot read Student A student profile',
      persona: 'Student B (SRKR)',
      operation: 'SELECT',
      expected: '0 rows returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 0 ? 'PASS' : 'FAIL'
    });
  });

  // 4.3 College B staff cannot read Student A student_profile (Cross-College Blocked)
  await runAs(adminClient, PERSONAS.staffB, async () => {
    const res = await adminClient.query(`SELECT id FROM public.student_profiles WHERE id = '${PERSONAS.studentA.id}'`);
    testResults.push({
      suite: '4. Student Profile Privacy',
      testId: '4.3',
      testName: 'College B staff cannot read College A student profile',
      persona: 'Staff B (VITB)',
      operation: 'SELECT',
      expected: '0 rows returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 0 ? 'PASS' : 'FAIL'
    });
  });

  // 4.4 Same-college staff CAN read Student A student_profile
  await runAs(adminClient, PERSONAS.staffA, async () => {
    const res = await adminClient.query(`SELECT id FROM public.student_profiles WHERE id = '${PERSONAS.studentA.id}'`);
    testResults.push({
      suite: '4. Student Profile Privacy',
      testId: '4.4',
      testName: 'College A staff can read same-college student profile',
      persona: 'Staff A (SRKR)',
      operation: 'SELECT',
      expected: '1 row returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 1 ? 'PASS' : 'FAIL'
    });
  });

  // SUITE 5: Safe Box Private Notes
  // 5.1 Student A reads own note
  await runAs(adminClient, PERSONAS.studentA, async () => {
    const res = await adminClient.query(`SELECT * FROM public.safe_box_private_notes WHERE evidence_id = '${evAId}'`);
    testResults.push({
      suite: '5. Safe Box Private Notes',
      testId: '5.1',
      testName: 'Student A reads own Safe Box note',
      persona: 'Student A (SRKR)',
      operation: 'SELECT',
      expected: '1 row returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 1 ? 'PASS' : 'FAIL'
    });
  });

  // 5.2 Student B cannot read Student A note
  await runAs(adminClient, PERSONAS.studentB, async () => {
    const res = await adminClient.query(`SELECT * FROM public.safe_box_private_notes WHERE evidence_id = '${evAId}'`);
    testResults.push({
      suite: '5. Safe Box Private Notes',
      testId: '5.2',
      testName: 'Student B cannot read Student A Safe Box note',
      persona: 'Student B (SRKR)',
      operation: 'SELECT',
      expected: '0 rows returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 0 ? 'PASS' : 'FAIL'
    });
  });

  // 5.3 Staff A cannot read Student A note
  await runAs(adminClient, PERSONAS.staffA, async () => {
    const res = await adminClient.query(`SELECT * FROM public.safe_box_private_notes WHERE evidence_id = '${evAId}'`);
    testResults.push({
      suite: '5. Safe Box Private Notes',
      testId: '5.3',
      testName: 'Campus Staff cannot read Safe Box note',
      persona: 'Staff A (SRKR)',
      operation: 'SELECT',
      expected: '0 rows returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 0 ? 'PASS' : 'FAIL'
    });
  });

  // 5.4 HOD A cannot read Student A note
  await runAs(adminClient, PERSONAS.hodA, async () => {
    const res = await adminClient.query(`SELECT * FROM public.safe_box_private_notes WHERE evidence_id = '${evAId}'`);
    testResults.push({
      suite: '5. Safe Box Private Notes',
      testId: '5.4',
      testName: 'HOD cannot read Safe Box note',
      persona: 'HOD A (SRKR)',
      operation: 'SELECT',
      expected: '0 rows returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 0 ? 'PASS' : 'FAIL'
    });
  });

  // 5.5 Principal A cannot read Student A note
  await runAs(adminClient, PERSONAS.principalA, async () => {
    const res = await adminClient.query(`SELECT * FROM public.safe_box_private_notes WHERE evidence_id = '${evAId}'`);
    testResults.push({
      suite: '5. Safe Box Private Notes',
      testId: '5.5',
      testName: 'Principal cannot read Safe Box note',
      persona: 'Principal A (SRKR)',
      operation: 'SELECT',
      expected: '0 rows returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 0 ? 'PASS' : 'FAIL'
    });
  });

  // 5.6 Admin A cannot read Student A note
  await runAs(adminClient, PERSONAS.adminA, async () => {
    const res = await adminClient.query(`SELECT * FROM public.safe_box_private_notes WHERE evidence_id = '${evAId}'`);
    testResults.push({
      suite: '5. Safe Box Private Notes',
      testId: '5.6',
      testName: 'Campus Admin cannot read Safe Box note',
      persona: 'Admin A (SRKR)',
      operation: 'SELECT',
      expected: '0 rows returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 0 ? 'PASS' : 'FAIL'
    });
  });

  // 5.7 Student B unauthorized update on Student A note
  await runAs(adminClient, PERSONAS.studentB, async () => {
    const res = await adminClient.query(`UPDATE public.safe_box_private_notes SET private_note = 'Tampered' WHERE evidence_id = '${evAId}'`);
    testResults.push({
      suite: '5. Safe Box Private Notes',
      testId: '5.7',
      testName: 'Student B cannot update Student A Safe Box note',
      persona: 'Student B (SRKR)',
      operation: 'UPDATE',
      expected: '0 rows affected',
      actual: `${res.rowCount} row(s) affected`,
      status: res.rowCount === 0 ? 'PASS' : 'FAIL'
    });
  });

  // SUITE 6: Administrative Boundaries
  // 6.1 Campus Admin A cannot modify Student C's tenant/profile
  await runAs(adminClient, PERSONAS.adminA, async () => {
    const res = await adminClient.query(`UPDATE public.profiles SET full_name = 'Modified by SRKR Admin' WHERE id = '${PERSONAS.studentC.id}'`);
    testResults.push({
      suite: '6. Administrative Boundaries',
      testId: '6.1',
      testName: 'Campus Admin A cannot modify College B student profile',
      persona: 'Admin A (SRKR)',
      operation: 'UPDATE',
      expected: '0 rows affected',
      actual: `${res.rowCount} row(s) affected`,
      status: res.rowCount === 0 ? 'PASS' : 'FAIL'
    });
  });

  // 6.2 Super Admin can oversee College A and College B incidents
  await runAs(adminClient, PERSONAS.superAdmin, async () => {
    const res = await adminClient.query(`SELECT id FROM public.incidents WHERE id IN ('${incAId}', '${incCId}')`);
    testResults.push({
      suite: '6. Administrative Boundaries',
      testId: '6.2',
      testName: 'Super Admin can oversee both College A and College B incidents',
      persona: 'Super Admin',
      operation: 'SELECT',
      expected: '2 rows returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 2 ? 'PASS' : 'FAIL'
    });
  });

  // SUITE 7: Anonymous Access
  // 7.1 Anonymous reads incidents
  await runAs(adminClient, null, async () => {
    const res = await adminClient.query(`SELECT id FROM public.incidents`);
    testResults.push({
      suite: '7. Anonymous Access',
      testId: '7.1',
      testName: 'Anonymous user cannot read incidents',
      persona: 'Anonymous',
      operation: 'SELECT',
      expected: '0 rows returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 0 ? 'PASS' : 'FAIL'
    });
  });

  // 7.2 Anonymous reads profiles
  await runAs(adminClient, null, async () => {
    const res = await adminClient.query(`SELECT id FROM public.profiles`);
    testResults.push({
      suite: '7. Anonymous Access',
      testId: '7.2',
      testName: 'Anonymous user cannot read profiles',
      persona: 'Anonymous',
      operation: 'SELECT',
      expected: '0 rows returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 0 ? 'PASS' : 'FAIL'
    });
  });

  // 7.3 Anonymous reads evidence
  await runAs(adminClient, null, async () => {
    const res = await adminClient.query(`SELECT id FROM public.evidence`);
    testResults.push({
      suite: '7. Anonymous Access',
      testId: '7.3',
      testName: 'Anonymous user cannot read evidence',
      persona: 'Anonymous',
      operation: 'SELECT',
      expected: '0 rows returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 0 ? 'PASS' : 'FAIL'
    });
  });

  // 7.4 Anonymous reads Safe Box notes
  await runAs(adminClient, null, async () => {
    const res = await adminClient.query(`SELECT * FROM public.safe_box_private_notes`);
    testResults.push({
      suite: '7. Anonymous Access',
      testId: '7.4',
      testName: 'Anonymous user cannot read Safe Box notes',
      persona: 'Anonymous',
      operation: 'SELECT',
      expected: '0 rows returned',
      actual: `${res.rows.length} row(s) returned`,
      status: res.rows.length === 0 ? 'PASS' : 'FAIL'
    });
  });

  // CLEANUP SYNTHETIC TEST DATA
  console.log('--- CLEANING UP SYNTHETIC TEST DATA ---');
  await adminClient.query(`DELETE FROM public.safe_box_private_notes WHERE evidence_id IN ('${evAId}', '${evCId}')`);
  await adminClient.query(`DELETE FROM public.evidence WHERE id IN ('${evAId}', '${evCId}')`);
  await adminClient.query(`DELETE FROM public.incident_locations WHERE incident_id IN ('${incAId}', '${incCId}')`);
  await adminClient.query(`DELETE FROM public.incidents WHERE id IN ('${incAId}', '${incCId}')`);
  await adminClient.query(`
    DO $$ BEGIN
      PERFORM set_config('storage.allow_delete_query', 'true', true);
      DELETE FROM storage.objects WHERE id IN ('b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000004');
    END $$;
  `);

  const personaIds = Object.values(PERSONAS).map(p => `'${p.id}'`).join(',');
  await adminClient.query(`DELETE FROM public.student_profiles WHERE id IN (${personaIds})`);
  await adminClient.query(`DELETE FROM public.staff_profiles WHERE id IN (${personaIds})`);
  await adminClient.query(`DELETE FROM public.profiles WHERE id IN (${personaIds})`);
  await adminClient.query(`DELETE FROM auth.users WHERE id IN (${personaIds})`);

  // Write Test Results
  fs.writeFileSync('scripts/phase15k_authenticated_results.json', JSON.stringify(testResults, null, 2));

  const passCount = testResults.filter(t => t.status === 'PASS').length;
  console.log(`\n=================================================`);
  console.log(`PHASE 15K TEST SUMMARY: ${passCount} / ${testResults.length} TESTS PASSED`);
  console.log(`=================================================`);
  for (const t of testResults) {
    console.log(`[${t.status}] ${t.testId} - ${t.testName} (${t.persona}) => ${t.actual}`);
  }

  await adminClient.end();
}

runPhase15KTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
