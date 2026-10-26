import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getIncident, PATCH as patchIncident } from '@/app/api/incidents/[id]/route';
import { GET as getNearbyStaff } from '@/app/api/incidents/[id]/nearby-staff/route';
import { POST as approveUser } from '@/app/api/admin/users/approve/route';
import { POST as postAdminVerification } from '@/app/api/admin/verifications/route';
import { POST as registerUser } from '@/app/api/auth/register/route';
import { POST as handleSos } from '@/app/api/sos/route';
import { POST as startSafeWalk } from '@/app/api/safe-walk/start/route';
import { POST as handleEscalateCron } from '@/app/api/cron/escalate/route';
import { POST as handleSafeWalkTimeoutCron } from '@/app/api/cron/safe-walk-timeout/route';

// Mock Supabase Server Client
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

// Mock Supabase Admin Client
const mockAdminFrom = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}));

describe('STEP 81: Authenticated Security & Access Control Verification Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // 1. Cross-Student Isolation (Student A vs Student B)
  // ===========================================================================
  describe('Student-to-Student Isolation', () => {
    it('returns 403 when Student A attempts to inspect Student B incident details', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'student-A-id' } } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'student-A-id', role: 'STUDENT', is_approved: true },
                }),
              })),
            })),
          };
        }
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'incident-B-id',
                    case_id: 'KC-2026-99999',
                    student_id: 'student-B-id', // Belongs to Student B!
                    assigned_to: 'staff-responder-1',
                    category: 'HARASSMENT',
                    severity: 'HIGH',
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents/incident-B-id');
      const res = await getIncident(req, { params: Promise.resolve({ id: 'incident-B-id' }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/Forbidden/i);
    });

    it('permits Student A to inspect their own incident details', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'student-A-id' } } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'student-A-id', role: 'STUDENT', is_approved: true },
                }),
              })),
            })),
          };
        }
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'incident-A-id',
                    case_id: 'KC-2026-11111',
                    student_id: 'student-A-id', // Belongs to Student A
                    assigned_to: 'staff-responder-1',
                    latitude: 17.385044,
                    longitude: 78.486671,
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'student_profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { verification_status: 'VERIFIED' } }),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents/incident-A-id');
      const res = await getIncident(req, { params: Promise.resolve({ id: 'incident-A-id' }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.incident.student_id).toBe('student-A-id');
      // Student sees their own coordinates
      expect(json.incident.latitude).toBe(17.385044);
    });

    it('fails closed when caller role lookup fails', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'staff-id' } } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Profile lookup failed' },
                }),
              })),
            })),
          };
        }
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'private-incident',
                    student_id: 'student-owner',
                    assigned_to: 'another-staff',
                    description: 'Private incident details',
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents/private-incident');
      const res = await getIncident(req, { params: Promise.resolve({ id: 'private-incident' }) });

      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: 'Unable to verify account permissions' });
    });
  });

  // ===========================================================================
  // 2. Unassigned Staff Case Isolation & Student GPS Masking
  // ===========================================================================
  describe('Unassigned Staff Isolation & Privacy Masking', () => {
    it('returns 403 when Staff X tries to inspect a case assigned to Staff Y', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'staff-X-id' } } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'staff-X-id', role: 'STAFF', is_approved: true },
                }),
              })),
            })),
          };
        }
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'inc-assigned-to-Y',
                    student_id: 'student-123',
                    assigned_to: 'staff-Y-id', // Assigned to another staff member!
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents/inc-assigned-to-Y');
      const res = await getIncident(req, { params: Promise.resolve({ id: 'inc-assigned-to-Y' }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/Forbidden/i);
    });

    it('masks student GPS for general staff reviewing an unassigned intake case', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'intake-staff-id' } } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'intake-staff-id', role: 'STAFF', is_approved: true },
                }),
              })),
            })),
          };
        }
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'inc-unassigned',
                    student_id: 'student-owner-1',
                    assigned_to: null, // Unassigned intake
                    latitude: 17.385044,
                    longitude: 78.486671,
                    location_accuracy: 8,
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'student_profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { verification_status: 'VERIFIED' } }),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents/inc-unassigned');
      const res = await getIncident(req, { params: Promise.resolve({ id: 'inc-unassigned' }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      // Privacy invariant: Student coordinates MUST be null
      expect(json.incident.latitude).toBeNull();
      expect(json.incident.longitude).toBeNull();
      expect(json.incident.location_accuracy).toBeNull();
      expect(json.studentSummary).toBeNull();
    });

    it('returns 403 when unassigned staff attempts to query nearby staff for a case assigned to another responder', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'unassigned-staff-id' } } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'unassigned-staff-id', role: 'STAFF', is_approved: true },
                }),
              })),
            })),
          };
        }
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'inc-other-case',
                    assigned_to: 'other-responder-99',
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents/inc-other-case/nearby-staff');
      const res = await getNearbyStaff(req, { params: Promise.resolve({ id: 'inc-other-case' }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/Forbidden/i);
    });
  });

  // ===========================================================================
  // 3. Role Escalation Prevention
  // ===========================================================================
  describe('Role Escalation Defense', () => {
    it('rejects public self-registration with ADMIN or SUPER_ADMIN roles with 403', async () => {
      const originalEnv = process.env.SUPABASE_SERVICE_ROLE_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_valid_service_role_key_for_test_longer_than_30_chars';

      const reqAdmin = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Attacker User',
          email: 'attacker@campus.edu',
          password: 'securePassword123!',
          role: 'ADMIN',
        }),
      });

      const resAdmin = await registerUser(reqAdmin);
      expect(resAdmin.status).toBe(403);
      const jsonAdmin = await resAdmin.json();
      expect(jsonAdmin.error).toMatch(/Administrative and management roles cannot be self-assigned/i);

      process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv;
    });

    it('returns 403 when a non-admin attempts to approve or promote staff accounts', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'unauthorized-staff-caller' } } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'unauthorized-staff-caller', role: 'STAFF', is_approved: true },
                }),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/admin/users/approve', {
        method: 'POST',
        body: JSON.stringify({
          targetUserId: 'target-user-1',
          action: 'approve',
          requestedRole: 'STAFF',
        }),
      });

      const res = await approveUser(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/Admin privileges required/i);
    });

    it('rejects attempting to promote anyone to SUPER_ADMIN through the approval endpoint', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'admin-caller' } } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'admin-caller', role: 'ADMIN', is_approved: true },
                }),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/admin/users/approve', {
        method: 'POST',
        body: JSON.stringify({
          targetUserId: 'target-user-1',
          action: 'approve',
          requestedRole: 'SUPER_ADMIN',
        }),
      });

      const res = await approveUser(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Cannot assign SUPER_ADMIN role/i);
    });

    it('prevents an ADMIN from approving a user assigned to another college', async () => {
      const originalEnv = process.env.SUPABASE_SERVICE_ROLE_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_valid_service_role_key_for_test_longer_than_30_chars';
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'srkr-admin' } } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'srkr-admin',
                    role: 'ADMIN',
                    is_approved: true,
                    college_id: 'srkr-bhimavaram',
                  },
                }),
              })),
            })),
          };
        }
        return {};
      });

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'STUDENT', college_id: 'vishnu-bhimavaram' },
                }),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/admin/users/approve', {
        method: 'POST',
        body: JSON.stringify({
          targetUserId: 'vishnu-student',
          action: 'APPROVE',
          requestedRole: 'STUDENT',
        }),
      });

      try {
        const res = await approveUser(req);
        expect(res.status).toBe(403);
        expect(await res.json()).toEqual({
          error: 'Cannot manage users outside your assigned campus',
        });
      } finally {
        if (originalEnv === undefined) {
          delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        } else {
          process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv;
        }
      }
    });

    it('allows a same-college ADMIN when the campus uses a supported alias', async () => {
      const originalEnv = process.env.SUPABASE_SERVICE_ROLE_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_valid_service_role_key_for_test_longer_than_30_chars';
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'vishnu-admin' } } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'vishnu-admin',
                    role: 'ADMIN',
                    is_approved: true,
                    college_id: 'vishnu-bhimavaram',
                  },
                }),
              })),
            })),
          };
        }
        return {};
      });

      const update = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }));
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'STUDENT', college_id: 'vit-bhimavaram' },
                }),
              })),
            })),
            update,
          };
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/admin/users/approve', {
        method: 'POST',
        body: JSON.stringify({
          targetUserId: 'vishnu-student',
          action: 'approve',
          requestedRole: 'STUDENT',
        }),
      });

      try {
        const res = await approveUser(req);
        expect(res.status).toBe(200);
        expect(update).toHaveBeenCalledWith({ is_approved: true, role: 'STUDENT' });
      } finally {
        if (originalEnv === undefined) {
          delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        } else {
          process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv;
        }
      }
    });

    it('allows an ADMIN to approve users with MENTOR or WARDEN staff roles', async () => {
      const originalEnv = process.env.SUPABASE_SERVICE_ROLE_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_valid_service_role_key_for_test_longer_than_30_chars';
      mockGetUser.mockResolvedValue({ data: { user: { id: 'srkr-admin' } } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'srkr-admin',
                    role: 'ADMIN',
                    is_approved: true,
                    college_id: 'srkr-bhimavaram',
                  },
                }),
              })),
            })),
          };
        }
        return {};
      });

      const update = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }));

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'STAFF', college_id: 'srkr-bhimavaram' },
                }),
              })),
            })),
            update,
          };
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      });

      try {
        // 1. Approve as MENTOR
        const mentorReq = new Request('http://localhost:3000/api/admin/users/approve', {
          method: 'POST',
          body: JSON.stringify({
            targetUserId: 'staff-candidate-1',
            action: 'approve',
            requestedRole: 'MENTOR',
          }),
        });
        const mentorRes = await approveUser(mentorReq);
        expect(mentorRes.status).toBe(200);
        expect(update).toHaveBeenCalledWith({ is_approved: true, role: 'MENTOR' });

        // 2. Approve as WARDEN
        const wardenReq = new Request('http://localhost:3000/api/admin/users/approve', {
          method: 'POST',
          body: JSON.stringify({
            targetUserId: 'staff-candidate-2',
            action: 'approve',
            requestedRole: 'WARDEN',
          }),
        });
        const wardenRes = await approveUser(wardenReq);
        expect(wardenRes.status).toBe(200);
        expect(update).toHaveBeenCalledWith({ is_approved: true, role: 'WARDEN' });
      } finally {
        if (originalEnv === undefined) {
          delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        } else {
          process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv;
        }
      }
    });

    it('prevents an ADMIN from approving student verification for another college', async () => {
      const originalEnv = process.env.SUPABASE_SERVICE_ROLE_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_valid_service_role_key_for_test_longer_than_30_chars';
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'srkr-reviewer' } } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'srkr-reviewer',
                    role: 'ADMIN',
                    is_approved: true,
                    college_id: 'srkr-bhimavaram',
                  },
                }),
              })),
            })),
          };
        }
        return {};
      });

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { college_id: 'vishnu-bhimavaram' },
                  error: null,
                }),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/admin/verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetStudentId: 'vishnu-student',
          decision: 'VERIFIED',
        }),
      });

      try {
        const res = await postAdminVerification(req);
        expect(res.status).toBe(403);
        expect(await res.json()).toEqual({
          error: 'Cannot review students outside your assigned campus',
        });
        expect(mockAdminFrom).toHaveBeenCalledTimes(1);
      } finally {
        if (originalEnv === undefined) {
          delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        } else {
          process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv;
        }
      }
    });
  });

  // ===========================================================================
  // 4. Concurrency Protection & Ineligible Assignee
  // ===========================================================================
  describe('Incident Assignment Concurrency & Validity', () => {
    it('returns 409 Conflict when expected_assigned_to does not match current database state', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'admin-controller' } } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'admin-controller', role: 'ADMIN', full_name: 'Admin Controller' },
                }),
              })),
            })),
          };
        }
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'inc-collision-1',
                    case_id: 'KC-COLLISION',
                    status: 'ASSIGNED',
                    assigned_to: 'responder-B-who-got-there-first', // Already changed!
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents/inc-collision-1', {
        method: 'PATCH',
        body: JSON.stringify({
          assigned_to: 'responder-C',
          expected_assigned_to: 'responder-A-stale', // Stale expected assignee
        }),
      });

      const res = await patchIncident(req, { params: Promise.resolve({ id: 'inc-collision-1' }) });
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toMatch(/Conflict/i);
    });
  });

  // ===========================================================================
  // 5. SOS Coordinates Range & Validation
  // ===========================================================================
  describe('SOS Payload & GPS Range Defense', () => {
    it('returns 400 when submitted latitude is out of range (> 90)', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'student-valid-1' } } });

      const req = new Request('http://localhost:3000/api/sos', {
        method: 'POST',
        body: JSON.stringify({
          latitude: 95.5, // Invalid > 90
          longitude: 78.486671,
        }),
      });

      const res = await handleSos(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Invalid coordinates/i);
    });

    it('returns 400 when submitted longitude is out of range (< -180)', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'student-valid-1' } } });

      const req = new Request('http://localhost:3000/api/sos', {
        method: 'POST',
        body: JSON.stringify({
          latitude: 17.385044,
          longitude: -185.0, // Invalid < -180
        }),
      });

      const res = await handleSos(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Invalid coordinates/i);
    });
  });

  // ===========================================================================
  // 6. Safe Walk Authorization & Configurable Duration Limits
  // ===========================================================================
  describe('Safe Walk Authorization & Limit Defense', () => {
    it('returns 403 when a non-student role attempts to start a safe walk', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'staff-caller-1' } } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'STAFF' }, // Not a STUDENT
                }),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/safe-walk/start', {
        method: 'POST',
        body: JSON.stringify({
          destination: 'Library',
          expectedDurationMins: 30,
        }),
      });

      const res = await startSafeWalk(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/Only students can start a safe walk/i);
    });

    it('returns 400 when expected duration is under 5 minutes or over 180 minutes', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'student-caller-1' } } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'STUDENT' },
                }),
              })),
            })),
          };
        }
        return {};
      });

      const reqShort = new Request('http://localhost:3000/api/safe-walk/start', {
        method: 'POST',
        body: JSON.stringify({
          destination: 'Hostel Block',
          expectedDurationMins: 2, // Less than 5 mins
        }),
      });

      const resShort = await startSafeWalk(reqShort);
      expect(resShort.status).toBe(400);
      const jsonShort = await resShort.json();
      expect(jsonShort.error).toMatch(/Expected duration must be between 5 and 180 minutes/i);

      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'student-caller-1' } } });
      const reqLong = new Request('http://localhost:3000/api/safe-walk/start', {
        method: 'POST',
        body: JSON.stringify({
          destination: 'Hostel Block',
          expectedDurationMins: 240, // Greater than 180 mins
        }),
      });

      const resLong = await startSafeWalk(reqLong);
      expect(resLong.status).toBe(400);
      const jsonLong = await resLong.json();
      expect(jsonLong.error).toMatch(/Expected duration must be between 5 and 180 minutes/i);
    });
  });

  // ===========================================================================
  // 7. Cron Secret Authentication Invariant
  // ===========================================================================
  describe('Background Cron Secret Authentication', () => {
    it('returns 401 on /api/cron/escalate when authorization header is missing or incorrect', async () => {
      process.env.CRON_SECRET = 'secret_cron_guard_token_2026';

      const reqNoHeader = new Request('http://localhost:3000/api/cron/escalate', {
        method: 'POST',
      });
      const resNoHeader = await handleEscalateCron(reqNoHeader);
      expect(resNoHeader.status).toBe(401);

      const reqWrongHeader = new Request('http://localhost:3000/api/cron/escalate', {
        method: 'POST',
        headers: { authorization: 'Bearer wrong_token_unauthorized' },
      });
      const resWrongHeader = await handleEscalateCron(reqWrongHeader);
      expect(resWrongHeader.status).toBe(401);

      // Verify that unset CRON_SECRET strictly rejects 'Bearer undefined'
      delete process.env.CRON_SECRET;
      const reqBearerUndefined = new Request('http://localhost:3000/api/cron/escalate', {
        method: 'POST',
        headers: { authorization: 'Bearer undefined' },
      });
      const resBearerUndefined = await handleEscalateCron(reqBearerUndefined);
      expect(resBearerUndefined.status).toBe(401);
    });

    it('returns 401 on /api/cron/safe-walk-timeout when authorization header is missing or incorrect', async () => {
      process.env.CRON_SECRET = 'secret_cron_guard_token_2026';

      const reqNoHeader = new Request('http://localhost:3000/api/cron/safe-walk-timeout', {
        method: 'POST',
      });
      const resNoHeader = await handleSafeWalkTimeoutCron(reqNoHeader);
      expect(resNoHeader.status).toBe(401);

      const reqWrongHeader = new Request('http://localhost:3000/api/cron/safe-walk-timeout', {
        method: 'POST',
        headers: { authorization: 'Bearer wrong_token_unauthorized' },
      });
      const resWrongHeader = await handleSafeWalkTimeoutCron(reqWrongHeader);
      expect(resWrongHeader.status).toBe(401);

      // Verify that unset CRON_SECRET strictly rejects 'Bearer undefined'
      delete process.env.CRON_SECRET;
      const reqBearerUndefined = new Request('http://localhost:3000/api/cron/safe-walk-timeout', {
        method: 'POST',
        headers: { authorization: 'Bearer undefined' },
      });
      const resBearerUndefined = await handleSafeWalkTimeoutCron(reqBearerUndefined);
      expect(resBearerUndefined.status).toBe(401);
    });
  });
});
