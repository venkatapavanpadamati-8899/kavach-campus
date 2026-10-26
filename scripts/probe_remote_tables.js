const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually to avoid external dependency issues
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

if (!url || !anonKey) {
  console.error('Error: Supabase URL or Anon key missing in .env.local');
  process.exit(1);
}

const supabase = createClient(url, anonKey);

const expectedTables = [
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
  'safe_walks',
  'trusted_contacts',
  'audit_logs',
  'ai_configuration',
  'emergency_configuration'
];

async function probe() {
  console.log('=== KAVACH CAMPUS: REMOTE SUPABASE READ-ONLY PROBE ===');
  console.log(`Target Project: ${url}`);
  console.log('Timestamp: ' + new Date().toISOString() + '\n');

  for (const table of expectedTables) {
    try {
      const { data, count, error, status } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      let verdict = 'UNKNOWN';
      if (status === 200) {
        verdict = 'TABLE_EXISTS (Accessible to anon)';
      } else if (status === 401 || status === 403) {
        verdict = 'TABLE_EXISTS (Protected by RLS)';
      } else if (status === 404 || (error && error.message.includes('does not exist'))) {
        verdict = 'TABLE_NOT_FOUND (Missing in schema)';
      } else {
        verdict = `STATUS_${status} (${error ? error.message : 'OK'})`;
      }

      console.log(`[${status}] ${table.padEnd(25)} -> ${verdict}`);
    } catch (err) {
      console.log(`[ERR] ${table.padEnd(25)} -> Exception: ${err.message}`);
    }
  }

  // Also check storage bucket access
  console.log('\n--- Probing Storage Buckets (Anon) ---');
  try {
    const { data: buckets, error: bError } = await supabase.storage.listBuckets();
    if (bError) {
      console.log('List buckets result:', bError.message);
    } else {
      console.log('Buckets visible:', buckets.length ? buckets.map(b => `${b.name} (public=${b.public})`).join(', ') : '0 buckets visible to anon');
    }
  } catch (bErr) {
    console.log('Storage probe exception:', bErr.message);
  }

  console.log('\nRemote probe finished successfully.');
}

probe();
