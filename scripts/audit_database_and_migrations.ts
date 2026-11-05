import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

async function main() {
  console.log('--- PHASE 3: DATABASE AND MIGRATION AUDIT (LOCAL SUPABASE) ---');

  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  console.log(`Found ${files.length} total migration files in supabase/migrations:`);
  files.forEach(f => console.log(' - ' + f));

  // Inspect 009 to 019
  const targetMigrations = files.filter(f => {
    const num = parseInt(f.substring(0, 3), 10);
    return num >= 9 && num <= 19;
  });

  console.log('\nTarget migrations 009 to 019:');
  for (const m of targetMigrations) {
    const fullPath = path.join(migrationsDir, m);
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    const firstComment = lines.slice(0, 5).join(' ').replace(/\r/g, '');
    console.log(`\n=== Migration: ${m} (${content.length} bytes, ${lines.length} lines) ===`);
    console.log(`Header: ${firstComment.substring(0, 120)}...`);
  }

  // Connect to local PostgreSQL (read-only queries)
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });

  try {
    await client.connect();
    console.log('\nConnected to local PostgreSQL on 127.0.0.1:54322.');

    // 1. Check public tables count
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log(`\nLocal public tables (${tablesRes.rowCount}):`, tablesRes.rows.map(r => r.table_name).join(', '));

    // 2. Check active policies on public tables
    const policiesRes = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);
    console.log(`\nLocal active public policies count: ${policiesRes.rowCount}`);

    // Check for any legacy permissive leaks on incidents
    const legacyLeaks = policiesRes.rows.filter(p => p.policyname.toLowerCase().includes('authorized users'));
    console.log(`Legacy permissive leaks found: ${legacyLeaks.length}`);
    if (legacyLeaks.length > 0) {
      console.warn('LEAK FOUND:', legacyLeaks);
    } else {
      console.log('PASS: Zero legacy permissive leaks found in local policies.');
    }

    // 3. Check colleges and districts
    const collegesCountRes = await client.query(`SELECT count(*) FROM public.colleges;`);
    const districtsCountRes = await client.query(`SELECT count(*) FROM public.college_districts;`);
    console.log(`\nLocal public.colleges count: ${collegesCountRes.rows[0].count}`);
    console.log(`Local public.college_districts count: ${districtsCountRes.rows[0].count}`);

    // 4. Check data preservation
    const profilesRes = await client.query(`SELECT count(*) FROM public.profiles;`);
    const incidentsRes = await client.query(`SELECT count(*) FROM public.incidents;`);
    const auditRes = await client.query(`SELECT count(*) FROM public.audit_logs;`);
    console.log(`\nPreserved Data Counts (Local DB):`);
    console.log(` - public.profiles: ${profilesRes.rows[0].count}`);
    console.log(` - public.incidents: ${incidentsRes.rows[0].count}`);
    console.log(` - public.audit_logs: ${auditRes.rows[0].count}`);

  } catch (err: any) {
    console.error('Error connecting to local DB:', err.message);
  } finally {
    await client.end();
  }
}

main();

