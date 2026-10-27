import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { sendDemoSms, isDemoSmsEnabled } from '@/lib/demo-sms';
import { isSmtpConfigured, isRealEmailDeliveryEnabled, sendEmailNotification } from '@/lib/notifications';
import { validateStudentRegistrationNumber } from '@/lib/verification/id-card';

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
    if (!body || !body.email || typeof body.email !== 'string') {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    const email = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    const rawRegNum = typeof body.registrationNumber === 'string'
      ? body.registrationNumber.trim()
      : (typeof body.studentId === 'string'
        ? body.studentId.trim()
        : (typeof body.registration_number === 'string' ? body.registration_number.trim() : ''));

    const rawCollege = typeof body.collegeId === 'string'
      ? body.collegeId.trim()
      : (typeof body.college === 'string' ? body.college.trim() : '');

    // If a registration number is provided, validate its 8-10 alphanumeric format
    if (rawRegNum) {
      const regValidation = validateStudentRegistrationNumber({ registrationNumber: rawRegNum });
      if (!regValidation.valid) {
        return NextResponse.json(
          { error: regValidation.error || 'Student Registration Number must be 7 to 10 alphanumeric characters' },
          { status: 400 }
        );
      }
    }

    const supabase = createAdminClient();

    // Check if user exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, college_email, role, student_id, college_id')
      .eq('college_email', email)
      .single();

    // To prevent account enumeration, return identical generic response on non-existent or mismatched accounts
    const genericSuccess = () => NextResponse.json({
      success: true,
      message: 'If an account exists with these matching credentials, a verification OTP has been sent.',
    });

    if (!profile) {
      return genericSuccess();
    }

    // Verify submitted college matches profile college without leaking account existence
    if (rawCollege && profile.college_id) {
      const normReqCollege = rawCollege.toLowerCase();
      const normProfCollege = profile.college_id.toLowerCase();
      const isCollegeMatch =
        normReqCollege === normProfCollege ||
        (normReqCollege.includes('srkr') && normProfCollege.includes('srkr')) ||
        ((normReqCollege.includes('vishnu') || normReqCollege.includes('vit')) &&
         (normProfCollege.includes('vishnu') || normProfCollege.includes('vit')));

      if (!isCollegeMatch) {
        return genericSuccess();
      }
    }

    // Additional consistency check: If account is a STUDENT and student_id is set on profile,
    // verify the provided registration number matches. If missing or mismatched, return generic success without issuing an OTP.
    if (profile.role === 'STUDENT' && profile.student_id) {
      const normalizedInput = rawRegNum.toUpperCase();
      const studentIdMatch = normalizedInput === profile.student_id.toUpperCase();
      const collegeIdMatch = profile.college_id && normalizedInput === profile.college_id.toUpperCase();
      if (!rawRegNum || (!studentIdMatch && !collegeIdMatch)) {
        return genericSuccess();
      }
    }

    // Generate 6-digit OTP using CSPRNG
    const otp = randomInt(100000, 1000000).toString();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Clean up any existing OTP for this email
    await supabase.from('user_otp_verifications').delete().eq('email', email);

    // Save recovery OTP
    const { error: insertError } = await supabase.from('user_otp_verifications').insert({
      email,
      otp_hash: otpHash,
      expires_at: expiresAt,
      registration_data: {
        purpose: 'PASSWORD_RESET',
        action: 'PASSWORD_RESET',
        userId: profile.id,
      },
    });

    if (insertError) {
      console.error('Password reset OTP insert error:', insertError);
      return NextResponse.json({ error: 'Failed to generate reset OTP' }, { status: 500 });
    }

    let clientToken: string | undefined;

    // 1. If real SMTP is configured and live email delivery is enabled, deliver real email OTP
    if (isRealEmailDeliveryEnabled() && isSmtpConfigured()) {
      const emailResult = await sendEmailNotification({
        toEmail: email,
        subject: `Kavach Campus — Password Recovery Code: ${otp}`,
        body: `Hello ${profile.full_name || 'Campus Member'},\n\nYour Kavach Campus password reset code is: ${otp}\n\nThis code will expire in 5 minutes.\nIf you did not request a password reset, please alert campus security immediately.\n\n— Kavach Campus Institutional Safety Desk`,
        idempotencyKey: `pwd-reset-${email}-${Date.now()}`
      });

      if (!emailResult.success) {
        await supabase.from('user_otp_verifications').delete().eq('email', email);
        return NextResponse.json(
          { error: `Failed to deliver recovery email: ${emailResult.error || 'SMTP delivery failed'}` },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a verification OTP has been sent.',
        deliveryMethod: 'EMAIL_SMTP',
      });
    }

    // 2. Otherwise in dev/demo mode, use local demo simulation
    if (isDemoSmsEnabled()) {
      const smsResult = sendDemoSms(email, 'PASSWORD_RESET', otp, true);
      clientToken = smsResult.message?.clientToken;
    } else if (process.env.NODE_ENV !== 'production') {
      const [localPart, domainPart] = email.split('@');
      const maskedEmail = `${localPart[0]}***@${domainPart}`;
      console.log(`[DEVELOPMENT ONLY] Password reset OTP generated for ${maskedEmail}`);
    } else {
      await supabase.from('user_otp_verifications').delete().eq('email', email);
      return NextResponse.json(
        { error: 'Password recovery email delivery is temporarily unavailable.' },
        { status: 503 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a verification OTP has been sent.',
      email,
      clientToken,
      deliveryMethod: 'DEMO_SIMULATION',
    });

    if (clientToken) {
      response.cookies.set('demo_sms_token', clientToken, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 300,
      });
    }

    return response;
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
