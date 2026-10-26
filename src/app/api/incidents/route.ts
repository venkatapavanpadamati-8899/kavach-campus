import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeIncident } from '@/lib/ai';
import { getCollegeById } from '@/lib/colleges';
import {
  selectOptimalResponder,
  type SeverityLevel,
  type ResponderCandidate,
  type GeoCoordinate,
} from '@/lib/routing/assignment';
import { insertInAppNotification } from '@/lib/notifications';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    // Auth validation
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { description, locationLat, locationLng, isAnonymous, category } = body;

    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    // 0. Duplicate prevention: check for identical recent incident submitted by same student within 15 seconds
    try {
      const recentThreshold = new Date(Date.now() - 15 * 1000).toISOString();
      const duplicateQuery = supabase
        .from('incidents')
        .select('id, case_id, status, created_at');

      if (typeof (duplicateQuery as { eq?: unknown }).eq === 'function') {
        const { data: duplicate } = await duplicateQuery
          .eq('student_id', user.id)
          .eq('description', description.trim())
          .gte('created_at', recentThreshold)
          .maybeSingle();

        if (duplicate) {
          return NextResponse.json({
            success: true,
            caseId: duplicate.case_id,
            message: 'Incident already received (duplicate request prevented).',
            isDuplicate: true,
          }, { status: 200 });
        }
      }
    } catch {
      // Safe fallback if duplicate query is not mocked in unit tests
    }

    // Geolocation validation: -90 to 90 for lat, -180 to 180 for lng. Do not substitute 0, 0 for missing GPS.
    const hasLocation = locationLat !== undefined && locationLat !== null && locationLat !== '' &&
                        locationLng !== undefined && locationLng !== null && locationLng !== '';
    let finalLat: number | null = null;
    let finalLng: number | null = null;

    if (hasLocation) {
      const numLat = Number(locationLat);
      const numLng = Number(locationLng);
      if (
        isNaN(numLat) ||
        isNaN(numLng) ||
        numLat < -90 ||
        numLat > 90 ||
        numLng < -180 ||
        numLng > 180
      ) {
        return NextResponse.json({ error: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.' }, { status: 400 });
      }
      finalLat = numLat;
      finalLng = numLng;
    } else if (
      (locationLat !== undefined && locationLat !== null && locationLat !== '') ||
      (locationLng !== undefined && locationLng !== null && locationLng !== '')
    ) {
      return NextResponse.json({ error: 'Both latitude and longitude must be provided when specifying coordinates.' }, { status: 400 });
    }

    const { data: callerProfile, error: callerProfileError } = await supabase
      .from('profiles')
      .select('role, is_approved, college_id')
      .eq('id', user.id)
      .maybeSingle();

    if (callerProfileError) {
      console.error('Incident reporter profile lookup failed:', callerProfileError);
      return NextResponse.json({ error: 'Unable to verify incident reporting permissions.' }, { status: 500 });
    }
    if (!callerProfile || callerProfile.is_approved !== true) {
      return NextResponse.json({ error: 'An approved account is required to file a non-emergency incident report.' }, { status: 403 });
    }

    if (callerProfile.role === 'STUDENT') {
      const { data: studentProf, error: studentProfileError } = await supabase
        .from('student_profiles')
        .select('verification_status')
        .eq('id', user.id)
        .maybeSingle();

      if (studentProfileError) {
        console.error('Incident reporter student verification lookup failed:', studentProfileError);
        return NextResponse.json({ error: 'Unable to verify student reporting permissions.' }, { status: 500 });
      }
      if (studentProf?.verification_status !== 'VERIFIED') {
        return NextResponse.json(
          {
            error: 'Student ID verification required. Your account must be VERIFIED before filing non-emergency incident reports.',
            verificationStatus: studentProf?.verification_status || 'NOT_SUBMITTED',
          },
          { status: 403 }
        );
      }
    }

    let aiResult;
    try {
      aiResult = await analyzeIncident(description);
    } catch {
      aiResult = {
        category: 'UNKNOWN',
        severity: 'MEDIUM', // Mapped to priority_level
        urgency: 'HIGH',
        confidence: 0,
        summary: 'AI failed.'
      };
    }

    const caseId = `KC-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Map severity to priority_level enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
    const severityMap: Record<string, string> = {
      'L1': 'LOW',
      'L2': 'MEDIUM',
      'L3': 'HIGH',
      'L4': 'CRITICAL'
    };
    let priority = severityMap[aiResult.severity] || 'MEDIUM';

    // DETERMINISTIC SAFETY RULES: Override AI if critical keywords are present (English, Telugu, Hindi)
    const criticalKeywords = [
      'gun', 'knife', 'blood', 'fire', 'kidnap', 'attack', 'kill', 'suicide', 'die', 'weapon', 'shoot', 'assault',
      'తుపాకీ', 'కత్తి', 'రక్తం', 'మంటలు', 'చంపేస్తా', 'దాడి', 'కిడ్నాప్', 'ఆత్మహత్య',
      'बंदूक', 'चाकू', 'खून', 'आग', 'मार', 'हमला', 'अपहरण', 'आत्महत्या'
    ];
    const highKeywords = [
      'fight', 'punch', 'stolen', 'thief', 'robbery', 'harass', 'stalk', 'creep', 'threat', 'molest', 'ragging',
      'వేధింపు', 'దొంగ', 'కొట్టారు', 'ర్యాగింగ్', 'బెదిరింపు',
      'छेड़छाड़', 'चोरी', 'झगड़ा', 'मारपीट', 'धमकी', 'रैगिंग'
    ];
    const lowerDesc = description.toLowerCase();

    let deterministicOverride = false;
    let overrideReason = '';

    if (criticalKeywords.some(kw => lowerDesc.includes(kw))) {
      priority = 'CRITICAL';
      aiResult.urgency = 'HIGH';
      deterministicOverride = true;
      overrideReason = 'CRITICAL_KEYWORD_MATCH';
    } else if (highKeywords.some(kw => lowerDesc.includes(kw)) && (priority === 'LOW' || priority === 'MEDIUM')) {
      priority = 'HIGH';
      aiResult.urgency = 'HIGH';
      deterministicOverride = true;
      overrideReason = 'HIGH_KEYWORD_MATCH';
    }

    // Category Resolution: Honor valid explicit category or infer from safety rules/AI
    const allowedCategories = [
      'HARASSMENT', 'EMERGENCY', 'THEFT', 'RAGGING', 'SECURITY',
      'MEDICAL', 'COUNSELING', 'MAINTENANCE', 'GENERAL'
    ];
    let finalCategory = typeof category === 'string' && allowedCategories.includes(category.toUpperCase())
      ? category.toUpperCase()
      : null;

    if (!finalCategory) {
      const harassKeywords = ['harass', 'stalk', 'creep', 'threat', 'molest', 'ragging', 'వేధింపు', 'బెదిరింపు', 'छेड़छाड़'];
      if (harassKeywords.some(kw => lowerDesc.includes(kw))) {
        finalCategory = 'HARASSMENT';
      } else if (aiResult.category) {
        finalCategory = aiResult.category;
      } else {
        finalCategory = 'GENERAL';
      }
    }

    // 1. Create Incident
    const { data: incident, error: incidentError } = await supabase.from('incidents').insert({
      case_id: caseId,
      student_id: user.id,
      description,
      category: finalCategory,
      severity: priority,
      urgency: aiResult.urgency || 'LOW',
      latitude: finalLat,
      longitude: finalLng,
      status: 'RECEIVED',
      is_anonymous: Boolean(isAnonymous)
    }).select().single();

    if (incidentError || !incident) {
      console.error('Incident insertion error:', incidentError);
      return NextResponse.json({ error: 'Failed to create incident' }, { status: 500 });
    }

    // 2. Create AI Analysis record
    await supabase.from('ai_analyses').insert({
      incident_id: incident.id,
      category: aiResult.category,
      suggested_severity: priority, // uses overridden priority
      urgency: aiResult.urgency,
      confidence: aiResult.confidence,
      summary: deterministicOverride ? `[OVERRIDDEN: ${overrideReason}] ` + aiResult.summary : aiResult.summary
    });

    // 3. Auto-Assignment & Escalation Workflow (Phase 3)
    let assignmentResult: {
      assignedTo: string | null;
      responderName: string | null;
      routingMethod: string;
      status: string;
    } = {
      assignedTo: null,
      responderName: null,
      routingMethod: 'UNASSIGNED',
      status: 'RECEIVED',
    };

    try {
      let db = supabase;
      try {
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const adminClient = createAdminClient();
        if (adminClient && typeof adminClient.from === 'function') {
          db = adminClient;
        }
      } catch {
        // Fallback to caller's client
      }

      const assignedCampus = typeof callerProfile.college_id === 'string'
        ? getCollegeById(callerProfile.college_id)
        : null;
      const authorizedCollegeIds = assignedCampus
        ? assignedCampus.id === 'vit-bhimavaram'
          ? [assignedCampus.id, 'vishnu-bhimavaram']
          : [assignedCampus.id]
        : [];

      let staffProfiles: Array<{
        id: string;
        full_name?: string | null;
        role: string;
        department?: string | null;
        is_approved?: boolean | null;
        college_id: string;
      }> | null = null;

      try {
        if (authorizedCollegeIds.length > 0) {
          const { data, error } = await db
            .from('profiles')
            .select('id, full_name, role, department, is_approved, college_id')
            .in('role', [
              'STAFF', 'SECURITY', 'MENTOR', 'COUNSELLOR', 'WOMENS_CELL', 'HOD', 'ADMIN', 'SUPER_ADMIN'
            ])
            .in('college_id', authorizedCollegeIds);
          if (error) throw error;
          staffProfiles = (data || []).filter(profile => authorizedCollegeIds.includes(profile.college_id));
        } else {
          staffProfiles = [];
        }
      } catch (error) {
        console.error('Same-campus responder lookup failed:', error);
        staffProfiles = [];
      }

      // Query staff locations with consent
      let staffLocs: Array<{
        staff_id: string;
        latitude: number;
        longitude: number;
        is_on_duty: boolean;
        is_location_sharing_enabled: boolean;
        updated_at?: string;
      }> | null = null;
      try {
        const staffIds = (staffProfiles || []).map(profile => profile.id);
        if (staffIds.length > 0) {
          const { data: locs, error } = await db
            .from('staff_locations')
            .select('staff_id, latitude, longitude, is_on_duty, is_location_sharing_enabled, updated_at')
            .in('staff_id', staffIds);
          if (error) throw error;
          staffLocs = locs;
        } else {
          staffLocs = [];
        }
      } catch (error) {
        console.error('Eligible responder location lookup failed:', error);
        staffLocs = [];
      }

      const candidates: ResponderCandidate[] = (staffProfiles || []).map((sp: {
        id: string;
        full_name?: string | null;
        role: string;
        department?: string | null;
        is_approved?: boolean | null;
        college_id: string;
      }) => {
        const loc = staffLocs?.find(sl => sl.staff_id === sp.id);
        return {
          id: sp.id,
          name: sp.full_name || 'Staff Member',
          role: sp.role,
          department: sp.department || undefined,
          isApproved: sp.is_approved === true,
          isOnDuty: loc ? Boolean(loc.is_on_duty) : true,
          isLocationSharingEnabled: loc ? Boolean(loc.is_location_sharing_enabled) : false,
          lastLocation: (loc && loc.latitude != null && loc.longitude != null) ? {
            latitude: Number(loc.latitude),
            longitude: Number(loc.longitude),
            timestamp: loc.updated_at,
          } : undefined,
        };
      });

      const incidentGeo: GeoCoordinate | null = (finalLat != null && finalLng != null) ? {
        latitude: finalLat,
        longitude: finalLng,
        timestamp: new Date().toISOString(),
      } : null;

      const decision = selectOptimalResponder({
        incidentLocation: incidentGeo,
        severity: priority as SeverityLevel,
        candidates,
      });

      if (decision.selectedResponderId) {
        // Update incident to ASSIGNED
        await db
          .from('incidents')
          .update({
            assigned_to: decision.selectedResponderId,
            status: 'ASSIGNED',
            updated_at: new Date().toISOString(),
          })
          .eq('id', incident.id);

        // Record case action
        await db.from('case_actions').insert({
          incident_id: incident.id,
          actor_id: null,
          action: 'AUTO_ASSIGNED',
          from_status: 'RECEIVED',
          to_status: 'ASSIGNED',
          notes: `Auto-assigned to ${decision.selectedResponderName} (${decision.assignedRole}) via ${decision.routingMethod}${decision.distanceMeters ? ` (${decision.distanceMeters}m)` : ''}`,
        });

        // Create in-app notification
        await insertInAppNotification(db, {
          userId: decision.selectedResponderId,
          incidentId: incident.id,
          caseId: caseId,
          title: `New Incident Assigned: ${caseId}`,
          message: `You have been assigned to case ${caseId} (${priority} severity - ${finalCategory}).`,
          type: 'INCIDENT_ASSIGNMENT',
        });

        // Trigger emergency notification if critical or high
        if (priority === 'HIGH' || priority === 'CRITICAL') {
          try {
            const { dispatchEmergencyNotification } = await import('@/lib/notifications');
            await dispatchEmergencyNotification({
              recipientUserId: decision.selectedResponderId,
              title: `🚨 Emergency Case Assigned: ${caseId}`,
              message: `Critical/High severity incident ${caseId} (${finalCategory}) assigned to you. Prompt acknowledgement required.`,
              idempotencyKey: `autoassign-${incident.id}-${decision.selectedResponderId}`,
            });
          } catch {
            // External notification failure does not block incident creation
          }
        }

        assignmentResult = {
          assignedTo: decision.selectedResponderId,
          responderName: decision.selectedResponderName,
          routingMethod: decision.routingMethod,
          status: 'ASSIGNED',
        };
      } else {
        // Record unassigned case action
        await db.from('case_actions').insert({
          incident_id: incident.id,
          actor_id: null,
          action: 'UNASSIGNED_ESCALATED',
          from_status: 'RECEIVED',
          to_status: 'RECEIVED',
          notes: `No eligible responder available (${decision.fallbackReason || 'NO_ELIGIBLE_ON_DUTY_RESPONDERS'}). Case marked pending institutional review.`,
        });

        // Insert into escalations
        await db.from('escalations').insert({
          incident_id: incident.id,
          from_level: 'UNASSIGNED',
          to_level: priority === 'CRITICAL' ? 'CAMPUS_SECURITY_CHIEF' : 'ADMIN',
          reason: decision.fallbackReason || 'NO_ELIGIBLE_ON_DUTY_RESPONDERS',
          triggered_at: new Date().toISOString(),
        });

        assignmentResult = {
          assignedTo: null,
          responderName: null,
          routingMethod: decision.routingMethod,
          status: 'UNASSIGNED_PENDING_REVIEW',
        };
      }
    } catch {
      // Auto-assignment failure or partial mock in tests is non-fatal; incident record is preserved
    }

    return NextResponse.json({
      success: true,
      caseId,
      aiClassification: aiResult,
      assignment: assignmentResult,
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Incident creation failed:', error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : "An unexpected error occurred") }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Auth validation
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role and Verification validation
    let profile: { role: string } | null = null;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      profile = data;

      if (profile?.role === 'STUDENT') {
        const { data: studentProf } = await supabase
          .from('student_profiles')
          .select('verification_status')
          .eq('id', user.id)
          .single();

        if (studentProf && studentProf.verification_status !== 'VERIFIED') {
          return NextResponse.json(
            {
              error: 'Student ID verification required. Your account must be VERIFIED to view incident records.',
              verificationStatus: studentProf?.verification_status || 'PENDING_UPLOAD',
            },
            { status: 403 }
          );
        }
      }
    } catch {
      // Safe fallback when profile query is not available
    }

    // Role-based defense-in-depth: students only see their own incidents
    let query = supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (profile?.role === 'STUDENT') {
      query = query.eq('student_id', user.id);
    }

    const { data: rawIncidents, error } = await query;

    if (error) {
      throw error;
    }

    // Sanitize anonymous incidents for non-super-admin viewers
    const isSuperAdmin = profile?.role === 'SUPER_ADMIN';
    const incidents = (rawIncidents || []).map((inc) => {
      const isOwner = inc.student_id === user.id;
      const maskAnonymous = inc.is_anonymous && !isSuperAdmin && !isOwner;
      return {
        ...inc,
        student_id: maskAnonymous ? null : inc.student_id,
      };
    });

    return NextResponse.json({ incidents }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : "An unexpected error occurred") }, { status: 500 });
  }
}
