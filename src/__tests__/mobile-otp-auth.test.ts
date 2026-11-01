import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as mobileLoginRoute } from '@/app/api/auth/mobile-login/route';
import { POST as registerRoute } from '@/app/api/auth/register/route';
import { POST as loginRoute } from '@/app/api/auth/login/route';
import { POST as forgotPasswordRoute } from '@/app/api/auth/forgot-password/route';
import { resetDemoSmsStore, sendDemoSms } from '@/lib/demo-sms';

// Mock Supabase clients
const mockAdminFrom = vi.fn();
const mockAdminGenerateLink = vi.fn();
const mockAdminCreateUser = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
    auth: {
      admin: {
        generateLink: mockAdminGenerateLink,
        createUser: mockAdminCreateUser,
      },
    },
  })),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('Kavach Campus — Mobile Demo OTP Authentication & Email Separation Suite', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetDemoSmsStore();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      ENABLE_DEMO_SMS: 'true',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-that-is-valid-and-long-enough-32-chars',
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetDemoSmsStore();
  });

  // =========================================================================
  // 1. INPUT VALIDATION & SERVICE AVAILABILITY
  // =========================================================================
  describe('1. Input Validation & Service Availability', () => {
    it('returns 503 if SUPABASE_SERVICE_ROLE_KEY is unconfigured or a placeholder', async () => {
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-key';

      const req = new Request('http://localhost:3000/api/auth/mobile-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'send', phone: '9876543210' }),
      });

      const res = await mobileLoginRoute(req);
      const json = await res.json();

      expect(res.status).toBe(503);
      expect(json.error).toMatch(/institutional administrator configuration required/i);
    });

    it('returns 400 for invalid phone numbers (non-digit, < 10 digits, invalid prefix)', async () => {
      const invalidPhones = ['12345', '1234567890', 'abcdefghij', ''];

      for (const p of invalidPhones) {
        const req = new Request('http://localhost:3000/api/auth/mobile-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step: 'send', phone: p }),
        });

        const res = await mobileLoginRoute(req);
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.error).toMatch(/(valid 10-digit.*mobile number|recipient identifier is required)/i);
      }
    });

    it('returns 400 for unrecognized step action', async () => {
      const req = new Request('http://localhost:3000/api/auth/mobile-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'unknown_action', phone: '9876543210' }),
      });

      const res = await mobileLoginRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain('Invalid step parameter');
    });
  });

  // =========================================================================
  // 2. STEP: SEND DEMO OTP
  // =========================================================================
  describe('2. POST /api/auth/mobile-login (step: send)', () => {
    it('returns 404 when phone number does not belong to any registered account', async () => {
      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const req = new Request('http://localhost:3000/api/auth/mobile-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'send', phone: '9876543210' }),
      });

      const res = await mobileLoginRoute(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toMatch(/No registered account found with.*mobile number/i);
    });

    it('returns 503 when demo SMS is disabled (e.g. production without SMS gateway)', async () => {
      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'usr-123',
                full_name: 'Aditya Rao',
                college_email: 'aditya@srkr.edu.in',
                phone: '9876543210',
                role: 'STUDENT',
                is_approved: true,
              },
              error: null,
            }),
          }),
        }),
      });

      process.env.ENABLE_DEMO_SMS = 'false';

      const req = new Request('http://localhost:3000/api/auth/mobile-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'send', phone: '9876543210' }),
      });

      const res = await mobileLoginRoute(req);
      const json = await res.json();

      expect(res.status).toBe(503);
      expect(json.error).toContain('Mobile OTP sign in is unavailable in production mode without a configured SMS gateway');
    });

    it('generates 6-digit CSPRNG Demo OTP, returns demoOtp chip data, and sets demo_sms_token cookie', async () => {
      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'usr-456',
                full_name: 'Pooja Reddy',
                college_email: 'pooja.reddy@srkr.edu.in',
                phone: '9876543210',
                role: 'STUDENT',
                is_approved: true,
              },
              error: null,
            }),
          }),
        }),
      });

      const req = new Request('http://localhost:3000/api/auth/mobile-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'send', phone: '9876543210' }),
      });

      const res = await mobileLoginRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.mode).toBe('DEMO_SMS_MODE');
      expect(json.phone).toBe('9876543210');
      expect(json.demoOtp).toMatch(/^\d{6}$/);
      expect(json.emailMasked).toBe('p***@srkr.edu.in');
      expect(json.simulatedBody).toContain('KAVACH CAMPUS - DEMO SMS');
      expect(res.headers.get('set-cookie')).toContain('demo_sms_token=');
    });

    it('enforces rate limiting when multiple OTP requests are sent rapidly to the same mobile number', async () => {
      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'usr-rate-limit',
                full_name: 'Kiran Kumar',
                college_email: 'kiran@srkr.edu.in',
                phone: '9876543210',
                role: 'STUDENT',
                is_approved: true,
              },
              error: null,
            }),
          }),
        }),
      });

      // Send 5 rapid OTP requests to exhaust rate limit window
      for (let i = 0; i < 5; i++) {
        sendDemoSms('9876543210', 'LOGIN');
      }

      const req = new Request('http://localhost:3000/api/auth/mobile-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'send', phone: '9876543210' }),
      });

      const res = await mobileLoginRoute(req);
      const json = await res.json();

      expect(res.status).toBe(429);
      expect(json.error).toMatch(/Too many requests|wait/i);
    });
  });

  // =========================================================================
  // 3. STEP: VERIFY DEMO OTP & ROLE ROUTING
  // =========================================================================
  describe('3. POST /api/auth/mobile-login (step: verify)', () => {
    it('returns 400 when OTP is missing or not 6 digits', async () => {
      const invalidOtps = ['', '123', '1234567', 'abcdef'];

      for (const otp of invalidOtps) {
        const req = new Request('http://localhost:3000/api/auth/mobile-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step: 'verify', phone: '9876543210', otp }),
        });

        const res = await mobileLoginRoute(req);
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.error).toMatch(/6-digit OTP/i);
      }
    });

    it('returns 404 if phone number has no matching account during verify step', async () => {
      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const req = new Request('http://localhost:3000/api/auth/mobile-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'verify', phone: '9876543210', otp: '123456' }),
      });

      const res = await mobileLoginRoute(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toMatch(/No registered account found with.*mobile number/i);
    });

    it('returns 403 if staff/admin account is pending administrator approval', async () => {
      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'usr-staff-unapproved',
                full_name: 'Dr. Ramesh',
                college_email: 'ramesh@srkr.edu.in',
                phone: '9876543210',
                role: 'STAFF',
                is_approved: false,
                college_id: 'srkr-bhimavaram',
              },
              error: null,
            }),
          }),
        }),
      });

      const req = new Request('http://localhost:3000/api/auth/mobile-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'verify', phone: '9876543210', otp: '123456' }),
      });

      const res = await mobileLoginRoute(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toContain('pending administrator approval');
    });

    it('returns 401 when provided Demo OTP does not match the active store OTP', async () => {
      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'usr-student-active',
                full_name: 'Aditya Student',
                college_email: 'aditya@srkr.edu.in',
                phone: '9876543210',
                role: 'STUDENT',
                is_approved: true,
                college_id: 'srkr-bhimavaram',
              },
              error: null,
            }),
          }),
        }),
      });

      // Generate a legitimate Demo OTP
      sendDemoSms('9876543210', 'LOGIN', '654321');

      // Submit wrong OTP
      const req = new Request('http://localhost:3000/api/auth/mobile-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'verify', phone: '9876543210', otp: '999999' }),
      });

      const res = await mobileLoginRoute(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toMatch(/Invalid OTP/i);
    });

    it('verifies valid Demo OTP successfully, returns authenticated session details and role destination', async () => {
      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'usr-student-approved',
                full_name: 'Aditya Student',
                college_email: 'aditya@srkr.edu.in',
                phone: '9876543210',
                role: 'STUDENT',
                is_approved: true,
                college_id: 'srkr-bhimavaram',
              },
              error: null,
            }),
          }),
        }),
      });

      mockAdminGenerateLink.mockResolvedValue({
        data: {
          properties: {
            hashed_token: 'hash_test_123',
            action_link: 'https://kavach.app/auth/confirm?token_hash=hash_test_123',
          },
        },
      });

      // Generate Demo OTP
      const sms = sendDemoSms('9876543210', 'LOGIN', '555666');
      expect(sms.success).toBe(true);

      const req = new Request('http://localhost:3000/api/auth/mobile-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'verify', phone: '9876543210', otp: '555666' }),
      });

      const res = await mobileLoginRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.user.id).toBe('usr-student-approved');
      expect(json.user.email).toBe('aditya@srkr.edu.in');
      expect(json.user.role).toBe('STUDENT');
      expect(json.destination).toBe('/student');
      expect(json.token_hash).toBe('hash_test_123');
      expect(json.action_link).toContain('token_hash=hash_test_123');
    });

    it('routes unapproved student to /student/verification-status', async () => {
      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'usr-student-pending',
                full_name: 'Pending Student',
                college_email: 'pending@srkr.edu.in',
                phone: '9876543210',
                role: 'STUDENT',
                is_approved: false,
                college_id: 'srkr-bhimavaram',
              },
              error: null,
            }),
          }),
        }),
      });

      sendDemoSms('9876543210', 'LOGIN', '123123');

      const req = new Request('http://localhost:3000/api/auth/mobile-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'verify', phone: '9876543210', otp: '123123' }),
      });

      const res = await mobileLoginRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.destination).toBe('/student/verification-status?notice=verification_required');
    });
  });

  // =========================================================================
  // 4. REGISTRATION: AUTHORITATIVE DUPLICATE EMAIL CHECK
  // =========================================================================
  describe('4. Registration Duplicate Email Rejection', () => {
    it('rejects registration with clear message when email is already registered in profiles', async () => {
      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'existing-registered-user-id' },
              error: null,
            }),
            single: vi.fn().mockResolvedValue({
              data: { id: 'existing-registered-user-id' },
              error: null,
            }),
          }),
        }),
      });

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Existing Student',
          email: 'existing.student@srkr.edu.in',
          password: 'SecurePassword123!',
          phone: '9876543210',
          role: 'STUDENT',
          studentId: '2101201099',
          academicYear: '3rd Year',
        }),
      });

      const res = await registerRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('This email address is already registered. Please sign in or reset your password.');
    });
  });

  // =========================================================================
  // 5. PRIVILEGED ROLE BLOCKING ON MOBILE OTP FLOWS
  // =========================================================================
  describe('5. Privileged Role Protection against Mobile OTP', () => {
    const privilegedRoles = ['ADMIN', 'SUPER_ADMIN', 'MANAGEMENT', 'PRINCIPAL', 'HOD'];

    for (const role of privilegedRoles) {
      it(`blocks ${role} from requesting a mobile demo OTP (step: send)`, async () => {
        mockAdminFrom.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: `usr-${role.toLowerCase()}`,
                  full_name: `${role} Officer`,
                  college_email: `${role.toLowerCase()}@srkr.edu.in`,
                  phone: '9876543210',
                  role,
                  is_approved: true,
                },
                error: null,
              }),
            }),
          }),
        });

        const req = new Request('http://localhost:3000/api/auth/mobile-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step: 'send', phone: '9876543210' }),
        });

        const res = await mobileLoginRoute(req);
        const json = await res.json();

        expect(res.status).toBe(403);
        expect(json.error).toMatch(/Mobile OTP (sign in )?is not permitted for administrative and management roles/i);
      });

      it(`blocks ${role} from verifying a mobile demo OTP (step: verify)`, async () => {
        mockAdminFrom.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: `usr-${role.toLowerCase()}`,
                  full_name: `${role} Officer`,
                  college_email: `${role.toLowerCase()}@srkr.edu.in`,
                  phone: '9876543210',
                  role,
                  is_approved: true,
                },
                error: null,
              }),
            }),
          }),
        });

        const req = new Request('http://localhost:3000/api/auth/mobile-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step: 'verify', phone: '9876543210', otp: '123456' }),
        });

        const res = await mobileLoginRoute(req);
        const json = await res.json();

        expect(res.status).toBe(403);
        expect(json.error).toMatch(/Mobile OTP (sign in )?is not permitted for administrative and management roles/i);
      });
    }
  });

  // =========================================================================
  // 6. POST /api/auth/login PHONE + OTP FLOW
  // =========================================================================
  describe('6. POST /api/auth/login with Phone + OTP', () => {
    it('returns 400 for invalid phone format', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '12345', otp: '123456' }),
      });

      const res = await loginRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toMatch(/valid 10-digit mobile number/i);
    });

    it('returns 400 for invalid 6-digit OTP format', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9876543210', otp: '123' }),
      });

      const res = await loginRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toMatch(/valid 6-digit OTP/i);
    });

    it('returns 404 when phone number is not registered in profiles', async () => {
      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9876543210', otp: '123456' }),
      });

      const res = await loginRoute(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toMatch(/No registered account found with mobile number/i);
    });

    it('returns 403 when user has an administrative role', async () => {
      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'usr-admin-1',
                role: 'ADMIN',
                phone: '9876543210',
                is_approved: true,
              },
              error: null,
            }),
          }),
        }),
      });

      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9876543210', otp: '123456' }),
      });

      const res = await loginRoute(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toMatch(/Mobile OTP is not permitted for administrative and management roles/i);
    });

    it('returns 403 when non-student account is not yet approved', async () => {
      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'usr-staff-1',
                role: 'STAFF',
                phone: '9876543210',
                is_approved: false,
              },
              error: null,
            }),
          }),
        }),
      });

      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9876543210', otp: '123456' }),
      });

      const res = await loginRoute(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toMatch(/Account pending admin approval/i);
    });

    it('returns 401 when demo OTP verification fails', async () => {
      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'usr-student-1',
                role: 'STUDENT',
                phone: '9876543210',
                is_approved: true,
              },
              error: null,
            }),
          }),
        }),
      });

      sendDemoSms('9876543210', 'LOGIN', '111222');

      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9876543210', otp: '999999' }),
      });

      const res = await loginRoute(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toMatch(/Invalid OTP/i);
    });

    it('authenticates student successfully on valid demo OTP', async () => {
      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'usr-student-1',
                full_name: 'Pavan Kumar',
                college_email: 'pavan@srkr.edu.in',
                role: 'STUDENT',
                phone: '9876543210',
                is_approved: true,
              },
              error: null,
            }),
          }),
        }),
      });

      sendDemoSms('9876543210', 'LOGIN', '654321');

      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '9876543210', otp: '654321' }),
      });

      const res = await loginRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.token).toBe('demo-mobile-session-token');
      expect(json.user.id).toBe('usr-student-1');
      expect(json.user.name).toBe('Pavan Kumar');
      expect(json.user.role).toBe('STUDENT');
    });
  });

  // =========================================================================
  // 7. POST /api/auth/forgot-password ACCOUNT EXISTENCE INDICATION
  // =========================================================================
  describe('7. Forgot Password Account Existence Indication', () => {
    it('returns accountExists: false when email is not registered in profiles', async () => {
      mockAdminFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      });

      const req = new Request('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent.user@srkr.edu.in' }),
      });

      const res = await forgotPasswordRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.accountExists).toBe(false);
      expect(json.message).toContain('If an account exists with these matching credentials');
    });
  });
});
