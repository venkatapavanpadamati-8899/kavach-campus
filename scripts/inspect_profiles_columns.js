const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});
async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles'
    ORDER BY ordinal_position;
  `);
  console.log('Columns in public.profiles:');
  res.rows.forEach(r => console.log(`- ${r.column_name}: ${r.data_type}`));
  await client.end();
}
run().catch(console.error);

