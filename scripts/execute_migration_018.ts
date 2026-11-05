import { Client } from 'pg';
import * as fs from 'fs';

async function executeMigration018() {
  const client = new Client({
    connectionString: 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres'
  });
  await client.connect();

  console.log('Connected to local Supabase as supabase_admin.');
  const sql = fs.readFileSync('supabase/migrations/018_legacy_rls_policy_remediation.sql', 'utf8');

  console.log('Executing migration 018...');
  await client.query(sql);
  console.log('Migration 018 executed successfully!');

  // Post-execution policy count
  const polRes = await client.query(`
    SELECT count(*)::int AS cnt FROM pg_policies WHERE schemaname IN ('public', 'storage')
  `);
  console.log(`Total policies remaining in public and storage: ${polRes.rows[0].cnt}`);

  // Check audit_logs count
  const auditRes = await client.query(`SELECT count(*)::int AS cnt FROM public.audit_logs`);
  console.log(`Audit logs count: ${auditRes.rows[0].cnt}`);

  await client.end();
}

executeMigration018().catch(err => {
  console.error('Migration 018 failed with error:', err);
  process.exit(1);
});

