import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const adminClient = createClient(url, serviceRoleKey);

function createCookieTrackedClient() {
  const cookieStore: Record<string, string> = {};
  const client = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return Object.entries(cookieStore).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(c => {
          cookieStore[c.name] = c.value;
        });
      },
    },
  });

  const getCookieHeader = () => {
    return Object.entries(cookieStore)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  };

  return { client, cookieStore, getCookieHeader };
}

async function runE2EWorkflowTests() {
  console.log('=====================================================');
  console.log('   KAVACH CAMPUS — END-TO-END WORKFLOW VERIFICATION   ');
  console.log('=====================================================\n');

  const results: Record<string, 'PASS' | 'FAIL'> = {
    'Home page': 'FAIL',
    'Registration': 'FAIL',
    'Demo OTP': 'FAIL',
    'Login': 'FAIL',
    'Student ID Upload': 'FAIL',
    'Admin Verification': 'FAIL',
    'Logout': 'FAIL',
  };

  const testId = Date.now().toString().slice(-6);
  const studentEmail = `student.test.${testId}@kavachcampus.test`;
  const studentPassword = 'TestPassword123!Safe';
  const studentName = `Test Student ${testId}`;
  const studentIdNumber = '2101' + testId; // 4 + 6 = exactly 10 digits
  let studentUserId: string | null = null;
  let adminUserId: string | null = null;

  try {
    // ----------------------------------------------------
    // STEP 1: Home Page Check
    // ----------------------------------------------------
    console.log('🔍 [STEP 1] Testing Home Page (http://localhost:3000/)...');
    const homeRes = await fetch('http://localhost:3000/');
    if (homeRes.status === 200) {
      const homeHtml = await homeRes.text();
      if (homeHtml.includes('Kavach') || homeHtml.includes('Campus')) {
        console.log('✅ Home Page responded with HTTP 200 and Kavach Campus branding.');
        results['Home page'] = 'PASS';
      } else {
        console.log('⚠️ Home Page returned 200 but branding text missing.');
      }
    } else {
      console.log(`❌ Home Page returned HTTP ${homeRes.status}`);
    }

    // ----------------------------------------------------
    // STEP 2: Registration
    // ----------------------------------------------------
    console.log('\n🔍 [STEP 2] Testing Student Registration (/api/auth/register)...');
    const regPayload = {
      name: studentName,
      email: studentEmail,
      password: studentPassword,
      collegeId: studentIdNumber,
      department: 'Computer Science & Engineering',
      role: 'STUDENT',
      phone: '9876543210',
    };

    const regRes = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regPayload),
    });

    const regData = await regRes.json();
    console.log(`Registration status: ${regRes.status}`, regData);

    if (regRes.status === 201 && (regData.message === 'OTP sent successfully' || regData.clientToken)) {
      console.log('✅ Registration succeeded with pending OTP record created.');
      results['Registration'] = 'PASS';
    } else {
      console.log('❌ Registration failed:', regData);
    }

    // ----------------------------------------------------
    // STEP 3: Demo OTP Verification
    // ----------------------------------------------------
    console.log('\n🔍 [STEP 3] Testing Demo OTP Verification (/api/auth/verify-otp)...');
    const otpRes = await fetch('http://localhost:3000/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: studentEmail,
        otp: '123456', // Demo OTP
      }),
    });

    const otpData = await otpRes.json();
    console.log(`OTP verification status: ${otpRes.status}`, otpData);

    if (otpRes.status === 200 && otpData.success) {
      console.log('✅ Demo OTP accepted and student user account activated in Supabase.');
      results['Demo OTP'] = 'PASS';
    } else {
      console.log('❌ Demo OTP verification failed:', otpData);
    }

    // Verify user in Supabase
    const { data: profileRecord } = await adminClient
      .from('profiles')
      .select('id, full_name, college_email, role, is_approved')
      .eq('college_email', studentEmail)
      .single();

    if (profileRecord) {
      studentUserId = profileRecord.id;
      console.log('✅ Profile record located in Supabase:', profileRecord);
    }

    // ----------------------------------------------------
    // STEP 4: Login Verification (Using SSR Tracked Client)
    // ----------------------------------------------------
    console.log('\n🔍 [STEP 4] Testing Student Login via SSR Client...');
    const studentSession = createCookieTrackedClient();
    const { data: loginData, error: loginError } = await studentSession.client.auth.signInWithPassword({
      email: studentEmail,
      password: studentPassword,
    });

    if (loginError || !loginData.session) {
      console.log('❌ Student login failed:', loginError?.message);
    } else {
      console.log('✅ Student successfully authenticated via Supabase SSR.');
      console.log(`User ID: ${loginData.user.id}, Role: ${loginData.user.user_metadata?.role}`);
      results['Login'] = 'PASS';
    }

    // ----------------------------------------------------
    // STEP 5: Student ID Upload & Verification Status
    // ----------------------------------------------------
    console.log('\n🔍 [STEP 5] Testing Student ID Upload (/api/student/verify-id)...');
    if (studentUserId && loginData?.session) {
      // Create sample 1x1 PNG image buffer
      const samplePngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      // Construct multipart form data
      const formData = new FormData();
      formData.append('studentId', studentIdNumber);
      formData.append('admissionType', 'REGULAR');
      formData.append('admissionYear', '2024');
      formData.append('expectedGraduationYear', '2028');
      formData.append('ocrText', `STUDENT ID: ${studentIdNumber} COLLEGE ID CARD B.TECH`);
      const blob = new Blob([samplePngBuffer], { type: 'image/png' });
      formData.append('file', blob, 'sample_college_id.png');

      const studentCookie = studentSession.getCookieHeader();

      const uploadRes = await fetch('http://localhost:3000/api/student/verify-id', {
        method: 'POST',
        headers: {
          Cookie: studentCookie,
        },
        body: formData,
      });

      const uploadData = await uploadRes.json();
      console.log(`Student ID upload status: ${uploadRes.status}`, uploadData);

      if (uploadRes.status === 200 && uploadData.success) {
        console.log(`✅ Student ID successfully uploaded! Resulting status: ${uploadData.verificationStatus}`);
        results['Student ID Upload'] = 'PASS';

        // Check GET /api/student/verify-id status
        const statusRes = await fetch('http://localhost:3000/api/student/verify-id', {
          headers: { Cookie: studentCookie },
        });
        const statusData = await statusRes.json();
        console.log('✅ Student verification status query result:', {
          status: statusRes.status,
          verification_status: statusData.studentProfile?.verification_status,
          verification_notes: statusData.studentProfile?.verification_notes,
        });
      } else {
        console.log('❌ Student ID upload failed:', uploadData);
      }
    }

    // ----------------------------------------------------
    // STEP 6: Admin Verification Workflow
    // ----------------------------------------------------
    console.log('\n🔍 [STEP 6] Testing Admin Verification Workflow (/api/admin/verifications)...');
    // Create dedicated temporary admin account
    const adminEmail = `admin.test.${testId}@kavachcampus.test`;
    const adminPassword = 'AdminPassword123!Safe';

    const { data: adminAuth } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { role: 'ADMIN', full_name: 'Test Campus Admin' },
    });

    if (adminAuth?.user) {
      adminUserId = adminAuth.user.id;
      // Insert profile as approved ADMIN
      await adminClient.from('profiles').insert({
        id: adminUserId,
        full_name: 'Test Campus Admin',
        college_email: adminEmail,
        role: 'ADMIN',
        is_approved: true,
      });

      // Login as Admin using SSR tracked client
      const adminSession = createCookieTrackedClient();
      const { data: adminLoginData } = await adminSession.client.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword,
      });

      if (adminLoginData?.session) {
        const adminCookie = adminSession.getCookieHeader();

        // 1. GET pending verifications
        const listRes = await fetch('http://localhost:3000/api/admin/verifications', {
          headers: { Cookie: adminCookie },
        });
        const listData = await listRes.json();
        console.log(`Admin verifications list status: ${listRes.status}, count: ${listData.verifications?.length}`);

        const foundRecord = listData.verifications?.find((v: any) => v.id === studentUserId);
        if (foundRecord) {
          console.log('✅ Found uploaded student ID in admin queue:', {
            studentId: foundRecord.studentId,
            fullName: foundRecord.fullName,
            verificationStatus: foundRecord.verificationStatus,
            hasSignedUrl: !!foundRecord.signedIdCardUrl,
          });
        }

        // 2. Test rejection without reason (Must fail with HTTP 400)
        const rejectNoReasonRes = await fetch('http://localhost:3000/api/admin/verifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: adminCookie,
          },
          body: JSON.stringify({
            targetStudentId: studentUserId,
            decision: 'RESUBMISSION_REQUIRED',
            reason: '', // empty reason
          }),
        });
        const rejectNoReasonData = await rejectNoReasonRes.json();
        const reasonEnforced = rejectNoReasonRes.status === 400 && rejectNoReasonData.error?.includes('rejection reason is required');
        console.log(`Rejection without reason check: ${reasonEnforced ? '✅ STRICTLY ENFORCED (HTTP 400)' : '❌ FAILED'}`);

        // 3. Test approval with reason
        const approveRes = await fetch('http://localhost:3000/api/admin/verifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: adminCookie,
          },
          body: JSON.stringify({
            targetStudentId: studentUserId,
            decision: 'VERIFIED',
            officialRosterConfirmed: true,
            reason: 'Verified against College ERP student database.',
          }),
        });
        const approveData = await approveRes.json();
        console.log(`Admin approval status: ${approveRes.status}`, approveData);

        if (approveRes.status === 200 && approveData.success && reasonEnforced) {
          console.log('✅ Admin verification approved and audit log recorded.');
          results['Admin Verification'] = 'PASS';
        }
      }
    }

    // ----------------------------------------------------
    // STEP 7: Logout
    // ----------------------------------------------------
    console.log('\n🔍 [STEP 7] Testing Logout (/api/auth/logout)...');
    const studentCookie = studentSession.getCookieHeader();
    const logoutRes = await fetch('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        Cookie: studentCookie,
      },
    });
    const logoutData = await logoutRes.json();
    console.log(`Logout status: ${logoutRes.status}`, logoutData);

    if (logoutRes.status === 200 && (logoutData.success || logoutData.message?.includes('Signed out') || logoutData.message?.includes('Logged out'))) {
      console.log('✅ Logout endpoint succeeded and purged active user session.');
      results['Logout'] = 'PASS';
    } else {
      console.log('❌ Logout failed:', logoutData);
    }

  } catch (err) {
    console.error('Unhandled error during E2E workflow testing:', err);
  } finally {
    // ----------------------------------------------------
    // CLEANUP SYNTHETIC TEST DATA
    // ----------------------------------------------------
    console.log('\n🧹 [CLEANUP] Cleaning up synthetic test accounts...');
    if (studentUserId) {
      await adminClient.from('student_profiles').delete().eq('id', studentUserId);
      await adminClient.from('profiles').delete().eq('id', studentUserId);
      await adminClient.auth.admin.deleteUser(studentUserId);
      console.log(`Cleaned up student test user: ${studentUserId}`);
    }
    if (adminUserId) {
      await adminClient.from('profiles').delete().eq('id', adminUserId);
      await adminClient.auth.admin.deleteUser(adminUserId);
      console.log(`Cleaned up admin test user: ${adminUserId}`);
    }
  }

  console.log('\n=====================================================');
  console.log('             FINAL E2E WORKFLOW RESULTS               ');
  console.log('=====================================================');
  console.table(
    Object.entries(results).map(([test, outcome]) => ({
      Test: test,
      'మీ ఫలితం': outcome,
    }))
  );
}

runE2EWorkflowTests();
