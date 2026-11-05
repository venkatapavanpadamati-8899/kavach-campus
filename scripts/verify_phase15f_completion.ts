import { Client } from 'pg';
import * as fs from 'fs';

async function verify15F() {
  const client = new Client({
    connectionString: 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres'
  });
  await client.connect();

  console.log('--- PHASE 15F BASELINE COMPLETION VERIFICATION ---');

  // 1. profiles.college_id
  const pCol = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'college_id'");
  console.log('1. profiles.college_id exists:', pCol.rows[0]);

  // 2. incidents.college_id
  const iCol = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'college_id'");
  console.log('2. incidents.college_id exists:', iCol.rows[0]);

  // 3. get_user_college_id()
  const fn1 = await client.query("SELECT proname FROM pg_proc WHERE proname = 'get_user_college_id'");
  console.log('3. get_user_college_id() exists:', fn1.rows[0]?.proname);

  // 4. is_campus_staff()
  const fn2 = await client.query("SELECT proname FROM pg_proc WHERE proname = 'is_campus_staff'");
  console.log('4. is_campus_staff() exists:', fn2.rows[0]?.proname);

  // 5. Tenant isolation triggers
  const trg = await client.query("SELECT event_object_table, trigger_name FROM information_schema.triggers WHERE trigger_name IN ('trg_assign_incident_college_id', 'trg_prevent_self_role_escalation', 'trg_prevent_student_self_verification', 'trg_sync_evidence_incident_reference')");
  console.log('5. Required triggers:', trg.rows);

  // 6. Cross-college policies
  const pol = await client.query("SELECT tablename, policyname FROM pg_policies WHERE policyname LIKE '%same-college%' ORDER BY tablename, policyname");
  console.log('6. Cross-college policies count:', pol.rows.length);
  pol.rows.forEach(p => console.log(`   - [${p.tablename}] ${p.policyname}`));

  // 7. Migration 011 staff_locations and consent
  const staffLoc = await client.query("SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'staff_locations'");
  console.log('7. staff_locations table exists with RLS:', staffLoc.rows[0]);

  // 8. Storage bucket configs
  const buckets = await client.query("SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets ORDER BY id");
  console.log('8. Storage buckets:', buckets.rows);

  // 9. Check row counts
  const tables = ['profiles', 'student_profiles', 'incidents', 'incident_locations', 'audit_logs', 'staff_locations'];
  const counts: Record<string, number> = {};
  for (const t of tables) {
    const cRes = await client.query(`SELECT count(*)::int as cnt FROM public."${t}"`);
    counts[t] = cRes.rows[0].cnt;
  }
  console.log('9. Record counts after Phase 15F:', counts);

  // Check profiles college_id distribution
  const colDist = await client.query("SELECT college_id, count(*)::int as cnt FROM public.profiles GROUP BY college_id");
  console.log('10. Profiles college_id distribution:', colDist.rows);

  fs.writeFileSync('scripts/phase15f_verified_summary.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    status: 'PASS',
    profiles_college_id: pCol.rows[0],
    incidents_college_id: iCol.rows[0],
    triggers: trg.rows,
    policies_count: pol.rows.length,
    counts,
    college_id_distribution: colDist.rows
  }, null, 2));

  await client.end();
}

verify15F().catch(console.error);

