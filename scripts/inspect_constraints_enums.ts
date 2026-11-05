import { Client } from 'pg';
import * as fs from 'fs';

async function run() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
  await client.connect();

  const constraints = await client.query(`
    SELECT conname, contype, pg_get_constraintdef(c.oid) as def, conrelid::regclass as table_name
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'public'
    ORDER BY conrelid::regclass::text, conname
  `);

  const enums = await client.query(`
    SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) as values
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
  `);

  fs.writeFileSync('scripts/local_constraints_enums.json', JSON.stringify({
    constraints: constraints.rows,
    enums: enums.rows
  }, null, 2));

  console.log('Constraints count:', constraints.rows.length);
  console.log('Enums:', enums.rows);

  await client.end();
}

run().catch(console.error);

