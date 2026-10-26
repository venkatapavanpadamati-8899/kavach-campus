import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isDemoSmsEnabled,
  sendDemoSms,
  getLatestDemoSms,
  verifyDemoSmsOtp,
  resetDemoSmsStore,
} from '@/lib/demo-sms';

describe('Demo SMS Service (src/lib/demo-sms.ts)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetDemoSmsStore();
    process.env = { ...originalEnv };
    (process.env as any)['NODE_ENV'] = 'development';
    process.env.ENABLE_DEMO_SMS = 'true';
  });

  afterEach(() => {
    process.env = originalEnv;
    resetDemoSmsStore();
  });

  describe('1. Environment Security Constraints', () => {
    it('is strictly disabled in production mode', () => {
      (process.env as any)['NODE_ENV'] = 'production';
      expect(isDemoSmsEnabled()).toBe(false);

      const result = sendDemoSms('student@campus.edu');
      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled in production');

      const verifyResult = verifyDemoSmsOtp('student@campus.edu', '123456');
      expect(verifyResult.success).toBe(false);
    });

    it('is active in development by default', () => {
      expect(isDemoSmsEnabled()).toBe(true);
    });

    it('can be disabled explicitly via ENABLE_DEMO_SMS=false', () => {
      process.env.ENABLE_DEMO_SMS = 'false';
      expect(isDemoSmsEnabled()).toBe(false);
    });
  });

  describe('2. Simulated SMS Generation & Format', () => {
    it('generates simulated SMS with 5-minute expiry and proper formatting', () => {
      const recipient = 'test.student@campus.edu';
      const result = sendDemoSms(recipient, 'REGISTRATION', '654321');

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.message?.otp).toBe('654321');
      expect(result.message?.clientToken).toBeDefined();
      expect(result.message?.body).toContain('KAVACH CAMPUS - DEMO SMS');
      expect(result.message?.body).toContain('SIMULATED MESSAGE - NOT A REAL SMS');
      expect(result.message?.body).toContain('Valid for 5 minutes');

      // Verify 5-minute expiry window (300,000 ms)
      const diff = result.message!.expiresAt - result.message!.createdAt;
      expect(diff).toBe(5 * 60 * 1000);
    });

    it('generates a 6-digit numeric OTP via CSPRNG when fixedOtp is omitted', () => {
      const recipient = 'csprng.test@campus.edu';
      const result = sendDemoSms(recipient, 'REGISTRATION');

      expect(result.success).toBe(true);
      expect(result.message?.otp).toMatch(/^\d{6}$/);
      const numericVal = parseInt(result.message!.otp, 10);
      expect(numericVal).toBeGreaterThanOrEqual(100000);
      expect(numericVal).toBeLessThan(1000000);
    });

    it('retrieves the latest active demo SMS for a recipient', () => {
      const recipient = 'retrieve.test@campus.edu';
      sendDemoSms(recipient, 'LOGIN', '112233');

      const latest = getLatestDemoSms(recipient);
      expect(latest).not.toBeNull();
      expect(latest?.otp).toBe('112233');
    });

    it('enforces clientToken session authorization on getLatestDemoSms', () => {
      const recipient = 'session.test@campus.edu';
      const result = sendDemoSms(recipient, 'REGISTRATION', '445566');
      const validToken = result.message!.clientToken;

      // Access with correct token: SUCCESS
      const authorized = getLatestDemoSms(recipient, validToken);
      expect(authorized).not.toBeNull();
      expect(authorized?.otp).toBe('445566');

      // Access with fraudulent / mismatched token: REJECTED (returns null)
      const unauthorized = getLatestDemoSms(recipient, 'attacker-token-999');
      expect(unauthorized).toBeNull();
    });

    it('prevents cross-user eavesdropping: user B token cannot access user A inbox', () => {
      const userA = 'student.alice@campus.edu';
      const userB = 'student.bob@campus.edu';

      const resA = sendDemoSms(userA, 'REGISTRATION', '111111');
      const resB = sendDemoSms(userB, 'REGISTRATION', '222222');
      expect(resA.success).toBe(true);

      const tokenB = resB.message!.clientToken;

      // Bob tries to access Alice's OTP using his own token
      const stolenAttempt = getLatestDemoSms(userA, tokenB);
      expect(stolenAttempt).toBeNull();
    });
  });

  describe('3. Rate Limiting and Resend Cooldown', () => {
    it('enforces a minimum 30-second cooldown between consecutive requests', () => {
      const recipient = 'cooldown.test@campus.edu';
      const first = sendDemoSms(recipient, 'REGISTRATION', '100001');
      expect(first.success).toBe(true);

      // Immediate second request without skipCooldown should be rejected
      const immediateSecond = sendDemoSms(recipient, 'REGISTRATION', '100002');
      expect(immediateSecond.success).toBe(false);
      expect(immediateSecond.error).toContain('Please wait');

      // Calling with skipCooldown allows test bypass when needed
      const bypassed = sendDemoSms(recipient, 'REGISTRATION', '100003', true);
      expect(bypassed.success).toBe(true);
    });

    it('enforces maximum 3 requests within the 5-minute window', () => {
      const recipient = 'ratelimit.test@campus.edu';
      // 3 requests with skipCooldown
      expect(sendDemoSms(recipient, 'REGISTRATION', '100001', true).success).toBe(true);
      expect(sendDemoSms(recipient, 'REGISTRATION', '100002', true).success).toBe(true);
      expect(sendDemoSms(recipient, 'REGISTRATION', '100003', true).success).toBe(true);

      // 4th request exceeds max requests per window
      const fourth = sendDemoSms(recipient, 'REGISTRATION', '100004', true);
      expect(fourth.success).toBe(false);
      expect(fourth.error).toContain('Too many OTP requests');
    });
  });

  describe('4. Verification, Attempts Limit & Invalidation', () => {
    it('verifies correct OTP and invalidates it afterwards to prevent reuse', () => {
      const recipient = 'valid.test@campus.edu';
      sendDemoSms(recipient, 'REGISTRATION', '987654');

      // First verification attempt: SUCCESS
      const firstTry = verifyDemoSmsOtp(recipient, '987654');
      expect(firstTry.success).toBe(true);

      // Re-use attempt: REJECTED
      const secondTry = verifyDemoSmsOtp(recipient, '987654');
      expect(secondTry.success).toBe(false);
    });

    it('rejects incorrect OTP and counts down attempts', () => {
      const recipient = 'attempts.test@campus.edu';
      sendDemoSms(recipient, 'REGISTRATION', '123789');

      const failedTry = verifyDemoSmsOtp(recipient, '000000');
      expect(failedTry.success).toBe(false);
      expect(failedTry.error).toContain('Invalid OTP');
    });

    it('locks out after 5 consecutive failed attempts', () => {
      const recipient = 'lockout.test@campus.edu';
      sendDemoSms(recipient, 'REGISTRATION', '777888');

      for (let i = 0; i < 4; i++) {
        verifyDemoSmsOtp(recipient, '000000');
      }

      // 5th attempt locks verification
      const fifthTry = verifyDemoSmsOtp(recipient, '000000');
      expect(fifthTry.success).toBe(false);
      expect(fifthTry.error).toContain('Maximum verification attempts exceeded');
    });
  });

  describe('5. Mobile Phone Number Validation and Disclaimers', () => {
    it('accepts and normalizes valid 10-digit Indian mobile numbers', () => {
      const res1 = sendDemoSms('9876543210', 'REGISTRATION', '123456');
      expect(res1.success).toBe(true);
      expect(res1.message?.recipient).toBe('9876543210');
      expect(res1.message?.isRealSms).toBe(false);
      expect(res1.message?.isRealVerification).toBe(false);
      expect(res1.message?.verificationType).toBe('DEMO_DEVELOPMENT_ONLY');

      // Test with +91 country prefix
      const res2 = sendDemoSms('+91 9876543211', 'REGISTRATION', '123456');
      expect(res2.success).toBe(true);
      expect(res2.message?.recipient).toBe('9876543211');
    });

    it('rejects invalid mobile phone formats', () => {
      // Too short
      const resShort = sendDemoSms('98765', 'REGISTRATION');
      expect(resShort.success).toBe(false);
      expect(resShort.error).toContain('valid 10-digit mobile number');

      // Does not start with [6-9]
      const resInvalidPrefix = sendDemoSms('1234567890', 'REGISTRATION');
      expect(resInvalidPrefix.success).toBe(false);
      expect(resInvalidPrefix.error).toContain('valid 10-digit mobile number');
    });

    it('rejects invalid email formats', () => {
      const resInvalidEmail = sendDemoSms('invalid-email-no-at-domain', 'REGISTRATION');
      expect(resInvalidEmail.success).toBe(false);
    });

    it('contains explicit demo and non-ownership disclaimers in simulated body', () => {
      const res = sendDemoSms('9876543210', 'REGISTRATION', '345678');
      expect(res.success).toBe(true);
      expect(res.message?.body).toContain('MODE: DEMO / DEVELOPMENT VERIFICATION ONLY');
      expect(res.message?.body).toContain('NOTICE: NOT A REAL MOBILE OWNERSHIP VERIFICATION');
      expect(res.message?.body).toContain('SIMULATED MESSAGE - NOT A REAL SMS');
    });
  });
});
