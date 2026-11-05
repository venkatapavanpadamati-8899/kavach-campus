const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function main() {
  await client.connect();
  // Check if profiles table in public schema has profile_photo_path
  const colRes = await client.query(`
    SELECT table_schema, table_name, column_name 
    FROM information_schema.columns 
    WHERE column_name = 'profile_photo_path';
  `);
  console.log('Columns matching profile_photo_path:', colRes.rows);

  // Check PostgREST reload
  await client.query("NOTIFY pgrst, 'reload schema';");
  await client.query("NOTIFY pgrst, 'reload config';");
  console.log('Notified pgrst');
  await client.end();
}
main().catch(console.error);

