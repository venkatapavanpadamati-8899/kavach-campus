import { randomInt, randomUUID } from 'node:crypto';

/**
 * KAVACH CAMPUS — FREE DEMO SMS & OTP SERVICE
 *
 * STRICT REQUIREMENT & SAFETY BOUNDARIES:
 * 1. 100% Free, local in-memory simulation only.
 * 2. Never sends real SMS messages or calls paid telecommunication gateways (Twilio disabled).
 * 3. Never requires a credit card, paid plan, or billing setup.
 * 4. Active strictly in development / demo mode (NODE_ENV !== 'production').
 * 5. Uses a 5-minute expiry window and strictly rate-limits requests & verification attempts.
 * 6. Cryptographically secure random generation (CSPRNG) via node:crypto.
 * 7. Authorized inbox query via clientToken session binding.
 */

export interface DemoSmsMessage {
  id: string;
  recipient: string;
  otp: string;
  body: string;
  purpose: 'REGISTRATION' | 'LOGIN' | 'PASSWORD_RESET';
  createdAt: number;
  expiresAt: number;
  attempts: number;
  verified: boolean;
  clientToken: string;
  isRealSms: false;
  isRealVerification: false;
  verificationType: 'DEMO_DEVELOPMENT_ONLY';
}

// In-memory store for development/demo mode only
const demoSmsStore = new Map<string, DemoSmsMessage>();
const DEMO_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_VERIFICATION_ATTEMPTS = 5;
const MAX_REQUESTS_PER_WINDOW = 3;
const MIN_COOLDOWN_MS = 30 * 1000; // 30 seconds between requests
const requestRateLimits = new Map<string, number[]>();

export function resetDemoSmsStore(): void {
  demoSmsStore.clear();
  requestRateLimits.clear();
}

export function isDemoSmsEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  if (process.env.ENABLE_DEMO_OTP === 'false' || process.env.ENABLE_DEMO_SMS === 'false') {
    return false;
  }
  return true;
}

/**
 * Normalizes and validates a phone number or email address format.
 */
export function validateRecipientFormat(recipient: string): { valid: boolean; normalized: string; isPhone: boolean; error?: string } {
  if (!recipient || typeof recipient !== 'string') {
    return { valid: false, normalized: '', isPhone: false, error: 'Recipient identifier is required.' };
  }
  const trimmed = recipient.trim().toLowerCase();
  if (trimmed.includes('@')) {
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    return {
      valid: isEmailValid,
      normalized: trimmed,
      isPhone: false,
      error: isEmailValid ? undefined : 'Please enter a valid email address.',
    };
  }

  // Treat as mobile phone number: normalize country code and validate 10 digits starting with [6-9]
  const digits = trimmed.replace(/\D/g, '');
  let phone10 = digits;
  if (digits.length === 12 && digits.startsWith('91')) {
    phone10 = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    phone10 = digits.slice(1);
  }

  const isPhoneValid = phone10.length === 10 && /^[6-9]\d{9}$/.test(phone10);
  return {
    valid: isPhoneValid,
    normalized: isPhoneValid ? phone10 : trimmed,
    isPhone: true,
    error: isPhoneValid ? undefined : 'Please enter a valid 10-digit mobile number.',
  };
}

/**
 * Creates and stores a simulated Demo SMS message.
 * Never connects to any external paid provider.
 * Uses CSPRNG (crypto.randomInt) for secure OTP generation.
 */
export function sendDemoSms(
  recipient: string,
  purpose: 'REGISTRATION' | 'LOGIN' | 'PASSWORD_RESET' = 'REGISTRATION',
  fixedOtp?: string,
  skipCooldown: boolean = false
): { success: boolean; message?: DemoSmsMessage; error?: string } {
  if (!isDemoSmsEnabled()) {
    return {
      success: false,
      error: 'Demo SMS is disabled in production. Real SMS gateway configuration required.',
    };
  }

  const validation = validateRecipientFormat(recipient);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Invalid recipient format.',
    };
  }
  const cleanRecipient = validation.normalized;

  // Rate-limiting OTP requests
  const now = Date.now();
  const timestamps = requestRateLimits.get(cleanRecipient) || [];
  const recentRequests = timestamps.filter((t) => now - t < DEMO_EXPIRY_MS);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return {
      success: false,
      error: 'Too many OTP requests. Please wait before requesting another code.',
    };
  }

  // Enforce minimum resend cooldown between requests
  const lastRequestTime = timestamps.length > 0 ? timestamps[timestamps.length - 1] : 0;
  if (!skipCooldown && lastRequestTime > 0 && (now - lastRequestTime < MIN_COOLDOWN_MS)) {
    const remainingSec = Math.ceil((MIN_COOLDOWN_MS - (now - lastRequestTime)) / 1000);
    return {
      success: false,
      error: `Please wait ${remainingSec} seconds before requesting another verification code.`,
    };
  }

  recentRequests.push(now);
  requestRateLimits.set(cleanRecipient, recentRequests);

  // Generate 6-digit numeric OTP using CSPRNG (crypto.randomInt) or fixed demo OTP in test mode
  const otp = fixedOtp && fixedOtp.length === 6 ? fixedOtp : randomInt(100000, 1000000).toString();
  const expiresAt = now + DEMO_EXPIRY_MS;
  const clientToken = randomUUID();

  const simulatedBody = [
    '----------------------------------',
    'KAVACH CAMPUS - DEMO SMS',
    'MODE: DEMO / DEVELOPMENT VERIFICATION ONLY',
    'NOTICE: NOT A REAL MOBILE OWNERSHIP VERIFICATION',
    `Your verification OTP is: ${otp}`,
    'Valid for 5 minutes.',
    'SIMULATED MESSAGE - NOT A REAL SMS',
    '----------------------------------',
  ].join('\n');

  const demoMessage: DemoSmsMessage = {
    id: `demo-sms-${now}-${randomUUID().substring(0, 8)}`,
    recipient: cleanRecipient,
    otp,
    body: simulatedBody,
    purpose,
    createdAt: now,
    expiresAt,
    attempts: 0,
    verified: false,
    clientToken,
    isRealSms: false,
    isRealVerification: false,
    verificationType: 'DEMO_DEVELOPMENT_ONLY',
  };

  demoSmsStore.set(cleanRecipient, demoMessage);

  // Development-only safe console log
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n[DEMO SMS DISPATCH - ₹0 FREE SIMULATION]\nRecipient: ${recipient}\n${simulatedBody}\n`);
  }

  return { success: true, message: demoMessage };
}

/**
 * Retrieves the latest active Demo SMS message for an identifier (development mode only).
 * If clientToken is specified, enforces session authorization check.
 */
export function getLatestDemoSms(recipient: string, clientToken?: string): DemoSmsMessage | null {
  if (!isDemoSmsEnabled()) return null;
  const cleanRecipient = recipient.trim().toLowerCase();
  const msg = demoSmsStore.get(cleanRecipient);
  if (!msg) return null;
  if (Date.now() > msg.expiresAt || msg.verified) {
    return null;
  }
  // If clientToken is provided, enforce token match
  if (clientToken !== undefined && msg.clientToken !== clientToken) {
    return null;
  }
  return msg;
}

/**
 * Verifies an entered OTP against the Demo SMS store.
 * Enforces:
 * - Environment gate (rejected in production)
 * - 5-minute expiry
 * - Max 5 attempts
 * - Invalidation after success
 */
export function verifyDemoSmsOtp(
  recipient: string,
  inputOtp: string
): { success: boolean; error?: string } {
  if (!isDemoSmsEnabled()) {
    return { success: false, error: 'Demo SMS verification is not available in production.' };
  }

  const cleanRecipient = recipient.trim().toLowerCase();
  const record = demoSmsStore.get(cleanRecipient);

  if (!record) {
    return { success: false, error: 'No active OTP found. Please request a new code.' };
  }

  if (Date.now() > record.expiresAt) {
    demoSmsStore.delete(cleanRecipient);
    return { success: false, error: 'OTP has expired (valid for 5 minutes). Please request a new one.' };
  }

  if (record.verified) {
    return { success: false, error: 'This OTP has already been used. Please request a new code.' };
  }

  if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    demoSmsStore.delete(cleanRecipient);
    return { success: false, error: 'Maximum verification attempts exceeded. Please request a new code.' };
  }

  record.attempts += 1;

  if (record.otp !== inputOtp.trim()) {
    if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      demoSmsStore.delete(cleanRecipient);
      return {
        success: false,
        error: 'Maximum verification attempts exceeded. Please request a new code.',
      };
    }
    return {
      success: false,
      error: `Invalid OTP. ${MAX_VERIFICATION_ATTEMPTS - record.attempts} attempts remaining.`,
    };
  }

  // Mark as verified and invalidate
  record.verified = true;
  demoSmsStore.delete(cleanRecipient);

  return { success: true };
}
