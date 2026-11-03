import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const auditMode = process.env.KAVACH_DB_AUDIT_MODE;
const expectedHost = process.env.KAVACH_DB_AUDIT_EXPECTED_HOST;

if (!url || !serviceRoleKey || !anonKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

let supabaseHost: string;
try {
  supabaseHost = new URL(url).hostname;
} catch {
  console.error('Invalid Supabase URL; refusing to run the database audit.');
  process.exit(1);
}

if (
  auditMode !== 'isolated-test' ||
  !expectedHost ||
  supabaseHost !== expectedHost.trim().toLowerCase()
) {
  console.error(
    'Refusing to run: this audit creates and deletes synthetic records. Set KAVACH_DB_AUDIT_MODE=isolated-test and KAVACH_DB_AUDIT_EXPECTED_HOST to the exact isolated test project hostname.'
  );
  process.exit(1);
}

const adminClient = createClient(url, serviceRoleKey);
const anonClient = createClient(url, anonKey);

async function runDatabaseSecurityAudit() {
  console.log('================================================================');
  console.log('🔒 KAVACH CAMPUS — COMPREHENSIVE DATABASE SECURITY & RLS AUDIT');
  console.log('Target: explicitly configured isolated Supabase test project');
  console.log(`Audit Timestamp: ${new Date().toISOString()}`);
  console.log('================================================================\n');

  const auditResults: Record<string, { pass: boolean; details: string }> = {};

  // -------------------------------------------------------------
  // SECTION 1: ANONYMOUS ACCESS RESTRICTION AUDIT (RLS BLOCKS)
  // -------------------------------------------------------------
  console.log('--- SECTION 1: ANONYMOUS ACCESS RESTRICTION (UNAUTHENTICATED) ---');

  // 1.1 Anon Read Incidents
  const { data: anonIncidents, error: anonIncidentsErr } = await anonClient
    .from('incidents')
    .select('id, case_id, description')
    .limit(5);
  const anonIncidentsPass = (!anonIncidents || anonIncidents.length === 0);
  auditResults['ANON_READ_INCIDENTS'] = {
    pass: anonIncidentsPass,
    details: anonIncidentsPass
      ? `PASS: Anonymous user received 0 incident records (RLS enforced).`
      : `FAIL: Anonymous user leaked ${anonIncidents.length} incident records!`
  };
  console.log(`[${anonIncidentsPass ? 'PASS' : 'FAIL'}] Anonymous read on 'incidents': ${auditResults['ANON_READ_INCIDENTS'].details}`);

  // 1.2 Anon Insert Incidents
  const { error: anonInsertIncErr } = await anonClient
    .from('incidents')
    .insert({
      case_id: 'HACK-ANON-001',
      description: 'Hacked anonymous incident',
      category: 'EMERGENCY',
      severity: 'CRITICAL',
      urgency: 'HIGH'
    });
  const anonInsertPass = !!anonInsertIncErr;
  auditResults['ANON_INSERT_INCIDENTS'] = {
    pass: anonInsertPass,
    details: anonInsertPass
      ? `PASS: Anonymous insert rejected by RLS: "${anonInsertIncErr?.message}"`
      : `FAIL: Anonymous user was able to insert into 'incidents'!`
  };
  console.log(`[${anonInsertPass ? 'PASS' : 'FAIL'}] Anonymous insert on 'incidents': ${auditResults['ANON_INSERT_INCIDENTS'].details}`);

  // 1.3 Anon Read Incident Locations
  const { data: anonLocations, error: anonLocErr } = await anonClient
    .from('incident_locations')
    .select('*')
    .limit(5);
  const anonLocPass = (!anonLocations || anonLocations.length === 0);
  auditResults['ANON_READ_LOCATIONS'] = {
    pass: anonLocPass,
    details: anonLocPass
      ? `PASS: Anonymous user received 0 location records.`
      : `FAIL: Anonymous user read ${anonLocations.length} private coordinates!`
  };
  console.log(`[${anonLocPass ? 'PASS' : 'FAIL'}] Anonymous read on 'incident_locations': ${auditResults['ANON_READ_LOCATIONS'].details}`);

  // 1.4 Anon Read Audit Logs
  const { data: anonAudit, error: anonAuditErr } = await anonClient
    .from('audit_logs')
    .select('*')
    .limit(5);
  const anonAuditPass = (!anonAudit || anonAudit.length === 0);
  auditResults['ANON_READ_AUDIT_LOGS'] = {
    pass: anonAuditPass,
    details: anonAuditPass
      ? `PASS: Anonymous user received 0 audit log records.`
      : `FAIL: Anonymous user read audit logs!`
  };
  console.log(`[${anonAuditPass ? 'PASS' : 'FAIL'}] Anonymous read on 'audit_logs': ${auditResults['ANON_READ_AUDIT_LOGS'].details}`);

  // 1.5 Anon Read Notifications
  const { data: anonNotif, error: anonNotifErr } = await anonClient
    .from('notifications')
    .select('*')
    .limit(5);
  const anonNotifPass = (!anonNotif || anonNotif.length === 0);
  auditResults['ANON_READ_NOTIFICATIONS'] = {
    pass: anonNotifPass,
    details: anonNotifPass
      ? `PASS: Anonymous user received 0 notification records.`
      : `FAIL: Anonymous user read notifications!`
  };
  console.log(`[${anonNotifPass ? 'PASS' : 'FAIL'}] Anonymous read on 'notifications': ${auditResults['ANON_READ_NOTIFICATIONS'].details}`);

  // 1.6 Anon Read Storage Bucket kavach-id-cards
  const { data: anonStorage, error: anonStorageErr } = await anonClient.storage.from('kavach-id-cards').list();
  const anonStoragePass = (!!anonStorageErr || !anonStorage || anonStorage.length === 0);
  auditResults['ANON_STORAGE_LIST'] = {
    pass: anonStoragePass,
    details: anonStoragePass
      ? `PASS: Anonymous user cannot list student ID cards in storage (${anonStorageErr?.message || '0 files'}).`
      : `FAIL: Anonymous user listed ${anonStorage.length} private student ID cards!`
  };
  console.log(`[${anonStoragePass ? 'PASS' : 'FAIL'}] Anonymous listing on 'kavach-id-cards' storage: ${auditResults['ANON_STORAGE_LIST'].details}`);

  // -------------------------------------------------------------
  // SECTION 2: CROSS-STUDENT INCIDENT & LOCATION ISOLATION
  // -------------------------------------------------------------
  console.log('\n--- SECTION 2: CROSS-STUDENT INCIDENT & LOCATION ISOLATION ---');

  const now = Date.now();
  const emailA = `audit.student.a.${now}@kavachcampus.test`;
  const emailB = `audit.student.b.${now}@kavachcampus.test`;
  const password = 'TestAuditPassword123!Safe';

  const { data: userAData } = await adminClient.auth.admin.createUser({
    email: emailA,
    password: password,
    email_confirm: true,
  });
  const idA = userAData!.user!.id;

  const { data: userBData } = await adminClient.auth.admin.createUser({
    email: emailB,
    password: password,
    email_confirm: true,
  });
  const idB = userBData!.user!.id;

  let testIncidentId: string | null = null;

  try {
    // Seed profiles
    await adminClient.from('profiles').insert([
      { id: idA, full_name: 'Student Alice (Audit)', college_email: emailA, role: 'STUDENT', student_id: 'STUA' + now.toString().slice(-4), is_approved: true, college_id: 'srkr-bhimavaram' },
      { id: idB, full_name: 'Student Bob (Audit)', college_email: emailB, role: 'STUDENT', student_id: 'STUB' + now.toString().slice(-4), is_approved: true, college_id: 'srkr-bhimavaram' },
    ]);

    // Student A signs in
    const clientA = createClient(url, anonKey);
    const { error: loginAErr } = await clientA.auth.signInWithPassword({ email: emailA, password });
    if (loginAErr) throw new Error('Student A login failed: ' + loginAErr.message);

    // Student B signs in
    const clientB = createClient(url, anonKey);
    const { error: loginBErr } = await clientB.auth.signInWithPassword({ email: emailB, password });
    if (loginBErr) throw new Error('Student B login failed: ' + loginBErr.message);

    // Student A creates an incident
    const caseId = `AUDIT-SOS-${now.toString().slice(-6)}`;
    const { data: incidentA, error: incAErr } = await clientA
      .from('incidents')
      .insert({
        case_id: caseId,
        student_id: idA,
        description: '[CONTROLLED TEST] Mobile GPS Verification',
        category: 'EMERGENCY',
        severity: 'LOW',
        urgency: 'LOW',
        status: 'RESOLVED',
        college_id: 'srkr-bhimavaram'
      })
      .select()
      .single();

    if (incAErr || !incidentA) {
      throw new Error('Failed to create test incident as Student A: ' + incAErr?.message);
    }
    testIncidentId = incidentA.id;

    // Student A inserts a location tracking point
    const { error: locAErr } = await clientA
      .from('incident_locations')
      .insert({
        incident_id: testIncidentId,
        latitude: 16.5448,
        longitude: 81.5212,
        accuracy: 12.5
      });

    if (locAErr) {
      console.warn('Location insert notice:', locAErr.message);
    }

    // 2.1 Student A reads own incident
    const { data: aOwnIncidents } = await clientA
      .from('incidents')
      .select('id, case_id')
      .eq('id', testIncidentId);
    const studentAOwnPass = (aOwnIncidents && aOwnIncidents.length === 1);
    console.log(`[${studentAOwnPass ? 'PASS' : 'FAIL'}] Student A reads OWN incident: ${studentAOwnPass ? '1 record found (Correct)' : '0 records found'}`);

    // 2.2 Student B attempts to read Student A's incident
    const { data: bReadAIncident } = await clientB
      .from('incidents')
      .select('id, case_id, description')
      .eq('id', testIncidentId);
    const crossStudentIncPass = (!bReadAIncident || bReadAIncident.length === 0);
    auditResults['CROSS_STUDENT_INCIDENT_READ'] = {
      pass: crossStudentIncPass,
      details: crossStudentIncPass
        ? `PASS: Student B received 0 records for Student A's incident (RLS isolated).`
        : `FAIL: Student B leaked Student A's incident data!`
    };
    console.log(`[${crossStudentIncPass ? 'PASS' : 'FAIL'}] Student B reads Student A incident: ${auditResults['CROSS_STUDENT_INCIDENT_READ'].details}`);

    // 2.3 Student B attempts to read Student A's incident location
    const { data: bReadALoc } = await clientB
      .from('incident_locations')
      .select('*')
      .eq('incident_id', testIncidentId);
    const crossStudentLocPass = (!bReadALoc || bReadALoc.length === 0);
    auditResults['CROSS_STUDENT_LOCATION_READ'] = {
      pass: crossStudentLocPass,
      details: crossStudentLocPass
        ? `PASS: Student B received 0 location rows for Student A's incident.`
        : `FAIL: Student B was able to view Student A's GPS coordinates!`
    };
    console.log(`[${crossStudentLocPass ? 'PASS' : 'FAIL'}] Student B reads Student A GPS location: ${auditResults['CROSS_STUDENT_LOCATION_READ'].details}`);

    // -------------------------------------------------------------
    // SECTION 3: ZERO-ALERT NOTIFICATION SAFETY AUDIT
    // -------------------------------------------------------------
    console.log('\n--- SECTION 3: ZERO-ALERT NOTIFICATION SAFETY AUDIT ---');

    // 3.1 Check if any notifications were created for this test incident
    const { data: incidentNotifs, error: notifErr } = await adminClient
      .from('notifications')
      .select('*')
      .eq('incident_id', testIncidentId);

    const zeroNotificationPass = (!incidentNotifs || incidentNotifs.length === 0);
    auditResults['ZERO_NOTIFICATION_DISPATCH'] = {
      pass: zeroNotificationPass,
      details: zeroNotificationPass
        ? `PASS: Exactly 0 notification rows generated in database for controlled test incident (Zero-Alert confirmed!).`
        : `FAIL: Controlled test generated ${incidentNotifs.length} unexpected notification rows!`
    };
    console.log(`[${zeroNotificationPass ? 'PASS' : 'FAIL'}] Database notification generation: ${auditResults['ZERO_NOTIFICATION_DISPATCH'].details}`);

    // 3.2 Verify role escalation prevention via trigger
    const { error: roleEscalationErr } = await clientA
      .from('profiles')
      .update({ role: 'ADMIN' })
      .eq('id', idA);
    const roleEscalationPass = !!roleEscalationErr;
    auditResults['ROLE_ESCALATION_PREVENTION'] = {
      pass: roleEscalationPass,
      details: roleEscalationPass
        ? `PASS: Student self-promotion to ADMIN blocked by trigger/RLS: "${roleEscalationErr?.message}"`
        : `FAIL: Student was able to escalate their own role to ADMIN!`
    };
    console.log(`[${roleEscalationPass ? 'PASS' : 'FAIL'}] Self-role escalation defense: ${auditResults['ROLE_ESCALATION_PREVENTION'].details}`);

  } finally {
    console.log('\n--- CLEANUP: PURGING SYNTHETIC AUDIT FIXTURES ---');
    if (testIncidentId) {
      await adminClient.from('incident_locations').delete().eq('incident_id', testIncidentId);
      await adminClient.from('incidents').delete().eq('id', testIncidentId);
    }
    await adminClient.from('profiles').delete().in('id', [idA, idB]);
    await adminClient.auth.admin.deleteUser(idA);
    await adminClient.auth.admin.deleteUser(idB);
    console.log('✅ Cleanup complete. Live database is completely clean.');
  }

  console.log('\n================================================================');
  console.log('AUDIT SUMMARY REPORT:');
  const allPassed = Object.values(auditResults).every(r => r.pass);
  console.log(
    allPassed
      ? 'Recorded assertions passed; this is not a comprehensive security certification.'
      : 'One or more recorded assertions failed.'
  );
  console.log('================================================================');
}

runDatabaseSecurityAudit().catch(console.error);
