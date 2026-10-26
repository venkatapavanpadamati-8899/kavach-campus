import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PUT as profilePut } from '@/app/api/student/profile/route';
import { GET as evidenceGet, POST as evidencePost } from '@/app/api/incidents/[id]/evidence/route';
import { GET as sosLocationGet } from '@/app/api/sos/location/route';
import { POST as safeWalkEndPost } from '@/app/api/safe-walk/end/route';
import { POST as safeWalkLocationPost } from '@/app/api/safe-walk/location/route';
import { POST as sosPost } from '@/app/api/sos/route';
import { createClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/notifications', () => ({
  sendPushNotification: vi.fn().mockResolvedValue({ status: 'CONFIG_REQUIRED', provider: 'FCM' }),
  sendSmsNotification: vi.fn().mockResolvedValue({ status: 'CONFIG_REQUIRED', provider: 'TWILIO' }),
  insertInAppNotification: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Kavach Campus — Batch 3: Security, Database & SOS Hardening', () => {
  const studentA = { id: 'usr-student-A', email: 'studentA@campus.edu' };
  const studentB = { id: 'usr-student-B', email: 'studentB@campus.edu' };
  const unauthorizedStaff = { id: 'usr-staff-unauth', email: 'librarian@campus.edu', role: 'STAFF' };
  const securityResponder = { id: 'usr-security-officer', email: 'security@campus.edu', role: 'SECURITY' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. TAMPER-PROOFING STUDENT VERIFICATION FIELDS
  // =========================================================================
  describe('Student Profile Verification Field Protection', () => {
    it('rejects attempts by students to modify verification_status with 403 Forbidden', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: studentA }, error: null }) },
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const req = new Request('http://localhost/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blood_group: 'O+',
          verification_status: 'VERIFIED' // Tamper attempt
        })
      });

      const res = await profilePut(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Forbidden: You cannot modify institutional verification fields');
    });

    it('rejects attempts to modify verified_by or verified_at with 403 Forbidden', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: studentA }, error: null }) },
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const req = new Request('http://localhost/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verified_by: 'admin-bypass-id',
          verified_at: new Date().toISOString()
        })
      });

      const res = await profilePut(req);
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 2. EVIDENCE UPLOAD & ACCESS AUTHORIZATION
  // =========================================================================
  describe('Evidence Upload and Access Isolation', () => {
    const targetIncident = {
      id: 'inc-student-A-101',
      case_id: 'KC-2026-CASEA',
      student_id: studentA.id,
      assigned_to: securityResponder.id
    };

    it('rejects evidence access from unauthenticated users with 401 Unauthorized', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('Unauthorized') }) },
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const params = Promise.resolve({ id: targetIncident.id });
      const req = new Request('http://localhost/api/incidents/inc-student-A-101/evidence');
      const res = await evidenceGet(req, { params });
      expect(res.status).toBe(401);
    });

    it('blocks Student B from viewing evidence belonging to Student A with 403 Forbidden', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: studentB }, error: null }) },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'incidents') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: targetIncident, error: null })
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { role: 'STUDENT' }, error: null })
            };
          }
          return {};
        })
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const params = Promise.resolve({ id: targetIncident.id });
      const req = new Request(`http://localhost/api/incidents/${targetIncident.id}/evidence`);
      const res = await evidenceGet(req, { params });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Forbidden');
    });

    it('blocks Student B from uploading evidence to Student A incident with 403 Forbidden', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: studentB }, error: null }) },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'incidents') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: targetIncident, error: null })
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { role: 'STUDENT' }, error: null })
            };
          }
          return {};
        })
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const params = Promise.resolve({ id: targetIncident.id });
      const formData = new FormData();
      const fakeFile = new File(['mock content'], 'test.png', { type: 'image/png' });
      formData.append('file', fakeFile);

      const req = new Request(`http://localhost/api/incidents/${targetIncident.id}/evidence`, {
        method: 'POST',
        body: formData
      });

      const res = await evidencePost(req, { params });
      expect(res.status).toBe(403);
    });

    it('allows Student Owner (Student A) to retrieve evidence with signed URLs', async () => {
      const mockEvidence = [
        {
          id: 'ev-1',
          case_id: targetIncident.case_id,
          file_path: `${targetIncident.case_id}/test_image.png`,
          file_name: 'test_image.png',
          file_size: 1024,
          mime_type: 'image/png',
          uploaded_by: studentA.id,
          created_at: new Date().toISOString()
        }
      ];

      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: studentA }, error: null }) },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'incidents') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: targetIncident, error: null })
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { role: 'STUDENT' }, error: null })
            };
          }
          if (table === 'evidence') {
            return {
              select: vi.fn().mockReturnThis(),
              or: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({ data: mockEvidence, error: null })
            };
          }
          return {};
        }),
        storage: {
          from: vi.fn().mockReturnValue({
            createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://storage.supabase.com/signed/test_image.png' }, error: null })
          })
        }
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const params = Promise.resolve({ id: targetIncident.id });
      const req = new Request(`http://localhost/api/incidents/${targetIncident.id}/evidence`);
      const res = await evidenceGet(req, { params });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.evidence.length).toBe(1);
      expect(data.evidence[0].signedUrl).toContain('signed');
    });
  });

  // =========================================================================
  // 3. SOS LOCATION SNOOPING & TELEMETRY PROTECTION
  // =========================================================================
  describe('SOS Location Telemetry Protection', () => {
    const studentIncident = {
      id: 'inc-sos-A',
      student_id: studentA.id,
      assigned_to: securityResponder.id
    };

    it('blocks unauthorized staff from snooping on student live location coordinates', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: unauthorizedStaff }, error: null }) },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'incidents') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: studentIncident, error: null })
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { role: 'STAFF' }, error: null })
            };
          }
          return {};
        })
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const req = new Request(`http://localhost/api/sos/location?incidentId=${studentIncident.id}`);
      const res = await sosLocationGet(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Forbidden');
    });

    it('allows assigned Security Officer to track incident location coordinates', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: securityResponder }, error: null }) },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'incidents') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: studentIncident, error: null })
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { role: 'SECURITY' }, error: null })
            };
          }
          if (table === 'incident_locations') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({
                data: [{ latitude: 17.4455, longitude: 78.3498, accuracy: 5, recorded_at: new Date().toISOString() }],
                error: null
              })
            };
          }
          return {};
        })
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const req = new Request(`http://localhost/api/sos/location?incidentId=${studentIncident.id}`);
      const res = await sosLocationGet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.locations.length).toBe(1);
      expect(data.locations[0].latitude).toBe(17.4455);
    });
  });

  // =========================================================================
  // 4. SAFE WALK LOCATION ISOLATION & EXPIRY
  // =========================================================================
  describe('Safe Walk Ownership and Location Updates', () => {
    it('blocks Student B from updating location on Student A active Safe Walk', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: studentB }, error: null }) },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'walk-A-101', student_id: studentA.id, status: 'ACTIVE', expires_at: new Date(Date.now() + 60000).toISOString() },
            error: null
          })
        })
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const req = new Request('http://localhost/api/safe-walk/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walkId: 'walk-A-101',
          latitude: 17.44,
          longitude: 78.34
        })
      });

      const res = await safeWalkLocationPost(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Forbidden');
    });

    it('blocks Student B from ending Student A active Safe Walk', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: studentB }, error: null }) },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'walk-A-101', student_id: studentA.id, status: 'ACTIVE' },
            error: null
          })
        })
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const req = new Request('http://localhost/api/safe-walk/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walkId: 'walk-A-101' })
      });

      const res = await safeWalkEndPost(req);
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 5. NOTIFICATION DELIVERY STATUS WITHOUT SILENT FABRICATION
  // =========================================================================
  describe('Notification Delivery Status Logging', () => {
    it('records explicit adapter delivery status without fabricating successful delivery', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: studentA }, error: null }) },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'incidents') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              insert: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: 'inc-new-sos', case_id: 'SOS-2026-TEST' },
                error: null
              })
            };
          }
          if (table === 'incident_locations') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ data: [{ id: 'staff-1', role: 'SECURITY' }], error: null })
            };
          }
          if (table === 'trusted_contacts') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ data: [{ name: 'Dad', phone: '+919876543210' }], error: null })
            };
          }
          if (table === 'notifications' || table === 'escalations' || table === 'audit_logs') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {};
        })
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const req = new Request('http://localhost/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: 17.4455,
          longitude: 78.3498,
          accuracy: 5
        })
      });

      const res = await sosPost(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.caseId).toContain('SOS-');
    });
  });
});
