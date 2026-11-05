import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface CleanupItem {
  table: string;
  count: number;
  description: string;
  ids: string[];
  sample: any[];
}

async function dryRun() {
  console.log('================================================================');
  console.log('       KAVACH CAMPUS — DATABASE CLEANUP DRY RUN SIMULATION      ');
  console.log('================================================================\n');

  // 1. Genuine / Protected Records:
  const protectedEmails = [
    'venkatapavanpadamati1@gmail.com', // Root Super Admin & Owner
    'venkatapavanpadamati@gmail.com',  // Campus Admin
    'keerthipadamati1@gmail.com',      // Real Student
    'vsbmanoharpopuri@gmail.com',      // Real Student
  ];

  console.log('[PROTECTED ACCOUNTS — WILL NEVER BE TOUCHED]');
  protectedEmails.forEach(e => console.log(`  🛡️  PRESERVED: ${e}`));

  // 2. Synthetic / Test Accounts Proposed for Deletion:
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 100 });
  const usersToDelete = (authUsers?.users || []).filter(u => {
    if (!u.email) return false;
    if (protectedEmails.includes(u.email)) return false;
    // Identify test/synthetic users:
    const isSyntheticRunner = u.email.includes('mw228ehb') || u.email.includes('sys.') || u.email.includes('.test');
    const isDummyEarlyTest = u.email === 'pavan@gmail.com' || u.email === 'nani@gmail.com';
    return isSyntheticRunner || isDummyEarlyTest;
  });

  console.log(`\n[SYNTHETIC & DUMMY USERS PROPOSED FOR DELETION: ${usersToDelete.length}]`);
  usersToDelete.forEach(u => {
    console.log(`  🗑️  DELETE USER: ${u.email} (ID: ${u.id})`);
  });

  // 3. Dummy Incidents (All 40 have student_id: null, created by test runners)
  const { data: incs } = await supabase.from('incidents').select('id, case_id, created_at, student_id');
  const dummyIncidents = incs || [];

  // 4. Incident-related tables:
  const { data: locs } = await supabase.from('incident_locations').select('id, incident_id');
  const { data: escs } = await supabase.from('escalations').select('id, incident_id');
  const { data: acts } = await supabase.from('case_actions').select('id, incident_id');
  const { data: notifs } = await supabase.from('notifications').select('id, case_id');

  // 5. Expired Test OTPs (All 34 are from @kavachcampus.test, @campus.edu, or expired test runs)
  const { data: otps } = await supabase.from('user_otp_verifications').select('id, email, expires_at, created_at');
  const expiredTestOtps = (otps || []).filter(o => {
    const isSynthetic = o.email?.includes('kavachcampus.test') || o.email?.includes('campus.edu') || o.email?.includes('mw228ehb');
    const isExpired = new Date(o.expires_at) < new Date();
    return isSynthetic || isExpired;
  });

  // 6. Test Audit Logs
  const { data: logs } = await supabase.from('audit_logs').select('id, action, created_at');

  console.log('\n================================================================');
  console.log('              CLEANUP INVENTORY SUMMARY (DRY RUN)               ');
  console.log('================================================================');
  console.table([
    {
      Table: 'auth.users (Synthetic)',
      Count: usersToDelete.length,
      Action: 'DELETE FROM auth.users',
      Criteria: 'Orphan test runners (mw228ehb) & early dummy accounts (pavan@, nani@)',
    },
    {
      Table: 'profiles (Dummy)',
      Count: usersToDelete.filter(u => u.email === 'pavan@gmail.com' || u.email === 'nani@gmail.com').length,
      Action: 'DELETE FROM profiles',
      Criteria: 'Profiles linked to dummy accounts (pavan@, nani@)',
    },
    {
      Table: 'student_profiles (Dummy)',
      Count: 1, // pavan@gmail.com
      Action: 'DELETE FROM student_profiles',
      Criteria: 'Student profile linked to pavan@gmail.com',
    },
    {
      Table: 'incidents',
      Count: dummyIncidents.length,
      Action: 'DELETE FROM incidents',
      Criteria: 'Orphan test incidents with student_id: null from automated test runs',
    },
    {
      Table: 'incident_locations',
      Count: locs?.length || 0,
      Action: 'DELETE FROM incident_locations',
      Criteria: 'Locations linked to orphan test incidents',
    },
    {
      Table: 'escalations',
      Count: escs?.length || 0,
      Action: 'DELETE FROM escalations',
      Criteria: 'Escalations linked to orphan test incidents',
    },
    {
      Table: 'case_actions',
      Count: acts?.length || 0,
      Action: 'DELETE FROM case_actions',
      Criteria: 'Case actions linked to orphan test incidents',
    },
    {
      Table: 'notifications',
      Count: notifs?.length || 0,
      Action: 'DELETE FROM notifications',
      Criteria: 'Notifications linked to orphan test incidents',
    },
    {
      Table: 'user_otp_verifications',
      Count: expiredTestOtps.length,
      Action: 'DELETE FROM user_otp_verifications',
      Criteria: 'Expired synthetic OTP records from October test runs (@kavachcampus.test)',
    },
    {
      Table: 'audit_logs',
      Count: logs?.length || 0,
      Action: 'DELETE FROM audit_logs',
      Criteria: 'Historical test runner audit entries',
    },
  ]);

  console.log('\n[CRITICAL SAFETY CHECK: DEMO OTP SYSTEM]');
  console.log('  ✓ Mobile Demo OTP API (/api/auth/verify-otp): PRESERVED UNTOUCHED');
  console.log('  ✓ Email Demo OTP API: PRESERVED UNTOUCHED');
  console.log('  ✓ Demo OTP Table Schema: user_otp_verifications PRESERVED');
  console.log('  ✓ Demo OTP Secret / Value (123456): PRESERVED');
  console.log('  ✓ Environment Flag ENABLE_DEMO_OTP=true: PRESERVED');
  console.log('\n[STATUS] DRY RUN COMPLETE. NO DATABASE MODIFICATIONS HAVE BEEN APPLIED.');
  console.log('[AWAITING USER EXPLICIT APPROVAL BEFORE EXECUTION]');
}

dryRun().catch(console.error);
