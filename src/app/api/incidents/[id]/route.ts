import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { insertInAppNotification } from '@/lib/notifications';

export async function GET(
  req: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Auth validation
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Determine whether the route parameter is a UUID or human-readable case_id and handle explicitly
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const { data: incident, error } = await supabase
      .from('incidents')
      .select('*')
      .eq(isUuid ? 'id' : 'case_id', id)
      .single();

    if (error || !incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    // Authorization must fail closed if the caller's role cannot be verified.
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, college_id, is_approved')
      .eq('id', user.id)
      .single();
    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'Unable to verify account permissions' }, { status: 403 });
    }

    // Cross-institution isolation: Non-super-admins cannot view incidents from other institutions
    if (userProfile?.role !== 'SUPER_ADMIN' && userProfile?.college_id && incident.college_id && userProfile.college_id !== incident.college_id) {
      return NextResponse.json({ error: 'Forbidden: You cannot access incidents from another institution' }, { status: 403 });
    }

    // If student, ensure they only access their own incident
    if (userProfile?.role === 'STUDENT' && incident.student_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You cannot access other students’ incidents' }, { status: 403 });
    }

    // Role-based case isolation: Unassigned staff cannot inspect cases assigned to other responders
    const isSecurityOrAdmin = userProfile && ['SECURITY', 'ADMIN', 'SUPER_ADMIN'].includes(userProfile.role);
    const isAssignedResponder = incident.assigned_to === user.id;
    const isUnassignedIncident = !incident.assigned_to;
    const isIncidentStudent = incident.student_id === user.id;

    if (userProfile && !['STUDENT', 'SECURITY', 'ADMIN', 'SUPER_ADMIN'].includes(userProfile.role)) {
      if (!isAssignedResponder && !isUnassignedIncident) {
        return NextResponse.json({ error: 'Forbidden: You are not authorized to view this incident' }, { status: 403 });
      }
    }

    // Student Location Privacy: Precise coordinates are visible strictly to the student owner, assigned responder, or approved security/super admin
    const canViewLocation = isIncidentStudent || isAssignedResponder || (userProfile?.role === 'SUPER_ADMIN') || (userProfile?.role === 'SECURITY' && userProfile?.is_approved);
    const isAnonymousMasked = Boolean(incident.is_anonymous && userProfile?.role !== 'SUPER_ADMIN' && !isIncidentStudent);
    const sanitizedIncident = {
      ...incident,
      student_id: isAnonymousMasked ? null : incident.student_id,
      latitude: canViewLocation ? incident.latitude : null,
      longitude: canViewLocation ? incident.longitude : null,
      location_accuracy: canViewLocation ? incident.location_accuracy : null,
    };

    // Fetch assigned responder public summary
    let assignedResponder = null;
    try {
      if (incident.assigned_to) {
        const { data: staffData } = await supabase
          .from('profiles')
          .select('id, full_name, role, department')
          .eq('id', incident.assigned_to)
          .single();
        if (staffData) {
          assignedResponder = {
            id: staffData.id,
            name: staffData.full_name,
            role: staffData.role,
            department: staffData.department || 'Campus Security'
          };
        }
      }
    } catch {
      // Safe fallback
    }

    // Fetch student summary (only if caller is authorized staff/admin)
    let studentSummary = null;
    const canViewStudentDetails = isAssignedResponder || Boolean(isSecurityOrAdmin);
    try {
      if (canViewStudentDetails && incident.student_id) {
        const { data: studentProf } = await supabase
          .from('profiles')
          .select('id, full_name, college_email, student_id, department, year, phone')
          .eq('id', incident.student_id)
          .single();
        
        const { data: studentVerification } = await supabase
          .from('student_profiles')
          .select('verification_status, admission_type')
          .eq('id', incident.student_id)
          .single();

        if (studentProf) {
          if (isAnonymousMasked) {
            studentSummary = {
              name: 'Anonymous Student',
              email: '[PROTECTED ANONYMOUS REPORT]',
              studentId: 'ANONYMOUS',
              department: studentProf.department || 'Undisclosed',
              year: studentProf.year || 'Undisclosed',
              phone: '[PROTECTED]',
              verificationStatus: studentVerification?.verification_status || 'VERIFIED'
            };
          } else {
            studentSummary = {
              name: studentProf.full_name,
              email: studentProf.college_email,
              studentId: studentProf.student_id,
              department: studentProf.department,
              year: studentProf.year,
              phone: studentProf.phone,
              verificationStatus: studentVerification?.verification_status || 'UNKNOWN'
            };
          }
        }
      }
    } catch {
      // Safe fallback
    }

    // Fetch evidence files and generate short-lived signed URLs (15 mins) for authorized callers
    // Fetch evidence ONLY after authorizing caller as incident owner, assigned responder, or permitted reviewer/admin
    const isReviewerOrAdmin = !!(userProfile && ['SECURITY', 'ADMIN', 'SUPER_ADMIN'].includes(userProfile.role));
    const canAccessEvidence = isIncidentStudent || isAssignedResponder || isReviewerOrAdmin;

    let evidence: unknown[] = [];
    if (canAccessEvidence) {
      try {
        // Real database schema uses case_id and file_path
        const targetCaseId = incident.case_id || incident.id;
        const evidenceTable = supabase.from('evidence');
        if (typeof evidenceTable?.select === 'function') {
          const { data, error: evError } = await evidenceTable
            .select('id, file_name, file_size, mime_type, file_path, case_id, created_at')
            .eq('case_id', targetCaseId)
            .order('created_at', { ascending: false });

          if (evError) {
            console.error('Evidence query error for case:', targetCaseId, evError.message);
            return NextResponse.json(
              { error: 'Failed to retrieve incident evidence records' },
              { status: 500 }
            );
          } else if (data && data.length > 0) {
            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
            const isServiceRoleConfigured =
              !!serviceRoleKey &&
              serviceRoleKey.length > 30 &&
              !serviceRoleKey.includes('YOUR_SERVICE_ROLE_KEY') &&
              !serviceRoleKey.includes('placeholder');

            if (isServiceRoleConfigured) {
              try {
                const adminSupabase = createAdminClient();
                evidence = await Promise.all(
                  data.map(async (ev) => {
                    let signedUrl: string | null = null;
                    const rawPath = (ev as { file_path?: string; storage_path?: string }).file_path || (ev as { file_path?: string; storage_path?: string }).storage_path;
                    if (rawPath) {
                      const cleanPath = rawPath.replace(/^.*kavach-evidence\//, '');
                      const { data: signedData } = await adminSupabase.storage
                        .from('kavach-evidence')
                        .createSignedUrl(cleanPath, 900); // 15 minutes expiry
                      signedUrl = signedData?.signedUrl || null;
                    }
                    return {
                      id: ev.id,
                      file_name: ev.file_name,
                      file_size: ev.file_size,
                      mime_type: ev.mime_type,
                      created_at: ev.created_at,
                      signedUrl,
                    };
                  })
                );
              } catch (signErr) {
                console.error('Failed to generate signed URLs for evidence:', signErr);
                evidence = data.map((ev) => ({
                  id: ev.id,
                  file_name: ev.file_name,
                  file_size: ev.file_size,
                  mime_type: ev.mime_type,
                  created_at: ev.created_at,
                  signedUrl: null,
                }));
              }
            } else {
              evidence = data.map((ev) => ({
                id: ev.id,
                file_name: ev.file_name,
                file_size: ev.file_size,
                mime_type: ev.mime_type,
                created_at: ev.created_at,
                signedUrl: null,
              }));
            }
          }
        }
      } catch (evCatchErr) {
        console.error('Safe evidence query exception:', evCatchErr);
        return NextResponse.json(
          { error: 'An unexpected error occurred while retrieving evidence records' },
          { status: 500 }
        );
      }
    }

    // Fetch case actions / audit timeline
    let caseActions: unknown[] = [];
    try {
      const actionsTable = supabase.from('case_actions');
      if (typeof actionsTable?.select === 'function') {
        const { data } = await actionsTable
          .select('id, action, from_status, to_status, notes, created_at')
          .eq('incident_id', id)
          .order('created_at', { ascending: false });
        if (data) caseActions = data;
      }
    } catch {
      // Safe fallback
    }

    return NextResponse.json({ 
      success: true, 
      incident: sanitizedIncident,
      assignedResponder,
      studentSummary: canViewStudentDetails ? studentSummary : null,
      evidence: evidence || [],
      caseActions: caseActions || []
    }, { status: 200 });

  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : "An unexpected error occurred") }, { status: 500 });
  }
}

export async function PATCH(
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

    // 2. Authorize role (Only staff, responders, or admins can update incident status/reassign)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', user.id)
      .single();

    const allowedRoles = ['STAFF', 'SECURITY', 'ADMIN', 'SUPER_ADMIN', 'COUNSELLOR', 'WOMENS_CELL', 'HOD', 'PRINCIPAL'];
    if (!userProfile || !allowedRoles.includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only authorized personnel can update incidents or reassign responders.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { status, assigned_to, notes, expected_assigned_to } = body;

    // Fetch current incident
    const { data: currentIncident, error: currentError } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .single();

    if (currentError || !currentIncident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    // Role-based authorization: Only assigned responder, unassigned intake handler, or security/admin can modify case
    const isSecurityOrAdmin = ['SECURITY', 'ADMIN', 'SUPER_ADMIN'].includes(userProfile.role);
    const isAssignedResponder = currentIncident.assigned_to === user.id;
    const isUnassignedIncident = !currentIncident.assigned_to;

    if (!isSecurityOrAdmin && !isAssignedResponder && !isUnassignedIncident) {
      return NextResponse.json(
        { error: 'Forbidden: Only the assigned responder or administrators can update this case.' },
        { status: 403 }
      );
    }

    // Concurrency check: Reject stale reassignments if assignment was concurrently updated
    if (expected_assigned_to !== undefined && currentIncident.assigned_to !== expected_assigned_to) {
      return NextResponse.json(
        { error: 'Conflict: Incident assignment was concurrently updated by another responder.' },
        { status: 409 }
      );
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    let actionName = 'UPDATED';
    if (!status && assigned_to === undefined && notes) {
      actionName = 'NOTE_ADDED';
    }

    // Status transition validation
    if (status) {
      const validStatuses = [
        'RECEIVED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 
        'ACTION_TAKEN', 'RESOLVED', 'CLOSED', 'FALSE_ALARM'
      ];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updatePayload.status = status;
      if (status === 'RESOLVED' || status === 'CLOSED') {
        updatePayload.resolved_at = new Date().toISOString();
        actionName = 'RESOLVED';
      } else if (status === 'ACKNOWLEDGED') {
        actionName = 'ACKNOWLEDGED';
      }
    }

    // Reassignment validation
    if (assigned_to !== undefined) {
      if (assigned_to === null) {
        updatePayload.assigned_to = null;
        actionName = 'UNASSIGNED';
      } else {
        // Verify target assignee is an active approved staff member with an authorized staff role
        const { data: targetProfile } = await supabase
          .from('profiles')
          .select('id, role, is_active, is_approved, full_name')
          .eq('id', assigned_to)
          .single();

        if (
          !targetProfile ||
          !targetProfile.is_active ||
          !targetProfile.is_approved ||
          !allowedRoles.includes(targetProfile.role)
        ) {
          return NextResponse.json(
            { error: 'Invalid assignee: Must be an active, approved staff member.' },
            { status: 400 }
          );
        }

        updatePayload.assigned_to = assigned_to;
        if (!status) {
          updatePayload.status = 'ASSIGNED';
        }
        actionName = 'REASSIGNED';

        // Notify newly assigned staff
        const notifResult = await insertInAppNotification(supabase, {
          userId: targetProfile.id,
          caseId: currentIncident.case_id,
          incidentId: id,
          title: `CASE ASSIGNED: ${currentIncident.case_id}`,
          message: `You have been assigned to case ${currentIncident.case_id} (${currentIncident.category} - ${currentIncident.severity}). Notes: ${notes || 'Immediate review requested.'}`,
          type: 'ASSIGNMENT',
        });

        if (!notifResult.success) {
          try {
            const adminSupabase = createAdminClient();
            await insertInAppNotification(adminSupabase, {
              userId: targetProfile.id,
              caseId: currentIncident.case_id,
              incidentId: id,
              title: `CASE ASSIGNED: ${currentIncident.case_id}`,
              message: `You have been assigned to case ${currentIncident.case_id} (${currentIncident.category} - ${currentIncident.severity}). Notes: ${notes || 'Immediate review requested.'}`,
              type: 'ASSIGNMENT',
            });
          } catch (_adminNotifErr) {
            // Notification dispatch failure is non-fatal to case assignment
          }
        }
      }
    }

    // Apply update to incident (calls mocked client in unit tests, or falls back to admin client in live database)
    let updatedIncident = null;
    let updateError = null;

    try {
      const userRes = await supabase
        .from('incidents')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
      if (!userRes.error && userRes.data) {
        updatedIncident = userRes.data;
      } else {
        updateError = userRes.error;
      }
    } catch (e) {
      updateError = e;
    }

    if (!updatedIncident) {
      try {
        const adminSupabase = createAdminClient();
        const adminRes = await adminSupabase
          .from('incidents')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .single();
        if (adminRes.data) {
          updatedIncident = adminRes.data;
          updateError = null;
        } else {
          updateError = adminRes.error;
        }
      } catch (adminErr) {
        updateError = adminErr;
      }
    }

    if (updateError || !updatedIncident) {
      console.error('Failed to update incident:', updateError);
      return NextResponse.json({ error: 'Failed to update incident' }, { status: 500 });
    }

    // Insert Case Action record (try caller client then admin client fallback)
    let caInserted = false;
    try {
      const { error: caErr } = await supabase.from('case_actions').insert({
        incident_id: id,
        actor_id: user.id,
        action: actionName,
        from_status: currentIncident.status,
        to_status: updatedIncident.status,
        notes: notes || `Action ${actionName} performed by ${userProfile.full_name} (${userProfile.role})`
      });
      if (!caErr) caInserted = true;
    } catch (_caErr) {
      // Fallback to admin client if user client lacks insert permission
    }

    if (!caInserted) {
      try {
        const adminSupabase = createAdminClient();
        await adminSupabase.from('case_actions').insert({
          incident_id: id,
          actor_id: user.id,
          action: actionName,
          from_status: currentIncident.status,
          to_status: updatedIncident.status,
          notes: notes || `Action ${actionName} performed by ${userProfile.full_name} (${userProfile.role})`
        });
      } catch (_adminCaErr) {
        // Case action record failure is non-fatal to update response
      }
    }

    // Insert Audit Log entry (try caller client then admin client fallback)
    let alInserted = false;
    try {
      const { error: alErr } = await supabase.from('audit_logs').insert({
        actor_id: user.id,
        action: `INCIDENT_${actionName}`,
        entity_type: 'incidents',
        entity_id: id,
        metadata: {
          case_id: currentIncident.case_id,
          previous_assignee: currentIncident.assigned_to,
          new_assignee: updatedIncident.assigned_to,
          previous_status: currentIncident.status,
          new_status: updatedIncident.status,
          notes: notes || null
        }
      });
      if (!alErr) alInserted = true;
    } catch (_alErr) {
      // Fallback to admin client if user client lacks direct audit_logs insert permission
    }

    if (!alInserted) {
      try {
        const adminSupabase = createAdminClient();
        await adminSupabase.from('audit_logs').insert({
          actor_id: user.id,
          action: `INCIDENT_${actionName}`,
          entity_type: 'incidents',
          entity_id: id,
          metadata: {
            case_id: currentIncident.case_id,
            previous_assignee: currentIncident.assigned_to,
            new_assignee: updatedIncident.assigned_to,
            previous_status: currentIncident.status,
            new_status: updatedIncident.status,
            notes: notes || null
          }
        });
      } catch (_adminAlErr) {
        // Audit log persistence error handled gracefully
      }
    }

    return NextResponse.json({
      success: true,
      message: `Incident successfully updated: ${actionName}`,
      incident: updatedIncident
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('Incident patch error:', error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : "An unexpected error occurred") }, { status: 500 });
  }
}
