import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateRecipientFormat, verifyDemoSmsOtp } from '@/lib/demo-sms';

const PRIVILEGED_ROLES = ['ADMIN', 'SUPER_ADMIN', 'MANAGEMENT', 'PRINCIPAL', 'HOD'];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
    }

    // 1. Mobile Phone + Demo OTP Authentication Flow
    if (body.phone || body.otp) {
      const rawPhone = typeof body.phone === 'string' ? body.phone : '';
      const validation = validateRecipientFormat(rawPhone);
      if (!validation.valid || !validation.isPhone) {
        return NextResponse.json({ error: validation.error || 'Please enter a valid 10-digit mobile number' }, { status: 400 });
      }
      const cleanPhone = validation.normalized;
      const cleanOtp = typeof body.otp === 'string' ? body.otp.trim() : '';
      if (!/^\d{6}$/.test(cleanOtp)) {
        return NextResponse.json({ error: 'Please enter a valid 6-digit OTP' }, { status: 400 });
      }

      const admin = createAdminClient();
      const { data: profile } = await admin
        .from('profiles')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (!profile) {
        return NextResponse.json(
          { error: `No registered account found with mobile number +91 ${cleanPhone}. Please register first with your institutional email.` },
          { status: 404 }
        );
      }

      if (PRIVILEGED_ROLES.includes(profile.role)) {
        return NextResponse.json(
          { error: 'Mobile OTP is not permitted for administrative and management roles. Please sign in with your institutional credentials.' },
          { status: 403 }
        );
      }

      if (profile.role !== 'STUDENT' && !profile.is_approved) {
        return NextResponse.json({ error: 'Account pending admin approval' }, { status: 403 });
      }

      const verifyResult = verifyDemoSmsOtp(cleanPhone, cleanOtp);
      if (!verifyResult.success) {
        return NextResponse.json({ error: verifyResult.error || 'Invalid OTP' }, { status: 401 });
      }

      return NextResponse.json({
        token: 'demo-mobile-session-token',
        user: {
          id: profile.id,
          name: profile.full_name || profile.college_email?.split('@')[0] || 'User',
          role: profile.role || 'STUDENT',
          isApproved: profile.is_approved ?? true,
          verificationRequired: profile ? !profile.is_approved : false,
        },
      });
    }

    // 2. Email + Password Authentication Flow
    if (!body.email || !body.password || typeof body.email !== 'string' || typeof body.password !== 'string') {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    const { email, password } = body;
    const supabase = await createClient();

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
