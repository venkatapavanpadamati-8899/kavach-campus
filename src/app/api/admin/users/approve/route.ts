import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCollegeById } from '@/lib/colleges';
import { canUserApproveRole, isStaffRole, ApprovalUser } from '@/lib/staff-roles';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check caller profile
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('id, role, is_approved, college_id, department, can_manage_staff')
      .eq('id', user.id)
      .single();

    if (!callerProfile || !callerProfile.is_approved) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const callerRole = (callerProfile.role || '').toUpperCase().trim();
    const allowedManagementRoles = [
      'SUPER_ADMIN',
      'CAMPUS_ADMIN',
      'ADMIN',
      'MANAGEMENT',
      'MANAGEMENT_ADMIN',
      'PRINCIPAL',
      'DIRECTOR',
      'DEAN',
      'PROVOST',
      'VICE_PRINCIPAL',
      'HOD',
    ];

    if (!allowedManagementRoles.includes(callerRole)) {
      return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
    }

    const body = await req.json();
    const { targetUserId, requestedRole } = body;
    const action = typeof body.action === 'string' ? body.action.trim().toUpperCase() : '';

    if (!targetUserId || !action) {
      return NextResponse.json({ error: 'targetUserId and action are required' }, { status: 400 });
    }

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be APPROVE or REJECT' }, { status: 400 });
    }

    if (user.id === targetUserId) {
      return NextResponse.json({ error: 'Self-approval and self-role elevation are prohibited.' }, { status: 403 });
    }

    // Target cannot be assigned SUPER_ADMIN through approval route
    if (requestedRole === 'SUPER_ADMIN' || requestedRole === 'SUPERADMIN') {
      return NextResponse.json({ error: 'Cannot assign SUPER_ADMIN role via standard approval' }, { status: 400 });
    }

    // Monitoring-only check for admins explicitly restricted via can_manage_staff = false
    const profileExtras = callerProfile as unknown as Record<string, unknown>;
    const isTargetStaff = requestedRole != null ? isStaffRole(requestedRole) : false;
    if (isTargetStaff && profileExtras?.can_manage_staff === false) {
      return NextResponse.json(
        { error: 'Normal Admin and Super Admin are monitoring-only roles by default. Management Admin authorization required to grant staff access.' },
        { status: 403 }
      );
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const isServiceRoleConfigured =
      !!serviceRoleKey &&
      serviceRoleKey.length > 30 &&
      !serviceRoleKey.includes('YOUR_SERVICE_ROLE_KEY') &&
      !serviceRoleKey.includes('placeholder');

    if (!isServiceRoleConfigured) {
      return NextResponse.json(
        { error: 'User approval service is temporarily unavailable. Institutional administrator configuration required.' },
        { status: 503 }
      );
    }

    const adminSupabase = createAdminClient();

    // Verify target user exists
    const { data: targetProfile } = await adminSupabase
      .from('profiles')
      .select('id, role, college_id, department, is_approved')
      .eq('id', targetUserId)
      .single();

    if (!targetProfile) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    const effectiveTargetRole = requestedRole || targetProfile.role;

    // Additional check if target's existing role is staff and caller has can_manage_staff = false
    if (isStaffRole(effectiveTargetRole) && profileExtras?.can_manage_staff === false) {
      return NextResponse.json(
        { error: 'Normal Admin and Super Admin are monitoring-only roles by default. Management Admin authorization required to grant staff access.' },
        { status: 403 }
      );
    }

    // Normalizing college IDs for institutional comparison
    const callerCollegeId = callerProfile.college_id
      ? (getCollegeById(callerProfile.college_id)?.id || callerProfile.college_id)
      : null;
    const targetCollegeId = targetProfile.college_id
      ? (getCollegeById(targetProfile.college_id)?.id || targetProfile.college_id)
      : null;

    const callerUserToCheck: ApprovalUser = {
      id: user.id,
      role: callerRole,
      college_id: callerCollegeId,
      department: callerProfile.department,
      is_approved: callerProfile.is_approved,
    };

    const targetUserToCheck: ApprovalUser = {
      id: targetProfile.id,
      role: effectiveTargetRole,
      college_id: targetCollegeId,
      department: targetProfile.department,
      is_approved: targetProfile.is_approved,
    };

    const authCheck = canUserApproveRole(callerUserToCheck, targetUserToCheck);
    if (!authCheck.allowed) {
      return NextResponse.json(
        { error: authCheck.reason || 'Forbidden: Insufficient privileges to manage this user' },
        { status: 403 }
      );
    }

    if (action === 'APPROVE') {
      const updates: { is_approved: boolean; role?: string } = {
        is_approved: true,
      };
      if (requestedRole) {
        updates.role = requestedRole;
      }

      const { error: updateError } = await adminSupabase
        .from('profiles')
        .update(updates)
        .eq('id', targetUserId);

      if (updateError) {
        throw updateError;
      }

      // Log to audit_logs
      await adminSupabase.from('audit_logs').insert({
        actor_id: user.id,
        action: 'APPROVE_USER_ROLE',
        entity_type: 'profiles',
        entity_id: targetUserId,
        metadata: {
          approvedRole: effectiveTargetRole,
          approverRole: callerRole,
          approverDepartment: callerProfile.department,
          targetDepartment: targetProfile.department,
          collegeId: targetCollegeId,
        },
      });

      return NextResponse.json({ message: 'User approved successfully', success: true });
    } else if (action === 'REJECT') {
      const { error: updateError } = await adminSupabase
        .from('profiles')
        .update({ is_approved: false })
        .eq('id', targetUserId);

      if (updateError) {
        throw updateError;
      }

      await adminSupabase.from('audit_logs').insert({
        actor_id: user.id,
        action: 'REJECT_USER_ROLE',
        entity_type: 'profiles',
        entity_id: targetUserId,
        metadata: {
          rejectedRole: effectiveTargetRole,
          approverRole: callerRole,
          approverDepartment: callerProfile.department,
          targetDepartment: targetProfile.department,
          collegeId: targetCollegeId,
        },
      });

      return NextResponse.json({ message: 'User request rejected', success: true });
    } else {
      return NextResponse.json({ error: 'Invalid action. Must be APPROVE or REJECT' }, { status: 400 });
    }
  } catch (error) {
    console.error('User approval error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
