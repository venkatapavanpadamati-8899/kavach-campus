import { Client } from 'pg';

async function checkProtectDelete() {
  const client = new Client({ connectionString: 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres' });
  await client.connect();
  const res = await client.query("SELECT prosrc FROM pg_proc WHERE proname = 'protect_delete'");
  console.log('protect_delete src:', res.rows[0]?.prosrc);
  await client.end();
}
checkProtectDelete();

