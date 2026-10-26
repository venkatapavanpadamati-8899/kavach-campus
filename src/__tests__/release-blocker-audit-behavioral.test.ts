import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET as getIncidentsRoute } from '@/app/api/incidents/route';
import { POST as uploadEvidenceRoute, GET as getEvidenceRoute } from '@/app/api/incidents/[id]/evidence/route';
import { POST as registerRoute } from '@/app/api/auth/register/route';
import { POST as sosRoute } from '@/app/api/sos/route';
import { POST as safeWalkTimeoutCron } from '@/app/api/cron/safe-walk-timeout/route';
import {
  sendSmsNotification,
  sendEmailNotification,
  sendPushNotification,
  isTwilioConfigured,
  isSmtpConfigured,
  isFcmConfigured,
  isRealDeliveryEnabled,
} from '@/lib/notifications';

// Mocks for Supabase Client & Admin
const mockAdminFrom = vi.fn();
const mockAdminCreateUser = vi.fn();
const mockAdminStorageUpload = vi.fn();
const mockAdminStorageRemove = vi.fn();
const mockAdminStorageCreateSignedUrl = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
    auth: {
      admin: {
        createUser: mockAdminCreateUser,
      },
    },
    storage: {
      from: vi.fn(() => ({
        upload: mockAdminStorageUpload,
        remove: mockAdminStorageRemove,
        createSignedUrl: mockAdminStorageCreateSignedUrl,
      })),
    },
  })),
}));

const mockServerFrom = vi.fn();
const mockServerGetUser = vi.fn();
const mockServerStorageCreateSignedUrl = vi.fn();
const mockServerStorageUpload = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockServerFrom,
    auth: {
      getUser: mockServerGetUser,
    },
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: mockServerStorageCreateSignedUrl,
        upload: mockServerStorageUpload,
      })),
    },
  })),
}));

describe('Kavach Campus — Release Blocker Audit Behavioral Test Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key-with-sufficient-length-2026';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key-kavach-campus-super-secure-token-2026';
    process.env.ENABLE_DEMO_OTP = 'true';
    process.env.ENABLE_DEMO_SMS = 'true';
    delete process.env.ENABLE_REAL_NOTIFICATIONS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // =========================================================================
  // 1. INCIDENTS LISTING (GET /api/incidents) AUTHORIZATION & MASKING
  // =========================================================================
  describe('1. GET /api/incidents Authorization & Privacy Masking', () => {
    it('returns 401 when request is unauthenticated', async () => {
      mockServerGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('No session') });

      const res = await getIncidentsRoute();
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 403 when student ID card is unverified (PENDING_UPLOAD)', async () => {
      mockServerGetUser.mockResolvedValueOnce({
        data: { user: { id: 'unverified-student-uuid' } },
        error: null,
      });

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'STUDENT' },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'student_profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { verification_status: 'PENDING_UPLOAD' },
                  error: null,
                }),
              })),
            })),
          };
        }
        return {};
      });

      const res = await getIncidentsRoute();
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Student ID verification required');
      expect(data.verificationStatus).toBe('PENDING_UPLOAD');
    });

    it('returns only student own incidents for verified student and masks anonymous authors', async () => {
      mockServerGetUser.mockResolvedValueOnce({
        data: { user: { id: 'student-alice-uuid' } },
        error: null,
      });

      const queryEqMock = vi.fn();

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'STUDENT' },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'student_profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { verification_status: 'VERIFIED' },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  eq: queryEqMock.mockResolvedValue({
                    data: [
                      {
                        id: 'inc-1',
                        case_id: 'KC-2026-0001',
                        student_id: 'student-alice-uuid',
                        is_anonymous: false,
                        description: 'Broken lamp post',
                      },
                      {
                        id: 'inc-2',
                        case_id: 'KC-2026-0002',
                        student_id: 'student-alice-uuid',
                        is_anonymous: true,
                        description: 'Anonymous harassment complaint by Alice',
                      },
                    ],
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        return {};
      });

      const res = await getIncidentsRoute();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.incidents).toHaveLength(2);
      expect(queryEqMock).toHaveBeenCalledWith('student_id', 'student-alice-uuid');
      // Alice owns both, so student_id remains visible to owner
      expect(data.incidents[0].student_id).toBe('student-alice-uuid');
      expect(data.incidents[1].student_id).toBe('student-alice-uuid');
    });
  });

  // =========================================================================
  // 2. EVIDENCE UPLOAD (POST /api/incidents/[id]/evidence) AUTHORIZATION
  // =========================================================================
  describe('2. POST /api/incidents/[id]/evidence Authorization & Validation', () => {
    it('rejects unauthorized student trying to upload evidence to another student incident (403)', async () => {
      mockServerGetUser.mockResolvedValueOnce({
        data: { user: { id: 'attacker-student-uuid' } },
        error: null,
      });

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'inc-victim-uuid',
                    case_id: 'KC-2026-VICTIM',
                    student_id: 'victim-student-uuid',
                    assigned_to: 'security-officer-uuid',
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'STUDENT' },
                  error: null,
                }),
              })),
            })),
          };
        }
        return {};
      });

      const formData = new FormData();
      const fakeFile = new File(['image-content'], 'test.png', { type: 'image/png' });
      formData.append('file', fakeFile);

      const req = new Request('http://localhost:3000/api/incidents/inc-victim-uuid/evidence', {
        method: 'POST',
        body: formData,
      });

      const res = await uploadEvidenceRoute(req, {
        params: Promise.resolve({ id: 'inc-victim-uuid' }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Forbidden');
    });

    it('rejects unsupported file MIME type like HTML or executable scripts (400)', async () => {
      mockServerGetUser.mockResolvedValueOnce({
        data: { user: { id: 'legit-student-uuid' } },
        error: null,
      });

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'inc-legit-uuid',
                    case_id: 'KC-2026-LEGIT',
                    student_id: 'legit-student-uuid',
                    assigned_to: null,
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'STUDENT' },
                  error: null,
                }),
              })),
            })),
          };
        }
        return {};
      });

      const formData = new FormData();
      const scriptFile = new File(['<script>alert(1)</script>'], 'malicious.html', { type: 'text/html' });
      formData.append('file', scriptFile);

      const req = new Request('http://localhost:3000/api/incidents/inc-legit-uuid/evidence', {
        method: 'POST',
        body: formData,
      });

      const res = await uploadEvidenceRoute(req, {
        params: Promise.resolve({ id: 'inc-legit-uuid' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Unsupported file type');
    });

    it('cleans up storage object if metadata database insertion fails', async () => {
      mockServerGetUser.mockResolvedValueOnce({
        data: { user: { id: 'legit-student-uuid' } },
        error: null,
      });

      mockAdminStorageUpload.mockResolvedValueOnce({ data: { path: 'KC-2026-LEGIT/file.png' }, error: null });
      mockAdminStorageRemove.mockResolvedValueOnce({ data: [], error: null });

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'inc-legit-uuid',
                    case_id: 'KC-2026-LEGIT',
                    student_id: 'legit-student-uuid',
                    assigned_to: null,
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'STUDENT' },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'evidence') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: new Error('Postgres connection failed during metadata insert'),
                }),
              })),
            })),
          };
        }
        return {};
      });

      const formData = new FormData();
      const validFile = new File(['valid-image-bytes'], 'valid.png', { type: 'image/png' });
      formData.append('file', validFile);

      const req = new Request('http://localhost:3000/api/incidents/inc-legit-uuid/evidence', {
        method: 'POST',
        body: formData,
      });

      const res = await uploadEvidenceRoute(req, {
        params: Promise.resolve({ id: 'inc-legit-uuid' }),
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Failed to record evidence metadata');
      expect(mockAdminStorageRemove).toHaveBeenCalled();
    });

    it('rejects unauthenticated caller trying to fetch evidence records (401)', async () => {
      mockServerGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('No session'),
      });

      const req = new Request('http://localhost:3000/api/incidents/inc-legit-uuid/evidence');
      const res = await getEvidenceRoute(req, {
        params: Promise.resolve({ id: 'inc-legit-uuid' }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  // =========================================================================
  // 3. REGISTRATION PASSWORD SECURITY & ROLE ESCALATION
  // =========================================================================
  describe('3. Registration Security & Privilege Escalation', () => {
    it('blocks self-requested administrative and management roles (403)', async () => {
      const privilegedRoles = ['ADMIN', 'SUPER_ADMIN', 'MANAGEMENT', 'PRINCIPAL', 'HOD'];

      for (const forbiddenRole of privilegedRoles) {
        const body = {
          name: 'Privilege Escalation Tester',
          email: `attacker.${forbiddenRole.toLowerCase()}@srkr.edu.in`,
          password: 'ValidPassword123#',
          role: forbiddenRole,
          campusId: 'srkr-bhimavaram',
        };

        const req = new Request('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const res = await registerRoute(req);
        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.error).toContain('cannot be self-assigned');
      }
    });

    it('rejects passwords shorter than 8 characters (400)', async () => {
      const body = {
        name: 'Short Password Tester',
        email: 'shortpass@srkr.edu.in',
        password: '123',
        role: 'STUDENT',
      };

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const res = await registerRoute(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('at least 8 characters');
    });

    it('rejects registration with invalid mobile numbers (400)', async () => {
      const body = {
        name: 'Invalid Phone Tester',
        email: 'invalidphone@srkr.edu.in',
        phone: '12345',
        password: 'ValidPassword123!',
        role: 'STUDENT',
      };

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const res = await registerRoute(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('valid 10-digit mobile number');
    });

    it('assigns the campus from the verified email domain, not the client selection', async () => {
      let insertedRegistrationData: Record<string, unknown> | null = null;
      mockAdminCreateUser.mockResolvedValueOnce({
        data: { user: { id: 'auth-user-phone-123' } },
        error: null,
      });

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          };
        }
        if (table === 'user_otp_verifications') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
            insert: vi.fn((payload) => {
              insertedRegistrationData = payload.registration_data;
              return Promise.resolve({ error: null });
            }),
          };
        }
        return {};
      });

      const body = {
        name: 'Mobile Student',
        email: 'mobile.student@srkr.edu.in',
        phone: '+91 98765 43210',
        password: 'SuperSecurePassword2026!',
        role: 'STUDENT',
        collegeId: '2101201045',
        campusId: 'vishnu-bhimavaram',
        department: 'CSE',
      };

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const res = await registerRoute(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.email).toBe('mobile.student@srkr.edu.in');

      // Verify normalized phone saved in Auth metadata
      expect(mockAdminCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          user_metadata: expect.objectContaining({
            phone: '9876543210',
          }),
        })
      );

      // Verify phone persisted in registration_data
      expect(insertedRegistrationData).toBeDefined();
      expect(insertedRegistrationData).toHaveProperty('phone', '9876543210');
      expect(insertedRegistrationData).toHaveProperty('campusId', 'srkr-bhimavaram');
      expect(insertedRegistrationData).toHaveProperty('isApproved', true);
      expect(data.campusVerificationRequired).toBe(false);
    });

    it('keeps registration with an unmapped email pending campus verification', async () => {
      let insertedRegistrationData: Record<string, unknown> | null = null;
      mockAdminCreateUser.mockResolvedValueOnce({
        data: { user: { id: 'auth-user-unmapped-email' } },
        error: null,
      });

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          };
        }
        if (table === 'user_otp_verifications') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
            insert: vi.fn((payload) => {
              insertedRegistrationData = payload.registration_data;
              return Promise.resolve({ error: null });
            }),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Personal Email Student',
          email: 'personal.student@gmail.com',
          password: 'SuperSecurePassword2026!',
          role: 'STUDENT',
          campusId: 'srkr-bhimavaram',
          registrationNumber: '2101201045',
        }),
      });

      const res = await registerRoute(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.campusVerificationRequired).toBe(true);
      expect(insertedRegistrationData).toHaveProperty('campusId', 'PENDING_CAMPUS_VERIFICATION');
      expect(insertedRegistrationData).toHaveProperty('isApproved', false);
    });
  });

  // =========================================================================
  // 4. SOS DUPLICATE PREVENTION & LOCATION BOUNDARY CHECKS
  // =========================================================================
  describe('4. SOS Duplicate Prevention & Location Coordinates Validation', () => {
    it('rejects invalid latitude > 90 or < -90 (400)', async () => {
      mockServerGetUser.mockResolvedValueOnce({
        data: { user: { id: 'sos-student-1' } },
        error: null,
      });

      const req = new Request('http://localhost:3000/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: 120.5, longitude: 81.49 }),
      });

      const res = await sosRoute(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid coordinates');
    });

    it('rejects invalid longitude > 180 or < -180 (400)', async () => {
      mockServerGetUser.mockResolvedValueOnce({
        data: { user: { id: 'sos-student-1' } },
        error: null,
      });

      const req = new Request('http://localhost:3000/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: 16.54, longitude: 200.0 }),
      });

      const res = await sosRoute(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid coordinates');
    });

    it('returns existing active SOS without creating duplicates if student presses repeatedly', async () => {
      mockServerGetUser.mockResolvedValueOnce({
        data: { user: { id: 'sos-student-repeat' } },
        error: null,
      });

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    in: vi.fn(() => ({
                      limit: vi.fn().mockResolvedValue({
                        data: [{ id: 'active-sos-uuid', case_id: 'SOS-2026-ACTIVE' }],
                        error: null,
                      }),
                    })),
                  })),
                })),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: 16.5449, longitude: 81.4975 }),
      });

      const res = await sosRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.isExisting).toBe(true);
      expect(data.caseId).toBe('SOS-2026-ACTIVE');
    });
  });

  // =========================================================================
  // 5. CRON AUTHORIZATION & SAFE WALK TIMEOUT PROTECTION
  // =========================================================================
  describe('5. Safe Walk Timeout Cron Authorization', () => {
    it('rejects unauthenticated cron request without valid Bearer secret (401)', async () => {
      process.env.CRON_SECRET = 'super-secret-cron-token-xyz';

      const req = new Request('http://localhost:3000/api/cron/safe-walk-timeout', {
        method: 'POST',
      });

      const res = await safeWalkTimeoutCron(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('accepts cron request with matching Bearer token', async () => {
      process.env.CRON_SECRET = 'valid-cron-token-123';

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'safe_walks') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                lt: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/cron/safe-walk-timeout', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-cron-token-123' },
      });

      const res = await safeWalkTimeoutCron(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.overdueProcessed).toBe(0);
    });
  });

  // =========================================================================
  // 6. NOTIFICATION ADAPTERS TRUTHFULNESS & RESILIENCE
  // =========================================================================
  describe('6. Notification Adapters Truthful Status Reporting', () => {
    it('isTwilioConfigured, isSmtpConfigured, and isFcmConfigured return false when env variables are missing', () => {
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;
      delete process.env.TWILIO_PHONE_NUMBER;
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      delete process.env.FCM_PROJECT_ID;
      delete process.env.FCM_CLIENT_EMAIL;
      delete process.env.FCM_PRIVATE_KEY;
      expect(isTwilioConfigured()).toBe(false);
      expect(isSmtpConfigured()).toBe(false);
      expect(isFcmConfigured()).toBe(false);
    });

    it('sendSmsNotification returns NOT_CONFIGURED when Twilio credentials are unset', async () => {
      delete process.env.TWILIO_ACCOUNT_SID;
      const res = await sendSmsNotification({
        toPhone: '+919876543210',
        body: 'Emergency Test Message',
        idempotencyKey: 'test-sms-not-configured',
      });
      expect(res.success).toBe(false);
      expect(res.status).toBe('NOT_CONFIGURED');
      expect(res.provider).toBe('TWILIO');
    });

    it('sendEmailNotification returns NOT_CONFIGURED when SMTP credentials are unset', async () => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      const res = await sendEmailNotification({
        toEmail: 'student@srkr.edu.in',
        subject: 'Test Subject',
        body: 'Test Body',
        idempotencyKey: 'test-email-not-configured',
      });
      expect(res.success).toBe(false);
      expect(res.status).toBe('NOT_CONFIGURED');
      expect(res.provider).toBe('SMTP');
    });

    it('sendPushNotification returns NOT_CONFIGURED when FCM credentials are unset', async () => {
      delete process.env.FCM_PROJECT_ID;
      delete process.env.FCM_CLIENT_EMAIL;
      delete process.env.FCM_PRIVATE_KEY;
      const res = await sendPushNotification({
        userId: 'test-user-id',
        title: 'Emergency Alert',
        body: 'Please respond',
        idempotencyKey: 'test-push-not-configured',
      });
      expect(res.success).toBe(false);
      expect(res.status).toBe('NOT_CONFIGURED');
      expect(res.provider).toBe('FCM');
    });

    it('isRealDeliveryEnabled defaults to false without ENABLE_REAL_NOTIFICATIONS=true', () => {
      delete process.env.ENABLE_REAL_NOTIFICATIONS;
      expect(isRealDeliveryEnabled()).toBe(false);
      process.env.ENABLE_REAL_NOTIFICATIONS = 'false';
      expect(isRealDeliveryEnabled()).toBe(false);
      process.env.ENABLE_REAL_NOTIFICATIONS = 'true';
      expect(isRealDeliveryEnabled()).toBe(true);
    });
  });
});
