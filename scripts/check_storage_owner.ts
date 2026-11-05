import { Client } from 'pg';

async function run() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
  await client.connect();
  const res = await client.query("SELECT tableowner, rowsecurity FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects'");
  console.log('storage.objects owner and rls:', res.rows);
  const roles = await client.query("SELECT rolname, rolsuper FROM pg_roles WHERE rolname IN ('postgres', 'supabase_admin', 'supabase_storage_admin')");
  console.log('roles:', roles.rows);
  await client.end();
}
run().catch(console.error);

