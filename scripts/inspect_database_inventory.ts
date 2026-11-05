import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://polbnvszmvblwenfnqll.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function inspect() {
  console.log('====================================================');
  console.log('       KAVACH CAMPUS DATABASE INVENTORY AUDIT       ');
  console.log('====================================================\n');

  // 1. Auth Users
  const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  if (authError) {
    console.error('Error fetching auth users:', authError);
    return;
  }
  console.log(`[AUTH USERS] Total: ${authUsers.users.length}`);
  const userList = authUsers.users.map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    metadata: u.user_metadata,
  }));
  console.table(userList.map(u => ({
    id: u.id.slice(0, 8) + '...',
    email: u.email,
    role: u.metadata?.role || 'N/A',
    created: u.created_at?.slice(0, 10),
  })));

  // 2. Profiles
  const { data: profiles, error: profError } = await adminClient.from('profiles').select('*');
  console.log(`\n[PROFILES] Total: ${profiles?.length || 0}`);
  if (profiles && profiles.length > 0) {
    console.table(profiles.map(p => ({
      id: p.id.slice(0, 8) + '...',
      email: p.college_email || p.email,
      role: p.role,
      name: p.full_name,
      college: p.college_id,
      dept: p.department,
      approved: p.is_approved,
    })));
  }

  // 3. Incidents
  const { data: incidents, error: incError } = await adminClient.from('incidents').select('id, case_id, title, category, severity, status, student_id, college_id, created_at');
  console.log(`\n[INCIDENTS] Total: ${incidents?.length || 0}`);
  if (incidents && incidents.length > 0) {
    console.table(incidents.map(i => ({
      id: i.id.slice(0, 8) + '...',
      case_id: i.case_id,
      category: i.category,
      severity: i.severity,
      status: i.status,
      college: i.college_id,
      created: i.created_at?.slice(0, 19),
    })));
  }

  // 4. Safe Walks
  const { data: safeWalks } = await adminClient.from('safe_walks').select('id, student_id, status, destination, created_at');
  console.log(`\n[SAFE WALKS] Total: ${safeWalks?.length || 0}`);
  if (safeWalks && safeWalks.length > 0) {
    console.table(safeWalks.map(w => ({
      id: w.id.slice(0, 8) + '...',
      status: w.status,
      destination: w.destination,
      created: w.created_at?.slice(0, 19),
    })));
  }

  // 5. In-App Notifications
  const { data: notifs } = await adminClient.from('in_app_notifications').select('id, user_id, title, notification_type, is_read, created_at');
  console.log(`\n[IN-APP NOTIFICATIONS] Total: ${notifs?.length || 0}`);
  if (notifs && notifs.length > 0) {
    console.table(notifs.map(n => ({
      id: n.id.slice(0, 8) + '...',
      user: n.user_id?.slice(0, 8) + '...',
      type: n.notification_type,
      title: n.title,
      created: n.created_at?.slice(0, 19),
    })));
  }

  // 6. User OTP Verifications
  const { data: otps } = await adminClient.from('user_otp_verifications').select('id, identifier, identifier_type, verified, purpose, expires_at, created_at');
  console.log(`\n[USER OTP VERIFICATIONS] Total: ${otps?.length || 0}`);
  if (otps && otps.length > 0) {
    console.table(otps.map(o => ({
      id: o.id.slice(0, 8) + '...',
      identifier: o.identifier,
      type: o.identifier_type,
      verified: o.verified,
      purpose: o.purpose,
      created: o.created_at?.slice(0, 19),
    })));
  }

  // 7. Student Profiles & Staff Profiles
  const { data: studentProfiles } = await adminClient.from('student_profiles').select('id, student_id_number, verification_status, academic_year');
  console.log(`\n[STUDENT PROFILES] Total: ${studentProfiles?.length || 0}`);
  if (studentProfiles && studentProfiles.length > 0) {
    console.table(studentProfiles);
  }

  const { data: staffProfiles } = await adminClient.from('staff_profiles').select('id, staff_id_number, designation, department');
  console.log(`\n[STAFF PROFILES] Total: ${staffProfiles?.length || 0}`);
  if (staffProfiles && staffProfiles.length > 0) {
    console.table(staffProfiles);
  }

  // 8. Colleges
  const { data: colleges } = await adminClient.from('colleges').select('id, name, code, is_active');
  console.log(`\n[COLLEGES] Total: ${colleges?.length || 0}`);
  if (colleges && colleges.length > 0) {
    console.table(colleges);
  }
}

inspect().catch(console.error);

