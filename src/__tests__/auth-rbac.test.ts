import { describe, it, expect } from 'vitest';
import { getAuthUser, requireAuth, requireRole, requireSameCollege } from '@/lib/auth';
import { NextResponse } from 'next/server';

describe('Authentication and RBAC Helpers (src/lib/auth.ts)', () => {
  describe('getAuthUser', () => {
    it('returns null when headers are completely missing', () => {
      const req = new Request('http://localhost:3000/api/test');
      const user = getAuthUser(req);
      expect(user).toBeNull();
    });

    it('returns null when x-user-id is missing', () => {
      const req = new Request('http://localhost:3000/api/test', {
        headers: {
          'x-user-role': 'STUDENT',
          'x-user-college': 'COLLEGE-01',
        },
      });
      expect(getAuthUser(req)).toBeNull();
    });

    it('returns null when x-user-role is missing', () => {
      const req = new Request('http://localhost:3000/api/test', {
        headers: {
          'x-user-id': 'usr-123',
          'x-user-college': 'COLLEGE-01',
        },
      });
      expect(getAuthUser(req)).toBeNull();
    });

    it('returns null when x-user-college is missing', () => {
      const req = new Request('http://localhost:3000/api/test', {
        headers: {
          'x-user-id': 'usr-123',
          'x-user-role': 'STUDENT',
        },
      });
      expect(getAuthUser(req)).toBeNull();
    });

    it('returns valid AuthUser object when all required headers are present', () => {
      const req = new Request('http://localhost:3000/api/test', {
        headers: {
          'x-user-id': 'usr-123',
          'x-user-role': 'STUDENT',
          'x-user-college': 'COLLEGE-01',
        },
      });
      const user = getAuthUser(req);
      expect(user).toEqual({
        id: 'usr-123',
        role: 'STUDENT',
        collegeId: 'COLLEGE-01',
      });
    });
  });

  describe('requireAuth', () => {
    it('returns 401 Unauthorized NextResponse when unauthenticated', async () => {
      const req = new Request('http://localhost:3000/api/test');
      const result = requireAuth(req);

      expect(result).toBeInstanceOf(NextResponse);
      const res = result as NextResponse;
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json).toEqual({ error: 'Unauthorized' });
    });

    it('returns AuthUser when authenticated', () => {
      const req = new Request('http://localhost:3000/api/test', {
        headers: {
          'x-user-id': 'usr-999',
          'x-user-role': 'STAFF',
          'x-user-college': 'CAMPUS-A',
        },
      });
      const result = requireAuth(req);
      expect(result).toEqual({
        id: 'usr-999',
        role: 'STAFF',
        collegeId: 'CAMPUS-A',
      });
    });
  });

  describe('requireRole', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const req = new Request('http://localhost:3000/api/test');
      const result = requireRole(req, ['ADMIN', 'SECURITY']);

      expect(result).toBeInstanceOf(NextResponse);
      const res = result as NextResponse;
      expect(res.status).toBe(401);
    });

    it('rejects student attempting staff/admin-only action with 403 Forbidden', async () => {
      const req = new Request('http://localhost:3000/api/admin-action', {
        headers: {
          'x-user-id': 'student-01',
          'x-user-role': 'STUDENT',
          'x-user-college': 'CAMPUS-A',
        },
      });
      const result = requireRole(req, ['ADMIN', 'SECURITY', 'STAFF']);

      expect(result).toBeInstanceOf(NextResponse);
      const res = result as NextResponse;
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json).toEqual({ error: 'Forbidden' });
    });

    it('permits authorized roles matching the allowed list', () => {
      const req = new Request('http://localhost:3000/api/staff-action', {
        headers: {
          'x-user-id': 'security-01',
          'x-user-role': 'SECURITY',
          'x-user-college': 'CAMPUS-A',
        },
      });
      const result = requireRole(req, ['ADMIN', 'SECURITY']);

      expect(result).toEqual({
        id: 'security-01',
        role: 'SECURITY',
        collegeId: 'CAMPUS-A',
      });
    });

    it('prevents user-controlled arbitrary roles outside the allowlist', async () => {
      const req = new Request('http://localhost:3000/api/privilege-check', {
        headers: {
          'x-user-id': 'guest-01',
          'x-user-role': 'ATTACKER_INJECTED_ROLE',
          'x-user-college': 'CAMPUS-A',
        },
      });
      const result = requireRole(req, ['ADMIN']);
      expect(result).toBeInstanceOf(NextResponse);
      const res = result as NextResponse;
      expect(res.status).toBe(403);
    });

    it('allows SUPER_ADMIN on high-security administrative actions', () => {
      const req = new Request('http://localhost:3000/api/super-admin/governance', {
        headers: {
          'x-user-id': 'super-admin-01',
          'x-user-role': 'SUPER_ADMIN',
          'x-user-college': 'MAIN-CAMPUS',
        },
      });
      const result = requireRole(req, ['SUPER_ADMIN']);
      expect(result).toEqual({
        id: 'super-admin-01',
        role: 'SUPER_ADMIN',
        collegeId: 'MAIN-CAMPUS',
      });
    });

    it('rejects ordinary ADMIN when SUPER_ADMIN is specifically required', async () => {
      const req = new Request('http://localhost:3000/api/super-admin/root-action', {
        headers: {
          'x-user-id': 'admin-01',
          'x-user-role': 'ADMIN',
          'x-user-college': 'MAIN-CAMPUS',
        },
      });
      const result = requireRole(req, ['SUPER_ADMIN']);
      expect(result).toBeInstanceOf(NextResponse);
      const res = result as NextResponse;
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json).toEqual({ error: 'Forbidden' });
    });

    it('rejects STUDENT attempting to access STAFF or MANAGEMENT routes', async () => {
      const req = new Request('http://localhost:3000/api/staff/cases', {
        headers: {
          'x-user-id': 'student-02',
          'x-user-role': 'STUDENT',
          'x-user-college': 'CAMPUS-A',
        },
      });
      const result = requireRole(req, ['STAFF', 'HOD', 'PRINCIPAL', 'ADMIN']);
      expect(result).toBeInstanceOf(NextResponse);
      const res = result as NextResponse;
      expect(res.status).toBe(403);
    });

    it('denies cross-college access when resource college differs from the requester', async () => {
      const req = new Request('http://localhost:3000/api/college-data', {
        headers: {
          'x-user-id': 'student-03',
          'x-user-role': 'STUDENT',
          'x-user-college': 'srkr-bhimavaram',
        },
      });

      const result = requireSameCollege(req, 'vishnu-bhimavaram');
      expect(result).toBeInstanceOf(NextResponse);
      const res = result as NextResponse;
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json).toEqual({ error: 'Forbidden: cross-college access denied' });
    });

    it('allows same-college access for tenant-scoped resources', () => {
      const req = new Request('http://localhost:3000/api/college-data', {
        headers: {
          'x-user-id': 'student-04',
          'x-user-role': 'STUDENT',
          'x-user-college': 'srkr-bhimavaram',
        },
      });

      const result = requireSameCollege(req, 'srkr-bhimavaram');
      expect(result).toEqual({
        id: 'student-04',
        role: 'STUDENT',
        collegeId: 'srkr-bhimavaram',
      });
    });

    it('permits residential WARDEN and academic MENTOR on staff-authorized endpoints', () => {
      const staffRoles = ['STAFF', 'COUNSELLOR', 'COUNSELOR', 'WOMENS_CELL', 'SECURITY', 'MENTOR', 'WARDEN'];
      const wardenReq = new Request('http://localhost:3000/api/staff/incidents', {
        headers: {
          'x-user-id': 'warden-01',
          'x-user-role': 'WARDEN',
          'x-user-college': 'srkr-bhimavaram',
        },
      });
      const wardenResult = requireRole(wardenReq, staffRoles);
      expect(wardenResult).toEqual({
        id: 'warden-01',
        role: 'WARDEN',
        collegeId: 'srkr-bhimavaram',
      });

      const mentorReq = new Request('http://localhost:3000/api/staff/incidents', {
        headers: {
          'x-user-id': 'mentor-01',
          'x-user-role': 'MENTOR',
          'x-user-college': 'srkr-bhimavaram',
        },
      });
      const mentorResult = requireRole(mentorReq, staffRoles);
      expect(mentorResult).toEqual({
        id: 'mentor-01',
        role: 'MENTOR',
        collegeId: 'srkr-bhimavaram',
      });
    });
  });
});

