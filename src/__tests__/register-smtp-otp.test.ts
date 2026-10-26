import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { POST as registerRoute } from '@/app/api/auth/register/route';
import { POST as resendOtpRoute } from '@/app/api/auth/resend-otp/route';
import { POST as verifyOtpRoute } from '@/app/api/auth/verify-otp/route';

const mockSendEmailNotification = vi.fn();
const mockIsRealDeliveryEnabled = vi.fn();
const mockIsRealEmailDeliveryEnabled = vi.fn();
const mockIsSmtpConfigured = vi.fn();

vi.mock('@/lib/notifications', () => ({
  sendEmailNotification: (...args: unknown[]) => mockSendEmailNotification(...args),
  isRealDeliveryEnabled: () => mockIsRealDeliveryEnabled(),
  isRealEmailDeliveryEnabled: () => mockIsRealEmailDeliveryEnabled(),
  isSmtpConfigured: () => mockIsSmtpConfigured(),
}));

// Mock Supabase admin client
const mockAdminFrom = vi.fn();
const mockAdminCreateUser = vi.fn();
const mockAdminUpdateUserById = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
    auth: {
      admin: {
        createUser: mockAdminCreateUser,
        updateUserById: mockAdminUpdateUserById,
      },
    },
  })),
}));

describe('Kavach Campus OTP System — Real SMTP & Free Demo Mobile Audit', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-that-is-long-enough-32-chars' };
    vi.clearAllMocks();
    mockIsRealEmailDeliveryEnabled.mockImplementation(() => mockIsRealDeliveryEnabled());

    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'otp-rec-1' }, error: null }),
            }),
          }),
        }),
      }),
    });

    mockAdminCreateUser.mockResolvedValue({
      data: { user: { id: 'usr-new-student-smtp' } },
      error: null,
    });
    mockAdminUpdateUserById.mockResolvedValue({
      data: { user: { id: 'usr-new-student-smtp' } },
      error: null,
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('1. Real Email Delivery via Free-Tier SMTP (Registration)', () => {
    it('dispatches real email OTP via SMTP to exact entered email when configured', async () => {
      mockIsRealDeliveryEnabled.mockReturnValue(true);
      mockIsSmtpConfigured.mockReturnValue(true);
      mockSendEmailNotification.mockResolvedValue({
        success: true,
        status: 'SENT',
        provider: 'SMTP',
        messageId: 'smtp-msg-12345',
      });

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Rahul Varma',
          email: 'rahul@srkr.edu.in',
          phone: '9876543210',
          password: 'SecurePassword123!',
          role: 'STUDENT',
          campusId: 'srkr-bhimavaram',
          registrationNumber: '2101201045',
          department: 'CSE',
        }),
      });

      const res = await registerRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();

      expect(json.message).toContain('Verification code sent to your registered college email');
      expect(json.deliveryMethod).toBe('EMAIL_SMTP');
      expect(json.email).toBe('rahul@srkr.edu.in');

      expect(mockSendEmailNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          toEmail: 'rahul@srkr.edu.in',
          subject: expect.stringContaining('Verification Code'),
          body: expect.stringContaining('Your Kavach Campus verification code is:'),
        })
      );
    });

    it('returns 502 when SMTP delivery fails', async () => {
      mockIsRealDeliveryEnabled.mockReturnValue(true);
      mockIsSmtpConfigured.mockReturnValue(true);
      mockSendEmailNotification.mockResolvedValue({
        success: false,
        status: 'FAILED',
        provider: 'SMTP',
        error: 'SMTP connection timed out after 6000ms',
      });

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Rahul Varma',
          email: 'rahul@srkr.edu.in',
          phone: '9876543210',
          password: 'SecurePassword123!',
          role: 'STUDENT',
          campusId: 'srkr-bhimavaram',
          registrationNumber: '2101201045',
        }),
      });

      const res = await registerRoute(req);
      expect(res.status).toBe(502);
      const json = await res.json();
      expect(json.error).toContain('Failed to deliver verification email');
    });

    it('dispatches email OTP when ENABLE_REAL_EMAIL_DELIVERY is true even if ENABLE_REAL_NOTIFICATIONS is false', async () => {
      mockIsRealDeliveryEnabled.mockReturnValue(false); // Global emergency SMS/Push DISABLED
      mockIsRealEmailDeliveryEnabled.mockReturnValue(true); // Email OTP independently ENABLED
      mockIsSmtpConfigured.mockReturnValue(true);
      mockSendEmailNotification.mockResolvedValue({
        success: true,
        status: 'SENT',
        provider: 'SMTP',
        messageId: 'smtp-isolated-msg',
      });

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Rahul Varma',
          email: 'rahul@srkr.edu.in',
          phone: '9876543210',
          password: 'SecurePassword123!',
          role: 'STUDENT',
          campusId: 'srkr-bhimavaram',
          registrationNumber: '2101201045',
        }),
      });

      const res = await registerRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.deliveryMethod).toBe('EMAIL_SMTP');
      expect(mockSendEmailNotification).toHaveBeenCalled();
    });

    it('returns 503 in production if SMTP is not configured', async () => {
      (process.env as any)['NODE_ENV'] = 'production';
      mockIsRealDeliveryEnabled.mockReturnValue(false);
      mockIsSmtpConfigured.mockReturnValue(false);

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Rahul Varma',
          email: 'rahul@srkr.edu.in',
          phone: '9876543210',
          password: 'SecurePassword123!',
          role: 'STUDENT',
          campusId: 'srkr-bhimavaram',
          registrationNumber: '2101201045',
        }),
      });

      const res = await registerRoute(req);
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toContain('OTP email delivery is not available for registration');
    });

    it('rejects registration with invalid 10-digit mobile number', async () => {
      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Rahul Varma',
          email: 'rahul@srkr.edu.in',
          phone: '12345', // Invalid
          password: 'SecurePassword123!',
          role: 'STUDENT',
        }),
      });

      const res = await registerRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('valid 10-digit mobile number');
    });
  });

  describe('2. Resend OTP Route (/api/auth/resend-otp)', () => {
    it('dispatches new OTP via real SMTP on resend request', async () => {
      mockIsRealDeliveryEnabled.mockReturnValue(true);
      mockIsSmtpConfigured.mockReturnValue(true);
      mockSendEmailNotification.mockResolvedValue({
        success: true,
        status: 'SENT',
        provider: 'SMTP',
      });

      // Mock an existing pending record created 90 seconds ago (cooldown satisfied)
      const existingCreatedAt = new Date(Date.now() - 90 * 1000).toISOString();
      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'otp-resend-1',
                email: 'student@srkr.edu.in',
                verified: false,
                created_at: existingCreatedAt,
                registration_data: { name: 'Student' },
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const req = new Request('http://localhost:3000/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'student@srkr.edu.in' }),
      });

      const res = await resendOtpRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.deliveryMethod).toBe('EMAIL_SMTP');
      expect(mockSendEmailNotification).toHaveBeenCalledWith(
        expect.objectContaining({ toEmail: 'student@srkr.edu.in' })
      );
    });

    it('enforces 60-second cooldown on consecutive resend requests', async () => {
      // Mock existing record created 20 seconds ago (< 60s cooldown)
      const existingCreatedAt = new Date(Date.now() - 20 * 1000).toISOString();
      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'otp-resend-2',
                email: 'student@srkr.edu.in',
                verified: false,
                created_at: existingCreatedAt,
              },
              error: null,
            }),
          }),
        }),
      });

      const req = new Request('http://localhost:3000/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'student@srkr.edu.in' }),
      });

      const res = await resendOtpRoute(req);
      expect(res.status).toBe(429);
      const json = await res.json();
      expect(json.error).toContain('Please wait');
    });

    it('prevents account enumeration when non-existent email is passed', async () => {
      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const req = new Request('http://localhost:3000/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent@srkr.edu.in' }),
      });

      const res = await resendOtpRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain('If an unverified registration exists');
    });
  });

  describe('3. Production Rejection of Demo Verification & Mobile Disclaimers', () => {
    it('strictly rejects demo OTP verification in production mode', async () => {
      (process.env as any)['NODE_ENV'] = 'production';
      process.env.ENABLE_DEMO_OTP = 'true';

      const salt = await bcrypt.genSalt(10);
      const realOtpHash = await bcrypt.hash('888999', salt);

      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'rec-prod-1',
                email: 'student@srkr.edu.in',
                otp_hash: realOtpHash,
                verified: false,
                attempts: 0,
                max_attempts: 5,
                expires_at: new Date(Date.now() + 300000).toISOString(),
                registration_data: {
                  userId: 'usr-123',
                  name: 'Student',
                  email: 'student@srkr.edu.in',
                  role: 'STUDENT',
                },
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'rec-prod-1' } }),
              }),
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      // Submit static demo OTP ('123456') in production
      const req = new Request('http://localhost:3000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'student@srkr.edu.in', otp: '123456' }),
      });

      const res = await verifyOtpRoute(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Invalid OTP');
    });

    it('verifies real bcrypt OTP in production and marks phone_verified as false', async () => {
      (process.env as any)['NODE_ENV'] = 'production';

      const realOtp = '654321';
      const salt = await bcrypt.genSalt(10);
      const realOtpHash = await bcrypt.hash(realOtp, salt);

      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'rec-prod-2',
                email: 'student@srkr.edu.in',
                otp_hash: realOtpHash,
                verified: false,
                attempts: 0,
                max_attempts: 5,
                expires_at: new Date(Date.now() + 300000).toISOString(),
                registration_data: {
                  userId: 'usr-123',
                  name: 'Student',
                  email: 'student@srkr.edu.in',
                  phone: '9876543210',
                  role: 'STUDENT',
                },
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'rec-prod-2' } }),
              }),
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const req = new Request('http://localhost:3000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'student@srkr.edu.in', otp: realOtp }),
      });

      const res = await verifyOtpRoute(req);
      expect(res.status).toBe(200);

      // Verify that user metadata explicitly has phone_verified: false (Demo OTP cannot verify real phone ownership)
      expect(mockAdminUpdateUserById).toHaveBeenCalledWith(
        'usr-123',
        expect.objectContaining({
          email_confirm: true,
          user_metadata: expect.objectContaining({
            email_verified: true,
            phone_verified: false,
            mobile_verification_status: 'DEMO_UNVERIFIED',
          }),
        })
      );
    });

    it('rejects PASSWORD_RESET OTP when submitted to registration verify-otp endpoint', async () => {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('555666', salt);

      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'rec-pwd-1',
                email: 'student@srkr.edu.in',
                otp_hash: hash,
                verified: false,
                attempts: 0,
                max_attempts: 5,
                expires_at: new Date(Date.now() + 300000).toISOString(),
                registration_data: {
                  action: 'PASSWORD_RESET',
                  userId: 'usr-reset-1',
                },
              },
              error: null,
            }),
          }),
        }),
      });

      const req = new Request('http://localhost:3000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'student@srkr.edu.in', otp: '555666' }),
      });

      const res = await verifyOtpRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('This verification code is for password reset');
    });

    it('enforces cross-account isolation: User A cannot use their OTP to verify User B', async () => {
      // User B has OTP '111111'
      const saltB = await bcrypt.genSalt(10);
      const hashB = await bcrypt.hash('111111', saltB);

      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'rec-bob',
                email: 'bob@srkr.edu.in',
                otp_hash: hashB,
                verified: false,
                attempts: 0,
                max_attempts: 5,
                expires_at: new Date(Date.now() + 300000).toISOString(),
                registration_data: {
                  userId: 'usr-bob',
                  name: 'Bob',
                  email: 'bob@srkr.edu.in',
                  role: 'STUDENT',
                },
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      // User A tries to verify Bob's account using Alice's OTP ('222222')
      const req = new Request('http://localhost:3000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'bob@srkr.edu.in', otp: '222222' }),
      });

      const res = await verifyOtpRoute(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Invalid OTP');
    });
  });
});
