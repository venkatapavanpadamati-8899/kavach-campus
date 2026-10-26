import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json().catch(() => null);
    if (!body || !body.email || !body.password || typeof body.email !== 'string' || typeof body.password !== 'string') {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    const { email, password } = body;

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Check approval status in profile using admin client (in case RLS blocks unapproved?) 
    // Actually, RLS allows users to view their own profile.
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profile && !profile.is_approved) {
      if (profile.role !== 'STUDENT') {
        await supabase.auth.signOut(); // Revoke session for unapproved staff/admin
        return NextResponse.json({ error: 'Account pending admin approval' }, { status: 403 });
      }
    }

    return NextResponse.json({ 
      token: authData.session?.access_token || '', 
      user: { 
        id: profile?.id || authData.user.id, 
        name: profile?.full_name || authData.user.email?.split('@')[0] || 'User', 
        role: profile?.role || 'STUDENT',
        isApproved: profile?.is_approved ?? true,
        verificationRequired: profile ? !profile.is_approved : false
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
