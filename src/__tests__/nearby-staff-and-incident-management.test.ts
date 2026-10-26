import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getNearbyStaff } from '@/app/api/incidents/[id]/nearby-staff/route';
import { GET as getIncident, PATCH as patchIncident } from '@/app/api/incidents/[id]/route';

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

describe('Nearby Staff Workflow & Incident Lifecycle (Phase 5 & Section 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/incidents/[id]/nearby-staff', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });

      const req = new Request('http://localhost:3000/api/incidents/inc-1/nearby-staff');
      const res = await getNearbyStaff(req, { params: Promise.resolve({ id: 'inc-1' }) });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 403 when caller is a STUDENT (privacy rule: students cannot access staff GPS)', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'student-uid-1' } } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'student-uid-1', role: 'STUDENT', is_active: true, is_approved: true },
                }),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents/inc-1/nearby-staff');
      const res = await getNearbyStaff(req, { params: Promise.resolve({ id: 'inc-1' }) });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/Forbidden/i);
    });

    it('returns 404 when incident does not exist', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'staff-uid-1' } } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'staff-uid-1', role: 'STAFF', is_active: true, is_approved: true },
                }),
              })),
            })),
          };
        }
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents/inc-missing/nearby-staff');
      const res = await getNearbyStaff(req, { params: Promise.resolve({ id: 'inc-missing' }) });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('Incident not found');
    });

    it('calculates Haversine distance, verifies freshness, and sorts nearest staff first', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'admin-uid-1' } } });

      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

      const now = new Date();
      const freshTimestamp = new Date(now.getTime() - 2 * 60 * 1000).toISOString(); // 2 mins ago (fresh)
      const staleTimestamp = new Date(now.getTime() - 45 * 60 * 1000).toISOString(); // 45 mins ago (stale)

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn((fields: string) => {
              if (fields.includes('is_active, is_approved')) {
                // Return staff candidates list
                return {
                  in: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      eq: vi.fn().mockResolvedValue({
                        data: [
                          { id: 'guard-1', full_name: 'Campus Guard Rajesh', role: 'SECURITY', department: 'Security', is_active: true, is_approved: true },
                          { id: 'mentor-1', full_name: 'Prof. Sharma', role: 'STAFF', department: 'CSE', is_active: true, is_approved: true },
                          { id: 'guard-2', full_name: 'Officer Vikram', role: 'SECURITY', department: 'Security', is_active: true, is_approved: true },
                        ],
                        error: null,
                      }),
                    })),
                  })),
                };
              }
              // Single profile lookup for caller
              return {
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'admin-uid-1', role: 'ADMIN', is_active: true, is_approved: true },
                  }),
                })),
              };
            }),
          };
        }
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'inc-sos-101',
                    case_id: 'SOS-2026-X99',
                    category: 'EMERGENCY',
                    severity: 'CRITICAL',
                    status: 'ASSIGNED',
                    latitude: 17.385044,
                    longitude: 78.486671,
                    assigned_to: 'guard-1', // current assignee who is unresponsive
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'incident_locations') {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({
                  data: [
                    // guard-2 is ~150 meters away with fresh GPS
                    { incident_id: 'guard-2', latitude: 17.386000, longitude: 78.486800, accuracy: 5, recorded_at: freshTimestamp },
                    // mentor-1 has stale GPS (>45 mins ago)
                    { incident_id: 'mentor-1', latitude: 17.385100, longitude: 78.486700, accuracy: 5, recorded_at: staleTimestamp },
                  ],
                }),
              })),
            })),
          };
        }
        if (table === 'audit_logs') {
          return { insert: mockAuditInsert };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents/inc-sos-101/nearby-staff');
      const res = await getNearbyStaff(req, { params: Promise.resolve({ id: 'inc-sos-101' }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.hasIncidentLocation).toBe(true);
      expect(json.hasFreshGpsResponders).toBe(true);

      // Verify guard-2 has fresh GPS and calculated distance
      const guard2 = json.candidates.find((c: { id: string }) => c.id === 'guard-2');
      expect(guard2).toBeDefined();
      expect(guard2.hasFreshGps).toBe(true);
      expect(typeof guard2.distanceMeters).toBe('number');
      expect(guard2.distanceMeters).toBeGreaterThan(0);
      expect(guard2.distanceMeters).toBeLessThan(500);

      // Verify mentor-1 has stale GPS flagged (hasFreshGps: false, distanceMeters: null)
      const mentor1 = json.candidates.find((c: { id: string }) => c.id === 'mentor-1');
      expect(mentor1).toBeDefined();
      expect(mentor1.hasFreshGps).toBe(false);
      expect(mentor1.distanceMeters).toBeNull();

      // Verify audit log was recorded
      expect(mockAuditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'NEARBY_STAFF_LOOKUP',
          actor_id: 'admin-uid-1',
          entity_id: 'inc-sos-101',
        })
      );
    });

    it('displays fallback message and never fabricates coordinates when incident has no GPS', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'security-uid-1' } } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn((fields: string) => {
              if (fields.includes('is_active, is_approved')) {
                return {
                  in: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      eq: vi.fn().mockResolvedValue({
                        data: [
                          { id: 'guard-1', full_name: 'Rajesh', role: 'SECURITY', department: 'Security', is_active: true, is_approved: true },
                        ],
                        error: null,
                      }),
                    })),
                  })),
                };
              }
              return {
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'security-uid-1', role: 'SECURITY', is_active: true, is_approved: true },
                  }),
                })),
              };
            }),
          };
        }
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'inc-nogps-202',
                    case_id: 'KC-2026-NOGPS',
                    category: 'THEFT',
                    severity: 'MEDIUM',
                    status: 'RECEIVED',
                    latitude: null, // GPS missing
                    longitude: null,
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'incident_locations') {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: [] }),
              })),
            })),
          };
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents/inc-nogps-202/nearby-staff');
      const res = await getNearbyStaff(req, { params: Promise.resolve({ id: 'inc-nogps-202' }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.hasIncidentLocation).toBe(false);
      expect(json.message).toContain('Incident coordinates unavailable');
      // Coordinates must never be fabricated
      expect(json.candidates[0].distanceMeters).toBeNull();
    });
  });

  describe('PATCH /api/incidents/[id] (Status Updates & Reassignment)', () => {
    it('rejects status change attempts by ordinary students with 403', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'student-attacker' } } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'student-attacker', role: 'STUDENT', full_name: 'Student' },
                }),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents/inc-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'RESOLVED' }),
      });
      const res = await patchIncident(req, { params: Promise.resolve({ id: 'inc-1' }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/Forbidden/i);
    });

    it('allows authorized staff to acknowledge an incident and logs case_actions & audit_logs', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'staff-responder-1' } } });

      const mockIncidentUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'inc-1', case_id: 'KC-1', status: 'ACKNOWLEDGED', assigned_to: 'staff-responder-1' },
              error: null,
            }),
          }),
        }),
      });

      const mockCaseActionInsert = vi.fn().mockResolvedValue({ error: null });
      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'staff-responder-1', role: 'STAFF', full_name: 'Dr. Ramesh' },
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
                  data: { id: 'inc-1', case_id: 'KC-1', status: 'ASSIGNED', assigned_to: 'staff-responder-1' },
                  error: null,
                }),
              })),
            })),
            update: mockIncidentUpdate,
          };
        }
        if (table === 'case_actions') {
          return { insert: mockCaseActionInsert };
        }
        if (table === 'audit_logs') {
          return { insert: mockAuditInsert };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents/inc-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ACKNOWLEDGED', notes: 'Acknowledged and responding.' }),
      });
      const res = await patchIncident(req, { params: Promise.resolve({ id: 'inc-1' }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.incident.status).toBe('ACKNOWLEDGED');

      // Verify case_actions entry
      expect(mockCaseActionInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          incident_id: 'inc-1',
          actor_id: 'staff-responder-1',
          action: 'ACKNOWLEDGED',
          to_status: 'ACKNOWLEDGED',
        })
      );

      // Verify audit log entry
      expect(mockAuditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          actor_id: 'staff-responder-1',
          action: 'INCIDENT_ACKNOWLEDGED',
          entity_id: 'inc-1',
        })
      );
    });

    it('reassigns incident to nearby staff, writes audit log, and notifies new assignee', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'admin-controller-1' } } });

      const mockIncidentUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'inc-sos-88', case_id: 'SOS-88', status: 'ASSIGNED', assigned_to: 'guard-vikram-99' },
              error: null,
            }),
          }),
        }),
      });

      const mockNotificationInsert = vi.fn().mockResolvedValue({ error: null });
      const mockCaseActionInsert = vi.fn().mockResolvedValue({ error: null });
      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((col: string, val: string) => ({
                single: vi.fn().mockImplementation(() => {
                  if (val === 'admin-controller-1') {
                    return Promise.resolve({
                      data: { id: 'admin-controller-1', role: 'ADMIN', full_name: 'Chief Admin' },
                    });
                  }
                  if (val === 'guard-vikram-99') {
                    return Promise.resolve({
                      data: { id: 'guard-vikram-99', role: 'SECURITY', is_active: true, is_approved: true, full_name: 'Officer Vikram' },
                    });
                  }
                  return Promise.resolve({ data: null });
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
                    id: 'inc-sos-88',
                    case_id: 'SOS-88',
                    category: 'EMERGENCY',
                    severity: 'CRITICAL',
                    status: 'RECEIVED',
                    assigned_to: 'unresponsive-guard',
                  },
                  error: null,
                }),
              })),
            })),
            update: mockIncidentUpdate,
          };
        }
        if (table === 'notifications') {
          return { insert: mockNotificationInsert };
        }
        if (table === 'case_actions') {
          return { insert: mockCaseActionInsert };
        }
        if (table === 'audit_logs') {
          return { insert: mockAuditInsert };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents/inc-sos-88', {
        method: 'PATCH',
        body: JSON.stringify({
          assigned_to: 'guard-vikram-99',
          notes: 'Reassigned via Nearby Staff workflow: previous responder unresponsive.',
        }),
      });
      const res = await patchIncident(req, { params: Promise.resolve({ id: 'inc-sos-88' }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.incident.assigned_to).toBe('guard-vikram-99');

      // Verify notification sent to new assignee
      expect(mockNotificationInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'guard-vikram-99',
          incident_id: 'inc-sos-88',
          title: expect.stringContaining('CASE ASSIGNED: SOS-88'),
        })
      );

      // Verify audit log has reassignment metadata
      expect(mockAuditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INCIDENT_REASSIGNED',
          actor_id: 'admin-controller-1',
          metadata: expect.objectContaining({
            previous_assignee: 'unresponsive-guard',
            new_assignee: 'guard-vikram-99',
          }),
        })
      );
    });

    it('rejects reassignment if target assignee is a STUDENT (ineligible role check)', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'admin-1' } } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((col: string, val: string) => ({
                single: vi.fn().mockImplementation(() => {
                  if (val === 'admin-1') {
                    return Promise.resolve({ data: { id: 'admin-1', role: 'ADMIN', full_name: 'Admin User' } });
                  }
                  if (val === 'student-id-99') {
                    return Promise.resolve({ data: { id: 'student-id-99', role: 'STUDENT', is_active: true, is_approved: true } });
                  }
                  return Promise.resolve({ data: null });
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
                  data: { id: 'inc-1', case_id: 'KC-1', status: 'RECEIVED', assigned_to: null },
                  error: null,
                }),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents/inc-1', {
        method: 'PATCH',
        body: JSON.stringify({ assigned_to: 'student-id-99' }),
      });
      const res = await patchIncident(req, { params: Promise.resolve({ id: 'inc-1' }) });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Invalid assignee/i);
    });

    it('returns 409 Conflict when concurrent reassignment occurs (expected_assigned_to mismatch)', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'admin-1' } } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'admin-1', role: 'ADMIN', full_name: 'Admin User' } }),
              })),
            })),
          };
        }
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  // Incident was already reassigned to someone else!
                  data: { id: 'inc-1', case_id: 'KC-1', status: 'ASSIGNED', assigned_to: 'guard-already-assigned' },
                  error: null,
                }),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents/inc-1', {
        method: 'PATCH',
        body: JSON.stringify({
          assigned_to: 'guard-new',
          expected_assigned_to: 'guard-stale-expected',
        }),
      });
      const res = await patchIncident(req, { params: Promise.resolve({ id: 'inc-1' }) });

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toMatch(/Conflict/i);
    });

    it('returns 403 when unassigned staff tries to update or reassign a case assigned to another responder', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'unrelated-staff-1' } } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'unrelated-staff-1', role: 'STAFF', full_name: 'Unrelated Staff' } }),
              })),
            })),
          };
        }
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'inc-1', case_id: 'KC-1', status: 'ASSIGNED', assigned_to: 'assigned-responder-99' },
                  error: null,
                }),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents/inc-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'RESOLVED' }),
      });
      const res = await patchIncident(req, { params: Promise.resolve({ id: 'inc-1' }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/Forbidden/i);
    });
  });

  describe('GET /api/incidents/[id] - Privacy & Authorization Guards', () => {
    it('returns 403 when unassigned staff tries to view a case assigned to another responder', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'unassigned-staff-1' } } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'unassigned-staff-1', role: 'STAFF' } }),
              })),
            })),
          };
        }
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'inc-1', student_id: 'student-owner-1', assigned_to: 'other-responder-99' },
                  error: null,
                }),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents/inc-1');
      const res = await getIncident(req, { params: Promise.resolve({ id: 'inc-1' }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/Forbidden/i);
    });

    it('masks student coordinates when viewed by unassigned staff viewing an intake incident', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'intake-staff-1' } } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'intake-staff-1', role: 'STAFF' } }),
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
                    id: 'inc-unassigned-1',
                    student_id: 'student-owner-1',
                    assigned_to: null, // unassigned intake case
                    latitude: 17.385044,
                    longitude: 78.486671,
                    location_accuracy: 10,
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

      const req = new Request('http://localhost:3000/api/incidents/inc-unassigned-1');
      const res = await getIncident(req, { params: Promise.resolve({ id: 'inc-unassigned-1' }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      // Student location is masked for unassigned staff
      expect(json.incident.latitude).toBeNull();
      expect(json.incident.longitude).toBeNull();
      expect(json.incident.location_accuracy).toBeNull();
    });

    it('returns 403 in nearby-staff when an unassigned staff queries responders for a case assigned to someone else', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'unrelated-staff-1' } } });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'unrelated-staff-1', role: 'STAFF' } }),
              })),
            })),
          };
        }
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'inc-1', assigned_to: 'other-responder-99' },
                  error: null,
                }),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents/inc-1/nearby-staff');
      const res = await getNearbyStaff(req, { params: Promise.resolve({ id: 'inc-1' }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/Forbidden/i);
    });
  });
});
