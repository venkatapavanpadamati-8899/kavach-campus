import { Client } from 'pg';

async function check() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
  await client.connect();

  const cols = await client.query(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'colleges' 
    ORDER BY ordinal_position;
  `);
  console.log('Columns in public.colleges:');
  console.table(cols.rows);

  const countRes = await client.query('SELECT count(*) FROM colleges');
  console.log('Count in colleges table:', countRes.rows[0].count);

  const sample = await client.query('SELECT id, name, code, district FROM colleges LIMIT 5');
  console.log('Sample rows:');
  console.table(sample.rows);

  await client.end();
}

check().catch(console.error);

