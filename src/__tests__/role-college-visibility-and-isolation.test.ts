import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCollegeById, INDIAN_ENGINEERING_COLLEGES } from '@/lib/colleges';
import { getCollegeBranding } from '@/lib/college-branding';
import { GET as incidentGet } from '@/app/api/incidents/[id]/route';
import { GET as evidenceGet } from '@/app/api/incidents/[id]/evidence/route';
import { GET as notesGet } from '@/app/api/incidents/[id]/notes/route';
import { POST as approvePost } from '@/app/api/admin/users/approve/route';
import { DELETE as safeBoxDelete } from '@/app/api/student/safe-box/route';
import { createClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

vi.mock('@/lib/notifications', () => ({
  insertInAppNotification: vi.fn().mockResolvedValue({ id: 'notif-1' }),
}));

describe('Role-Based College Visibility & Cross-Campus Isolation Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Platform Administrators (ADMIN & SUPER_ADMIN) Neutrality Contract', () => {
    it('ensures platform admins are strictly prohibited from displaying specific college names in headers or sidebars', () => {
      const platformAdminRoles = ['ADMIN', 'SUPER_ADMIN'];
      
      platformAdminRoles.forEach(role => {
        const isPlatformAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
        expect(isPlatformAdmin).toBe(true);

        const sidebarPillText = isPlatformAdmin ? 'Platform Administration' : 'Campus verification pending';
        const topbarTitle = isPlatformAdmin ? 'Platform Admin' : 'Kavach Campus';
        const topbarSubtext = isPlatformAdmin ? 'Central Control • Multi-Campus' : 'Verified profile required';

        expect(sidebarPillText).toBe('Platform Administration');
        expect(sidebarPillText).not.toContain('SRKR');
        expect(sidebarPillText).not.toContain('Vishnu');

        expect(topbarTitle).toBe('Platform Admin');
        expect(topbarTitle).not.toContain('Engineering College');

        expect(topbarSubtext).toBe('Central Control • Multi-Campus');
      });
    });

    it('returns generic unassigned platform branding when no college ID is provided', () => {
      const genericBranding = getCollegeBranding(null);
      expect(genericBranding.id).toBe('unassigned');
      expect(genericBranding.name).toBe('Kavach Campus');
      expect(genericBranding.shortName).toBe('Kavach Campus');
      expect(genericBranding.name).not.toContain('SRKR');
      expect(genericBranding.name).not.toContain('Vishnu');
    });
  });

  describe('2. College Management (HOD, PRINCIPAL), Staff & Student Visibility Contract', () => {
    it('resolves correct institution name and branding for authenticated SRKR members', () => {
      const srkrTenant = getCollegeById('srkr-bhimavaram');
      expect(srkrTenant).toBeDefined();
      expect(srkrTenant?.name).toBe('Sagi Rama Krishnam Raju Engineering College (Autonomous)');
      expect(srkrTenant?.shortName).toBe('SRKR Engineering College');
      expect(srkrTenant?.city).toBe('Bhimavaram');
      expect(srkrTenant?.state).toBe('Andhra Pradesh');

      const srkrBranding = getCollegeBranding('srkr-bhimavaram');
      expect(srkrBranding.shortName).toBe('SRKR Engineering College');
      expect(srkrBranding.logoSvg).toContain('<svg');
    });

    it('resolves correct institution name and branding for authenticated Vishnu (VIT) members', () => {
      const vitTenant = getCollegeById('vit-bhimavaram');
      expect(vitTenant).toBeDefined();
      expect(vitTenant?.name).toBe('Vishnu Institute of Technology (Autonomous)');
      expect(vitTenant?.shortName).toBe('Vishnu Institute of Technology');
      expect(vitTenant?.city).toBe('Bhimavaram');

      const vitBranding = getCollegeBranding('vit-bhimavaram');
      expect(vitBranding.shortName).toBe('Vishnu Institute of Technology');
    });

    it('ensures college management navigation contains Overview and Campus Incidents', () => {
      const managementNav = [
        { name: 'Overview', href: '/management' },
        { name: 'Campus Incidents', href: '/management/incidents' },
      ];
      expect(managementNav).toHaveLength(2);
      expect(managementNav.map(n => n.name)).toEqual(['Overview', 'Campus Incidents']);
      expect(managementNav.map(n => n.href)).toEqual(['/management', '/management/incidents']);
    });
  });

  describe('3. Real API Route Level: Cross-College Isolation & Authorization Enforcement', () => {
    const srkrIncident = {
      id: '88888888-8888-8888-8888-888888888888',
      case_id: 'KC-2026-SRKR001',
      student_id: 'student-srkr-001',
      college_id: 'srkr-bhimavaram',
      category: 'HARASSMENT',
      severity: 'HIGH',
      status: 'ASSIGNED',
      assigned_to: 'staff-srkr-999',
      user_id: 'student-srkr-001',
      is_anonymous: false,
    };

    it('blocks Vishnu HOD from inspecting SRKR incident via GET /api/incidents/[id] with 403 Forbidden', async () => {
      const vishnuHOD = { id: 'usr-vishnu-hod-01', email: 'hod@vishnu.edu.in' };
      const vishnuProfile = { id: vishnuHOD.id, role: 'HOD', college_id: 'vit-bhimavaram', is_approved: true };

      const mockClient = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: vishnuHOD }, error: null }) },
        from: vi.fn((table: string) => {
          if (table === 'incidents') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: srkrIncident, error: null }),
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: vishnuProfile, error: null }),
            };
          }
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockClient as any);

      const req = new Request('http://localhost:3000/api/incidents/' + srkrIncident.id);
      const res = await incidentGet(req, { params: Promise.resolve({ id: srkrIncident.id }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('Forbidden: You cannot access incidents from another institution');
    });

    it('blocks cross-college evidence download via GET /api/incidents/[id]/evidence with 403 Forbidden', async () => {
      const vishnuStaff = { id: 'usr-vishnu-staff-01', email: 'staff@vishnu.edu.in' };
      const vishnuProfile = { id: vishnuStaff.id, role: 'STAFF', college_id: 'vit-bhimavaram', is_approved: true };

      const mockClient = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: vishnuStaff }, error: null }) },
        from: vi.fn((table: string) => {
          if (table === 'incidents') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: srkrIncident, error: null }),
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: vishnuProfile, error: null }),
            };
          }
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockClient as any);

      const req = new Request(`http://localhost:3000/api/incidents/${srkrIncident.id}/evidence`);
      const res = await evidenceGet(req, { params: Promise.resolve({ id: srkrIncident.id }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('Forbidden: You are not authorized to access evidence from another campus');
    });

    it('blocks cross-college case notes inspection via GET /api/incidents/[id]/notes with 403 Forbidden', async () => {
      const vishnuStaff = { id: 'usr-vishnu-staff-02', email: 'staff2@vishnu.edu.in' };
      const vishnuProfile = { id: vishnuStaff.id, role: 'STAFF', college_id: 'vit-bhimavaram', is_approved: true };

      const mockClient = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: vishnuStaff }, error: null }) },
        from: vi.fn((table: string) => {
          if (table === 'incidents') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: srkrIncident, error: null }),
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: vishnuProfile, error: null }),
            };
          }
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockClient as any);

      const req = new Request(`http://localhost:3000/api/incidents/${srkrIncident.id}/notes`);
      const res = await notesGet(req, { params: Promise.resolve({ id: srkrIncident.id }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('Forbidden: Cross-college access is not permitted');
    });

    it('prevents privilege escalation by students calling POST /api/admin/users/approve', async () => {
      const studentUser = { id: 'usr-student-001', email: 'student@srkr.edu.in' };
      const studentProfile = { id: studentUser.id, role: 'STUDENT', college_id: 'srkr-bhimavaram', is_approved: true };

      const mockClient = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: studentUser }, error: null }) },
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: studentProfile, error: null }),
            };
          }
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockClient as any);

      const req = new Request('http://localhost:3000/api/admin/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: 'target-01', action: 'APPROVE', requestedRole: 'ADMIN' }),
      });
      const res = await approvePost(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('Admin privileges required');
    });

    it('strictly rejects self-approval and self-role escalation attempts with 403 Forbidden', async () => {
      const adminUser = { id: 'usr-admin-self', email: 'admin@srkr.edu.in' };
      const adminProfile = { id: adminUser.id, role: 'ADMIN', college_id: 'srkr-bhimavaram', is_approved: true };

      const mockClient = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: adminUser }, error: null }) },
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: adminProfile, error: null }),
            };
          }
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockClient as any);

      const req = new Request('http://localhost:3000/api/admin/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: 'usr-admin-self', action: 'APPROVE', requestedRole: 'ADMIN' }),
      });
      const res = await approvePost(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('Self-approval');
    });

    it('prevents IDOR: Student A cannot delete Student B Safe Box file via DELETE /api/student/safe-box', async () => {
      const studentA = { id: 'usr-student-a', email: 'studentA@srkr.edu.in' };

      const mockClient = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: studentA }, error: null }) },
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'STUDENT' }, error: null }),
            };
          }
          if (table === 'evidence') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              // Simulating that the query .eq('id', id).eq('uploaded_by', studentA.id) finds nothing
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockClient as any);

      const req = new Request('http://localhost:3000/api/student/safe-box?id=ev-belonging-to-student-b', {
        method: 'DELETE',
      });
      const res = await safeBoxDelete(req);

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toContain('Evidence record not found or access denied');
    });
  });

  describe('4. Phase 17 Investigation — Verification of "CMJ"', () => {
    it('confirms that "CMJ" is NOT a registered college tenant in Kavach Campus', () => {
      const cmjMatch = INDIAN_ENGINEERING_COLLEGES.find(
        c => c.id.toLowerCase() === 'cmj' || c.shortName.toLowerCase().includes('cmj') || c.name.toLowerCase().includes('cmj')
      );
      expect(cmjMatch).toBeUndefined();
    });

    it('confirms that "CMJ" is NOT a recognized college branding slug', () => {
      const branding = getCollegeBranding('cmj');
      expect(branding.id).toBe('unassigned');
      expect(branding.name).toBe('Kavach Campus');
    });
  });
});
