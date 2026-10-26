import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  calculateHaversineDistance, 
  isCoordinateFresh, 
  selectOptimalResponder, 
  SEVERITY_TARGET_ROLES, 
  ResponderCandidate 
} from '@/lib/routing/assignment';
import { POST as registerPost } from '@/app/api/auth/register/route';
import { GET as adminVerificationsGet, POST as adminVerificationsPost } from '@/app/api/admin/verifications/route';
import { GET as incidentGet, PATCH as incidentPatch } from '@/app/api/incidents/[id]/route';
import { POST as cronEscalatePost } from '@/app/api/cron/escalate/route';

// Mock Supabase modules
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

describe('Kavach Campus — Step 108 Remediation & Functional Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. GPS COORDINATE & HAVERSINE VALIDATION (PHASE 5)
  // =========================================================================
  describe('Phase 5: Geolocation & Distance Calculation Correctness', () => {
    it('calculates zero distance for identical coordinates', () => {
      const distance = calculateHaversineDistance(17.4455, 78.3498, 17.4455, 78.3498);
      expect(distance).toBe(0);
    });

    it('calculates accurate distance between known benchmark campus points', () => {
      // Main Gate (17.4455, 78.3498) to Library (17.4485, 78.3528) ~ 460 meters
      const distance = calculateHaversineDistance(17.4455, 78.3498, 17.4485, 78.3528);
      expect(distance).toBeGreaterThan(400);
      expect(distance).toBeLessThan(550);
    });

    it('calculates 1-degree latitude separation as approximately 111 km', () => {
      const distance = calculateHaversineDistance(0, 0, 1, 0);
      expect(distance).toBeGreaterThan(111000);
      expect(distance).toBeLessThan(112000);
    });

    it('rejects out-of-bounds latitude (>90 or <-90)', () => {
      expect(calculateHaversineDistance(91, 78, 17, 78)).toBeNaN();
      expect(calculateHaversineDistance(-90.5, 78, 17, 78)).toBeNaN();
    });

    it('rejects out-of-bounds longitude (>180 or <-180)', () => {
      expect(calculateHaversineDistance(17, 181, 17, 78)).toBeNaN();
      expect(calculateHaversineDistance(17, -185, 17, 78)).toBeNaN();
    });

    it('rejects null, undefined, or NaN coordinates', () => {
      // @ts-expect-error testing invalid inputs
      expect(calculateHaversineDistance(null, 78, 17, 78)).toBeNaN();
      // @ts-expect-error testing invalid inputs
      expect(calculateHaversineDistance(17, undefined, 17, 78)).toBeNaN();
      expect(calculateHaversineDistance(NaN, 78, 17, 78)).toBeNaN();
    });

    it('validates coordinate freshness correctly (rejects stale beacons)', () => {
      const now = new Date().toISOString();
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();

      expect(isCoordinateFresh(now, 15)).toBe(true);
      expect(isCoordinateFresh(tenMinsAgo, 15)).toBe(true);
      expect(isCoordinateFresh(twentyMinsAgo, 15)).toBe(false);
      expect(isCoordinateFresh(undefined, 15)).toBe(false);
    });
  });

  // =========================================================================
  // 2. NEARBY STAFF DISCOVERY & ASSIGNMENT (PHASE 4 & 6)
  // =========================================================================
  describe('Phase 4 & 6: Nearby Staff Discovery & Incident Routing', () => {
    const baseStaff: ResponderCandidate[] = [
      {
        id: 'staff-1',
        name: 'Officer Rajesh',
        role: 'SECURITY',
        isApproved: true,
        isOnDuty: true,
        isLocationSharingEnabled: true,
        lastLocation: {
          latitude: 17.4460,
          longitude: 78.3500,
          timestamp: new Date().toISOString(),
        },
      },
      {
        id: 'staff-2',
        name: 'Officer Priya',
        role: 'SECURITY',
        isApproved: true,
        isOnDuty: true,
        isLocationSharingEnabled: true,
        lastLocation: {
          latitude: 17.4490,
          longitude: 78.3530,
          timestamp: new Date().toISOString(),
        },
      },
    ];

    it('selects nearest eligible responder using valid GPS', () => {
      const decision = selectOptimalResponder({
        incidentLocation: { latitude: 17.4458, longitude: 78.3499 },
        severity: 'CRITICAL',
        candidates: baseStaff,
      });

      expect(decision.selectedResponderId).toBe('staff-1');
      expect(decision.routingMethod).toBe('NEAREST_GPS');
      expect(decision.distanceMeters).toBeLessThan(100);
    });

    it('excludes off-duty responders from assignment', () => {
      const offDutyStaff: ResponderCandidate[] = [
        { ...baseStaff[0], isOnDuty: false },
        baseStaff[1],
      ];

      const decision = selectOptimalResponder({
        incidentLocation: { latitude: 17.4458, longitude: 78.3499 },
        severity: 'CRITICAL',
        candidates: offDutyStaff,
      });

      expect(decision.selectedResponderId).toBe('staff-2');
    });

    it('excludes unapproved staff accounts from assignment', () => {
      const unapprovedStaff: ResponderCandidate[] = [
        { ...baseStaff[0], isApproved: false },
        baseStaff[1],
      ];

      const decision = selectOptimalResponder({
        incidentLocation: { latitude: 17.4458, longitude: 78.3499 },
        severity: 'CRITICAL',
        candidates: unapprovedStaff,
      });

      expect(decision.selectedResponderId).toBe('staff-2');
    });

    it('excludes responders with stale GPS beacons and triggers fallback', () => {
      const staleStaff: ResponderCandidate[] = [
        {
          ...baseStaff[0],
          lastLocation: {
            latitude: 17.4460,
            longitude: 78.3500,
            timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hr stale
          },
        },
      ];

      const decision = selectOptimalResponder({
        incidentLocation: { latitude: 17.4458, longitude: 78.3499 },
        severity: 'HIGH',
        candidates: staleStaff,
      });

      expect(decision.routingMethod).toBe('DEPARTMENTAL_FALLBACK');
      expect(decision.fallbackReason).toBe('NO_RESPONDERS_WITH_FRESH_COORDINATES_IN_RADIUS');
      expect(decision.distanceMeters).toBeNull(); // Zero fabrication
    });

    it('triggers SECURITY_BROADCAST when zero eligible responders exist for CRITICAL incident', () => {
      const decision = selectOptimalResponder({
        incidentLocation: { latitude: 17.4458, longitude: 78.3499 },
        severity: 'CRITICAL',
        candidates: [],
      });

      expect(decision.selectedResponderId).toBeNull();
      expect(decision.routingMethod).toBe('SECURITY_BROADCAST');
      expect(decision.fallbackReason).toBe('NO_ELIGIBLE_ON_DUTY_RESPONDERS');
    });

    it('enforces role matching based on incident severity', () => {
      expect(SEVERITY_TARGET_ROLES.CRITICAL).toContain('SECURITY');
      expect(SEVERITY_TARGET_ROLES.CRITICAL).not.toContain('MENTOR');
      expect(SEVERITY_TARGET_ROLES.LOW).toContain('MENTOR');
    });
  });

  // =========================================================================
  // 3. ROLE ESCALATION & ADMIN APPROVAL TRIGGER (PHASE 2)
  // =========================================================================
  describe('Phase 2: Authentication, Role Tampering & Approval Protections', () => {
    it('rejects public client registration attempting to claim ADMIN role', async () => {
      const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-mock-service-role-key-length-greater-than-30-chars';

      try {
        const req = new Request('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Attacker User',
            email: 'attacker@campus.edu',
            password: 'Password123!',
            role: 'ADMIN', // Illegal escalation attempt
          }),
        });

        const res = await registerPost(req);
        const data = await res.json();

        expect(res.status).toBe(403);
        expect(data.error).toContain('Administrative and management roles cannot be self-assigned');
      } finally {
        process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
      }
    });

    it('rejects student attempting to review or approve student ID cards', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'student-123' } } }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { role: 'STUDENT', is_approved: true },
              }),
            }),
          }),
        }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const res = await adminVerificationsGet();
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('Forbidden: Reviewer privileges required');
    });

    it('prevents reviewer from approving their own account verification status', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-123' } } }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'admin-123', role: 'ADMIN', is_approved: true },
              }),
            }),
          }),
        }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/admin/verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetStudentId: 'admin-123', // Self-approval attempt
          decision: 'VERIFIED',
        }),
      });

      const res = await adminVerificationsPost(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('Reviewers cannot approve or modify their own verification status');
    });
  });

  // =========================================================================
  // 4. STORAGE & EVIDENCE PRIVACY (PHASE 3)
  // =========================================================================
  describe('Phase 3: Storage & Evidence Case Isolation', () => {
    it('blocks Student A from viewing Student B’s incident details (403 Forbidden)', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'student-A' } } }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'incidents') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'inc-999', student_id: 'student-B', assigned_to: 'staff-1' },
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
                    data: { id: 'student-A', role: 'STUDENT' },
                  }),
                }),
              }),
            };
          }
          return { select: vi.fn().mockReturnThis() };
        }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/incidents/inc-999');
      const res = await incidentGet(req, { params: Promise.resolve({ id: 'inc-999' }) });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('Forbidden: You cannot access other students’ incidents');
    });

    it('blocks unassigned staff member from accessing an incident (403 Forbidden)', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'unassigned-staff' } } }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'incidents') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'inc-100', student_id: 'student-1', assigned_to: 'assigned-staff-42' },
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
                    data: { id: 'unassigned-staff', role: 'STAFF' },
                  }),
                }),
              }),
            };
          }
          return { select: vi.fn().mockReturnThis() };
        }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/incidents/inc-100');
      const res = await incidentGet(req, { params: Promise.resolve({ id: 'inc-100' }) });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('Forbidden: You are not authorized to view this incident');
    });

    it('rejects incident reassignment on concurrent update conflict (409 Conflict)', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'admin-1', role: 'ADMIN', full_name: 'Admin Officer' },
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
                    data: { id: 'inc-conflict', assigned_to: 'responder-B' }, // Already changed to B
                    error: null,
                  }),
                }),
              }),
            };
          }
          return { select: vi.fn().mockReturnThis() };
        }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/incidents/inc-conflict', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assigned_to: 'responder-C',
          expected_assigned_to: 'responder-A', // Caller thought it was A
        }),
      });

      const res = await incidentPatch(req, { params: Promise.resolve({ id: 'inc-conflict' }) });
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error).toContain('Conflict: Incident assignment was concurrently updated');
    });

    it('permits assigned responder to view incident and generates signed URLs for evidence', async () => {
      const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-mock-service-role-key-length-greater-than-30-chars';

      const { createClient } = await import('@/lib/supabase/server');
      const { createAdminClient } = await import('@/lib/supabase/admin');

      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'assigned-responder-1' } } }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'incidents') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { 
                      id: 'inc-assigned', 
                      student_id: 'student-owner', 
                      assigned_to: 'assigned-responder-1',
                      latitude: 17.4455,
                      longitude: 78.3498
                    },
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
                    data: { id: 'assigned-responder-1', role: 'SECURITY' },
                  }),
                }),
              }),
            };
          }
          if (table === 'evidence') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [{
                      id: 'ev-1',
                      file_name: 'photo.jpg',
                      file_size: 1024,
                      mime_type: 'image/jpeg',
                      storage_path: 'student-owner/photo.jpg',
                      created_at: new Date().toISOString()
                    }],
                  }),
                }),
              }),
            };
          }
          return { select: vi.fn().mockReturnThis() };
        }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      vi.mocked(createAdminClient).mockReturnValueOnce({
        storage: {
          from: vi.fn().mockReturnValue({
            createSignedUrl: vi.fn().mockResolvedValue({
              data: { signedUrl: 'https://supabase.co/storage/v1/sign/kavach-evidence/photo.jpg?token=mock' },
              error: null,
            }),
          }),
        },
      } as unknown as ReturnType<typeof createAdminClient>);

      try {
        const req = new Request('http://localhost:3000/api/incidents/inc-assigned');
        const res = await incidentGet(req, { params: Promise.resolve({ id: 'inc-assigned' }) });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.incident.latitude).toBe(17.4455); // Visible to assigned responder
        expect(data.evidence[0].signedUrl).toContain('https://supabase.co/storage');
      } finally {
        process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
      }
    });

    it('strictly rejects cron escalation when CRON_SECRET is missing or invalid (401 Unauthorized)', async () => {
      const originalSecret = process.env.CRON_SECRET;
      delete process.env.CRON_SECRET;

      try {
        const req = new Request('http://localhost:3000/api/cron/escalate', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer forged-secret' },
        });

        const res = await cronEscalatePost(req);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      } finally {
        process.env.CRON_SECRET = originalSecret;
      }
    });
  });
});
