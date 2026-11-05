import { Client } from 'pg';
import * as fs from 'fs';

async function detailedAudit() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  await client.connect();

  const tables = ['incidents', 'incident_locations', 'evidence', 'student_profiles', 'incident_messages', 'profiles', 'staff_locations', 'safe_box_private_notes'];
  
  const detailed: any[] = [];
  for (const table of tables) {
    const res = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = $1
      ORDER BY policyname
    `, [table]);
    detailed.push({ table, count: res.rows.length, policies: res.rows });
  }

  const storageRes = await client.query(`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    ORDER BY policyname
  `);
  detailed.push({ table: 'storage.objects', count: storageRes.rows.length, policies: storageRes.rows });

  fs.writeFileSync('scripts/phase15k_detailed_policies.json', JSON.stringify(detailed, null, 2));
  console.log('Detailed policy audit written to scripts/phase15k_detailed_policies.json');
  for (const item of detailed) {
    console.log(`\nTable: ${item.table} (${item.count} policies)`);
    for (const p of item.policies) {
      console.log(`  - "${p.policyname}" [${p.cmd}] (${p.permissive})`);
      if (p.qual) console.log(`      USING: ${p.qual}`);
      if (p.with_check) console.log(`      WITH CHECK: ${p.with_check}`);
    }
  }

  await client.end();
}

detailedAudit().catch(err => {
  console.error(err);
  process.exit(1);
});

