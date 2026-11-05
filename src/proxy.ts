import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const protectedRoutes = ['/student', '/staff', '/admin', '/management', '/super-admin', '/api/protected'];

function redirectWithCookies(url: URL | string, responseWithCookies: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url);
  responseWithCookies.cookies.getAll().forEach((c) => {
    redirect.cookies.set(c.name, c.value, c);
  });
  return redirect;
}

export default async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const { pathname } = request.nextUrl;

  // Defensive OAuth Recovery: If Supabase redirects to Site URL root (/) or login with ?code=,
  // forward immediately to /api/auth/callback so the PKCE session exchange completes cleanly.
  if ((pathname === '/' || pathname === '/login') && request.nextUrl.searchParams.has('code')) {
    const callbackUrl = new URL('/api/auth/callback', request.url);
    callbackUrl.search = request.nextUrl.search;
    return redirectWithCookies(callbackUrl, supabaseResponse);
  }

  // Aliases for secure administrative logins
  if (pathname === '/secure-admin/login' || pathname === '/secure-admin') {
    return redirectWithCookies(new URL('/admin/login', request.url), supabaseResponse);
  }
  if (pathname === '/secure-super-admin/login' || pathname === '/secure-super-admin') {
    return redirectWithCookies(new URL('/super-admin/login', request.url), supabaseResponse);
  }

  // Dedicated Administrator, Super Admin login, and Campus Admin registration pages are public
  if (pathname === '/super-admin/login' || pathname === '/admin/login' || pathname === '/admin/campus/register') {
    return supabaseResponse;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions: {
        path: '/',
        sameSite: 'lax',
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              path: options?.path || '/',
              sameSite: options?.sameSite || 'lax',
            })
          );
        },
      },
    }
  );

  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));

  if (!isProtected) {
    return supabaseResponse;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (pathname.startsWith('/super-admin')) {
      const superAdminLogin = new URL('/super-admin/login', request.url);
      if (pathname !== '/super-admin' && pathname !== '/super-admin/login') {
        superAdminLogin.searchParams.set('redirect', pathname);
      }
      return redirectWithCookies(superAdminLogin, supabaseResponse);
    }
    if (pathname.startsWith('/admin')) {
      const adminLogin = new URL('/admin/login', request.url);
      if (pathname !== '/admin' && pathname !== '/admin/login') {
        adminLogin.searchParams.set('redirect', pathname);
      }
      return redirectWithCookies(adminLogin, supabaseResponse);
    }
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/' && pathname !== '/login') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return redirectWithCookies(loginUrl, supabaseResponse);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_approved, college_id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    if (pathname.startsWith('/super-admin')) {
      return redirectWithCookies(new URL('/super-admin/login?error=profile_not_found', request.url), supabaseResponse);
    }
    return redirectWithCookies(new URL('/login?error=profile_not_found', request.url), supabaseResponse);
  }

  const role = profile.role;
  const isSuperAdmin = role === 'SUPER_ADMIN';

  // Unapproved users are blocked from privileged dashboards
  if (!profile.is_approved) {
    const isStudentExempt = role === 'STUDENT' && (pathname === '/student/verification-status' || pathname.startsWith('/student/sos'));
    if (!isStudentExempt) {
      if (role === 'STUDENT') {
        return redirectWithCookies(new URL('/student/verification-status?notice=verification_required', request.url), supabaseResponse);
      }
      return redirectWithCookies(new URL('/login?error=pending_approval', request.url), supabaseResponse);
    }
  }

  // Role Based Access Control Matrix
  const isAdmin = role === 'ADMIN' || isSuperAdmin || role === 'CAMPUS_ADMIN';
  const isManagement = role === 'HOD' || role === 'PRINCIPAL' || role === 'PROVOST' || role === 'VICE_PRINCIPAL' || role === 'DEAN' || role === 'MANAGEMENT' || role === 'COLLEGE_MANAGEMENT' || isAdmin;
  const isStaff = role === 'STAFF' || role === 'PROFESSOR' || role === 'ASSOCIATE_PROFESSOR' || role === 'ASSISTANT_PROFESSOR' || role === 'JUNIOR_PROFESSOR' || role === 'LECTURER' || role === 'TEACHER' || role === 'COUNSELLOR' || role === 'COUNSELOR' || role === 'WOMENS_CELL' || role === 'SECURITY' || role === 'WARDEN' || role === 'MENTOR' || role === 'ADMINISTRATIVE_OFFICER' || role === 'NON_TEACHING_STAFF' || isManagement;

  if (pathname.startsWith('/super-admin') && !isSuperAdmin) {
    return redirectWithCookies(new URL('/super-admin/login?error=unauthorized', request.url), supabaseResponse);
  }

  if (pathname.startsWith('/admin') && !isAdmin) {
    return redirectWithCookies(new URL('/unauthorized', request.url), supabaseResponse);
  }
  
  if (pathname.startsWith('/management') && !isManagement) {
    return redirectWithCookies(new URL('/unauthorized', request.url), supabaseResponse);
  }

  if (pathname.startsWith('/staff') && !isStaff) {
    return redirectWithCookies(new URL('/unauthorized', request.url), supabaseResponse);
  }

  if (pathname.startsWith('/student')) {
    if (role !== 'STUDENT') {
      return redirectWithCookies(new URL('/unauthorized', request.url), supabaseResponse);
    }

    // Emergency SOS and Verification Status portal must remain accessible
    const isExempt = pathname === '/student/verification-status' || pathname.startsWith('/student/sos');
    if (!isExempt) {
      const { data: studentProf } = await supabase
        .from('student_profiles')
        .select('verification_status')
        .eq('id', user.id)
        .single();

      if (!studentProf || studentProf.verification_status !== 'VERIFIED') {
        return redirectWithCookies(new URL('/student/verification-status?notice=verification_required', request.url), supabaseResponse);
      }
    }
  }

  supabaseResponse.headers.set('x-user-id', user.id);
  supabaseResponse.headers.set('x-user-role', role);
  if (profile.college_id) {
    supabaseResponse.headers.set('x-user-college', profile.college_id);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/student/:path*',
    '/staff/:path*',
    '/admin/:path*',
    '/management/:path*',
    '/super-admin/:path*',
    '/secure-admin/:path*',
    '/secure-super-admin/:path*',
    '/api/protected/:path*'
  ],
};
