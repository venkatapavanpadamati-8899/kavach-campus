import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isDemoOtpEnabled, verifyDemoOtp, DEMO_OTP_VALUE } from '@/lib/auth-demo';

describe('Demo OTP Security Boundaries (src/lib/auth-demo.ts)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('strictly rejects Demo OTP when NODE_ENV is production', () => {
    (process.env as any)['NODE_ENV'] = 'production';
    process.env.ENABLE_DEMO_OTP = 'true';

    expect(isDemoOtpEnabled()).toBe(false);
    expect(verifyDemoOtp(DEMO_OTP_VALUE, 'STUDENT')).toBe(false);
    expect(verifyDemoOtp(DEMO_OTP_VALUE, 'STAFF')).toBe(false);
  });

  it('strictly rejects Demo OTP when ENABLE_DEMO_OTP is not enabled', () => {
    (process.env as any)['NODE_ENV'] = 'development';
    delete process.env.ENABLE_DEMO_OTP;
    delete process.env.NEXT_PUBLIC_ENABLE_DEMO_OTP;

    expect(isDemoOtpEnabled()).toBe(false);
    expect(verifyDemoOtp(DEMO_OTP_VALUE, 'STUDENT')).toBe(false);
  });

  it('strictly blocks privileged administrative roles even when demo OTP is enabled in development', () => {
    (process.env as any)['NODE_ENV'] = 'development';
    process.env.ENABLE_DEMO_OTP = 'true';

    expect(isDemoOtpEnabled()).toBe(true);
    // Privileged administrative and management roles must NEVER be verified via Demo OTP
    expect(verifyDemoOtp(DEMO_OTP_VALUE, 'ADMIN')).toBe(false);
    expect(verifyDemoOtp(DEMO_OTP_VALUE, 'SUPER_ADMIN')).toBe(false);
    expect(verifyDemoOtp(DEMO_OTP_VALUE, 'MANAGEMENT')).toBe(false);
    expect(verifyDemoOtp(DEMO_OTP_VALUE, 'PRINCIPAL')).toBe(false);
    expect(verifyDemoOtp(DEMO_OTP_VALUE, 'HOD')).toBe(false);
  });

  it('allows Demo OTP for non-privileged STUDENT/STAFF accounts when explicitly enabled in development', () => {
    (process.env as any)['NODE_ENV'] = 'development';
    process.env.ENABLE_DEMO_OTP = 'true';

    expect(verifyDemoOtp(DEMO_OTP_VALUE, 'STUDENT')).toBe(true);
    expect(verifyDemoOtp(DEMO_OTP_VALUE, 'STAFF')).toBe(true);
    expect(verifyDemoOtp(DEMO_OTP_VALUE, 'COUNSELLOR')).toBe(true);
    expect(verifyDemoOtp(DEMO_OTP_VALUE, 'SECURITY')).toBe(true);
  });

  it('rejects incorrect OTPs even when demo mode is enabled', () => {
    (process.env as any)['NODE_ENV'] = 'development';
    process.env.ENABLE_DEMO_OTP = 'true';

    expect(verifyDemoOtp('000000', 'STUDENT')).toBe(false);
    expect(verifyDemoOtp('654321', 'STUDENT')).toBe(false);
    expect(verifyDemoOtp('', 'STUDENT')).toBe(false);
    expect(verifyDemoOtp(undefined, 'STUDENT')).toBe(false);
  });
});
