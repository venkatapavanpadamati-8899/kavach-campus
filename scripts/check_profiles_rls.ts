import { createTestUser, adminClient } from '../tests/e2e/test-auth-helper';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function main() {
  const user = await createTestUser('STUDENT', true, true);
  console.log('User created:', user.id);

  // Sign in as this user to get their token
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false }
  });
  const { data: authRes, error: loginErr } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password
  });
  if (loginErr) {
    console.error('Login error:', loginErr);
    return;
  }
  console.log('Signed in successfully');

  // Query profiles table
  const { data: profile, error: profError } = await client
    .from('profiles')
    .select('id, full_name, college_email, student_id, role, department, year, phone, profile_photo_path')
    .eq('id', user.id)
    .single();

  console.log('Profile query result:', { profile, profError });

  // Let's check RLS policies on profiles table
  let policies: any = null;
  try {
    const res = await adminClient.rpc('execute_sql_read_only', {
      sql_query: "SELECT policyname, permissive, roles, cmd, qual FROM pg_policies WHERE tablename = 'profiles';"
    });
    policies = res.data;
  } catch {
    policies = null;
  }

  if (!policies) {
    // direct query
    try {
      const res = await adminClient.from('pg_policies').select('*').eq('tablename', 'profiles');
      console.log('Direct query policies:', res.data);
    } catch {
      // ignore
    }
  }

  await adminClient.auth.admin.deleteUser(user.id);
}

main().catch(console.error);

