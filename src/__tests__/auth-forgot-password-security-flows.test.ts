import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as forgotPasswordHandler } from '@/app/api/auth/forgot-password/route';
import { POST as resetPasswordHandler } from '@/app/api/auth/reset-password/route';
import { POST as registerHandler } from '@/app/api/auth/register/route';
import bcrypt from 'bcryptjs';

// Mock Supabase admin client
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/lib/supabase/admin';

describe('Auth Security Flows — Registration, Forgot Password, Reset Password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_test_key_with_sufficient_length_1234567890';
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
  });

  // =========================================================================
  // 1. Forgot Password — Student ID & College Validation
  // =========================================================================
  describe('POST /api/auth/forgot-password — Identity Validation & Anti-Enumeration', () => {
    it('rejects invalid registration number formats with HTTP 400', async () => {
      const invalidCases = [
        '123',            // Too short (< 8 chars)
        'TOOLONGNUMBER12',// Too long (> 10 chars)
        '21CS@1045',      // Contains special characters
        '21CS 1045',      // Contains space
      ];

      for (const invalidId of invalidCases) {
        const req = new Request('http://localhost:3000/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'student@srkr.edu.in',
            collegeId: 'srkr-bhimavaram',
            registrationNumber: invalidId,
          }),
        });

        const res = await forgotPasswordHandler(req);
        const data = await res.json();
        expect(res.status).toBe(400);
        expect(data.error).toMatch(/7, 8, 9, or 10 characters|letters and numbers/i);
      }
    });

    it('returns generic success without creating OTP when college is mismatched (anti-enumeration)', async () => {
      let insertCalled = false;
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'user-srkr-1',
                      full_name: 'SRKR Student',
                      college_email: 'student@srkr.edu.in',
                      role: 'STUDENT',
                      student_id: '21CS1045',
                      college_id: 'srkr-bhimavaram',
                    },
                  }),
                }),
              }),
            };
          }
          if (table === 'user_otp_verifications') {
            return {
              delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
              insert: vi.fn().mockImplementation(() => {
                insertCalled = true;
                return Promise.resolve({ error: null });
              }),
            };
          }
          return {};
        }),
      };
      (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

      const req = new Request('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'student@srkr.edu.in',
          collegeId: 'vit-bhimavaram', // Mismatched college!
          registrationNumber: '21CS1045',
        }),
      });

      const res = await forgotPasswordHandler(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(insertCalled).toBe(false); // No OTP generated!
    });

    it('returns generic success without creating OTP when email does not exist (anti-enumeration)', async () => {
      let insertCalled = false;
      const mockSupabase = {
        from: vi.fn((table: string) => {
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
              insert: vi.fn().mockImplementation(() => {
                insertCalled = true;
                return Promise.resolve({ error: null });
              }),
            };
          }
          return {};
        }),
      };
      (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

      const req = new Request('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@srkr.edu.in',
          collegeId: 'srkr-bhimavaram',
          registrationNumber: '21CS1045',
        }),
      });

      const res = await forgotPasswordHandler(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(insertCalled).toBe(false);
    });

    it('successfully issues reset OTP when college, email, and student ID all match', async () => {
      let insertedPayload: any = null;
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'user-srkr-1',
                      full_name: 'SRKR Student',
                      college_email: 'student@srkr.edu.in',
                      role: 'STUDENT',
                      student_id: '21CS1045',
                      college_id: 'srkr-bhimavaram',
                    },
                  }),
                }),
              }),
            };
          }
          if (table === 'user_otp_verifications') {
            return {
              delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
              insert: vi.fn().mockImplementation((payload) => {
                insertedPayload = payload;
                return Promise.resolve({ error: null });
              }),
            };
          }
          return {};
        }),
      };
      (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

      const req = new Request('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'student@srkr.edu.in',
          collegeId: 'srkr-bhimavaram',
          registrationNumber: '21CS1045',
        }),
      });

      const res = await forgotPasswordHandler(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(insertedPayload).not.toBeNull();
      expect(insertedPayload.registration_data.action).toBe('PASSWORD_RESET');
      expect(insertedPayload.registration_data.userId).toBe('user-srkr-1');
    });
  });

  // =========================================================================
  // 2. Reset Password — Token Expiry, Single-Use, and Success
  // =========================================================================
  describe('POST /api/auth/reset-password — Password Reset Security', () => {
    it('rejects expired OTP with HTTP 400', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'user_otp_verifications') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'otp-expired-1',
                      email: 'student@srkr.edu.in',
                      otp_hash: '$2a$10$fakehash',
                      expires_at: new Date(Date.now() - 60000).toISOString(), // Expired 1 min ago
                      attempts: 0,
                      max_attempts: 3,
                      registration_data: { action: 'PASSWORD_RESET', userId: 'user-1' },
                    },
                  }),
                }),
              }),
              delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          return {};
        }),
      };
      (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

      const req = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'student@srkr.edu.in',
          otp: '123456',
          password: 'NewStrongPassword123!',
        }),
      });

      const res = await resetPasswordHandler(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/expired/i);
    });

    it('rejects repeated token use with HTTP 404 once OTP record is already consumed', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'user_otp_verifications') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null, // Consumed and deleted!
                    error: { message: 'Not found' },
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

      const req = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'student@srkr.edu.in',
          otp: '123456',
          password: 'NewStrongPassword123!',
        }),
      });

      const res = await resetPasswordHandler(req);
      const data = await res.json();
      expect(res.status).toBe(404);
      expect(data.error).toMatch(/No active password reset request found/i);
    });

    it('updates password and logs audit record on valid OTP', async () => {
      const salt = await bcrypt.genSalt(10);
      const otpHash = await bcrypt.hash('654321', salt);
      let updatedUserPassword = '';
      let auditLogInserted = false;
      let otpDeleted = false;

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'user_otp_verifications') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'otp-valid-1',
                      email: 'student@srkr.edu.in',
                      otp_hash: otpHash,
                      expires_at: new Date(Date.now() + 300000).toISOString(),
                      attempts: 0,
                      max_attempts: 3,
                      registration_data: { action: 'PASSWORD_RESET', userId: 'student-uuid-456' },
                    },
                  }),
                }),
              }),
              delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockImplementation(() => {
                  otpDeleted = true;
                  return Promise.resolve({ error: null });
                }),
              }),
            };
          }
          if (table === 'audit_logs') {
            return {
              insert: vi.fn().mockImplementation(() => {
                auditLogInserted = true;
                return Promise.resolve({ error: null });
              }),
            };
          }
          return {};
        }),
        auth: {
          admin: {
            updateUserById: vi.fn().mockImplementation((userId, params) => {
              updatedUserPassword = params.password;
              return Promise.resolve({ data: { user: { id: userId } }, error: null });
            }),
          },
        },
      };
      (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

      const req = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'student@srkr.edu.in',
          otp: '654321',
          password: 'MyBrandNewPassword123!',
        }),
      });

      const res = await resetPasswordHandler(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(updatedUserPassword).toBe('MyBrandNewPassword123!');
      expect(otpDeleted).toBe(true);
      expect(auditLogInserted).toBe(true);
    });
  });

  // =========================================================================
  // 3. Registration — Scoped Student ID Uniqueness
  // =========================================================================
  describe('POST /api/auth/register — College-Scoped Student ID Uniqueness', () => {
    it('rejects registration when student registration number already exists in college scope', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                  maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'existing-student-id' } }),
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'existing-student-id' } }),
                    single: vi.fn().mockResolvedValue({ data: { id: 'existing-student-id' } }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Pavan Student',
          email: 'newstudent@srkr.edu.in',
          collegeId: 'srkr-bhimavaram',
          studentId: '2101201045',
          password: 'ValidPassword123!',
          role: 'STUDENT',
          department: 'CSE',
          academicYear: '2nd Year',
        }),
      });

      const res = await registerHandler(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/already registered/i);
    });
  });
});
