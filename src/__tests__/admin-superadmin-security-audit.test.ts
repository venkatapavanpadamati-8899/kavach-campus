import { describe, it, expect, vi, beforeEach } from 'vitest';
import proxy from '@/proxy';
import { NextRequest } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

// Mock @supabase/ssr for proxy testing
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

describe('Admin & Super Admin Security Audit Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-test-db.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key-123456789012345678901234567890';
  });

  describe('1. Static Code Analysis: No Hardcoded Credentials or Bypass Buttons', () => {
    it('verifies that login/page.tsx contains no hardcoded passwords, emails, or 1-click bypass buttons', () => {
      const loginCode = fs.readFileSync(path.join(process.cwd(), 'src/app/login/page.tsx'), 'utf8');
      expect(loginCode).not.toContain('Pavan@123');
      expect(loginCode).not.toContain('handleDirectLogin');
      expect(loginCode).not.toContain('btn-direct-admin-login');
      expect(loginCode).not.toContain('btn-direct-superadmin-login-main');
      expect(loginCode).not.toContain('venkatapavanpadamati@gmail.com');
      expect(loginCode).not.toContain('venkatapavanpadamati1@gmail.com');
    });

    it('verifies that super-admin/login/page.tsx contains no hardcoded passwords, emails, or 1-click bypass buttons', () => {
      const superAdminCode = fs.readFileSync(path.join(process.cwd(), 'src/app/super-admin/login/page.tsx'), 'utf8');
      expect(superAdminCode).not.toContain('Pavan@123');
      expect(superAdminCode).not.toContain('handleDirectSuperAdminLogin');
      expect(superAdminCode).not.toContain('btn-direct-superadmin-login');
      expect(superAdminCode).not.toContain('venkatapavanpadamati1@gmail.com');
      expect(superAdminCode).not.toContain('Direct Root Access');
    });
  });

  describe('2. Edge Proxy Server-Side RBAC Enforcement', () => {
    it('redirects unauthenticated visitor from /super-admin to /super-admin/login', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });

      const req = new NextRequest('https://kavach-campus.vercel.app/super-admin');
      const response = await proxy(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/super-admin/login');
    });

    it('redirects unauthenticated visitor from /admin to /login', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });

      const req = new NextRequest('https://kavach-campus.vercel.app/admin');
      const response = await proxy(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/login');
    });

    it('blocks normal campus ADMIN from accessing /super-admin and redirects to /super-admin/login?error=unauthorized', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'admin-user-01' } } });
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValueOnce({
              data: { role: 'ADMIN', is_approved: true, college_id: 'COLLEGE-01' },
            }),
          })),
        })),
      });

      const req = new NextRequest('https://kavach-campus.vercel.app/super-admin');
      const response = await proxy(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/super-admin/login?error=unauthorized');
    });

    it('blocks normal campus ADMIN from accessing /super-admin/pending-campus', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'admin-user-01' } } });
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValueOnce({
              data: { role: 'ADMIN', is_approved: true, college_id: 'COLLEGE-01' },
            }),
          })),
        })),
      });

      const req = new NextRequest('https://kavach-campus.vercel.app/super-admin/pending-campus');
      const response = await proxy(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/super-admin/login?error=unauthorized');
    });

    it('allows normal campus ADMIN to access /admin routes with authenticated identity headers', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'admin-user-01' } } });
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValueOnce({
              data: { role: 'ADMIN', is_approved: true, college_id: 'COLLEGE-01' },
            }),
          })),
        })),
      });

      const req = new NextRequest('https://kavach-campus.vercel.app/admin');
      const response = await proxy(req);

      expect(response.status).toBe(200);
      expect(response.headers.get('x-user-id')).toBe('admin-user-01');
      expect(response.headers.get('x-user-role')).toBe('ADMIN');
      expect(response.headers.get('x-user-college')).toBe('COLLEGE-01');
    });

    it('blocks STUDENT from accessing /admin and redirects to /unauthorized', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'student-user-01' } } });
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValueOnce({
              data: { role: 'STUDENT', is_approved: true, college_id: 'COLLEGE-01' },
            }),
          })),
        })),
      });

      const req = new NextRequest('https://kavach-campus.vercel.app/admin');
      const response = await proxy(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/unauthorized');
    });

    it('allows SUPER_ADMIN to access /super-admin with verified identity headers', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'super-admin-01' } } });
      mockFrom.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValueOnce({
              data: { role: 'SUPER_ADMIN', is_approved: true, college_id: null },
            }),
          })),
        })),
      });

      const req = new NextRequest('https://kavach-campus.vercel.app/super-admin');
      const response = await proxy(req);

      expect(response.status).toBe(200);
      expect(response.headers.get('x-user-id')).toBe('super-admin-01');
      expect(response.headers.get('x-user-role')).toBe('SUPER_ADMIN');
    });
  });
});
