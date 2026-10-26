import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { incidentId, latitude, longitude, accuracy, isStopped } = body;
    
    if (!incidentId) {
      return NextResponse.json({ error: 'Missing incident ID' }, { status: 400 });
    }

    // Verify ownership and tracking active
    const { data: incident, error: selectErr } = await supabase
      .from('incidents')
      .select('id, student_id, status, is_tracking_active')
      .eq('id', incidentId)
      .single();

    if (selectErr || !incident) {
      if (selectErr && (selectErr.code === '42703' || selectErr.code === 'PGRST204' || selectErr.message?.includes('is_tracking_active'))) {
        return NextResponse.json({
          error: 'Tracking service schema blocker: incidents table is missing is_tracking_active column.',
          code: 'SCHEMA_BLOCKER',
          details: selectErr.message
        }, { status: 500 });
      }
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    if (incident.student_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (isStopped) {
      // Stop tracking by updating is_tracking_active and recording audit log
      const { error: updErr } = await supabase
        .from('incidents')
        .update({
          is_tracking_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', incidentId);

      if (updErr) {
        console.error('Failed to update is_tracking_active in incidents:', updErr);
        return NextResponse.json(
          {
            error: 'Failed to persist stopped tracking state. Database column is_tracking_active is required.',
            code: updErr.code || 'UPDATE_FAILED',
            details: updErr.message
          },
          { status: 500 }
        );
      }

      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        action: 'SOS_TRACKING_STOPPED',
        entity_type: 'incidents',
        entity_id: incident.id
      });
      return NextResponse.json({ success: true, tracking: false });
    }

    const isTrackingActive = incident.is_tracking_active !== false && ['RECEIVED', 'ASSIGNED', 'IN_PROGRESS'].includes(incident.status);
    if (!isTrackingActive) {
       return NextResponse.json({ error: 'Tracking is no longer active for this incident' }, { status: 400 });
    }

    const numLat = Number(latitude);
    const numLng = Number(longitude);

    if (
      latitude == null ||
      longitude == null ||
      isNaN(numLat) ||
      isNaN(numLng) ||
      numLat < -90 ||
      numLat > 90 ||
      numLng < -180 ||
      numLng > 180
    ) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    // Insert new location
    const { error: locError } = await supabase.from('incident_locations').insert({
      incident_id: incidentId,
      latitude,
      longitude,
      accuracy
    });

    if (locError) {
      throw locError;
    }

    // Update main incident latest coords
    await supabase.from('incidents').update({
      latitude,
      longitude,
      location_accuracy: accuracy,
      updated_at: new Date().toISOString()
    }).eq('id', incidentId);

    return NextResponse.json({ success: true });
    
  } catch (error: unknown) {
    console.error('SOS Location update failed:', error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : "An unexpected error occurred") }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const incidentId = searchParams.get('incidentId');
    
    if (!incidentId) {
       return NextResponse.json({ error: 'Missing incidentId' }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check incident ownership and authorization explicitly
    const { data: incident } = await supabase
      .from('incidents')
      .select('id, student_id, assigned_to, college_id')
      .eq('id', incidentId)
      .single();

    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    const isIncidentStudent = incident.student_id === user.id;
    const isAssignedResponder = incident.assigned_to === user.id;
    let isSecurityOrAdmin = false;

    if (!isIncidentStudent && !isAssignedResponder) {
      try {
        const { data: callerProfile } = await supabase
          .from('profiles')
          .select('role, college_id')
          .eq('id', user.id)
          .single();
        isSecurityOrAdmin = !!callerProfile && ['SECURITY', 'ADMIN', 'SUPER_ADMIN'].includes(callerProfile.role);
        if (
          isSecurityOrAdmin &&
          callerProfile?.role !== 'SUPER_ADMIN' &&
          incident.college_id &&
          callerProfile?.college_id &&
          incident.college_id !== callerProfile.college_id
        ) {
          isSecurityOrAdmin = false;
        }
      } catch {
        isSecurityOrAdmin = false;
      }
    }

    if (!isIncidentStudent && !isAssignedResponder && !isSecurityOrAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: You are not authorized to view location telemetry for this incident.' },
        { status: 403 }
      );
    }

    const { data: locations, error } = await supabase
      .from('incident_locations')
      .select('latitude, longitude, accuracy, recorded_at')
      .eq('incident_id', incidentId)
      .order('recorded_at', { ascending: false })
      .limit(10);

    if (error) {
       return NextResponse.json({ error: (error instanceof Error ? error.message : "An unexpected error occurred") }, { status: 403 });
    }

    return NextResponse.json({ success: true, locations });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : "An unexpected error occurred") }, { status: 500 });
  }
}
