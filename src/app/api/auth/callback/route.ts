import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveCollegeIdFromEmail } from '@/lib/colleges';
import { parseOAuthState, sanitizeRedirectUrl } from '@/lib/oauth';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');
  const rawState = requestUrl.searchParams.get('state');
  const errorCode = requestUrl.searchParams.get('error') || '';
  const errorDescription = requestUrl.searchParams.get('error_description') || '';
  const oauthError = errorDescription || errorCode;

  // Resolve true origin (handling reverse proxies & HTTPS)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : requestUrl.origin;

  // 1. Handle incoming OAuth provider errors
  if (oauthError) {
    console.error('OAuth provider error:', oauthError);
    const combinedError = `${errorCode} ${errorDescription}`.toLowerCase();
    if (
      combinedError.includes('deleted_client') ||
      combinedError.includes('client was deleted') ||
      combinedError.includes('invalid_client')
    ) {
      return NextResponse.redirect(`${origin}/login?error=google_oauth_client_deleted`);
    }
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(oauthError)}`);
  }

  // 2. Missing authorization code
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Missing authorization code')}`);
  }

  try {
    const supabase = await createClient();
    let user = null;
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      const {
        data: { user: sessionUser },
      } = await supabase.auth.getUser();
      user = sessionUser;
    } else {
      // Fallback: If direct Google OAuth code was returned, exchange with Google token endpoint
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (clientId && clientSecret && !clientId.includes('placeholder') && !clientSecret.includes('placeholder')) {
        try {
          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              code,
              client_id: clientId,
              client_secret: clientSecret,
              redirect_uri: `${origin}/api/auth/callback`,
              grant_type: 'authorization_code',
            }),
          });
          const tokenData = await tokenRes.json();
          if (tokenRes.ok && tokenData.id_token) {
            const { data: idTokenData, error: idTokenError } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: tokenData.id_token,
            });
            if (!idTokenError && idTokenData?.user) {
              user = idTokenData.user;
            }
          }
        } catch (fetchErr) {
          console.error('Direct Google token exchange error:', fetchErr);
        }
      }
    }

    if (!user) {
      if (exchangeError) {
        console.error('Code exchange error:', exchangeError);
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError.message || 'Authentication exchange failed')}`);
      }
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Could not retrieve user session')}`);
    }

    // Fetch existing profile
    let { data: profile } = await supabase
      .from('profiles')
      .select('role, is_approved')
      .eq('id', user.id)
      .single();

    // Auto-provision Google Auth users as STUDENT if profile does not exist
    if (!profile) {
      const supabaseAdmin = createAdminClient();
      const assignedCollegeId = resolveCollegeIdFromEmail(user.email);
      const isApproved = assignedCollegeId !== 'PENDING_CAMPUS_VERIFICATION';
      const { error: profileError } = await supabaseAdmin.from('profiles').insert({
        id: user.id,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'New Student',
        college_email: user.email,
        role: 'STUDENT',
        college_id: assignedCollegeId,
        is_approved: isApproved,
      });

      if (!profileError) {
        profile = { role: 'STUDENT', is_approved: isApproved };
      }

      // Provision initial student_profiles entry
      await supabaseAdmin.from('student_profiles').upsert(
        {
          id: user.id,
          verification_status: 'PENDING_UPLOAD',
          admission_type: 'REGULAR',
        },
        { onConflict: 'id' }
      );
    }

    if (!profile) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Profile initialization failed')}`);
    }

    // Role-based destination helper
    const getRolePath = (role: string, isApproved?: boolean) => {
      if (role === 'STUDENT') {
        return isApproved ? '/student' : '/student/verification-status?notice=verification_required';
      }
      switch (role) {
        case 'STAFF':
        case 'COUNSELLOR':
        case 'WOMENS_CELL':
        case 'SECURITY':
        case 'MENTOR':
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
    };

    // Validate safe redirect destination (prevent open redirect attacks)
    let destination = getRolePath(profile.role, profile.is_approved);
    const resolvedNext = next || (rawState ? parseOAuthState(rawState).next : undefined);
    if (resolvedNext) {
      const safePath = sanitizeRedirectUrl(resolvedNext, destination);
      if (profile.role === 'STUDENT' && !profile.is_approved) {
        destination = '/student/verification-status?notice=verification_required';
      } else {
        destination = safePath;
      }
    }

    return NextResponse.redirect(`${origin}${destination}`);
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      ('digest' in error || (error as { message?: string }).message?.includes('prerender'))
    ) {
      throw error;
    }
    console.error('Unhandled callback error:', error);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Internal authentication error')}`);
  }
}

