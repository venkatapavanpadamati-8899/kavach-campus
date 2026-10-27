import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateStudentRegistrationNumber, validateStudentId } from '@/lib/verification/id-card';

// Mock Supabase admin client
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/lib/supabase/admin';
import { POST as registerHandler } from '@/app/api/auth/register/route';
import { POST as forgotPasswordHandler } from '@/app/api/auth/forgot-password/route';

describe('Enhanced Registration & Forgot Password Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_test_key_with_sufficient_length_1234567890';
  });

  // =========================================================================
  // 1. Student Registration Number (8, 9, or 10 Alphanumeric Characters)
  // =========================================================================
  describe('Student Registration Number Validation (8, 9, 10 Alphanumeric Chars)', () => {
    it('accepts valid 8, 9, and 10 alphanumeric identifiers (letters and numbers)', () => {
      const validCases = [
        '2101201045',  // 10 numeric
        '21B91A0501',  // 10 alphanumeric
        '21CS1045',    // 8 alphanumeric
        '987654321',   // 9 numeric
        '190120100',   // 9 numeric
        '18021A050',   // 9 alphanumeric
        'ABC12345',    // 8 alphanumeric
        'ABCDEFGHIJ',  // 10 letters
        '21CS104',     // 7 alphanumeric
      ];

      validCases.forEach(id => {
        const res = validateStudentRegistrationNumber({ registrationNumber: id });
        expect(res.valid).toBe(true);
        expect(res.normalizedNumber).toBe(id.toUpperCase());

        const idRes = validateStudentId(id);
        expect(idRes.valid).toBe(true);
        expect(idRes.normalizedId).toBe(id.toUpperCase());
      });
    });

    it('trims surrounding whitespace properly', () => {
      const res = validateStudentRegistrationNumber({ registrationNumber: '  21CS1045  ' });
      expect(res.valid).toBe(true);
      expect(res.normalizedNumber).toBe('21CS1045');
    });

    it('rejects identifiers with fewer than 7 or more than 10 characters', () => {
      const shortCases = ['123', '12345', '123456'];
      shortCases.forEach(shortId => {
        const res = validateStudentRegistrationNumber({ registrationNumber: shortId });
        expect(res.valid).toBe(false);
        expect(res.error).toMatch(/7, 8, 9, or 10 characters/i);
      });

      const longCases = ['12345678901', '21012010450', 'ABCDEFGHIJKLMNOP'];
      longCases.forEach(longId => {
        const res = validateStudentRegistrationNumber({ registrationNumber: longId });
        expect(res.valid).toBe(false);
        expect(res.error).toMatch(/7, 8, 9, or 10 characters/i);
      });
    });

    it('rejects identifiers with spaces or special characters', () => {
      const invalidChars = ['2101-20104', '210120 104', '2101@1045!', '21_CS_104', '21CS.104'];
      invalidChars.forEach(invalidId => {
        const res = validateStudentRegistrationNumber({ registrationNumber: invalidId });
        expect(res.valid).toBe(false);
        expect(res.error).toMatch(/letters and numbers|no spaces/i);
      });
    });

    it('rejects null, undefined, and empty string', () => {
      expect(validateStudentRegistrationNumber({ registrationNumber: null }).valid).toBe(false);
      expect(validateStudentRegistrationNumber({ registrationNumber: undefined }).valid).toBe(false);
      expect(validateStudentRegistrationNumber({ registrationNumber: '' }).valid).toBe(false);
      expect(validateStudentRegistrationNumber({ registrationNumber: '   ' }).valid).toBe(false);
    });
  });

  // =========================================================================
  // 2. Registration API — Academic Year & Department
  // =========================================================================
  describe('POST /api/auth/register — Academic Year & Department Validation', () => {
    it('accepts valid registration with 8-10 alphanumeric registration number and academic year', async () => {
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
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                }),
              }),
              insert: vi.fn().mockResolvedValue({ error: null }),
              delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
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
          name: 'Pavan Kumar',
          email: 'pavan@srkr.edu.in',
          password: 'SecurePassword123!',
          role: 'STUDENT',
          registrationNumber: '21CS1045', // 8 chars alphanumeric
          department: 'CSE — Computer Science and Engineering',
          academicYear: '2nd Year',
        }),
      });

      const res = await registerHandler(req);
      const data = await res.json();
      expect(res.status).toBe(201);
      expect(data.email).toBe('pavan@srkr.edu.in');
    });

    it('rejects invalid academic year for student registration', async () => {
      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Pavan Kumar',
          email: 'pavan@srkr.edu.in',
          password: 'SecurePassword123!',
          role: 'STUDENT',
          registrationNumber: '21CS1045',
          department: 'CSE',
          academicYear: '5th Year', // Invalid year
        }),
      });

      const res = await registerHandler(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toContain('Please select a valid academic year');
    });
  });

  // =========================================================================
  // 3. Fortified Forgot Password Flow (Student Registration Number Consistency)
  // =========================================================================
  describe('POST /api/auth/forgot-password — Student Consistency Check & Anti-Enumeration', () => {
    it('dispatches OTP when student email and registration number match', async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'student-uuid-1',
                      full_name: 'Pavan Student',
                      college_email: 'student@srkr.edu.in',
                      role: 'STUDENT',
                      student_id: '21CS1045',
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
              insert: vi.fn().mockResolvedValue({ error: null }),
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
          registrationNumber: '21CS1045', // Matches profile.student_id
        }),
      });

      const res = await forgotPasswordHandler(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('verification OTP has been sent');
    });

    it('returns generic success response without dispatching OTP if registration number does not match (anti-enumeration)', async () => {
      let insertCalled = false;
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'student-uuid-1',
                      full_name: 'Pavan Student',
                      college_email: 'student@srkr.edu.in',
                      role: 'STUDENT',
                      student_id: '21CS1045',
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
          registrationNumber: '9999999999', // Mismatched registration number
        }),
      });

      const res = await forgotPasswordHandler(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(insertCalled).toBe(false); // OTP was NOT generated or inserted
      expect(data.message).toContain('verification OTP has been sent');
    });

    it('returns generic success response when email does not exist (anti-enumeration)', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        })),
      };
      (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

      const req = new Request('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@srkr.edu.in',
          registrationNumber: '21CS1045',
        }),
      });

      const res = await forgotPasswordHandler(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('verification OTP has been sent');
    });
  });
});
