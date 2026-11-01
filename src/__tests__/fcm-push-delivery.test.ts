import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isFcmConfigured, sendPushNotification } from '@/lib/notifications';

vi.mock('google-auth-library', () => {
  return {
    JWT: class {
      async getAccessToken() {
        return { token: 'mock-oauth2-access-token' };
      }
    },
  };
});

describe('FCM Push Notification Live Adapter & Error Handling', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('detects valid FCM credentials accurately', () => {
    process.env.FIREBASE_PROJECT_ID = 'kavach-campus';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@kavach-campus.iam.gserviceaccount.com';
    process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC...';

    expect(isFcmConfigured()).toBe(true);
  });

  it('fails gracefully with FAILED when recipient userId is omitted', async () => {
    const res = await sendPushNotification({
      userId: '',
      title: 'Emergency Alert',
      body: 'Campus incident reported',
    });

    expect(res.success).toBe(false);
    expect(res.status).toBe('FAILED');
    expect(res.provider).toBe('FCM');
    expect(res.error).toContain('Missing recipient userId');
  });

  it('returns FAILED when deviceToken is not provided in payload', async () => {
    process.env.FIREBASE_PROJECT_ID = 'kavach-campus';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@kavach-campus.iam.gserviceaccount.com';
    process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC...';
    process.env.ENABLE_REAL_NOTIFICATIONS = 'true';

    const res = await sendPushNotification({
      userId: 'student-uuid-1',
      title: 'Emergency',
      body: 'Safe walk timer warning',
    });

    expect(res.success).toBe(false);
    expect(res.status).toBe('FAILED');
    expect(res.error).toContain('No registered device token provided');
  });

  it('returns DELIVERED when Google FCM HTTP v1 returns success (name: projects/.../messages/...)', async () => {
    process.env.FIREBASE_PROJECT_ID = 'kavach-campus';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@kavach-campus.iam.gserviceaccount.com';
    process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC...';
    process.env.ENABLE_REAL_NOTIFICATIONS = 'true';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ name: 'projects/kavach-campus/messages/msg-test-12345' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await sendPushNotification({
      userId: 'student-uuid-1',
      deviceToken: 'valid-fcm-device-registration-token',
      title: '🚨 Emergency SOS',
      body: 'Help is on the way',
      idempotencyKey: 'test-fcm-delivered-idempotent-key',
    });

    expect(res.success).toBe(true);
    expect(res.status).toBe('DELIVERED');
    expect(res.provider).toBe('FCM');
    expect(res.messageId).toBe('projects/kavach-campus/messages/msg-test-12345');
  });

  it('returns FAILED without throwing when Google FCM HTTP v1 returns 400 INVALID_ARGUMENT', async () => {
    process.env.FIREBASE_PROJECT_ID = 'kavach-campus';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@kavach-campus.iam.gserviceaccount.com';
    process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC...';
    process.env.ENABLE_REAL_NOTIFICATIONS = 'true';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          code: 400,
          message: 'The registration token is not a valid FCM registration token',
          status: 'INVALID_ARGUMENT',
        },
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await sendPushNotification({
      userId: 'student-uuid-1',
      deviceToken: 'bad-registration-token',
      title: '🚨 Emergency SOS',
      body: 'Help is on the way',
      idempotencyKey: 'test-fcm-failed-idempotent-key',
    });

    expect(res.success).toBe(false);
    expect(res.status).toBe('FAILED');
    expect(res.provider).toBe('FCM');
    expect(res.error).toContain('The registration token is not a valid FCM registration token');
  });
});
