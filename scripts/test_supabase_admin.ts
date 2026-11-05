import { Client } from 'pg';

async function testRoles() {
  const passwords = ['postgres', 'root', 'admin'];
  for (const pw of passwords) {
    try {
      const client = new Client({ connectionString: `postgresql://supabase_admin:${pw}@127.0.0.1:54322/postgres` });
      await client.connect();
      console.log(`Connected as supabase_admin with password: ${pw}`);
      await client.end();
      return;
    } catch (e: any) {
      console.log(`Failed supabase_admin with ${pw}: ${e.message}`);
    }
  }
}
testRoles();

