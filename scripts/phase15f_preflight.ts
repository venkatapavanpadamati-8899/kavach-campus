import { Client } from 'pg';
import * as fs from 'fs';

async function preflight() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  await client.connect();

  const tablesRes = await client.query(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `);
  const tables = tablesRes.rows.map(r => r.tablename);

  const rowCounts: Record<string, number> = {};
  for (const table of tables) {
    const countRes = await client.query(`SELECT count(*)::int as cnt FROM public."${table}"`);
    rowCounts[table] = countRes.rows[0].cnt;
  }

  const baselineData = {
    timestamp: new Date().toISOString(),
    connectionUrl: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    tableCount: tables.length,
    rowCounts
  };

  fs.writeFileSync('scripts/phase15f_baseline_counts.json', JSON.stringify(baselineData, null, 2));
  console.log('--- FRESH BASELINE RECORD COUNTS ---');
  console.log(JSON.stringify(baselineData, null, 2));

  await client.end();
}

preflight().catch(err => {
  console.error(err);
  process.exit(1);
});

