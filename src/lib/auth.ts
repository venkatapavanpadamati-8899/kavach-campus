import { NextResponse } from 'next/server';

export interface AuthUser {
  id: string;
  role: string;
  collegeId: string;
}

export function getAuthUser(req: Request): AuthUser | null {
  const id = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');
  const collegeId = req.headers.get('x-user-college');

  if (!id || !role || !collegeId) {
    return null;
  }

  return { id, role, collegeId };
}

export function requireAuth(req: Request) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return user;
}

export function requireRole(req: Request, allowedRoles: string[]) {
  const user = requireAuth(req);
  if (user instanceof NextResponse) {
    return user; // Return the 401 response
  }

  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return user;
}

export function normalizeCollegeId(collegeId?: string | null): string | null {
  if (typeof collegeId !== 'string') {
    return null;
  }

  const trimmed = collegeId.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
}

export function requireSameCollege(req: Request, resourceCollegeId?: string | null) {
  const user = requireAuth(req);
  if (user instanceof NextResponse) {
    return user;
  }

  if ((user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && user.collegeId) {
    return user;
  }

  const requestCollege = normalizeCollegeId(user.collegeId);
  const resourceCollege = normalizeCollegeId(resourceCollegeId);

  if (!resourceCollege || !requestCollege) {
    return user;
  }

  if (requestCollege !== resourceCollege) {
    return NextResponse.json({ error: 'Forbidden: cross-college access denied' }, { status: 403 });
  }

  return user;
}
