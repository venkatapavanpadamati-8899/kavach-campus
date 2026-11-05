import { Client } from 'pg';
import * as fs from 'fs';

async function audit() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  await client.connect();

  // 1. Table Counts
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
    try {
      const res = await client.query(`SELECT count(*)::int AS cnt FROM public."${table}"`);
      counts[table] = res.rows[0].cnt;
    } catch (err: any) {
      counts[table] = -1; // table might not exist
    }
  }

  // Storage objects count
  let storageObjectsCount = 0;
  try {
    const sRes = await client.query(`SELECT count(*)::int AS cnt FROM storage.objects`);
    storageObjectsCount = sRes.rows[0].cnt;
  } catch (err: any) {
    storageObjectsCount = -1;
  }

  // 2. All RLS policies in public and storage schemas
  const policiesRes = await client.query(`
    SELECT
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
    ORDER BY schemaname, tablename, policyname;
  `);

  const policies = policiesRes.rows;

  const result = {
    timestamp: new Date().toISOString(),
    connectionUrl: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    counts,
    storageObjectsCount,
    totalPolicies: policies.length,
    policies
  };

  fs.writeFileSync('scripts/phase15k_pre_remediation_inventory.json', JSON.stringify(result, null, 2));
  console.log('--- PHASE 15K PRE-REMEDIATION AUDIT COMPLETED ---');
  console.log(`Table Counts:`, JSON.stringify(counts, null, 2));
  console.log(`Storage Objects Count: ${storageObjectsCount}`);
  console.log(`Total Policies: ${policies.length}`);

  // Specifically check for any legacy "Authorized users" policies
  const legacyPolicies = policies.filter((p: any) =>
    p.policyname.toLowerCase().includes('authorized') ||
    p.policyname.toLowerCase().includes('staff view incidents')
  );
  console.log(`Matching Legacy/Suspicious Policies (${legacyPolicies.length}):`);
  for (const p of legacyPolicies) {
    console.log(`- [${p.schemaname}.${p.tablename}] "${p.policyname}" (${p.cmd}, ${p.permissive}) roles: ${p.roles}`);
    console.log(`  USING: ${p.qual}`);
  }

  await client.end();
}

audit().catch(err => {
  console.error(err);
  process.exit(1);
});

