import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import bcrypt from 'bcryptjs';
import { verifyDemoOtp } from '@/lib/auth-demo';
import { verifyDemoSmsOtp } from '@/lib/demo-sms';

export async function POST(req: Request) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const isServiceRoleConfigured =
      !!serviceRoleKey &&
      serviceRoleKey.length > 30 &&
      !serviceRoleKey.includes('YOUR_SERVICE_ROLE_KEY') &&
      !serviceRoleKey.includes('placeholder');

    if (!isServiceRoleConfigured) {
      return NextResponse.json(
        { error: 'Verification service is temporarily unavailable. Institutional administrator configuration required.' },
        { status: 503 }
      );
    }

    const supabase = createAdminClient();
    const { email, otp } = await req.json();

    if (!email || typeof email !== 'string' || !otp || typeof otp !== 'string') {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }
    const normalizedEmail = email.trim().toLowerCase();

    // Find the OTP record
    const { data: record, error: fetchError } = await supabase
      .from('user_otp_verifications')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (fetchError || !record) {
      return NextResponse.json({ error: 'No pending registration found for this email' }, { status: 404 });
    }

    // Check if OTP was already used / verified
    if (record.verified) {
      return NextResponse.json({ error: 'This verification code has already been used. Please log in or register again.' }, { status: 400 });
    }

    // Check expiration
    if (new Date() > new Date(record.expires_at)) {
      if (record.registration_data?.userId && typeof supabase.auth?.admin?.deleteUser === 'function') {
        try { await supabase.auth.admin.deleteUser(record.registration_data.userId); } catch { /* ignore */ }
      }
      try {
        await supabase.from('user_otp_verifications').delete().eq('email', normalizedEmail);
      } catch {
        // Safe fallback
      }
      return NextResponse.json({ error: 'OTP has expired. Please register again.' }, { status: 400 });
    }

    // Check attempts
    if (record.attempts >= record.max_attempts) {
      if (record.registration_data?.userId && typeof supabase.auth?.admin?.deleteUser === 'function') {
        try { await supabase.auth.admin.deleteUser(record.registration_data.userId); } catch { /* ignore */ }
      }
      try {
        await supabase.from('user_otp_verifications').delete().eq('email', normalizedEmail);
      } catch {
        // Safe fallback
      }
      return NextResponse.json({ error: 'Too many failed attempts. Please register again.' }, { status: 400 });
    }

    const regData = record.registration_data || {};

    // Reject password recovery OTPs at registration verification endpoint
    if (regData.action === 'PASSWORD_RESET') {
      return NextResponse.json(
        { error: 'This verification code is for password reset. Please use the password reset page.' },
        { status: 400 }
      );
    }

    // Verify OTP with bcrypt hash, or demo OTP / demo SMS strictly in development mode for non-privileged accounts
    const isProduction = process.env.NODE_ENV === 'production';
    const isDemoValid = !isProduction && verifyDemoOtp(otp, regData?.role);
    const demoSmsValid = !isProduction && verifyDemoSmsOtp(normalizedEmail, otp).success;
    const isBcryptValid = await bcrypt.compare(otp, record.otp_hash);
    const isValid = isProduction ? isBcryptValid : (isBcryptValid || isDemoValid || demoSmsValid);

    if (!isValid) {
      // Increment attempts
      await supabase
        .from('user_otp_verifications')
        .update({ attempts: record.attempts + 1 })
        .eq('id', record.id);
      
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 401 });
    }

    const isDemoVerification = !isProduction && (isDemoValid || demoSmsValid) && !isBcryptValid;

    // Claim the pending OTP atomically so concurrent verification requests cannot provision twice.
    const { data: claimedOtp, error: claimError } = await supabase
      .from('user_otp_verifications')
      .update({ verified: true })
      .eq('id', record.id)
      .eq('verified', false)
      .select('id')
      .maybeSingle();

    if (claimError) {
      console.error('Failed to claim registration OTP:', claimError);
      return NextResponse.json({ error: 'Unable to complete OTP verification. Please try again.' }, { status: 500 });
    }
    if (!claimedOtp) {
      return NextResponse.json(
        { error: 'This verification code has already been used. Please log in or register again.' },
        { status: 409 }
      );
    }

    // OTP IS VALID. Finalize the Supabase User.
    // If pre-created during registration, confirm email directly without needing a plaintext password.
    // Otherwise fallback to createUser for legacy records or mocked test runners.
    let userId: string;

    const verificationMetadata = {
      full_name: regData.name,
      role: regData.role,
      is_demo_account: isDemoVerification,
      verification_type: isDemoVerification
        ? (demoSmsValid ? 'DEMO_SMS_OTP' : 'STATIC_DEMO_OTP')
        : 'VERIFIED_CAMPUS_EMAIL_OTP',
      email_verified: !isDemoVerification,
      personal_email: regData.personal_email || regData.personalEmail || null,
      academic_year: regData.academicYear || null,
      department: regData.department || null,
      phone_verified: false, // Free Demo OTP does NOT verify real mobile-number ownership
      mobile_verification_status: 'DEMO_UNVERIFIED',
      verified_at: new Date().toISOString(),
    };

    if (regData.userId && typeof supabase.auth?.admin?.updateUserById === 'function') {
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(regData.userId, {
        email_confirm: true,
        user_metadata: verificationMetadata
      });

      if (updateError || !updateData?.user) {
        return NextResponse.json({ error: updateError?.message || 'Failed to confirm user account' }, { status: 500 });
      }
      userId = updateData.user.id;
    } else {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: regData.email,
        password: regData.password,
        email_confirm: true,
        user_metadata: verificationMetadata
      });

      if (authError || !authData?.user) {
        return NextResponse.json({ error: authError?.message || 'Failed to create user account' }, { status: 500 });
      }
      userId = authData.user.id;
    }

    // Insert into profiles (will trigger RLS, but we use admin client so it bypasses)
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      full_name: regData.name,
      college_email: regData.email,
      phone: regData.phone || null,
      role: regData.role,
      college_id: regData.campusId,
      student_id: regData.studentId,
      department: regData.department,
      year: regData.academicYear || regData.academic_year || regData.year || '1st Year',
      is_approved: regData.isApproved, // Students auto-approved, staff need admin
    });

    if (profileError) {
      // If profile fails, we should ideally rollback user creation or mark for manual fix.
      console.error('Profile creation failed:', profileError);
    }

    // Provision initial student_profiles record if new user is a student
    if (regData.role === 'STUDENT') {
      try {
        await supabase.from('student_profiles').upsert(
          {
            id: userId,
            verification_status: 'PENDING_UPLOAD',
            admission_type: 'REGULAR',
          },
          { onConflict: 'id' }
        );
      } catch (spErr) {
        console.error('Failed to provision student_profiles on registration:', spErr);
      }
    }

    // Clean up OTP record
    try {
      await supabase.from('user_otp_verifications').delete().eq('email', normalizedEmail);
    } catch {
      // Safe fallback
    }

    return NextResponse.json({ message: 'User registered successfully', success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
