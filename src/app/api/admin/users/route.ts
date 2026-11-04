import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('id, role, is_approved, college_id, department')
      .eq('id', user.id)
      .single();

    if (!callerProfile || !callerProfile.is_approved) {
      return NextResponse.json({ error: 'Forbidden: Approved account required' }, { status: 403 });
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
      return NextResponse.json({ error: 'Forbidden: Administrative or departmental privileges required' }, { status: 403 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const isServiceRoleConfigured =
      !!serviceRoleKey &&
      serviceRoleKey.length > 30 &&
      !serviceRoleKey.includes('YOUR_SERVICE_ROLE_KEY') &&
      !serviceRoleKey.includes('placeholder');

    if (!isServiceRoleConfigured) {
      return NextResponse.json(
        { error: 'User directory service is temporarily unavailable. Institutional administrator configuration required.' },
        { status: 503 }
      );
    }

    const adminSupabase = createAdminClient();
    let query = adminSupabase
      .from('profiles')
      .select('id, college_email, full_name, role, is_approved, department, student_id, college_id, created_at, updated_at')
      .order('created_at', { ascending: false });

    // Strict multi-tenant and departmental scoping
    if (callerRole === 'SUPER_ADMIN') {
      const url = new URL(req.url);
      const filterCollege = url.searchParams.get('collegeId');
      if (filterCollege) {
        query = query.eq('college_id', filterCollege);
      }
    } else if (callerRole === 'HOD') {
      // HOD sees ONLY users belonging to their verified college AND department!
      query = query
        .eq('college_id', callerProfile.college_id)
        .eq('department', callerProfile.department);
    } else {
      // Institutional Leadership sees users within their verified college
      query = query.eq('college_id', callerProfile.college_id);
    }

    const { data: profiles, error } = await query;
    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      profiles: profiles || [],
      scope: {
        role: callerRole,
        collegeId: callerProfile.college_id,
        department: callerProfile.department,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
