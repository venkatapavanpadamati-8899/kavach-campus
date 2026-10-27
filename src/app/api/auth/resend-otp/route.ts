import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { sendDemoSms, isDemoSmsEnabled } from '@/lib/demo-sms';
import { isSmtpConfigured, isRealEmailDeliveryEnabled, sendEmailNotification } from '@/lib/notifications';

const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(req: Request) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY || '';
    const isServiceRoleConfigured =
      !!serviceRoleKey &&
      serviceRoleKey.length > 30 &&
      !serviceRoleKey.includes('YOUR_SERVICE_ROLE_KEY') &&
      !serviceRoleKey.includes('placeholder');

    if (!isServiceRoleConfigured) {
      return NextResponse.json(
        { error: 'Resend OTP service is temporarily unavailable. Institutional administrator configuration required.' },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.email || typeof body.email !== 'string') {
      return NextResponse.json({ error: 'Valid college email address is required' }, { status: 400 });
    }

    const normalizedEmail = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Valid college email address is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Query pending OTP record
    const { data: record, error: fetchError } = await supabase
      .from('user_otp_verifications')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    // Anti-enumeration: return standard success response if no pending registration
    if (fetchError || !record) {
      return NextResponse.json({
        success: true,
        message: 'If an unverified registration exists for this email, a new verification code has been dispatched.',
      });
    }

    // Already verified check
    if (record.verified) {
      return NextResponse.json(
        { error: 'This registration has already been verified. Please log in.' },
        { status: 400 }
      );
    }

    // Enforce 60-second resend cooldown
    if (record.created_at) {
      const elapsedMs = Date.now() - new Date(record.created_at).getTime();
      if (elapsedMs < RESEND_COOLDOWN_MS) {
        const remainingSec = Math.ceil((RESEND_COOLDOWN_MS - elapsedMs) / 1000);
        return NextResponse.json(
          { error: `Please wait ${remainingSec} seconds before requesting another verification code.` },
          { status: 429 }
        );
      }
    }

    // Generate fresh 6-digit OTP using CSPRNG
    const newOtp = randomInt(100000, 1000000).toString();
    const salt = await bcrypt.genSalt(10);
    const newOtpHash = await bcrypt.hash(newOtp, salt);
    const newExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS).toISOString();
    const newCreatedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('user_otp_verifications')
      .update({
        otp_hash: newOtpHash,
        expires_at: newExpiresAt,
        attempts: 0,
        created_at: newCreatedAt,
      })
      .eq('id', record.id);

    if (updateError) {
      console.error('Failed to update resend OTP record:', updateError);
      return NextResponse.json({ error: 'Failed to generate a new verification code.' }, { status: 500 });
    }

    const regData = record.registration_data || {};
    const recipientName = regData.name || 'Student';

    // 1. Deliver via real SMTP if configured and live email delivery is enabled
    if (isRealEmailDeliveryEnabled() && isSmtpConfigured()) {
      const emailResult = await sendEmailNotification({
        toEmail: normalizedEmail,
        subject: `Kavach Campus — Verification Code: ${newOtp}`,
        body: `Hello ${recipientName},\n\nYour new Kavach Campus verification code is: ${newOtp}\n\nThis code will expire in 5 minutes.\nDo not share this code with anyone.\n\n— Kavach Campus Institutional Safety Desk`,
        idempotencyKey: `resend-otp-${normalizedEmail}-${Date.now()}`
      });

      if (!emailResult.success) {
        return NextResponse.json(
          { error: `Failed to deliver verification email: ${emailResult.error || 'SMTP delivery failed'}` },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'New verification code sent to your registered college email.',
        email: normalizedEmail,
        deliveryMethod: 'EMAIL_SMTP',
      });
    }

    // 2. In dev/demo mode, dispatch simulated message
    let clientToken: string | undefined;
    if (isDemoSmsEnabled()) {
      const smsResult = sendDemoSms(normalizedEmail, 'REGISTRATION', newOtp, true);
      if (!smsResult.success || !smsResult.message) {
        return NextResponse.json(
          { error: smsResult.error || 'Unable to create demo verification message.' },
          { status: 429 }
        );
      }
      clientToken = smsResult.message.clientToken;
    } else if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json(
        { error: 'OTP delivery is unavailable. Demo mode is disabled and SMTP is not configured.' },
        { status: 503 }
      );
    } else {
      return NextResponse.json(
        { error: 'OTP email delivery is not available. Please contact the institution administrator.' },
        { status: 503 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Demo OTP regenerated; no real SMS or email was sent (DEMO / DEVELOPMENT ONLY).',
      email: normalizedEmail,
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
    console.error('Resend OTP error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred while resending the code.' }, { status: 500 });
  }
}
