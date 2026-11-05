import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushNotification, sendSmsNotification, insertInAppNotification } from '@/lib/notifications';


export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      const parsedBody: unknown = await req.json();
      if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
      }
      body = parsedBody as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { latitude, longitude, accuracy, zoneId, isTest } = body;
    if (isTest !== undefined && typeof isTest !== 'boolean') {
      return NextResponse.json({ error: 'Invalid test mode flag' }, { status: 400 });
    }
    const isControlledTest = isTest === true;

    // Validate coordinates if provided
    const hasProvidedLocation = latitude != null || longitude != null;
    let hasLocation = false;
    let validLat: number | null = null;
    let validLng: number | null = null;
    let validAccuracy: number | null = null;

    if (hasProvidedLocation) {
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
      hasLocation = true;
      validLat = numLat;
      validLng = numLng;

      if (accuracy != null) {
        const numAccuracy = Number(accuracy);
        if (!Number.isFinite(numAccuracy) || numAccuracy <= 0) {
          return NextResponse.json({ error: 'Invalid location accuracy' }, { status: 400 });
        }
        validAccuracy = numAccuracy;
      }
    }

    if (isControlledTest) {
      if (!hasLocation || validAccuracy === null) {
        return NextResponse.json({ error: 'Controlled location test requires valid coordinates and accuracy' }, { status: 400 });
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Controlled SOS test role lookup failed:', profileError);
        return NextResponse.json({ error: 'Unable to verify test access' }, { status: 500 });
      }
      if (profile?.role !== 'STUDENT') {
        return NextResponse.json({ error: 'Only students can submit a controlled location test' }, { status: 403 });
      }

      const testRateLimitTime = new Date(Date.now() - 60_000).toISOString();
      const { data: recentTests, error: rateLimitError } = await supabase
        .from('incidents')
        .select('id')
        .eq('student_id', user.id)
        .eq('description', '[CONTROLLED TEST] Mobile GPS Verification')
        .gte('created_at', testRateLimitTime)
        .limit(1);

      if (rateLimitError) {
        console.error('Controlled SOS test rate-limit lookup failed:', rateLimitError);
        return NextResponse.json({ error: 'Unable to verify test request' }, { status: 500 });
      }
      if (recentTests && recentTests.length > 0) {
        return NextResponse.json({ error: 'Please wait before running another controlled location test' }, { status: 429 });
      }
    }

    // Check for existing active SOS for this user to avoid duplicate flood
    let existingActiveSos: { id: string; case_id: string }[] | null = null;
    try {
      if (!isControlledTest) {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        let q: any = supabase
          .from('incidents')
          .select('id, case_id')
          .eq('student_id', user.id)
          .eq('category', 'EMERGENCY');

        if (typeof q?.eq === 'function') {
          const q3 = q.eq('is_tracking_active', true);
          if (q3) q = q3;
        }

        if (typeof q?.in === 'function') {
          const qIn = q.in('status', ['RECEIVED', 'ASSIGNED', 'IN_PROGRESS']);
          if (qIn) q = qIn;
        }

        if (typeof q?.limit === 'function') {
          const qLimit = await q.limit(1);
          existingActiveSos = qLimit?.data || null;
        } else if (q && typeof q.then === 'function') {
          const res = await q;
          existingActiveSos = res?.data || null;
        }
      }
    } catch {
      // If duplicate query fails, proceed to record emergency SOS safely
    }

    if (existingActiveSos && existingActiveSos.length > 0) {
      return NextResponse.json({ 
        success: true, 
        incidentId: existingActiveSos[0].id,
        caseId: existingActiveSos[0].case_id,
        assignedStaffId: null,
        isExisting: true
      }, { status: 200 });
    }
    
    // Fetch caller college_id for institutional multi-tenant routing
    let callerCollegeId: string | null = null;
    try {
      const profileResult = await supabase
        .from('profiles')
        .select('college_id')
        .eq('id', user.id);
      const profileData = Array.isArray(profileResult?.data)
        ? profileResult.data[0]
        : profileResult?.data;
      if (typeof profileData?.college_id === 'string' && profileData.college_id.trim().length > 0) {
        callerCollegeId = profileData.college_id;
      }
    } catch (profileError) {
      console.error('SOS caller profile lookup failed:', profileError);
    }

    if (!callerCollegeId) {
      const metaCampus = (user.user_metadata?.campus_id || user.user_metadata?.college_id) as string | undefined;
      if (typeof metaCampus === 'string' && metaCampus.trim().length > 0) {
        callerCollegeId = metaCampus.trim();
      } else {
        try {
          const adminClient = createAdminClient();
          const { data: adminProf } = await adminClient.from('profiles').select('college_id').eq('id', user.id).maybeSingle();
          if (adminProf?.college_id) {
            callerCollegeId = adminProf.college_id;
          }
        } catch {
          // ignore admin fallback
        }
      }
    }

    // 1. Create Incident
    const caseId = `SOS-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const incidentPayload: Record<string, any> = {
      case_id: caseId,
      student_id: user.id,
      description: isControlledTest ? '[CONTROLLED TEST] Mobile GPS Verification' : 'EMERGENCY SOS ACTIVATED',
      category: 'EMERGENCY',
      severity: isControlledTest ? 'LOW' : 'CRITICAL',
      urgency: isControlledTest ? 'LOW' : 'HIGH',
      status: isControlledTest ? 'RESOLVED' : 'RECEIVED',
      is_tracking_active: isControlledTest ? false : true,
      ...(callerCollegeId ? { college_id: callerCollegeId } : {})
    };

    if (hasLocation) {
      incidentPayload.latitude = validLat;
      incidentPayload.longitude = validLng;
      incidentPayload.location_accuracy = validAccuracy;
    }
    if (zoneId) {
      incidentPayload.campus_zone_id = zoneId;
    }

    let { data: incident, error: incidentError } = await supabase.from('incidents').insert(incidentPayload).select().single();

    // Fallback if is_tracking_active column is missing on remote schema
    if (incidentError && (incidentError.code === 'PGRST204' || incidentError.code === '42703' || incidentError.message?.includes('is_tracking_active'))) {
      delete incidentPayload.is_tracking_active;
      const retry = await supabase.from('incidents').insert(incidentPayload).select().single();
      incident = retry.data;
      incidentError = retry.error;
    }

    if (incidentError || !incident) {
      console.error('Incident insertion error:', incidentError);
      return NextResponse.json({ error: 'Failed to create SOS incident' }, { status: 500 });
    }

    // 2. Initial Location Tracking insert
    if (hasLocation) {
      const { error: locationError } = await supabase.from('incident_locations').insert({
        incident_id: incident.id,
        latitude: validLat,
        longitude: validLng,
        accuracy: validAccuracy
      });
      if (locationError) {
        console.error('SOS location insertion error:', locationError);
        if (isControlledTest) {
          return NextResponse.json({ error: 'Failed to save controlled location test' }, { status: 500 });
        }
      }
    }

    // Controlled test mode: complete cleanly without dispatching live campus alarms
    if (isControlledTest) {
      const { error: auditError } = await supabase.from('audit_logs').insert({
        actor_id: user.id,
        action: 'SOS_CONTROLLED_TEST_RECORDED',
        entity_type: 'incidents',
        entity_id: incident.id,
        metadata: { accuracy: validAccuracy, caseId, isTest: true }
      });
      if (auditError) {
        console.error('Controlled SOS test audit insertion error:', auditError);
        return NextResponse.json({ error: 'Failed to complete controlled location test' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        isTest: true,
        incidentId: incident.id,
        caseId,
        accuracy: validAccuracy,
        message: 'Controlled location test saved successfully'
      }, { status: 201 });
    }

    // 3. Intelligent Staff Routing (Zone or Distance)
    const assignedStaffId = null; // Do not assign arbitrarily without GPS coords
    const routingMethod = 'PENDING_ASSIGNMENT_BROADCAST';
    
    // Do not broadcast an alert across campuses. A failed or absent profile
    // lookup deliberately falls back to escalation without notifying an
    // unrelated campus's responders.

    let staffList: Array<{ id: string; role: string }> | null = [];
    if (callerCollegeId) {
      const { data } = await supabase
        .from('profiles')
        .select('id, role')
        .in('role', ['SECURITY'])
        .eq('is_active', true)
        .eq('college_id', callerCollegeId);
      staffList = data;
    }

    if (staffList && staffList.length > 0) {
      const messageBody = `CRITICAL SOS: User ${user.id} activated SOS. Nearest responder please claim.`;
      
      // Broadcast notification to all active security staff to claim
      for (const staff of staffList) {
        const pushResult = await sendPushNotification({
          userId: staff.id,
          title: 'CRITICAL SOS ALERT (UNASSIGNED)',
          body: messageBody,
        });

        await insertInAppNotification(supabase, {
          userId: staff.id,
          incidentId: incident.id,
          caseId: caseId,
          title: 'CRITICAL SOS ALERT (UNASSIGNED)',
          message: `${messageBody} (Delivery: ${pushResult.status})`,
          type: 'EMERGENCY',
        });
      }
      
      // Trigger escalation workflow since it is unassigned and critical
      await supabase.from('escalations').insert({
        incident_id: incident.id,
        from_level: 'SYSTEM',
        to_level: 'ADMIN',
        reason: 'NO_VALID_COORDINATES_FOR_ROUTING'
      });
      
    } else {
      // Escalation if no security staff exists at all
      await supabase.from('escalations').insert({
        incident_id: incident.id,
        from_level: 'SYSTEM',
        to_level: 'ADMIN',
        reason: 'NO_STAFF_AVAILABLE_FOR_SOS'
      });
    }

    // 4. Notify Trusted Contacts via SMS adapter (disabled-by-default, never throws)
    const { data: contacts } = await supabase
      .from('trusted_contacts')
      .select('name, phone')
      .eq('student_id', user.id);

    if (contacts && contacts.length > 0) {
      for (const contact of contacts) {
        if (contact.phone) {
          const smsResult = await sendSmsNotification({
            toPhone: contact.phone,
            body: `EMERGENCY ALERT: Student activated SOS on Kavach Campus. Case ID: ${caseId}`,
          });

          await insertInAppNotification(supabase, {
            userId: user.id,
            incidentId: incident.id,
            caseId: caseId,
            title: `EMERGENCY ALERT TO CONTACT: ${contact.name}`,
            message: `Emergency SMS to ${contact.name} (Delivery: ${smsResult.status})`,
            type: 'EMERGENCY',
          });
        }
      }
    }

    // 5. Audit Log
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'SOS_ACTIVATED',
      entity_type: 'incidents',
      entity_id: incident.id,
      metadata: { latitude, longitude, accuracy, caseId, routingMethod, assignedStaffId }
    });

    return NextResponse.json({ 
      success: true, 
      incidentId: incident.id,
      caseId,
      assignedStaffId
    }, { status: 201 });
    
  } catch (error: unknown) {
    console.error('SOS creation failed:', error);
    return NextResponse.json({ error: 'Failed to create SOS incident' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'POST' } }
  );
}
