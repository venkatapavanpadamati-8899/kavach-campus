import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rawGroup = searchParams.get('bloodGroup');
    const bloodGroup = rawGroup ? rawGroup.replace(/ /g, '+').trim().toUpperCase() : null;

    if (!bloodGroup) {
      return NextResponse.json({ error: 'Blood group query is required (e.g. O+, A+, B+, AB+)' }, { status: 400 });
    }

    const validGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    if (!validGroups.includes(bloodGroup)) {
      return NextResponse.json({ error: `Invalid blood group. Supported values: ${validGroups.join(', ')}` }, { status: 400 });
    }

    // Query student_profiles matching the requested blood group
    const { data: studentList, error: queryError } = await supabase
      .from('student_profiles')
      .select('id, blood_group, course, hostel_room, verification_status')
      .eq('blood_group', bloodGroup)
      .limit(30);

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    if (!studentList || studentList.length === 0) {
      return NextResponse.json({ donors: [], count: 0 }, { status: 200 });
    }

    // Fetch corresponding profile public details for matching students
    const userIds = studentList.map(s => s.id);
    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('id, full_name, department, year, phone')
      .in('id', userIds);

    if (profError) {
      return NextResponse.json({ error: profError.message }, { status: 500 });
    }

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // Filter out student_profiles entries whose corresponding profile is not accessible within the caller's college scope
    const accessibleStudents = profiles && profiles.length > 0
      ? studentList.filter(st => profileMap.has(st.id))
      : studentList;

    // Format safe donor list
    const donors = accessibleStudents.map(st => {
      const p = profileMap.get(st.id);
      const rawName = p?.full_name || 'Campus Volunteer';
      const nameParts = rawName.trim().split(' ');
      const maskedName = nameParts.length > 1
        ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
        : nameParts[0];

      return {
        id: st.id,
        name: maskedName,
        bloodGroup: st.blood_group,
        department: p?.department || st.course || 'Undergraduate',
        year: p?.year || 'Senior',
        hostelBlock: st.hostel_room ? st.hostel_room.split('-')[0] : 'Campus Hostel',
        contactPhone: p?.phone || null,
        isVerified: st.verification_status === 'VERIFIED'
      };
    });

    return NextResponse.json({ donors, count: donors.length }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
