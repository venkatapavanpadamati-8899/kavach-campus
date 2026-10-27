import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCollegeById } from '@/lib/colleges';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check caller role
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role, is_approved, college_id')
      .eq('id', user.id)
      .single();

    if (!callerProfile || !callerProfile.is_approved) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const callerRole = callerProfile.role;
    const isSuperAdmin = callerRole === 'SUPER_ADMIN';
    const profileExtras = callerProfile as unknown as Record<string, unknown>;
    const isManagementAdmin = ['MANAGEMENT', 'MANAGEMENT_ADMIN', 'PRINCIPAL'].includes(callerRole) || Boolean(profileExtras?.can_manage_staff);
    const isMonitoringOnly = isSuperAdmin || profileExtras?.can_manage_staff === false;
    const isAdmin = callerRole === 'ADMIN' || isSuperAdmin || isManagementAdmin;

    if (!isAdmin) {
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

    // Target cannot be assigned SUPER_ADMIN through approval route
    if (requestedRole === 'SUPER_ADMIN' || requestedRole === 'SUPERADMIN') {
      return NextResponse.json({ error: 'Cannot assign SUPER_ADMIN role via standard approval' }, { status: 400 });
    }

    const allowedRoles = [
      'STUDENT',
      'STAFF',
      'COUNSELLOR',
      'WOMENS_CELL',
      'HOD',
      'SECURITY',
      'PRINCIPAL',
      'ADMIN',
      'MENTOR',
      'WARDEN',
      'MANAGEMENT',
    ];
    if (requestedRole != null && !allowedRoles.includes(requestedRole)) {
      return NextResponse.json({ error: 'Requested role is invalid' }, { status: 400 });
    }

    // Staff access governance: Management Admin is responsible for granting staff access.
    // Normal Admin and Super Admin are monitoring-only roles by default.
    const staffRoles = ['STAFF', 'COUNSELLOR', 'WOMENS_CELL', 'HOD', 'SECURITY', 'PRINCIPAL', 'MENTOR', 'WARDEN'];
    const isStaffRole = requestedRole != null && staffRoles.includes(requestedRole);
    if (isStaffRole && !isManagementAdmin && isMonitoringOnly) {
      return NextResponse.json(
        { error: 'Normal Admin and Super Admin are monitoring-only roles by default. Management Admin authorization required to grant staff access.' },
        { status: 403 }
      );
    }

    // Only SUPER_ADMIN can approve an ADMIN account
    if (requestedRole === 'ADMIN' && !isSuperAdmin) {
      return NextResponse.json({ error: 'Super Admin authorization required to approve Admin accounts' }, { status: 403 });
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

    // Verify target user is not a SUPER_ADMIN unless caller is also a SUPER_ADMIN
    const { data: targetProfile } = await adminSupabase
      .from('profiles')
      .select('role, college_id')
      .eq('id', targetUserId)
      .single();

    if (!targetProfile) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    if (targetProfile.role === 'SUPER_ADMIN' && !isSuperAdmin) {
      return NextResponse.json({ error: 'Cannot modify a Super Admin account without Super Admin authorization' }, { status: 403 });
    }

    const callerCollegeId = callerProfile.college_id
      ? (getCollegeById(callerProfile.college_id)?.id || callerProfile.college_id)
      : null;
    const targetCollegeId = targetProfile.college_id
      ? (getCollegeById(targetProfile.college_id)?.id || targetProfile.college_id)
      : null;

    if (!isSuperAdmin && (!callerCollegeId || callerCollegeId !== targetCollegeId)) {
      return NextResponse.json(
        { error: 'Cannot manage users outside your assigned campus' },
        { status: 403 }
      );
    }

    if (action === 'APPROVE') {
      const updates: { is_approved: boolean; role?: string } = { is_approved: true };
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
        metadata: { approvedRole: requestedRole, approverRole: callerRole },
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
        metadata: { rejectedRole: requestedRole, approverRole: callerRole },
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
