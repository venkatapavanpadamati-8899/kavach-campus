import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isTwilioConfigured,
  isFcmConfigured,
  isSmtpConfigured,
  isRealDeliveryEnabled,
  isRealEmailDeliveryEnabled,
  sendEmailNotification,
  sendSmsNotification,
  sendPushNotification,
  dispatchEmergencyNotification,
} from '@/lib/notifications';
const mockCreateTransport = vi.hoisted(() => vi.fn());
vi.mock('nodemailer', () => ({
  default: { createTransport: mockCreateTransport },
}));

describe('Notification Provider Adapters (src/lib/notifications)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Environment Configuration Detection', () => {
    it('accurately detects missing Twilio credentials', () => {
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;
      delete process.env.TWILIO_PHONE_NUMBER;
      expect(isTwilioConfigured()).toBe(false);
    });

    it('accurately detects present Twilio credentials without exposing them', () => {
      process.env.TWILIO_ACCOUNT_SID = 'AC_test_account_sid';
      process.env.TWILIO_AUTH_TOKEN = 'test_auth_token';
      process.env.TWILIO_PHONE_NUMBER = '+15551234567';
      expect(isTwilioConfigured()).toBe(true);
    });

    it('accurately detects missing FCM credentials', () => {
      delete process.env.FCM_PROJECT_ID;
      delete process.env.FCM_CLIENT_EMAIL;
      delete process.env.FCM_PRIVATE_KEY;
      expect(isFcmConfigured()).toBe(false);
    });

    it('accurately detects present FCM credentials without exposing them', () => {
      process.env.FCM_PROJECT_ID = 'test-fcm-project';
      process.env.FCM_CLIENT_EMAIL = 'fcm@test.iam.gserviceaccount.com';
      process.env.FCM_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC...';
      expect(isFcmConfigured()).toBe(true);
    });

    it('accurately detects missing and present SMTP credentials', () => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      expect(isSmtpConfigured()).toBe(false);

      process.env.SMTP_HOST = 'smtp.test.edu';
      process.env.SMTP_USER = 'mailer@test.edu';
      process.env.SMTP_PASS = 'test-password';
      expect(isSmtpConfigured()).toBe(true);
    });

    it('defaults real delivery to false to prevent unintended emergency messages', () => {
      delete process.env.ENABLE_REAL_NOTIFICATIONS;
      expect(isRealDeliveryEnabled()).toBe(false);

      process.env.ENABLE_REAL_NOTIFICATIONS = 'false';
      expect(isRealDeliveryEnabled()).toBe(false);

      process.env.ENABLE_REAL_NOTIFICATIONS = 'true';
      expect(isRealDeliveryEnabled()).toBe(true);
    });

    it('allows enabling real email delivery independently without enabling real SMS or Push', () => {
      delete process.env.ENABLE_REAL_NOTIFICATIONS;
      delete process.env.ENABLE_REAL_EMAIL_DELIVERY;
      expect(isRealEmailDeliveryEnabled()).toBe(false);
      expect(isRealDeliveryEnabled()).toBe(false);

      process.env.ENABLE_REAL_EMAIL_DELIVERY = 'true';
      expect(isRealEmailDeliveryEnabled()).toBe(true);
      expect(isRealDeliveryEnabled()).toBe(false); // SMS/Push remains strictly disabled

      delete process.env.ENABLE_REAL_EMAIL_DELIVERY;
      process.env.ENABLE_REAL_NOTIFICATIONS = 'true';
      expect(isRealEmailDeliveryEnabled()).toBe(true); // Global switch also covers email
      expect(isRealDeliveryEnabled()).toBe(true);
    });
  });

  describe('SMTP Email Dispatch Adapter', () => {
    it('returns NOT_CONFIGURED when SMTP credentials are missing', async () => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      const result = await sendEmailNotification({
        toEmail: 'test@example.edu',
        subject: 'Test',
        body: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('NOT_CONFIGURED');
    });

    it('returns DISABLED when SMTP is configured but live delivery is disabled', async () => {
      process.env.SMTP_HOST = 'smtp.test.edu';
      process.env.SMTP_USER = 'mailer@test.edu';
      process.env.SMTP_PASS = 'test-password';
      process.env.ENABLE_REAL_NOTIFICATIONS = 'false';

      const result = await sendEmailNotification({
        toEmail: 'test@example.edu',
        subject: 'Test',
        body: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('DISABLED');
    });

    it('reports SENT only after SMTP accepts the test recipient', async () => {
      process.env.SMTP_HOST = 'smtp.test.edu';
      process.env.SMTP_USER = 'mailer@test.edu';
      process.env.SMTP_PASS = 'test-password';
      process.env.SMTP_FROM_EMAIL = 'no-reply@test.edu';
      process.env.SMTP_PORT = '587';
      process.env.ENABLE_REAL_NOTIFICATIONS = 'true';
      const sendMail = vi.fn().mockResolvedValue({
        accepted: ['test@example.edu'],
        messageId: 'test-message-id',
      });
      mockCreateTransport.mockReturnValue({
        sendMail,
      });

      const result = await sendEmailNotification({
        toEmail: 'test@example.edu',
        subject: 'Test',
        body: 'Test message',
        idempotencyKey: 'smtp-accepted-test',
      });

      expect(result).toMatchObject({
        success: true,
        status: 'SENT',
        provider: 'SMTP',
        messageId: 'test-message-id',
      });
      expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
        from: 'no-reply@test.edu',
        to: 'test@example.edu',
        subject: 'Test',
        text: 'Test message',
      }));
    });

    it('reports UNKNOWN rather than success when SMTP handoff throws', async () => {
      process.env.SMTP_HOST = 'smtp.test.edu';
      process.env.SMTP_USER = 'mailer@test.edu';
      process.env.SMTP_PASS = 'test-password';
      process.env.ENABLE_REAL_NOTIFICATIONS = 'true';
      mockCreateTransport.mockReturnValue({
        sendMail: vi.fn().mockRejectedValue(new Error('connection interrupted')),
      });

      const result = await sendEmailNotification({
        toEmail: 'test@example.edu',
        subject: 'Test',
        body: 'Test message',
        idempotencyKey: 'smtp-unknown-test',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('UNKNOWN');
      expect(result.error).not.toContain('connection interrupted');
    });
  });

  describe('Twilio SMS Dispatch Adapter', () => {
    it('returns NOT_CONFIGURED when Twilio credentials are missing', async () => {
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;
      delete process.env.TWILIO_PHONE_NUMBER;

      const result = await sendSmsNotification({
        toPhone: '+919876543210',
        body: 'EMERGENCY TEST ALERT',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('NOT_CONFIGURED');
      expect(result.provider).toBe('TWILIO');
      expect(result.error).toContain('Twilio credentials not configured');
    });

    it('returns DISABLED when credentials exist but ENABLE_REAL_NOTIFICATIONS is not true', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'AC_test_account_sid';
      process.env.TWILIO_AUTH_TOKEN = 'test_auth_token';
      process.env.TWILIO_PHONE_NUMBER = '+15551234567';
      process.env.ENABLE_REAL_NOTIFICATIONS = 'false';

      const result = await sendSmsNotification({
        toPhone: '+919876543210',
        body: 'EMERGENCY TEST ALERT',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('DISABLED');
      expect(result.provider).toBe('TWILIO');
      expect(result.error).toContain('Real SMS delivery disabled by default');
    });

    it('sends request and returns DELIVERED when real delivery is enabled and provider returns 200/201', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'AC_test_account_sid';
      process.env.TWILIO_AUTH_TOKEN = 'test_auth_token';
      process.env.TWILIO_PHONE_NUMBER = '+15551234567';
      process.env.ENABLE_REAL_NOTIFICATIONS = 'true';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: vi.fn().mockResolvedValue({ sid: 'SM_twilio_msg_sid_789' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await sendSmsNotification({
        toPhone: '+919876543210',
        body: 'CRITICAL ALERT: Student requires assistance',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('DELIVERED');
      expect(result.provider).toBe('TWILIO');
      expect(result.messageId).toBe('SM_twilio_msg_sid_789');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify endpoint and basic auth header
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/AC_test_account_sid/Messages.json');
      expect(options.headers.Authorization).toContain('Basic ');
    });

    it('handles provider HTTP errors safely and returns FAILED without throwing', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'AC_test_account_sid';
      process.env.TWILIO_AUTH_TOKEN = 'test_auth_token';
      process.env.TWILIO_PHONE_NUMBER = '+15551234567';
      process.env.ENABLE_REAL_NOTIFICATIONS = 'true';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue('{"code": 21211, "message": "Invalid To Phone Number"}'),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await sendSmsNotification({
        toPhone: 'invalid_number',
        body: 'CRITICAL ALERT',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
      expect(result.provider).toBe('TWILIO');
      expect(result.error).toContain('Twilio HTTP 400');
    });

    it('handles network timeouts or fetch exceptions safely and returns FAILED without throwing', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'AC_test_account_sid';
      process.env.TWILIO_AUTH_TOKEN = 'test_auth_token';
      process.env.TWILIO_PHONE_NUMBER = '+15551234567';
      process.env.ENABLE_REAL_NOTIFICATIONS = 'true';

      const mockFetch = vi.fn().mockRejectedValue(new Error('Network request timed out after 6000ms'));
      vi.stubGlobal('fetch', mockFetch);

      const result = await sendSmsNotification({
        toPhone: '+919876543210',
        body: 'CRITICAL ALERT',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
      expect(result.provider).toBe('TWILIO');
      expect(result.error).toContain('Network request timed out');
    });
  });

  describe('Firebase Cloud Messaging (FCM) Push Adapter', () => {
    it('returns FAILED when recipient userId is omitted', async () => {
      const result = await sendPushNotification({
        userId: '',
        title: 'Emergency',
        body: 'SOS triggered',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
      expect(result.provider).toBe('FCM');
      expect(result.error).toContain('Missing recipient userId');
    });

    it('returns NOT_CONFIGURED when FCM credentials are missing', async () => {
      delete process.env.FCM_PROJECT_ID;
      delete process.env.FCM_CLIENT_EMAIL;
      delete process.env.FCM_PRIVATE_KEY;

      const result = await sendPushNotification({
        userId: 'staff-user-guard-1',
        title: 'Emergency Dispatch',
        body: 'SOS triggered on North Campus',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('NOT_CONFIGURED');
      expect(result.provider).toBe('FCM');
    });

    it('returns DISABLED when FCM credentials exist but ENABLE_REAL_NOTIFICATIONS is not true', async () => {
      process.env.FCM_PROJECT_ID = 'test-fcm-project';
      process.env.FCM_CLIENT_EMAIL = 'fcm@test.iam.gserviceaccount.com';
      process.env.FCM_PRIVATE_KEY = 'test_private_key';
      process.env.ENABLE_REAL_NOTIFICATIONS = 'false';

      const result = await sendPushNotification({
        userId: 'staff-user-guard-1',
        title: 'Emergency Dispatch',
        body: 'SOS triggered on North Campus',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('DISABLED');
      expect(result.provider).toBe('FCM');
    });
  });

  describe('Unified Emergency Dispatch Workflow', () => {
    it('dispatches combined SMS and Push notifications safely and never throws', async () => {
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.FCM_PROJECT_ID;

      const result = await dispatchEmergencyNotification({
        recipientPhone: '+919876543210',
        recipientUserId: 'guard-uuid-1',
        title: 'CRITICAL SOS ALERT',
        message: 'Student activated emergency SOS',
        incidentId: 'inc-test-999',
      });

      expect(result.sms).toBeDefined();
      expect(result.push).toBeDefined();
      expect(result.sms.status).toBe('NOT_CONFIGURED');
      expect(result.push.status).toBe('NOT_CONFIGURED');
    });

    it('handles dispatch when phone or userId is not provided', async () => {
      const result = await dispatchEmergencyNotification({
        title: 'ALERT',
        message: 'No recipients provided',
      });

      expect(result.sms.success).toBe(false);
      expect(result.sms.status).toBe('NOT_CONFIGURED');
      expect(result.sms.error).toContain('No recipient phone number');

      expect(result.push.success).toBe(false);
      expect(result.push.status).toBe('NOT_CONFIGURED');
      expect(result.push.error).toContain('No recipient user ID');
    });
  });
});
