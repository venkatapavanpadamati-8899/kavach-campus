import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { walkId, latitude, longitude } = body;

    if (!walkId) {
      return NextResponse.json({ error: 'Missing walkId' }, { status: 400 });
    }

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

    // Verify ownership and ACTIVE status
    const { data: walk, error: walkError } = await supabase
      .from('safe_walks')
      .select('id, student_id, status, expires_at')
      .eq('id', walkId)
      .single();

    if (walkError || !walk) {
      return NextResponse.json({ error: 'Safe walk not found' }, { status: 404 });
    }

    if (walk.student_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You do not own this safe walk' }, { status: 403 });
    }

    if (walk.status !== 'ACTIVE') {
      return NextResponse.json({ error: `Safe walk is not active (current status: ${walk.status})` }, { status: 400 });
    }

    const now = new Date();
    const isExpired = walk.expires_at ? new Date(walk.expires_at).getTime() < now.getTime() : false;

    // Update location on safe_walks record
    const { error: updateError } = await supabase
      .from('safe_walks')
      .update({
        last_latitude: numLat,
        last_longitude: numLng,
        last_location_at: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', walkId)
      .eq('status', 'ACTIVE');

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update safe walk location' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      recordedAt: now.toISOString(),
      isExpired
    }, { status: 200 });

  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
