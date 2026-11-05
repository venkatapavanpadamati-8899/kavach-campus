const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });

  try {
    await client.connect();
    console.log('Local Supabase DB Connection: SUCCESS');

    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log('Public tables count:', res.rows.length);
    console.log('Tables:', res.rows.map(r => r.table_name).join(', '));

    const pol = await client.query("SELECT count(*) FROM pg_policies WHERE schemaname = 'public'");
    console.log('Public RLS policies count:', pol.rows[0].count);

    const legacy = await client.query("SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND policyname LIKE 'Authorized users%'");
    console.log('Legacy leak policies count:', legacy.rows[0].count);

    const storageBuckets = await client.query("SELECT id, name, public FROM storage.buckets");
    console.log('Storage buckets count:', storageBuckets.rows.length);
    console.log('Buckets:', storageBuckets.rows.map(b => `${b.name} (public: ${b.public})`).join(', '));

    const counts = await client.query(`
      SELECT 
        (SELECT count(*) FROM public.profiles) as profiles_count,
        (SELECT count(*) FROM public.incidents) as incidents_count,
        (SELECT count(*) FROM public.audit_logs) as audit_logs_count,
        (SELECT count(*) FROM public.user_otp_verifications) as otp_count
    `);
    console.log('Preserved record counts:', counts.rows[0]);

    await client.end();
  } catch (err) {
    console.error('Local DB Connection Error:', err.message);
    process.exit(1);
  }
}

main();
