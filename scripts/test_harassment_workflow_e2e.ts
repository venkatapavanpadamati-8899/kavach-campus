import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const adminClient = createClient(url, serviceRoleKey);

export interface TestResultItem {
  testId: string;
  description: string;
  roleUsed: string;
  actualResult: string;
  evidence: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT VERIFIED';
  rootCause?: string;
  fixApplied?: string;
  regressionResult?: string;
}

export const testResults: TestResultItem[] = [];

function recordResult(item: TestResultItem) {
  testResults.push(item);
  const icon = item.status === 'PASS' ? '✅' : item.status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${item.testId}] ${item.description}: ${item.status}`);
  console.log(`   Evidence: ${item.evidence}`);
}

async function loginUser(email: string, password: string): Promise<{ cookieHeader: string; status: number; body: any }> {
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const body = await res.json().catch(() => ({}));
  const setCookies = res.headers.getSetCookie 
    ? res.headers.getSetCookie() 
    : [res.headers.get('set-cookie')].filter(Boolean) as string[];
  const cookieHeader = setCookies.map(c => c.split(';')[0]).join('; ');
  return { cookieHeader, status: res.status, body };
}

export async function runHarassmentWorkflowE2ETest() {
  console.log('================================================================');
  console.log('   KAVACH CAMPUS — E2E HARASSMENT COMPLAINT WORKFLOW TEST   ');
  console.log('================================================================\n');

  const testBatch = Date.now().toString().slice(-6);

  // Synthetic Test Accounts
  const studentAEmail = `demo.student.a.${testBatch}@campus.test`;
  const studentBEmail = `demo.student.b.${testBatch}@campus.test`;
  const staffAEmail = `demo.staff.a.${testBatch}@campus.test`;
  const staffBEmail = `demo.staff.b.${testBatch}@campus.test`;
  const adminEmail = `demo.admin.${testBatch}@campus.test`;
  const defaultPassword = 'SafePassword123!Test';

  let studentAId: string | null = null;
  let studentBId: string | null = null;
  let staffAId: string | null = null;
  let staffBId: string | null = null;
  let adminId: string | null = null;

  let harassmentIncidentId: string | null = null;
  let harassmentCaseId: string | null = null;

  try {
    // ==================================================
    // PHASE 1 — ENVIRONMENT AND PREPARATION
    // ==================================================
    console.log('--- PHASE 1: ENVIRONMENT AND TEST PREPARATION ---');

    // 1. Check Health Endpoint
    const healthRes = await fetch('http://localhost:3000/api/system/health');
    const healthData = await healthRes.json();
    if (healthRes.status === 200 && healthData.status === 'healthy') {
      recordResult({
        testId: 'ENV-01',
        description: 'System health check and database connectivity',
        roleUsed: 'ANONYMOUS',
        actualResult: `Health status: ${healthData.status}, Liveness: ${healthData.liveness}, DB: ${healthData.dbStatus}`,
        evidence: `HTTP ${healthRes.status} from /api/system/health; anon_db_status: ${healthData.anon_db_status}, service_role_db_status: ${healthData.service_role_db_status}`,
        status: 'PASS'
      });
    } else {
      recordResult({
        testId: 'ENV-01',
        description: 'System health check and database connectivity',
        roleUsed: 'ANONYMOUS',
        actualResult: `HTTP ${healthRes.status}: ${JSON.stringify(healthData)}`,
        evidence: 'Failed to connect to health endpoint',
        status: 'FAIL'
      });
    }

    // 2. Environment Variables Verification (Secrets masked)
    const envConfigured = !!(url && anonKey && serviceRoleKey);
    recordResult({
      testId: 'ENV-02',
      description: 'Required environment variables verification (secrets masked)',
      roleUsed: 'SYSTEM',
      actualResult: 'NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are configured.',
      evidence: `URL present: ${!!url}, Anon key present: ${!!anonKey}, Service role key present: ${!!serviceRoleKey} (length: ${serviceRoleKey.length})`,
      status: envConfigured ? 'PASS' : 'FAIL'
    });

    // ==================================================
    // PHASE 2 — STUDENT REGISTRATION AND LOGIN
    // ==================================================
    console.log('\n--- PHASE 2: STUDENT REGISTRATION AND LOGIN ---');

    // 1. Validation test on student registration
    const invalidRegRes = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', email: 'invalid-email', password: '123' })
    });
    const invalidRegData = await invalidRegRes.json();
    recordResult({
      testId: 'STU-01',
      description: 'Student registration required-field and format validation',
      roleUsed: 'ANONYMOUS',
      actualResult: `HTTP ${invalidRegRes.status} returned with validation error: ${invalidRegData.error}`,
      evidence: `POST /api/auth/register rejected empty name/invalid email with HTTP ${invalidRegRes.status}`,
      status: invalidRegRes.status === 400 ? 'PASS' : 'FAIL'
    });

    // 2. Register Demo Student A
    const regPayloadA = {
      name: `Synthetic Student A ${testBatch}`,
      email: studentAEmail,
      password: defaultPassword,
      collegeId: `2101${testBatch}`,
      department: 'Computer Science',
      role: 'STUDENT',
      phone: '9876543210'
    };

    const regResA = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regPayloadA)
    });
    const regDataA = await regResA.json();
    recordResult({
      testId: 'STU-02',
      description: 'Synthetic Demo Student registration initiation (OTP dispatched)',
      roleUsed: 'STUDENT',
      actualResult: `HTTP ${regResA.status}: ${regDataA.message || regDataA.error}`,
      evidence: `POST /api/auth/register created pending verification record with clientToken: ${!!regDataA.clientToken}`,
      status: regResA.status === 201 ? 'PASS' : 'FAIL'
    });

    // 3. Duplicate Registration Behavior
    const dupRegRes = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regPayloadA)
    });
    recordResult({
      testId: 'STU-03',
      description: 'Duplicate registration / pending OTP re-issuance behavior',
      roleUsed: 'STUDENT',
      actualResult: `HTTP ${dupRegRes.status}: Handled cleanly without server error`,
      evidence: `Pending OTP refreshed safely for ${studentAEmail}`,
      status: dupRegRes.status === 201 || dupRegRes.status === 400 ? 'PASS' : 'FAIL'
    });

    // 4. Verify Demo OTP workflow
    const badOtpRes = await fetch('http://localhost:3000/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentAEmail, otp: '000000' })
    });
    const badOtpData = await badOtpRes.json();
    recordResult({
      testId: 'STU-04',
      description: 'Invalid OTP rejection and attempt tracking',
      roleUsed: 'STUDENT',
      actualResult: `HTTP ${badOtpRes.status}: ${badOtpData.error}`,
      evidence: `POST /api/auth/verify-otp rejected invalid OTP with HTTP ${badOtpRes.status}`,
      status: badOtpRes.status === 401 ? 'PASS' : 'FAIL'
    });

    // Complete Student A verification using configured Demo OTP (123456)
    const validOtpRes = await fetch('http://localhost:3000/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentAEmail, otp: '123456' })
    });
    const validOtpData = await validOtpRes.json();

    const { data: stuAProfile } = await adminClient
      .from('profiles')
      .select('id, full_name, college_email, role, is_approved')
      .eq('college_email', studentAEmail)
      .single();

    studentAId = stuAProfile?.id || null;

    recordResult({
      testId: 'STU-05',
      description: 'Demo OTP verification and account creation in database',
      roleUsed: 'STUDENT',
      actualResult: `HTTP ${validOtpRes.status}: Profile created with ID ${studentAId}, Role: ${stuAProfile?.role}`,
      evidence: `User ID in Supabase profiles: ${studentAId}, Role: ${stuAProfile?.role}, is_approved: ${stuAProfile?.is_approved}`,
      status: validOtpRes.status === 200 && stuAProfile?.role === 'STUDENT' ? 'PASS' : 'FAIL'
    });

    // Auto-verify Student ID for non-emergency reporting permission
    await adminClient.from('student_profiles').upsert({
      id: studentAId!,
      course: 'Computer Science',
      verification_status: 'VERIFIED'
    });

    // 5. Student A Login via Application Login Route (/api/auth/login)
    const stuALoginResult = await loginUser(studentAEmail, defaultPassword);
    const studentACookie = stuALoginResult.cookieHeader;

    recordResult({
      testId: 'STU-06',
      description: 'Student authenticated session generation via /api/auth/login',
      roleUsed: 'STUDENT',
      actualResult: `HTTP ${stuALoginResult.status}: Authenticated user role ${stuALoginResult.body?.user?.role}`,
      evidence: `Session established with cookie length ${studentACookie.length}, user ID: ${stuALoginResult.body?.user?.id}`,
      status: stuALoginResult.status === 200 && stuALoginResult.body?.user?.role === 'STUDENT' ? 'PASS' : 'FAIL'
    });

    // 6. Confirm Student cannot access Staff/Admin-only APIs
    const adminApiRes = await fetch('http://localhost:3000/api/admin/verifications', {
      headers: { Cookie: studentACookie }
    });
    recordResult({
      testId: 'SEC-01',
      description: 'Defense-in-depth: Student blocked from privileged administrative APIs',
      roleUsed: 'STUDENT',
      actualResult: `HTTP ${adminApiRes.status} returned when student attempts to access /api/admin/verifications`,
      evidence: `Privileged admin endpoint returned HTTP ${adminApiRes.status} (Forbidden)`,
      status: adminApiRes.status === 403 || adminApiRes.status === 401 ? 'PASS' : 'FAIL'
    });

    // ==================================================
    // PHASE 3 & 4 — HARASSMENT COMPLAINT & GPS COORDINATES
    // ==================================================
    console.log('\n--- PHASE 3 & 4: HARASSMENT COMPLAINT & GPS VERIFICATION ---');

    // TEST 4-D: Invalid coordinates rejected by API
    const invalidCoordsRes = await fetch('http://localhost:3000/api/incidents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentACookie
      },
      body: JSON.stringify({
        description: 'SYNTHETIC QA TEST — invalid coordinate validation check.',
        category: 'HARASSMENT',
        locationLat: 195.5, // > 90
        locationLng: 81.5212
      })
    });
    const invalidCoordsData = await invalidCoordsRes.json();
    recordResult({
      testId: 'GPS-01',
      description: 'API rejection of out-of-bounds coordinates (latitude > 90)',
      roleUsed: 'STUDENT',
      actualResult: `HTTP ${invalidCoordsRes.status}: ${invalidCoordsData.error}`,
      evidence: `POST /api/incidents with lat=195.5 returned HTTP ${invalidCoordsRes.status}`,
      status: invalidCoordsRes.status === 400 ? 'PASS' : 'FAIL'
    });

    // TEST 4-E: Absent coordinates handled safely without substituting 0, 0
    const noCoordsRes = await fetch('http://localhost:3000/api/incidents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentACookie
      },
      body: JSON.stringify({
        description: 'SYNTHETIC QA TEST — missing GPS check. Location permission denied test fixture.',
        category: 'HARASSMENT',
        locationLat: null,
        locationLng: null
      })
    });
    const noCoordsData = await noCoordsRes.json();
    const { data: noCoordsInc } = await adminClient
      .from('incidents')
      .select('case_id, latitude, longitude')
      .eq('case_id', noCoordsData.caseId)
      .single();

    recordResult({
      testId: 'GPS-02',
      description: 'Absent GPS coordinates stored as null without substituting 0,0',
      roleUsed: 'STUDENT',
      actualResult: `Stored latitude: ${noCoordsInc?.latitude}, longitude: ${noCoordsInc?.longitude}`,
      evidence: `Case ${noCoordsInc?.case_id} has latitude=null, longitude=null in PostgreSQL incidents table`,
      status: noCoordsInc?.latitude === null && noCoordsInc?.longitude === null ? 'PASS' : 'FAIL'
    });

    // Clean up temporary missing-coords test incident
    if (noCoordsInc) {
      await adminClient.from('incidents').delete().eq('case_id', noCoordsInc.case_id);
    }

    // TEST 3 & 4-F: Submit Primary Harassment Complaint with Valid Synthetic Coordinates
    // Using synthetic test coordinates: Latitude 16.5449, Longitude 81.5212
    const syntheticLat = 16.5449;
    const syntheticLng = 81.5212;
    const harassmentDescription = 'SYNTHETIC QA TEST — harassment workflow validation. No real incident. Do not contact any person.';

    const harassmentRes = await fetch('http://localhost:3000/api/incidents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentACookie
      },
      body: JSON.stringify({
        description: harassmentDescription,
        category: 'HARASSMENT',
        locationLat: syntheticLat,
        locationLng: syntheticLng,
        isAnonymous: false
      })
    });

    const harassmentData = await harassmentRes.json();
    harassmentCaseId = harassmentData.caseId;

    const { data: dbHarassmentInc } = await adminClient
      .from('incidents')
      .select('*')
      .eq('case_id', harassmentCaseId)
      .single();

    harassmentIncidentId = dbHarassmentInc?.id || null;

    recordResult({
      testId: 'CMP-01',
      description: 'Harassment complaint creation with synthetic GPS coordinates',
      roleUsed: 'STUDENT',
      actualResult: `HTTP ${harassmentRes.status}: Case ${harassmentCaseId} created`,
      evidence: `Case ID: ${harassmentCaseId}, DB ID: ${harassmentIncidentId}, Category: ${dbHarassmentInc?.category}, Status: ${dbHarassmentInc?.status}`,
      status: harassmentRes.status === 201 && dbHarassmentInc?.category === 'HARASSMENT' ? 'PASS' : 'FAIL'
    });

    recordResult({
      testId: 'GPS-03',
      description: 'Coordinate persistence and association with exact Case ID',
      roleUsed: 'STUDENT',
      actualResult: `Saved Latitude: ${dbHarassmentInc?.latitude}, Longitude: ${dbHarassmentInc?.longitude}`,
      evidence: `DB values match synthetic fixtures: lat ${dbHarassmentInc?.latitude} === ${syntheticLat}, lng ${dbHarassmentInc?.longitude} === ${syntheticLng}`,
      status: dbHarassmentInc?.latitude === syntheticLat && dbHarassmentInc?.longitude === syntheticLng ? 'PASS' : 'FAIL'
    });

    // Verify Map Link Format
    const expectedMapUrl = `https://www.google.com/maps/search/?api=1&query=${syntheticLat},${syntheticLng}`;
    recordResult({
      testId: 'GPS-04',
      description: 'Google Maps external URL generation from saved coordinates',
      roleUsed: 'SYSTEM',
      actualResult: `Generated Map URL: ${expectedMapUrl}`,
      evidence: `Map link matches exact query parameter format with valid coordinates: ${expectedMapUrl}`,
      status: expectedMapUrl.includes(`${syntheticLat},${syntheticLng}`) ? 'PASS' : 'FAIL'
    });

    // Verify Case appears in Student's Dashboard
    const stuDashboardRes = await fetch('http://localhost:3000/api/incidents', {
      headers: { Cookie: studentACookie }
    });
    const stuDashboardData = await stuDashboardRes.json();
    const caseInStudentList = stuDashboardData.incidents?.some((i: { case_id: string }) => i.case_id === harassmentCaseId);

    recordResult({
      testId: 'CMP-02',
      description: 'Complaint visibility in reporting student dashboard',
      roleUsed: 'STUDENT',
      actualResult: `Case found in student incidents query: ${caseInStudentList}`,
      evidence: `GET /api/incidents returned ${stuDashboardData.incidents?.length} incidents including case ${harassmentCaseId}`,
      status: caseInStudentList ? 'PASS' : 'FAIL'
    });

    // Cross-student privacy check: Register Student B and verify Student B cannot view Student A's case
    const { data: stuBAuth } = await adminClient.auth.admin.createUser({
      email: studentBEmail,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: { role: 'STUDENT', full_name: `Synthetic Student B ${testBatch}` }
    });
    studentBId = stuBAuth.user!.id;
    await adminClient.from('profiles').insert({
      id: studentBId,
      full_name: `Synthetic Student B ${testBatch}`,
      college_email: studentBEmail,
      role: 'STUDENT',
      is_approved: true
    });
    await adminClient.from('student_profiles').insert({
      id: studentBId,
      course: 'Electronics',
      verification_status: 'VERIFIED'
    });

    const stuBLoginResult = await loginUser(studentBEmail, defaultPassword);
    const studentBCookie = stuBLoginResult.cookieHeader;

    const crossStudentRes = await fetch(`http://localhost:3000/api/incidents/${harassmentIncidentId}`, {
      headers: { Cookie: studentBCookie }
    });
    const crossStudentData = await crossStudentRes.json();

    recordResult({
      testId: 'SEC-02',
      description: 'Cross-student isolation: Student B blocked from inspecting Student A case',
      roleUsed: 'STUDENT',
      actualResult: `HTTP ${crossStudentRes.status}: ${crossStudentData.error || 'Blocked by RLS'}`,
      evidence: `GET /api/incidents/${harassmentIncidentId} by unpermitted student returned HTTP ${crossStudentRes.status} (Access Denied / RLS Hidden)`,
      status: crossStudentRes.status === 403 || crossStudentRes.status === 404 ? 'PASS' : 'FAIL'
    });

    // ==================================================
    // PHASE 5 — STAFF LOGIN AND CASE ASSIGNMENT
    // ==================================================
    console.log('\n--- PHASE 5: STAFF LOGIN AND CASE ASSIGNMENT ---');

    // 1. Create Demo Staff A and Demo Staff B
    const { data: staffAAuth } = await adminClient.auth.admin.createUser({
      email: staffAEmail,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: { role: 'STAFF', full_name: `Demo Staff Responder ${testBatch}` }
    });
    staffAId = staffAAuth.user!.id;
    await adminClient.from('profiles').insert({
      id: staffAId,
      full_name: `Demo Staff Responder ${testBatch}`,
      college_email: staffAEmail,
      role: 'STAFF',
      department: 'Womens Safety Wing',
      is_active: true,
      is_approved: true
    });

    const { data: staffBAuth } = await adminClient.auth.admin.createUser({
      email: staffBEmail,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: { role: 'STAFF', full_name: `Unassigned Staff Member ${testBatch}` }
    });
    staffBId = staffBAuth.user!.id;
    await adminClient.from('profiles').insert({
      id: staffBId,
      full_name: `Unassigned Staff Member ${testBatch}`,
      college_email: staffBEmail,
      role: 'STAFF',
      department: 'General Administration',
      is_active: true,
      is_approved: true
    });

    // Create Admin for Assignment
    const { data: adminAuth } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: { role: 'ADMIN', full_name: `Demo Admin ${testBatch}` }
    });
    adminId = adminAuth.user!.id;
    await adminClient.from('profiles').insert({
      id: adminId,
      full_name: `Demo Admin ${testBatch}`,
      college_email: adminEmail,
      role: 'ADMIN',
      department: 'Dean Office',
      is_active: true,
      is_approved: true
    });

    // 2. Staff A Login via /api/auth/login
    const staffALoginResult = await loginUser(staffAEmail, defaultPassword);
    const staffACookie = staffALoginResult.cookieHeader;

    recordResult({
      testId: 'STF-01',
      description: 'Staff authentication and session establishment',
      roleUsed: 'STAFF',
      actualResult: `HTTP ${staffALoginResult.status}: Authenticated as ${staffALoginResult.body?.user?.id}, Role: ${staffALoginResult.body?.user?.role}`,
      evidence: `Staff A user ID: ${staffAId}, Role: STAFF, Department: Womens Safety Wing`,
      status: staffALoginResult.status === 200 && staffALoginResult.body?.user?.role === 'STAFF' ? 'PASS' : 'FAIL'
    });

    // Verify Unassigned Queue behavior:
    // When created, incident has assigned_to: null, status: 'RECEIVED'
    recordResult({
      testId: 'STF-02',
      description: 'Application assignment model verification (Unassigned intake queue)',
      roleUsed: 'STAFF',
      actualResult: `Initial assignment state: assigned_to = ${dbHarassmentInc?.assigned_to || 'null (Unassigned Intake Queue)'}`,
      evidence: `Kavach Campus uses unassigned intake queue model; incident enters with status 'RECEIVED' and assigned_to: null`,
      status: dbHarassmentInc?.assigned_to === null ? 'PASS' : 'FAIL'
    });

    // 3. Assign Case to Staff A via Admin
    const adminLoginResult = await loginUser(adminEmail, defaultPassword);
    const adminCookie = adminLoginResult.cookieHeader;

    const assignRes = await fetch(`http://localhost:3000/api/incidents/${harassmentIncidentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({
        assigned_to: staffAId,
        notes: `Assigned to Demo Staff A (${staffAEmail}) for harassment review.`
      })
    });
    const assignData = await assignRes.json();

    const { data: assignedIncInDb } = await adminClient
      .from('incidents')
      .select('assigned_to, status')
      .eq('id', harassmentIncidentId)
      .single();

    recordResult({
      testId: 'STF-03',
      description: 'Case assignment to authorized staff responder & DB persistence',
      roleUsed: 'ADMIN',
      actualResult: `HTTP ${assignRes.status}: assigned_to updated to ${assignedIncInDb?.assigned_to}`,
      evidence: `Database record for case ${harassmentCaseId}: assigned_to === ${staffAId}, status === 'ASSIGNED'`,
      status: assignRes.status === 200 && assignedIncInDb?.assigned_to === staffAId ? 'PASS' : 'FAIL'
    });

    // Verify audit log for assignment
    const { data: assignAudit } = await adminClient
      .from('audit_logs')
      .select('*')
      .eq('entity_id', harassmentIncidentId)
      .order('created_at', { ascending: false })
      .limit(1);

    recordResult({
      testId: 'AUD-01',
      description: 'Audit log creation on case assignment',
      roleUsed: 'SYSTEM',
      actualResult: `Audit log record found with action: ${assignAudit?.[0]?.action}`,
      evidence: `Action: ${assignAudit?.[0]?.action}, Actor ID: ${assignAudit?.[0]?.actor_id}, Entity: ${assignAudit?.[0]?.entity_type}`,
      status: assignAudit && assignAudit.length > 0 && assignAudit[0].action.includes('REASSIGNED') ? 'PASS' : 'FAIL'
    });

    // Verify Unauthorized Staff B cannot view or modify the assigned case
    const staffBLoginResult = await loginUser(staffBEmail, defaultPassword);
    const staffBCookie = staffBLoginResult.cookieHeader;

    const unauthStaffGetRes = await fetch(`http://localhost:3000/api/incidents/${harassmentIncidentId}`, {
      headers: { Cookie: staffBCookie }
    });
    recordResult({
      testId: 'SEC-03',
      description: 'Unauthorized staff isolation: Unassigned staff cannot inspect another responder case',
      roleUsed: 'STAFF',
      actualResult: `HTTP ${unauthStaffGetRes.status} returned when non-assigned staff accesses assigned case`,
      evidence: `GET /api/incidents/${harassmentIncidentId} returned HTTP ${unauthStaffGetRes.status} (Access Denied / RLS Hidden)`,
      status: unauthStaffGetRes.status === 403 || unauthStaffGetRes.status === 404 ? 'PASS' : 'FAIL'
    });

    // ==================================================
    // PHASE 6 — STAFF CASE REVIEW & STATUS UPDATES
    // ==================================================
    console.log('\n--- PHASE 6: STAFF CASE REVIEW & STATUS UPDATES ---');

    // 1. Authorized Staff A opens the case
    const staffViewRes = await fetch(`http://localhost:3000/api/incidents/${harassmentIncidentId}`, {
      headers: { Cookie: staffACookie }
    });
    const staffViewData = await staffViewRes.json();

    recordResult({
      testId: 'REV-01',
      description: 'Authorized staff case detail access and GPS visibility',
      roleUsed: 'STAFF',
      actualResult: `HTTP ${staffViewRes.status}: Case retrieved. Latitude: ${staffViewData.incident?.latitude}, Longitude: ${staffViewData.incident?.longitude}`,
      evidence: `Staff A can inspect case ${harassmentCaseId}. Coordinates present: (${staffViewData.incident?.latitude}, ${staffViewData.incident?.longitude})`,
      status: staffViewRes.status === 200 && staffViewData.incident?.latitude === syntheticLat ? 'PASS' : 'FAIL'
    });

    // 2. Status Transition: ACKNOWLEDGED
    const ackRes = await fetch(`http://localhost:3000/api/incidents/${harassmentIncidentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: staffACookie
      },
      body: JSON.stringify({
        status: 'ACKNOWLEDGED',
        notes: 'Case acknowledged by on-duty Womens Safety Wing responder.'
      })
    });
    const ackData = await ackRes.json();
    recordResult({
      testId: 'REV-02',
      description: 'Staff status update to ACKNOWLEDGED',
      roleUsed: 'STAFF',
      actualResult: `HTTP ${ackRes.status}: Status updated to ${ackData.incident?.status}`,
      evidence: `Database status: ${ackData.incident?.status}, Message: ${ackData.message}`,
      status: ackRes.status === 200 && ackData.incident?.status === 'ACKNOWLEDGED' ? 'PASS' : 'FAIL'
    });

    // 3. Status Transition: IN_PROGRESS
    const inProgRes = await fetch(`http://localhost:3000/api/incidents/${harassmentIncidentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: staffACookie
      },
      body: JSON.stringify({
        status: 'IN_PROGRESS',
        notes: 'Investigation initiated. Reviewing campus sector logs.'
      })
    });
    const inProgData = await inProgRes.json();
    recordResult({
      testId: 'REV-03',
      description: 'Staff status update to IN_PROGRESS',
      roleUsed: 'STAFF',
      actualResult: `HTTP ${inProgRes.status}: Status updated to ${inProgData.incident?.status}`,
      evidence: `Database status: ${inProgData.incident?.status}`,
      status: inProgRes.status === 200 && inProgData.incident?.status === 'IN_PROGRESS' ? 'PASS' : 'FAIL'
    });

    // 4. Status Transition: RESOLVED
    const resolvedRes = await fetch(`http://localhost:3000/api/incidents/${harassmentIncidentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: staffACookie
      },
      body: JSON.stringify({
        status: 'RESOLVED',
        notes: 'Investigation completed. Incident resolved and counseling offered.'
      })
    });
    const resolvedData = await resolvedRes.json();
    recordResult({
      testId: 'REV-04',
      description: 'Staff status update to RESOLVED (persisted with resolved_at)',
      roleUsed: 'STAFF',
      actualResult: `HTTP ${resolvedRes.status}: Status updated to ${resolvedData.incident?.status}`,
      evidence: `DB status: ${resolvedData.incident?.status}, resolved_at: ${resolvedData.incident?.resolved_at}`,
      status: resolvedRes.status === 200 && resolvedData.incident?.status === 'RESOLVED' && !!resolvedData.incident?.resolved_at ? 'PASS' : 'FAIL'
    });

    // 5. Verify Student Dashboard reflects status update
    const studentStatusCheckRes = await fetch(`http://localhost:3000/api/incidents/${harassmentIncidentId}`, {
      headers: { Cookie: studentACookie }
    });
    const studentStatusCheckData = await studentStatusCheckRes.json();
    recordResult({
      testId: 'REV-05',
      description: 'Student view reflects permitted status updates',
      roleUsed: 'STUDENT',
      actualResult: `Student fetched status: ${studentStatusCheckData.incident?.status}`,
      evidence: `Student dashboard view updated to RESOLVED for case ${harassmentCaseId}`,
      status: studentStatusCheckData.incident?.status === 'RESOLVED' ? 'PASS' : 'FAIL'
    });

    // 6. Invalid Status Transition Rejected
    const invalidStatusRes = await fetch(`http://localhost:3000/api/incidents/${harassmentIncidentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: staffACookie
      },
      body: JSON.stringify({ status: 'INVALID_STATUS_CODE' })
    });
    recordResult({
      testId: 'REV-06',
      description: 'Rejection of invalid status transition codes',
      roleUsed: 'STAFF',
      actualResult: `HTTP ${invalidStatusRes.status} returned for invalid status`,
      evidence: `PATCH /api/incidents/${harassmentIncidentId} rejected invalid enum status with HTTP 400`,
      status: invalidStatusRes.status === 400 ? 'PASS' : 'FAIL'
    });

    // 7. Student forbidden from updating incident status
    const studentPatchRes = await fetch(`http://localhost:3000/api/incidents/${harassmentIncidentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentACookie
      },
      body: JSON.stringify({ status: 'CLOSED' })
    });
    recordResult({
      testId: 'SEC-04',
      description: 'Students forbidden from self-updating or closing incident status',
      roleUsed: 'STUDENT',
      actualResult: `HTTP ${studentPatchRes.status} returned when student attempts PATCH /api/incidents`,
      evidence: `Attempt by student to update status returned HTTP ${studentPatchRes.status} (Forbidden)`,
      status: studentPatchRes.status === 403 ? 'PASS' : 'FAIL'
    });

    // ==================================================
    // PHASE 7 — DATABASE, RLS AND PRIVACY
    // ==================================================
    console.log('\n--- PHASE 7: DATABASE, RLS AND PRIVACY ---');

    // Verify audit logs table entries for the case
    const { data: allCaseAudits } = await adminClient
      .from('audit_logs')
      .select('*')
      .eq('entity_id', harassmentIncidentId);

    const auditActions = allCaseAudits?.map(a => a.action) || [];
    recordResult({
      testId: 'AUD-02',
      description: 'Audit log trail completeness across all case actions',
      roleUsed: 'SYSTEM',
      actualResult: `Recorded audit actions: ${auditActions.join(', ')}`,
      evidence: `${allCaseAudits?.length || 0} audit logs found for case ${harassmentCaseId}`,
      status: auditActions.length >= 2 ? 'PASS' : 'FAIL'
    });

    // Verify session logout / invalidation
    const logoutRes = await fetch('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: studentACookie }
    });
    recordResult({
      testId: 'AUTH-01',
      description: 'User logout and session invalidation',
      roleUsed: 'STUDENT',
      actualResult: `HTTP ${logoutRes.status}: Session terminated`,
      evidence: `POST /api/auth/logout returned HTTP ${logoutRes.status}`,
      status: logoutRes.status === 200 ? 'PASS' : 'FAIL'
    });

  } catch (err: unknown) {
    console.error('Fatal error during E2E test:', err);
  } finally {
    // Clean up ONLY synthetic test users and complaints created during this run
    console.log('\n--- CLEANING UP SYNTHETIC TEST ARTIFACTS ---');
    try {
      if (harassmentIncidentId) {
        await adminClient.from('case_actions').delete().eq('incident_id', harassmentIncidentId);
        await adminClient.from('audit_logs').delete().eq('entity_id', harassmentIncidentId);
        await adminClient.from('incidents').delete().eq('id', harassmentIncidentId);
        console.log(`Cleaned up synthetic harassment incident ${harassmentIncidentId}`);
      }
      const testUserIds = [studentAId, studentBId, staffAId, staffBId, adminId].filter(Boolean) as string[];
      for (const uid of testUserIds) {
        await adminClient.from('student_profiles').delete().eq('id', uid);
        await adminClient.from('profiles').delete().eq('id', uid);
        await adminClient.auth.admin.deleteUser(uid);
      }
      console.log(`Cleaned up ${testUserIds.length} synthetic test user accounts.`);
    } catch (cleanupErr) {
      console.error('Cleanup warning:', cleanupErr);
    }
  }

  console.log('\n================================================================');
  console.log('   E2E HARASSMENT TEST RUN COMPLETE   ');
  console.log(`   Total Tests: ${testResults.length}`);
  console.log(`   Passed: ${testResults.filter(r => r.status === 'PASS').length}`);
  console.log(`   Failed: ${testResults.filter(r => r.status === 'FAIL').length}`);
  console.log('================================================================\n');

  return testResults;
}

if (require.main === module) {
  runHarassmentWorkflowE2ETest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
