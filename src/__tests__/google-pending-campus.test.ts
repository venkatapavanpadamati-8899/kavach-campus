import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '@/app/api/auth/google/route';

const mockSignInWithIdToken = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockSignOut = vi.fn();
const mockAdminFrom = vi.fn();
const mockProfileSingle = vi.fn();
const mockInsertProfile = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithIdToken: mockSignInWithIdToken,
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockSignOut,
    },
  })),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

describe('Google OAuth Initiation (GET /api/auth/google)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GOOGLE_CLIENT_ID;
  });

  it('redirects to /login?error=google_oauth_client_deleted if GOOGLE_CLIENT_ID is unset', async () => {
    const request = new Request('http://localhost:3000/api/auth/google');
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?error=google_oauth_client_deleted'
    );
  });

  it('redirects to /login?error=google_oauth_client_deleted if GOOGLE_CLIENT_ID is a placeholder', async () => {
    process.env.GOOGLE_CLIENT_ID = 'your_google_oauth_client_id_placeholder';
    const request = new Request('http://localhost:3000/api/auth/google');
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?error=google_oauth_client_deleted'
    );
  });

  it('redirects to Google authorization URL when client ID is configured', async () => {
    process.env.GOOGLE_CLIENT_ID = '123456789012-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com';
    mockSignInWithOAuth.mockResolvedValueOnce({
      data: { url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=123&state=xyz' },
      error: null,
    });

    const request = new Request('http://localhost:3000/api/auth/google');
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth?client_id=123&state=xyz'
    );
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/api/auth/callback',
      },
    });
  });

  it('preserves valid relative next parameter and rejects open redirects', async () => {
    process.env.GOOGLE_CLIENT_ID = '123456789012-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com';
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/o/oauth2/v2/auth?mock=true' },
      error: null,
    });

    // Valid relative path
    const validRequest = new Request('http://localhost:3000/api/auth/google?next=/student/sos');
    await GET(validRequest);
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/api/auth/callback?next=%2Fstudent%2Fsos',
      },
    });

    // Malicious absolute URL
    const evilRequest = new Request('http://localhost:3000/api/auth/google?next=https://evil.com');
    await GET(evilRequest);
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/api/auth/callback',
      },
    });
  });

  it('redirects to /login?error=google_oauth_client_deleted when provider initiation fails', async () => {
    process.env.GOOGLE_CLIENT_ID = '123456789012-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com';
    mockSignInWithOAuth.mockResolvedValueOnce({
      data: null,
      error: { message: 'OAuth provider error' },
    });

    const request = new Request('http://localhost:3000/api/auth/google');
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?error=google_oauth_client_deleted'
    );
  });
});

describe('Google login campus approval policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key-long-enough-for-tests';
    mockSignInWithIdToken.mockResolvedValue({
      data: {
        user: {
          id: 'google-user-id',
          email: 'personal.user@example.com',
          user_metadata: { full_name: 'Personal User' },
        },
        session: { access_token: 'test-session-token' },
      },
      error: null,
    });
    mockSignOut.mockResolvedValue({ error: null });
    mockProfileSingle
      .mockResolvedValueOnce({ data: null, error: { message: 'Profile not found' } })
      .mockResolvedValueOnce({
        data: {
          id: 'google-user-id',
          role: 'STUDENT',
          college_id: 'PENDING_CAMPUS_VERIFICATION',
          is_approved: false,
          full_name: 'Personal User',
        },
        error: null,
      });
    mockInsertProfile.mockResolvedValue({ error: null });
    mockAdminFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockProfileSingle,
        })),
      })),
      insert: mockInsertProfile,
    });
  });

  it('keeps an unmapped Google account unapproved and ends its session', async () => {
    const response = await POST(new Request('http://localhost/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'test-google-id-token' }),
    }));

    expect(response.status).toBe(403);
    expect(mockInsertProfile).toHaveBeenCalledWith(expect.objectContaining({
      college_id: 'PENDING_CAMPUS_VERIFICATION',
      role: 'STUDENT',
      is_approved: false,
    }));
    expect(mockSignOut).toHaveBeenCalledOnce();
  });
});
