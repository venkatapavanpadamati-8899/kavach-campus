import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  canUserApproveRole,
  areDepartmentsEqual,
  normalizeDepartment,
  ApprovalUser,
} from '@/lib/staff-roles';
import { POST as approveUser } from '@/app/api/admin/users/approve/route';
import { GET as getUsers } from '@/app/api/admin/users/route';

// Mock Supabase
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockSupabase),
}));

describe('Hierarchical Institutional Onboarding & Departmental Data Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role_key_long_enough_for_security_validation_2026';
  });

  describe('1. canUserApproveRole Matrix Verification', () => {
    const superAdmin: ApprovalUser = {
      id: 'super-admin-1',
      role: 'SUPER_ADMIN',
      is_approved: true,
      college_id: null,
      department: null,
    };

    const campusAdminSrkr: ApprovalUser = {
      id: 'campus-admin-srkr',
      role: 'CAMPUS_ADMIN',
      is_approved: true,
      college_id: 'srkr-bhimavaram',
      department: 'Administration',
    };

    const principalSrkr: ApprovalUser = {
      id: 'principal-srkr',
      role: 'PRINCIPAL',
      is_approved: true,
      college_id: 'srkr-bhimavaram',
      department: 'Leadership',
    };

    const cseHodSrkr: ApprovalUser = {
      id: 'cse-hod-srkr',
      role: 'HOD',
      is_approved: true,
      college_id: 'srkr-bhimavaram',
      department: 'Computer Science and Engineering',
    };

    const eceHodSrkr: ApprovalUser = {
      id: 'ece-hod-srkr',
      role: 'HOD',
      is_approved: true,
      college_id: 'srkr-bhimavaram',
      department: 'Electronics and Communication Engineering',
    };

    const cseProfessorSrkr: ApprovalUser = {
      id: 'cse-prof-srkr',
      role: 'PROFESSOR',
      is_approved: false,
      college_id: 'srkr-bhimavaram',
      department: 'Computer Science and Engineering',
    };

    const eceProfessorSrkr: ApprovalUser = {
      id: 'ece-prof-srkr',
      role: 'PROFESSOR',
      is_approved: false,
      college_id: 'srkr-bhimavaram',
      department: 'Electronics and Communication Engineering',
    };

    const vishnuCseProf: ApprovalUser = {
      id: 'vishnu-prof-1',
      role: 'PROFESSOR',
      is_approved: false,
      college_id: 'vishnu-bhimavaram',
      department: 'Computer Science and Engineering',
    };

    it('Super Admin can approve Campus Admin, Principal, and Dean across institutions', () => {
      const pendingPrincipal: ApprovalUser = {
        id: 'new-principal',
        role: 'PRINCIPAL',
        college_id: 'srkr-bhimavaram',
        is_approved: false,
      };
      const pendingDean: ApprovalUser = {
        id: 'new-dean',
        role: 'DEAN',
        college_id: 'vishnu-bhimavaram',
        is_approved: false,
      };
      const pendingAdmin: ApprovalUser = {
        id: 'new-admin',
        role: 'CAMPUS_ADMIN',
        college_id: 'srkr-bhimavaram',
        is_approved: false,
      };

      expect(canUserApproveRole(superAdmin, pendingPrincipal).allowed).toBe(true);
      expect(canUserApproveRole(superAdmin, pendingDean).allowed).toBe(true);
      expect(canUserApproveRole(superAdmin, pendingAdmin).allowed).toBe(true);
    });

    it('Campus Admin / Principal CANNOT approve other Institutional Leadership (requires Super Admin)', () => {
      const pendingPrincipal: ApprovalUser = {
        id: 'pending-principal-2',
        role: 'PRINCIPAL',
        college_id: 'srkr-bhimavaram',
        is_approved: false,
      };
      const pendingDean: ApprovalUser = {
        id: 'pending-dean-2',
        role: 'DEAN',
        college_id: 'srkr-bhimavaram',
        is_approved: false,
      };

      const result = canUserApproveRole(campusAdminSrkr, pendingPrincipal);
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('SUPER_ADMIN_REQUIRED_FOR_INSTITUTIONAL_LEADERSHIP');

      const resultDean = canUserApproveRole(principalSrkr, pendingDean);
      expect(resultDean.allowed).toBe(false);
      expect(resultDean.code).toBe('SUPER_ADMIN_REQUIRED_FOR_INSTITUTIONAL_LEADERSHIP');
    });

    it('Campus Admin / Principal can approve HOD belonging to their verified college', () => {
      const pendingHod: ApprovalUser = {
        id: 'new-cse-hod',
        role: 'HOD',
        college_id: 'srkr-bhimavaram',
        department: 'Computer Science and Engineering',
        is_approved: false,
      };

      expect(canUserApproveRole(campusAdminSrkr, pendingHod).allowed).toBe(true);
      expect(canUserApproveRole(principalSrkr, pendingHod).allowed).toBe(true);
    });

    it('HOD cannot approve another HOD', () => {
      const pendingHod: ApprovalUser = {
        id: 'new-mech-hod',
        role: 'HOD',
        college_id: 'srkr-bhimavaram',
        department: 'Mechanical Engineering',
        is_approved: false,
      };

      const result = canUserApproveRole(cseHodSrkr, pendingHod);
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('CAMPUS_ADMIN_OR_PRINCIPAL_REQUIRED');
    });

    it('CSE HOD approves CSE Professor (same college & department)', () => {
      const result = canUserApproveRole(cseHodSrkr, cseProfessorSrkr);
      expect(result.allowed).toBe(true);
    });

    it('ECE HOD approves ECE Professor (same college & department)', () => {
      const result = canUserApproveRole(eceHodSrkr, eceProfessorSrkr);
      expect(result.allowed).toBe(true);
    });

    it('ECE HOD is BLOCKED from approving CSE Professor (cross-department approval forbidden)', () => {
      const result = canUserApproveRole(eceHodSrkr, cseProfessorSrkr);
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('CROSS_DEPARTMENT_APPROVAL_FORBIDDEN');
      expect(result.reason).toContain('CROSS_DEPARTMENT_APPROVAL_FORBIDDEN');
    });

    it('CSE HOD is BLOCKED from approving staff of another college', () => {
      const result = canUserApproveRole(cseHodSrkr, vishnuCseProf);
      expect(result.allowed).toBe(false);
      expect(result.code).toBe('CROSS_COLLEGE_FORBIDDEN');
    });

    it('blocks self-approval and unapproved callers', () => {
      const selfCheck = canUserApproveRole(
        { id: 'user-self', role: 'CAMPUS_ADMIN', college_id: 'srkr-bhimavaram', is_approved: true },
        { id: 'user-self', role: 'CAMPUS_ADMIN', college_id: 'srkr-bhimavaram', is_approved: false }
      );
      expect(selfCheck.allowed).toBe(false);
      expect(selfCheck.code).toBe('SELF_APPROVAL_BLOCKED');

      const unapprovedCallerCheck = canUserApproveRole(
        { id: 'unapproved-hod', role: 'HOD', college_id: 'srkr-bhimavaram', department: 'CSE', is_approved: false },
        cseProfessorSrkr
      );
      expect(unapprovedCallerCheck.allowed).toBe(false);
      expect(unapprovedCallerCheck.code).toBe('CALLER_NOT_APPROVED');
    });

    it('normalizes department abbreviations (CSE vs Computer Science and Engineering)', () => {
      expect(areDepartmentsEqual('CSE', 'Computer Science and Engineering')).toBe(true);
      expect(areDepartmentsEqual('ECE', 'Electronics and Communication Engineering')).toBe(true);
      expect(areDepartmentsEqual('MECH', 'Mechanical Engineering')).toBe(true);
      expect(areDepartmentsEqual('CSE', 'ECE')).toBe(false);
      expect(normalizeDepartment('Computer Science & Engineering')).toBe('cse');
    });
  });

  describe('2. POST /api/admin/users/approve Endpoint Authorization', () => {
    it('allows CSE HOD to approve CSE staff and logs to audit_logs', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'cse-hod-id' } },
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string, val: string) => ({
                single: vi.fn().mockResolvedValue({
                  data: val === 'cse-hod-id'
                    ? { id: 'cse-hod-id', role: 'HOD', is_approved: true, college_id: 'srkr-bhimavaram', department: 'CSE' }
                    : { id: 'target-cse-prof', role: 'ASSISTANT_PROFESSOR', is_approved: false, college_id: 'srkr-bhimavaram', department: 'CSE' },
                  error: null,
                }),
              })),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'audit_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/admin/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: 'target-cse-prof',
          action: 'APPROVE',
          requestedRole: 'ASSISTANT_PROFESSOR',
        }),
      });

      const res = await approveUser(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toBe('User approved successfully');
    });

    it('rejects ECE HOD attempting to approve CSE staff with 403 Forbidden', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'ece-hod-id' } },
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string, val: string) => ({
                single: vi.fn().mockResolvedValue({
                  data: val === 'ece-hod-id'
                    ? { id: 'ece-hod-id', role: 'HOD', is_approved: true, college_id: 'srkr-bhimavaram', department: 'Electronics and Communication Engineering' }
                    : { id: 'target-cse-prof', role: 'PROFESSOR', is_approved: false, college_id: 'srkr-bhimavaram', department: 'Computer Science and Engineering' },
                  error: null,
                }),
              })),
            }),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/admin/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: 'target-cse-prof',
          action: 'APPROVE',
          requestedRole: 'PROFESSOR',
        }),
      });

      const res = await approveUser(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('CROSS_DEPARTMENT_APPROVAL_FORBIDDEN');
    });

    it('blocks Campus Admin from approving Dean (requires Super Admin)', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'campus-admin-id' } },
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string, val: string) => ({
                single: vi.fn().mockResolvedValue({
                  data: val === 'campus-admin-id'
                    ? { id: 'campus-admin-id', role: 'CAMPUS_ADMIN', is_approved: true, college_id: 'srkr-bhimavaram', department: 'Admin' }
                    : { id: 'target-dean-id', role: 'DEAN', is_approved: false, college_id: 'srkr-bhimavaram', department: 'Academics' },
                  error: null,
                }),
              })),
            }),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/admin/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: 'target-dean-id',
          action: 'APPROVE',
          requestedRole: 'DEAN',
        }),
      });

      const res = await approveUser(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('Super Admin approval');
    });
  });

  describe('3. GET /api/admin/users Scoped Departmental Data Listing', () => {
    it('scopes listing strictly to college and department for HOD', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'cse-hod-user' } },
        error: null,
      });

      const eqFilters: Record<string, string> = {};

      const mockQueryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((col: string, val: string) => {
          eqFilters[col] = val;
          return mockQueryBuilder;
        }),
        then: (resolve: any) => resolve({
          data: [
            { id: 'p-1', full_name: 'CSE Staff Member', role: 'PROFESSOR', department: 'Computer Science and Engineering', college_id: 'srkr-bhimavaram' }
          ],
          error: null,
        }),
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'cse-hod-user', role: 'HOD', is_approved: true, college_id: 'srkr-bhimavaram', department: 'Computer Science and Engineering' },
                  error: null,
                }),
              }),
              order: vi.fn().mockReturnValue(mockQueryBuilder),
            }),
          };
        }
        return mockQueryBuilder;
      });

      const req = new Request('http://localhost:3000/api/admin/users');
      const res = await getUsers(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.profiles).toHaveLength(1);
      expect(eqFilters['college_id']).toBe('srkr-bhimavaram');
      expect(eqFilters['department']).toBe('Computer Science and Engineering');
    });

    it('scopes listing strictly to college for Campus Admin (all departments within college)', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'campus-admin-user' } },
        error: null,
      });

      const eqFilters: Record<string, string> = {};

      const mockQueryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((col: string, val: string) => {
          eqFilters[col] = val;
          return mockQueryBuilder;
        }),
        then: (resolve: any) => resolve({
          data: [
            { id: 'p-1', full_name: 'CSE Staff', role: 'PROFESSOR', department: 'CSE', college_id: 'srkr-bhimavaram' },
            { id: 'p-2', full_name: 'ECE Staff', role: 'LECTURER', department: 'ECE', college_id: 'srkr-bhimavaram' },
          ],
          error: null,
        }),
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'campus-admin-user', role: 'CAMPUS_ADMIN', is_approved: true, college_id: 'srkr-bhimavaram', department: 'Admin' },
                  error: null,
                }),
              }),
              order: vi.fn().mockReturnValue(mockQueryBuilder),
            }),
          };
        }
        return mockQueryBuilder;
      });

      const req = new Request('http://localhost:3000/api/admin/users');
      const res = await getUsers(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.profiles).toHaveLength(2);
      expect(eqFilters['college_id']).toBe('srkr-bhimavaram');
      expect(eqFilters['department']).toBeUndefined(); // Campus Admin sees all departments!
    });
  });
});
