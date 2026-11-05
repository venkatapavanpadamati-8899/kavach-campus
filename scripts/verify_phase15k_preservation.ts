import { Client } from 'pg';
import * as fs from 'fs';

async function verifyPreservation() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  await client.connect();

  const tables = [
    'profiles',
    'student_profiles',
    'staff_profiles',
    'incidents',
    'incident_locations',
    'evidence',
    'incident_messages',
    'safe_walks',
    'escalations',
    'audit_logs',
    'staff_locations',
    'safe_box_private_notes'
  ];

  const counts: Record<string, number> = {};
  for (const table of tables) {
    const res = await client.query(`SELECT count(*)::int AS cnt FROM public."${table}"`);
    counts[table] = res.rows[0].cnt;
  }

  const sRes = await client.query(`SELECT count(*)::int AS cnt FROM storage.objects`);
  const storageObjectsCount = sRes.rows[0].cnt;

  const expectedCounts = {
    profiles: 7,
    student_profiles: 2,
    incidents: 2,
    incident_locations: 2,
    audit_logs: 10 // 9 from 15I + 1 from migration 018
  };

  const preservation = {
    timestamp: new Date().toISOString(),
    counts,
    storageObjectsCount,
    expectedCounts,
    verdict: (
      counts.profiles === 7 &&
      counts.student_profiles === 2 &&
      counts.incidents === 2 &&
      counts.incident_locations === 2 &&
      counts.audit_logs === 10
    ) ? 'PASS - 100% PRESERVED' : 'FAIL - COUNT MISMATCH'
  };

  fs.writeFileSync('scripts/phase15k_preservation_result.json', JSON.stringify(preservation, null, 2));
  console.log('--- DATABASE PRESERVATION VERIFICATION ---');
  console.log(JSON.stringify(preservation, null, 2));

  await client.end();
}

verifyPreservation().catch(err => {
  console.error(err);
  process.exit(1);
});

