import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '@/app/api/super-admin/pending-campus/route';

const mockGetUser = vi.fn();
const mockServerFrom = vi.fn();
const mockAdminFrom = vi.fn();
const mockPendingQuery = {
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
};
const mockUpdateQuery = {
  eq: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
};
const mockAuditInsert = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockServerFrom,
  })),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

const targetUserId = '11111111-1111-4111-8111-111111111111';

function createAdminProfile(role = 'SUPER_ADMIN', isApproved = true) {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'reviewer-id' } } });
  mockServerFrom.mockReturnValue({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { role, is_approved: isApproved },
          error: null,
        }),
      })),
    })),
  });
}

describe('SUPER_ADMIN pending campus workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-that-is-long-enough';
    mockPendingQuery.select.mockReturnValue(mockPendingQuery);
    mockPendingQuery.eq.mockReturnValue(mockPendingQuery);
    mockPendingQuery.order.mockReturnValue(mockPendingQuery);
    mockPendingQuery.limit.mockResolvedValue({
      data: [{ id: targetUserId, college_id: 'PENDING_CAMPUS_VERIFICATION', is_approved: false }],
      error: null,
      count: 1,
    });
    mockUpdateQuery.eq.mockReturnValue(mockUpdateQuery);
    mockUpdateQuery.select.mockReturnValue(mockUpdateQuery);
    mockUpdateQuery.maybeSingle.mockResolvedValue({ data: { id: targetUserId }, error: null });
    mockAuditInsert.mockResolvedValue({ error: null });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: mockPendingQuery.select,
          eq: mockPendingQuery.eq,
          order: mockPendingQuery.order,
          limit: mockPendingQuery.limit,
          update: vi.fn(() => mockUpdateQuery),
        };
      }
      if (table === 'audit_logs') return { insert: mockAuditInsert };
      return {};
    });
  });

  it('denies unauthenticated callers before using the service-role client', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await GET();

    expect(response.status).toBe(401);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it('denies ordinary or unapproved administrators', async () => {
    createAdminProfile('ADMIN', true);
    const response = await GET();
    expect(response.status).toBe(403);

    createAdminProfile('SUPER_ADMIN', false);
    const unapprovedResponse = await GET();
    expect(unapprovedResponse.status).toBe(403);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it('lists only the pending unapproved accounts with a bounded result size', async () => {
    createAdminProfile();
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      accounts: [{ id: targetUserId }],
      hasMore: false,
    });
    expect(mockPendingQuery.eq).toHaveBeenCalledWith('college_id', 'PENDING_CAMPUS_VERIFICATION');
    expect(mockPendingQuery.eq).toHaveBeenCalledWith('is_approved', false);
    expect(mockPendingQuery.limit).toHaveBeenCalledWith(100);
  });

  it('rejects an unregistered campus before updating an account', async () => {
    createAdminProfile();
    const response = await POST(new Request('http://localhost/api/super-admin/pending-campus', {
      method: 'POST',
      body: JSON.stringify({
        targetUserId,
        collegeId: 'unregistered-campus',
        campusVerified: true,
        reviewNote: 'Verified with an authorized source',
      }),
    }));

    expect(response.status).toBe(400);
    expect(mockUpdateQuery.maybeSingle).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON and requests without independent verification', async () => {
    createAdminProfile();
    const invalidJsonResponse = await POST(new Request('http://localhost/api/super-admin/pending-campus', {
      method: 'POST',
      body: '{',
    }));
    expect(invalidJsonResponse.status).toBe(400);

    const unverifiedResponse = await POST(new Request('http://localhost/api/super-admin/pending-campus', {
      method: 'POST',
      body: JSON.stringify({
        targetUserId,
        collegeId: 'srkr-bhimavaram',
        campusVerified: false,
        reviewNote: 'Verified using an authorized institutional source',
      }),
    }));
    expect(unverifiedResponse.status).toBe(400);
    expect(mockUpdateQuery.maybeSingle).not.toHaveBeenCalled();
  });

  it('assigns a verified campus without approving the account and records the review', async () => {
    createAdminProfile();
    const response = await POST(new Request('http://localhost/api/super-admin/pending-campus', {
      method: 'POST',
      body: JSON.stringify({
        targetUserId,
        collegeId: 'vit-bhimavaram',
        campusVerified: true,
        reviewNote: 'Verified using the institutional registrar',
      }),
    }));

    expect(response.status).toBe(200);
    expect(mockUpdateQuery.eq).toHaveBeenCalledWith('college_id', 'PENDING_CAMPUS_VERIFICATION');
    expect(mockUpdateQuery.eq).toHaveBeenCalledWith('is_approved', false);
    expect(mockAuditInsert).toHaveBeenCalledWith(expect.objectContaining({
      action: 'ASSIGN_PENDING_USER_CAMPUS',
      entity_id: targetUserId,
      metadata: expect.objectContaining({
        assignedCollegeId: 'vishnu-bhimavaram',
        accountRemainsUnapproved: true,
      }),
    }));
  });

  it('returns conflict when the target is no longer pending', async () => {
    createAdminProfile();
    mockUpdateQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const response = await POST(new Request('http://localhost/api/super-admin/pending-campus', {
      method: 'POST',
      body: JSON.stringify({
        targetUserId,
        collegeId: 'srkr-bhimavaram',
        campusVerified: true,
        reviewNote: 'Verified using an authorized institutional source',
      }),
    }));

    expect(response.status).toBe(409);
    expect(mockAuditInsert).not.toHaveBeenCalled();
  });

  it('reports audit failure explicitly after assignment instead of claiming success', async () => {
    createAdminProfile();
    mockAuditInsert.mockResolvedValueOnce({ error: new Error('audit unavailable') });
    const response = await POST(new Request('http://localhost/api/super-admin/pending-campus', {
      method: 'POST',
      body: JSON.stringify({
        targetUserId,
        collegeId: 'srkr-bhimavaram',
        campusVerified: true,
        reviewNote: 'Verified using an authorized institutional source',
      }),
    }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('do not retry'),
    });
  });
});
