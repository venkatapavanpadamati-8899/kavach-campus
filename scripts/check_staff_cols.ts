import { Client } from 'pg';

async function checkStaffCols() {
  const client = new Client({ connectionString: 'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres' });
  await client.connect();
  const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'staff_profiles'");
  console.log('staff_profiles columns:', res.rows);
  await client.end();
}
checkStaffCols();

