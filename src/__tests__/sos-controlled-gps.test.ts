import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/sos/route';
import { createClient } from '@/lib/supabase/server';
import {
  insertInAppNotification,
  sendPushNotification,
  sendSmsNotification,
} from '@/lib/notifications';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/notifications', () => ({
  insertInAppNotification: vi.fn(),
  sendPushNotification: vi.fn(),
  sendSmsNotification: vi.fn(),
}));

describe('Controlled GPS SOS test isolation', () => {
  const student = { id: 'student-test-1' };
  let insertedIncidents: Record<string, unknown>[];
  let insertedLocations: Record<string, unknown>[];
  let insertedAuditLogs: Record<string, unknown>[];
  let recentTests: { id: string }[];
  let locationInsertError: { message: string } | null;
  let profile: { role: string } | null;
  let profileError: { message: string } | null;
  let incidentQueryLimit: ReturnType<typeof vi.fn>;

  function createMockSupabase(user: typeof student | null = student) {
    const queryState: Record<string, unknown> = {};
    const incidentQuery: Record<string, ReturnType<typeof vi.fn>> = {};
    incidentQuery.select = vi.fn(() => incidentQuery);
    incidentQuery.eq = vi.fn((column: string, value: unknown) => {
      queryState[column] = value;
      return incidentQuery;
    });
    incidentQuery.gte = vi.fn((column: string, value: unknown) => {
      queryState[column] = value;
      return incidentQuery;
    });
    incidentQuery.in = vi.fn((column: string, value: unknown) => {
      queryState[column] = value;
      return incidentQuery;
    });
    incidentQuery.limit = incidentQueryLimit = vi.fn(async () => ({
      data: queryState.description ? recentTests : [],
      error: null,
    }));

    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: profile,
                  error: profileError,
                }),
              })),
            })),
          };
        }
        if (table === 'incidents') {
          return {
            select: vi.fn(() => incidentQuery),
            insert: vi.fn((payload: Record<string, unknown>) => {
              insertedIncidents.push(payload);
              return {
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'test-incident-1', ...payload },
                    error: null,
                  }),
                })),
              };
            }),
          };
        }
        if (table === 'incident_locations') {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              insertedLocations.push(payload);
              return Promise.resolve({ error: locationInsertError });
            }),
          };
        }
        if (table === 'audit_logs') {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              insertedAuditLogs.push(payload);
              return Promise.resolve({ error: null });
            }),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }),
    };
  }

  function makeRequest(body: Record<string, unknown>) {
    return new Request('http://localhost:3000/api/sos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    insertedIncidents = [];
    insertedLocations = [];
    insertedAuditLogs = [];
    recentTests = [];
    locationInsertError = null;
    profile = { role: 'STUDENT' };
    profileError = null;
    vi.mocked(createClient).mockResolvedValue(createMockSupabase() as never);
  });

  it('creates only a student-owned test incident and never dispatches notifications', async () => {
    const res = await POST(makeRequest({
      isTest: true,
      latitude: 17.44,
      longitude: 78.34,
      accuracy: 5.2,
      student_id: 'another-student',
    }));

    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({
      success: true,
      isTest: true,
      incidentId: 'test-incident-1',
      accuracy: 5.2,
    });
    expect(insertedIncidents).toHaveLength(1);
    expect(insertedIncidents[0]).toMatchObject({
      student_id: student.id,
      description: '[CONTROLLED TEST] Mobile GPS Verification',
      severity: 'LOW',
      urgency: 'LOW',
      status: 'RESOLVED',
      is_tracking_active: false,
    });
    expect(insertedLocations).toEqual([{
      incident_id: 'test-incident-1',
      latitude: 17.44,
      longitude: 78.34,
      accuracy: 5.2,
    }]);
    expect(insertedAuditLogs).toHaveLength(1);
    expect(sendPushNotification).not.toHaveBeenCalled();
    expect(sendSmsNotification).not.toHaveBeenCalled();
    expect(insertInAppNotification).not.toHaveBeenCalled();
  });

  it('rejects a non-student even when authenticated', async () => {
    profile = { role: 'SECURITY' };
    vi.mocked(createClient).mockResolvedValue(createMockSupabase() as never);

    const res = await POST(makeRequest({
      isTest: true,
      latitude: 17.44,
      longitude: 78.34,
      accuracy: 5.2,
    }));

    expect(res.status).toBe(403);
    expect(insertedIncidents).toHaveLength(0);
    expect(incidentQueryLimit).not.toHaveBeenCalled();
  });

  it('requires coordinates and finite positive accuracy for the controlled test', async () => {
    const res = await POST(makeRequest({
      isTest: true,
      latitude: 17.44,
      longitude: 78.34,
      accuracy: 0,
    }));

    expect(res.status).toBe(400);
    expect(insertedIncidents).toHaveLength(0);
  });

  it('rejects repeated controlled tests within the server-side cooldown', async () => {
    recentTests = [{ id: 'recent-test-incident' }];
    vi.mocked(createClient).mockResolvedValue(createMockSupabase() as never);

    const res = await POST(makeRequest({
      isTest: true,
      latitude: 17.44,
      longitude: 78.34,
      accuracy: 5.2,
    }));

    expect(res.status).toBe(429);
    expect(insertedIncidents).toHaveLength(0);
  });

  it('does not report success when the location persistence insert fails', async () => {
    locationInsertError = { message: 'database unavailable' };
    vi.mocked(createClient).mockResolvedValue(createMockSupabase() as never);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(makeRequest({
      isTest: true,
      latitude: 17.44,
      longitude: 78.34,
      accuracy: 5.2,
    }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to save controlled location test' });
    expect(insertedIncidents).toHaveLength(1);
    expect(insertedAuditLogs).toHaveLength(0);
    expect(sendPushNotification).not.toHaveBeenCalled();
    expect(sendSmsNotification).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
