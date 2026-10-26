import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(url, serviceRoleKey);

async function probe() {
  // 1. Check all audit_logs
  const { data: audit, error: auditErr } = await adminClient
    .from('audit_logs')
    .select('action, target_type, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('audit_logs count:', audit ? audit.length : 0);
  if (audit && audit.length > 0) {
    console.log('audit_logs records:', JSON.stringify(audit, null, 2));
  }

  // 2. Check storage buckets
  const { data: buckets } = await adminClient.storage.listBuckets();
  console.log('Storage Buckets:', buckets?.map(b => ({ name: b.name, public: b.public })));

  // 3. Check storage policies for kavach-id-cards
  // Can an unauthenticated or anon user list objects in kavach-id-cards?
  const anonClient = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: anonFiles, error: anonFilesErr } = await anonClient.storage.from('kavach-id-cards').list();
  console.log('Anon files in kavach-id-cards error:', anonFilesErr ? anonFilesErr.message : 'NONE');
  console.log('Anon files in kavach-id-cards count:', anonFiles ? anonFiles.length : 0);
}

probe().catch(console.error);
