import { Client } from 'pg';
import * as fs from 'fs';

async function run() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
  await client.connect();

  const buckets = await client.query('SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets');
  
  const functions = await client.query(`
    SELECT routine_name, routine_type, data_type 
    FROM information_schema.routines 
    WHERE routine_schema = 'public'
    ORDER BY routine_name
  `);

  const triggers = await client.query(`
    SELECT event_object_table, trigger_name, action_timing, event_manipulation 
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name
  `);

  const policies = await client.query(`
    SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    ORDER BY tablename, policyname
  `);

  const data = {
    buckets: buckets.rows,
    functions: functions.rows,
    triggers: triggers.rows,
    policiesCount: policies.rows.length,
    policies: policies.rows
  };

  fs.writeFileSync('scripts/local_advanced_audit.json', JSON.stringify(data, null, 2));
  console.log('Audited advanced schema:');
  console.log(`Buckets: ${data.buckets.length}`);
  console.log(`Functions: ${data.functions.length}`);
  console.log(`Triggers: ${data.triggers.length}`);
  console.log(`Policies: ${data.policiesCount}`);

  await client.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

