import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Server sign-out error:', error);
      return NextResponse.json({ error: 'Failed to invalidate session' }, { status: 500 });
    }
    const response = NextResponse.json({ success: true, message: 'Signed out successfully' });
    // Invalidate demo_sms_token cookie if present
    response.cookies.delete('demo_sms_token');
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Failed to sign out' }, { status: 500 });
  }
}
