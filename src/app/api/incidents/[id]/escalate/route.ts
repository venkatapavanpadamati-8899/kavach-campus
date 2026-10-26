import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { insertInAppNotification } from '@/lib/notifications';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Authorize role: only staff, security, management, or administrators can escalate
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', user.id)
      .single();

    const allowedRoles = [
      'STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN', 
      'COUNSELLOR', 'WOMENS_CELL', 'HOD', 'PRINCIPAL', 'MANAGEMENT'
    ];
    if (!userProfile || !allowedRoles.includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only authorized campus staff or administrators can escalate incidents.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { reason, to_level, notes } = body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Escalation reason is required.' },
        { status: 400 }
      );
    }

    // 3. Fetch incident
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const { data: incident, error: incError } = await supabase
      .from('incidents')
      .select('id, case_id, status, category, severity')
      .eq(isUuid ? 'id' : 'case_id', id)
      .single();

    if (incError || !incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    if (incident.status === 'RESOLVED' || incident.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'Cannot escalate a resolved or closed incident.' },
        { status: 400 }
      );
    }

    const targetLevel = to_level || 'MANAGEMENT';

    // 4. Record escalation in escalations table
    await supabase.from('escalations').insert({
      incident_id: incident.id,
      from_level: userProfile.role,
      to_level: targetLevel,
      reason: reason.trim(),
      escalated_by: user.id
    });

    // 5. Record action in case_actions timeline
    await supabase.from('case_actions').insert({
      incident_id: incident.id,
      actor_id: user.id,
      action: 'ESCALATED',
      from_status: incident.status,
      to_status: incident.status,
      notes: `Escalated to ${targetLevel}. Reason: ${reason.trim()}${notes ? ` | Additional Notes: ${notes.trim()}` : ''}`
    });

    // 6. Record in immutable audit_logs
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'INCIDENT_ESCALATED',
      entity_type: 'incidents',
      entity_id: incident.id,
      metadata: {
        case_id: incident.case_id,
        from_level: userProfile.role,
        to_level: targetLevel,
        reason: reason.trim(),
        notes: notes ? notes.trim() : null
      }
    });

    // 7. Dispatch in-app notifications to admins and management
    const { data: managementRecipients } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['ADMIN', 'SUPER_ADMIN', 'MANAGEMENT'])
      .eq('is_active', true);

    if (managementRecipients && managementRecipients.length > 0) {
      for (const recipient of managementRecipients) {
        await insertInAppNotification(supabase, {
          userId: recipient.id,
          incidentId: incident.id,
          caseId: incident.case_id,
          title: `ESCALATION: Case ${incident.case_id}`,
          message: `Case ${incident.case_id} (${incident.category}) escalated by ${userProfile.full_name} to ${targetLevel}. Reason: ${reason.trim()}`,
          type: 'ESCALATION',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Incident ${incident.case_id} successfully escalated to ${targetLevel}.`,
      incidentId: incident.id,
      targetLevel
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('Incident escalation error:', error);
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : "An unexpected error occurred") },
      { status: 500 }
    );
  }
}
