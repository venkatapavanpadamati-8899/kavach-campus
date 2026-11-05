import { Client } from 'pg';

async function checkUsers() {
  const client = new Client({
    connectionString: 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres'
  });
  await client.connect();
  const res = await client.query('SELECT id, email, role FROM auth.users');
  console.log('auth.users:', res.rows);
  await client.end();
}
checkUsers().catch(console.error);

