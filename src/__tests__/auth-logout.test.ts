import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/auth/logout/route';

const mockSignOut = vi.fn();

const mockServerClient = {
  auth: {
    signOut: mockSignOut,
  },
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockServerClient)),
}));

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully invalidates user session and purges auth cookies', async () => {
    mockSignOut.mockResolvedValueOnce({ error: null });

    const res = await POST();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toBe('Signed out successfully');
    expect(mockSignOut).toHaveBeenCalledTimes(1);

    // Verify cookie deletion
    const setCookieHeader = res.headers.get('set-cookie');
    if (setCookieHeader) {
      expect(setCookieHeader).toContain('demo_sms_token=');
    }
  });

  it('does not report success when signOut fails to invalidate the session', async () => {
    mockSignOut.mockResolvedValueOnce({ error: new Error('Session already expired') });

    const res = await POST();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to invalidate session');
  });

  it('catches unexpected thrown errors and returns 500 safely', async () => {
    mockSignOut.mockRejectedValueOnce(new Error('Fatal auth transport error'));

    const res = await POST();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to sign out');
  });
});
