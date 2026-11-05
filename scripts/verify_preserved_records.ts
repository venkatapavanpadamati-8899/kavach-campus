import { Client } from 'pg';

async function verify() {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
  await client.connect();

  const profiles = await client.query('SELECT count(*) as count FROM profiles');
  const incidents = await client.query('SELECT count(*) as count FROM incidents');
  const logs = await client.query('SELECT count(*) as count FROM audit_logs');
  const colleges = await client.query('SELECT count(*) as count FROM colleges');

  console.log('Profiles count:', profiles.rows[0].count);
  console.log('Incidents count:', incidents.rows[0].count);
  console.log('Audit logs count:', logs.rows[0].count);
  console.log('Colleges count:', colleges.rows[0].count);

  await client.end();
}

verify().catch(console.error);

