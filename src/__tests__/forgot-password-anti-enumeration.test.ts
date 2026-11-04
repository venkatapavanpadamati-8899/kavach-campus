import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as forgotPasswordHandler } from '@/app/api/auth/forgot-password/route';
import bcrypt from 'bcryptjs';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/lib/supabase/admin';

describe('Phase 13A Remediation: Zero-Knowledge Anti-Enumeration & Timing Mitigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_test_key_with_sufficient_length_1234567890';
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
  });

  it('1. Registered student with matching credentials returns generic 200 and dispatches OTP without accountExists field', async () => {
    let otpInserted = false;
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'usr-student-phase13a',
                    full_name: 'Anti Enum Student',
                    college_email: 'student@srkr.edu.in',
                    role: 'STUDENT',
                    student_id: '2101201045',
                    college_id: 'srkr-bhimavaram',
                    phone: '9876543210',
                  },
                  error: null,
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
              otpInserted = true;
              return Promise.resolve({ error: null });
            }),
          };
        }
        return { select: vi.fn() };
      }),
    };

    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const req = new Request('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@srkr.edu.in',
        collegeId: 'srkr-bhimavaram',
        registrationNumber: '2101201045',
      }),
    });

    const res = await forgotPasswordHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    // Anti-enumeration: accountExists MUST NOT exist in payload
    expect(data.accountExists).toBeUndefined();
    expect(data.message).toContain('If an account exists with these matching credentials');
    expect(otpInserted).toBe(true);
  });

  it('2. Unregistered email returns identical generic 200, executes dummy bcrypt timing mitigation, and creates NO OTP', async () => {
    const bcryptHashSpy = vi.spyOn(bcrypt, 'hash');
    let otpInserted = false;

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null, // Profile not found
                  error: { code: 'PGRST116', message: 'No rows found' },
                }),
              }),
            }),
          };
        }
        if (table === 'user_otp_verifications') {
          return {
            insert: vi.fn().mockImplementation(() => {
              otpInserted = true;
              return Promise.resolve({ error: null });
            }),
          };
        }
        return { select: vi.fn() };
      }),
    };

    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const req = new Request('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent.user@srkr.edu.in',
        collegeId: 'srkr-bhimavaram',
      }),
    });

    const res = await forgotPasswordHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    // Anti-enumeration checks
    expect(data.accountExists).toBeUndefined();
    expect(data.message).toContain('If an account exists with these matching credentials');
    // OTP MUST NOT be inserted
    expect(otpInserted).toBe(false);
    // Dummy bcrypt work MUST have been executed to mitigate timing enumeration attacks
    expect(bcryptHashSpy).toHaveBeenCalledWith('dummy-entropy-for-timing-mitigation', 10);
  });

  it('3. Mismatched college returns identical generic 200, executes timing mitigation, and creates NO OTP', async () => {
    const bcryptHashSpy = vi.spyOn(bcrypt, 'hash');
    let otpInserted = false;

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'usr-student-phase13a-2',
                    full_name: 'Student SRKR',
                    college_email: 'student@srkr.edu.in',
                    role: 'STUDENT',
                    student_id: '2101201045',
                    college_id: 'srkr-bhimavaram',
                    phone: '9876543210',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'user_otp_verifications') {
          return {
            insert: vi.fn().mockImplementation(() => {
              otpInserted = true;
              return Promise.resolve({ error: null });
            }),
          };
        }
        return { select: vi.fn() };
      }),
    };

    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const req = new Request('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@srkr.edu.in',
        collegeId: 'vishnu-bhimavaram', // Intentionally mismatched college
        registrationNumber: '2101201045',
      }),
    });

    const res = await forgotPasswordHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.accountExists).toBeUndefined();
    expect(otpInserted).toBe(false);
    expect(bcryptHashSpy).toHaveBeenCalledWith('dummy-entropy-for-timing-mitigation', 10);
  });

  it('4. Mismatched registration number returns identical generic 200, executes timing mitigation, and creates NO OTP', async () => {
    const bcryptHashSpy = vi.spyOn(bcrypt, 'hash');
    let otpInserted = false;

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'usr-student-phase13a-3',
                    full_name: 'Student SRKR',
                    college_email: 'student@srkr.edu.in',
                    role: 'STUDENT',
                    student_id: '2101201045',
                    college_id: 'srkr-bhimavaram',
                    phone: '9876543210',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'user_otp_verifications') {
          return {
            insert: vi.fn().mockImplementation(() => {
              otpInserted = true;
              return Promise.resolve({ error: null });
            }),
          };
        }
        return { select: vi.fn() };
      }),
    };

    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const req = new Request('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@srkr.edu.in',
        collegeId: 'srkr-bhimavaram',
        registrationNumber: '2101209999', // Mismatched student ID
      }),
    });

    const res = await forgotPasswordHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.accountExists).toBeUndefined();
    expect(otpInserted).toBe(false);
    expect(bcryptHashSpy).toHaveBeenCalledWith('dummy-entropy-for-timing-mitigation', 10);
  });

  it('5. Rejects invalid input with 400', async () => {
    const emptyEmailReq = new Request('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '' }),
    });
    const res1 = await forgotPasswordHandler(emptyEmailReq);
    expect(res1.status).toBe(400);

    const malformedEmailReq = new Request('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    });
    const res2 = await forgotPasswordHandler(malformedEmailReq);
    expect(res2.status).toBe(400);
  });
});
