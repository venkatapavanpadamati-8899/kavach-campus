import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/admin/analytics/route';
import { createClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('Admin Real Database Analytics API (src/app/api/admin/analytics/route.ts)', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  function createMockSupabase(
    user: { id: string } | null = { id: 'admin-usr-1' },
    role: string = 'ADMIN',
    incidentsData: Array<Record<string, unknown>> = []
  ) {
    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: user ? { role } : null,
                  error: user ? null : { message: 'Not found' },
                }),
              })),
            })),
          };
        }
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: incidentsData,
                error: null,
              }),
            })),
          };
        }
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests with 401 Unauthorized', async () => {
    mockSupabase = createMockSupabase(null);
    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/admin/analytics');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('rejects student requests with 403 Forbidden', async () => {
    mockSupabase = createMockSupabase({ id: 'student-usr-9' }, 'STUDENT');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/admin/analytics');
    const res = await GET(req);

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Forbidden');
  });

  it('rejects unverified or non-admin staff roles (e.g., STAFF) with 403 Forbidden', async () => {
    mockSupabase = createMockSupabase({ id: 'staff-usr-4' }, 'STAFF');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/admin/analytics');
    const res = await GET(req);

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Forbidden');
  });

  it('returns clean zero-state metrics when no incidents exist in database', async () => {
    mockSupabase = createMockSupabase({ id: 'admin-usr-1' }, 'ADMIN', []);
    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/admin/analytics');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.metrics.totalComplaints).toBe(0);
    expect(json.metrics.todayComplaints).toBe(0);
    expect(json.metrics.resolutionRate).toBe(0);
    expect(json.metrics.hotspots).toEqual([]);
  });

  it('computes accurate real database metrics across time, category, severity, and resolution times', async () => {
    const now = new Date();
    const todayIso = now.toISOString();
    const yesterdayIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const mockIncidents = [
      {
        id: 'inc-1',
        case_id: 'KC-2026-001',
        category: 'HARASSMENT',
        severity: 'HIGH',
        status: 'RESOLVED',
        created_at: todayIso,
        assigned_at: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
        resolved_at: new Date(now.getTime() + 25 * 60 * 1000).toISOString(),
        location_name: 'Library Corridor',
        latitude: 14.50,
        longitude: 78.50,
      },
      {
        id: 'inc-2',
        case_id: 'KC-2026-002',
        category: 'EMERGENCY',
        severity: 'CRITICAL',
        status: 'ESCALATED',
        created_at: todayIso,
        assigned_at: null,
        resolved_at: null,
        location_name: 'Hostel Block B',
        latitude: 14.51,
        longitude: 78.51,
      },
      {
        id: 'inc-3',
        case_id: 'KC-2026-003',
        category: 'MAINTENANCE',
        severity: 'LOW',
        status: 'RECEIVED',
        created_at: yesterdayIso,
        assigned_at: null,
        resolved_at: null,
        location_name: 'Hostel Block B',
        latitude: 14.51,
        longitude: 78.51,
      },
    ];

    mockSupabase = createMockSupabase({ id: 'admin-usr-1' }, 'SUPER_ADMIN', mockIncidents);
    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/admin/analytics');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    const m = json.metrics;
    expect(m.totalComplaints).toBe(3);
    expect(m.todayComplaints).toBe(2);
    expect(m.resolvedCount).toBe(1);
    expect(m.escalationCount).toBe(1);
    expect(m.harassmentStalkingCount).toBe(1);
    expect(m.severityBreakdown.CRITICAL).toBe(1);
    expect(m.severityBreakdown.HIGH).toBe(1);
    expect(m.severityBreakdown.LOW).toBe(1);
    expect(m.categoryBreakdown.HARASSMENT).toBe(1);
    expect(m.categoryBreakdown.EMERGENCY).toBe(1);
    expect(m.categoryBreakdown.MAINTENANCE).toBe(1);
    expect(m.avgAckMinutes).toBe(5);
    expect(m.avgResolutionMinutes).toBe(25);
    expect(m.resolutionRate).toBe(33.3);

    // Verify Hotspots without student PII
    expect(m.hotspots.length).toBe(2);
    expect(m.hotspots[0].location).toBe('Hostel Block B');
    expect(m.hotspots[0].count).toBe(2);
    expect(m.hotspots[1].location).toBe('Library Corridor');
    expect(m.hotspots[1].count).toBe(1);
  });
});
