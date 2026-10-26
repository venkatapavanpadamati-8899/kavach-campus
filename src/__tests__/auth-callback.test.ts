import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/auth/callback/route';

// Mock Supabase Server Client
const mockExchangeCodeForSession = vi.fn();
const mockGetUser = vi.fn();
const mockProfileSingle = vi.fn();
const mockProfileEq = vi.fn(() => ({ single: mockProfileSingle }));
const mockProfileSelect = vi.fn(() => ({ eq: mockProfileEq }));

const mockSupabaseServer = {
  auth: {
    exchangeCodeForSession: mockExchangeCodeForSession,
    getUser: mockGetUser,
  },
  from: vi.fn((table: string) => {
    if (table === 'profiles') {
      return { select: mockProfileSelect };
    }
    return {
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) })),
    };
  }),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseServer),
}));

// Mock Supabase Admin Client
const mockAdminProfilesInsert = vi.fn();
const mockAdminStudentProfilesUpsert = vi.fn();

const mockSupabaseAdmin = {
  from: vi.fn((table: string) => {
    if (table === 'profiles') {
      return { insert: mockAdminProfilesInsert };
    }
    if (table === 'student_profiles') {
      return { upsert: mockAdminStudentProfilesUpsert };
    }
    return {};
  }),
};

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockSupabaseAdmin),
}));

describe('OAuth Callback Handler (src/app/api/auth/callback/route.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /login with error when provider returns oauth error parameter', async () => {
    const request = new Request(
      'http://localhost:3000/api/auth/callback?error=access_denied&error_description=User%20declined%20consent'
    );

    const response = await GET(request);
    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toBe('http://localhost:3000/login?error=User%20declined%20consent');
  });

  it('redirects to /login?error=google_oauth_client_deleted when provider returns deleted_client or invalid_client', async () => {
    const request = new Request(
      'http://localhost:3000/api/auth/callback?error=deleted_client&error_description=The%20OAuth%20client%20was%20deleted.'
    );

    const response = await GET(request);
    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toBe('http://localhost:3000/login?error=google_oauth_client_deleted');
  });

  it('redirects to /login when authorization code is completely missing', async () => {
    const request = new Request('http://localhost:3000/api/auth/callback');

    const response = await GET(request);
    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toBe('http://localhost:3000/login?error=Missing%20authorization%20code');
  });

  it('redirects to /login when exchangeCodeForSession fails', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({
      error: { message: 'Invalid or expired grant code' },
    });

    const request = new Request('http://localhost:3000/api/auth/callback?code=bad-auth-code');
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toBe('http://localhost:3000/login?error=Invalid%20or%20expired%20grant%20code');
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('bad-auth-code');
  });

  it('redirects to /login when getUser returns null user session', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    const request = new Request('http://localhost:3000/api/auth/callback?code=valid-code');
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toBe('http://localhost:3000/login?error=Could%20not%20retrieve%20user%20session');
  });

  it('authenticates existing STUDENT and redirects to /student', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: { id: 'usr-student-1', email: 'student1@kavach.edu' },
      },
    });
    mockProfileSingle.mockResolvedValueOnce({
      data: { role: 'STUDENT', is_approved: true },
    });

    const request = new Request('http://localhost:3000/api/auth/callback?code=valid-code');
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toBe('http://localhost:3000/student');
  });

  it('authenticates existing ADMIN and redirects to /admin', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: { id: 'usr-admin-1', email: 'admin@kavach.edu' },
      },
    });
    mockProfileSingle.mockResolvedValueOnce({
      data: { role: 'ADMIN', is_approved: true },
    });

    const request = new Request('http://localhost:3000/api/auth/callback?code=valid-code');
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toBe('http://localhost:3000/admin');
  });

  it('auto-provisions new profile and student_profiles on first Google login', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: {
          id: 'usr-new-google-user',
          email: 'newuser@kavach.edu',
          user_metadata: { full_name: 'Jane Doe' },
        },
      },
    });
    // First profile query returns null (profile does not exist yet)
    mockProfileSingle.mockResolvedValueOnce({ data: null });
    mockAdminProfilesInsert.mockResolvedValueOnce({ error: null });
    mockAdminStudentProfilesUpsert.mockResolvedValueOnce({ error: null });

    const request = new Request('http://localhost:3000/api/auth/callback?code=first-time-google-code');
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toBe('http://localhost:3000/student/verification-status?notice=verification_required');

    expect(mockAdminProfilesInsert).toHaveBeenCalledWith({
      id: 'usr-new-google-user',
      full_name: 'Jane Doe',
      college_email: 'newuser@kavach.edu',
      role: 'STUDENT',
      college_id: 'PENDING_CAMPUS_VERIFICATION',
      is_approved: false,
    });

    expect(mockAdminStudentProfilesUpsert).toHaveBeenCalledWith(
      {
        id: 'usr-new-google-user',
        verification_status: 'PENDING_UPLOAD',
        admission_type: 'REGULAR',
      },
      { onConflict: 'id' }
    );
  });

  it('auto-provisions SRKR and Vishnu institutional email Google users with verified college_id', async () => {
    // SRKR Google User
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: {
          id: 'usr-srkr-student',
          email: '21b91a0501@srkr.edu.in',
          user_metadata: { full_name: 'SRKR Student' },
        },
      },
    });
    mockProfileSingle.mockResolvedValueOnce({ data: null });
    mockAdminProfilesInsert.mockResolvedValueOnce({ error: null });
    mockAdminStudentProfilesUpsert.mockResolvedValueOnce({ error: null });

    const srkrRequest = new Request('http://localhost:3000/api/auth/callback?code=srkr-google-code');
    const srkrResponse = await GET(srkrRequest);

    expect(srkrResponse.status).toBe(307);
    expect(mockAdminProfilesInsert).toHaveBeenCalledWith({
      id: 'usr-srkr-student',
      full_name: 'SRKR Student',
      college_email: '21b91a0501@srkr.edu.in',
      role: 'STUDENT',
      college_id: 'srkr-bhimavaram',
      is_approved: true,
    });

    // Vishnu Google User
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: {
          id: 'usr-vishnu-student',
          email: 'student@vishnu.edu.in',
          user_metadata: { full_name: 'Vishnu Student' },
        },
      },
    });
    mockProfileSingle.mockResolvedValueOnce({ data: null });
    mockAdminProfilesInsert.mockResolvedValueOnce({ error: null });
    mockAdminStudentProfilesUpsert.mockResolvedValueOnce({ error: null });

    const vishnuRequest = new Request('http://localhost:3000/api/auth/callback?code=vishnu-google-code');
    const vishnuResponse = await GET(vishnuRequest);

    expect(vishnuResponse.status).toBe(307);
    expect(mockAdminProfilesInsert).toHaveBeenCalledWith({
      id: 'usr-vishnu-student',
      full_name: 'Vishnu Student',
      college_email: 'student@vishnu.edu.in',
      role: 'STUDENT',
      college_id: 'vishnu-bhimavaram',
      is_approved: true,
    });
  });

  it('preserves safe relative "next" redirect query parameter', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: { id: 'usr-student-2', email: 'student2@kavach.edu' },
      },
    });
    mockProfileSingle.mockResolvedValueOnce({
      data: { role: 'STUDENT', is_approved: true },
    });

    const request = new Request(
      'http://localhost:3000/api/auth/callback?code=valid-code&next=/student/report'
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toBe('http://localhost:3000/student/report');
  });

  it('rejects malicious external "next" parameter to prevent open redirect vulnerabilities', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: 'usr-student-3', email: 'student3@kavach.edu' },
      },
    });
    mockProfileSingle.mockResolvedValue({
      data: { role: 'STUDENT', is_approved: true },
    });

    // Test protocol scheme attack
    const evilUrlRequest = new Request(
      'http://localhost:3000/api/auth/callback?code=valid-code&next=https://attacker.com'
    );
    const evilResponse = await GET(evilUrlRequest);
    expect(evilResponse.headers.get('location')).toBe('http://localhost:3000/student');

    // Test protocol-relative attack
    const protoRelativeRequest = new Request(
      'http://localhost:3000/api/auth/callback?code=valid-code&next=//attacker.com'
    );
    const protoResponse = await GET(protoRelativeRequest);
    expect(protoResponse.headers.get('location')).toBe('http://localhost:3000/student');

    // Test backslash attack
    const backslashRequest = new Request(
      'http://localhost:3000/api/auth/callback?code=valid-code&next=/\\attacker.com'
    );
    const backslashResponse = await GET(backslashRequest);
    expect(backslashResponse.headers.get('location')).toBe('http://localhost:3000/student');
  });

  it('preserves safe relative destination embedded in state parameter', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: { id: 'usr-student-state', email: 'student.state@kavach.edu' },
      },
    });
    mockProfileSingle.mockResolvedValueOnce({
      data: { role: 'STUDENT', is_approved: true },
    });

    const statePayload = Buffer.from(JSON.stringify({ next: '/student/safe-walk' })).toString('base64url');
    const request = new Request(
      `http://localhost:3000/api/auth/callback?code=valid-code&state=${statePayload}`
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toBe('http://localhost:3000/student/safe-walk');
  });

  it('rejects malicious open redirect embedded inside state parameter', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: { id: 'usr-student-state-malicious', email: 'student.state2@kavach.edu' },
      },
    });
    mockProfileSingle.mockResolvedValueOnce({
      data: { role: 'STUDENT', is_approved: true },
    });

    const statePayload = Buffer.from(JSON.stringify({ next: 'https://evil-phishing.com/steal' })).toString('base64url');
    const request = new Request(
      `http://localhost:3000/api/auth/callback?code=valid-code&state=${statePayload}`
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toBe('http://localhost:3000/student');
  });

  it('properly resolves reverse proxy headers (x-forwarded-host & x-forwarded-proto)', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: { id: 'usr-student-4', email: 'student4@kavach.edu' },
      },
    });
    mockProfileSingle.mockResolvedValueOnce({
      data: { role: 'STUDENT', is_approved: true },
    });

    const request = new Request('http://internal-cluster:3000/api/auth/callback?code=valid-code', {
      headers: {
        'x-forwarded-host': 'kavach.campus.edu',
        'x-forwarded-proto': 'https',
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toBe('https://kavach.campus.edu/student');
  });

  it('catches unhandled exceptions and redirects to /login with internal error', async () => {
    mockExchangeCodeForSession.mockRejectedValueOnce(new Error('Network connection aborted'));

    const request = new Request('http://localhost:3000/api/auth/callback?code=crash-code');
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toBe('http://localhost:3000/login?error=Internal%20authentication%20error');
  });
});
