import { Client } from 'pg';
import * as fs from 'fs';

async function test014() {
  const client = new Client({
    connectionString: 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres'
  });
  await client.connect();

  console.log('Connected as supabase_admin!');
  const sql = fs.readFileSync('supabase/migrations/014_cross_college_rls_hardening.sql', 'utf8');
  await client.query(sql);
  console.log('014 executed cleanly with supabase_admin!');

  // Verify functions
  const fnRes = await client.query("SELECT proname FROM pg_proc WHERE proname IN ('is_campus_staff', 'sync_evidence_incident_reference', 'prevent_self_role_escalation')");
  console.log('Functions verified:', fnRes.rows.map(r => r.proname));

  await client.end();
}

test014().catch(console.error);

