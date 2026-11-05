import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runForensicAudit() {
  console.log('=== KAVACH CAMPUS — FORENSIC READ-ONLY AUDIT ===\n');

  // 1. INVESTIGATE ALL 40 INCIDENTS
  console.log('--- 1. FETCHING ALL 40 INCIDENTS ---');
  const { data: incidents, error: incErr } = await supabase
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: true });

  if (incErr) console.error('Incidents fetch error:', incErr);
  console.log(`Fetched ${incidents?.length} incidents.`);

  // For each incident, check child records and details
  const incidentDossiers = [];
  for (const inc of incidents || []) {
    const { data: locations } = await supabase.from('incident_locations').select('*').eq('incident_id', inc.id);
    const { data: escalations } = await supabase.from('escalations').select('*').eq('incident_id', inc.id);
    const { data: caseActions } = await supabase.from('case_actions').select('*').eq('incident_id', inc.id);
    const { data: notifs } = await supabase.from('notifications').select('*').eq('case_id', inc.case_id);
    const { data: evidence } = await supabase.from('evidence').select('*').eq('incident_id', inc.id);
    const { data: aiAnalysis } = await supabase.from('ai_analyses').select('*').eq('incident_id', inc.id);
    const { data: messages } = await supabase.from('incident_messages').select('*').eq('incident_id', inc.id);
    const { data: auditEntries } = await supabase.from('audit_logs').select('*').eq('entity_id', inc.id);

    incidentDossiers.push({
      id: inc.id,
      case_id: inc.case_id,
      student_id: inc.student_id,
      category: inc.category,
      severity: inc.severity,
      urgency: inc.urgency,
      status: inc.status,
      is_anonymous: inc.is_anonymous,
      description: inc.description,
      college_id: inc.college_id,
      assigned_to: inc.assigned_to,
      created_at: inc.created_at,
      location_count: locations?.length || 0,
      escalation_count: escalations?.length || 0,
      action_count: caseActions?.length || 0,
      notif_count: notifs?.length || 0,
      evidence_count: evidence?.length || 0,
      ai_count: aiAnalysis?.length || 0,
      message_count: messages?.length || 0,
      audit_count: auditEntries?.length || 0,
      locations,
      escalations,
      caseActions,
      notifs,
    });
  }

  // 2. INVESTIGATE ALL 481 AUDIT LOGS
  console.log('\n--- 2. FETCHING ALL AUDIT LOGS ---');
  const { data: auditLogs, error: auditErr } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: true });

  if (auditErr) console.error('Audit logs fetch error:', auditErr);
  console.log(`Fetched ${auditLogs?.length} audit logs.`);

  const auditSummary: Record<string, number> = {};
  const actorSummary: Record<string, number> = {};
  const entityTypeSummary: Record<string, number> = {};

  for (const log of auditLogs || []) {
    const action = log.action || log.event_type || 'UNKNOWN';
    auditSummary[action] = (auditSummary[action] || 0) + 1;
    const actor = log.actor_id || log.user_id || 'SYSTEM/ANON';
    actorSummary[actor] = (actorSummary[actor] || 0) + 1;
    const entity = log.entity_type || 'UNKNOWN';
    entityTypeSummary[entity] = (entityTypeSummary[entity] || 0) + 1;
  }

  // 3. INVESTIGATE ALL 34 USER OTP VERIFICATIONS
  console.log('\n--- 3. FETCHING ALL 34 OTP VERIFICATIONS ---');
  const { data: otps, error: otpErr } = await supabase
    .from('user_otp_verifications')
    .select('*')
    .order('created_at', { ascending: true });

  if (otpErr) console.error('OTP fetch error:', otpErr);
  console.log(`Fetched ${otps?.length} OTP records.`);

  // 4. INVESTIGATE 4 CANDIDATE ACCOUNTS
  console.log('\n--- 4. INSPECTING AUTH USERS & STORAGE ---');
  const { data: authUsersData } = await supabase.auth.admin.listUsers({ perPage: 100 });
  const allUsers = authUsersData?.users || [];

  const candidateEmails = [
    'staff.asstprof.mw228ehb@srkr.edu.in',
    'student.live.mw228ehb@srkr.edu.in',
    'nani@gmail.com',
    'pavan@gmail.com',
  ];

  const candidateDossiers = [];
  for (const email of candidateEmails) {
    const user = allUsers.find(u => u.email === email);
    if (!user) {
      candidateDossiers.push({ email, found: false });
      continue;
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    const { data: studentProf } = await supabase.from('student_profiles').select('*').eq('id', user.id).single();
    const { data: staffProf } = await supabase.from('staff_profiles').select('*').eq('id', user.id).single();
    const { data: userIncidents } = await supabase.from('incidents').select('id, case_id').eq('student_id', user.id);
    const { data: userAudit } = await supabase.from('audit_logs').select('id, action, created_at').eq('user_id', user.id);

    candidateDossiers.push({
      email,
      id: user.id,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata,
      profile,
      studentProf,
      staffProf,
      incident_count: userIncidents?.length || 0,
      audit_count: userAudit?.length || 0,
    });
  }

  // 5. STORAGE BUCKET CHECK
  console.log('\n--- 5. CHECKING STORAGE BUCKETS ---');
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketFiles: Record<string, any[]> = {};
  for (const b of buckets || []) {
    const { data: files } = await supabase.storage.from(b.name).list();
    bucketFiles[b.name] = files || [];
  }

  // Save forensic report to file
  const report = {
    incidentCount: incidents?.length || 0,
    incidentDossiers,
    auditLogCount: auditLogs?.length || 0,
    auditSummary,
    actorSummary,
    entityTypeSummary,
    sampleAuditLogs: auditLogs?.slice(0, 10),
    otpCount: otps?.length || 0,
    otps,
    candidateDossiers,
    buckets: buckets?.map(b => b.name),
    bucketFiles,
  };

  fs.writeFileSync('scripts/forensic_report.json', JSON.stringify(report, null, 2));
  console.log('\nForensic report written to scripts/forensic_report.json successfully.');
}

runForensicAudit().catch(console.error);

