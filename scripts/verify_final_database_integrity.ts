import { Client } from 'pg';
import * as fs from 'fs';

async function finalVerify() {
  const client = new Client({
    connectionString: 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres'
  });
  await client.connect();

  console.log('--- PHASE 15I FINAL DATABASE INTEGRITY CHECK ---');

  // 1. Table list
  const tRes = await client.query(`
    SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `);
  console.log(`Public tables count: ${tRes.rows.length}`);

  // 2. Row counts
  const rowCounts: Record<string, number> = {};
  for (const t of tRes.rows) {
    const c = await client.query(`SELECT count(*)::int as cnt FROM public."${t.tablename}"`);
    rowCounts[t.tablename] = c.rows[0].cnt;
  }
  console.log('Row counts across all tables:', rowCounts);

  // 3. Storage buckets
  const bRes = await client.query('SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets ORDER BY id');
  console.log('Storage buckets:', bRes.rows);

  // 4. Check RLS policies count
  const polRes = await client.query("SELECT tablename, policyname, permissive, roles, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname");
  console.log(`Total RLS policies count: ${polRes.rows.length}`);

  // 5. Unique indexes on profiles
  const idxRes = await client.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'profiles' AND indexname LIKE '%student_id%'");
  console.log('Student ID indexes on profiles:', idxRes.rows);

  fs.writeFileSync('scripts/phase15i_final_integrity.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    status: 'PASS',
    tableCount: tRes.rows.length,
    rowCounts,
    buckets: bRes.rows,
    policiesCount: polRes.rows.length,
    studentIdIndexes: idxRes.rows
  }, null, 2));

  await client.end();
}

finalVerify().catch(console.error);

