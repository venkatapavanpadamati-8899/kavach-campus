import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const tables = [
  'profiles',
  'student_profiles',
  'staff_profiles',
  'user_otp_verifications',
  'campus_zones',
  'campus_buildings',
  'incidents',
  'incident_locations',
  'evidence',
  'ai_analyses',
  'escalations',
  'incident_messages',
  'case_actions',
  'notifications',
  'in_app_notifications',
  'safe_walks',
  'trusted_contacts',
  'audit_logs',
  'ai_configuration',
  'emergency_configuration',
  'safe_boxes',
  'safe_box_private_notes',
];

async function scan() {
  console.log('=== COMPLETE 19-TABLE REMOTE ROW COUNT SCAN ===');
  for (const t of tables) {
    try {
      const { count, error, data } = await supabase.from(t).select('*', { count: 'exact', head: false }).limit(5);
      if (error) {
        console.log(`Table: ${t.padEnd(25)} -> Error: ${error.message} (Code: ${error.code})`);
      } else {
        console.log(`Table: ${t.padEnd(25)} -> Rows: ${count} (Sample fetched: ${data?.length || 0})`);
      }
    } catch (err: any) {
      console.log(`Table: ${t.padEnd(25)} -> Exception: ${err.message}`);
    }
  }
}

scan().catch(console.error);

