import { Client } from 'pg';

async function checkStorageFns() {
  const client = new Client({ connectionString: 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres' });
  await client.connect();
  const res = await client.query("SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'storage'");
  console.log('storage routines:', res.rows.map(r => r.routine_name));
  await client.end();
}
checkStorageFns();

