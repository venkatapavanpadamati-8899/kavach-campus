import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPushNotification, sendSmsNotification, insertInAppNotification } from '@/lib/notifications';


export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { latitude, longitude, accuracy, zoneId } = body;

    // Validate coordinates if provided
    const hasProvidedLocation = latitude != null || longitude != null;
    let hasLocation = false;
    let validLat: number | null = null;
    let validLng: number | null = null;

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
    }

    // Check for existing active SOS for this user to avoid duplicate flood
    let existingActiveSos: { id: string; case_id: string }[] | null = null;
    try {
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
    
    // 1. Create Incident
    const caseId = `SOS-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const incidentPayload: Record<string, any> = {
      case_id: caseId,
      student_id: user.id,
      description: 'EMERGENCY SOS ACTIVATED',
      category: 'EMERGENCY',
      severity: 'CRITICAL',
      urgency: 'HIGH',
      status: 'RECEIVED',
      is_tracking_active: true
    };

    if (hasLocation) {
      incidentPayload.latitude = validLat;
      incidentPayload.longitude = validLng;
      incidentPayload.location_accuracy = accuracy;
    }
    if (zoneId) {
      incidentPayload.campus_zone_id = zoneId;
    }

    const { data: incident, error: incidentError } = await supabase.from('incidents').insert(incidentPayload).select().single();

    if (incidentError || !incident) {
      console.error('Incident insertion error:', incidentError);
      return NextResponse.json({ 
        error: 'Failed to create SOS incident', 
        details: incidentError?.message 
      }, { status: 500 });
    }

    // 2. Initial Location Tracking insert
    if (hasLocation) {
      await supabase.from('incident_locations').insert({
        incident_id: incident.id,
        latitude: validLat,
        longitude: validLng,
        accuracy
      });
    }

    // 3. Intelligent Staff Routing (Zone or Distance)
    const assignedStaffId = null; // Do not assign arbitrarily without GPS coords
    const routingMethod = 'PENDING_ASSIGNMENT_BROADCAST';
    
    // Fetch all active security staff
    const { data: staffList } = await supabase
      .from('profiles')
      .select('id, role')
      .in('role', ['SECURITY'])
      .eq('is_active', true);

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
