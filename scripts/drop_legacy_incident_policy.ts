import { Client } from 'pg';

async function dropLegacy() {
  const client = new Client({ connectionString: 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres' });
  await client.connect();
  await client.query('DROP POLICY IF EXISTS "Authorized users view incidents" ON public.incidents');
  console.log('✔ Dropped legacy Authorized users view incidents policy on local DB.');
  await client.end();
}
dropLegacy().catch(console.error);

