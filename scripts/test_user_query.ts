import { createTestUser, adminClient } from '../tests/e2e/test-auth-helper';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function main() {
  const user = await createTestUser('STUDENT', true, true);
  console.log('Created user:', user.id);

  // Sign in as user
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false }
  });
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password
  });
  console.log('Login result:', { session: !!authData.session, authError });

  // Query profiles as authenticated student
  const authedClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${authData.session?.access_token}`
      }
    }
  });

  const { data: p, error: pe } = await authedClient
    .from('profiles')
    .select('id, full_name, college_email, student_id, role, department, year, phone, profile_photo_path')
    .eq('id', user.id)
    .single();

  console.log('Authed profile query:', { p, pe });

  await adminClient.auth.admin.deleteUser(user.id);
}

main().catch(console.error);

