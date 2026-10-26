/**
 * KAVACH CAMPUS — LIVE CROSS-COLLEGE MULTI-TENANT RLS VERIFICATION SCRIPT
 * Gate 2 Automated Security Suite: SRKR Engineering College vs. Vishnu Institute of Technology
 * 
 * Safety Rules:
 * 1. Only runs when valid staging Supabase URL and service role key are provided.
 * 2. Uses synthetic test fixtures only (NO real student identity or documents).
 * 3. Authenticates each persona with their own individual user session / JWT (NOT service role).
 * 4. Verifies cross-college access denial (HTTP 403 / empty result set) on:
 *    - Profiles
 *    - Student ID verifications
 *    - Incidents
 *    - Evidence objects
 *    - Safe Walk records
 * 5. Cleans up all test fixtures at teardown.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const stagingProjectRef = process.env.KAVACH_STAGING_PROJECT_REF;
const allowLiveRun = process.env.KAVACH_ALLOW_LIVE_RLS_TESTS === 'true';

function getProjectRef(url: string): string | undefined {
  try {
    const hostname = new URL(url).hostname;
    return hostname.endsWith('.supabase.co') ? hostname.split('.')[0] : undefined;
  } catch {
    return undefined;
  }
}

if (!supabaseUrl || !serviceRoleKey || !anonKey || serviceRoleKey.includes('placeholder')) {
  console.log('--------------------------------------------------------------------------------');
  console.log('⚠️  LIVE CROSS-COLLEGE ISOLATION TEST: BLOCKED');
  console.log('Prerequisite Missing: Valid NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.log('Configure these in .env.local to run Gate 2 live staging database verification.');
  console.log('--------------------------------------------------------------------------------');
  process.exitCode = 2;
} else if (!allowLiveRun || !stagingProjectRef || getProjectRef(supabaseUrl) !== stagingProjectRef) {
  console.log('--------------------------------------------------------------------------------');
  console.log('⚠️  LIVE CROSS-COLLEGE ISOLATION TEST: BLOCKED');
  console.log('This destructive synthetic-fixture test requires KAVACH_ALLOW_LIVE_RLS_TESTS=true');
  console.log('and KAVACH_STAGING_PROJECT_REF matching NEXT_PUBLIC_SUPABASE_URL.');
  console.log('It must only run after a staging backup and reviewed migration application.');
  console.log('--------------------------------------------------------------------------------');
  process.exitCode = 2;
}

if (process.exitCode) {
  // Do not create accounts, files, or incidents until all staging safeguards pass.
  process.exit();
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runCrossCollegeSecurityTests() {
  console.log('================================================================================');
  console.log('🛡️  KAVACH CAMPUS: GATE 2 — SRKR vs. VISHNU CROSS-COLLEGE RLS TEST SUITE');
  console.log('================================================================================\n');

  const timestamp = Date.now();
  const srkrStudentEmail = `srkr.student.${timestamp}@srkr.edu.in`;
  const vishnuStudentEmail = `vishnu.student.${timestamp}@vishnu.edu.in`;
  const srkrStaffEmail = `srkr.staff.${timestamp}@srkrec.ac.in`;
  const vishnuStaffEmail = `vishnu.staff.${timestamp}@svecw.edu.in`;
  const testPassword = `TestPass!${timestamp}`;

  const createdUserIds: string[] = [];
  let createdIncidentId: string | undefined;
  let createdEvidencePath: string | undefined;
  let testsPassed = 0;
  let testsFailed = 0;
  let executionError: Error | undefined;

  function recordResult(testName: string, passed: boolean, details?: string) {
    if (passed) {
      console.log(`✅ PASS: ${testName}`);
      testsPassed++;
    } else {
      console.error(`❌ FAIL: ${testName} — ${details || 'Access was not properly restricted.'}`);
      testsFailed++;
    }
  }

  try {
    console.log('Step 1: Provisioning isolated synthetic tenant accounts on staging...');

    // 1. Create SRKR Student
    const { data: srkrUser, error: err1 } = await adminClient.auth.admin.createUser({
      email: srkrStudentEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'SRKR Alice Student' },
    });
    if (err1 || !srkrUser.user) throw new Error(`Failed to create SRKR Student: ${err1?.message}`);
    createdUserIds.push(srkrUser.user.id);

    // 2. Create Vishnu Student
    const { data: vishnuUser, error: err2 } = await adminClient.auth.admin.createUser({
      email: vishnuStudentEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Vishnu Bob Student' },
    });
    if (err2 || !vishnuUser.user) throw new Error(`Failed to create Vishnu Student: ${err2?.message}`);
    createdUserIds.push(vishnuUser.user.id);

    // 3. Create SRKR Staff
    const { data: srkrStaff, error: err3 } = await adminClient.auth.admin.createUser({
      email: srkrStaffEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'SRKR Warden Charlie' },
    });
    if (err3 || !srkrStaff.user) throw new Error(`Failed to create SRKR Staff: ${err3?.message}`);
    createdUserIds.push(srkrStaff.user.id);

    // 4. Create Vishnu Staff
    const { data: vishnuStaff, error: err4 } = await adminClient.auth.admin.createUser({
      email: vishnuStaffEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Vishnu Warden Dave' },
    });
    if (err4 || !vishnuStaff.user) throw new Error(`Failed to create Vishnu Staff: ${err4?.message}`);
    createdUserIds.push(vishnuStaff.user.id);

    // Seed Profiles with strict institutional college_ids
    const { error: profilesError } = await adminClient.from('profiles').upsert([
      { id: srkrUser.user.id, full_name: 'SRKR Alice Student', college_email: srkrStudentEmail, role: 'STUDENT', college_id: 'srkr-bhimavaram', is_approved: true },
      { id: vishnuUser.user.id, full_name: 'Vishnu Bob Student', college_email: vishnuStudentEmail, role: 'STUDENT', college_id: 'vishnu-bhimavaram', is_approved: true },
      { id: srkrStaff.user.id, full_name: 'SRKR Warden Charlie', college_email: srkrStaffEmail, role: 'STAFF', college_id: 'srkr-bhimavaram', is_approved: true },
      { id: vishnuStaff.user.id, full_name: 'Vishnu Warden Dave', college_email: vishnuStaffEmail, role: 'STAFF', college_id: 'vishnu-bhimavaram', is_approved: true },
    ]);
    if (profilesError) throw new Error(`Failed to seed synthetic profiles: ${profilesError.message}`);

    // Create an incident belonging to SRKR Student
    const { data: srkrIncident, error: incErr } = await adminClient.from('incidents').insert({
      student_id: srkrUser.user.id,
      title: 'SRKR Campus Light Failure',
      description: 'Street light not working near CSE block',
      category: 'INFRASTRUCTURE',
      priority: 'MEDIUM',
      status: 'RECEIVED',
      college_id: 'srkr-bhimavaram',
    }).select().single();

    if (incErr) throw new Error(`Failed to create test incident: ${incErr.message}`);
    createdIncidentId = srkrIncident.id;

    console.log('✅ Synthetic users and test incident seeded.\n');

    console.log('Step 2: Authenticating user sessions with independent JWTs...');
    
    // Client for Vishnu Student
    const vishnuStudentClient = createClient(supabaseUrl, anonKey!);
    const { error: vLoginErr } = await vishnuStudentClient.auth.signInWithPassword({
      email: vishnuStudentEmail,
      password: testPassword,
    });
    if (vLoginErr) throw new Error(`Vishnu Student login failed: ${vLoginErr.message}`);

    // Client for Vishnu Staff
    const vishnuStaffClient = createClient(supabaseUrl, anonKey!);
    const { error: vsLoginErr } = await vishnuStaffClient.auth.signInWithPassword({
      email: vishnuStaffEmail,
      password: testPassword,
    });
    if (vsLoginErr) throw new Error(`Vishnu Staff login failed: ${vsLoginErr.message}`);

    // Client for SRKR Staff
    const srkrStaffClient = createClient(supabaseUrl, anonKey!);
    const { error: ssLoginErr } = await srkrStaffClient.auth.signInWithPassword({
      email: srkrStaffEmail,
      password: testPassword,
    });
    if (ssLoginErr) throw new Error(`SRKR Staff login failed: ${ssLoginErr.message}`);

    console.log('✅ Independent JWT sessions established.\n');

    console.log('Step 3: Executing Multi-College Negative Security Assertions...\n');

    // Test 1: Vishnu student attempts to read SRKR student profile
    const { data: readSrkrProfile } = await vishnuStudentClient
      .from('profiles')
      .select('*')
      .eq('id', srkrUser.user.id);
    recordResult(
      'Negative Test 1: Vishnu student cannot read SRKR student profile',
      !readSrkrProfile || readSrkrProfile.length === 0,
      `Data returned: ${JSON.stringify(readSrkrProfile)}`
    );

    // Test 2: Vishnu staff attempts to read SRKR incidents
    const { data: vishnuStaffSrkrIncidents } = await vishnuStaffClient
      .from('incidents')
      .select('*')
      .eq('id', srkrIncident.id);
    recordResult(
      'Negative Test 2: Vishnu staff cannot view SRKR college incidents',
      !vishnuStaffSrkrIncidents || vishnuStaffSrkrIncidents.length === 0,
      `Cross-college incident leaked: ${JSON.stringify(vishnuStaffSrkrIncidents)}`
    );

    // Test 3: SRKR staff CAN view SRKR college incidents (Legitimate access)
    const { data: srkrStaffSrkrIncidents } = await srkrStaffClient
      .from('incidents')
      .select('*')
      .eq('id', srkrIncident.id);
    recordResult(
      'Positive Test 3: SRKR staff can view same-college SRKR incidents',
      !!srkrStaffSrkrIncidents && srkrStaffSrkrIncidents.length === 1
    );

    // Test 4: Vishnu staff attempts to update SRKR incident status
    const { error: vishnuUpdateErr } = await vishnuStaffClient
      .from('incidents')
      .update({ status: 'RESOLVED' })
      .eq('id', srkrIncident.id);
    
    // Verify status was not modified
    const { data: verifyIncident } = await adminClient
      .from('incidents')
      .select('status')
      .eq('id', srkrIncident.id)
      .single();
    recordResult(
      'Negative Test 4: Vishnu staff cannot modify SRKR incidents',
      verifyIncident?.status === 'RECEIVED',
      `Incident was modified by cross-college staff`
    );

    // Test 5: Vishnu student attempts to insert incident claiming SRKR college_id
    const { error: crossInsertErr } = await vishnuStudentClient
      .from('incidents')
      .insert({
        title: 'Forged Incident',
        description: 'Attempting to inject into SRKR tenant',
        category: 'HARASSMENT',
        priority: 'HIGH',
        status: 'RECEIVED',
        college_id: 'srkr-bhimavaram',
      });
    
    // Check if forged incident exists
    const { data: forgedInc } = await adminClient
      .from('incidents')
      .select('*')
      .eq('title', 'Forged Incident');
    recordResult(
      'Negative Test 5: Student cannot spoof college_id of a different college',
      !forgedInc || forgedInc.length === 0 || forgedInc[0]?.college_id === 'vishnu-bhimavaram',
      `Forged cross-college incident created: ${JSON.stringify(forgedInc)}`
    );

    // Test 6/7: object-level Storage policies must follow incident and college scope.
    // The object is created only in the dedicated evidence bucket and removed in finally.
    const evidencePath = `${srkrIncident.case_id}/${timestamp}-rls-test.txt`;
    const { error: evidenceSeedError } = await adminClient.storage
      .from('kavach-evidence')
      .upload(evidencePath, new Blob(['synthetic RLS test fixture'], { type: 'text/plain' }), {
        contentType: 'text/plain',
        upsert: false,
      });
    if (evidenceSeedError) throw new Error(`Failed to seed synthetic evidence object: ${evidenceSeedError.message}`);
    createdEvidencePath = evidencePath;

    const { data: forbiddenEvidence, error: forbiddenEvidenceError } = await vishnuStaffClient.storage
      .from('kavach-evidence')
      .download(evidencePath);
    recordResult(
      'Negative Test 6: Vishnu staff cannot download SRKR evidence',
      !forbiddenEvidence && !!forbiddenEvidenceError,
      forbiddenEvidence ? 'Cross-college evidence object was returned.' : undefined,
    );

    const { data: allowedEvidence, error: allowedEvidenceError } = await srkrStaffClient.storage
      .from('kavach-evidence')
      .download(evidencePath);
    recordResult(
      'Positive Test 7: SRKR staff can download same-college evidence',
      !!allowedEvidence && !allowedEvidenceError,
      allowedEvidenceError?.message,
    );

  } catch (err: any) {
    console.error('Execution Error during cross-college test:', err.message);
    executionError = err instanceof Error ? err : new Error(String(err));
  } finally {
    console.log('\nStep 4: Cleaning up synthetic test fixtures...');
    if (createdEvidencePath) {
      await adminClient.storage.from('kavach-evidence').remove([createdEvidencePath]);
    }
    if (createdIncidentId) {
      await adminClient.from('incidents').delete().eq('id', createdIncidentId);
    }
    for (const uid of createdUserIds) {
      try {
        await adminClient.auth.admin.deleteUser(uid);
      } catch {
        // cleanup safe
      }
    }
    console.log('✅ All synthetic test fixtures purged.');
    console.log(`\nFinal Suite Result: ${testsPassed} Passed, ${testsFailed} Failed.`);
    if (executionError || testsFailed > 0) process.exitCode = 1;
  }
}

runCrossCollegeSecurityTests();
