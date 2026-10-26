import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET as incidentGet, PATCH as incidentPatch } from '@/app/api/incidents/[id]/route';
import { POST as escalatePost } from '@/app/api/incidents/[id]/escalate/route';
import { POST as notesPost } from '@/app/api/incidents/[id]/notes/route';
import { 
  sendSmsNotification, 
  sendEmailNotification, 
  isTwilioConfigured,
  isSmtpConfigured
} from '@/lib/notifications';
import { createClient } from '@/lib/supabase/server';

const mockCreateTransport = vi.hoisted(() => vi.fn());
vi.mock('nodemailer', () => ({
  default: { createTransport: mockCreateTransport },
}));

interface CapturedRecord {
  action?: string;
  notes?: string;
  to_level?: string;
  [key: string]: unknown;
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

describe('Batch 4 — Management Incident Workflow & Notification Reliability', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // =========================================================================
  // 1. INCIDENT AUTHORIZATION & ISOLATION
  // =========================================================================
  describe('Incident Authorization & Privacy Controls', () => {
    const studentA = { id: 'student-usr-aaa', email: 'studentA@test.edu' };
    const studentB = { id: 'student-usr-bbb', email: 'studentB@test.edu' };
    const ordinaryStaff = { id: 'staff-usr-111', email: 'staff@test.edu' };

    it('rejects Student A attempting to read Student B incident with 403 Forbidden', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: studentA }, error: null }) },
        from: vi.fn((table: string) => {
          if (table === 'incidents') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'inc-bbb-123',
                  case_id: 'KC-2026-BBB123',
                  student_id: studentB.id,
                  category: 'HARASSMENT',
                  description: 'Student B private complaint',
                },
                error: null,
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: studentA.id, role: 'STUDENT', full_name: 'Student A' },
                error: null,
              }),
            };
          }
          return {};
        }),
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const req = new Request('http://localhost/api/incidents/inc-bbb-123');
      const res = await incidentGet(req, { params: Promise.resolve({ id: 'inc-bbb-123' }) });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('cannot access other students’ incidents');
    });

    it('masks anonymous reporter identity from ordinary staff viewers', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: ordinaryStaff }, error: null }) },
        from: vi.fn((table: string) => {
          if (table === 'incidents') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'inc-anon-456',
                  case_id: 'KC-2026-ANON456',
                  student_id: studentB.id,
                  is_anonymous: true,
                  category: 'SECURITY',
                  description: 'Anonymous witness report',
                  assigned_to: ordinaryStaff.id,
                },
                error: null,
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: ordinaryStaff.id, role: 'STAFF', full_name: 'Staff Responder' },
                error: null,
              }),
            };
          }
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [] }) };
        }),
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const req = new Request('http://localhost/api/incidents/inc-anon-456');
      const res = await incidentGet(req, { params: Promise.resolve({ id: 'inc-anon-456' }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.incident.student_id).toBeNull();
      expect(data.studentSummary).toBeNull();
    });

    it('rejects students attempting to assign or update incident status with 403 Forbidden', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: studentA }, error: null }) },
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: studentA.id, role: 'STUDENT', full_name: 'Student A' },
                error: null,
              }),
            };
          }
          return {};
        }),
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const req = new Request('http://localhost/api/incidents/inc-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RESOLVED', assigned_to: studentA.id }),
      });
      const res = await incidentPatch(req, { params: Promise.resolve({ id: 'inc-123' }) });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Only authorized personnel');
    });

    it('rejects assigning case to an unapproved or inactive staff member with 400 Bad Request', async () => {
      const securityOfficer = { id: 'sec-usr-999', email: 'security@test.edu' };
      const unapprovedStaff = { id: 'unapproved-staff', is_active: false, is_approved: false, role: 'STAFF' };

      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: securityOfficer }, error: null }) },
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn((_col: string, val: string) => ({
                single: vi.fn().mockResolvedValue({
                  data: val === securityOfficer.id
                    ? { id: securityOfficer.id, role: 'SECURITY', full_name: 'Guard Chief' }
                    : unapprovedStaff,
                  error: null,
                }),
              })),
            };
          }
          if (table === 'incidents') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: 'inc-999', case_id: 'KC-2026-999', status: 'RECEIVED', assigned_to: null },
                error: null,
              }),
            };
          }
          return {};
        }),
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const req = new Request('http://localhost/api/incidents/inc-999', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: unapprovedStaff.id }),
      });
      const res = await incidentPatch(req, { params: Promise.resolve({ id: 'inc-999' }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Must be an active, approved staff member');
    });
  });

  // =========================================================================
  // 2. CASE NOTES & ESCALATION WORKFLOW
  // =========================================================================
  describe('Case Notes & Escalation Workflow', () => {
    const studentUser = { id: 'student-usr-fail', role: 'STUDENT' };
    const adminUser = { id: 'admin-usr-pass', role: 'ADMIN', full_name: 'Administrator' };

    it('rejects student attempting to add official case note with 403 Forbidden', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: studentUser }, error: null }) },
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: studentUser, error: null }),
            };
          }
          return {};
        }),
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const req = new Request('http://localhost/api/incidents/inc-123/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Hacked note attempt' }),
      });
      const res = await notesPost(req, { params: Promise.resolve({ id: 'inc-123' }) });
      expect(res.status).toBe(403);
    });

    it('allows authorized staff to record case note and creates audit entry', async () => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      let caseActionInserted: Record<string, any> | null = null;
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      let auditLogInserted: Record<string, any> | null = null;

      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: adminUser }, error: null }) },
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: adminUser, error: null }),
            };
          }
          if (table === 'incidents') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { id: 'inc-123', case_id: 'KC-2026-NOTE', status: 'IN_PROGRESS' }, error: null }),
            };
          }
          if (table === 'case_actions') {
            return {
              insert: vi.fn((payload) => {
                caseActionInserted = payload;
                return {
                  select: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({ data: { id: 'act-1', ...payload }, error: null }),
                };
              }),
            };
          }
          if (table === 'audit_logs') {
            return {
              insert: vi.fn((payload) => {
                auditLogInserted = payload;
                return Promise.resolve({ error: null });
              }),
            };
          }
          return {};
        }),
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const req = new Request('http://localhost/api/incidents/inc-123/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Medical team attended to student. Everything stabilized.' }),
      });
      const res = await notesPost(req, { params: Promise.resolve({ id: 'inc-123' }) });
      expect(res.status).toBe(201);
      expect(caseActionInserted).not.toBeNull();
      const action = caseActionInserted as unknown as CapturedRecord;
      const audit = auditLogInserted as unknown as CapturedRecord;
      expect(action.action).toBe('NOTE_ADDED');
      expect(action.notes).toContain('Medical team attended');
      expect(audit.action).toBe('CASE_NOTE_ADDED');
    });

    it('rejects student attempting to escalate incident with 403 Forbidden', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: studentUser }, error: null }) },
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: studentUser, error: null }),
            };
          }
          return {};
        }),
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const req = new Request('http://localhost/api/incidents/inc-123/escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Student escalating' }),
      });
      const res = await escalatePost(req, { params: Promise.resolve({ id: 'inc-123' }) });
      expect(res.status).toBe(403);
    });

    it('allows authorized staff to escalate incident and records escalation, action and audit log', async () => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      let escalationInserted: Record<string, any> | null = null;
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      let caseActionInserted: Record<string, any> | null = null;
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      let auditLogInserted: Record<string, any> | null = null;

      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: adminUser }, error: null }) },
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: adminUser, error: null }),
            };
          }
          if (table === 'incidents') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: 'inc-esc-123', case_id: 'KC-2026-ESC123', status: 'IN_PROGRESS', category: 'THREAT', severity: 'HIGH' },
                error: null,
              }),
            };
          }
          if (table === 'escalations') {
            return {
              insert: vi.fn((payload) => {
                escalationInserted = payload;
                return Promise.resolve({ error: null });
              }),
            };
          }
          if (table === 'case_actions') {
            return {
              insert: vi.fn((payload) => {
                caseActionInserted = payload;
                return Promise.resolve({ error: null });
              }),
            };
          }
          if (table === 'audit_logs') {
            return {
              insert: vi.fn((payload) => {
                auditLogInserted = payload;
                return Promise.resolve({ error: null });
              }),
            };
          }
          if (table === 'notifications') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          return {};
        }),
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const req = new Request('http://localhost/api/incidents/inc-esc-123/escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason: 'Severe campus security threat reported outside main gate.',
          to_level: 'CAMPUS_POLICE' 
        }),
      });
      const res = await escalatePost(req, { params: Promise.resolve({ id: 'inc-esc-123' }) });
      expect(res.status).toBe(200);
      expect(escalationInserted).not.toBeNull();
      const esc = escalationInserted as unknown as CapturedRecord;
      const act = caseActionInserted as unknown as CapturedRecord;
      const aud = auditLogInserted as unknown as CapturedRecord;
      expect(esc.to_level).toBe('CAMPUS_POLICE');
      expect(act.action).toBe('ESCALATED');
      expect(aud.action).toBe('INCIDENT_ESCALATED');
    });
  });

  // =========================================================================
  // 3. NOTIFICATION RELIABILITY & IDEMPOTENCY
  // =========================================================================
  describe('Notification Reliability, Idempotency & Bounded Retries', () => {
    it('fails closed and reports NOT_CONFIGURED when Twilio or SMTP credentials are missing', async () => {
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;
      delete process.env.TWILIO_PHONE_NUMBER;
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      expect(isTwilioConfigured()).toBe(false);
      expect(isSmtpConfigured()).toBe(false);

      const smsRes = await sendSmsNotification({ toPhone: '+919999988888', body: 'Emergency test' });
      expect(smsRes.success).toBe(false);
      expect(smsRes.status).toBe('NOT_CONFIGURED');
      expect(smsRes.error).toContain('Twilio credentials not configured');

      const emailRes = await sendEmailNotification({ toEmail: 'admin@test.edu', subject: 'Emergency', body: 'Test' });
      expect(emailRes.success).toBe(false);
      expect(emailRes.status).toBe('NOT_CONFIGURED');
      expect(emailRes.error).toContain('SMTP credentials not configured');
    });

    it('enforces idempotency and prevents duplicate external dispatches', async () => {
      process.env.SMTP_HOST = 'smtp.test.edu';
      process.env.SMTP_USER = 'kavach_mailer';
      process.env.SMTP_PASS = 'secret_pass';
      process.env.ENABLE_REAL_NOTIFICATIONS = 'true';
      const sendMail = vi.fn().mockResolvedValue({
        accepted: ['alert@campus.edu'],
        messageId: 'mocked-email-id',
      });
      mockCreateTransport.mockReturnValue({ sendMail });

      const key = `idem-key-test-${Date.now()}`;
      const payload = {
        toEmail: 'alert@campus.edu',
        subject: 'Case Update',
        body: 'Status changed to RESOLVED',
        idempotencyKey: key,
      };

      const firstCall = await sendEmailNotification(payload);
      expect(firstCall.success).toBe(true);
      expect(firstCall.status).toBe('SENT');
      const firstMessageId = firstCall.messageId;

      // Second call with same idempotency key must return the cached result
      const secondCall = await sendEmailNotification(payload);
      expect(secondCall.success).toBe(true);
      expect(secondCall.status).toBe('SENT');
      expect(secondCall.messageId).toBe(firstMessageId);
      expect(secondCall.idempotencyKey).toBe(key);
    });

    it('performs bounded retries on transient 5xx server errors and records retryCount', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'AC_mock_retry_sid';
      process.env.TWILIO_AUTH_TOKEN = 'mock_auth_token';
      process.env.TWILIO_PHONE_NUMBER = '+15551234567';
      process.env.ENABLE_REAL_NOTIFICATIONS = 'true';

      let fetchCallCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        fetchCallCount++;
        if (fetchCallCount < 2) {
          return Promise.resolve({
            ok: false,
            status: 503,
            text: () => Promise.resolve('Service Unavailable'),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ sid: 'SM_retry_success_sid' }),
        });
      });

      const res = await sendSmsNotification({
        toPhone: '+919876543210',
        body: 'Alert with transient network retry',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('DELIVERED');
      expect(res.messageId).toBe('SM_retry_success_sid');
      expect(res.retryCount).toBe(1);
      expect(fetchCallCount).toBe(2);
    });
  });
});
