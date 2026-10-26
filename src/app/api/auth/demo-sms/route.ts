import { NextResponse } from 'next/server';
import { isDemoSmsEnabled, sendDemoSms, getLatestDemoSms } from '@/lib/demo-sms';

export async function GET(req: Request) {
  if (!isDemoSmsEnabled()) {
    return NextResponse.json({ error: 'Demo SMS is disabled in production.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const recipient =
    searchParams.get('recipient') ||
    searchParams.get('email') ||
    searchParams.get('phone');

  if (!recipient) {
    return NextResponse.json({ error: 'Recipient parameter is required.' }, { status: 400 });
  }

  // Security authorization check: Enforce session token binding
  const authHeaderToken = req.headers.get('x-demo-token');
  const queryToken = searchParams.get('token');
  const cookieHeader = req.headers.get('cookie') || '';
  const cookieMatch = cookieHeader.match(/demo_sms_token=([^;]+)/);
  const cookieToken = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;

  const clientToken = authHeaderToken || queryToken || cookieToken;

  if (!clientToken) {
    return NextResponse.json(
      { error: 'Unauthorized: Demo SMS inbox access requires a valid session token for this recipient.' },
      { status: 401 }
    );
  }

  const message = getLatestDemoSms(recipient, clientToken);
  if (!message) {
    return NextResponse.json(
      { error: 'Unauthorized or expired demo message for this recipient.' },
      { status: 403 }
    );
  }

  return NextResponse.json({
    mode: 'DEMO_SMS_MODE',
    disclaimer: 'DEMO / DEVELOPMENT VERIFICATION ONLY — Simulated message (₹0 Free). Does NOT represent real mobile-number ownership verification.',
    isRealVerification: false,
    verificationType: 'DEMO_DEVELOPMENT_ONLY',
    message: message,
    otp: message.otp,
  });
}

export async function POST(req: Request) {
  if (!isDemoSmsEnabled()) {
    return NextResponse.json(
      { error: 'Demo SMS is disabled in production. Real SMS provider required.' },
      { status: 403 }
    );
  }

  try {
    const data = await req.json();
    const recipient = data.recipient || data.email || data.phone;
    const { purpose, fixedOtp } = data;

    if (!recipient || typeof recipient !== 'string') {
      return NextResponse.json({ error: 'Valid recipient email or mobile number is required.' }, { status: 400 });
    }

    const result = sendDemoSms(recipient, purpose || 'REGISTRATION', fixedOtp);

    if (!result.success) {
      const isRateLimit = result.error?.includes('Too many') || result.error?.includes('wait');
      return NextResponse.json({ error: result.error }, { status: isRateLimit ? 429 : 400 });
    }

    const response = NextResponse.json({
      success: true,
      mode: 'DEMO_SMS_MODE',
      disclaimer: 'DEMO / DEVELOPMENT VERIFICATION ONLY — Simulated message (₹0 Free). Does NOT represent real mobile-number ownership verification.',
      isRealVerification: false,
      verificationType: 'DEMO_DEVELOPMENT_ONLY',
      clientToken: result.message?.clientToken,
      message: result.message,
    });

    if (result.message?.clientToken) {
      response.cookies.set('demo_sms_token', result.message.clientToken, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 300,
      });
    }

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }
}
