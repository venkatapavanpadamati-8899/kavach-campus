/**
 * OAuth 2.0 Utilities for Google Workspace Authentication
 *
 * Implements authorization URL construction, redirect URI resolution,
 * state parameter serialization/verification, and open-redirect defense.
 */

export interface GoogleAuthUrlOptions {
  clientId: string;
  redirectUri: string;
  state?: string;
  prompt?: 'select_account' | 'consent' | 'none';
  accessType?: 'offline' | 'online';
}

/**
 * Validates and sanitizes a redirect destination URL to prevent open redirect vulnerabilities.
 * Strictly rejects protocol schemes (http:, https:, javascript:), protocol-relative URLs (//evil.com),
 * and backslash obfuscation (/\evil.com).
 */
export function sanitizeRedirectUrl(target?: string | null, defaultFallback = '/student'): string {
  if (!target || typeof target !== 'string') {
    return defaultFallback;
  }

  const trimmed = target.trim();
  if (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.includes('\\') &&
    !trimmed.includes(':')
  ) {
    return trimmed;
  }

  return defaultFallback;
}

/**
 * Encodes the return destination and a random nonce into a URL-safe base64 state token.
 */
export function encodeOAuthState(next?: string | null): string {
  const safeNext = sanitizeRedirectUrl(next, '/student');
  const payload = {
    next: safeNext,
    timestamp: Date.now(),
    nonce: Math.random().toString(36).substring(2, 15),
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

/**
 * Safely parses and validates an incoming OAuth state parameter.
 * Returns the sanitized return path or fallback.
 */
export function parseOAuthState(stateParam?: string | null): { valid: boolean; next: string } {
  if (!stateParam || typeof stateParam !== 'string') {
    return { valid: false, next: '/student' };
  }

  try {
    const decoded = Buffer.from(stateParam, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded);
    const next = sanitizeRedirectUrl(parsed.next, '/student');
    return { valid: true, next };
  } catch {
    // If state is not JSON, check if it was passed as a raw safe path
    const fallbackNext = sanitizeRedirectUrl(stateParam, '/student');
    const isValidPath = stateParam.startsWith('/') && fallbackNext === stateParam;
    return { valid: isValidPath, next: fallbackNext };
  }
}

/**
 * Checks if a Google Client ID is configured and valid (not empty, placeholder, or deleted).
 */
export function isGoogleClientConfigured(clientId?: string | null): boolean {
  if (!clientId || typeof clientId !== 'string') {
    return false;
  }
  const trimmed = clientId.trim();
  return (
    trimmed.length > 10 &&
    !trimmed.includes('placeholder') &&
    !trimmed.includes('your_google_oauth_client_id') &&
    !trimmed.includes('YOUR_CLIENT_ID')
  );
}

/**
 * Constructs the standard Google OAuth 2.0 authorization URL.
 */
export function constructGoogleAuthUrl(options: GoogleAuthUrlOptions): string {
  const {
    clientId,
    redirectUri,
    state,
    prompt = 'select_account',
    accessType = 'offline',
  } = options;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: accessType,
    prompt,
  });

  if (state) {
    params.set('state', state);
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
