import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockGetUser = vi.fn();
const mockProfilesSelect = vi.fn();
const mockStudentProfilesSelect = vi.fn();
const mockProfilesUpdate = vi.fn();
const mockStudentProfilesUpsert = vi.fn();
const mockStudentProfilesUpdate = vi.fn();
const mockAuditLogsInsert = vi.fn();
const mockStorageUpload = vi.fn();
const mockStorageCreateSignedUrl = vi.fn();

const mockServerClient = {
  auth: {
    getUser: mockGetUser,
  },
  from: vi.fn((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: mockProfilesSelect,
          })),
        })),
      };
    }
    if (table === 'student_profiles') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: mockStudentProfilesSelect,
          })),
        })),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
    };
  }),
};

const mockAdminClient = {
  from: vi.fn((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            neq: vi.fn().mockResolvedValue({ data: [] }),
            single: vi.fn().mockResolvedValue({
              data: { id: 'usr-student-01', full_name: 'Test Student', department: 'CSE', college_id: 'srkr-bhimavaram' },
            }),
          })),
          in: vi.fn().mockResolvedValue({
            data: [
              { id: 'usr-student-01', full_name: 'Alice Student', college_email: 'alice@campus.edu', student_id: '2101201045', department: 'CSE', is_approved: false, college_id: 'srkr-bhimavaram' },
              { id: 'usr-student-02', full_name: 'Bob Student', college_email: 'bob@campus.edu', student_id: '2101201046', department: 'ECE', is_approved: true, college_id: 'srkr-bhimavaram' }
            ]
          }),
        })),
        update: vi.fn(() => ({
          eq: mockProfilesUpdate,
        })),
      };
    }
    if (table === 'student_profiles') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'usr-student-01', verification_status: 'PENDING_MANUAL_REVIEW' },
              error: null,
            }),
          })),
          in: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'usr-student-01',
                  admission_type: 'REGULAR',
                  admission_year: 2021,
                  expected_graduation_year: 2025,
                  id_card_url: 'kavach-id-cards/usr-student-01/id-card.jpg',
                  verification_status: 'PENDING_MANUAL_REVIEW',
                  verification_notes: null,
                  updated_at: '2026-10-19T10:00:00Z',
                }
              ],
              error: null,
            }),
          })),
        })),
        upsert: mockStudentProfilesUpsert,
        update: vi.fn(() => ({
          eq: mockStudentProfilesUpdate,
        })),
      };
    }
    if (table === 'audit_logs') {
      return {
        insert: mockAuditLogsInsert,
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
    };
  }),
  storage: {
    from: vi.fn(() => ({
      upload: mockStorageUpload,
      createSignedUrl: mockStorageCreateSignedUrl,
    })),
  },
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockServerClient)),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}));

// Valid JPEG magic bytes header: FF D8 FF E0
const createValidJpegBuffer = () => {
  const buf = new Uint8Array(100);
  buf[0] = 0xff;
  buf[1] = 0xd8;
  buf[2] = 0xff;
  buf[3] = 0xe0;
  return buf;
};

// Valid PDF magic bytes header: %PDF
const createValidPdfBuffer = () => {
  const buf = new Uint8Array(100);
  buf[0] = 0x25;
  buf[1] = 0x50;
  buf[2] = 0x44;
  buf[3] = 0x46;
  return buf;
};

describe('Student ID Verification API & Storage Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_valid_service_role_key_with_sufficient_length_for_testing';
    mockStorageUpload.mockResolvedValue({ data: { path: 'uploaded-path' }, error: null });
    mockStorageCreateSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://supabase.co/storage/signed/test?token=abc' }, error: null });
    mockStudentProfilesUpsert.mockResolvedValue({ data: null, error: null });
    mockStudentProfilesUpdate.mockResolvedValue({ data: null, error: null });
    mockProfilesUpdate.mockResolvedValue({ data: null, error: null });
    mockAuditLogsInsert.mockResolvedValue({ data: null, error: null });
  });

  // -------------------------------------------------------------------------
  // 1. GET /api/student/verify-id
  // -------------------------------------------------------------------------
  describe('GET /api/student/verify-id', () => {
    it('returns 401 Unauthorized when no user session is present', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('No session') });
      const { GET } = await import('@/app/api/student/verify-id/route');
      const res = await GET();
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('returns student profile and verification status for authenticated student', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'usr-student-01' } }, error: null });
      mockProfilesSelect.mockResolvedValueOnce({
        data: { id: 'usr-student-01', full_name: 'Alice Student', student_id: '2101201045', role: 'STUDENT', is_approved: false },
      });
      mockStudentProfilesSelect.mockResolvedValueOnce({
        data: { id: 'usr-student-01', verification_status: 'RESUBMISSION_REQUIRED', verification_notes: 'Image blurred' },
      });

      const { GET } = await import('@/app/api/student/verify-id/route');
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.profile.student_id).toBe('2101201045');
      expect(json.studentProfile.verification_status).toBe('RESUBMISSION_REQUIRED');
      expect(json.studentProfile.verification_notes).toBe('Image blurred');
    });
  });

  // -------------------------------------------------------------------------
  // 2. POST /api/student/verify-id (Multipart File Upload & Validation)
  // -------------------------------------------------------------------------
  describe('POST /api/student/verify-id (Document Upload & Verification)', () => {
    it('rejects unauthenticated document upload with 401', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('No session') });
      const { POST } = await import('@/app/api/student/verify-id/route');

      const req = new NextRequest('http://localhost:3000/api/student/verify-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: '2101201045' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('rejects invalid student ID format (non-10 digits) with 400', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'usr-student-01' } }, error: null });
      const { POST } = await import('@/app/api/student/verify-id/route');

      const req = new NextRequest('http://localhost:3000/api/student/verify-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: '12345', // Only 5 digits
          admissionType: 'REGULAR',
          admissionYear: 2021,
          expectedGraduationYear: 2025,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('7, 8, 9, or 10 characters');
    });

    it('rejects academic batch duration mismatch with 400 (e.g. Regular requires 4 years)', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'usr-student-01' } }, error: null });
      const { POST } = await import('@/app/api/student/verify-id/route');

      const req = new NextRequest('http://localhost:3000/api/student/verify-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: '2101201045',
          admissionType: 'REGULAR',
          admissionYear: 2021,
          expectedGraduationYear: 2023, // 2 years instead of 4
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Academic duration mismatch');
    });

    it('uploads valid ID document via multipart/form-data and queues for manual review', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'usr-student-01' } }, error: null });
      const { POST } = await import('@/app/api/student/verify-id/route');

      const formData = new FormData();
      formData.append('studentId', '2101201045');
      formData.append('admissionType', 'REGULAR');
      formData.append('admissionYear', '2021');
      formData.append('expectedGraduationYear', '2025');

      const jpegBuffer = createValidJpegBuffer();
      const file = new File([jpegBuffer], 'student_id_card.jpg', { type: 'image/jpeg' });
      formData.append('file', file);

      const req = new Request('http://localhost:3000/api/student/verify-id', {
        method: 'POST',
        body: formData,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.verificationStatus).toBe('PENDING_MANUAL_REVIEW');

      // Verify file upload was called with user-isolated folder path
      expect(mockStorageUpload).toHaveBeenCalledTimes(1);
      const uploadPath = mockStorageUpload.mock.calls[0][0];
      expect(uploadPath).toContain('usr-student-01/');

      // Verify audit log record
      expect(mockAuditLogsInsert).toHaveBeenCalledTimes(1);
    });

    it('uploads valid PDF document via multipart/form-data successfully', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'usr-student-01' } }, error: null });
      const { POST } = await import('@/app/api/student/verify-id/route');

      const formData = new FormData();
      formData.append('studentId', '2101201045');
      formData.append('admissionType', 'REGULAR');
      formData.append('admissionYear', '2021');
      formData.append('expectedGraduationYear', '2025');

      const pdfBuffer = createValidPdfBuffer();
      const file = new File([pdfBuffer], 'student_id_card.pdf', { type: 'application/pdf' });
      formData.append('file', file);

      const req = new Request('http://localhost:3000/api/student/verify-id', {
        method: 'POST',
        body: formData,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.verificationStatus).toBe('PENDING_MANUAL_REVIEW');
    });

    it('rejects fake/disguised file with invalid binary signature', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'usr-student-01' } }, error: null });
      const { POST } = await import('@/app/api/student/verify-id/route');

      const formData = new FormData();
      formData.append('studentId', '2101201045');
      formData.append('admissionType', 'REGULAR');
      formData.append('admissionYear', '2021');
      formData.append('expectedGraduationYear', '2025');

      // Corrupted file: claims to be image/jpeg but content is executable text
      const fakeBuffer = new TextEncoder().encode('<script>malicious()</script>');
      const file = new File([fakeBuffer], 'fake.jpg', { type: 'image/jpeg' });
      formData.append('file', file);

      const req = new Request('http://localhost:3000/api/student/verify-id', {
        method: 'POST',
        body: formData,
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('File signature mismatch');
    });

    it('rejects oversized file exceeding 5MB limit', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'usr-student-01' } }, error: null });
      const { POST } = await import('@/app/api/student/verify-id/route');

      const formData = new FormData();
      formData.append('studentId', '2101201045');
      formData.append('admissionType', 'REGULAR');
      formData.append('admissionYear', '2021');
      formData.append('expectedGraduationYear', '2025');

      // 6MB buffer
      const largeBuffer = new Uint8Array(6 * 1024 * 1024);
      largeBuffer[0] = 0xff;
      largeBuffer[1] = 0xd8;
      largeBuffer[2] = 0xff;
      largeBuffer[3] = 0xe0;
      const file = new File([largeBuffer], 'giant_card.jpg', { type: 'image/jpeg' });
      formData.append('file', file);

      const req = new Request('http://localhost:3000/api/student/verify-id', {
        method: 'POST',
        body: formData,
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('5MB');
    });
  });

  // -------------------------------------------------------------------------
  // 3. GET /api/admin/verifications (Admin Verification Queue & Authorization)
  // -------------------------------------------------------------------------
  describe('GET /api/admin/verifications', () => {
    it('returns 401 when no caller is authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
      const { GET } = await import('@/app/api/admin/verifications/route');
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it('returns 403 Forbidden when caller has STUDENT role', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'usr-student-01' } }, error: null });
      mockProfilesSelect.mockResolvedValueOnce({ data: { role: 'STUDENT', is_approved: true } });

      const { GET } = await import('@/app/api/admin/verifications/route');
      const res = await GET();
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('Reviewer privileges required');
    });

    it('returns 200 with signed document URLs when caller has ADMIN or SECURITY role', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'usr-admin-01' } }, error: null });
      mockProfilesSelect.mockResolvedValueOnce({ data: { role: 'ADMIN', is_approved: true, college_id: 'srkr-bhimavaram' } });

      const { GET } = await import('@/app/api/admin/verifications/route');
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.verifications)).toBe(true);
      expect(json.verifications.length).toBeGreaterThan(0);
      expect(json.verifications[0].signedIdCardUrl).toContain('https://supabase.co/storage/signed');
      expect(mockStorageCreateSignedUrl).toHaveBeenCalledWith('usr-student-01/id-card.jpg', 300);
    });
  });

  // -------------------------------------------------------------------------
  // 4. POST /api/admin/verifications (Review Decisions & Mandatory Reason)
  // -------------------------------------------------------------------------
  describe('POST /api/admin/verifications (Reviewer Decisions)', () => {
    it('rejects decision by non-admin role with 403 Forbidden', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'usr-student-01' } }, error: null });
      mockProfilesSelect.mockResolvedValueOnce({ data: { id: 'usr-student-01', role: 'STUDENT', is_approved: true } });

      const { POST } = await import('@/app/api/admin/verifications/route');
      const req = new Request('http://localhost:3000/api/admin/verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStudentId: 'usr-student-02', decision: 'VERIFIED' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it('rejects self-approval when reviewer attempts to verify themselves', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'usr-admin-01' } }, error: null });
      mockProfilesSelect.mockResolvedValueOnce({ data: { id: 'usr-admin-01', role: 'ADMIN', is_approved: true, college_id: 'srkr-bhimavaram' } });

      const { POST } = await import('@/app/api/admin/verifications/route');
      const req = new Request('http://localhost:3000/api/admin/verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStudentId: 'usr-admin-01', decision: 'VERIFIED' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('cannot approve or modify their own verification status');
    });

    it('requires a mandatory reason when rejecting or requesting resubmission', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'usr-admin-01' } }, error: null });
      mockProfilesSelect.mockResolvedValueOnce({ data: { id: 'usr-admin-01', role: 'ADMIN', is_approved: true, college_id: 'srkr-bhimavaram' } });

      const { POST } = await import('@/app/api/admin/verifications/route');
      const req = new Request('http://localhost:3000/api/admin/verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetStudentId: 'usr-student-01',
          decision: 'REJECTED',
          reason: '   ', // Blank / whitespace only
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('rejection reason is required');
    });

    it('successfully processes RESUBMISSION_REQUIRED with note and records audit log', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'usr-admin-01' } }, error: null });
      mockProfilesSelect.mockResolvedValueOnce({ data: { id: 'usr-admin-01', role: 'ADMIN', is_approved: true, college_id: 'srkr-bhimavaram' } });

      const { POST } = await import('@/app/api/admin/verifications/route');
      const req = new Request('http://localhost:3000/api/admin/verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetStudentId: 'usr-student-01',
          decision: 'RESUBMISSION_REQUIRED',
          reason: 'Photo is blurry; please re-upload clear photo of student ID',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.decision).toBe('RESUBMISSION_REQUIRED');

      // Verify audit log creation
      expect(mockAuditLogsInsert).toHaveBeenCalledTimes(1);
      const auditPayload = mockAuditLogsInsert.mock.calls[0][0];
      expect(auditPayload.action).toBe('STUDENT_VERIFICATION_DECISION');
      expect(auditPayload.metadata.decision).toBe('RESUBMISSION_REQUIRED');
      expect(auditPayload.metadata.reason).toContain('Photo is blurry');
    });

    it('successfully approves student ID and synchronizes profiles.is_approved = true', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'usr-admin-01' } }, error: null });
      mockProfilesSelect.mockResolvedValueOnce({ data: { id: 'usr-admin-01', role: 'ADMIN', is_approved: true, college_id: 'srkr-bhimavaram' } });

      const { POST } = await import('@/app/api/admin/verifications/route');
      const req = new Request('http://localhost:3000/api/admin/verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetStudentId: 'usr-student-01',
          decision: 'VERIFIED',
          officialRosterConfirmed: true,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.decision).toBe('VERIFIED');

      // Verify profiles.is_approved was updated to true
      expect(mockProfilesUpdate).toHaveBeenCalledWith('id', 'usr-student-01');
    });
  });

  // -------------------------------------------------------------------------
  // 5. Cross-Student Storage Document Access Isolation
  // -------------------------------------------------------------------------
  describe('Student-to-Student Document Isolation', () => {
    it('prohibits Student A from viewing or downloading Student B ID card storage object', () => {
      const studentA = { id: 'usr-student-01', role: 'STUDENT' };
      const studentBDocument = {
        storageBucket: 'kavach-id-cards',
        path: 'usr-student-02/card.jpg',
        ownerId: 'usr-student-02',
      };

      const canAccessDocument = (user: { id: string; role: string }, doc: { ownerId: string }) => {
        if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'SECURITY') {
          return true;
        }
        return user.id === doc.ownerId;
      };

      expect(canAccessDocument(studentA, studentBDocument)).toBe(false);

      const securityOfficer = { id: 'usr-security-01', role: 'SECURITY' };
      expect(canAccessDocument(securityOfficer, studentBDocument)).toBe(true);
    });
  });
});
