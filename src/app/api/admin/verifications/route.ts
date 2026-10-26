import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCollegeById } from '@/lib/colleges';

function getCampusAliases(collegeId: string | null): string[] | null {
  if (!collegeId) return null;
  const college = getCollegeById(collegeId);
  if (!college) return null;
  return college.id === 'vit-bhimavaram'
    ? ['vit-bhimavaram', 'vishnu-bhimavaram']
    : [collegeId];
}

/**
 * Reviewer Verification API for Campus Security & Administrators
 * Allows authorized officers to view pending ID card verification requests,
 * retrieve short-lived signed URLs for ID card evidence, and submit approval/rejection decisions.
 */

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role verification: Must be ADMIN, SUPER_ADMIN, or SECURITY
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_approved, college_id')
      .eq('id', user.id)
      .single();

    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'SECURITY'];
    if (!profile || !profile.is_approved || !allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: Reviewer privileges required' }, { status: 403 });
    }
    const isSuperAdmin = profile.role === 'SUPER_ADMIN';
    const campusAliases = isSuperAdmin ? null : getCampusAliases(profile.college_id);
    if (!isSuperAdmin && !campusAliases) {
      return NextResponse.json({ error: 'A verified campus assignment is required' }, { status: 403 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const isServiceRoleConfigured =
      !!serviceRoleKey &&
      serviceRoleKey.length > 30 &&
      !serviceRoleKey.includes('YOUR_SERVICE_ROLE_KEY') &&
      !serviceRoleKey.includes('placeholder');

    if (!isServiceRoleConfigured) {
      return NextResponse.json(
        { error: 'Verification review service is temporarily unavailable. Institutional administrator configuration required.' },
        { status: 503 }
      );
    }

    const adminSupabase = createAdminClient();

    let userProfilesQuery = adminSupabase
      .from('profiles')
      .select('id, full_name, college_email, student_id, department, is_approved, college_id');
    if (campusAliases) {
      userProfilesQuery = userProfilesQuery.in('college_id', campusAliases);
    }
    const { data: userProfiles, error: userProfilesError } = await userProfilesQuery;
    if (userProfilesError) {
      console.error('Fetch user profiles error:', userProfilesError);
      return NextResponse.json({ error: 'Failed to retrieve verification records' }, { status: 500 });
    }
    const studentIds = (userProfiles || []).map(profile => profile.id);
    if (!studentIds.length) {
      return NextResponse.json({ verifications: [] });
    }

    // Fetch student verification records
    const { data: studentProfiles, error: fetchError } = await adminSupabase
      .from('student_profiles')
      .select(`
        id,
        admission_type,
        admission_year,
        expected_graduation_year,
        id_card_url,
        verification_status,
        verified_at,
        verified_by,
        verification_notes,
        updated_at
      `)
      .in('id', studentIds)
      .order('updated_at', { ascending: false });

    if (fetchError) {
      console.error('Fetch student profiles error:', fetchError);
      return NextResponse.json({ error: 'Failed to retrieve verification records' }, { status: 500 });
    }

    const userProfileMap = new Map((userProfiles || []).map(p => [p.id, p]));

    // Generate short-lived signed URLs (5 minutes expiry) for ID card files in private bucket
    const recordsWithSignedUrls = await Promise.all(
      (studentProfiles || []).map(async sp => {
        const uProfile = userProfileMap.get(sp.id);
        let signedUrl: string | null = null;

        if (sp.id_card_url) {
          // If id_card_url is a relative storage path (e.g. "usr-id/id-card.jpg")
          const cleanPath = sp.id_card_url.replace(/^.*kavach-id-cards\//, '');
          const { data: signedData } = await adminSupabase.storage
            .from('kavach-id-cards')
            .createSignedUrl(cleanPath, 300); // 300 seconds = 5 minutes

          signedUrl = signedData?.signedUrl || null;
        }

        return {
          id: sp.id,
          fullName: uProfile?.full_name || 'Unknown Student',
          collegeEmail: uProfile?.college_email || '',
          studentId: uProfile?.student_id || 'Not Assigned',
          department: uProfile?.department || 'General',
          admissionType: sp.admission_type,
          admissionYear: sp.admission_year,
          expectedGraduationYear: sp.expected_graduation_year,
          verificationStatus: sp.verification_status,
          verifiedAt: sp.verified_at,
          verifiedBy: sp.verified_by,
          verificationNotes: sp.verification_notes,
          isApproved: uProfile?.is_approved || false,
          signedIdCardUrl: signedUrl,
          rawStoragePath: sp.id_card_url,
        };
      })
    );

    return NextResponse.json({ verifications: recordsWithSignedUrls });
  } catch (error) {
    console.error('Verifications GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role verification: Must be ADMIN, SUPER_ADMIN, or SECURITY
    const { data: reviewerProfile } = await supabase
      .from('profiles')
      .select('id, role, is_approved, college_id')
      .eq('id', user.id)
      .single();

    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'SECURITY'];
    if (!reviewerProfile || !reviewerProfile.is_approved || !allowedRoles.includes(reviewerProfile.role)) {
      return NextResponse.json({ error: 'Forbidden: Reviewer privileges required' }, { status: 403 });
    }

    const body = await req.json();
    const { targetStudentId, decision, reason, officialRosterConfirmed } = body;

    if (!targetStudentId || !decision) {
      return NextResponse.json({ error: 'targetStudentId and decision are required' }, { status: 400 });
    }

    // Prevent reviewer self-approval
    if (targetStudentId === user.id) {
      return NextResponse.json({ error: 'Reviewers cannot approve or modify their own verification status' }, { status: 403 });
    }

    const validDecisions = ['VERIFIED', 'REJECTED', 'PENDING_MANUAL_REVIEW', 'RESUBMISSION_REQUIRED'];
    if (!validDecisions.includes(decision)) {
      return NextResponse.json(
        { error: `Invalid decision. Allowed values: ${validDecisions.join(', ')}` },
        { status: 400 }
      );
    }

    if ((decision === 'REJECTED' || decision === 'RESUBMISSION_REQUIRED') && (!reason || typeof reason !== 'string' || reason.trim().length === 0)) {
      return NextResponse.json(
        { error: 'A specific rejection reason is required when rejecting or requesting resubmission.' },
        { status: 400 }
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
        { error: 'Verification review service is temporarily unavailable. Institutional administrator configuration required.' },
        { status: 503 }
      );
    }

    const adminSupabase = createAdminClient();
    const { data: targetProfile, error: targetProfileError } = await adminSupabase
      .from('profiles')
      .select('college_id')
      .eq('id', targetStudentId)
      .single();

    if (targetProfileError?.code !== 'PGRST116' && targetProfileError) {
      throw targetProfileError;
    }
    if (!targetProfile) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (reviewerProfile.role !== 'SUPER_ADMIN') {
      const reviewerCollege = getCampusAliases(reviewerProfile.college_id);
      const targetCollege = getCampusAliases(targetProfile.college_id);
      if (!reviewerCollege || !targetCollege || !reviewerCollege.some(id => targetCollege.includes(id))) {
        return NextResponse.json(
          { error: 'Cannot review students outside your assigned campus' },
          { status: 403 }
        );
      }
    }

    const { data: studentProfile, error: studentProfileError } = await adminSupabase
      .from('student_profiles')
      .select('id')
      .eq('id', targetStudentId)
      .single();
    if (studentProfileError?.code !== 'PGRST116' && studentProfileError) {
      throw studentProfileError;
    }
    if (!studentProfile) {
      return NextResponse.json({ error: 'Student verification record not found' }, { status: 404 });
    }

    // 1. Update student_profiles verification status
    const studentUpdates = {
      verification_status: decision,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      verification_notes: reason || (officialRosterConfirmed ? 'Confirmed against official college student roster' : 'Reviewed by campus official'),
      updated_at: new Date().toISOString(),
    };

    const { error: spError } = await adminSupabase
      .from('student_profiles')
      .update(studentUpdates)
      .eq('id', targetStudentId);

    if (spError) {
      console.error('Student profile update error:', spError);
      throw spError;
    }

    // 2. Synchronize profiles.is_approved (only true when status is VERIFIED)
    await adminSupabase
      .from('profiles')
      .update({
        is_approved: decision === 'VERIFIED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetStudentId);

    // 3. Immutable audit log record
    await adminSupabase.from('audit_logs').insert({
      id: crypto.randomUUID(),
      actor_id: user.id,
      action: 'STUDENT_VERIFICATION_DECISION',
      entity_type: 'student_profiles',
      entity_id: targetStudentId,
      metadata: {
        reviewerRole: reviewerProfile.role,
        decision,
        reason: reason || null,
        officialRosterConfirmed: Boolean(officialRosterConfirmed),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Student verification updated to ${decision}`,
      decision,
    });
  } catch (error) {
    console.error('Verification decision POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
