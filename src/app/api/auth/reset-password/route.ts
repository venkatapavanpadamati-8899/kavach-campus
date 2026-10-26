import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import bcrypt from 'bcryptjs';
import { verifyDemoSmsOtp } from '@/lib/demo-sms';

export async function POST(req: Request) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const isServiceRoleConfigured =
      !!serviceRoleKey &&
      serviceRoleKey.length > 30 &&
      !serviceRoleKey.includes('YOUR_SERVICE_ROLE_KEY');

    if (!isServiceRoleConfigured) {
      return NextResponse.json(
        { error: 'Password recovery service is temporarily unavailable. Institutional administrator configuration required.' },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.email || !body.otp || !body.password) {
      return NextResponse.json({ error: 'Email, OTP, and new password are required' }, { status: 400 });
    }

    const { email, otp, password } = body;

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Look up OTP record
    const { data: record, error: fetchError } = await supabase
      .from('user_otp_verifications')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (fetchError || !record) {
      return NextResponse.json({ error: 'No active password reset request found. Please request a new OTP.' }, { status: 404 });
    }

    // Check expiration
    if (new Date() > new Date(record.expires_at)) {
      await supabase.from('user_otp_verifications').delete().eq('email', email);
      return NextResponse.json({ error: 'Reset OTP has expired. Please request a new OTP.' }, { status: 400 });
    }

    // Check attempts
    if (record.attempts >= record.max_attempts) {
      await supabase.from('user_otp_verifications').delete().eq('email', email);
      return NextResponse.json({ error: 'Too many failed attempts. Please request a new OTP.' }, { status: 400 });
    }

    // Verify purpose binding: reject registration OTPs at password reset endpoint
    if (record.registration_data?.action === 'REGISTRATION' || record.registration_data?.purpose === 'REGISTRATION') {
      return NextResponse.json({ error: 'Invalid recovery code. This code was not issued for password reset.' }, { status: 400 });
    }

    // Verify OTP using the cryptographic bcrypt hash stored in user_otp_verifications,
    // or demo SMS OTP strictly bound to this email address in development mode.
    // In production, demo OTP is strictly rejected.
    const userId = record.registration_data?.userId;
    const isProduction = process.env.NODE_ENV === 'production';
    const isDemoSmsValid = !isProduction && verifyDemoSmsOtp(email, otp).success;
    const isBcryptValid = await bcrypt.compare(otp, record.otp_hash);
    const isValid = isProduction ? isBcryptValid : (isBcryptValid || isDemoSmsValid);

    if (!isValid) {
      await supabase
        .from('user_otp_verifications')
        .update({ attempts: record.attempts + 1 })
        .eq('id', record.id);
      return NextResponse.json({ error: 'Invalid verification OTP' }, { status: 401 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'Invalid recovery record' }, { status: 500 });
    }

    // Update the user's password using Admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: password,
    });

    if (updateError) {
      console.error('Password reset update error:', updateError);
      return NextResponse.json({ error: updateError.message || 'Failed to update password' }, { status: 500 });
    }

    // Delete the consumed OTP record
    await supabase.from('user_otp_verifications').delete().eq('email', email);

    // Record audit log
    await supabase.from('audit_logs').insert({
      actor_id: userId,
      action: 'PASSWORD_RESET_SUCCESS',
      entity_type: 'profiles',
      entity_id: userId,
      metadata: { email: email.trim().toLowerCase(), timestamp: new Date().toISOString() },
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
