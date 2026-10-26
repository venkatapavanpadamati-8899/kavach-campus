import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as registerRoute } from '@/app/api/auth/register/route';
import { GET as demoSmsGet, POST as demoSmsPost } from '@/app/api/auth/demo-sms/route';
import { POST as verifyOtpRoute } from '@/app/api/auth/verify-otp/route';
import { POST as loginRoute } from '@/app/api/auth/login/route';
import { POST as resetPasswordRoute } from '@/app/api/auth/reset-password/route';
import { GET as getIncident } from '@/app/api/incidents/[id]/route';
import proxy from '@/proxy';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { resetDemoSmsStore } from '@/lib/demo-sms';

// Mocks for Supabase Clients
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

const mockServerFrom = vi.fn();
const mockServerGetUser = vi.fn();
const mockServerSignIn = vi.fn();
const mockServerSignOut = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockServerFrom,
    auth: {
      getUser: mockServerGetUser,
      signInWithPassword: mockServerSignIn,
      signOut: mockServerSignOut,
    },
  })),
}));

const mockProxyGetUser = vi.fn();
const mockProxyFrom = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockProxyGetUser,
    },
    from: mockProxyFrom,
  })),
}));

describe('KAVACH CAMPUS — COMPLETE USER WORKFLOW SCENARIOS (A through M)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    resetDemoSmsStore();
    process.env = { ...originalEnv };
    (process.env as any)['NODE_ENV'] = 'development';
    process.env.ENABLE_DEMO_OTP = 'true';
    process.env.ENABLE_DEMO_SMS = 'true';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key-1234567890';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_valid_service_role_key_more_than_30_characters_long';
  });

  afterEach(() => {
    process.env = originalEnv;
    resetDemoSmsStore();
  });

  // ===========================================================================
  // Scenario A: Student Registration
  // ===========================================================================
  it('Scenario A: Student registration creates OTP verification record and dispatches demo SMS', async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }), // Email not in use
            }),
          }),
        };
      }
      if (table === 'user_otp_verifications') {
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });

    const payload = {
      name: 'Aditya Varma',
      email: 'aditya.student@campus.edu',
      password: 'StrongPassword123!',
      role: 'STUDENT',
      registrationNumber: '2101201045',
      department: 'Computer Science',
    };

    const req = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await registerRoute(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.message).toBe('Demo OTP generated; no real SMS or email was sent.');
    expect(data.email).toBe('aditya.student@campus.edu');
    expect(data.clientToken).toBeDefined();
  });

  it('does not claim OTP delivery when production email delivery is unavailable', async () => {
    (process.env as any)['NODE_ENV'] = 'production';
    process.env.ENABLE_DEMO_OTP = 'false';
    process.env.ENABLE_DEMO_SMS = 'false';

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      if (table === 'user_otp_verifications') {
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });

    const req = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Production Student',
        email: 'student@campus.edu',
        password: 'StrongPassword123!',
        role: 'STUDENT',
        registrationNumber: '2101201045',
      }),
    });

    const res = await registerRoute(req);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      error: 'OTP email delivery is not available for registration. Please contact the institution administrator.',
    });
  });

  // ===========================================================================
  // Scenario B: Demo OTP Request
  // ===========================================================================
  it('Scenario B: Demo OTP request dispatches simulated SMS and sets session cookie', async () => {
    const req = new Request('http://localhost:3000/api/auth/demo-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: 'rahul.test@campus.edu', purpose: 'REGISTRATION' }),
    });

    const res = await demoSmsPost(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.mode).toBe('DEMO_SMS_MODE');
    expect(data.clientToken).toBeDefined();
    expect(data.message.recipient).toBe('rahul.test@campus.edu');
    expect(data.message.otp).toMatch(/^\d{6}$/);
  });

  // ===========================================================================
  // Scenario C: Demo SMS Inbox Display
  // ===========================================================================
  it('Scenario C: Authorized client can display demo SMS inbox; unauthorized access is blocked', async () => {
    // 1. Dispatch SMS
    const postReq = new Request('http://localhost:3000/api/auth/demo-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: 'inbox.test@campus.edu', purpose: 'REGISTRATION', fixedOtp: '234567' }),
    });
    const postRes = await demoSmsPost(postReq);
    const postData = await postRes.json();
    const token = postData.clientToken;

    // 2. Query with valid token: SUCCESS
    const authGetReq = new Request(`http://localhost:3000/api/auth/demo-sms?recipient=inbox.test@campus.edu&token=${token}`);
    const authGetRes = await demoSmsGet(authGetReq);
    expect(authGetRes.status).toBe(200);
    const authGetData = await authGetRes.json();
    expect(authGetData.otp).toBe('234567');
    expect(authGetData.message.body).toContain('KAVACH CAMPUS - DEMO SMS');

    // 3. Query without token: 401 UNAUTHORIZED
    const noTokenReq = new Request('http://localhost:3000/api/auth/demo-sms?recipient=inbox.test@campus.edu');
    const noTokenRes = await demoSmsGet(noTokenReq);
    expect(noTokenRes.status).toBe(401);

    // 4. Query with attacker token: 403 FORBIDDEN
    const wrongTokenReq = new Request('http://localhost:3000/api/auth/demo-sms?recipient=inbox.test@campus.edu&token=attacker-fake-token');
    const wrongTokenRes = await demoSmsGet(wrongTokenReq);
    expect(wrongTokenRes.status).toBe(403);
  });

  // ===========================================================================
  // Scenario D: Correct OTP Verification
  // ===========================================================================
  it('Scenario D: Correct OTP verification creates Supabase user and tags demo verification', async () => {
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash('889900', salt);

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'user_otp_verifications') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'otp-record-1',
                  email: 'verified.student@campus.edu',
                  otp_hash: otpHash,
                  expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                  attempts: 0,
                  max_attempts: 5,
                  registration_data: {
                    name: 'Kavya Sharma',
                    email: 'verified.student@campus.edu',
                    password: 'SecurePassword123!',
                    role: 'STUDENT',
                    collegeId: 'STU-2026-002',
                    department: 'ECE',
                    isApproved: true,
                  },
                },
                error: null,
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 'otp-record-1' },
                    error: null,
                  }),
                })),
              })),
            })),
          })),
        };
      }
      if (table === 'profiles') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === 'student_profiles') {
        return {
          upsert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });

    mockAdminCreateUser.mockResolvedValueOnce({
      data: { user: { id: 'usr-kavya-1' } },
      error: null,
    });

    const verifyReq = new Request('http://localhost:3000/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'verified.student@campus.edu', otp: '889900' }),
    });

    const verifyRes = await verifyOtpRoute(verifyReq);
    expect(verifyRes.status).toBe(200);
    const verifyData = await verifyRes.json();
    expect(verifyData.success).toBe(true);

    // Verify createUser was invoked with user_metadata
    expect(mockAdminCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'verified.student@campus.edu',
        email_confirm: true,
        user_metadata: expect.objectContaining({
          full_name: 'Kavya Sharma',
          role: 'STUDENT',
        }),
      })
    );
  });

  // ===========================================================================
  // Scenario E: Incorrect OTP Rejection
  // ===========================================================================
  it('Scenario E: Incorrect OTP is rejected with 401 and increments attempts', async () => {
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash('889900', salt);
    const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'user_otp_verifications') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'otp-record-wrong',
                  email: 'wrong.student@campus.edu',
                  otp_hash: otpHash,
                  expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                  attempts: 1,
                  max_attempts: 5,
                  registration_data: { email: 'wrong.student@campus.edu', role: 'STUDENT' },
                },
                error: null,
              }),
            }),
          }),
          update: mockUpdate,
        };
      }
      return {};
    });

    const req = new Request('http://localhost:3000/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'wrong.student@campus.edu', otp: '000000' }),
    });

    const res = await verifyOtpRoute(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Invalid OTP');
    expect(mockUpdate).toHaveBeenCalledWith({ attempts: 2 });
  });

  // ===========================================================================
  // Scenario F: Expired OTP Rejection
  // ===========================================================================
  it('Scenario F: Expired OTP is rejected with 400 and deleted from pending storage', async () => {
    const mockDelete = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'user_otp_verifications') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'otp-expired-1',
                  email: 'expired.student@campus.edu',
                  otp_hash: 'somehash',
                  expires_at: new Date(Date.now() - 60 * 1000).toISOString(), // Expired 1 min ago
                  attempts: 0,
                  max_attempts: 5,
                },
                error: null,
              }),
            }),
          }),
          delete: mockDelete,
        };
      }
      return {};
    });

    const req = new Request('http://localhost:3000/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'expired.student@campus.edu', otp: '123456' }),
    });

    const res = await verifyOtpRoute(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('expired');
    expect(mockDelete).toHaveBeenCalled();
  });

  // ===========================================================================
  // Scenario G: OTP Replay Rejection
  // ===========================================================================
  it('Scenario G: Replayed OTP is rejected because the record is deleted upon first verification', async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'user_otp_verifications') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null, // Record was already deleted after first verification!
                error: { message: 'Not found' },
              }),
            }),
          }),
        };
      }
      return {};
    });

    const replayReq = new Request('http://localhost:3000/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'replay.student@campus.edu', otp: '889900' }),
    });

    const res = await verifyOtpRoute(replayReq);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain('No pending registration found');
  });

  // ===========================================================================
  // Scenario H: OTP Resend Cooldown
  // ===========================================================================
  it('Scenario H: Immediate resend request is rate-limited with 429 cooldown error', async () => {
    const firstReq = new Request('http://localhost:3000/api/auth/demo-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: 'cooldown.user@campus.edu', purpose: 'REGISTRATION' }),
    });
    const firstRes = await demoSmsPost(firstReq);
    expect(firstRes.status).toBe(200);

    // Immediate second request
    const secondReq = new Request('http://localhost:3000/api/auth/demo-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: 'cooldown.user@campus.edu', purpose: 'REGISTRATION' }),
    });
    const secondRes = await demoSmsPost(secondReq);
    expect(secondRes.status).toBe(429);
    const secondData = await secondRes.json();
    expect(secondData.error).toContain('Please wait');
  });

  // ===========================================================================
  // Scenario I: OTP Request Rate Limiting
  // ===========================================================================
  it('Scenario I: More than 3 requests in 5 minutes are rejected with 429', async () => {
    const recipient = 'ratelimit.user@campus.edu';
    // Import and send directly with skipCooldown to simulate 3 quick requests
    const { sendDemoSms } = await import('@/lib/demo-sms');
    expect(sendDemoSms(recipient, 'REGISTRATION', '111111', true).success).toBe(true);
    expect(sendDemoSms(recipient, 'REGISTRATION', '222222', true).success).toBe(true);
    expect(sendDemoSms(recipient, 'REGISTRATION', '333333', true).success).toBe(true);

    // 4th request via API
    const req = new Request('http://localhost:3000/api/auth/demo-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient, purpose: 'REGISTRATION' }),
    });
    const res = await demoSmsPost(req);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toContain('Too many OTP requests');
  });

  // ===========================================================================
  // Scenario J: Login After Registration
  // ===========================================================================
  it('Scenario J: Login succeeds for verified student and rejects invalid credentials', async () => {
    // 1. Success login
    mockServerSignIn.mockResolvedValueOnce({
      data: {
        user: { id: 'usr-student-aditya', email: 'aditya.student@campus.edu' },
        session: { access_token: 'valid_mock_jwt_access_token' },
      },
      error: null,
    });

    mockServerFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'usr-student-aditya',
                  full_name: 'Aditya Varma',
                  role: 'STUDENT',
                  is_approved: true,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    const loginReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aditya.student@campus.edu', password: 'StrongPassword123!' }),
    });

    const loginRes = await loginRoute(loginReq);
    expect(loginRes.status).toBe(200);
    const loginData = await loginRes.json();
    expect(loginData.token).toBe('valid_mock_jwt_access_token');
    expect(loginData.user.role).toBe('STUDENT');

    // 2. Failed login with bad password
    mockServerSignIn.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    const badLoginReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aditya.student@campus.edu', password: 'WrongPassword!' }),
    });
    const badLoginRes = await loginRoute(badLoginReq);
    expect(badLoginRes.status).toBe(401);
  });

  // ===========================================================================
  // Scenario K: Logout & Session Invalidation
  // ===========================================================================
  it('Scenario K: Proxy redirects unauthenticated requests on protected routes to /login', async () => {
    mockProxyGetUser.mockResolvedValueOnce({
      data: { user: null },
    });

    const nextReq = new NextRequest('http://localhost:3000/student');
    const proxyRes = await proxy(nextReq);

    // Unauthenticated user attempting to access /student is redirected to /login
    expect(proxyRes.status).toBe(307);
    expect(proxyRes.headers.get('location')).toContain('/login');
  });

  // ===========================================================================
  // Scenario L: Protected Dashboard Access
  // ===========================================================================
  it('Scenario L: Verified student can access verification status and SOS portals', async () => {
    mockProxyGetUser.mockResolvedValue({
      data: { user: { id: 'usr-student-verified' } },
    });
    mockProxyFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { role: 'STUDENT', is_approved: true },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'student_profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { verification_status: 'VERIFIED' },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    const nextReq = new NextRequest('http://localhost:3000/student/sos');
    const proxyRes = await proxy(nextReq);
    expect(proxyRes.status).toBe(200);
    expect(proxyRes.headers.get('x-user-id')).toBe('usr-student-verified');
    expect(proxyRes.headers.get('x-user-role')).toBe('STUDENT');
  });

  // ===========================================================================
  // Scenario M: Unauthorized Access to Another Student's Data
  // ===========================================================================
  it('Scenario M: Student A is strictly forbidden (403) from accessing Student B incident data', async () => {
    // Authenticated as Student A
    mockServerGetUser.mockResolvedValueOnce({
      data: { user: { id: 'student-A-id' } },
    });

    mockServerFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'student-A-id', role: 'STUDENT', is_approved: true },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'incidents') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'incident-belonging-to-B',
                  student_id: 'student-B-id', // Belongs to Student B!
                  category: 'BULLYING',
                  severity: 'HIGH',
                  status: 'ASSIGNED',
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    const req = new Request('http://localhost:3000/api/incidents/incident-belonging-to-B');
    const res = await getIncident(req, { params: Promise.resolve({ id: 'incident-belonging-to-B' }) });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Forbidden');
  });

  // ===========================================================================
  // Scenario N: Password Recovery cannot be bypassed with static demo OTP ('123456')
  // ===========================================================================
  it("Scenario N: Password Recovery rejects static demo OTP ('123456') and prevents account takeover", async () => {
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash('778899', salt);
    const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'user_otp_verifications') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'recovery-rec-1',
                  email: 'victim@campus.edu',
                  otp_hash: otpHash,
                  expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                  attempts: 0,
                  max_attempts: 5,
                  registration_data: { userId: 'usr-victim-id' },
                },
                error: null,
              }),
            }),
          }),
          update: mockUpdate,
        };
      }
      return {};
    });

    // Attacker tries to reset victim's password using static demo OTP '123456'
    const resetReq = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'victim@campus.edu',
        otp: '123456',
        password: 'AttackerNewPassword123!',
      }),
    });

    const resetRes = await resetPasswordRoute(resetReq);
    expect(resetRes.status).toBe(401);
    const resetData = await resetRes.json();
    expect(resetData.error).toBe('Invalid verification OTP');
    expect(mockAdminUpdateUserById).not.toHaveBeenCalled();
  });

  // ===========================================================================
  // Scenario O: Password Recovery succeeds only with valid user-bound OTP
  // ===========================================================================
  it('Scenario O: Password Recovery succeeds with valid matching OTP and updates password', async () => {
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash('778899', salt);
    const mockDelete = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'user_otp_verifications') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'recovery-rec-2',
                  email: 'student.recover@campus.edu',
                  otp_hash: otpHash,
                  expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                  attempts: 0,
                  max_attempts: 5,
                  registration_data: { userId: 'usr-recover-id' },
                },
                error: null,
              }),
            }),
          }),
          delete: mockDelete,
        };
      }
      if (table === 'audit_logs') {
        return {
          insert: mockAuditInsert,
        };
      }
      return {};
    });

    mockAdminUpdateUserById.mockResolvedValueOnce({
      data: { user: { id: 'usr-recover-id' } },
      error: null,
    });

    const resetReq = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student.recover@campus.edu',
        otp: '778899',
        password: 'NewLegitPassword123!',
      }),
    });

    const resetRes = await resetPasswordRoute(resetReq);
    expect(resetRes.status).toBe(200);
    const resetData = await resetRes.json();
    expect(resetData.success).toBe(true);
    expect(mockAdminUpdateUserById).toHaveBeenCalledWith('usr-recover-id', {
      password: 'NewLegitPassword123!',
    });
    expect(mockDelete).toHaveBeenCalled();
    expect(mockAuditInsert).toHaveBeenCalled();
  });
});
