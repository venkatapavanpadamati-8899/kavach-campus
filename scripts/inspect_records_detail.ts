import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log('=== DETAILED INVENTORY OF USERS, PROFILES & INCIDENTS ===\n');

  // 1. Auth Users
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 100 });
  console.log('--- AUTH USERS ---');
  authUsers?.users.forEach(u => {
    console.log(`[USER] ID: ${u.id} | Email: ${u.email} | Created: ${u.created_at} | Confirmed: ${u.email_confirmed_at ? 'YES' : 'NO'}`);
  });

  // 2. Profiles
  const { data: profs } = await supabase.from('profiles').select('*');
  console.log('\n--- PROFILES ---');
  profs?.forEach(p => {
    console.log(`[PROFILE] ID: ${p.id} | Email: ${p.college_email || p.email} | Role: ${p.role} | Name: ${p.full_name} | College: ${p.college_id} | Approved: ${p.is_approved}`);
  });

  // 3. Student Profiles
  const { data: sps } = await supabase.from('student_profiles').select('*');
  console.log('\n--- STUDENT PROFILES ---');
  sps?.forEach(s => {
    console.log(`[STUDENT_PROFILE] ID: ${s.id} | RegNo: ${s.student_id_number} | Status: ${s.verification_status} | Year: ${s.academic_year}`);
  });

  // 4. Incidents (All 40)
  const { data: incs } = await supabase.from('incidents').select('id, case_id, title, category, severity, status, student_id, college_id, created_at').order('created_at', { ascending: false });
  console.log(`\n--- INCIDENTS (${incs?.length || 0}) ---`);
  incs?.forEach(i => {
    console.log(`[INCIDENT] Case: ${i.case_id} | Title: ${i.title} | Cat: ${i.category} | Sev: ${i.severity} | Status: ${i.status} | StudentID: ${i.student_id} | College: ${i.college_id} | Created: ${i.created_at}`);
  });

  // 5. OTP Records
  const { data: otps } = await supabase.from('user_otp_verifications').select('id, identifier, identifier_type, email, mobile_number, verified, expires_at, created_at').order('created_at', { ascending: false });
  console.log(`\n--- USER OTP VERIFICATIONS (${otps?.length || 0}) ---`);
  otps?.forEach(o => {
    console.log(`[OTP] ID: ${o.id} | Ident: ${o.identifier} | Email: ${o.email} | Mobile: ${o.mobile_number} | Verified: ${o.verified} | Created: ${o.created_at} | Expires: ${o.expires_at}`);
  });
}

run().catch(console.error);

