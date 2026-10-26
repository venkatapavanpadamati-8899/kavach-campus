import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export interface TestUser {
  id: string;
  email: string;
  password: string;
  role: string;
  collegeId: string;
}

export async function createTestUser(role: string, isApproved = true, isStudentVerified = true): Promise<TestUser> {
  const timestamp = Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
  const email = `e2e.${role.toLowerCase()}.${timestamp}@kavachcampus.test`;
  const password = `TestPass123!${role}`;
  const fullName = `E2E Test ${role}`;
  const collegeId = 'srkr-bhimavaram';

  // 1. Create auth user
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role,
      full_name: fullName,
      college_id: collegeId,
    },
  });

  if (authError || !authData?.user) {
    throw new Error(`Failed to create test auth user: ${authError?.message}`);
  }

  const userId = authData.user.id;

  // 2. Insert into profiles table
  const { error: profileError } = await adminClient.from('profiles').insert({
    id: userId,
    full_name: fullName,
    college_email: email,
    role,
    college_id: collegeId,
    is_approved: isApproved,
  });

  if (profileError) {
    await adminClient.auth.admin.deleteUser(userId);
    throw new Error(`Failed to create test profile: ${profileError.message}`);
  }

  // 3. If role is STUDENT, optionally insert verified student_profile
  if (role === 'STUDENT' && isStudentVerified) {
    const { error: spError } = await adminClient.from('student_profiles').insert({
      id: userId,
      admission_year: 2024,
      expected_graduation_year: 2028,
      admission_type: 'REGULAR',
      verification_status: 'VERIFIED',
    });
    if (spError) {
      console.error('Failed to create student_profile:', spError);
    }
  }

  return { id: userId, email, password, role, collegeId };
}

export async function getPlaywrightCookiesForUser(email: string, password: string) {
  const cookieMap = new Map<string, string>();

  const client = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return Array.from(cookieMap.entries()).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => cookieMap.set(name, value));
      },
    },
  });

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`Failed to sign in test user: ${error.message}`);
  }

  return Array.from(cookieMap.entries()).map(([name, value]) => ({
    name,
    value,
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax' as const,
  }));
}

export async function cleanupTestUsers(userIds: string[]) {
  for (const userId of userIds) {
    try {
      await adminClient.from('safe_walk_sessions').delete().eq('user_id', userId);
      await adminClient.from('sos_alerts').delete().eq('user_id', userId);
      await adminClient.from('incidents').delete().eq('reporter_id', userId);
      await adminClient.from('student_profiles').delete().eq('id', userId);
      await adminClient.from('profiles').delete().eq('id', userId);
      await adminClient.auth.admin.deleteUser(userId);
    } catch {
      // Ignore cleanup individual failures
    }
  }
}
