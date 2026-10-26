export type DeliveryStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'NOT_CONFIGURED' | 'FAILED' | 'DISABLED' | 'UNKNOWN';

export interface DeliveryResult {
  success: boolean;
  status: DeliveryStatus;
  provider: 'TWILIO' | 'FCM' | 'SMTP' | 'IN_APP_ONLY';
  messageId?: string;
  error?: string;
  retryCount?: number;
  idempotencyKey?: string;
}

export interface SmsPayload {
  toPhone: string;
  body: string;
  idempotencyKey?: string;
}

export interface EmailPayload {
  toEmail: string;
  subject: string;
  body: string;
  idempotencyKey?: string;
}

export interface PushPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  idempotencyKey?: string;
}

export interface EmergencyDispatchParams {
  recipientPhone?: string | null;
  recipientEmail?: string | null;
  recipientUserId?: string | null;
  title: string;
  message: string;
  incidentId?: string;
  idempotencyKey?: string;
}

export interface AuditNotificationRecord {
  inAppNotificationCreated: boolean;
  notificationId?: string;
  externalDelivery: DeliveryResult;
  timestamp: string;
}
