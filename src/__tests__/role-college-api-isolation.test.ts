import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getIncidents } from '@/app/api/incidents/route';
import { POST as escalateIncident } from '@/app/api/incidents/[id]/escalate/route';
import { GET as getIncidentEvidence, POST as uploadIncidentEvidence } from '@/app/api/incidents/[id]/evidence/route';

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

vi.mock('@/lib/notifications', () => ({
  insertInAppNotification: vi.fn(() => Promise.resolve()),
}));

describe('Live API Route Integration: Role-Based College Isolation & Security Boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. GET /api/incidents — Multi-Tenant College Scoping', () => {
    it('scopes incident listing strictly to caller college_id for College Management (HOD / Principal)', async () => {
      const srkrHodUser = { id: 'usr-srkr-hod-1' };
      mockGetUser.mockResolvedValueOnce({ data: { user: srkrHodUser }, error: null });

      const eqFilters: Record<string, string> = {};

      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((col: string, val: string) => {
          eqFilters[col] = val;
          return queryBuilder;
        }),
        single: vi.fn(),
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'HOD', college_id: 'srkr-bhimavaram' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'incidents') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockImplementation(() => ({
                  eq: vi.fn().mockImplementation((col: string, val: string) => {
                    eqFilters[col] = val;
                    return Promise.resolve({
                      data: [
                        { id: 'inc-1', case_id: 'KC-SRKR-01', college_id: 'srkr-bhimavaram', is_anonymous: false },
                      ],
                      error: null,
                    });
                  }),
                })),
              }),
            }),
          };
        }
        return queryBuilder;
      });

      const res = await getIncidents();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.incidents).toHaveLength(1);
      expect(eqFilters['college_id']).toBe('srkr-bhimavaram');
    });

    it('allows SUPER_ADMIN to query platform-wide without mandatory college_id scoping', async () => {
      const superAdminUser = { id: 'usr-super-admin-root' };
      mockGetUser.mockResolvedValueOnce({ data: { user: superAdminUser }, error: null });

      const eqFilters: Record<string, string> = {};

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'SUPER_ADMIN', college_id: null },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'incidents') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [
                    { id: 'inc-1', case_id: 'KC-SRKR-01', college_id: 'srkr-bhimavaram' },
                    { id: 'inc-2', case_id: 'KC-VIT-01', college_id: 'vit-bhimavaram' },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const res = await getIncidents();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.incidents).toHaveLength(2);
      expect(eqFilters['college_id']).toBeUndefined();
    });
  });

  describe('2. POST /api/incidents/[id]/escalate — Cross-Campus Escalation Prevention', () => {
    it('returns 403 Forbidden when a staff member attempts to escalate an incident belonging to another campus', async () => {
      const vishnuStaffUser = { id: 'usr-vit-staff-007' };
      mockGetUser.mockResolvedValueOnce({ data: { user: vishnuStaffUser }, error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: vishnuStaffUser.id, role: 'STAFF', full_name: 'Vishnu Officer', college_id: 'vit-bhimavaram' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'incidents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'inc-srkr-999', case_id: 'KC-SRKR-999', status: 'RECEIVED', category: 'HARASSMENT', severity: 'HIGH', college_id: 'srkr-bhimavaram' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents/inc-srkr-999/escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Escalating across college boundary unauthorized' }),
      });

      const res = await escalateIncident(req, { params: Promise.resolve({ id: 'inc-srkr-999' }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/Cannot escalate incidents belonging to another campus/i);
    });
  });

  describe('3. GET & POST /api/incidents/[id]/evidence — Cross-Campus Evidence Isolation', () => {
    it('rejects GET evidence requests from staff of a different campus with 403 Forbidden', async () => {
      const vishnuStaff = { id: 'usr-vit-guard-1' };
      mockGetUser.mockResolvedValueOnce({ data: { user: vishnuStaff }, error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'inc-srkr-1', case_id: 'KC-SRKR-1', student_id: 'student-srkr-1', assigned_to: null, college_id: 'srkr-bhimavaram' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'SECURITY', college_id: 'vit-bhimavaram' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents/inc-srkr-1/evidence');
      const res = await getIncidentEvidence(req, { params: Promise.resolve({ id: 'inc-srkr-1' }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/You are not authorized to access evidence from another campus/i);
    });

    it('rejects POST evidence uploads from staff of a different campus with 403 Forbidden', async () => {
      const vishnuStaff = { id: 'usr-vit-guard-1' };
      mockGetUser.mockResolvedValueOnce({ data: { user: vishnuStaff }, error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'inc-srkr-1', case_id: 'KC-SRKR-1', student_id: 'student-srkr-1', assigned_to: null, college_id: 'srkr-bhimavaram' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'SECURITY', college_id: 'vit-bhimavaram' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const formData = new FormData();
      formData.set('file', new File(['test evidence content'], 'cross_campus.png', { type: 'image/png' }));

      const req = new Request('http://localhost:3000/api/incidents/inc-srkr-1/evidence', {
        method: 'POST',
        body: formData,
      });

      const res = await uploadIncidentEvidence(req, { params: Promise.resolve({ id: 'inc-srkr-1' }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/You are not authorized to upload evidence to another campus incident/i);
    });
  });
});

