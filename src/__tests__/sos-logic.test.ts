import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/sos/route';
import { createClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('SOS API Logic (src/app/api/sos/route.ts)', () => {
  let insertedIncident: Record<string, unknown> | null = null;
  let insertedLocation: Record<string, unknown> | null = null;
  const insertedNotifications: Record<string, unknown>[] = [];
  const insertedEscalations: Record<string, unknown>[] = [];
  const insertedAuditLogs: Record<string, unknown>[] = [];

  function createMockSupabase({
    user = { id: 'student-usr-sos-1' } as { id: string } | null,
    incidentInsertError = null as unknown,
    staffList = [{ id: 'security-guard-1', role: 'SECURITY' }] as { id: string; role: string }[] | null,
    existingActiveSos = [] as { id: string; case_id: string }[],
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
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    in: vi.fn(() => ({
                      limit: vi.fn().mockResolvedValue({
                        data: existingActiveSos,
                        error: null,
                      }),
                    })),
                  })),
                })),
              })),
            })),
            insert: vi.fn((payload: Record<string, unknown>) => {
              insertedIncident = payload;
              return {
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: incidentInsertError ? null : { id: 'incident-sos-100', ...payload },
                    error: incidentInsertError,
                  }),
                })),
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
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: staffList,
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'notifications') {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              insertedNotifications.push(payload);
              return Promise.resolve({ data: null, error: null });
            }),
          };
        }
        if (table === 'escalations') {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              insertedEscalations.push(payload);
              return Promise.resolve({ data: null, error: null });
            }),
          };
        }
        if (table === 'audit_logs') {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              insertedAuditLogs.push(payload);
              return Promise.resolve({ data: null, error: null });
            }),
          };
        }
        if (table === 'trusted_contacts') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            })),
          };
        }
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        };
      }),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    insertedIncident = null;
    insertedLocation = null;
    insertedNotifications.length = 0;
    insertedEscalations.length = 0;
    insertedAuditLogs.length = 0;
  });

  it('rejects unauthenticated SOS requests with 401', async () => {
    const mockClient = createMockSupabase({ user: null });
    vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/sos', {
      method: 'POST',
      body: JSON.stringify({ latitude: 17.44, longitude: 78.34 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('does not expose internal exception details in SOS error responses', async () => {
    vi.mocked(createClient).mockRejectedValue(
      new Error('database connection secret must not be disclosed')
    );
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const req = new Request('http://localhost:3000/api/sos', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to create SOS incident' });
    expect(errorSpy).toHaveBeenCalled();
  });

  it('rejects invalid out-of-range coordinates with 400 Bad Request', async () => {
    const mockClient = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/sos', {
      method: 'POST',
      body: JSON.stringify({ latitude: 120.5, longitude: 78.34 }), // latitude > 90
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid coordinates');
  });

  it('rejects non-numeric coordinates with 400 Bad Request', async () => {
    const mockClient = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/sos', {
      method: 'POST',
      body: JSON.stringify({ latitude: 'malformed_latitude', longitude: 78.34 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid coordinates');
  });

  it('safely deduplicates active SOS requests by returning the existing active incident', async () => {
    const mockClient = createMockSupabase({
      existingActiveSos: [{ id: 'inc-existing-sos-456', case_id: 'SOS-2026-ACTIVE1' }],
    });
    vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/sos', {
      method: 'POST',
      body: JSON.stringify({ latitude: 17.44, longitude: 78.34 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.isExisting).toBe(true);
    expect(body.incidentId).toBe('inc-existing-sos-456');
    expect(body.caseId).toBe('SOS-2026-ACTIVE1');
    expect(insertedIncident).toBeNull(); // No duplicate row inserted
  });

  it('records SOS with GPS coordinates and writes to incident_locations', async () => {
    const mockClient = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/sos', {
      method: 'POST',
      body: JSON.stringify({
        latitude: 17.4455,
        longitude: 78.3488,
        accuracy: 8.5,
        zoneId: 'zone-north-quad',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.caseId).toMatch(/^SOS-\d{4}-[A-Z0-9]+$/);
    expect(body.incidentId).toBe('incident-sos-100');

    // Verify incident payload contains GPS & metadata
    expect(insertedIncident?.latitude).toBe(17.4455);
    expect(insertedIncident?.longitude).toBe(78.3488);
    expect(insertedIncident?.location_accuracy).toBe(8.5);
    expect(insertedIncident?.campus_zone_id).toBe('zone-north-quad');
    expect(insertedIncident?.severity).toBe('CRITICAL');

    // Verify incident_locations table received coordinates
    expect(insertedLocation).toEqual({
      incident_id: 'incident-sos-100',
      latitude: 17.4455,
      longitude: 78.3488,
      accuracy: 8.5,
    });
  });

  it('records SOS even when GPS is completely absent (graceful degradation)', async () => {
    const mockClient = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/sos', {
      method: 'POST',
      body: JSON.stringify({
        latitude: null,
        longitude: null,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify GPS coordinates were omitted from incident
    expect(insertedIncident?.latitude).toBeUndefined();
    expect(insertedIncident?.longitude).toBeUndefined();
    // incident_locations must NOT be written when location is absent
    expect(insertedLocation).toBeNull();
  });

  it('handles scenario when no security staff are active/available by escalating safely', async () => {
    const mockClient = createMockSupabase({ staffList: [] });
    vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/sos', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    // Verify escalation was created specifically for no staff available
    expect(insertedEscalations).toContainEqual({
      incident_id: 'incident-sos-100',
      from_level: 'SYSTEM',
      to_level: 'ADMIN',
      reason: 'NO_STAFF_AVAILABLE_FOR_SOS',
    });
  });

  it('broadcasts to all active security staff when available and creates pending escalation', async () => {
    const mockClient = createMockSupabase({
      staffList: [
        { id: 'guard-1', role: 'SECURITY' },
        { id: 'guard-2', role: 'SECURITY' },
      ],
    });
    vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/sos', {
      method: 'POST',
      body: JSON.stringify({ latitude: 17.4, longitude: 78.3 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    // Verify notifications were dispatched to each guard
    expect(insertedNotifications.length).toBe(2);
    expect(insertedNotifications[0].user_id).toBe('guard-1');
    expect(insertedNotifications[1].user_id).toBe('guard-2');
    expect(insertedNotifications[0].type).toBe('EMERGENCY');

    // Escalation for broadcast claim
    expect(insertedEscalations).toContainEqual({
      incident_id: 'incident-sos-100',
      from_level: 'SYSTEM',
      to_level: 'ADMIN',
      reason: 'NO_VALID_COORDINATES_FOR_ROUTING',
    });
  });

  it('returns 500 when database insert fails', async () => {
    const mockClient = createMockSupabase({
      incidentInsertError: { message: 'Database connection terminated' },
    });
    vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/sos', {
      method: 'POST',
      body: JSON.stringify({ latitude: 17.4, longitude: 78.3 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to create SOS incident');
  });
});
