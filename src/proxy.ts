import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const protectedRoutes = ['/student', '/staff', '/admin', '/management', '/super-admin', '/api/protected'];

export default async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const { pathname } = request.nextUrl;

  // Dedicated Super Admin login page is public
  if (pathname === '/super-admin/login') {
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
            supabaseResponse.cookies.set(name, value, options)
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
      return NextResponse.redirect(superAdminLogin);
    }
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/' && pathname !== '/login') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_approved, college_id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    if (pathname.startsWith('/super-admin')) {
      return NextResponse.redirect(new URL('/super-admin/login?error=profile_not_found', request.url));
    }
    return NextResponse.redirect(new URL('/login?error=profile_not_found', request.url));
  }

  const role = profile.role;
  const isSuperAdmin = role === 'SUPER_ADMIN';

  // Unapproved users are blocked from privileged dashboards
  if (!profile.is_approved) {
    const isStudentExempt = role === 'STUDENT' && (pathname === '/student/verification-status' || pathname.startsWith('/student/sos'));
    if (!isStudentExempt) {
      if (role === 'STUDENT') {
        return NextResponse.redirect(new URL('/student/verification-status?notice=verification_required', request.url));
      }
      return NextResponse.redirect(new URL('/login?error=pending_approval', request.url));
    }
  }

  // Role Based Access Control Matrix
  const isAdmin = role === 'ADMIN' || isSuperAdmin;
  const isManagement = role === 'HOD' || role === 'PRINCIPAL' || isAdmin;
  const isStaff = role === 'STAFF' || role === 'COUNSELLOR' || role === 'COUNSELOR' || role === 'WOMENS_CELL' || role === 'SECURITY' || role === 'WARDEN' || role === 'MENTOR' || isManagement;

  if (pathname.startsWith('/super-admin') && !isSuperAdmin) {
    return NextResponse.redirect(new URL('/super-admin/login?error=unauthorized', request.url));
  }

  if (pathname.startsWith('/admin') && !isAdmin) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  
  if (pathname.startsWith('/management') && !isManagement) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  if (pathname.startsWith('/staff') && !isStaff) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  if (pathname.startsWith('/student')) {
    if (role !== 'STUDENT') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
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
        return NextResponse.redirect(new URL('/student/verification-status?notice=verification_required', request.url));
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
  matcher: ['/student/:path*', '/staff/:path*', '/admin/:path*', '/management/:path*', '/super-admin/:path*', '/api/protected/:path*'],
};
