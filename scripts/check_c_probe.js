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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function runCheckC() {
  console.log('=== CHECK C: EXACT COLUMNS PROBE ===');

  const queries = [
    { table: 'safe_walks', cols: ['expires_at', 'auto_sos_enabled', 'last_location_at'] },
    { table: 'student_profiles', cols: ['admission_type', 'verification_status', 'id_card_url'] },
    { table: 'profiles', cols: ['student_id', 'role', 'is_approved'] }
  ];

  for (const q of queries) {
    for (const col of q.cols) {
      try {
        const { error, status } = await supabase.from(q.table).select(col).limit(1);
        if (error) {
          console.log(`[FAIL] ${q.table}.${col}: ${error.message}`);
        } else {
          console.log(`[PASS] ${q.table}.${col}: Exists (Status ${status})`);
        }
      } catch (err) {
        console.log(`[ERR] ${q.table}.${col}: ${err.message}`);
      }
    }
  }
}

runCheckC();
