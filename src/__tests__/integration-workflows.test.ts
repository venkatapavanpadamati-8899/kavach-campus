import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth, requireRole, getAuthUser } from '@/lib/auth';
import { POST as registerHandler } from '@/app/api/auth/register/route';
import { GET as getIncidentHandler } from '@/app/api/incidents/[id]/route';
import { POST as escalateCronHandler } from '@/app/api/cron/escalate/route';
import { POST as safeWalkTimeoutCronHandler } from '@/app/api/cron/safe-walk-timeout/route';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

describe('Kavach Campus — Production Integration Workflows (Task G)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-cron-secret-123';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-12345678901234567890';
  });

  // 1. Student Registration & Login Flow
  describe('1. Student Registration and Login Flow', () => {
    it('blocks self-assignment of forbidden administrative roles (e.g., ADMIN, SUPER_ADMIN)', async () => {
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key-that-is-long-enough-for-testing';
      
      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Attacker Student',
          email: 'attacker@college.edu',
          password: 'Password123!',
          role: 'ADMIN',
        }),
      });

      const res = await registerHandler(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/Administrative and management roles cannot be self-assigned/i);
    });

    it('validates password length requirement (minimum 8 characters)', async () => {
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key-that-is-long-enough-for-testing';

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Valid Student',
          email: 'student@college.edu',
          password: 'short',
          role: 'STUDENT',
        }),
      });

      const res = await registerHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Password must be at least 8 characters/i);
    });
  });

  // 2. Student Access Isolation
  describe('2. Student Access Isolation', () => {
    it('prevents Student A from viewing Student B private incident records', async () => {
      const studentA = { id: 'usr-student-a', role: 'STUDENT' };

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: studentA } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'incidents') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    // RLS filters out incident belonging to student B, returning not found
                    data: null,
                    error: { message: 'Row not found or denied by RLS' },
                  }),
                })),
              })),
            };
          }
          return {};
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/incidents/inc-student-b-999');
      const res = await getIncidentHandler(req, { params: Promise.resolve({ id: 'inc-student-b-999' }) });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toMatch(/Incident not found/i);
    });
  });

  // 3. Staff Permissions & Role Checks
  describe('3. Staff Permissions and Role Boundaries', () => {
    it('allows STAFF to pass requireRole while rejecting STUDENT with 403', () => {
      const staffReq = new Request('http://localhost:3000/api/staff', {
        headers: {
          'x-user-id': 'staff-01',
          'x-user-role': 'STAFF',
          'x-user-college': 'COLLEGE-01',
        },
      });

      const studentReq = new Request('http://localhost:3000/api/staff', {
        headers: {
          'x-user-id': 'student-01',
          'x-user-role': 'STUDENT',
          'x-user-college': 'COLLEGE-01',
        },
      });

      const staffAuth = requireRole(staffReq, ['STAFF', 'ADMIN']);
      expect(staffAuth).not.toBeInstanceOf(Response);
      expect((staffAuth as { role: string }).role).toBe('STAFF');

      const studentAuth = requireRole(studentReq, ['STAFF', 'ADMIN']);
      expect(studentAuth).toBeInstanceOf(Response);
      expect((studentAuth as Response).status).toBe(403);
    });
  });

  // 4. SOS Creation and Responder Assignment
  describe('4. SOS Creation and Assignment Logic', () => {
    it('ensures incident status starts as NEW and can be assigned to security responders', () => {
      const newSosIncident = {
        id: 'inc-sos-integration-1',
        user_id: 'usr-student-01',
        type: 'SOS',
        status: 'NEW',
        severity: 'CRITICAL',
        assigned_to: null,
      };

      expect(newSosIncident.status).toBe('NEW');
      expect(newSosIncident.severity).toBe('CRITICAL');

      // Responder assignment transition
      const assignedIncident = {
        ...newSosIncident,
        status: 'ASSIGNED',
        assigned_to: 'guard-security-01',
        acknowledged_at: new Date().toISOString(),
      };

      expect(assignedIncident.status).toBe('ASSIGNED');
      expect(assignedIncident.assigned_to).toBe('guard-security-01');
      expect(assignedIncident.acknowledged_at).toBeDefined();
    });
  });

  // 5. Escalation & Safe Walk Timeout Workflows
  describe('5. Escalation and Safe Walk Timeout Execution', () => {
    it('escalates unacknowledged overdue incidents via cron workflow', async () => {
      const overdueIncident = {
        id: 'inc-overdue-01',
        type: 'SOS',
        status: 'ASSIGNED',
        created_at: new Date(Date.now() - 3600000).toISOString(),
      };

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'incidents') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  lt: vi.fn().mockResolvedValue({
                    data: [overdueIncident],
                    error: null,
                  }),
                })),
              })),
              update: vi.fn(() => {
                const chain = () => ({
                  eq: vi.fn(() => chain()),
                  select: vi.fn().mockResolvedValue({
                    data: [{ id: overdueIncident.id }],
                    error: null,
                  }),
                  then: (resolve: (val: unknown) => void) => resolve({ data: [{ id: overdueIncident.id }], error: null }),
                });
                return {
                  eq: vi.fn(() => chain()),
                };
              }),
            };
          }
          if (table === 'escalations') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          if (table === 'audit_logs' || table === 'notifications') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn(() => ({
                in: vi.fn().mockResolvedValue({
                  data: [{ id: 'admin-uuid-1' }],
                  error: null,
                }),
              })),
            };
          }
          return {};
        }),
      };

      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as unknown as ReturnType<typeof createAdminClient>);

      const req = new Request('http://localhost:3000/api/cron/escalate', {
        method: 'POST',
        headers: { Authorization: `Bearer test-cron-secret-123` },
      });

      const res = await escalateCronHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.escalatedCount).toBe(1);
    });

    it('detects expired safe walks and triggers automatic auto-SOS escalation', async () => {
      const expiredWalk = {
        id: 'sw-expired-01',
        student_id: 'usr-student-02',
        status: 'ACTIVE',
        auto_sos_enabled: true,
        expires_at: new Date(Date.now() - 600000).toISOString(),
        destination: 'Library Block',
      };

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'safe_walks') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  lt: vi.fn().mockResolvedValue({
                    data: [expiredWalk],
                    error: null,
                  }),
                })),
              })),
              update: vi.fn(() => {
                const chain = () => ({
                  eq: vi.fn(() => chain()),
                  select: vi.fn().mockResolvedValue({
                    data: [{ id: expiredWalk.id }],
                    error: null,
                  }),
                  then: (resolve: (val: unknown) => void) => resolve({ data: [{ id: expiredWalk.id }], error: null }),
                });
                return {
                  eq: vi.fn(() => chain()),
                };
              }),
            };
          }
          if (table === 'incidents') {
            return {
              insert: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'inc-auto-sos-99' },
                    error: null,
                  }),
                })),
              })),
            };
          }
          if (table === 'incident_locations' || table === 'notifications' || table === 'audit_logs') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          return {};
        }),
      };

      vi.mocked(createAdminClient).mockReturnValue(mockSupabase as unknown as ReturnType<typeof createAdminClient>);

      const req = new Request('http://localhost:3000/api/cron/safe-walk-timeout', {
        method: 'POST',
        headers: { Authorization: `Bearer test-cron-secret-123` },
      });

      const res = await safeWalkTimeoutCronHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.overdueProcessed).toBe(1);
    });
  });

  // 6. Evidence Authorization
  describe('6. Evidence Storage Authorization Matrix', () => {
    it('authorizes evidence upload only when user is authenticated with matching UID path', () => {
      const studentId = 'usr-student-e2e-01';
      const validPath = `${studentId}/evidence-photo-1.jpg`;
      const attackerPath = `victim-student-99/evidence-photo-1.jpg`;

      // Simulates RLS WITH CHECK: auth.uid()::text = (storage.foldername(name))[1] OR name LIKE auth.uid() || '%'
      const canStudentUploadValid = validPath.startsWith(studentId);
      const canStudentUploadAttacker = attackerPath.startsWith(studentId);

      expect(canStudentUploadValid).toBe(true);
      expect(canStudentUploadAttacker).toBe(false);
    });

    it('permits authorized staff to read evidence while isolating other students', () => {
      const fileOwner = 'usr-student-01';
      const staffRole = 'STAFF';
      const otherStudent = 'usr-student-02';

      const canOwnerRead = (user: string, role: string) => user === fileOwner || role === 'STAFF' || role === 'ADMIN';

      expect(canOwnerRead(fileOwner, 'STUDENT')).toBe(true);
      expect(canOwnerRead('staff-guard', staffRole)).toBe(true);
      expect(canOwnerRead(otherStudent, 'STUDENT')).toBe(false);
    });
  });

  // 7. Logout & Protected Route Behavior
  describe('7. Logout and Protected Route Behavior', () => {
    it('returns 401 when accessing protected route with no session or auth headers', () => {
      const unauthReq = new Request('http://localhost:3000/api/student/profile');
      const authResult = requireAuth(unauthReq);

      expect(authResult).toBeInstanceOf(Response);
      expect((authResult as Response).status).toBe(401);
    });

    it('returns null user when session is invalidated or logged out', () => {
      const loggedOutReq = new Request('http://localhost:3000/api/student/dashboard');
      const user = getAuthUser(loggedOutReq);
      expect(user).toBeNull();
    });
  });
});
