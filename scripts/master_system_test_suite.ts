import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://polbnvszmvblwenfnqll.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BASE_URL = 'http://localhost:3000';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is required in .env.local');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

class CookieJar {
  private cookies = new Map<string, string>();

  public updateFromHeaders(headers: Headers) {
    const rawCookies = typeof (headers as any).getSetCookie === 'function'
      ? (headers as any).getSetCookie()
      : [headers.get('set-cookie')].filter(Boolean);

    for (const raw of rawCookies) {
      if (!raw) continue;
      const parts = raw.split(';')[0].trim();
      const eqIdx = parts.indexOf('=');
      if (eqIdx !== -1) {
        const key = parts.slice(0, eqIdx).trim();
        const val = parts.slice(eqIdx + 1).trim();
        this.cookies.set(key, val);
      }
    }
  }

  public getCookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  public clear() {
    this.cookies.clear();
  }
}

async function request(path: string, options: RequestInit = {}, jar?: CookieJar) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const headers = new Headers(options.headers || {});
  
  if (jar) {
    const cookieStr = jar.getCookieHeader();
    if (cookieStr) {
      headers.set('Cookie', cookieStr);
    }
  }

  const res = await fetch(url, {
    ...options,
    headers,
    redirect: 'manual', // do not auto follow redirects so we can inspect 302/307
  });

  if (jar) {
    jar.updateFromHeaders(res.headers);
  }

  let data: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text().catch(() => '');
  }

  return {
    status: res.status,
    headers: res.headers,
    location: res.headers.get('location'),
    data,
  };
}

interface TestEvidence {
  category: string;
  testName: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED' | 'PENDING';
  notes: string;
}

const evidenceLog: TestEvidence[] = [];
const createdUserIds: string[] = [];
const createdIncidentIds: string[] = [];

async function main() {
  const ts = Date.now().toString(36);
  const password = 'SystemTestPass123!@#';

  console.log('================================================================');
  console.log('      KAVACH CAMPUS — COMPREHENSIVE MASTER SYSTEM TEST          ');
  console.log('================================================================\n');

  // ==========================================================================
  // 1. ALL 6 ROLES: AUTHENTICATION, SESSIONS, ROUTING & DASHBOARD RENDERING
  // ==========================================================================
  console.log('▶ [MODULE 1] 6 ROLES LOGIN, SESSION, REDIRECT & DASHBOARD HTML AUDIT\n');

  // 1A. STUDENT
  console.log('  Testing Role: STUDENT...');
  const stEmail = `sys.student.${ts}@srkr.edu.in`;
  const stJar = new CookieJar();
  try {
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'System Test Student',
        email: stEmail,
        phone: '9876543210',
        studentId: `24B91A${ts.slice(0, 4).toUpperCase()}`,
        department: 'Computer Science and Engineering',
        year: 'Year 2',
        password,
        role: 'STUDENT',
      }),
    });
    const otpRes = await request('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: stEmail, otp: '123456' }),
    });

    const { data: stProf } = await adminClient.from('profiles').select('id').eq('college_email', stEmail).single();
    if (stProf) {
      createdUserIds.push(stProf.id);
      await adminClient.from('profiles').update({ is_approved: true }).eq('id', stProf.id);
      await adminClient.from('student_profiles').upsert({ id: stProf.id, verification_status: 'VERIFIED' });
    }

    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: stEmail, password }),
    }, stJar);

    const studentPage = await request('/student', { method: 'GET' }, stJar);
    const hasHtml = typeof studentPage.data === 'string' && (studentPage.data.includes('student') || studentPage.data.includes('Kavach') || studentPage.data.includes('<!DOCTYPE html>'));
    
    // Negative test: attempt /super-admin with student cookie
    const negSuperAdmin = await request('/super-admin', { method: 'GET' }, stJar);

    evidenceLog.push({
      category: 'Roles & Dashboards',
      testName: 'Student Real Login + Session + Dashboard',
      expected: 'Login HTTP 200, /student HTTP 200, /super-admin 302/307',
      actual: `Login ${loginRes.status}, /student ${studentPage.status} (HTML: ${hasHtml}), /super-admin ${negSuperAdmin.status}`,
      status: loginRes.status === 200 && studentPage.status === 200 && hasHtml && (negSuperAdmin.status === 302 || negSuperAdmin.status === 307) ? 'PASS' : 'FAIL',
      notes: 'Session cookie verified and protected route rendered with student UI.',
    });
  } catch (err: any) {
    evidenceLog.push({
      category: 'Roles & Dashboards',
      testName: 'Student Real Login + Session + Dashboard',
      expected: 'HTTP 200',
      actual: err.message,
      status: 'FAIL',
      notes: 'Unexpected exception in student test',
    });
  }

  // 1B. STAFF (Assistant Professor)
  console.log('  Testing Role: STAFF (Assistant Professor)...');
  const staffEmail = `sys.staff.${ts}@srkr.edu.in`;
  const staffJar = new CookieJar();
  try {
    await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'System Test Assistant Professor',
        email: staffEmail,
        phone: '9876543211',
        designation: 'Assistant Professor',
        employeeId: `EMP-${ts.slice(0, 4).toUpperCase()}`,
        department: 'Computer Science and Engineering',
        password,
        role: 'STAFF',
      }),
    });
    await request('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: staffEmail, otp: '123456' }),
    });

    const { data: staffProf } = await adminClient.from('profiles').select('id').eq('college_email', staffEmail).single();
    if (staffProf) {
      createdUserIds.push(staffProf.id);

      // Verify unapproved login is blocked
      const preLogin = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: staffEmail, password }),
      });

      // Approve staff
      await adminClient.from('profiles').update({ is_approved: true }).eq('id', staffProf.id);

      // Login approved
      const loginRes = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: staffEmail, password }),
      }, staffJar);

      const staffPage = await request('/staff', { method: 'GET' }, staffJar);
      const hasHtml = typeof staffPage.data === 'string' && (staffPage.data.includes('staff') || staffPage.data.includes('Kavach') || staffPage.data.includes('<!DOCTYPE html>'));

      evidenceLog.push({
        category: 'Roles & Dashboards',
        testName: 'Staff Unapproved Block & Approved Login + Dashboard',
        expected: 'Pre-approval 403, Approved Login 200, /staff 200',
        actual: `Pre-login ${preLogin.status}, Post-approval login ${loginRes.status}, /staff ${staffPage.status} (HTML: ${hasHtml})`,
        status: preLogin.status === 403 && loginRes.status === 200 && staffPage.status === 200 && hasHtml ? 'PASS' : 'FAIL',
        notes: 'Pre-approval gate and approved staff dashboard render verified.',
      });
    }
  } catch (err: any) {
    evidenceLog.push({
      category: 'Roles & Dashboards',
      testName: 'Staff Unapproved Block & Approved Login + Dashboard',
      expected: 'HTTP 200',
      actual: err.message,
      status: 'FAIL',
      notes: 'Unexpected exception in staff test',
    });
  }

  // 1C. HOD (CSE)
  console.log('  Testing Role: HOD...');
  const hodEmail = `sys.hod.${ts}@srkr.edu.in`;
  const hodJar = new CookieJar();
  try {
    const { data: hodAuth } = await adminClient.auth.admin.createUser({
      email: hodEmail,
      password,
      email_confirm: true,
      user_metadata: { role: 'HOD', department: 'Computer Science and Engineering', campus_id: 'srkr-bhimavaram' }
    });
    if (hodAuth?.user) {
      createdUserIds.push(hodAuth.user.id);
      await adminClient.from('profiles').insert({
        id: hodAuth.user.id,
        full_name: 'System Test HOD',
        college_email: hodEmail,
        role: 'HOD',
        department: 'Computer Science and Engineering',
        college_id: 'srkr-bhimavaram',
        is_approved: true,
      });

      const loginRes = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: hodEmail, password }),
      }, hodJar);

      const mgmtPage = await request('/management', { method: 'GET' }, hodJar);
      const hasHtml = typeof mgmtPage.data === 'string' && (mgmtPage.data.includes('management') || mgmtPage.data.includes('Kavach') || mgmtPage.data.includes('<!DOCTYPE html>'));

      evidenceLog.push({
        category: 'Roles & Dashboards',
        testName: 'HOD Login + Management Dashboard HTML Load',
        expected: 'Login 200, /management 200',
        actual: `Login ${loginRes.status}, /management ${mgmtPage.status} (HTML: ${hasHtml})`,
        status: loginRes.status === 200 && mgmtPage.status === 200 && hasHtml ? 'PASS' : 'FAIL',
        notes: 'HOD session authenticated and management portal rendered.',
      });
    }
  } catch (err: any) {
    evidenceLog.push({
      category: 'Roles & Dashboards',
      testName: 'HOD Login + Management Dashboard HTML Load',
      expected: 'HTTP 200',
      actual: err.message,
      status: 'FAIL',
      notes: err.message,
    });
  }

  // 1D. PRINCIPAL
  console.log('  Testing Role: PRINCIPAL...');
  const principalEmail = `sys.principal.${ts}@srkr.edu.in`;
  const pJar = new CookieJar();
  try {
    const { data: pAuth } = await adminClient.auth.admin.createUser({
      email: principalEmail,
      password,
      email_confirm: true,
      user_metadata: { role: 'PRINCIPAL', campus_id: 'srkr-bhimavaram' }
    });
    if (pAuth?.user) {
      createdUserIds.push(pAuth.user.id);
      await adminClient.from('profiles').insert({
        id: pAuth.user.id,
        full_name: 'System Test Principal',
        college_email: principalEmail,
        role: 'PRINCIPAL',
        department: 'Administration',
        college_id: 'srkr-bhimavaram',
        is_approved: true,
      });

      const loginRes = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: principalEmail, password }),
      }, pJar);

      const mgmtPage = await request('/management', { method: 'GET' }, pJar);
      const hasHtml = typeof mgmtPage.data === 'string' && (mgmtPage.data.includes('management') || mgmtPage.data.includes('Kavach') || mgmtPage.data.includes('<!DOCTYPE html>'));

      evidenceLog.push({
        category: 'Roles & Dashboards',
        testName: 'Principal Login + Management Dashboard HTML Load',
        expected: 'Login 200, /management 200',
        actual: `Login ${loginRes.status}, /management ${mgmtPage.status} (HTML: ${hasHtml})`,
        status: loginRes.status === 200 && mgmtPage.status === 200 && hasHtml ? 'PASS' : 'FAIL',
        notes: 'Principal authenticated and executive oversight portal rendered.',
      });
    }
  } catch (err: any) {
    evidenceLog.push({
      category: 'Roles & Dashboards',
      testName: 'Principal Login + Management Dashboard HTML Load',
      expected: 'HTTP 200',
      actual: err.message,
      status: 'FAIL',
      notes: err.message,
    });
  }

  // 1E. CAMPUS ADMIN
  console.log('  Testing Role: ADMIN...');
  const adminEmail = `sys.admin.${ts}@srkr.edu.in`;
  const adminJar = new CookieJar();
  try {
    const { data: aAuth } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
      user_metadata: { role: 'ADMIN', campus_id: 'srkr-bhimavaram' }
    });
    if (aAuth?.user) {
      createdUserIds.push(aAuth.user.id);
      await adminClient.from('profiles').insert({
        id: aAuth.user.id,
        full_name: 'System Test Campus Admin',
        college_email: adminEmail,
        role: 'ADMIN',
        department: 'Campus Administration',
        college_id: 'srkr-bhimavaram',
        is_approved: true,
      });

      const loginRes = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password }),
      }, adminJar);

      const adminPage = await request('/admin', { method: 'GET' }, adminJar);
      const hasHtml = typeof adminPage.data === 'string' && (adminPage.data.includes('admin') || adminPage.data.includes('Kavach') || adminPage.data.includes('<!DOCTYPE html>'));

      evidenceLog.push({
        category: 'Roles & Dashboards',
        testName: 'Campus Admin Login + Admin Dashboard HTML Load',
        expected: 'Login 200, /admin 200',
        actual: `Login ${loginRes.status}, /admin ${adminPage.status} (HTML: ${hasHtml})`,
        status: loginRes.status === 200 && adminPage.status === 200 && hasHtml ? 'PASS' : 'FAIL',
        notes: 'Campus Admin session authenticated and governance dashboard rendered.',
      });
    }
  } catch (err: any) {
    evidenceLog.push({
      category: 'Roles & Dashboards',
      testName: 'Campus Admin Login + Admin Dashboard HTML Load',
      expected: 'HTTP 200',
      actual: err.message,
      status: 'FAIL',
      notes: err.message,
    });
  }

  // 1F. SUPER ADMIN
  console.log('  Testing Role: SUPER_ADMIN...');
  const saEmail = `sys.superadmin.${ts}@kavach.local`;
  const saJar = new CookieJar();
  try {
    const { data: saAuth } = await adminClient.auth.admin.createUser({
      email: saEmail,
      password,
      email_confirm: true,
      user_metadata: { role: 'SUPER_ADMIN' }
    });
    if (saAuth?.user) {
      createdUserIds.push(saAuth.user.id);
      await adminClient.from('profiles').insert({
        id: saAuth.user.id,
        full_name: 'System Test Super Admin',
        college_email: saEmail,
        role: 'SUPER_ADMIN',
        department: 'Platform Root Administration',
        college_id: 'srkr-bhimavaram',
        is_approved: true,
      });

      const loginRes = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: saEmail, password }),
      }, saJar);

      const saPage = await request('/super-admin', { method: 'GET' }, saJar);
      const hasHtml = typeof saPage.data === 'string' && (saPage.data.includes('super-admin') || saPage.data.includes('Kavach') || saPage.data.includes('<!DOCTYPE html>'));

      evidenceLog.push({
        category: 'Roles & Dashboards',
        testName: 'Super Admin Login + Root Dashboard HTML Load',
        expected: 'Login 200, /super-admin 200',
        actual: `Login ${loginRes.status}, /super-admin ${saPage.status} (HTML: ${hasHtml})`,
        status: loginRes.status === 200 && saPage.status === 200 && hasHtml ? 'PASS' : 'FAIL',
        notes: 'Root platform administrator session authenticated and root console rendered.',
      });
    }
  } catch (err: any) {
    evidenceLog.push({
      category: 'Roles & Dashboards',
      testName: 'Super Admin Login + Root Dashboard HTML Load',
      expected: 'HTTP 200',
      actual: err.message,
      status: 'FAIL',
      notes: err.message,
    });
  }

  // ==========================================================================
  // 2. APPROVAL HIERARCHY & CROSS-DEPARTMENT / CROSS-COLLEGE ISOLATION
  // ==========================================================================
  console.log('\n▶ [MODULE 2] APPROVAL HIERARCHY & TENANT ISOLATION AUDIT\n');

  try {
    // 2A. Mechanical HOD attempting cross-department approval of CSE Staff
    const mechHodEmail = `sys.mech.hod.${ts}@srkr.edu.in`;
    const { data: mAuth } = await adminClient.auth.admin.createUser({
      email: mechHodEmail,
      password,
      email_confirm: true,
      user_metadata: { role: 'HOD', department: 'Mechanical Engineering', campus_id: 'srkr-bhimavaram' }
    });
    if (mAuth?.user) {
      createdUserIds.push(mAuth.user.id);
      await adminClient.from('profiles').insert({
        id: mAuth.user.id,
        full_name: 'Mech HOD',
        college_email: mechHodEmail,
        role: 'HOD',
        department: 'Mechanical Engineering',
        college_id: 'srkr-bhimavaram',
        is_approved: true,
      });

      const mJar = new CookieJar();
      await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mechHodEmail, password }),
      }, mJar);

      // Attempt to approve the CSE staff created above
      const staffUid = createdUserIds[1]; // staff index
      const crossDeptRes = await request('/api/admin/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: staffUid, action: 'APPROVE', requestedRole: 'STAFF' }),
      }, mJar);

      evidenceLog.push({
        category: 'Approval Hierarchy',
        testName: 'Cross-Department Staff Approval Block (Mech HOD -> CSE Staff)',
        expected: 'HTTP 403 CROSS_DEPARTMENT_APPROVAL_FORBIDDEN',
        actual: `HTTP ${crossDeptRes.status}: ${JSON.stringify(crossDeptRes.data)}`,
        status: crossDeptRes.status === 403 ? 'PASS' : 'FAIL',
        notes: 'Departmental scoping prevents unauthorized cross-department staff approvals.',
      });
    }

    // 2B. Principal cross-college attempt (SRKR Principal -> Vishnu Staff)
    const vishnuEmail = `sys.vishnu.staff.${ts}@vishnu.edu.in`;
    const { data: vAuth } = await adminClient.auth.admin.createUser({
      email: vishnuEmail,
      password,
      email_confirm: true,
      user_metadata: { role: 'STAFF', campus_id: 'vishnu-bhimavaram' }
    });
    if (vAuth?.user) {
      createdUserIds.push(vAuth.user.id);
      await adminClient.from('profiles').insert({
        id: vAuth.user.id,
        full_name: 'Vishnu Faculty',
        college_email: vishnuEmail,
        role: 'STAFF',
        college_id: 'vishnu-bhimavaram',
        is_approved: false,
      });

      const crossCollegeRes = await request('/api/admin/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: vAuth.user.id, action: 'APPROVE', requestedRole: 'STAFF' }),
      }, pJar); // Using SRKR Principal session

      evidenceLog.push({
        category: 'Approval Hierarchy',
        testName: 'Cross-College Staff Approval Block (SRKR Principal -> Vishnu Staff)',
        expected: 'HTTP 403 CROSS_COLLEGE_FORBIDDEN',
        actual: `HTTP ${crossCollegeRes.status}: ${JSON.stringify(crossCollegeRes.data)}`,
        status: crossCollegeRes.status === 403 ? 'PASS' : 'FAIL',
        notes: 'Multi-tenant isolation prevents administrators of one institution from managing users of another.',
      });
    }
  } catch (err: any) {
    console.error('Approval hierarchy error:', err);
  }

  // ==========================================================================
  // 3. EMERGENCY SOS & RESPONDER DISPATCH WORKFLOW
  // ==========================================================================
  console.log('\n▶ [MODULE 3] EMERGENCY SOS & REAL-TIME RESPONDER DISPATCH AUDIT\n');

  try {
    // Student triggers SOS
    const sosRes = await request('/api/sos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: 16.5448,
        longitude: 81.5212,
        accuracy: 10.0,
        locationMethod: 'GPS',
        emergencyContacts: ['9876543210'],
      }),
    }, stJar); // Using verified student session

    let incidentCreated = false;
    let incidentVisibleToStaff = false;

    if (sosRes.status === 201 && sosRes.data?.incidentId) {
      incidentCreated = true;
      createdIncidentIds.push(sosRes.data.incidentId);

      // Check that staff member of same college sees incident in /api/incidents
      const incRes = await request('/api/incidents', { method: 'GET' }, staffJar);
      if (incRes.status === 200 && Array.isArray(incRes.data?.incidents)) {
        incidentVisibleToStaff = incRes.data.incidents.some((i: any) => i.id === sosRes.data.incidentId || i.case_id === sosRes.data.caseId);
      }
    }

    evidenceLog.push({
      category: 'Campus Safety',
      testName: 'Student SOS Trigger & Responder Queue Visibility',
      expected: 'SOS HTTP 201, Incident in Staff Responder Queue (HTTP 200)',
      actual: `SOS ${sosRes.status} (${sosRes.data?.caseId}), Staff Visible: ${incidentVisibleToStaff}`,
      status: incidentCreated && incidentVisibleToStaff ? 'PASS' : 'FAIL',
      notes: 'Tenant attribution and emergency incident routing verified end-to-end.',
    });
  } catch (err: any) {
    console.error('SOS test error:', err);
  }

  // ==========================================================================
  // 4. SAFE WALK LIFECYCLE & AUTOMATED CRON
  // ==========================================================================
  console.log('\n▶ [MODULE 4] SAFE WALK COMPANION & AUTOMATED ESCALATION CRON AUDIT\n');

  try {
    const swStart = await request('/api/safe-walk/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: 'Administrative Block A',
        expectedDurationMins: 20,
        startLatitude: 16.545,
        startLongitude: 81.521,
      }),
    }, stJar);

    let swCompleted = false;
    if (swStart.status === 201 && swStart.data?.walkId) {
      const swEnd = await request('/api/safe-walk/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walkId: swStart.data.walkId,
          status: 'COMPLETED',
        }),
      }, stJar);
      swCompleted = swEnd.status === 200;
    }

    const cronSecret = process.env.CRON_SECRET || '';
    
    // Test unauthenticated cron access is blocked with 401
    const unauthEscalate = await request('/api/cron/escalate', { method: 'POST' });
    
    // Test authorized cron execution with CRON_SECRET Bearer token
    const cronEscalate = await request('/api/cron/escalate', { 
      method: 'POST',
      headers: { 'Authorization': `Bearer ${cronSecret}` }
    });
    const cronTimeout = await request('/api/cron/safe-walk-timeout', { 
      method: 'POST',
      headers: { 'Authorization': `Bearer ${cronSecret}` }
    });

    evidenceLog.push({
      category: 'Campus Safety',
      testName: 'Safe Walk Session Lifecycle (Start -> End) & SLA Cron Workers',
      expected: 'Start 201, End 200, Unauth Cron 401, Auth Cron Escalate 200, Auth Cron Timeout 200',
      actual: `Start ${swStart.status}, End ${swCompleted ? 200 : 'FAIL'}, Unauth ${unauthEscalate.status}, Escalate ${cronEscalate.status}, Timeout ${cronTimeout.status}`,
      status: swStart.status === 201 && swCompleted && unauthEscalate.status === 401 && cronEscalate.status === 200 && cronTimeout.status === 200 ? 'PASS' : 'FAIL',
      notes: 'Safe walk tracking, unauthorized cron blocking (401), and authorized SLA escalation cron workers verified.',
    });
  } catch (err: any) {
    console.error('Safe walk error:', err);
  }

  // ==========================================================================
  // 5. DATABASE MIGRATIONS 015, 016, 017 STATUS
  // ==========================================================================
  console.log('\n▶ [MODULE 5] DATABASE MIGRATION INTEGRITY & PENDING SQL AUDIT\n');

  try {
    // Probe columns from migration 015, 016, 017
    const { error: err017 } = await adminClient.from('student_profiles').select('claimed_college_id').limit(1);
    const m017Applied = !err017;

    const { error: err016 } = await adminClient.from('safe_box_private_notes').select('id').limit(1);
    const m016Applied = !err016;

    evidenceLog.push({
      category: 'Database & Schema',
      testName: 'Supabase Migrations 015, 016, 017 Remote Status',
      expected: 'Accurate reporting of SQL execution status without assuming completion from code fallbacks',
      actual: `Migration 016 (safe_box_private_notes): ${m016Applied ? 'APPLIED' : 'PENDING'}, Migration 017 (claimed_college_id): ${m017Applied ? 'APPLIED' : 'PENDING'}`,
      status: 'PENDING',
      notes: 'Application code is resilient, but migrations 015-017 must be executed in Supabase SQL editor by the owner.',
    });
  } catch (err: any) {
    console.error('Migration probe error:', err);
  }

  // ==========================================================================
  // 6. EXTERNAL SERVICES & DELIVERY CHANNELS AUDIT
  // ==========================================================================
  console.log('\n▶ [MODULE 6] EXTERNAL SERVICES & NOTIFICATION CHANNELS AUDIT\n');

  const enableDemoOtp = process.env.ENABLE_DEMO_OTP === 'true';
  const enableDemoSms = process.env.ENABLE_DEMO_SMS === 'true';
  const enableRealEmail = process.env.ENABLE_REAL_EMAIL_DELIVERY === 'true';
  const hasTwilioKey = !!(process.env.TWILIO_AUTH_TOKEN && !process.env.TWILIO_AUTH_TOKEN.includes('placeholder'));
  const hasSendGridKey = !!(process.env.SENDGRID_API_KEY && !process.env.SENDGRID_API_KEY.includes('placeholder'));
  const hasFcmKey = !!(process.env.FCM_PRIVATE_KEY && !process.env.FCM_PRIVATE_KEY.includes('placeholder'));

  evidenceLog.push({
    category: 'External Services',
    testName: 'Messaging Provider Configuration & Mode Assessment',
    expected: 'Clearly distinguish Demo Simulation Mode from Real Carrier Delivery',
    actual: `Demo Mode: OTP=${enableDemoOtp}, SMS=${enableDemoSms}. Real Delivery Configured: Email=${hasSendGridKey && enableRealEmail}, SMS=${hasTwilioKey && !enableDemoSms}, FCM=${hasFcmKey}`,
    status: 'BLOCKED',
    notes: 'Operating in ₹0 Free Simulation mode. Real delivery blocked by configuration until owner funds provider accounts.',
  });

  // ==========================================================================
  // 7. CLEANUP SYNTHETIC TEST ACCOUNTS & INCIDENTS
  // ==========================================================================
  console.log('\n🧹 [CLEANUP] Removing synthetic test accounts and incidents...');
  for (const incId of createdIncidentIds) {
    try {
      await adminClient.from('incident_locations').delete().eq('incident_id', incId);
      await adminClient.from('incidents').delete().eq('id', incId);
    } catch {}
  }
  for (const uid of createdUserIds) {
    try {
      await adminClient.from('student_profiles').delete().eq('id', uid);
      await adminClient.from('staff_profiles').delete().eq('id', uid);
      await adminClient.from('profiles').delete().eq('id', uid);
      await adminClient.auth.admin.deleteUser(uid);
    } catch {}
  }
  console.log(`✓ Cleaned up ${createdUserIds.length} synthetic accounts and ${createdIncidentIds.length} test incidents.\n`);

  // ==========================================================================
  // PRINT FINAL MASTER EVIDENCE TABLE
  // ==========================================================================
  console.log('================================================================');
  console.log('              FINAL MASTER SYSTEM TEST RESULTS                  ');
  console.log('================================================================');
  console.table(evidenceLog.map(e => ({
    Category: e.category,
    Test: e.testName,
    Status: e.status,
    Evidence: e.actual,
  })));

  return evidenceLog;
}

main().catch(console.error);

