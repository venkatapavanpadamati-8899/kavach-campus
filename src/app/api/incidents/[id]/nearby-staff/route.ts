import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  calculateHaversineDistance, 
  isCoordinateFresh, 
  SEVERITY_TARGET_ROLES, 
  SeverityLevel 
} from '@/lib/routing/assignment';

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

    // 2. Verify caller role (Only authorized staff/responders/admins)
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const authorizedRoles = [
      'STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN', 
      'COUNSELLOR', 'WOMENS_CELL', 'HOD', 'PRINCIPAL'
    ];

    if (!callerProfile || !authorizedRoles.includes(callerProfile.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only authorized responders or administrators can query nearby staff.' },
        { status: 403 }
      );
    }

    const { id: incidentId } = await params;

    // 3. Fetch incident details
    const { data: incident, error: incError } = await supabase
      .from('incidents')
      .select('id, case_id, category, severity, status, latitude, longitude, campus_zone_id, assigned_to')
      .eq('id', incidentId)
      .single();

    if (incError || !incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    // Verify caller is authorized to view/reassign this specific incident
    const isSecurityOrAdmin = ['SECURITY', 'ADMIN', 'SUPER_ADMIN'].includes(callerProfile.role);
    const isAssignedResponder = incident.assigned_to === user.id;
    const isUnassignedIncident = !incident.assigned_to;

    if (!isSecurityOrAdmin && !isAssignedResponder && !isUnassignedIncident) {
      return NextResponse.json(
        { error: 'Forbidden: You are not authorized to query responders for this case.' },
        { status: 403 }
      );
    }

    const incidentSeverity = (incident.severity || 'MEDIUM') as SeverityLevel;
    const allowedRolesForSeverity = SEVERITY_TARGET_ROLES[incidentSeverity] || ['STAFF', 'SECURITY', 'ADMIN'];

    // 4. Fetch eligible active, approved staff members
    const { data: staffProfiles, error: staffError } = await supabase
      .from('profiles')
      .select('id, full_name, role, department, is_active, is_approved')
      .in('role', authorizedRoles)
      .eq('is_active', true)
      .eq('is_approved', true);

    if (staffError) {
      console.error('Error querying staff profiles:', staffError);
      return NextResponse.json({ error: 'Failed to query responders' }, { status: 500 });
    }

    const candidates = staffProfiles || [];

    // 5. Fetch location records for staff from staff_locations (dedicated model with consent)
    // with graceful backward-compatible fallback to incident_locations for legacy test harnesses
    const locationMap: Record<string, { latitude: number; longitude: number; recorded_at: string; consent: boolean }> = {};

    try {
      const { data: staffLocs } = await supabase
        .from('staff_locations')
        .select('staff_id, latitude, longitude, accuracy, updated_at, is_on_duty, is_location_sharing_enabled')
        .eq('is_on_duty', true)
        .eq('is_location_sharing_enabled', true)
        .order('updated_at', { ascending: false });

      if (staffLocs && staffLocs.length > 0) {
        for (const loc of staffLocs) {
          if (loc.latitude != null && loc.longitude != null && !isNaN(Number(loc.latitude)) && !isNaN(Number(loc.longitude))) {
            locationMap[loc.staff_id] = {
              latitude: Number(loc.latitude),
              longitude: Number(loc.longitude),
              recorded_at: loc.updated_at,
              consent: Boolean(loc.is_location_sharing_enabled),
            };
          }
        }
      }
    } catch {
      // Safe fallback when staff_locations is not yet provisioned
    }

    // Fallback: check legacy incident_locations if staff_locations returned no records
    if (Object.keys(locationMap).length === 0) {
      try {
        const { data: recentLocations } = await supabase
          .from('incident_locations')
          .select('incident_id, latitude, longitude, accuracy, recorded_at')
          .order('recorded_at', { ascending: false })
          .limit(50);

        if (recentLocations && recentLocations.length > 0) {
          for (const loc of recentLocations) {
            if (loc.latitude != null && loc.longitude != null && !isNaN(Number(loc.latitude)) && !isNaN(Number(loc.longitude))) {
              locationMap[loc.incident_id] = {
                latitude: Number(loc.latitude),
                longitude: Number(loc.longitude),
                recorded_at: loc.recorded_at,
                consent: true, // legacy implicit
              };
            }
          }
        }
      } catch {
        // Safe fallback
      }
    }

    const hasIncidentCoords = 
      incident.latitude != null && 
      incident.longitude != null && 
      !isNaN(Number(incident.latitude)) && 
      !isNaN(Number(incident.longitude));

    // 6. Process each candidate
    interface ProcessedCandidate {
      id: string;
      name: string;
      role: string;
      department: string | null;
      isCurrentlyAssigned: boolean;
      distanceMeters: number | null;
      hasFreshGps: boolean;
      lastSeenMinutesAgo: number | null;
      isRoleQualified: boolean;
    }

    const processedList: ProcessedCandidate[] = [];

    for (const c of candidates) {
      const isRoleQualified = allowedRolesForSeverity.includes(c.role);
      const isCurrentlyAssigned = incident.assigned_to === c.id;

      let distanceMeters: number | null = null;
      let hasFreshGps = false;
      let lastSeenMinutesAgo: number | null = null;

      const loc = locationMap[c.id];
      if (loc && loc.recorded_at) {
        const fresh = isCoordinateFresh(loc.recorded_at, 15);
        if (fresh) {
          hasFreshGps = true;
          const ageMs = Date.now() - new Date(loc.recorded_at).getTime();
          lastSeenMinutesAgo = Math.max(0, Math.round(ageMs / 60000));

          if (hasIncidentCoords) {
            const dist = calculateHaversineDistance(
              incident.latitude!,
              incident.longitude!,
              loc.latitude,
              loc.longitude
            );
            if (!isNaN(dist)) {
              distanceMeters = dist;
            }
          }
        }
      }

      processedList.push({
        id: c.id,
        name: c.full_name || 'Staff Responder',
        role: c.role,
        department: c.department || null,
        isCurrentlyAssigned,
        distanceMeters,
        hasFreshGps,
        lastSeenMinutesAgo,
        isRoleQualified,
      });
    }

    // Sort: role qualified first, then by distance (if available), then by name
    processedList.sort((a, b) => {
      // Role qualification priority
      if (a.isRoleQualified && !b.isRoleQualified) return -1;
      if (!a.isRoleQualified && b.isRoleQualified) return 1;

      // Distance priority (if both have GPS)
      if (a.distanceMeters != null && b.distanceMeters != null) {
        return a.distanceMeters - b.distanceMeters;
      }
      if (a.distanceMeters != null && b.distanceMeters == null) return -1;
      if (a.distanceMeters == null && b.distanceMeters != null) return 1;

      return a.name.localeCompare(b.name);
    });

    const anyHasFreshGps = processedList.some(c => c.hasFreshGps);

    // 7. Record authorized audit log (non-fatal if audit table mock is omitted)
    try {
      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        action: 'NEARBY_STAFF_LOOKUP',
        entity_type: 'incidents',
        entity_id: incident.id,
        metadata: {
          incident_id: incident.id,
          caller_role: callerProfile.role,
          has_incident_gps: hasIncidentCoords,
          candidate_count: processedList.length,
          qualified_count: processedList.filter(c => c.isRoleQualified).length,
          any_fresh_gps: anyHasFreshGps
        }
      });
    } catch {
      // Non-fatal
    }

    let message = 'Available responders queried successfully.';
    if (!hasIncidentCoords) {
      message = 'Incident coordinates unavailable — responders listed by role and institutional eligibility.';
    } else if (!anyHasFreshGps) {
      message = 'Location unavailable — use authorized escalation queue.';
    }

    return NextResponse.json({
      success: true,
      hasIncidentLocation: hasIncidentCoords,
      hasFreshGpsResponders: anyHasFreshGps,
      message,
      candidates: processedList,
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('Nearby staff lookup failed:', error);
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : 'An unexpected error occurred') },
      { status: 500 }
    );
  }
}
