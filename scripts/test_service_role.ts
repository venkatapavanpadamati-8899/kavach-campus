import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.log('MISSING_CONFIG');
  process.exit(1);
}

const isPlaceholder =
  serviceRoleKey.includes('YOUR_') ||
  serviceRoleKey.includes('placeholder') ||
  serviceRoleKey === 'YOUR_SERVICE_ROLE_KEY_HERE';

if (isPlaceholder) {
  console.log('SERVICE_ROLE_KEY: PLACEHOLDER');
  process.exit(0);
}

console.log('SERVICE_ROLE_KEY: CONFIGURED (Length: ' + serviceRoleKey.length + ' chars)');
console.log('Testing endpoint:', url.replace(/^(https:\/\/[^.]+).*/, '$1.supabase.co'));

const adminClient = createClient(url, serviceRoleKey);

async function testConnection() {
  // 1. Test reading audit_logs (which has RLS deny all for anon/public)
  try {
    const { data, error, status } = await adminClient
      .from('audit_logs')
      .select('action, entity_type, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.log('audit_logs read error (Status ' + status + '):', error.message);
    } else {
      console.log('✅ Service Role Auth SUCCESS! Successfully bypassed RLS on audit_logs. Records returned:', data ? data.length : 0);
      if (data && data.length > 0) {
        console.log('Recent audit actions:', data.map(r => r.action));
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log('audit_logs exception:', msg);
  }

  // 2. Test checking storage buckets with service role
  try {
    const { data: buckets, error: bucketError } = await adminClient.storage.listBuckets();
    if (bucketError) {
      console.log('Storage buckets error:', bucketError.message);
    } else {
      console.log('✅ Storage Buckets found:', buckets ? buckets.map(b => `${b.name} (public: ${b.public})`) : []);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log('Storage exception:', msg);
  }

  // 3. Test checking profiles count
  try {
    const { count, error } = await adminClient
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log('Profiles count error:', error.message);
    } else {
      console.log('✅ Profiles total count in DB:', count);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log('Profiles exception:', msg);
  }
}

testConnection().catch(console.error);
