import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate the request
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = user.id;

    // Parse the request body
    const body = await request.json().catch(() => ({}));
    const walkId = body.walkId;

    if (!walkId) {
      return NextResponse.json({ error: 'Safe Walk ID is required' }, { status: 400 });
    }

    // 5. Verify ownership and check current state
    const { data: existingWalk, error: fetchError } = await supabase
      .from('safe_walks')
      .select('id, student_id, user_id, status')
      .eq('id', walkId)
      .single();

    if (fetchError || !existingWalk) {
      return NextResponse.json({ error: 'Safe walk not found' }, { status: 404 });
    }

    if (existingWalk.student_id !== studentId && existingWalk.user_id !== studentId) {
      return NextResponse.json({ error: 'Forbidden: You do not own this safe walk' }, { status: 403 });
    }

    if (existingWalk.status !== 'ACTIVE') {
      return NextResponse.json({ 
        error: `Cannot end walk in status: ${existingWalk.status}` 
      }, { status: 400 });
    }

    // 6. Atomic transition using an update with the condition status = 'ACTIVE'
    // 7. Set completed_at using server-side time (now)
    const now = new Date().toISOString();
    const { data: updatedWalk, error: updateError } = await supabase
      .from('safe_walks')
      .update({
        status: 'COMPLETED',
        completed_at: now,
        updated_at: now
      })
      .eq('id', walkId)
      .eq('status', 'ACTIVE')
      .select('id, status, completed_at')
      .single();

    if (updateError || !updatedWalk) {
      // If no row was returned, it might have been modified concurrently.
      return NextResponse.json({ error: 'Failed to end safe walk. It may have already ended.' }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      walkId: updatedWalk.id,
      status: updatedWalk.status,
      completedAt: updatedWalk.completed_at
    }, { status: 200 });

  } catch (err) {
    console.error('Unexpected error in safe-walk/end:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
