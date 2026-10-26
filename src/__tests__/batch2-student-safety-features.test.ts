import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as profileGet, PUT as profilePut } from '@/app/api/student/profile/route';
import { GET as contactsGet, POST as contactsPost, DELETE as contactsDelete } from '@/app/api/student/trusted-contacts/route';
import { GET as bloodSearchGet } from '@/app/api/student/blood-search/route';
import { POST as incidentPost } from '@/app/api/incidents/route';
import { GET as incidentByIdGet } from '@/app/api/incidents/[id]/route';
import { createClient } from '@/lib/supabase/server';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/ai', () => ({
  analyzeIncident: vi.fn().mockResolvedValue({
    category: 'CAMPUS_SAFETY',
    severity: 'L2',
    urgency: 'MEDIUM',
    confidence: 0.9,
    summary: 'Mocked AI Incident Analysis'
  }),
}));

describe('Batch 2: Student Safety Features & Dynamic APIs', () => {
  const mockUser = { id: 'usr-student-123', email: 'student@campus.edu' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. STUDENT PROFILE API (GET & PUT)
  // =========================================================================
  describe('Student Profile API (/api/student/profile)', () => {
    it('returns 401 if user is unauthenticated on GET', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('No session') }) },
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const res = await profileGet();
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 401 if user is unauthenticated on PUT', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('No session') }) },
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const req = new Request('http://localhost/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blood_group: 'O+' })
      });

      const res = await profilePut(req);
      expect(res.status).toBe(401);
    });

    it('successfully fetches merged student profile data on GET', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: mockUser.id, full_name: 'Test Student', college_email: mockUser.email, role: 'STUDENT', phone: '+919999999999' },
                error: null
              })
            };
          }
          if (table === 'student_profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: mockUser.id, blood_group: 'B+', medical_conditions: 'Asthma', hostel_room: 'Block-A-102', verification_status: 'VERIFIED' },
                error: null
              })
            };
          }
          return {};
        })
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const res = await profileGet();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.profile.full_name).toBe('Test Student');
      expect(data.studentProfile.blood_group).toBe('B+');
      expect(data.studentProfile.verification_status).toBe('VERIFIED');
    });

    it('updates permitted student profile fields', async () => {
      const updatePayload = {
        blood_group: 'AB+',
        medical_conditions: 'None',
        hostel_room: 'Block-C-305',
        phone: '+91 88888 77777'
      };

      const mockProfileUpdate = vi.fn().mockReturnThis();
      const mockStudentProfileUpdate = vi.fn().mockReturnThis();

      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              update: mockProfileUpdate,
              eq: vi.fn().mockResolvedValue({ error: null })
            };
          }
          if (table === 'student_profiles') {
            return {
              update: mockStudentProfileUpdate,
              eq: vi.fn().mockResolvedValue({ error: null })
            };
          }
          return {};
        })
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const req = new Request('http://localhost/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      const res = await profilePut(req);
      expect(res.status).toBe(200);

      expect(mockStudentProfileUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ blood_group: 'AB+', hostel_room: 'Block-C-305' })
      );
    });
  });

  // =========================================================================
  // 2. TRUSTED CONTACTS API (GET, POST, DELETE)
  // =========================================================================
  describe('Trusted Contacts API (/api/student/trusted-contacts)', () => {
    it('returns 401 if unauthenticated on GET, POST, or DELETE', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('Unauthorized') }) },
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const resGet = await contactsGet();
      expect(resGet.status).toBe(401);

      const resPost = await contactsPost(new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) }));
      expect(resPost.status).toBe(401);

      const resDelete = await contactsDelete(new Request('http://localhost?id=123', { method: 'DELETE' }));
      expect(resDelete.status).toBe(401);
    });

    it('rejects contact creation when name or phone is missing or invalid', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      // Missing name
      const req1 = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ phone: '+919999999999' }) });
      const res1 = await contactsPost(req1);
      expect(res1.status).toBe(400);

      // Missing phone
      const req2 = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ name: 'Mom' }) });
      const res2 = await contactsPost(req2);
      expect(res2.status).toBe(400);

      // Invalid phone format
      const req3 = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ name: 'Mom', phone: '123' }) });
      const res3 = await contactsPost(req3);
      expect(res3.status).toBe(400);
      expect((await res3.json()).error).toContain('Invalid phone number format');
    });

    it('successfully inserts new contact bound to student_id', async () => {
      const mockInsert = vi.fn().mockReturnThis();
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
        from: vi.fn().mockReturnValue({
          insert: mockInsert,
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'cnt-1', student_id: mockUser.id, name: 'Mom', phone: '+91 98765 43210', relationship: 'Parent' },
            error: null
          })
        })
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const req = new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Mom', phone: '+91 98765 43210', relationship: 'Parent' })
      });

      const res = await contactsPost(req);
      expect(res.status).toBe(201);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          student_id: mockUser.id,
          name: 'Mom',
          phone: '+91 98765 43210',
          relationship: 'Parent'
        })
      );
    });

    it('deletes contact scoped strictly to student_id', async () => {
      const mockDelete = vi.fn().mockReturnThis();
      const mockEqId = vi.fn().mockReturnThis();
      const mockEqStudent = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
        from: vi.fn().mockReturnValue({
          delete: mockDelete,
          eq: mockEqId.mockImplementation((col: string) => {
            if (col === 'student_id') return mockEqStudent;
            return { eq: mockEqStudent };
          })
        })
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const req = new Request('http://localhost/api/student/trusted-contacts?id=cnt-1', {
        method: 'DELETE'
      });

      const res = await contactsDelete(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });

  // =========================================================================
  // 3. BLOOD GROUP FINDER API (/api/student/blood-search)
  // =========================================================================
  describe('Blood Group Finder API (/api/student/blood-search)', () => {
    it('rejects missing or invalid blood group parameters', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      // Missing
      const req1 = new Request('http://localhost/api/student/blood-search');
      const res1 = await bloodSearchGet(req1);
      expect(res1.status).toBe(400);

      // Invalid
      const req2 = new Request('http://localhost/api/student/blood-search?bloodGroup=XYZ');
      const res2 = await bloodSearchGet(req2);
      expect(res2.status).toBe(400);
      expect((await res2.json()).error).toContain('Invalid blood group');
    });

    it('returns privacy-masked donor list for valid blood group query', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'student_profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({
                data: [
                  { id: 'usr-donor-1', blood_group: 'O+', course: 'Computer Science', hostel_room: 'B-201', verification_status: 'VERIFIED' },
                  { id: 'usr-donor-2', blood_group: 'O+', course: 'Electronics', hostel_room: 'A-104', verification_status: 'PENDING_UPLOAD' }
                ],
                error: null
              })
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockResolvedValue({
                data: [
                  { id: 'usr-donor-1', full_name: 'Aditya Sharma', department: 'Computer Science', year: '3rd Year', phone: '+919876543210' },
                  { id: 'usr-donor-2', full_name: 'Priya Verma', department: 'Electronics', year: '2nd Year', phone: '+919876543211' }
                ],
                error: null
              })
            };
          }
          return {};
        })
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const req = new Request('http://localhost/api/student/blood-search?bloodGroup=O+');
      const res = await bloodSearchGet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.count).toBe(2);
      // Verify name masking: "Aditya Sharma" -> "Aditya S."
      expect(data.donors[0].name).toBe('Aditya S.');
      expect(data.donors[0].bloodGroup).toBe('O+');
      expect(data.donors[0].isVerified).toBe(true);
    });

    it('excludes cross-tenant donors whose profile is not accessible under college isolation', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'student_profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({
                data: [
                  { id: 'usr-donor-srkr', blood_group: 'B+', course: 'Computer Science', hostel_room: 'B-201', verification_status: 'VERIFIED' },
                  { id: 'usr-donor-vishnu', blood_group: 'B+', course: 'Civil', hostel_room: 'V-101', verification_status: 'VERIFIED' }
                ],
                error: null
              })
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockResolvedValue({
                // Only SRKR student profile is returned by RLS query
                data: [
                  { id: 'usr-donor-srkr', full_name: 'Suresh Kumar', department: 'Computer Science', year: '4th Year', phone: '+919876543220' }
                ],
                error: null
              })
            };
          }
          return {};
        })
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const req = new Request('http://localhost/api/student/blood-search?bloodGroup=B+');
      const res = await bloodSearchGet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.count).toBe(1);
      expect(data.donors[0].id).toBe('usr-donor-srkr');
      expect(data.donors[0].name).toBe('Suresh K.');
    });
  });

  // =========================================================================
  // 4. ANONYMOUS INCIDENT REPORTING & STUDENT PRIVACY MASKING
  // =========================================================================
  describe('Anonymous Incident Reporting & Privacy Masking', () => {
    it('persists is_anonymous: true during incident creation', async () => {
      const mockInsert = vi.fn().mockReturnThis();
      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { role: 'STUDENT', is_approved: true, college_id: 'srkr-bhimavaram' }, error: null }),
              maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'STUDENT', is_approved: true, college_id: 'srkr-bhimavaram' }, error: null })
            };
          }
          if (table === 'student_profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { verification_status: 'VERIFIED' }, error: null }),
              maybeSingle: vi.fn().mockResolvedValue({ data: { verification_status: 'VERIFIED' }, error: null })
            };
          }
          if (table === 'incidents') {
            return {
              insert: mockInsert,
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: 'inc-anon-1', case_id: 'KC-2026-ANON1', is_anonymous: true, student_id: mockUser.id },
                error: null
              })
            };
          }
          if (table === 'ai_analyses') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null })
            };
          }
          return {};
        })
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const req = new Request('http://localhost/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Spotted suspicious activity near east boundary gate.',
          locationLat: 17.4455,
          locationLng: 78.3498,
          isAnonymous: true
        })
      });

      const res = await incidentPost(req);
      expect(res.status).toBe(201);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          is_anonymous: true,
          student_id: mockUser.id
        })
      );
    });

    it('masks student identity to Anonymous Student when viewed by ordinary staff for anonymous reports', async () => {
      const staffUser = { id: 'usr-staff-77', role: 'SECURITY' };
      const anonymousIncident = {
        id: 'inc-anon-1',
        case_id: 'KC-2026-ANON1',
        student_id: 'usr-victim-student',
        category: 'HARASSMENT',
        description: 'Anonymous harassment complaint',
        is_anonymous: true,
        assigned_to: staffUser.id,
        latitude: 17.44,
        longitude: 78.34
      };

      const mockSupabase = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: staffUser }, error: null }) },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'incidents') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: anonymousIncident, error: null })
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                if (val === staffUser.id) {
                  return {
                    single: vi.fn().mockResolvedValue({ data: { id: staffUser.id, role: 'SECURITY' }, error: null })
                  };
                }
                // Victim student profile query
                return {
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'usr-victim-student',
                      full_name: 'Confidential Victim',
                      college_email: 'victim@campus.edu',
                      student_id: '1905102033',
                      phone: '+919988776655'
                    },
                    error: null
                  })
                };
              })
            };
          }
          if (table === 'student_profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { verification_status: 'VERIFIED' }, error: null })
            };
          }
          if (table === 'evidence') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({ data: [], error: null })
            };
          }
          return {};
        })
      };
      (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);

      const params = Promise.resolve({ id: 'inc-anon-1' });
      const req = new Request('http://localhost/api/incidents/inc-anon-1');

      const res = await incidentByIdGet(req, { params });
      expect(res.status).toBe(200);
      const data = await res.json();

      // Student summary MUST be masked for security staff because is_anonymous is true
      expect(data.studentSummary.name).toBe('Anonymous Student');
      expect(data.studentSummary.email).toBe('[PROTECTED ANONYMOUS REPORT]');
      expect(data.studentSummary.studentId).toBe('ANONYMOUS');
      expect(data.studentSummary.phone).toBe('[PROTECTED]');
      expect(data.incident.student_id).toBeNull();
    });
  });
});
