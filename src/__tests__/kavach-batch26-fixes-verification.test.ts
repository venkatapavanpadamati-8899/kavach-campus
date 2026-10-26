import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as registerRoute } from '@/app/api/auth/register/route';
import { POST as verifyOtpRoute } from '@/app/api/auth/verify-otp/route';
import { POST as createIncidentRoute } from '@/app/api/incidents/route';
import { GET as getNearbyStaffRoute } from '@/app/api/incidents/[id]/nearby-staff/route';
import bcrypt from 'bcryptjs';

// --- Mocks for Supabase Client & Admin ---
const mockAdminFrom = vi.fn();
const mockAdminCreateUser = vi.fn();
const mockAdminUpdateUserById = vi.fn();
const mockAdminDeleteUser = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
    auth: {
      admin: {
        createUser: mockAdminCreateUser,
        updateUserById: mockAdminUpdateUserById,
        deleteUser: mockAdminDeleteUser,
      },
    },
  })),
}));

const mockServerFrom = vi.fn();
const mockServerGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockServerFrom,
    auth: {
      getUser: mockServerGetUser,
    },
  })),
}));

vi.mock('@/lib/ai', () => ({
  analyzeIncident: vi.fn(async (description: string) => ({
    category: description.toLowerCase().includes('harass') ? 'HARASSMENT' : 'GENERAL',
    severity: 'L2',
    urgency: 'MEDIUM',
    confidence: 0.92,
    summary: 'Analyzed complaint',
  })),
}));

describe('Kavach Campus — Batch 26 Verified Defects Remediation Suite', () => {
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
  // PHASE 2: CRITICAL REGISTRATION PASSWORD SECURITY & LIFECYCLE
  // =========================================================================
  describe('Phase 2 — Registration Password Security & Lifecycle', () => {
    it('1. POST /api/auth/register never persists plaintext password in user_otp_verifications', async () => {
      let savedRegistrationData: Record<string, unknown> | null = null;

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
            insert: vi.fn((payload: Record<string, unknown>) => {
              savedRegistrationData = payload.registration_data as Record<string, unknown>;
              return { error: null };
            }),
          };
        }
        return {};
      });

      mockAdminCreateUser.mockResolvedValue({
        data: { user: { id: 'auth-user-uuid-123' } },
        error: null,
      });

      const body = {
        name: 'Bhimavaram Student',
        email: 'secure.student@srkr.edu.in',
        password: 'SuperSecretPassword#2026',
        role: 'STUDENT',
        phone: '9876543210',
        registrationNumber: '2101201045',
        department: 'CSE',
      };

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const res = await registerRoute(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.email).toBe('secure.student@srkr.edu.in');
      expect(mockAdminCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'secure.student@srkr.edu.in',
          password: 'SuperSecretPassword#2026',
          email_confirm: false,
        })
      );

      // Verify that registration_data stored in DB does NOT contain plaintext password!
      expect(savedRegistrationData).toBeDefined();
      expect(savedRegistrationData).not.toHaveProperty('password');
      expect((savedRegistrationData as unknown as Record<string, unknown>).userId).toBe('auth-user-uuid-123');
    });

    it('2. POST /api/auth/register enforces 60-second cooldown on resend requests', async () => {
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
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'recent-otp-1',
                    created_at: new Date(Date.now() - 20 * 1000).toISOString(), // 20s ago (< 60s cooldown)
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Cooldown Student',
          email: 'cooldown.student@srkr.edu.in',
          password: 'ValidPassword123!',
          role: 'STUDENT',
          registrationNumber: '2101201045',
        }),
      });

      const res = await registerRoute(req);
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toMatch(/Please wait.*before requesting/i);
    });

    it('3. POST /api/auth/verify-otp confirms pre-created user without needing plaintext password', async () => {
      const hashedOtp = await bcrypt.hash('654321', 10);

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'user_otp_verifications') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'otp-rec-1',
                    email: 'verify.student@srkr.edu.in',
                    otp_hash: hashedOtp,
                    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                    attempts: 0,
                    max_attempts: 5,
                    verified: false,
                    registration_data: {
                      userId: 'pre-created-user-999',
                      name: 'Verified Student',
                      email: 'verify.student@srkr.edu.in',
                      role: 'STUDENT',
                      collegeId: '24B91A0501',
                      department: 'CSE',
                      isApproved: true,
                    },
                  },
                  error: null,
                }),
              })),
            })),
            update: vi.fn((payload: Record<string, unknown>) => payload.verified === true
              ? ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      select: vi.fn(() => ({
                        maybeSingle: vi.fn().mockResolvedValue({
                          data: { id: 'otp-rec-1' },
                          error: null,
                        }),
                      })),
                    })),
                  })),
                })
              : ({
                  eq: vi.fn().mockResolvedValue({ error: null }),
                })),
            delete: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
        if (table === 'profiles') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'student_profiles') {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      });

      mockAdminCreateUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'User already registered' },
      });

      mockAdminUpdateUserById.mockResolvedValue({
        data: { user: { id: 'pre-created-user-999' } },
        error: null,
      });

      const req = new Request('http://localhost:3000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'verify.student@srkr.edu.in',
          otp: '654321',
        }),
      });

      const res = await verifyOtpRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockAdminUpdateUserById).toHaveBeenCalledWith(
        'pre-created-user-999',
        expect.objectContaining({ email_confirm: true })
      );
    });

    it('4. POST /api/auth/verify-otp rejects expired OTP with 400', async () => {
      const hashedOtp = await bcrypt.hash('123456', 10);

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'user_otp_verifications') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'expired-otp-1',
                    email: 'expired@srkr.edu.in',
                    otp_hash: hashedOtp,
                    expires_at: new Date(Date.now() - 60 * 1000).toISOString(), // 1 min in the past
                    attempts: 0,
                    max_attempts: 5,
                    verified: false,
                    registration_data: { email: 'expired@srkr.edu.in' },
                  },
                  error: null,
                }),
              })),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'expired@srkr.edu.in',
          otp: '123456',
        }),
      });

      const res = await verifyOtpRoute(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toMatch(/expired/i);
    });

    it('4b. POST /api/auth/verify-otp rejects already used/verified OTP with 400', async () => {
      const hashedOtp = await bcrypt.hash('999888', 10);

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'user_otp_verifications') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'reused-otp-1',
                    email: 'reused@srkr.edu.in',
                    otp_hash: hashedOtp,
                    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                    attempts: 1,
                    max_attempts: 5,
                    verified: true, // Already verified!
                    registration_data: { email: 'reused@srkr.edu.in' },
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'reused@srkr.edu.in',
          otp: '999888',
        }),
      });

      const res = await verifyOtpRoute(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toMatch(/already been used/i);
    });

    it('5. In production mode with demo OTP disabled and no SMTP, returns 503 instead of false delivery', async () => {
      (process.env as any)['NODE_ENV'] = 'production';
      process.env.ENABLE_DEMO_OTP = 'false';
      process.env.ENABLE_DEMO_SMS = 'false';

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
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      });

      mockAdminCreateUser.mockResolvedValue({
        data: { user: { id: 'prod-user-1' } },
        error: null,
      });

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Production Student',
          email: 'prod.student@srkr.edu.in',
          password: 'Password123!',
          role: 'STUDENT',
          registrationNumber: '2101201045',
        }),
      });

      const res = await registerRoute(req);
      const data = await res.json();

      // Since real SMTP is not configured in this test env and demo OTP is disabled,
      // it must return 503 rather than falsely claiming OTP delivery!
      expect(res.status).toBe(503);
      expect(data.error).toMatch(/not available/i);
    });
  });

  // =========================================================================
  // PHASE 3: INCIDENT AUTO-ASSIGNMENT & ESCALATIONS
  // =========================================================================
  describe('Phase 3 — Incident Auto-Assignment, Case Actions & Escalations', () => {
    it('6. POST /api/incidents auto-assigns an eligible on-duty mentor for LOW/MEDIUM incidents', async () => {
      let createdIncident: Record<string, unknown> | null = null;
      let recordedCaseAction: Record<string, unknown> | null = null;
      let sentNotification: Record<string, unknown> | null = null;

      mockServerGetUser.mockResolvedValue({
        data: { user: { id: 'student-id-100' } },
      });

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'STUDENT', is_approved: true, college_id: 'srkr-bhimavaram' },
                  error: null,
                }),
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { role: 'STUDENT', is_approved: true, college_id: 'srkr-bhimavaram' },
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
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { verification_status: 'VERIFIED' },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'incidents') {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              createdIncident = { id: 'inc-100-uuid', ...payload };
              return {
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: createdIncident,
                    error: null,
                  }),
                })),
              };
            }),
          };
        }
        if (table === 'ai_analyses') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      });

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                in: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'mentor-profile-uuid',
                      full_name: 'Dr. Prasad (Mentor)',
                      role: 'MENTOR',
                      department: 'CSE',
                      is_approved: true,
                      college_id: 'srkr-bhimavaram',
                    },
                    {
                      id: 'foreign-mentor-profile-uuid',
                      full_name: 'Vishnu Mentor',
                      role: 'MENTOR',
                      department: 'CSE',
                      is_approved: true,
                      college_id: 'vishnu-bhimavaram',
                    },
                  ],
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'staff_locations') {
          return {
            select: vi.fn(() => ({
              in: vi.fn().mockResolvedValue({
                data: [
                  {
                    staff_id: 'mentor-profile-uuid',
                    latitude: 16.5448,
                    longitude: 81.4972,
                    is_on_duty: true,
                    is_location_sharing_enabled: true,
                    updated_at: new Date().toISOString(),
                  },
                  {
                    staff_id: 'foreign-mentor-profile-uuid',
                    latitude: 16.5449,
                    longitude: 81.4973,
                    is_on_duty: true,
                    is_location_sharing_enabled: true,
                    updated_at: new Date().toISOString(),
                  },
                ],
                error: null,
              }),
            })),
          };
        }
        if (table === 'incidents') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
        if (table === 'case_actions') {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              recordedCaseAction = payload;
              return { error: null };
            }),
          };
        }
        if (table === 'notifications') {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              sentNotification = payload;
              return { error: null };
            }),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Noise disturbance in study room',
          category: 'GENERAL',
          locationLat: 16.5449,
          locationLng: 81.4973,
        }),
      });

      const res = await createIncidentRoute(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.assignment.status).toBe('ASSIGNED');
      expect(data.assignment.assignedTo).toBe('mentor-profile-uuid');
      expect(data.assignment.responderName).toBe('Dr. Prasad (Mentor)');

      // Verify case_actions audit event
      expect(recordedCaseAction).toBeDefined();
      expect((recordedCaseAction as unknown as Record<string, unknown>).action).toBe('AUTO_ASSIGNED');
      expect((recordedCaseAction as unknown as Record<string, unknown>).to_status).toBe('ASSIGNED');

      // Verify notification created
      expect(sentNotification).toBeDefined();
      expect((sentNotification as unknown as Record<string, unknown>).user_id).toBe('mentor-profile-uuid');
    });

    it('7. POST /api/incidents records escalation when no eligible responder is available', async () => {
      let recordedEscalation: Record<string, unknown> | null = null;
      let recordedCaseAction: Record<string, unknown> | null = null;

      mockServerGetUser.mockResolvedValue({
        data: { user: { id: 'student-id-200' } },
      });

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'STUDENT', is_approved: true, college_id: 'srkr-bhimavaram' },
                  error: null,
                }),
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { role: 'STUDENT', is_approved: true, college_id: 'srkr-bhimavaram' },
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
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { verification_status: 'VERIFIED' },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'incidents') {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'inc-no-resp-uuid', ...payload },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'ai_analyses') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      });

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                in: vi.fn().mockResolvedValue({
                  data: [], // Zero responders available
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'staff_locations') {
          return { select: vi.fn(() => ({ in: vi.fn().mockResolvedValue({ data: [] }) })) };
        }
        if (table === 'case_actions') {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              recordedCaseAction = payload;
              return { error: null };
            }),
          };
        }
        if (table === 'escalations') {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              recordedEscalation = payload;
              return { error: null };
            }),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'General inquiry about lab timings',
        }),
      });

      const res = await createIncidentRoute(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.assignment.status).toBe('UNASSIGNED_PENDING_REVIEW');
      expect(data.assignment.assignedTo).toBeNull();

      // Verify escalation record was logged
      expect(recordedEscalation).toBeDefined();
      expect((recordedEscalation as unknown as Record<string, unknown>).reason).toBe('NO_ELIGIBLE_ON_DUTY_RESPONDERS');

      // Verify case_actions entry was logged
      expect(recordedCaseAction).toBeDefined();
      expect((recordedCaseAction as unknown as Record<string, unknown>).action).toBe('UNASSIGNED_ESCALATED');
    });

    it('8. Critical emergency threat (Telugu keyword: కత్తి) overrides severity to CRITICAL and targets Security/Admin', async () => {
      let createdIncident: Record<string, unknown> | null = null;

      mockServerGetUser.mockResolvedValue({
        data: { user: { id: 'student-id-300' } },
      });

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'STUDENT', is_approved: true, college_id: 'srkr-bhimavaram' },
                  error: null,
                }),
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { role: 'STUDENT', is_approved: true, college_id: 'srkr-bhimavaram' },
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
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { verification_status: 'VERIFIED' },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'incidents') {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              createdIncident = { id: 'inc-critical-uuid', ...payload };
              return {
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: createdIncident,
                    error: null,
                  }),
                })),
              };
            }),
          };
        }
        if (table === 'ai_analyses') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      });

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                in: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'security-chief-uuid',
                    full_name: 'Chief Security Officer',
                    role: 'SECURITY',
                    is_approved: true,
                    college_id: 'srkr-bhimavaram',
                  },
                ],
                error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'staff_locations') {
          return { select: vi.fn(() => ({ in: vi.fn().mockResolvedValue({ data: [] }) })) };
        }
        if (table === 'incidents') {
          return {
            update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
          };
        }
        if (table === 'case_actions') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        if (table === 'notifications') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'హాస్టల్ వద్ద ఒక వ్యక్తి కత్తితో తిరుగుతున్నాడు emergency help',
        }),
      });

      const res = await createIncidentRoute(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(createdIncident).toBeDefined();
      expect((createdIncident as unknown as Record<string, unknown>).severity).toBe('CRITICAL');
      expect(data.assignment.assignedTo).toBe('security-chief-uuid');
    });

    it('denies non-emergency reports when student verification is missing', async () => {
      mockServerGetUser.mockResolvedValue({
        data: { user: { id: 'unverified-student-id' } },
      });
      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'incidents') return {};
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { role: 'STUDENT', is_approved: true, college_id: 'srkr-bhimavaram' },
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
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          };
        }
        return {};
      });

      const response = await createIncidentRoute(new Request('http://localhost:3000/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Unverified report attempt' }),
      }));

      expect(response.status).toBe(403);
      expect(mockServerFrom).not.toHaveBeenCalledWith('ai_analyses');
      expect(mockAdminFrom).not.toHaveBeenCalled();
    });

    it('8b. POST /api/incidents returns duplicate prevented response on rapid re-submission', async () => {
      mockServerGetUser.mockResolvedValue({
        data: { user: { id: 'student-dup-user' } },
      });

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: 'existing-case-uuid',
                        case_id: 'KC-2026-DUP01',
                        status: 'RECEIVED',
                        created_at: new Date().toISOString(),
                      },
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Identical complaint text submitted twice rapidly',
        }),
      });

      const res = await createIncidentRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isDuplicate).toBe(true);
      expect(data.caseId).toBe('KC-2026-DUP01');
    });
  });

  // =========================================================================
  // PHASE 4: NEARBY STAFF GPS SCHEMA & CONSENT
  // =========================================================================
  describe('Phase 4 — Nearby Staff GPS Schema & Consent', () => {
    it('9. GET /api/incidents/[id]/nearby-staff enforces consent & duty requirements', async () => {
      mockServerGetUser.mockResolvedValue({
        data: { user: { id: 'admin-user-uuid' } },
      });

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn((fields: string) => {
              if (fields && fields.includes('is_active, is_approved')) {
                return {
                  in: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      eq: vi.fn().mockResolvedValue({
                        data: [
                          {
                            id: 'staff-active-uuid',
                            full_name: 'Active Warden',
                            role: 'SECURITY',
                            department: 'Security',
                            is_active: true,
                            is_approved: true,
                          },
                        ],
                        error: null,
                      }),
                    })),
                  })),
                };
              }
              return {
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'admin-user-uuid', role: 'ADMIN', full_name: 'Admin User' },
                    error: null,
                  }),
                })),
              };
            }),
          };
        }
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'inc-gps-uuid',
                    case_id: 'KC-2026-TEST1',
                    latitude: 16.5448,
                    longitude: 81.4972,
                    severity: 'HIGH',
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'staff_locations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn().mockResolvedValue({
                    data: [
                      {
                        staff_id: 'staff-active-uuid',
                        latitude: 16.5450,
                        longitude: 81.4975,
                        accuracy: 10,
                        is_on_duty: true,
                        is_location_sharing_enabled: true,
                        updated_at: new Date().toISOString(), // Fresh
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

      const req = new Request('http://localhost:3000/api/incidents/inc-gps-uuid/nearby-staff');
      const res = await getNearbyStaffRoute(req, { params: Promise.resolve({ id: 'inc-gps-uuid' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.candidates.length).toBe(1);
      expect(data.candidates[0].name).toBe('Active Warden');
      expect(data.candidates[0].distanceMeters).toBeGreaterThanOrEqual(0);
    });

    it('10. GET /api/incidents/[id]/nearby-staff rejects unauthenticated or unauthorized student requests with 403', async () => {
      mockServerGetUser.mockResolvedValue({
        data: { user: { id: 'student-intruder-uuid' } },
      });

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'student-intruder-uuid', role: 'STUDENT', full_name: 'Curious Student' },
                  error: null,
                }),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents/inc-gps-uuid/nearby-staff');
      const res = await getNearbyStaffRoute(req, { params: Promise.resolve({ id: 'inc-gps-uuid' }) });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toMatch(/Forbidden/i);
    });

    it('11. GET /api/incidents/[id]/nearby-staff excludes staff members who withdrew location consent', async () => {
      mockServerGetUser.mockResolvedValue({
        data: { user: { id: 'admin-user-uuid' } },
      });

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn((fields: string) => {
              if (fields && fields.includes('is_active, is_approved')) {
                return {
                  in: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      eq: vi.fn().mockResolvedValue({
                        data: [
                          {
                            id: 'staff-withdrawn-uuid',
                            full_name: 'Warden Withdrawn',
                            role: 'SECURITY',
                            department: 'Security',
                            is_active: true,
                            is_approved: true,
                          },
                        ],
                        error: null,
                      }),
                    })),
                  })),
                };
              }
              return {
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'admin-user-uuid', role: 'ADMIN', full_name: 'Admin User' },
                    error: null,
                  }),
                })),
              };
            }),
          };
        }
        if (table === 'incidents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'inc-gps-uuid-2',
                    case_id: 'KC-2026-TEST2',
                    latitude: 16.5448,
                    longitude: 81.4972,
                    severity: 'HIGH',
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'staff_locations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn().mockResolvedValue({
                    data: [], // No records with is_location_sharing_enabled = true
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        return {};
      });

      const req = new Request('http://localhost:3000/api/incidents/inc-gps-uuid-2/nearby-staff');
      const res = await getNearbyStaffRoute(req, { params: Promise.resolve({ id: 'inc-gps-uuid-2' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.hasFreshGpsResponders).toBe(false);
      expect(data.candidates[0].hasFreshGps).toBe(false);
      expect(data.candidates[0].distanceMeters).toBeNull();
    });
  });
});
