import { Client } from 'pg';

async function testTrigger() {
  const client = new Client({ connectionString: 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres' });
  await client.connect();

  const studentAId = 'f1000000-0000-0000-0000-000000000001';

  // Provision studentA
  await client.query(`
    INSERT INTO auth.users (id, email, role, created_at, updated_at)
    VALUES ('${studentAId}', 'student.a@srkr.test.local', 'authenticated', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.profiles (id, full_name, role, college_id)
    VALUES ('${studentAId}', 'Student A', 'STUDENT', 'srkr-bhimavaram')
    ON CONFLICT (id) DO UPDATE SET role = 'STUDENT', college_id = 'srkr-bhimavaram';
  `);

  // As student A, try to escalate OWN role
  await client.query('BEGIN');
  await client.query("SET LOCAL ROLE = 'authenticated'");
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${studentAId}'`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated'`);
  await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${studentAId}", "role": "authenticated"}'`);

  let selfEscalateBlocked = false;
  try {
    await client.query(`UPDATE public.profiles SET role = 'ADMIN' WHERE id = '${studentAId}'`);
  } catch (e: any) {
    selfEscalateBlocked = true;
    console.log('Self-role escalation blocked by trigger:', e.message);
  }
  await client.query('ROLLBACK');

  // As student A, try to change OWN college_id
  await client.query('BEGIN');
  await client.query("SET LOCAL ROLE = 'authenticated'");
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${studentAId}'`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated'`);
  await client.query(`SET LOCAL "request.jwt.claims" = '{"sub": "${studentAId}", "role": "authenticated"}'`);

  let selfCollegeBlocked = false;
  try {
    await client.query(`UPDATE public.profiles SET college_id = 'vishnu-bhimavaram' WHERE id = '${studentAId}'`);
  } catch (e: any) {
    selfCollegeBlocked = true;
    console.log('Self-college change blocked by trigger:', e.message);
  }
  await client.query('ROLLBACK');

  // Clean up
  await client.query(`DELETE FROM public.profiles WHERE id = '${studentAId}'`);
  await client.query(`DELETE FROM auth.users WHERE id = '${studentAId}'`);

  console.log('Results:', { selfEscalateBlocked, selfCollegeBlocked });
  await client.end();
}

testTrigger();

