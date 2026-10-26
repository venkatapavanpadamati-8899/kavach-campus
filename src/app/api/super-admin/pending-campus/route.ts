import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCollegeById } from '@/lib/colleges';

const PENDING_CAMPUS_ID = 'PENDING_CAMPUS_VERIFICATION';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getApprovedSuperAdmin(): Promise<{ user: { id: string } } | { response: NextResponse }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, is_approved')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Super Admin profile lookup failed:', error);
    return { response: NextResponse.json({ error: 'Unable to verify administrator access.' }, { status: 500 }) };
  }
  if (profile?.role !== 'SUPER_ADMIN' || !profile.is_approved) {
    return { response: NextResponse.json({ error: 'Super Admin privileges required' }, { status: 403 }) };
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (
    serviceRoleKey.length <= 30 ||
    serviceRoleKey.includes('YOUR_SERVICE_ROLE_KEY') ||
    serviceRoleKey.includes('placeholder')
  ) {
    return {
      response: NextResponse.json(
        { error: 'Campus assignment service is temporarily unavailable.' },
        { status: 503 }
      ),
    };
  }

  return { user };
}

export async function GET(): Promise<NextResponse> {
  try {
    const authorization = await getApprovedSuperAdmin();
    if ('response' in authorization) return authorization.response;

    const adminSupabase = createAdminClient();
    const { data, error, count } = await adminSupabase
      .from('profiles')
      .select('id, full_name, college_email, role, is_approved, college_id, created_at', { count: 'exact' })
      .eq('college_id', PENDING_CAMPUS_ID)
      .eq('is_approved', false)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Pending campus accounts query failed:', error);
      return NextResponse.json({ error: 'Unable to load pending campus accounts.' }, { status: 500 });
    }

    const accounts = data || [];
    return NextResponse.json({ accounts, hasMore: (count || 0) > accounts.length });
  } catch (error) {
    console.error('Pending campus accounts GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const authorization = await getApprovedSuperAdmin();
    if ('response' in authorization) return authorization.response;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { targetUserId, collegeId, campusVerified, reviewNote } = body as Record<string, unknown>;

    if (typeof targetUserId !== 'string' || !UUID_PATTERN.test(targetUserId)) {
      return NextResponse.json({ error: 'A valid target user ID is required.' }, { status: 400 });
    }

    if (typeof collegeId !== 'string') {
      return NextResponse.json({ error: 'A registered campus is required.' }, { status: 400 });
    }

    const college = getCollegeById(collegeId);
    if (!college) {
      return NextResponse.json({ error: 'Selected campus is not registered.' }, { status: 400 });
    }

    if (campusVerified !== true) {
      return NextResponse.json({ error: 'Confirm that the applicant’s campus was independently verified.' }, { status: 400 });
    }

    if (typeof reviewNote !== 'string' || reviewNote.trim().length < 10 || reviewNote.trim().length > 500) {
      return NextResponse.json({ error: 'Provide a verification note between 10 and 500 characters.' }, { status: 400 });
    }

    const assignedCollegeId = college.id === 'vit-bhimavaram' ? 'vishnu-bhimavaram' : college.id;
    const adminSupabase = createAdminClient();
    const { data: updatedProfile, error: updateError } = await adminSupabase
      .from('profiles')
      .update({ college_id: assignedCollegeId })
      .eq('id', targetUserId)
      .eq('college_id', PENDING_CAMPUS_ID)
      .eq('is_approved', false)
      .select('id')
      .maybeSingle();

    if (updateError) {
      console.error('Pending campus assignment update failed:', updateError);
      return NextResponse.json({ error: 'Unable to assign the campus.' }, { status: 500 });
    }
    if (!updatedProfile) {
      return NextResponse.json(
        { error: 'Account is no longer pending campus assignment or does not exist.' },
        { status: 409 }
      );
    }

    const { error: auditError } = await adminSupabase.from('audit_logs').insert({
      actor_id: authorization.user.id,
      action: 'ASSIGN_PENDING_USER_CAMPUS',
      entity_type: 'profiles',
      entity_id: targetUserId,
      metadata: {
        assignedCollegeId,
        reviewNote: reviewNote.trim(),
        accountRemainsUnapproved: true,
      },
    });

    if (auditError) {
      console.error('Pending campus assignment audit insert failed:', auditError);
      return NextResponse.json(
        { error: 'Campus was assigned, but audit logging failed. Contact a system administrator; do not retry this assignment.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Campus assigned. The account remains unapproved until the assigned campus administrator reviews it.',
    });
  } catch (error) {
    console.error('Pending campus assignment POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
