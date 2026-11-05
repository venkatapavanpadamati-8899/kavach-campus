import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function analyze() {
  console.log('================================================================');
  console.log('       KAVACH CAMPUS — COMPREHENSIVE CLEANUP INVENTORY AUDIT     ');
  console.log('================================================================\n');

  // 1. Auth Users
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 100 });
  const users = authUsers?.users || [];
  
  // Real users vs Synthetic/Test users:
  // Identified Real Users:
  // - venkatapavanpadamati1@gmail.com (Super Admin, Root Owner) -> REAL
  // - venkatapavanpadamati@gmail.com (Admin) -> REAL
  // - keerthipadamati1@gmail.com (Student) -> REAL
  // - vsbmanoharpopuri@gmail.com (Student: bhuvan) -> REAL
  //
  // Synthetic / Test Users:
  // - staff.asstprof.mw228ehb@srkr.edu.in (Synthetic test runner leftover)
  // - student.live.mw228ehb@srkr.edu.in (Synthetic test runner leftover)
  // - pavan@gmail.com (Created during early registration tests)
  // - nani@gmail.com (Created during early registration tests)

  console.log('--- USER INVENTORY ---');
  for (const u of users) {
    const isSynthetic = u.email?.includes('mw228ehb') || u.email?.includes('test') || u.email?.includes('sys.') || u.email === 'pavan@gmail.com' || u.email === 'nani@gmail.com';
    const isOwner = u.email === 'venkatapavanpadamati1@gmail.com';
    const isAdmin = u.email === 'venkatapavanpadamati@gmail.com';
    const isRealUser = u.email === 'keerthipadamati1@gmail.com' || u.email === 'vsbmanoharpopuri@gmail.com';
    
    let classification = 'UNCERTAIN';
    if (isOwner) classification = 'REAL (ROOT OWNER - MUST PRESERVE)';
    else if (isAdmin) classification = 'REAL (CAMPUS ADMIN - PRESERVE)';
    else if (isRealUser) classification = 'REAL (STUDENT USER - PRESERVE)';
    else if (isSynthetic) classification = 'SYNTHETIC / TEST USER (PROPOSED TO DELETE)';

    console.log(`User: ${u.email?.padEnd(40)} | ID: ${u.id} | Class: ${classification}`);
  }

  // 2. Profiles
  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log('\n--- PROFILES INVENTORY ---');
  profiles?.forEach(p => {
    console.log(`Profile: ${(p.college_email || p.email)?.padEnd(35)} | Role: ${p.role.padEnd(12)} | Name: ${p.full_name?.padEnd(30)} | Approved: ${p.is_approved}`);
  });

  // 3. Incidents
  const { data: incs } = await supabase.from('incidents').select('id, case_id, category, severity, status, student_id, college_id, created_at, description');
  console.log(`\n--- INCIDENTS INVENTORY (${incs?.length || 0}) ---`);
  const incidentUserMap: Record<string, number> = {};
  incs?.forEach(i => {
    incidentUserMap[i.student_id] = (incidentUserMap[i.student_id] || 0) + 1;
  });
  console.log('Incidents grouped by student_id:');
  for (const [studentId, count] of Object.entries(incidentUserMap)) {
    const matchedUser = users.find(u => u.id === studentId);
    console.log(`Student ID: ${studentId} | User: ${matchedUser ? matchedUser.email : 'DELETED/ORPHAN SYNTHETIC USER'} | Incidents: ${count}`);
  }

  // 4. In-App Notifications & Standard Notifications
  const { count: notifCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true });
  console.log(`\n--- NOTIFICATIONS (${notifCount || 0} rows) ---`);

  // 5. Escalations & Case Actions
  const { count: escCount } = await supabase.from('escalations').select('*', { count: 'exact', head: true });
  const { count: actionCount } = await supabase.from('case_actions').select('*', { count: 'exact', head: true });
  console.log(`--- ESCALATIONS (${escCount || 0} rows), CASE ACTIONS (${actionCount || 0} rows) ---`);

  // 6. User OTP Verifications
  const { data: otps } = await supabase.from('user_otp_verifications').select('*');
  console.log(`\n--- USER OTP VERIFICATIONS (${otps?.length || 0} rows) ---`);
  const otpSummary: Record<string, number> = {};
  otps?.forEach(o => {
    const domain = o.email ? o.email.split('@')[1] : 'mobile-only';
    otpSummary[domain] = (otpSummary[domain] || 0) + 1;
  });
  console.log('OTP records by domain/type:', otpSummary);

  // 7. Audit Logs
  const { count: auditCount } = await supabase.from('audit_logs').select('*', { count: 'exact', head: true });
  console.log(`\n--- AUDIT LOGS (${auditCount || 0} rows) ---`);
}

analyze().catch(console.error);

