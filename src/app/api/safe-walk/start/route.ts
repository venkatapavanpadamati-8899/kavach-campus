import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate the request
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // 2. Reject unauthenticated users
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Derive student_id from verified session (user.id)
    const studentId = user.id;

    // 5. Verify the user's authorized student role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, college_id')
      .eq('id', studentId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 });
    }

    if (profile.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can start a safe walk' }, { status: 403 });
    }

    // Parse the request body
    const body = await request.json().catch(() => ({}));

    // 6. Validate destination and expected duration
    const destination = body.destination?.trim();
    if (!destination) {
      return NextResponse.json({ error: 'Destination is required' }, { status: 400 });
    }

    let expectedDurationMins = parseInt(body.expectedDurationMins, 10);
    if (isNaN(expectedDurationMins)) {
      expectedDurationMins = 30; // Default to 30 mins
    }

    // 7. Enforce sensible configurable duration limits (e.g., between 5 and 180 minutes)
    if (expectedDurationMins < 5 || expectedDurationMins > 180) {
      return NextResponse.json({ error: 'Expected duration must be between 5 and 180 minutes' }, { status: 400 });
    }

    // 8. Validate optional latitude and longitude. 9. GPS not required.
    let startLatitude: number | null = null;
    let startLongitude: number | null = null;
    const hasLatitude = body.startLatitude !== undefined && body.startLatitude !== null;
    const hasLongitude = body.startLongitude !== undefined && body.startLongitude !== null;

    if (hasLatitude || hasLongitude) {
      if (!hasLatitude || !hasLongitude || body.startLatitude === '' || body.startLongitude === '') {
        return NextResponse.json({ error: 'Both valid coordinates must be provided together' }, { status: 400 });
      }

      const latitude = Number(body.startLatitude);
      const longitude = Number(body.startLongitude);
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
      }

      startLatitude = latitude;
      startLongitude = longitude;
    }

    // 13. Enforce the intended policy for concurrent active walks
    // Check if the user already has an ACTIVE walk
    let existingWalks: { id: string }[] | null = null;
    let checkError: unknown = null;

    try {
      const query = supabase.from('safe_walks').select('id');
      if (typeof (query as unknown as { or?: unknown }).or === 'function') {
        const res = await (query as unknown as { or: (cond: string) => { eq: (col: string, val: string) => { limit: (n: number) => Promise<{ data: { id: string }[] | null; error: unknown }> } } })
          .or(`student_id.eq.${studentId},user_id.eq.${studentId}`)
          .eq('status', 'ACTIVE')
          .limit(1);
        existingWalks = res?.data;
        checkError = res?.error;
      } else {
        const res = await (query as unknown as { eq: (col: string, val: string) => Promise<{ data?: { id: string }[]; error?: unknown; eq?: unknown; limit?: unknown }> }).eq('student_id', studentId);
        if (res && typeof res.eq === 'function') {
          const res2 = await (res as unknown as { eq: (col: string, val: string) => Promise<{ data?: { id: string }[]; error?: unknown; limit?: unknown }> }).eq('status', 'ACTIVE');
          const res3 = res2 && typeof res2.limit === 'function' ? await (res2 as unknown as { limit: (n: number) => Promise<{ data?: { id: string }[]; error?: unknown }> }).limit(1) : res2;
          existingWalks = res3?.data || [];
          checkError = res3?.error || null;
        } else if (res && typeof res.limit === 'function') {
          const res2 = await (res as unknown as { limit: (n: number) => Promise<{ data?: { id: string }[]; error?: unknown }> }).limit(1);
          existingWalks = res2?.data || [];
          checkError = res2?.error || null;
        } else {
          existingWalks = res?.data || [];
          checkError = res?.error || null;
        }
      }
    } catch (err) {
      console.error('Database error checking existing walks:', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    if (checkError) {
      console.error('Database error checking existing walks:', checkError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    if (existingWalks && existingWalks.length > 0) {
      // 12. Handle duplicate submissions safely (or reject them)
      return NextResponse.json({ 
        error: 'You already have an active Safe Walk',
        walkId: existingWalks[0].id
      }, { status: 409 });
    }

    // 10. Generate timestamps on the server
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expectedDurationMins * 60000);
    // 11. Create the record using actual existing database columns (satisfying both user_id and student_id)
    const insertPayload: Record<string, unknown> = {
      user_id: studentId,
      student_id: studentId,
      expected_minutes: expectedDurationMins,
      destination: destination,
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      status: 'ACTIVE',
      start_latitude: startLatitude,
      start_longitude: startLongitude,
      last_latitude: startLatitude,
      last_longitude: startLongitude,
      last_location_at: startLatitude !== null && startLongitude !== null ? now.toISOString() : null,
      auto_sos_enabled: true,
      auto_sos_timeout_mins: expectedDurationMins
    };

    if (profile.college_id) {
      insertPayload.college_id = profile.college_id;
    }

    const { data: newWalk, error: insertError } = await supabase
      .from('safe_walks')
      .insert(insertPayload)
      .select('id, status, expires_at')
      .single();

    if (insertError) {
      console.error('Database error creating safe walk:', insertError);
      // 14. Do not expose secrets or internal database errors
      return NextResponse.json({ error: 'Failed to start safe walk' }, { status: 500 });
    }

    // 15. Return the new walk ID, status, and expected arrival time
    return NextResponse.json({
      success: true,
      walkId: newWalk.id,
      status: newWalk.status,
      expiresAt: newWalk.expires_at
    }, { status: 201 }); // 16. Use appropriate HTTP status codes

  } catch (err) {
    console.error('Unexpected error in safe-walk/start:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
