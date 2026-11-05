import { Client } from 'pg';

async function checkDistricts() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
  await client.connect();

  const cols = await client.query(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'college_districts' 
    ORDER BY ordinal_position;
  `);
  console.log('Columns in public.college_districts:');
  console.table(cols.rows);

  const districts = await client.query('SELECT * FROM college_districts');
  console.log('Current college_districts:');
  console.table(districts.rows);

  await client.end();
}

checkDistricts().catch(console.error);

