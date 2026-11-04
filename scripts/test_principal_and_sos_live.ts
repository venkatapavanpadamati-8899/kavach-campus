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

async function safeFetchJson(url: string, options: any) {
  const res = await fetch(url, options);
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: { rawText: text.slice(0, 500) } };
  }
}

async function runLivePrincipalAndSafetyTests() {
  console.log('================================================================');
  console.log('   KAVACH CAMPUS — LIVE PRINCIPAL, SOS & SAFE WALK WORKFLOWS    ');
  console.log('================================================================\n');

  const testId = Date.now().toString().slice(-6);
  const password = 'TestPassword123!Safe';

  const results: Record<string, string> = {
    'Principal College-Wide Staff Approval': 'FAIL',
    'Principal Cross-College Approval Block': 'FAIL',
    'Student SOS Incident Creation': 'FAIL',
    'Staff Responder Incident Visibility': 'FAIL',
    'Safe Walk Start & End': 'FAIL',
    'Cron Escalation & Safe Walk Timeout': 'FAIL',
  };

  let principalUserId: string | null = null;
  let staffSrkrUserId: string | null = null;
  let staffVishnuUserId: string | null = null;
  let studentUserId: string | null = null;
  let createdIncidentId: string | null = null;
  let createdSafeWalkId: string | null = null;

  try {
    // ----------------------------------------------------
    // PART 1: PRINCIPAL APPROVAL WORKFLOW
    // ----------------------------------------------------
    console.log('🔍 [PART 1] Setting up Principal and Multi-College Staff...');

    // 1a. Create Principal for SRKR
    const principalEmail = `principal.${testId}@srkr.edu.in`;
    const { data: pAuth } = await adminClient.auth.admin.createUser({
      email: principalEmail,
      password,
      email_confirm: true,
      user_metadata: { role: 'PRINCIPAL', campus_id: 'srkr-bhimavaram' }
    });
    if (pAuth?.user) {
      principalUserId = pAuth.user.id;
      await adminClient.from('profiles').insert({
        id: principalUserId,
        full_name: 'Dr. Test Principal',
        college_email: principalEmail,
        role: 'PRINCIPAL',
        college_id: 'srkr-bhimavaram',
        is_approved: true,
      });
    }

    // 1b. Create Unapproved Staff at SRKR (Electrical Engineering)
    const staffSrkrEmail = `staff.eee.${testId}@srkr.edu.in`;
    const { data: sSrkrAuth } = await adminClient.auth.admin.createUser({
      email: staffSrkrEmail,
      password,
      email_confirm: true,
      user_metadata: { role: 'STAFF', department: 'Electrical and Electronics Engineering', campus_id: 'srkr-bhimavaram' }
    });
    if (sSrkrAuth?.user) {
      staffSrkrUserId = sSrkrAuth.user.id;
      await adminClient.from('profiles').insert({
        id: staffSrkrUserId,
        full_name: 'EEE Faculty Test',
        college_email: staffSrkrEmail,
        role: 'STAFF',
        department: 'Electrical and Electronics Engineering',
        college_id: 'srkr-bhimavaram',
        is_approved: false,
      });
    }

    // 1c. Create Unapproved Staff at different college (Vishnu)
    const staffVishnuEmail = `staff.vishnu.${testId}@vishnu.edu.in`;
    const { data: sVishnuAuth } = await adminClient.auth.admin.createUser({
      email: staffVishnuEmail,
      password,
      email_confirm: true,
      user_metadata: { role: 'STAFF', campus_id: 'vishnu-bhimavaram' }
    });
    if (sVishnuAuth?.user) {
      staffVishnuUserId = sVishnuAuth.user.id;
      await adminClient.from('profiles').insert({
        id: staffVishnuUserId,
        full_name: 'Vishnu Faculty Test',
        college_email: staffVishnuEmail,
        role: 'STAFF',
        college_id: 'vishnu-bhimavaram',
        is_approved: false,
      });
    }

    // Login as Principal
    const principalSession = createCookieTrackedClient();
    await principalSession.client.auth.signInWithPassword({ email: principalEmail, password });
    const principalCookie = principalSession.getCookieHeader();

    // Test 1: Principal approving SRKR EEE staff (cross-department within SAME college)
    console.log('Testing Principal approving SRKR EEE staff across departments...');
    const pApproveRes = await safeFetchJson('http://localhost:3000/api/admin/users/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: principalCookie },
      body: JSON.stringify({ targetUserId: staffSrkrUserId, action: 'APPROVE', requestedRole: 'STAFF' })
    });
    console.log(`Principal intra-college approval response (HTTP ${pApproveRes.status}):`, pApproveRes.data);
    if (pApproveRes.status === 200 && pApproveRes.data.success) {
      results['Principal College-Wide Staff Approval'] = 'PASS';
    }

    // Test 2: Principal attempting to approve Vishnu staff (DIFFERENT college)
    console.log('Testing Principal attempting to approve staff from another college (Vishnu)...');
    const pCrossCollegeRes = await safeFetchJson('http://localhost:3000/api/admin/users/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: principalCookie },
      body: JSON.stringify({ targetUserId: staffVishnuUserId, action: 'APPROVE', requestedRole: 'STAFF' })
    });
    console.log(`Principal cross-college response (HTTP ${pCrossCollegeRes.status}):`, pCrossCollegeRes.data);
    if (pCrossCollegeRes.status === 403 && (pCrossCollegeRes.data.error?.includes('CROSS_COLLEGE_FORBIDDEN') || pCrossCollegeRes.data.error?.includes('outside your assigned campus'))) {
      results['Principal Cross-College Approval Block'] = 'PASS';
    }

    // ----------------------------------------------------
    // PART 2: STUDENT SOS EMERGENCY CREATION
    // ----------------------------------------------------
    console.log('\n🔍 [PART 2] Testing Student SOS Emergency Trigger...');
    const studentEmail = `student.sos.${testId}@srkr.edu.in`;
    const { data: stAuth } = await adminClient.auth.admin.createUser({
      email: studentEmail,
      password,
      email_confirm: true,
      user_metadata: { role: 'STUDENT', campus_id: 'srkr-bhimavaram' }
    });
    if (stAuth?.user) {
      studentUserId = stAuth.user.id;
      await adminClient.from('profiles').insert({
        id: studentUserId,
        full_name: 'SOS Student Test',
        college_email: studentEmail,
        role: 'STUDENT',
        college_id: 'srkr-bhimavaram',
        is_approved: true,
      });

      // Login as Student
      const studentSession = createCookieTrackedClient();
      await studentSession.client.auth.signInWithPassword({ email: studentEmail, password });
      const studentCookie = studentSession.getCookieHeader();

      // Trigger SOS
      const sosRes = await safeFetchJson('http://localhost:3000/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
        body: JSON.stringify({
          latitude: 16.5448,
          longitude: 81.5212,
          accuracy: 12.5,
          locationMethod: 'GPS',
          emergencyContacts: ['9876543210']
        })
      });

      console.log(`Student SOS response (HTTP ${sosRes.status}):`, sosRes.data);
      if (sosRes.status === 201 && (sosRes.data.incidentId || sosRes.data.caseId)) {
        createdIncidentId = sosRes.data.incidentId;
        results['Student SOS Incident Creation'] = 'PASS';

        // Check if approved staff can see this incident in their queue
        const staffSession = createCookieTrackedClient();
        await staffSession.client.auth.signInWithPassword({ email: staffSrkrEmail, password });
        const staffCookie = staffSession.getCookieHeader();

        const incRes = await safeFetchJson('http://localhost:3000/api/incidents', {
          headers: { Cookie: staffCookie }
        });
        console.log('INC RES:', incRes.status, JSON.stringify(incRes.data));
        const found = (incRes.data.incidents || []).some((i: any) => i.id === createdIncidentId || i.case_id === sosRes.data.caseId);
        console.log(`Staff incident query status ${incRes.status}, incident visible in queue:`, found);
        if (incRes.status === 200 && found) {
          results['Staff Responder Incident Visibility'] = 'PASS';
        }
      }

      // ----------------------------------------------------
      // PART 3: SAFE WALK START & END
      // ----------------------------------------------------
      console.log('\n🔍 [PART 3] Testing Safe Walk Session Lifecycle...');
      const swStartRes = await safeFetchJson('http://localhost:3000/api/safe-walk/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
        body: JSON.stringify({
          destination: 'Library Block C',
          expectedDurationMins: 15,
          startLatitude: 16.5450,
          startLongitude: 81.5215,
        })
      });
      console.log(`Safe Walk Start (HTTP ${swStartRes.status}):`, swStartRes.data);

      if (swStartRes.status === 201 && (swStartRes.data.walkId || swStartRes.data.id)) {
        createdSafeWalkId = swStartRes.data.walkId || swStartRes.data.id;

        // End Safe Walk
        const swEndRes = await safeFetchJson('http://localhost:3000/api/safe-walk/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
          body: JSON.stringify({
            safeWalkId: createdSafeWalkId,
            status: 'COMPLETED_SAFELY'
          })
        });
        console.log(`Safe Walk End (HTTP ${swEndRes.status}):`, swEndRes.data);
        if (swEndRes.status === 200) {
          results['Safe Walk Start & End'] = 'PASS';
        }
      }
    }

    // ----------------------------------------------------
    // PART 4: CRON ESCALATION & SAFE WALK TIMEOUT
    // ----------------------------------------------------
    console.log('\n🔍 [PART 4] Testing Cron Escalation and Safe Walk Timeout Endpoints...');
    const cronSecret = process.env.CRON_SECRET || 'kavach_cron_secret';
    const cronEscalateRes = await safeFetchJson('http://localhost:3000/api/cron/escalate', {
      headers: { Authorization: `Bearer ${cronSecret}` }
    });
    console.log(`Cron Escalate status: HTTP ${cronEscalateRes.status}`);

    const cronSafeWalkRes = await safeFetchJson('http://localhost:3000/api/cron/safe-walk-timeout', {
      headers: { Authorization: `Bearer ${cronSecret}` }
    });
    console.log(`Cron Safe Walk Timeout status: HTTP ${cronSafeWalkRes.status}`);

    if (cronEscalateRes.status === 200 && cronSafeWalkRes.status === 200) {
      results['Cron Escalation & Safe Walk Timeout'] = 'PASS';
    }

  } catch (err) {
    console.error('Unhandled error during test execution:', err);
  } finally {
    console.log('\n🧹 [CLEANUP] Cleaning up synthetic test accounts and incidents...');
    if (createdIncidentId) {
      await adminClient.from('incident_locations').delete().eq('incident_id', createdIncidentId);
      await adminClient.from('incidents').delete().eq('id', createdIncidentId);
    }
    if (createdSafeWalkId) {
      await adminClient.from('safe_walks').delete().eq('id', createdSafeWalkId);
    }
    if (studentUserId) {
      await adminClient.from('profiles').delete().eq('id', studentUserId);
      await adminClient.auth.admin.deleteUser(studentUserId);
    }
    if (staffSrkrUserId) {
      await adminClient.from('profiles').delete().eq('id', staffSrkrUserId);
      await adminClient.auth.admin.deleteUser(staffSrkrUserId);
    }
    if (staffVishnuUserId) {
      await adminClient.from('profiles').delete().eq('id', staffVishnuUserId);
      await adminClient.auth.admin.deleteUser(staffVishnuUserId);
    }
    if (principalUserId) {
      await adminClient.from('profiles').delete().eq('id', principalUserId);
      await adminClient.auth.admin.deleteUser(principalUserId);
    }
    console.log('Cleaned up synthetic test resources.');
  }

  console.log('\n================================================================');
  console.log('             FINAL PRINCIPAL & SAFETY TEST RESULTS              ');
  console.log('================================================================');
  console.table(
    Object.entries(results).map(([test, outcome]) => ({
      Test: test,
      Result: outcome,
    }))
  );
}

runLivePrincipalAndSafetyTests();
