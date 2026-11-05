import { Client } from 'pg';

async function testIncidentRLS() {
  const client = new Client({ connectionString: 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres' });
  await client.connect();

  console.log('Testing without "Authorized users view incidents":');
  await client.query('BEGIN');

  // Drop the leftover legacy policy
  await client.query('DROP POLICY IF EXISTS "Authorized users view incidents" ON public.incidents');

  const adminAId = 'f1000000-0000-0000-0000-000000000007';
  const studentAId = 'f1000000-0000-0000-0000-000000000001';
  const studentCId = 'f1000000-0000-0000-0000-000000000003';

  const incidentSRKR = 'e1000000-0000-0000-0000-000000000001';
  const incidentVITB = 'e1000000-0000-0000-0000-000000000002';

  // Set up profiles and incidents
  await client.query(`
    INSERT INTO auth.users (id, email, role) VALUES 
      ('${adminAId}', 'admin@srkr.test', 'authenticated'),
      ('${studentAId}', 'studentA@srkr.test', 'authenticated'),
      ('${studentCId}', 'studentC@vitb.test', 'authenticated')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, full_name, role, college_id, is_approved, is_active) VALUES
      ('${adminAId}', 'Admin SRKR', 'ADMIN', 'srkr-bhimavaram', true, true),
      ('${studentAId}', 'Student A', 'STUDENT', 'srkr-bhimavaram', true, true),
      ('${studentCId}', 'Student C', 'STUDENT', 'vishnu-bhimavaram', true, true)
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, college_id = EXCLUDED.college_id;

    INSERT INTO public.incidents (id, case_id, student_id, college_id, category, description) VALUES
      ('${incidentSRKR}', 'CASE-SRKR-01', '${studentAId}', 'srkr-bhimavaram', 'Harassment', 'SRKR inc'),
      ('${incidentVITB}', 'CASE-VITB-01', '${studentCId}', 'vishnu-bhimavaram', 'Theft', 'VITB inc')
    ON CONFLICT (id) DO UPDATE SET college_id = EXCLUDED.college_id;
  `);

  // Query as Admin A (SRKR Admin)
  await client.query("SET LOCAL ROLE = 'authenticated'");
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${adminAId}'`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated'`);
  await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${adminAId}", "role": "authenticated"}'`);

  const res = await client.query(`SELECT id, college_id FROM public.incidents WHERE id IN ('${incidentSRKR}', '${incidentVITB}')`);
  console.log('Admin A query result without leftover policy:', res.rows);

  await client.query('ROLLBACK');
  await client.end();
}

testIncidentRLS().catch(console.error);
