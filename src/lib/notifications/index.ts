import nodemailer from 'nodemailer';
import { JWT } from 'google-auth-library';
import { DeliveryResult, SmsPayload, PushPayload, EmailPayload, EmergencyDispatchParams } from './types';

export * from './types';
export * from './in-app';

// In-memory idempotency cache with 10-minute TTL to prevent duplicate external transmissions
interface CachedDispatch {
  result: DeliveryResult;
  timestamp: number;
}
const idempotencyCache = new Map<string, CachedDispatch>();
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000; // 10 minutes

function checkIdempotency(key?: string): DeliveryResult | null {
  if (!key) return null;
  const cached = idempotencyCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > IDEMPOTENCY_TTL_MS) {
    idempotencyCache.delete(key);
    return null;
  }
  return { ...cached.result, idempotencyKey: key };
}

function recordIdempotency(key: string | undefined, result: DeliveryResult): void {
  if (!key) return;
  idempotencyCache.set(key, { result, timestamp: Date.now() });
}

/**
 * Sanitized structured logger for notification events.
 * Never outputs credentials, tokens, or plaintext PII.
 */
function logNotificationEvent(event: {
  provider: string;
  status: string;
  recipientMasked?: string;
  idempotencyKey?: string;
  retryCount?: number;
  error?: string;
}) {
  const parts = [
    `[NotificationDispatch]`,
    `provider=${event.provider}`,
    `status=${event.status}`,
    event.recipientMasked ? `recipient=${event.recipientMasked}` : null,
    event.idempotencyKey ? `idempotencyKey=${event.idempotencyKey}` : null,
    event.retryCount ? `retries=${event.retryCount}` : null,
    event.error ? `error=${event.error.replace(/[a-zA-Z0-9_-]{20,}/g, '[REDACTED]')}` : null,
  ].filter(Boolean);
  
  if (event.status === 'DELIVERED' || event.status === 'SENT') {
    console.log(parts.join(' '));
  } else {
    console.warn(parts.join(' '));
  }
}

/**
 * Masks phone numbers to protect user privacy in logs.
 * e.g. "+919876543210" -> "+91 *** 3210"
 */
function maskPhone(phone?: string): string {
  if (!phone || phone.length < 5) return '***';
  return `${phone.slice(0, 3)} *** ${phone.slice(-4)}`;
}

/**
 * Masks email addresses to protect user privacy in logs.
 * e.g. "student@university.edu" -> "s***@university.edu"
 */
function maskEmail(email?: string): string {
  if (!email || !email.includes('@')) return '***@***';
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
}

/**
 * Validates whether Twilio SMS environment variables are defined.
 * Does not expose or log any secret values.
 */
export function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}

/**
 * Validates whether Firebase Cloud Messaging (FCM) environment variables are defined.
 * Does not expose or log any secret values.
 */
export function isFcmConfigured(): boolean {
  return Boolean(
    (process.env.FCM_PROJECT_ID || process.env.FIREBASE_PROJECT_ID) &&
    (process.env.FCM_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL) &&
    (process.env.FCM_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY)
  );
}

/**
 * Validates whether SMTP / Email environment variables are defined.
 * Does not expose or log any secret values.
 */
export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_HOST.trim().length > 0 &&
    process.env.SMTP_USER.trim().length > 0 &&
    process.env.SMTP_PASS.trim().length > 0
  );
}

/**
 * Returns the resolved sender address for outgoing SMTP emails.
 * Standard configuration: SMTP_FROM
 * Backwards compatibility: SMTP_FROM_EMAIL
 * Fallback: SMTP_USER (strictly only if it is a valid email; SendGrid uses 'apikey' which is not an email)
 */
export function getSmtpFromAddress(): string | undefined {
  const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_FROM_EMAIL?.trim();
  if (from && from.length > 0) {
    return from;
  }
  const user = process.env.SMTP_USER?.trim();
  // SendGrid standard SMTP uses 'apikey' as the username, which is an API key and never a valid sender email.
  if (user && user.toLowerCase() === 'apikey') {
    return undefined;
  }
  return user && user.length > 0 ? user : undefined;
}

/**
 * Checks whether live external notification delivery is explicitly enabled.
 * Defaults to FALSE to prevent unintended emergency transmissions.
 */
export function isRealDeliveryEnabled(): boolean {
  return process.env.ENABLE_REAL_NOTIFICATIONS === 'true';
}

/**
 * Checks whether live email notification delivery is explicitly enabled.
 * Can be enabled independently via ENABLE_REAL_EMAIL_DELIVERY=true without
 * activating live SMS or Push emergency notifications.
 */
export function isRealEmailDeliveryEnabled(): boolean {
  if (process.env.ENABLE_REAL_EMAIL_DELIVERY === 'false') {
    return false;
  }
  if (process.env.ENABLE_REAL_EMAIL_DELIVERY === 'true' || process.env.ENABLE_REAL_NOTIFICATIONS === 'true') {
    return true;
  }
  // In production runtime (e.g. Vercel deployments), if valid SMTP credentials
  // (SMTP_HOST, SMTP_USER, SMTP_PASS) are explicitly provided, treat email delivery
  // as enabled by default so registration OTPs are delivered without requiring a redundant flag.
  return process.env.NODE_ENV === 'production' && isSmtpConfigured();
}

/**
 * Server-side SMS Dispatch Adapter with bounded retry and idempotency protection.
 * Never throws.
 */
export async function sendSmsNotification(payload: SmsPayload): Promise<DeliveryResult> {
  const cached = checkIdempotency(payload.idempotencyKey);
  if (cached) {
    logNotificationEvent({
      provider: 'TWILIO',
      status: cached.status,
      recipientMasked: maskPhone(payload.toPhone),
      idempotencyKey: payload.idempotencyKey,
    });
    return cached;
  }

  if (!isTwilioConfigured()) {
    const res: DeliveryResult = {
      success: false,
      status: 'NOT_CONFIGURED',
      provider: 'TWILIO',
      idempotencyKey: payload.idempotencyKey,
      error: 'Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER required)',
    };
    logNotificationEvent({
      provider: 'TWILIO',
      status: 'NOT_CONFIGURED',
      recipientMasked: maskPhone(payload.toPhone),
      idempotencyKey: payload.idempotencyKey,
    });
    return res;
  }

  if (!isRealDeliveryEnabled()) {
    const res: DeliveryResult = {
      success: false,
      status: 'DISABLED',
      provider: 'TWILIO',
      idempotencyKey: payload.idempotencyKey,
      error: 'Real SMS delivery disabled by default. Set ENABLE_REAL_NOTIFICATIONS=true with verified test numbers.',
    };
    logNotificationEvent({
      provider: 'TWILIO',
      status: 'DISABLED',
      recipientMasked: maskPhone(payload.toPhone),
      idempotencyKey: payload.idempotencyKey,
    });
    return res;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID!.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN!.trim();
  const rawFrom = process.env.TWILIO_PHONE_NUMBER!.trim();
  const fromPhone = rawFrom.startsWith('+') ? rawFrom : `+${rawFrom}`;
  const rawTo = payload.toPhone.trim();
  const toPhone = rawTo.startsWith('+') ? rawTo : (rawTo.length === 10 ? `+91${rawTo}` : `+${rawTo}`);
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const bodyParams = new URLSearchParams({
    To: toPhone,
    From: fromPhone,
    Body: payload.body,
  });

  const MAX_RETRIES = 2;
  let lastError = 'Unknown error';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        lastError = `Twilio HTTP ${response.status}: ${errBody.slice(0, 100)}`;
        
        // Only retry on transient 5xx server errors, not on 4xx client errors
        if (response.status >= 500 && attempt < MAX_RETRIES) {
          continue;
        }

        const failResult: DeliveryResult = {
          success: false,
          status: 'FAILED',
          provider: 'TWILIO',
          idempotencyKey: payload.idempotencyKey,
          retryCount: attempt,
          error: lastError,
        };
        logNotificationEvent({
          provider: 'TWILIO',
          status: 'FAILED',
          recipientMasked: maskPhone(payload.toPhone),
          retryCount: attempt,
          error: lastError,
        });
        return failResult;
      }

      const data = await response.json();
      const successResult: DeliveryResult = {
        success: true,
        status: 'DELIVERED',
        provider: 'TWILIO',
        messageId: data.sid,
        idempotencyKey: payload.idempotencyKey,
        retryCount: attempt,
      };
      recordIdempotency(payload.idempotencyKey, successResult);
      logNotificationEvent({
        provider: 'TWILIO',
        status: 'DELIVERED',
        recipientMasked: maskPhone(payload.toPhone),
        idempotencyKey: payload.idempotencyKey,
        retryCount: attempt,
      });
      return successResult;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < MAX_RETRIES) {
        continue;
      }
    }
  }

  const res: DeliveryResult = {
    success: false,
    status: 'FAILED',
    provider: 'TWILIO',
    idempotencyKey: payload.idempotencyKey,
    retryCount: MAX_RETRIES,
    error: `SMS dispatch failed after ${MAX_RETRIES} retries: ${lastError}`,
  };
  logNotificationEvent({
    provider: 'TWILIO',
    status: 'FAILED',
    recipientMasked: maskPhone(payload.toPhone),
    retryCount: MAX_RETRIES,
    error: lastError,
  });
  return res;
}

/**
 * Server-side SMTP email adapter. SMTP acceptance is reported as SENT, not DELIVERED.
 * Never throws.
 */
export async function sendEmailNotification(payload: EmailPayload): Promise<DeliveryResult> {
  const cached = checkIdempotency(payload.idempotencyKey);
  if (cached) {
    logNotificationEvent({
      provider: 'SMTP',
      status: cached.status,
      recipientMasked: maskEmail(payload.toEmail),
      idempotencyKey: payload.idempotencyKey,
    });
    return cached;
  }

  if (!isSmtpConfigured()) {
    const res: DeliveryResult = {
      success: false,
      status: 'NOT_CONFIGURED',
      provider: 'SMTP',
      idempotencyKey: payload.idempotencyKey,
      error: 'SMTP credentials not configured (SMTP_HOST, SMTP_USER, SMTP_PASS required)',
    };
    logNotificationEvent({
      provider: 'SMTP',
      status: 'NOT_CONFIGURED',
      recipientMasked: maskEmail(payload.toEmail),
      idempotencyKey: payload.idempotencyKey,
    });
    return res;
  }

  if (!isRealEmailDeliveryEnabled()) {
    const res: DeliveryResult = {
      success: false,
      status: 'DISABLED',
      provider: 'SMTP',
      idempotencyKey: payload.idempotencyKey,
      error: 'Real Email delivery disabled by default. Set ENABLE_REAL_EMAIL_DELIVERY=true or ENABLE_REAL_NOTIFICATIONS=true.',
    };
    logNotificationEvent({
      provider: 'SMTP',
      status: 'DISABLED',
      recipientMasked: maskEmail(payload.toEmail),
      idempotencyKey: payload.idempotencyKey,
    });
    return res;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return {
      success: false,
      status: 'FAILED',
      provider: 'SMTP',
      idempotencyKey: payload.idempotencyKey,
      error: 'SMTP_PORT must be a valid TCP port',
    };
  }

  const fromAddress = getSmtpFromAddress();
  if (!fromAddress) {
    return {
      success: false,
      status: 'FAILED',
      provider: 'SMTP',
      idempotencyKey: payload.idempotencyKey,
      error: 'SMTP sender address not configured (set SMTP_FROM or SMTP_USER)',
    };
  }

  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST?.trim(),
      port,
      secure: process.env.SMTP_SECURE === 'true' || (process.env.SMTP_SECURE !== 'false' && port === 465),
      auth: {
        user: process.env.SMTP_USER?.trim(),
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 6000,
      greetingTimeout: 6000,
      socketTimeout: 6000,
    });
    const info = await transport.sendMail({
      from: fromAddress,
      to: payload.toEmail,
      subject: payload.subject,
      text: payload.body,
    });
    const accepted = Array.isArray(info.accepted)
      ? info.accepted.some((recipient) => {
          const addr = typeof recipient === 'string' ? recipient : (recipient as { address?: string })?.address;
          return addr?.toLowerCase() === payload.toEmail.toLowerCase();
        })
      : false;

    if (!accepted) {
      const result: DeliveryResult = {
        success: false,
        status: 'FAILED',
        provider: 'SMTP',
        idempotencyKey: payload.idempotencyKey,
        error: 'SMTP server did not accept the recipient',
      };
      logNotificationEvent({
        provider: 'SMTP',
        status: result.status,
        recipientMasked: maskEmail(payload.toEmail),
        idempotencyKey: payload.idempotencyKey,
      });
      return result;
    }

    const result: DeliveryResult = {
      success: true,
      status: 'SENT',
      provider: 'SMTP',
      messageId: info.messageId,
      idempotencyKey: payload.idempotencyKey,
    };
    recordIdempotency(payload.idempotencyKey, result);
    logNotificationEvent({
      provider: 'SMTP',
      status: result.status,
      recipientMasked: maskEmail(payload.toEmail),
      idempotencyKey: payload.idempotencyKey,
    });
    return result;
  } catch (err: unknown) {
    const rawError = err instanceof Error ? err.message : String(err);
    const sanitizedError = rawError.replace(/[a-zA-Z0-9_-]{20,}/g, '[REDACTED]');
    const result: DeliveryResult = {
      success: false,
      status: 'UNKNOWN',
      provider: 'SMTP',
      idempotencyKey: payload.idempotencyKey,
      error: 'SMTP handoff failed; delivery outcome could not be confirmed',
    };
    recordIdempotency(payload.idempotencyKey, result);
    logNotificationEvent({
      provider: 'SMTP',
      status: result.status,
      recipientMasked: maskEmail(payload.toEmail),
      idempotencyKey: payload.idempotencyKey,
      error: sanitizedError,
    });
    return result;
  }
}

let fcmJwtClient: JWT | null = null;

function getFcmJwtClient(): JWT | null {
  const email = process.env.FCM_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FCM_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
  if (!email || !rawKey) return null;
  const key = rawKey.replace(/\\n/g, '\n');
  if (!fcmJwtClient) {
    fcmJwtClient = new JWT({
      email,
      key,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
  }
  return fcmJwtClient;
}

/**
 * Server-side Push Notification Dispatch Adapter
 * Safely handles timeouts and bounded retries. Never throws.
 */
export async function sendPushNotification(payload: PushPayload): Promise<DeliveryResult> {
  const cached = checkIdempotency(payload.idempotencyKey);
  if (cached) {
    return cached;
  }

  if (!payload.userId) {
    return {
      success: false,
      status: 'FAILED',
      provider: 'FCM',
      idempotencyKey: payload.idempotencyKey,
      error: 'Missing recipient userId for push notification',
    };
  }

  if (!isFcmConfigured()) {
    const res: DeliveryResult = {
      success: false,
      status: 'NOT_CONFIGURED',
      provider: 'FCM',
      idempotencyKey: payload.idempotencyKey,
      error: 'FCM credentials not configured (FCM_PROJECT_ID or FIREBASE_PROJECT_ID, FCM_CLIENT_EMAIL or FIREBASE_CLIENT_EMAIL, FCM_PRIVATE_KEY or FIREBASE_PRIVATE_KEY required)',
    };
    logNotificationEvent({
      provider: 'FCM',
      status: 'NOT_CONFIGURED',
      idempotencyKey: payload.idempotencyKey,
    });
    return res;
  }

  if (!isRealDeliveryEnabled()) {
    return {
      success: false,
      status: 'DISABLED',
      provider: 'FCM',
      idempotencyKey: payload.idempotencyKey,
      error: 'Real push notification delivery disabled by default.',
    };
  }

  const targetToken = payload.deviceToken || payload.data?.token;
  const targetTopic = payload.data?.topic;

  if (!targetToken && !targetTopic) {
    const res: DeliveryResult = {
      success: false,
      status: 'FAILED',
      provider: 'FCM',
      idempotencyKey: payload.idempotencyKey,
      error: `No registered device token provided for user: ${payload.userId}`,
    };
    logNotificationEvent({
      provider: 'FCM',
      status: 'FAILED',
      idempotencyKey: payload.idempotencyKey,
      error: res.error,
    });
    return res;
  }

  const projectId = process.env.FCM_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const MAX_RETRIES = 2;
  let lastError = 'Unknown FCM error';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const client = getFcmJwtClient();
      if (!client) {
        throw new Error('FCM client initialization failed');
      }
      const tokenResp = await client.getAccessToken();
      const accessToken = tokenResp.token;
      if (!accessToken) {
        throw new Error('Failed to acquire OAuth2 access token for FCM');
      }

      const endpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const messageObj: Record<string, unknown> = {
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
      };
      if (targetToken) {
        messageObj.token = targetToken;
      } else if (targetTopic) {
        messageObj.topic = targetTopic;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: messageObj }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const fcmErrMessage = (errData as { error?: { message?: string } })?.error?.message || `HTTP ${response.status}`;
        lastError = `FCM HTTP ${response.status}: ${fcmErrMessage}`;

        if (response.status >= 500 && attempt < MAX_RETRIES) {
          continue;
        }

        const failResult: DeliveryResult = {
          success: false,
          status: 'FAILED',
          provider: 'FCM',
          idempotencyKey: payload.idempotencyKey,
          retryCount: attempt,
          error: lastError,
        };
        logNotificationEvent({
          provider: 'FCM',
          status: 'FAILED',
          idempotencyKey: payload.idempotencyKey,
          retryCount: attempt,
          error: lastError,
        });
        return failResult;
      }

      const data = await response.json();
      const successResult: DeliveryResult = {
        success: true,
        status: 'DELIVERED',
        provider: 'FCM',
        messageId: data.name,
        idempotencyKey: payload.idempotencyKey,
        retryCount: attempt,
      };
      recordIdempotency(payload.idempotencyKey, successResult);
      logNotificationEvent({
        provider: 'FCM',
        status: 'DELIVERED',
        idempotencyKey: payload.idempotencyKey,
        retryCount: attempt,
      });
      return successResult;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < MAX_RETRIES) {
        continue;
      }
    }
  }

  const res: DeliveryResult = {
    success: false,
    status: 'FAILED',
    provider: 'FCM',
    idempotencyKey: payload.idempotencyKey,
    retryCount: MAX_RETRIES,
    error: `FCM push dispatch failed after ${MAX_RETRIES} retries: ${lastError}`,
  };
  logNotificationEvent({
    provider: 'FCM',
    status: 'FAILED',
    idempotencyKey: payload.idempotencyKey,
    retryCount: MAX_RETRIES,
    error: lastError,
  });
  return res;
}

/**
 * Unified Emergency Dispatch Workflow
 * Dispatches in-app, SMS, Push, and Email notifications while guaranteeing that
 * external delivery failures NEVER block incident creation or escalate errors to the caller.
 */
export async function dispatchEmergencyNotification(params: EmergencyDispatchParams): Promise<{
  sms: DeliveryResult;
  push: DeliveryResult;
  email: DeliveryResult;
}> {
  const smsResult = params.recipientPhone
    ? await sendSmsNotification({
        toPhone: params.recipientPhone,
        body: `${params.title}: ${params.message}`,
        idempotencyKey: params.idempotencyKey ? `${params.idempotencyKey}-sms` : undefined,
      })
    : {
        success: false,
        status: 'NOT_CONFIGURED' as const,
        provider: 'TWILIO' as const,
        error: 'No recipient phone number provided',
      };

  const pushResult = params.recipientUserId
    ? await sendPushNotification({
        userId: params.recipientUserId,
        title: params.title,
        body: params.message,
        idempotencyKey: params.idempotencyKey ? `${params.idempotencyKey}-push` : undefined,
      })
    : {
        success: false,
        status: 'NOT_CONFIGURED' as const,
        provider: 'FCM' as const,
        error: 'No recipient user ID provided',
      };

  const emailResult = params.recipientEmail
    ? await sendEmailNotification({
        toEmail: params.recipientEmail,
        subject: params.title,
        body: params.message,
        idempotencyKey: params.idempotencyKey ? `${params.idempotencyKey}-email` : undefined,
      })
    : {
        success: false,
        status: 'NOT_CONFIGURED' as const,
        provider: 'SMTP' as const,
        error: 'No recipient email provided',
      };

  return { sms: smsResult, push: pushResult, email: emailResult };
}
