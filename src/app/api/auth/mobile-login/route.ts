import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isDemoSmsEnabled, sendDemoSms, verifyDemoSmsOtp, validateRecipientFormat } from '@/lib/demo-sms';

function maskEmail(email?: string): string {
  if (!email || !email.includes('@')) return '***@***';
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
}

function getDestinationByRole(role: string, isApproved?: boolean): string {
  if (role === 'STUDENT') {
    return isApproved ? '/student' : '/student/verification-status?notice=verification_required';
  }
  switch (role) {
    case 'STAFF':
    case 'MENTOR':
    case 'COUNSELLOR':
    case 'COUNSELOR':
    case 'SECURITY':
    case 'WOMENS_CELL':
    case 'WARDEN':
      return '/staff';
    case 'HOD':
    case 'PRINCIPAL':
    case 'MANAGEMENT':
      return '/management';
    case 'ADMIN':
      return '/admin';
    case 'SUPER_ADMIN':
      return '/super-admin';
    default:
      return '/student';
  }
}

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
        { error: 'Authentication service is temporarily unavailable. Institutional administrator configuration required.' },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { step, phone, otp } = body || {};

    const validation = validateRecipientFormat(typeof phone === 'string' ? phone : '');
    if (!validation.valid || !validation.isPhone) {
      return NextResponse.json(
        { error: validation.error || 'Please enter a valid 10-digit Indian mobile number.' },
        { status: 400 }
      );
    }
    const cleanPhone = validation.normalized;
    const supabase = createAdminClient();

    // STEP 1: SEND DEMO OTP
    if (step === 'send') {
      // 1. Check whether an account exists with this mobile number
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, college_email, phone, role, is_approved')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (profileError) {
        console.error('Mobile lookup error:', profileError);
        // If PGRST116 (multiple accounts share the same phone number), fallback to the newest profile
        if (
          profileError.code === 'PGRST116' ||
          profileError.message?.includes('PGRST116') ||
          profileError.message?.includes('requires 1 row')
        ) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, college_email, phone, role, is_approved')
            .eq('phone', cleanPhone)
            .order('created_at', { ascending: false })
            .limit(1);
          if (profiles && profiles.length > 0) {
            profile = profiles[0];
            profileError = null;
          }
        }
      }

      if (!profile) {
        return NextResponse.json(
          { error: `No registered account found with mobile number +91 ${cleanPhone}. Please register first with your institutional email.` },
          { status: 404 }
        );
      }

      // Privileged roles cannot bypass authentication via mobile demo OTP
      const PRIVILEGED_ROLES = ['ADMIN', 'SUPER_ADMIN', 'MANAGEMENT', 'PRINCIPAL', 'HOD'];
      if (PRIVILEGED_ROLES.includes(profile.role)) {
        return NextResponse.json(
          { error: 'Mobile OTP sign in is not permitted for administrative and management roles. Please sign in with your institutional credentials.' },
          { status: 403 }
        );
      }

      // 2. Mobile OTP is strictly Demo mode unless real SMS provider is deployed
      if (!isDemoSmsEnabled()) {
        return NextResponse.json(
          { error: 'Mobile OTP sign in is unavailable in production mode without a configured SMS gateway. Please sign in with your institutional email and password.' },
          { status: 503 }
        );
      }

      // 3. Dispatch simulated demo SMS OTP with CSPRNG
      const result = sendDemoSms(cleanPhone, 'LOGIN');
      if (!result.success) {
        const isRateLimit = result.error?.includes('Too many') || result.error?.includes('wait');
        return NextResponse.json({ error: result.error }, { status: isRateLimit ? 429 : 400 });
      }

      const isDemo = isDemoSmsEnabled() && process.env.NODE_ENV !== 'production';

      const response = NextResponse.json({
        success: true,
        mode: 'DEMO_SMS_MODE',
        phone: cleanPhone,
        demoOtp: isDemo ? result.message?.otp : undefined,
        clientToken: isDemo ? result.message?.clientToken : undefined,
        simulatedBody: isDemo ? result.message?.body : undefined,
        emailMasked: maskEmail(profile.college_email),
        message: `6-digit Demo OTP generated for mobile sign in.`,
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
    }

    // STEP 2: VERIFY DEMO OTP & SIGN IN
    if (step === 'verify') {
      if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim())) {
        return NextResponse.json({ error: 'Please enter the 6-digit OTP received on your mobile.' }, { status: 400 });
      }
      const cleanOtp = otp.trim();

      // 1. Authoritative profile lookup
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, college_email, phone, role, is_approved, college_id')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (profileError) {
        console.error('Mobile lookup error:', profileError);
        // If PGRST116 (multiple accounts share the same phone number), fallback to the newest profile
        if (
          profileError.code === 'PGRST116' ||
          profileError.message?.includes('PGRST116') ||
          profileError.message?.includes('requires 1 row')
        ) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, college_email, phone, role, is_approved, college_id')
            .eq('phone', cleanPhone)
            .order('created_at', { ascending: false })
            .limit(1);
          if (profiles && profiles.length > 0) {
            profile = profiles[0];
            profileError = null;
          }
        }
      }

      if (profileError || !profile) {
        return NextResponse.json({ error: `No registered account found with mobile number +91 ${cleanPhone}.` }, { status: 404 });
      }

      // Privileged roles cannot bypass authentication via mobile demo OTP
      const PRIVILEGED_ROLES = ['ADMIN', 'SUPER_ADMIN', 'MANAGEMENT', 'PRINCIPAL', 'HOD'];
      if (PRIVILEGED_ROLES.includes(profile.role)) {
        return NextResponse.json(
          { error: 'Mobile OTP sign in is not permitted for administrative and management roles. Please sign in with your institutional credentials.' },
          { status: 403 }
        );
      }

      // 2. Check approval status
      if (profile.role !== 'STUDENT' && !profile.is_approved) {
        return NextResponse.json(
          { error: 'Your account is pending administrator approval. Please wait for campus accreditation.' },
          { status: 403 }
        );
      }

      // 3. Verify OTP against demo store
      const verifyResult = verifyDemoSmsOtp(cleanPhone, cleanOtp);
      if (!verifyResult.success) {
        return NextResponse.json({ error: verifyResult.error || 'Invalid OTP' }, { status: 401 });
      }

      // 4. Generate authentication link/token for the user
      let tokenHash: string | null = null;
      let actionLink: string | null = null;
      if (typeof supabase.auth?.admin?.generateLink === 'function') {
        try {
          const linkRes = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: profile.college_email,
          });
          tokenHash = linkRes.data?.properties?.hashed_token || null;
          actionLink = linkRes.data?.properties?.action_link || null;
        } catch (err) {
          console.error('generateLink error during mobile sign in:', err);
        }
      }

      const destination = getDestinationByRole(profile.role, profile.is_approved);

      return NextResponse.json({
        success: true,
        message: 'Mobile OTP verified successfully.',
        user: {
          id: profile.id,
          name: profile.full_name,
          email: profile.college_email,
          role: profile.role,
          isApproved: profile.is_approved,
          collegeId: profile.college_id,
        },
        token_hash: tokenHash,
        action_link: actionLink,
        destination,
      });
    }

    return NextResponse.json({ error: 'Invalid step parameter. Allowed values: send, verify.' }, { status: 400 });
  } catch (error) {
    console.error('Mobile login route error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred during mobile authentication.' }, { status: 500 });
  }
}
