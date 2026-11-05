import { Client } from 'pg';

async function checkPolicies() {
  const client = new Client({ connectionString: 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres' });
  await client.connect();

  const incPol = await client.query("SELECT policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'incidents'");
  console.log('--- INCIDENTS POLICIES ---');
  console.log(incPol.rows);

  const profPol = await client.query("SELECT policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'profiles'");
  console.log('--- PROFILES POLICIES ---');
  console.log(profPol.rows);

  await client.end();
}
checkPolicies();

