import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as handleSosPost } from '@/app/api/sos/route';
import { POST as handleSosLocationPost } from '@/app/api/sos/location/route';
import { POST as startSafeWalk } from '@/app/api/safe-walk/start/route';
import { POST as endSafeWalk } from '@/app/api/safe-walk/end/route';
import { POST as handleSafeWalkTimeoutCron } from '@/app/api/cron/safe-walk-timeout/route';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

describe('SOS & Safe Walk Production End-to-End Workflow Verification', () => {
  const studentUser = { id: 'usr-student-e2e-01' };
  const securityGuard = { id: 'usr-security-e2e-99', role: 'SECURITY' };
  const mockCronSecret = 'test-cron-secret-12345';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = mockCronSecret;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-12345678901234567890';
  });

  it('verifies complete Student SOS production workflow: trigger -> dispatch -> live location updates -> audit', async () => {
    const createdIncidents: Record<string, unknown>[] = [];
    const createdLocations: Record<string, unknown>[] = [];
    const createdNotifications: Record<string, unknown>[] = [];
    const createdAuditLogs: Record<string, unknown>[] = [];

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: studentUser } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    in: vi.fn(() => ({
                      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                    })),
                  })),
                })),
              })),
            })),
            insert: vi.fn((payload: Record<string, unknown>) => {
              createdIncidents.push(payload);
              return {
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'inc-sos-e2e-101', ...payload },
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
              createdLocations.push(payload);
              return {
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'loc-sos-01', ...payload },
                    error: null,
                  }),
                })),
              };
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: [securityGuard],
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'notifications') {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              createdNotifications.push(payload);
              return Promise.resolve({ error: null });
            }),
          };
        }
        if (table === 'trusted_contacts') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [{ name: 'Campus Friend', phone: '+919876543210' }],
                error: null,
              }),
            })),
          };
        }
        if (table === 'audit_logs') {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              createdAuditLogs.push(payload);
              return Promise.resolve({ error: null });
            }),
          };
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        };
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    // 1. Student Triggers SOS with GPS
    const sosReq = new Request('http://localhost:3000/api/sos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: 17.385044,
        longitude: 78.486671,
        accuracy: 5.5,
        emergency_type: 'PANIC_BUTTON',
      }),
    });

    const sosRes = await handleSosPost(sosReq);
    expect(sosRes.status).toBe(201);
    const sosBody = await sosRes.json();
    expect(sosBody.success).toBe(true);
    expect(sosBody.incidentId).toBe('inc-sos-e2e-101');

    // Verify incident creation
    expect(createdIncidents).toHaveLength(1);
    expect(createdIncidents[0]).toMatchObject({
      student_id: studentUser.id,
      severity: 'CRITICAL',
      category: 'EMERGENCY',
    });

    // Verify dispatch notifications
    expect(createdNotifications.length).toBeGreaterThanOrEqual(1);
    expect(createdNotifications[0]).toMatchObject({
      user_id: securityGuard.id,
      type: 'EMERGENCY',
    });

    // Verify initial location capture
    expect(createdLocations).toHaveLength(1);
    expect(createdLocations[0]).toMatchObject({
      incident_id: 'inc-sos-e2e-101',
      latitude: 17.385044,
      longitude: 78.486671,
      accuracy: 5.5,
    });

    // Verify audit log
    expect(createdAuditLogs[0]).toMatchObject({
      actor_id: studentUser.id,
      action: 'SOS_ACTIVATED',
      entity_type: 'incidents',
    });

    // 2. Student streams live GPS location trail
    const liveLocSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: studentUser } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'inc-sos-e2e-101',
                    student_id: studentUser.id,
                    status: 'IN_PROGRESS',
                    is_tracking_active: true,
                  },
                  error: null,
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
        if (table === 'incident_locations') {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              createdLocations.push(payload);
              return Promise.resolve({ error: null });
            }),
          };
        }
        return {};
      }),
    };
    vi.mocked(createClient).mockResolvedValue(liveLocSupabase as never);

    const locReq = new Request('http://localhost:3000/api/sos/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incidentId: 'inc-sos-e2e-101',
        latitude: 17.385500,
        longitude: 78.487000,
        accuracy: 4.2,
      }),
    });

    const locRes = await handleSosLocationPost(locReq);
    expect(locRes.status).toBe(200);
    expect(createdLocations).toHaveLength(2);
    expect(createdLocations[1]).toMatchObject({
      incident_id: 'inc-sos-e2e-101',
      latitude: 17.3855,
      longitude: 78.487,
    });
  });

  it('verifies complete Safe Walk production lifecycle: start -> safe arrival completion', async () => {
    const createdWalks: Record<string, unknown>[] = [];
    const walkUpdates: Record<string, unknown>[] = [];
    const auditLogs: Record<string, unknown>[] = [];

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: studentUser } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'STUDENT' },
                  error: null,
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
                  return {
                    single: vi.fn().mockResolvedValue({
                      data: { id: 'walk-e2e-500', student_id: studentUser.id, status: 'ACTIVE' },
                      error: null,
                    }),
                  };
                }
                return {
                  eq: vi.fn(() => ({
                    limit: vi.fn().mockResolvedValue({
                      data: [],
                      error: null,
                    }),
                  })),
                };
              }),
            })),
            insert: vi.fn((payload: Record<string, unknown>) => {
              createdWalks.push(payload);
              return {
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'walk-e2e-500', status: 'ACTIVE', expires_at: new Date(Date.now() + 1500000).toISOString(), ...payload },
                    error: null,
                  }),
                })),
              };
            }),
            update: vi.fn((payload: Record<string, unknown>) => {
              walkUpdates.push(payload);
              return {
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    select: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({
                        data: { id: 'walk-e2e-500', status: payload.status, completed_at: new Date().toISOString() },
                        error: null,
                      }),
                    })),
                  })),
                  select: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: { id: 'walk-e2e-500', status: payload.status, completed_at: new Date().toISOString() },
                      error: null,
                    }),
                  })),
                })),
              };
            }),
          };
        }
        if (table === 'audit_logs') {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              auditLogs.push(payload);
              return Promise.resolve({ error: null });
            }),
          };
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    // 1. Student initiates Safe Walk
    const startReq = new Request('http://localhost:3000/api/safe-walk/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: 'Library Block C',
        expectedDurationMins: 25,
      }),
    });

    const startRes = await startSafeWalk(startReq);
    expect(startRes.status).toBe(201);
    const startBody = await startRes.json();
    expect(startBody.walkId).toBe('walk-e2e-500');
    expect(createdWalks[0]).toMatchObject({
      student_id: studentUser.id,
      destination: 'Library Block C',
      auto_sos_timeout_mins: 25,
      status: 'ACTIVE',
    });

    // 2. Student arrives safely and ends the walk
    const endReq = new Request('http://localhost:3000/api/safe-walk/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walkId: 'walk-e2e-500',
      }),
    });

    const endRes = await endSafeWalk(endReq);
    expect(endRes.status).toBe(200);
    const endBody = await endRes.json();
    expect(endBody.success).toBe(true);
    expect(walkUpdates[0]).toMatchObject({ status: 'COMPLETED' });
    expect(endBody.walkId).toBe('walk-e2e-500');
    expect(endBody.status).toBe('COMPLETED');
  });

  it('verifies overdue Safe Walk timeout cron: auto-converts to SOS incident and alerts security', async () => {
    const overdueWalk = {
      id: 'walk-overdue-888',
      student_id: 'usr-student-overdue-1',
      destination: 'Girls Hostel 4',
      auto_sos_enabled: true,
      status: 'ACTIVE',
    };

    const createdIncidents: Record<string, unknown>[] = [];
    const walkUpdates: Record<string, unknown>[] = [];
    const auditLogs: Record<string, unknown>[] = [];

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'safe_walks') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                lt: vi.fn().mockResolvedValue({
                  data: [overdueWalk],
                  error: null,
                }),
              })),
            })),
            update: vi.fn((payload: Record<string, unknown>) => {
              walkUpdates.push(payload);
              const chain = () => ({
                eq: vi.fn(() => chain()),
                select: vi.fn().mockResolvedValue({
                  data: [{ id: overdueWalk.id }],
                  error: null,
                }),
                then: (resolve: (val: unknown) => void) => resolve({ data: [{ id: overdueWalk.id }], error: null }),
              });
              return {
                eq: vi.fn(() => chain()),
              };
            }),
          };
        }
        if (table === 'incidents') {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              createdIncidents.push(payload);
              return {
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'inc-auto-sos-999', ...payload },
                    error: null,
                  }),
                })),
              };
            }),
          };
        }
        if (table === 'audit_logs') {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              auditLogs.push(payload);
              return Promise.resolve({ error: null });
            }),
          };
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as unknown as ReturnType<typeof createAdminClient>);

    const cronReq = new Request('http://localhost:3000/api/cron/safe-walk-timeout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mockCronSecret}` },
    });

    const cronRes = await handleSafeWalkTimeoutCron(cronReq);
    expect(cronRes.status).toBe(200);
    const cronBody = await cronRes.json();
    expect(cronBody.escalatedCount).toBe(1);

    // Verify auto SOS incident created
    expect(createdIncidents).toHaveLength(1);
    expect(createdIncidents[0]).toMatchObject({
      student_id: overdueWalk.student_id,
      type: 'SAFE_WALK_TIMEOUT',
      severity: 'HIGH',
      status: 'RECEIVED',
    });

    // Verify walk status marked OVERDUE
    expect(walkUpdates).toContainEqual(
      expect.objectContaining({ status: 'OVERDUE' })
    );

    // Verify audit log has actor_id: null (UUID compliance for system actions)
    expect(auditLogs).toContainEqual(
      expect.objectContaining({
        actor_id: null,
        action: 'SAFE_WALK_ESCALATED',
        entity_id: overdueWalk.id,
      })
    );
  });
});
