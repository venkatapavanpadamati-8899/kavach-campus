import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const adminClient = createClient(url, serviceRoleKey);

async function testTriggerAndRLS() {
  console.log('=== TESTING TRIGGER trg_prevent_student_self_verification ON LIVE SUPABASE ===');

  const testEmail = `test.student.${Date.now()}@kavachcampus.test`;
  const testPassword = 'TestPassword123!Safe';

  // 1. Create synthetic student in auth.users
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    console.log('Failed to create user:', authError?.message);
    return;
  }

  const userId = authData.user.id;

  try {
    // 2. Create profile & student_profile as PENDING_VERIFICATION
    await adminClient.from('profiles').insert({
      id: userId,
      full_name: 'Synthetic Self-Verify Tester',
      college_email: testEmail,
      role: 'STUDENT',
      student_id: 'STU' + Date.now().toString().slice(-6),
      is_approved: true,
    });

    await adminClient.from('student_profiles').insert({
      id: userId,
      admission_type: 'REGULAR',
      admission_year: 2024,
      expected_graduation_year: 2028,
      verification_status: 'PENDING_VERIFICATION',
    });

    console.log('✅ Student record seeded with PENDING_VERIFICATION.');

    // 3. Log in AS the student client using anonKey
    const studentClient = createClient(url, anonKey);
    const { data: loginData, error: loginError } = await studentClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (loginError) {
      console.log('Student login error:', loginError.message);
    } else {
      console.log('✅ Student client authenticated successfully with own JWT.');

      // 4. Student attempts to SELF-APPROVE to 'VERIFIED'
      console.log('Student attempting to escalate verification_status to VERIFIED...');
      const { data: updateData, error: updateError } = await studentClient
        .from('student_profiles')
        .update({ verification_status: 'VERIFIED' })
        .eq('id', userId)
        .select();

      if (updateError) {
        console.log('🛡️ RLS/Trigger BLOCKED student self-verification! Error:', updateError.message);
        console.log('✅ PASS: Student self-verification blocked securely on live database.');
      } else {
        // Did the row actually change to VERIFIED?
        const { data: checkData } = await adminClient.from('student_profiles').select('verification_status').eq('id', userId).single();
        if (checkData?.verification_status === 'VERIFIED') {
          console.log('🚨 VULNERABILITY! Student was able to self-approve to VERIFIED.');
        } else {
          console.log('🛡️ UPDATE silently rejected by RLS (0 rows updated). verification_status is still:', checkData?.verification_status);
          console.log('✅ PASS: Student cannot escalate status to VERIFIED.');
        }
      }
    }

  } finally {
    // Clean up
    console.log('Cleaning up synthetic test user...');
    await adminClient.from('student_profiles').delete().eq('id', userId);
    await adminClient.from('profiles').delete().eq('id', userId);
    await adminClient.auth.admin.deleteUser(userId);
    console.log('✅ Cleanup complete.');
  }
}

testTriggerAndRLS().catch(console.error);
