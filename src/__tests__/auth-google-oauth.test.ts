import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/auth/google/route';
import {
  constructGoogleAuthUrl,
  sanitizeRedirectUrl,
  encodeOAuthState,
  parseOAuthState,
  isGoogleClientConfigured,
} from '@/lib/oauth';

const mockSignInWithOAuth = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  })),
}));

describe('OAuth Helper Utilities (src/lib/oauth.ts)', () => {
  describe('constructGoogleAuthUrl', () => {
    it('constructs valid Google authorization URL with all required query parameters', () => {
      const url = constructGoogleAuthUrl({
        clientId: '1234567890-test.apps.googleusercontent.com',
        redirectUri: 'http://localhost:3000/api/auth/callback',
        state: 'test-state-token',
      });

      const parsed = new URL(url);
      expect(parsed.origin).toBe('https://accounts.google.com');
      expect(parsed.pathname).toBe('/o/oauth2/v2/auth');
      expect(parsed.searchParams.get('client_id')).toBe('1234567890-test.apps.googleusercontent.com');
      expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:3000/api/auth/callback');
      expect(parsed.searchParams.get('response_type')).toBe('code');
      expect(parsed.searchParams.get('scope')).toBe('openid email profile');
      expect(parsed.searchParams.get('access_type')).toBe('offline');
      expect(parsed.searchParams.get('prompt')).toBe('select_account');
      expect(parsed.searchParams.get('state')).toBe('test-state-token');
    });

    it('handles optional state parameter', () => {
      const url = constructGoogleAuthUrl({
        clientId: '1234567890-test.apps.googleusercontent.com',
        redirectUri: 'http://localhost:3000/api/auth/callback',
      });

      const parsed = new URL(url);
      expect(parsed.searchParams.has('state')).toBe(false);
    });
  });

  describe('sanitizeRedirectUrl', () => {
    it('allows valid internal relative paths', () => {
      expect(sanitizeRedirectUrl('/student')).toBe('/student');
      expect(sanitizeRedirectUrl('/student/profile')).toBe('/student/profile');
      expect(sanitizeRedirectUrl('/admin?tab=users')).toBe('/admin?tab=users');
    });

    it('rejects external URLs (open redirect attacks)', () => {
      expect(sanitizeRedirectUrl('https://evil.com')).toBe('/student');
      expect(sanitizeRedirectUrl('http://attacker.com/steal')).toBe('/student');
      expect(sanitizeRedirectUrl('javascript:alert(1)')).toBe('/student');
    });

    it('rejects protocol-relative and backslash attacks', () => {
      expect(sanitizeRedirectUrl('//evil.com')).toBe('/student');
      expect(sanitizeRedirectUrl('/\\evil.com')).toBe('/student');
      expect(sanitizeRedirectUrl('/attacker:8080')).toBe('/student');
    });

    it('returns custom fallback when specified', () => {
      expect(sanitizeRedirectUrl('https://evil.com', '/login')).toBe('/login');
      expect(sanitizeRedirectUrl(null, '/custom-fallback')).toBe('/custom-fallback');
    });
  });

  describe('encodeOAuthState & parseOAuthState', () => {
    it('roundtrips valid state with safe destination', () => {
      const state = encodeOAuthState('/student/cases');
      const result = parseOAuthState(state);

      expect(result.valid).toBe(true);
      expect(result.next).toBe('/student/cases');
    });

    it('neutralizes malicious external redirect embedded in state', () => {
      const maliciousPayload = Buffer.from(JSON.stringify({ next: 'https://phishing.com' })).toString('base64url');
      const result = parseOAuthState(maliciousPayload);

      expect(result.valid).toBe(true);
      expect(result.next).toBe('/student');
    });

    it('handles non-JSON or corrupted state strings safely', () => {
      const result = parseOAuthState('corrupted-non-json-state');
      expect(result.valid).toBe(false);
      expect(result.next).toBe('/student');
    });

    it('handles null, undefined, or empty state safely', () => {
      expect(parseOAuthState(null)).toEqual({ valid: false, next: '/student' });
      expect(parseOAuthState(undefined)).toEqual({ valid: false, next: '/student' });
      expect(parseOAuthState('')).toEqual({ valid: false, next: '/student' });
    });
  });

  describe('isGoogleClientConfigured', () => {
    it('returns false for missing, undefined, empty, or placeholder client ID', () => {
      expect(isGoogleClientConfigured(undefined)).toBe(false);
      expect(isGoogleClientConfigured(null)).toBe(false);
      expect(isGoogleClientConfigured('')).toBe(false);
      expect(isGoogleClientConfigured('short')).toBe(false);
      expect(isGoogleClientConfigured('your_google_oauth_client_id.apps.googleusercontent.com')).toBe(false);
      expect(isGoogleClientConfigured('placeholder-client-id')).toBe(false);
    });

    it('returns true for a realistic Google Client ID', () => {
      expect(isGoogleClientConfigured('123456789012-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com')).toBe(true);
    });
  });
});

describe('GET /api/auth/google Route Handler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it('redirects to /login?error=google_oauth_client_deleted when GOOGLE_CLIENT_ID is missing or placeholder', async () => {
    delete process.env.GOOGLE_CLIENT_ID;

    const request = new Request('http://localhost:3000/api/auth/google');
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toBe('http://localhost:3000/login?error=google_oauth_client_deleted');
  });

  it('redirects to Google OAuth authorization endpoint when GOOGLE_CLIENT_ID is configured', async () => {
    process.env.GOOGLE_CLIENT_ID = '9876543210-valid.apps.googleusercontent.com';
    mockSignInWithOAuth.mockResolvedValueOnce({
      data: { url: 'https://accounts.google.com/o/oauth2/v2/auth?mock=valid' },
      error: null,
    });

    const request = new Request('http://localhost:3000/api/auth/google?next=/student/profile');
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://accounts.google.com/o/oauth2/v2/auth?mock=valid');
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/api/auth/callback?next=%2Fstudent%2Fprofile',
      },
    });
  });

  it('sanitizes open redirect attacks in "next" parameter during authorization URL generation', async () => {
    process.env.GOOGLE_CLIENT_ID = '9876543210-valid.apps.googleusercontent.com';
    mockSignInWithOAuth.mockResolvedValueOnce({
      data: { url: 'https://accounts.google.com/o/oauth2/v2/auth?mock=sanitized' },
      error: null,
    });

    const request = new Request('http://localhost:3000/api/auth/google?next=https://attacker.com/evil');
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://accounts.google.com/o/oauth2/v2/auth?mock=sanitized');
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/api/auth/callback', // sanitized to default
      },
    });
  });

  it('properly resolves reverse proxy headers in callback URL (x-forwarded-host & proto)', async () => {
    process.env.GOOGLE_CLIENT_ID = '9876543210-valid.apps.googleusercontent.com';
    mockSignInWithOAuth.mockResolvedValueOnce({
      data: { url: 'https://accounts.google.com/o/oauth2/v2/auth?mock=proxy' },
      error: null,
    });

    const request = new Request('http://internal-docker:3000/api/auth/google', {
      headers: {
        'x-forwarded-host': 'kavach.campus.edu',
        'x-forwarded-proto': 'https',
      },
    });
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://accounts.google.com/o/oauth2/v2/auth?mock=proxy');
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'https://kavach.campus.edu/api/auth/callback',
      },
    });
  });
});
