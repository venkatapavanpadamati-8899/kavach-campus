const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, anonKey);

async function checkColumns() {
  console.log('=== KAVACH CAMPUS: REMOTE COLUMN & SCHEMA LEVEL PROBE ===');

  const tests = [
    {
      table: 'profiles',
      columns: 'id, full_name, role, student_id, college_email'
    },
    {
      table: 'profiles',
      columns: 'is_location_sharing_enabled, last_location_updated_at'
    },
    {
      table: 'student_profiles',
      columns: 'id, course, emergency_contact_phone'
    },
    {
      table: 'student_profiles',
      columns: 'admission_type, admission_year, expected_graduation_year, id_card_url, verification_status'
    },
    {
      table: 'safe_walks',
      columns: 'id, student_id, destination, started_at, status'
    },
    {
      table: 'safe_walks',
      columns: 'expires_at, auto_sos_enabled, auto_sos_timeout_mins, last_latitude, last_longitude'
    },
    {
      table: 'incidents',
      columns: 'id, case_id, student_id, category, severity, status, latitude, longitude, assigned_to'
    },
    {
      table: 'escalations',
      columns: 'id, incident_id, from_level, to_level, reason, triggered_at'
    }
  ];

  for (const t of tests) {
    try {
      const { data, error, status } = await supabase
        .from(t.table)
        .select(t.columns)
        .limit(1);

      if (error) {
        console.log(`[FAIL] ${t.table} (${t.columns}) -> ${error.message}`);
      } else {
        console.log(`[PASS] ${t.table} (${t.columns}) -> Columns Exist! (Status ${status})`);
      }
    } catch (e) {
      console.log(`[ERR]  ${t.table} (${t.columns}) -> ${e.message}`);
    }
  }
}

checkColumns();
