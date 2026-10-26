import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as updateLocation, GET as getLocations } from '@/app/api/sos/location/route';
import { createClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('SOS Live Location Tracking API (src/app/api/sos/location/route.ts)', () => {
  const currentStudent = { id: 'student-usr-tracking-1' };
  let insertedLocation: Record<string, unknown> | null = null;
  let updatedIncident: Record<string, unknown> | null = null;

  function createMockSupabase({
    user = currentStudent as { id: string } | null,
    incident = {
      id: 'inc-loc-123',
      student_id: 'student-usr-tracking-1',
      is_tracking_active: true,
      status: 'RECEIVED',
    } as { id: string; student_id: string; is_tracking_active: boolean; status: string } | null,
    selectError = null as { message: string; code?: string } | null,
    updateError = null as { message: string; code?: string } | null,
    locationsList = [
      { latitude: 17.44, longitude: 78.34, accuracy: 5, recorded_at: '2026-10-11T09:00:00Z' },
    ] as { latitude: number; longitude: number; accuracy: number; recorded_at: string }[],
    profile = null as { role: string; college_id?: string } | null,
  } = {}) {
    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: selectError ? null : incident,
                  error: selectError || (incident ? null : { message: 'Incident not found' }),
                }),
              })),
            })),
            update: vi.fn((payload: Record<string, unknown>) => {
              updatedIncident = payload;
              return {
                eq: vi.fn().mockResolvedValue({ data: null, error: updateError }),
              };
            }),
          };
        }
        if (table === 'incident_locations') {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              insertedLocation = payload;
              return Promise.resolve({ data: null, error: null });
            }),
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn().mockResolvedValue({
                    data: locationsList,
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: profile,
                  error: profile ? null : { message: 'Profile not found' },
                }),
              })),
            })),
          };
        }
        if (table === 'audit_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    insertedLocation = null;
    updatedIncident = null;
  });

  describe('POST /api/sos/location', () => {
    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const mockClient = createMockSupabase({ user: null });
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/sos/location', {
        method: 'POST',
        body: JSON.stringify({ incidentId: 'inc-loc-123', latitude: 17.44, longitude: 78.34 }),
      });

      const res = await updateLocation(req);
      expect(res.status).toBe(401);
    });

    it('rejects requests missing incidentId with 400 Bad Request', async () => {
      const mockClient = createMockSupabase();
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/sos/location', {
        method: 'POST',
        body: JSON.stringify({ latitude: 17.44, longitude: 78.34 }),
      });

      const res = await updateLocation(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Missing incident ID');
    });

    it('returns 404 when target incident does not exist', async () => {
      const mockClient = createMockSupabase({ incident: null });
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/sos/location', {
        method: 'POST',
        body: JSON.stringify({ incidentId: 'nonexistent-inc', latitude: 17.44, longitude: 78.34 }),
      });

      const res = await updateLocation(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('Incident not found');
    });

    it('enforces student data isolation: rejects location update for another student incident with 403', async () => {
      const mockClient = createMockSupabase({
        incident: {
          id: 'inc-other-student',
          student_id: 'other-student-usr-999',
          is_tracking_active: true,
          status: 'RECEIVED',
        },
      });
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/sos/location', {
        method: 'POST',
        body: JSON.stringify({ incidentId: 'inc-other-student', latitude: 17.44, longitude: 78.34 }),
      });

      const res = await updateLocation(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Forbidden');
    });

    it('successfully stops tracking when isStopped is true', async () => {
      const mockClient = createMockSupabase();
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/sos/location', {
        method: 'POST',
        body: JSON.stringify({ incidentId: 'inc-loc-123', isStopped: true }),
      });

      const res = await updateLocation(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.tracking).toBe(false);
      expect(updatedIncident?.is_tracking_active).toBe(false);
    });

    it('returns 500 with SCHEMA_BLOCKER when is_tracking_active column is missing in DB', async () => {
      const mockClient = createMockSupabase({
        selectError: {
          code: '42703',
          message: 'column incidents.is_tracking_active does not exist',
        },
      });
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/sos/location', {
        method: 'POST',
        body: JSON.stringify({ incidentId: 'inc-loc-123', isStopped: true }),
      });

      const res = await updateLocation(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.code).toBe('SCHEMA_BLOCKER');
      expect(json.error).toContain('is_tracking_active');
    });

    it('returns 500 when updating is_tracking_active fails during stop tracking', async () => {
      const mockClient = createMockSupabase({
        updateError: {
          code: 'PGRST204',
          message: 'Could not find the is_tracking_active column of incidents in the schema cache',
        },
      });
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/sos/location', {
        method: 'POST',
        body: JSON.stringify({ incidentId: 'inc-loc-123', isStopped: true }),
      });

      const res = await updateLocation(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('Failed to persist stopped tracking state. Database column is_tracking_active is required.');
      expect(json.code).toBe('PGRST204');
    });

    it('rejects subsequent location ping when is_tracking_active is explicitly false with 400', async () => {
      const mockClient = createMockSupabase({
        incident: {
          id: 'inc-loc-123',
          student_id: 'student-usr-tracking-1',
          is_tracking_active: false,
          status: 'RECEIVED',
        },
      });
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/sos/location', {
        method: 'POST',
        body: JSON.stringify({ incidentId: 'inc-loc-123', latitude: 17.44, longitude: 78.34 }),
      });

      const res = await updateLocation(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Tracking is no longer active for this incident');
    });

    it('rejects coordinates update when tracking is no longer active with 400', async () => {
      const mockClient = createMockSupabase({
        incident: {
          id: 'inc-loc-123',
          student_id: 'student-usr-tracking-1',
          is_tracking_active: false,
          status: 'RESOLVED',
        },
      });
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/sos/location', {
        method: 'POST',
        body: JSON.stringify({ incidentId: 'inc-loc-123', latitude: 17.44, longitude: 78.34 }),
      });

      const res = await updateLocation(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Tracking is no longer active for this incident');
    });

    it('rejects invalid or missing coordinates with 400 Bad Request', async () => {
      const mockClient = createMockSupabase();
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/sos/location', {
        method: 'POST',
        body: JSON.stringify({ incidentId: 'inc-loc-123', latitude: null, longitude: null }),
      });

      const res = await updateLocation(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid coordinates');
    });

    it('records valid location ping and updates latest coordinates on incident', async () => {
      const mockClient = createMockSupabase();
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/sos/location', {
        method: 'POST',
        body: JSON.stringify({
          incidentId: 'inc-loc-123',
          latitude: 17.4455,
          longitude: 78.3488,
          accuracy: 4.2,
        }),
      });

      const res = await updateLocation(req);
      expect(res.status).toBe(200);
      expect(insertedLocation).toEqual({
        incident_id: 'inc-loc-123',
        latitude: 17.4455,
        longitude: 78.3488,
        accuracy: 4.2,
      });
      expect(updatedIncident?.latitude).toBe(17.4455);
      expect(updatedIncident?.longitude).toBe(78.3488);
      expect(updatedIncident?.location_accuracy).toBe(4.2);
    });
  });

  describe('GET /api/sos/location', () => {
    it('rejects unauthenticated location fetch with 401', async () => {
      const mockClient = createMockSupabase({ user: null });
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/sos/location?incidentId=inc-loc-123');
      const res = await getLocations(req);
      expect(res.status).toBe(401);
    });

    it('rejects GET requests without incidentId with 400 Bad Request', async () => {
      const mockClient = createMockSupabase();
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/sos/location');
      const res = await getLocations(req);
      expect(res.status).toBe(400);
    });

    it('returns location history ordered for authorized callers', async () => {
      const mockClient = createMockSupabase();
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/sos/location?incidentId=inc-loc-123');
      const res = await getLocations(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.locations).toHaveLength(1);
      expect(json.locations[0].latitude).toBe(17.44);
    });

    it('rejects cross-college staff from inspecting location telemetry of another college', async () => {
      const mockClient = createMockSupabase({
        user: { id: 'staff-srkr-uuid' },
        incident: {
          id: 'inc-loc-123',
          student_id: 'student-vishnu-uuid',
          is_tracking_active: true,
          status: 'RECEIVED',
          college_id: 'vishnu-bhimavaram',
        } as unknown as { id: string; student_id: string; is_tracking_active: boolean; status: string },
        profile: {
          role: 'ADMIN',
          college_id: 'srkr-bhimavaram',
        },
      });
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/sos/location?incidentId=inc-loc-123');
      const res = await getLocations(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('Forbidden: You are not authorized to view location telemetry');
    });

    it('allows same-college staff to view location telemetry', async () => {
      const mockClient = createMockSupabase({
        user: { id: 'staff-srkr-uuid' },
        incident: {
          id: 'inc-loc-123',
          student_id: 'student-srkr-uuid',
          is_tracking_active: true,
          status: 'RECEIVED',
          college_id: 'srkr-bhimavaram',
        } as unknown as { id: string; student_id: string; is_tracking_active: boolean; status: string },
        profile: {
          role: 'SECURITY',
          college_id: 'srkr-bhimavaram',
        },
      });
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/sos/location?incidentId=inc-loc-123');
      const res = await getLocations(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });
});
