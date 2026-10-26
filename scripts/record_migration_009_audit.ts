import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { randomUUID } from 'crypto';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(url, serviceRoleKey);

async function recordAudit() {
  console.log('Inserting SCHEMA_MIGRATION_009 into public.audit_logs with id & target_type...');

  const { data, error } = await adminClient.from('audit_logs').insert({
    id: randomUUID(),
    action: 'SCHEMA_MIGRATION_009',
    target_type: 'student_profiles',
    metadata: { description: 'Student ID verification resubmission status and self-approval prevention trigger applied' },
    created_at: new Date().toISOString(),
  }).select();

  if (error) {
    console.log('❌ Audit insert error:', error.message);
  } else {
    console.log('✅ Audit log successfully written! Record:', data);
  }
}

recordAudit().catch(console.error);
