import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as runSafeWalkTimeoutCron, GET as getSafeWalkTimeoutCron } from '@/app/api/cron/safe-walk-timeout/route';
import { POST as runEscalateCron, GET as getEscalateCron } from '@/app/api/cron/escalate/route';
import { createAdminClient } from '@/lib/supabase/admin';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

describe('Cron Workflows & Automated Escalation APIs', () => {
  const CRON_SECRET = 'test-cron-secret-key-123';
  let insertedAuditLogs: Record<string, unknown>[] = [];
  let insertedEscalations: Record<string, unknown>[] = [];
  let insertedIncidents: Record<string, unknown>[] = [];
  let updatedWalkStatus: string | null = null;
  let updatedIncidentStatus: string | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-12345678901234567890';
    insertedAuditLogs = [];
    insertedEscalations = [];
    insertedIncidents = [];
    updatedWalkStatus = null;
    updatedIncidentStatus = null;
  });

  describe('Safe Walk Timeout Cron (src/app/api/cron/safe-walk-timeout/route.ts)', () => {
    function createMockSupabaseForSafeWalk({
      overdueWalks = [
        {
          id: 'walk-expired-1',
          student_id: 'student-usr-walk-9',
          destination: 'Hostel Block C',
          auto_sos_enabled: true,
          status: 'ACTIVE',
        },
      ] as { id: string; student_id: string; destination: string; auto_sos_enabled: boolean; status: string }[],
      crashedWalks = [] as { id: string; student_id: string; destination: string; auto_sos_enabled: boolean; status: string }[],
      concurrencyRaceWonByOther = false,
    } = {}) {
      return {
        from: vi.fn((table: string) => {
          if (table === 'safe_walks') {
            return {
              select: vi.fn(() => {
                const makeFilterChain = (isOverdueQuery = false): unknown => ({
                  eq: vi.fn((_col: string, val: unknown) => makeFilterChain(val === 'OVERDUE' || isOverdueQuery)),
                  lt: vi.fn().mockResolvedValue({
                    data: isOverdueQuery ? crashedWalks : overdueWalks,
                    error: null,
                  }),
                  is: vi.fn().mockResolvedValue({
                    data: crashedWalks,
                    error: null,
                  }),
                });
                return makeFilterChain();
              }),
              update: vi.fn((payload: Record<string, unknown>) => {
                if (payload.status) updatedWalkStatus = payload.status as string;
                const updatedData = concurrencyRaceWonByOther ? [] : [{ id: 'walk-expired-1' }];
                const makeEqChain = () => ({
                  eq: vi.fn(() => makeEqChain()),
                  select: vi.fn().mockResolvedValue({
                    data: updatedData,
                    error: null,
                  }),
                  then: (resolve: (val: unknown) => void) => resolve({ data: updatedData, error: null }),
                });
                return {
                  eq: vi.fn(() => makeEqChain()),
                };
              }),
            };
          }
          if (table === 'incidents') {
            return {
              insert: vi.fn((payload: Record<string, unknown>) => {
                insertedIncidents.push(payload);
                return {
                  select: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: { id: 'inc-auto-sos-888' },
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
                insertedAuditLogs.push(payload);
                return Promise.resolve({ data: null, error: null });
              }),
            };
          }
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      };
    }

    it('rejects unauthorized cron invocation when Bearer secret is missing or invalid', async () => {
      const req = new Request('http://localhost:3000/api/cron/safe-walk-timeout', {
        method: 'POST',
        headers: { authorization: 'Bearer invalid-secret' },
      });

      const res = await runSafeWalkTimeoutCron(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('strictly rejects query parameter secret (?secret=...) with 401 to prevent URL log leakage', async () => {
      const req = new Request(`http://localhost:3000/api/cron/safe-walk-timeout?secret=${CRON_SECRET}`, {
        method: 'POST',
      });

      const res = await runSafeWalkTimeoutCron(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('strictly rejects non-Bearer headers such as x-cron-secret with 401 when Bearer auth is enforced', async () => {
      const req = new Request('http://localhost:3000/api/cron/safe-walk-timeout', {
        method: 'POST',
        headers: { 'x-cron-secret': CRON_SECRET },
      });

      const res = await runSafeWalkTimeoutCron(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('recovers crashed safe walks (marked OVERDUE but interrupted before incident creation) and raises emergency SOS', async () => {
      const mockClient = createMockSupabaseForSafeWalk({
        overdueWalks: [],
        crashedWalks: [
          {
            id: 'walk-interrupted-crash-1',
            student_id: 'student-usr-walk-9',
            destination: 'Hostel Block C',
            auto_sos_enabled: true,
            status: 'OVERDUE',
          },
        ],
      });
      vi.mocked(createAdminClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createAdminClient>);

      const req = new Request('http://localhost:3000/api/cron/safe-walk-timeout', {
        method: 'POST',
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });

      const res = await runSafeWalkTimeoutCron(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.escalatedCount).toBe(1);
      expect(insertedIncidents[0]).toMatchObject({
        student_id: 'student-usr-walk-9',
        type: 'SAFE_WALK_TIMEOUT',
        severity: 'HIGH',
      });
    });

    it('rejects invalid secret of identical byte length with 401 using timingSafeEqual', async () => {
      const equalLengthTampered = 'test-cron-secret-key-999';
      expect(equalLengthTampered.length).toBe(CRON_SECRET.length);

      const req = new Request('http://localhost:3000/api/cron/safe-walk-timeout', {
        method: 'POST',
        headers: { authorization: `Bearer ${equalLengthTampered}` },
      });

      const res = await runSafeWalkTimeoutCron(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('fails closed when the service-role database key is not configured', async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const req = new Request('http://localhost:3000/api/cron/safe-walk-timeout', {
        method: 'POST',
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });

      const res = await runSafeWalkTimeoutCron(req);
      expect(res.status).toBe(503);
      expect(createAdminClient).not.toHaveBeenCalled();
    });

    it('returns 200 with notice when no overdue walks are found', async () => {
      const mockClient = createMockSupabaseForSafeWalk({ overdueWalks: [] });
      vi.mocked(createAdminClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createAdminClient>);

      const req = new Request('http://localhost:3000/api/cron/safe-walk-timeout', {
        method: 'POST',
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });

      const res = await runSafeWalkTimeoutCron(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toBe('No overdue safe walks found');
    });

    it('transitions overdue walk to OVERDUE, raises Auto-SOS incident, and writes audit log with null actor_id', async () => {
      const mockClient = createMockSupabaseForSafeWalk();
      vi.mocked(createAdminClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createAdminClient>);

      const req = new Request('http://localhost:3000/api/cron/safe-walk-timeout', {
        method: 'POST',
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });

      const res = await runSafeWalkTimeoutCron(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.overdueProcessed).toBe(1);
      expect(json.escalatedCount).toBe(1);

      expect(updatedWalkStatus).toBe('OVERDUE');
      expect(insertedIncidents[0]).toMatchObject({
        student_id: 'student-usr-walk-9',
        type: 'SAFE_WALK_TIMEOUT',
        severity: 'HIGH',
      });

      // Verify UUID constraint compliance: actor_id must be null for SYSTEM actions
      expect(insertedAuditLogs[0]).toMatchObject({
        actor_id: null,
        action: 'SAFE_WALK_ESCALATED',
        entity_type: 'safe_walks',
        metadata: { actor: 'SYSTEM', incident_id: 'inc-auto-sos-888' },
      });
    });

    it('supports GET invocation via Vercel Cron when Bearer secret is valid', async () => {
      const mockClient = createMockSupabaseForSafeWalk({ overdueWalks: [] });
      vi.mocked(createAdminClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createAdminClient>);

      const req = new Request('http://localhost:3000/api/cron/safe-walk-timeout', {
        method: 'GET',
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });

      const res = await getSafeWalkTimeoutCron(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toBe('No overdue safe walks found');
    });

    it('prevents duplicate SOS incidents if concurrent execution already transitioned the walk', async () => {
      const mockClient = createMockSupabaseForSafeWalk({ concurrencyRaceWonByOther: true });
      vi.mocked(createAdminClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createAdminClient>);

      const req = new Request('http://localhost:3000/api/cron/safe-walk-timeout', {
        method: 'POST',
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });

      const res = await runSafeWalkTimeoutCron(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.escalatedCount).toBe(0);
      expect(insertedIncidents.length).toBe(0); // Zero duplicate incidents created
    });
  });

  describe('Staff Escalation Cron (src/app/api/cron/escalate/route.ts)', () => {
    function createMockSupabaseForEscalate({
      overdueIncidents = [
        {
          id: 'inc-unack-1',
          case_id: 'KC-2026-UNACK1',
          assigned_to: 'staff-guard-uuid-1',
          created_at: '2026-10-11T08:00:00Z',
        },
      ] as { id: string; case_id: string; assigned_to: string; created_at: string }[],
      concurrencyRaceWonByOther = false,
    } = {}) {
      return {
        from: vi.fn((table: string) => {
          if (table === 'incidents') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  lt: vi.fn().mockResolvedValue({
                    data: overdueIncidents,
                    error: null,
                  }),
                })),
              })),
              update: vi.fn((payload: Record<string, unknown>) => {
                if (payload.status) updatedIncidentStatus = payload.status as string;
                const updatedData = concurrencyRaceWonByOther ? [] : [{ id: 'inc-unack-1' }];
                const makeEqChain = () => ({
                  eq: vi.fn(() => makeEqChain()),
                  select: vi.fn().mockResolvedValue({
                    data: updatedData,
                    error: null,
                  }),
                  then: (resolve: (val: unknown) => void) => resolve({ data: updatedData, error: null }),
                });
                return {
                  eq: vi.fn(() => makeEqChain()),
                };
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
          if (table === 'notifications') {
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

    it('rejects unauthorized escalation cron requests with 401', async () => {
      const req = new Request('http://localhost:3000/api/cron/escalate', {
        method: 'POST',
      });
      const res = await runEscalateCron(req);
      expect(res.status).toBe(401);
    });

    it('strictly rejects query parameter secret (?secret=...) with 401 to prevent URL log leakage', async () => {
      const req = new Request(`http://localhost:3000/api/cron/escalate?secret=${CRON_SECRET}`, {
        method: 'POST',
      });
      const res = await runEscalateCron(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('strictly rejects non-Bearer headers such as x-cron-secret with 401 when Bearer auth is enforced', async () => {
      const req = new Request('http://localhost:3000/api/cron/escalate', {
        method: 'POST',
        headers: { 'x-cron-secret': CRON_SECRET },
      });

      const res = await runEscalateCron(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('rejects invalid secret of identical byte length with 401 using timingSafeEqual', async () => {
      const equalLengthTampered = 'test-cron-secret-key-999';
      const req = new Request('http://localhost:3000/api/cron/escalate', {
        method: 'POST',
        headers: { authorization: `Bearer ${equalLengthTampered}` },
      });

      const res = await runEscalateCron(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('fails closed when the service-role database key is not configured', async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const req = new Request('http://localhost:3000/api/cron/escalate', {
        method: 'POST',
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });

      const res = await runEscalateCron(req);
      expect(res.status).toBe(503);
      expect(createAdminClient).not.toHaveBeenCalled();
    });

    it('escalates overdue assigned incidents and writes audit log with null actor_id', async () => {
      const mockClient = createMockSupabaseForEscalate();
      vi.mocked(createAdminClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createAdminClient>);

      const req = new Request('http://localhost:3000/api/cron/escalate', {
        method: 'POST',
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });

      const res = await runEscalateCron(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.escalatedCount).toBe(1);

      expect(updatedIncidentStatus).toBe('ESCALATED');
      expect(insertedEscalations[0]).toMatchObject({
        incident_id: 'inc-unack-1',
        from_level: 'STAFF',
        to_level: 'ADMIN',
        reason: 'STAFF_TIMEOUT',
      });

      // Verify UUID constraint compliance: actor_id must be null for SYSTEM actions
      expect(insertedAuditLogs[0]).toMatchObject({
        actor_id: null,
        action: 'SOS_ESCALATED',
        entity_type: 'incidents',
        metadata: { actor: 'SYSTEM', reason: 'STAFF_TIMEOUT' },
      });
    });

    it('supports GET invocation via Vercel Cron when Bearer secret is valid', async () => {
      const mockClient = createMockSupabaseForEscalate({ overdueIncidents: [] });
      vi.mocked(createAdminClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createAdminClient>);

      const req = new Request('http://localhost:3000/api/cron/escalate', {
        method: 'GET',
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });

      const res = await getEscalateCron(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toBe('No overdue incidents found');
    });

    it('prevents duplicate escalations if concurrent execution already transitioned the incident', async () => {
      const mockClient = createMockSupabaseForEscalate({ concurrencyRaceWonByOther: true });
      vi.mocked(createAdminClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createAdminClient>);

      const req = new Request('http://localhost:3000/api/cron/escalate', {
        method: 'POST',
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });

      const res = await runEscalateCron(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.escalatedCount).toBe(0);
      expect(insertedEscalations.length).toBe(0); // Zero duplicate escalations created
    });
  });
});
