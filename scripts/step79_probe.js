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

async function run() {
  console.log('=== STEP 79 LIVE PROBE VIA SUPABASE CLIENT ===');

  // 1. Storage Buckets Probe
  console.log('\n--- 1. STORAGE BUCKETS ---');
  try {
    const { data: buckets, error: bError } = await supabase.storage.listBuckets();
    if (bError) {
      console.log('Storage Buckets Error:', bError.message);
    } else {
      console.log('Buckets Count:', buckets?.length);
      buckets?.forEach(b => {
        console.log(`- Bucket ID: "${b.id}", Name: "${b.name}", Public: ${b.public}, FileLimit: ${b.file_size_limit}, AllowedMIME: ${JSON.stringify(b.allowed_mime_types)}`);
      });
    }

    // Explicit check for kavach-evidence & kavach-id-cards
    const evidenceBucket = await supabase.storage.getBucket('kavach-evidence');
    console.log('Direct getBucket(kavach-evidence):', evidenceBucket.data ? { id: evidenceBucket.data.id, public: evidenceBucket.data.public, limit: evidenceBucket.data.file_size_limit } : evidenceBucket.error?.message);

    const idCardsBucket = await supabase.storage.getBucket('kavach-id-cards');
    console.log('Direct getBucket(kavach-id-cards):', idCardsBucket.data ? { id: idCardsBucket.data.id, public: idCardsBucket.data.public, limit: idCardsBucket.data.file_size_limit } : idCardsBucket.error?.message);
  } catch (err) {
    console.log('Storage probe error:', err.message);
  }

  // 2. Duplicate Student IDs Probe
  console.log('\n--- 2. STUDENT PROFILES & DUPLICATES ---');
  try {
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('id, student_id, role')
      .eq('role', 'STUDENT');

    if (pError) {
      console.log('Profiles Query (Anon):', pError.message);
      console.log('Note: RLS correctly blocks anonymous access to all student profiles.');
    } else {
      console.log(`Fetched ${profiles.length} student profiles.`);
      const counts = {};
      profiles.forEach(p => {
        if (p.student_id) counts[p.student_id] = (counts[p.student_id] || 0) + 1;
      });
      const dupes = Object.entries(counts).filter(([id, c]) => c > 1);
      console.log('Duplicate Student IDs:', dupes.length > 0 ? dupes : 'None (0 duplicates)');
    }
  } catch (err) {
    console.log('Profiles error:', err.message);
  }

  // 3. Testing RLS on Incidents and Student Isolation
  console.log('\n--- 3. INCIDENTS RLS PROBE (Anonymous Caller) ---');
  try {
    const { data: incData, error: incError } = await supabase
      .from('incidents')
      .select('id, case_id, student_id')
      .limit(5);

    if (incError) {
      console.log('Incidents query error:', incError.message);
    } else {
      console.log(`Anonymous caller received ${incData.length} incidents.`);
      if (incData.length === 0) {
        console.log('Incidents Table RLS ENFORCED: Anonymous callers receive 0 rows.');
      } else {
        console.log('WARNING: Anonymous caller received incident rows:', incData);
      }
    }
  } catch (err) {
    console.log('Incidents RLS error:', err.message);
  }

  // 4. Testing RLS on Audit Logs
  console.log('\n--- 4. AUDIT LOGS RLS PROBE (Anonymous Caller) ---');
  try {
    const { data: auditData, error: auditError } = await supabase
      .from('audit_logs')
      .select('id, action')
      .limit(5);

    if (auditError) {
      console.log('Audit logs query error:', auditError.message);
    } else {
      console.log(`Anonymous caller received ${auditData.length} audit logs (Expected: 0).`);
    }
  } catch (err) {
    console.log('Audit logs error:', err.message);
  }

  // 5. Testing Helper Functions via RPC
  console.log('\n--- 5. RPC SECURITY FUNCTIONS PROBE ---');
  const funcs = ['is_staff', 'is_admin', 'is_security_or_admin', 'get_user_role'];
  for (const f of funcs) {
    try {
      const { data, error } = await supabase.rpc(f);
      if (error) {
        console.log(`rpc("${f}") -> ${error.message} (Code: ${error.code})`);
      } else {
        console.log(`rpc("${f}") -> Result: ${data}`);
      }
    } catch (e) {
      console.log(`rpc("${f}") Exception -> ${e.message}`);
    }
  }
}

run();
