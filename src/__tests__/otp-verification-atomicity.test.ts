import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/auth/verify-otp/route';
import bcrypt from 'bcryptjs';

const mockAdminFrom = vi.fn();
const mockCreateUser = vi.fn();
const mockUpdateUserById = vi.fn();
const mockDeleteUser = vi.fn();
const mockAtomicClaim = vi.fn();
const originalEnv = { ...process.env };

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
    auth: {
      admin: {
        createUser: mockCreateUser,
        updateUserById: mockUpdateUserById,
        deleteUser: mockDeleteUser,
      },
    },
  })),
}));

describe('Registration OTP atomic verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, NODE_ENV: 'development' };
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key-long-enough-for-tests';
    process.env.ENABLE_DEMO_OTP = 'false';
    process.env.ENABLE_DEMO_SMS = 'false';
    mockAtomicClaim.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('does not provision an account when another request already claimed the OTP', async () => {
    const otpHash = await bcrypt.hash('654321', 4);
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'user_otp_verifications') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'otp-record',
                  email: 'student@srkr.edu.in',
                  otp_hash: otpHash,
                  expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                  attempts: 0,
                  max_attempts: 5,
                  verified: false,
                  registration_data: {
                    userId: 'precreated-user',
                    name: 'Test Student',
                    email: 'student@srkr.edu.in',
                    role: 'STUDENT',
                  },
                },
                error: null,
              }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  maybeSingle: mockAtomicClaim,
                })),
              })),
            })),
          })),
        };
      }
      return {};
    });

    const response = await POST(new Request('http://localhost/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@srkr.edu.in', otp: '654321' }),
    }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('already been used'),
    });
    expect(mockAtomicClaim).toHaveBeenCalledOnce();
    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(mockUpdateUserById).not.toHaveBeenCalled();
    expect(mockAdminFrom).not.toHaveBeenCalledWith('profiles');
  });
});
