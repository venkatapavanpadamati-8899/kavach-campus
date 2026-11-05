const { Client } = require('pg');

const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });

async function check() {
  await client.connect();
  const res = await client.query(`
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND column_name LIKE '%college%'
    ORDER BY table_name, column_name;
  `);
  console.log('Columns containing college:');
  console.table(res.rows);

  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('All public tables:');
  console.log(tablesRes.rows.map(r => r.table_name));

  await client.end();
}

check().catch(console.error);

