import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as startSafeWalk } from '@/app/api/safe-walk/start/route';
import { POST as endSafeWalk } from '@/app/api/safe-walk/end/route';
import { createClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('Safe Walk Workflows (Start & End APIs)', () => {
  const studentUser = { id: 'student-usr-walk-1' };
  let insertedWalkPayload: Record<string, unknown> | null = null;
  let updatedWalkPayload: Record<string, unknown> | null = null;

  function createMockSupabase({
    user = studentUser as { id: string } | null,
    profileRole = 'STUDENT' as string | null,
    activeWalks = [] as { id: string }[],
    existingWalkForEnd = { id: 'walk-abc-123', student_id: 'student-usr-walk-1', status: 'ACTIVE' } as { id: string; student_id: string; status: string } | null,
  } = {}) {
    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user },
          error: user ? null : { message: 'Not logged in' },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: profileRole ? { role: profileRole } : null,
                  error: profileRole ? null : { message: 'Profile not found' },
                }),
              })),
            })),
          };
        }
        if (table === 'safe_walks') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((field: string) => {
                if (field === 'id') {
                  // For end API lookup
                  return {
                    single: vi.fn().mockResolvedValue({
                      data: existingWalkForEnd,
                      error: existingWalkForEnd ? null : { message: 'Not found' },
                    }),
                  };
                }
                // For start API existing walk check: eq('student_id', ...).eq('status', 'ACTIVE')
                return {
                  eq: vi.fn(() => ({
                    limit: vi.fn().mockResolvedValue({
                      data: activeWalks,
                      error: null,
                    }),
                  })),
                };
              }),
            })),
            insert: vi.fn((payload: Record<string, unknown>) => {
              insertedWalkPayload = payload;
              return {
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'walk-new-777',
                      status: 'ACTIVE',
                      expires_at: payload.expires_at,
                    },
                    error: null,
                  }),
                })),
              };
            }),
            update: vi.fn((payload: Record<string, unknown>) => {
              updatedWalkPayload = payload;
              return {
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    select: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({
                        data: {
                          id: 'walk-abc-123',
                          status: 'COMPLETED',
                          completed_at: payload.completed_at,
                        },
                        error: null,
                      }),
                    })),
                  })),
                })),
              };
            }),
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
    insertedWalkPayload = null;
    updatedWalkPayload = null;
  });

  describe('Safe Walk Start API (src/app/api/safe-walk/start/route.ts)', () => {
    it('rejects unauthenticated users with 401', async () => {
      const mockClient = createMockSupabase({ user: null });
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/safe-walk/start', {
        method: 'POST',
        body: JSON.stringify({ destination: 'Hostel Block B' }),
      });

      const res = await startSafeWalk(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('rejects non-student roles (e.g. STAFF) with 403 Forbidden', async () => {
      const mockClient = createMockSupabase({ profileRole: 'STAFF' });
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/safe-walk/start', {
        method: 'POST',
        body: JSON.stringify({ destination: 'Library' }),
      });

      const res = await startSafeWalk(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('Only students can start a safe walk');
    });

    it('rejects missing or empty destination with 400 Bad Request', async () => {
      const mockClient = createMockSupabase();
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/safe-walk/start', {
        method: 'POST',
        body: JSON.stringify({ destination: '   ', expectedDurationMins: 30 }),
      });

      const res = await startSafeWalk(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Destination is required');
    });

    it('rejects duration below minimum (< 5 minutes) with 400', async () => {
      const mockClient = createMockSupabase();
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/safe-walk/start', {
        method: 'POST',
        body: JSON.stringify({ destination: 'Cafeteria', expectedDurationMins: 3 }),
      });

      const res = await startSafeWalk(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Expected duration must be between 5 and 180 minutes');
    });

    it('rejects duration above maximum (> 180 minutes) with 400', async () => {
      const mockClient = createMockSupabase();
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/safe-walk/start', {
        method: 'POST',
        body: JSON.stringify({ destination: 'Cafeteria', expectedDurationMins: 200 }),
      });

      const res = await startSafeWalk(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Expected duration must be between 5 and 180 minutes');
    });

    it.each([
      { startLatitude: 17.4 },
      { startLatitude: 'not-a-coordinate', startLongitude: 78.3 },
      { startLatitude: 91, startLongitude: 78.3 },
      { startLatitude: 17.4, startLongitude: 181 },
      { startLatitude: '', startLongitude: '' },
    ])('rejects malformed or incomplete start coordinates: %o', async (coordinates) => {
      const mockClient = createMockSupabase();
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/safe-walk/start', {
        method: 'POST',
        body: JSON.stringify({ destination: 'Cafeteria', ...coordinates }),
      });

      const res = await startSafeWalk(req);
      expect(res.status).toBe(400);
      expect(insertedWalkPayload).toBeNull();
    });

    it('rejects request if student already has an ACTIVE safe walk with 409 Conflict', async () => {
      const mockClient = createMockSupabase({ activeWalks: [{ id: 'walk-active-existing' }] });
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/safe-walk/start', {
        method: 'POST',
        body: JSON.stringify({ destination: 'Main Gate', expectedDurationMins: 25 }),
      });

      const res = await startSafeWalk(req);
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toBe('You already have an active Safe Walk');
      expect(body.walkId).toBe('walk-active-existing');
    });

    it('successfully starts a safe walk and calculates server expiration timestamp', async () => {
      const mockClient = createMockSupabase();
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/safe-walk/start', {
        method: 'POST',
        body: JSON.stringify({
          destination: 'Auditorium',
          expectedDurationMins: 45,
          startLatitude: 17.442,
          startLongitude: 78.345,
        }),
      });

      const res = await startSafeWalk(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.walkId).toBe('walk-new-777');
      expect(body.status).toBe('ACTIVE');

      expect(insertedWalkPayload?.student_id).toBe('student-usr-walk-1');
      expect(insertedWalkPayload?.destination).toBe('Auditorium');
      expect(insertedWalkPayload?.start_latitude).toBe(17.442);
      expect(insertedWalkPayload?.start_longitude).toBe(78.345);
      expect(insertedWalkPayload?.auto_sos_timeout_mins).toBe(45);
    });

    it('stores valid zero-valued coordinates and their timestamp', async () => {
      const mockClient = createMockSupabase();
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/safe-walk/start', {
        method: 'POST',
        body: JSON.stringify({
          destination: 'Equator test location',
          startLatitude: 0,
          startLongitude: 0,
        }),
      });

      const res = await startSafeWalk(req);
      expect(res.status).toBe(201);
      expect(insertedWalkPayload?.start_latitude).toBe(0);
      expect(insertedWalkPayload?.start_longitude).toBe(0);
      expect(insertedWalkPayload?.last_latitude).toBe(0);
      expect(insertedWalkPayload?.last_longitude).toBe(0);
      expect(insertedWalkPayload?.last_location_at).toEqual(expect.any(String));
    });
  });

  describe('Safe Walk End API (src/app/api/safe-walk/end/route.ts)', () => {
    it('rejects unauthenticated request with 401', async () => {
      const mockClient = createMockSupabase({ user: null });
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/safe-walk/end', {
        method: 'POST',
        body: JSON.stringify({ walkId: 'walk-abc-123' }),
      });

      const res = await endSafeWalk(req);
      expect(res.status).toBe(401);
    });

    it('rejects missing walkId with 400 Bad Request', async () => {
      const mockClient = createMockSupabase();
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/safe-walk/end', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const res = await endSafeWalk(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Safe Walk ID is required');
    });

    it('returns 404 when safe walk does not exist', async () => {
      const mockClient = createMockSupabase({ existingWalkForEnd: null });
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/safe-walk/end', {
        method: 'POST',
        body: JSON.stringify({ walkId: 'non-existent-walk' }),
      });

      const res = await endSafeWalk(req);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Safe walk not found');
    });

    it('rejects ending another student’s safe walk with 403 Forbidden', async () => {
      // Walk belongs to another student
      const mockClient = createMockSupabase({
        existingWalkForEnd: {
          id: 'walk-abc-123',
          student_id: 'other-student-999',
          status: 'ACTIVE',
        },
      });
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/safe-walk/end', {
        method: 'POST',
        body: JSON.stringify({ walkId: 'walk-abc-123' }),
      });

      const res = await endSafeWalk(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('Forbidden: You do not own this safe walk');
    });

    it('rejects ending a walk that is not currently ACTIVE with 400', async () => {
      const mockClient = createMockSupabase({
        existingWalkForEnd: {
          id: 'walk-abc-123',
          student_id: 'student-usr-walk-1',
          status: 'COMPLETED',
        },
      });
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/safe-walk/end', {
        method: 'POST',
        body: JSON.stringify({ walkId: 'walk-abc-123' }),
      });

      const res = await endSafeWalk(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Cannot end walk in status: COMPLETED');
    });

    it('successfully ends active walk and updates status to COMPLETED', async () => {
      const mockClient = createMockSupabase();
      vi.mocked(createClient).mockResolvedValue(mockClient as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/safe-walk/end', {
        method: 'POST',
        body: JSON.stringify({ walkId: 'walk-abc-123' }),
      });

      const res = await endSafeWalk(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.walkId).toBe('walk-abc-123');
      expect(body.status).toBe('COMPLETED');
      expect(updatedWalkPayload?.status).toBe('COMPLETED');
      expect(updatedWalkPayload?.completed_at).toBeDefined();
    });
  });
});
