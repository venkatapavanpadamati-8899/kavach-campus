import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
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

    const { id } = await params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    // 2. Fetch incident to check authorization & tenant
    const { data: incident, error: incError } = await supabase
      .from('incidents')
      .select('id, case_id, user_id, college_id')
      .eq(isUuid ? 'id' : 'case_id', id)
      .single();

    if (incError || !incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    // 3. Check caller authorization:
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, college_id')
      .eq('id', user.id)
      .single();

    const role = profile?.role ?? 'STUDENT';
    const isPrivileged = [
      'STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN', 
      'COUNSELLOR', 'WOMENS_CELL', 'HOD', 'PRINCIPAL', 'MANAGEMENT'
    ].includes(role);

    // If student, can only view notes if they created the incident
    if (!isPrivileged && incident.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to view these notes.' },
        { status: 403 }
      );
    }

    // College boundary check (unless super_admin)
    if (role !== 'SUPER_ADMIN' && profile?.college_id && incident.college_id && profile.college_id !== incident.college_id) {
      return NextResponse.json(
        { error: 'Forbidden: Cross-college access is not permitted.' },
        { status: 403 }
      );
    }

    // 4. Fetch case actions (notes)
    const { data: notes, error: notesError } = await supabase
      .from('case_actions')
      .select('id, incident_id, actor_id, action, from_status, to_status, notes, created_at')
      .eq('incident_id', incident.id)
      .order('created_at', { ascending: true });

    if (notesError) {
      return NextResponse.json({ error: 'Failed to retrieve case notes' }, { status: 500 });
    }

    return NextResponse.json({ notes: notes || [] }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : "An unexpected error occurred") },
      { status: 500 }
    );
  }
}

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

    // 2. Authorize role: only staff, security, counsellors, or administrators can add official case notes
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
        { error: 'Forbidden: Only authorized campus staff or administrators can add case notes.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const noteText = (body.note || body.notes || '').trim();

    if (!noteText) {
      return NextResponse.json(
        { error: 'Note content cannot be empty.' },
        { status: 400 }
      );
    }

    // 3. Fetch incident
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const { data: incident, error: incError } = await supabase
      .from('incidents')
      .select('id, case_id, status')
      .eq(isUuid ? 'id' : 'case_id', id)
      .single();

    if (incError || !incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    // 4. Insert into case_actions timeline
    const { data: actionRecord, error: actionError } = await supabase
      .from('case_actions')
      .insert({
        incident_id: incident.id,
        actor_id: user.id,
        action: 'NOTE_ADDED',
        from_status: incident.status,
        to_status: incident.status,
        notes: noteText
      })
      .select()
      .single();

    if (actionError) {
      console.error('Failed to insert case action:', actionError);
      return NextResponse.json({ error: 'Failed to record case note' }, { status: 500 });
    }

    // 5. Insert into immutable audit_logs
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'CASE_NOTE_ADDED',
      entity_type: 'incidents',
      entity_id: incident.id,
      metadata: {
        case_id: incident.case_id,
        note: noteText,
        author_name: userProfile.full_name,
        author_role: userProfile.role
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Case note added successfully.',
      action: actionRecord
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Case note error:', error);
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : "An unexpected error occurred") },
      { status: 500 }
    );
  }
}
