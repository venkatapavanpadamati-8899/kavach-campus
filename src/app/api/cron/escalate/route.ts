import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { timingSafeEqual } from 'node:crypto';
import { insertInAppNotification } from '@/lib/notifications';

function safeSecretCompare(provided?: string | null, expected?: string | null): boolean {
  if (!provided || !expected) return false;
  const bufProvided = Buffer.from(provided);
  const bufExpected = Buffer.from(expected);
  if (bufProvided.length !== bufExpected.length) return false;
  return timingSafeEqual(bufProvided, bufExpected);
}

export async function POST(req: Request) {
  try {
    // 1. Verify cron secret to prevent unauthorized access
    // Strictly Bearer token header authentication (Authorization: Bearer <CRON_SECRET>)
    // Rejects query parameters and non-standard headers to prevent secret exposure in logs
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');

    let providedToken = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      providedToken = authHeader.slice(7).trim();
    }

    if (!cronSecret || !safeSecretCompare(providedToken, cronSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (
      serviceRoleKey.length <= 30 ||
      serviceRoleKey.includes('YOUR_SERVICE_ROLE_KEY') ||
      serviceRoleKey.includes('placeholder')
    ) {
      return NextResponse.json(
        { error: 'Cron database access is not configured.' },
        { status: 503 }
      );
    }

    const supabase = createAdminClient();

    // 2. Find SOS incidents that are ASSIGNED but not acknowledged (status still ASSIGNED)
    // and older than 5 minutes.
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    const { data: overdueIncidents, error: fetchError } = await supabase
      .from('incidents')
      .select('id, case_id, assigned_to, created_at')
      .eq('status', 'ASSIGNED')
      .lt('updated_at', fiveMinutesAgo.toISOString());

    if (fetchError) {
      console.error('Error fetching overdue incidents:', fetchError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!overdueIncidents || overdueIncidents.length === 0) {
      return NextResponse.json({ message: 'No overdue incidents found' }, { status: 200 });
    }

    console.log(`Found ${overdueIncidents.length} overdue incidents to escalate.`);

    let escalatedCount = 0;

    // 3. Process Escalate
    for (const incident of overdueIncidents) {
      // Atomic guard: atomically transition status from ASSIGNED to ESCALATED
      const { data: updatedIncidents, error: updateErr } = await supabase
        .from('incidents')
        .update({
          status: 'ESCALATED',
          updated_at: new Date().toISOString()
        })
        .eq('id', incident.id)
        .eq('status', 'ASSIGNED')
        .select('id');

      if (updateErr || !updatedIncidents || updatedIncidents.length === 0) {
        // Concurrently escalated or acknowledged by another process
        continue;
      }

      escalatedCount++;

      // Create escalation record
      await supabase.from('escalations').insert({
        incident_id: incident.id,
        from_level: 'STAFF',
        to_level: 'ADMIN',
        reason: 'STAFF_TIMEOUT'
      });

      // Audit Log
      await supabase.from('audit_logs').insert({
        actor_id: null,
        action: 'SOS_ESCALATED',
        entity_type: 'incidents',
        entity_id: incident.id,
        metadata: { actor: 'SYSTEM', reason: 'STAFF_TIMEOUT', original_assignee: incident.assigned_to }
      });
      
      // Notify Admins
      const { data: adminList } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['ADMIN', 'SUPER_ADMIN']);
        
      if (adminList) {
        for (const admin of adminList) {
          await insertInAppNotification(supabase, {
            userId: admin.id,
            incidentId: incident.id,
            caseId: incident.case_id,
            title: 'ESCALATION ALERT',
            message: `Incident ${incident.case_id} escalated due to staff timeout.`,
            type: 'ESCALATION',
          });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      escalatedCount 
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('Cron escalation failed:', error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : "An unexpected error occurred") }, { status: 500 });
  }
}

export const GET = POST;
