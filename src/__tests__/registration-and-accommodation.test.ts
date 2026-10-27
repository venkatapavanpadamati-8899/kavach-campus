import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as registerRoute } from '@/app/api/auth/register/route';
import { GET as getProfileRoute, PUT as putProfileRoute } from '@/app/api/student/profile/route';
import { POST as verifyIdRoute } from '@/app/api/student/verify-id/route';
import { getCollegeById, resolveCollegeIdFromEmail } from '@/lib/colleges';
import { validateStudentId, validateAcademicBatch, validateIdCardFile, validateFileSignature } from '@/lib/verification/id-card';

// Mock notification services
vi.mock('@/lib/notifications', () => ({
  sendEmailNotification: vi.fn().mockResolvedValue({ success: true, messageId: 'msg-test-123' }),
  isRealDeliveryEnabled: vi.fn().mockReturnValue(false),
  isRealEmailDeliveryEnabled: vi.fn().mockReturnValue(false),
  isSmtpConfigured: vi.fn().mockReturnValue(true),
  insertInAppNotification: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock Supabase Server Client
const mockGetUser = vi.fn();
const mockServerFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockServerFrom,
  })),
}));

// Mock Supabase Admin Client
const mockAdminFrom = vi.fn();
const mockAdminCreateUser = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
    auth: {
      admin: {
        createUser: mockAdminCreateUser,
      },
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://test-signed-url' }, error: null }),
      })),
    },
  })),
}));

describe('Kavach Campus — Registration, ID Card Verification & Accommodation Audit', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-that-is-long-enough-32-chars',
      ENABLE_REAL_EMAIL_DELIVERY: 'false',
      ENABLE_REAL_NOTIFICATIONS: 'false',
    };

    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          neq: vi.fn().mockResolvedValue({ data: [] }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
  });

  // =========================================================================
  // 1. REGISTRATION FORM: SINGLE EMAIL & STUDENT REGISTRATION NUMBER
  // =========================================================================
  describe('Registration Form: Single Email & Student Registration Number', () => {
    it('accepts registration with institutional email only (no personal email required)', async () => {
      const payload = {
        name: 'Suresh Varma',
        email: '2101201045@srkr.edu.in',
        phone: '9876543210',
        password: 'SecurePassword123!',
        role: 'STUDENT',
        registrationNumber: '2101201045',
        department: 'CSE',
      };

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await registerRoute(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.message).toMatch(/OTP/i);
      expect(json.campusVerificationRequired).toBe(false);
    });

    it('accepts registration with personal email only (Gmail/Yahoo) without guessing college', async () => {
      const payload = {
        name: 'Ravi Kumar',
        email: 'ravi.personal@gmail.com',
        phone: '9876543210',
        password: 'SecurePassword123!',
        role: 'STUDENT',
        registrationNumber: '2101201046',
        department: 'ECE',
      };

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await registerRoute(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.campusVerificationRequired).toBe(true);
    });

    it('rejects registration when email is missing', async () => {
      const payload = {
        name: 'Suresh Varma',
        email: '',
        phone: '9876543210',
        password: 'SecurePassword123!',
        role: 'STUDENT',
        registrationNumber: '2101201045',
        department: 'CSE',
      };

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await registerRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toMatch(/valid email address/i);
    });

    it('rejects registration when email format is invalid', async () => {
      const payload = {
        name: 'Suresh Varma',
        email: 'invalid-email-address',
        phone: '9876543210',
        password: 'SecurePassword123!',
        role: 'STUDENT',
        registrationNumber: '2101201045',
        department: 'CSE',
      };

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await registerRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toMatch(/valid email address/i);
    });

    it('rejects student registration when Student Registration Number is missing', async () => {
      const payload = {
        name: 'Suresh Varma',
        email: '2101201045@srkr.edu.in',
        phone: '9876543210',
        password: 'SecurePassword123!',
        role: 'STUDENT',
        registrationNumber: '',
        department: 'CSE',
      };

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await registerRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toMatch(/Student Registration Number/i);
    });

    it('rejects student registration when registration number is fewer than 7 characters', async () => {
      const payload = {
        name: 'Suresh Varma',
        email: '2101201045@srkr.edu.in',
        phone: '9876543210',
        password: 'SecurePassword123!',
        role: 'STUDENT',
        registrationNumber: '12345', // 5 characters (< 7)
        department: 'CSE',
      };

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await registerRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toMatch(/7, 8, 9, or 10 characters/i);
    });

    it('rejects student registration when registration number is more than 10 digits', async () => {
      const payload = {
        name: 'Suresh Varma',
        email: '2101201045@srkr.edu.in',
        phone: '9876543210',
        password: 'SecurePassword123!',
        role: 'STUDENT',
        registrationNumber: '12345678901', // 11 digits
        department: 'CSE',
      };

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await registerRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toMatch(/7, 8, 9, or 10 characters/i);
    });

    it('rejects student registration when registration number contains spaces or special characters', async () => {
      const payload = {
        name: 'Suresh Varma',
        email: '2101201045@srkr.edu.in',
        phone: '9876543210',
        password: 'SecurePassword123!',
        role: 'STUDENT',
        registrationNumber: '2101-20104', // Contains special character hyphen
        department: 'CSE',
      };

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await registerRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toMatch(/only letters and numbers/i);
    });

    it('preserves authorization roles independently from registration number', async () => {
      // Staff role uses role='STAFF' and employee ID as collegeId, not subject to 10-digit student rule
      const payload = {
        name: 'Dr. Sharma',
        email: 'faculty@srkr.edu.in',
        phone: '9876543210',
        password: 'SecurePassword123!',
        role: 'STAFF',
        collegeId: 'EMP-9021',
        department: 'CSE',
      };

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await registerRoute(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.message).toMatch(/OTP/i);
    });
  });

  // =========================================================================
  // 2. ACCOMMODATION STATUS: VALIDATION & PERSISTENCE
  // =========================================================================
  describe('Student Accommodation Status & Residential Details', () => {
    it('rejects invalid residence type with HTTP 400', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'usr-student-01', email: 'student@srkr.edu.in' } },
      });

      const req = new NextRequest('http://localhost:3000/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residenceType: 'INVALID_HOTEL_TYPE',
        }),
      });

      const res = await putProfileRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toMatch(/Invalid accommodation status/i);
    });

    it('successfully persists COLLEGE_HOSTEL details into student_residences and profile', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'usr-student-01', email: 'student@srkr.edu.in' } },
      });

      const mockUpsertResidences = vi.fn().mockResolvedValue({ error: null });

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'student_residences') {
          return { upsert: mockUpsertResidences };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { college_id: 'srkr-bhimavaram' } }),
                single: vi.fn().mockResolvedValue({ data: { college_id: 'srkr-bhimavaram' } }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
        if (table === 'student_profiles') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
        return { select: vi.fn() };
      });

      const req = new NextRequest('http://localhost:3000/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residenceType: 'COLLEGE_HOSTEL',
          hostelName: 'Kaveri Hostel Block A',
          roomNumber: '304',
          bloodGroup: 'B+',
        }),
      });

      const res = await putProfileRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(mockUpsertResidences).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'usr-student-01',
          residence_type: 'COLLEGE_HOSTEL',
          hostel_name: 'Kaveri Hostel Block A',
          room_number: '304',
        }),
        expect.anything()
      );
    });

    it('successfully persists PRIVATE_HOSTEL / PG details', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'usr-student-02', email: 'student@vishnu.edu.in' } },
      });

      const mockUpsertResidences = vi.fn().mockResolvedValue({ error: null });
      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'student_residences') {
          return { upsert: mockUpsertResidences };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { college_id: 'vishnu-bhimavaram' } }),
                single: vi.fn().mockResolvedValue({ data: { college_id: 'vishnu-bhimavaram' } }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
        if (table === 'student_profiles') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
        return { select: vi.fn() };
      });

      const req = new NextRequest('http://localhost:3000/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residenceType: 'PRIVATE_HOSTEL',
          pgName: 'Sri Sai Deluxe PG for Men',
          pgAddress: 'Main Road, Rayalam, Bhimavaram',
          guardianPhone: '9848022338',
        }),
      });

      const res = await putProfileRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(mockUpsertResidences).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'usr-student-02',
          residence_type: 'PRIVATE_HOSTEL',
          pg_name: 'Sri Sai Deluxe PG for Men',
          pg_address: 'Main Road, Rayalam, Bhimavaram',
          guardian_contact_phone: '9848022338',
        }),
        expect.anything()
      );
    });

    it('successfully persists DAY_SCHOLAR commuter status', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'usr-student-03', email: 'student@srkr.edu.in' } },
      });

      const mockUpsertResidences = vi.fn().mockResolvedValue({ error: null });
      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'student_residences') {
          return { upsert: mockUpsertResidences };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { college_id: 'srkr-bhimavaram' } }),
                single: vi.fn().mockResolvedValue({ data: { college_id: 'srkr-bhimavaram' } }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
        if (table === 'student_profiles') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
        return { select: vi.fn() };
      });

      const req = new NextRequest('http://localhost:3000/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residenceType: 'DAY_SCHOLAR',
        }),
      });

      const res = await putProfileRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(mockUpsertResidences).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'usr-student-03',
          residence_type: 'DAY_SCHOLAR',
        }),
        expect.anything()
      );
    });

    it('GET profile returns structured residence payload', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'usr-student-01', email: 'student@srkr.edu.in' } },
      });

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'usr-student-01',
                    full_name: 'Priya Sharma',
                    college_email: 'priya@srkr.edu.in',
                    student_id: '2101201088',
                    department: 'ECE',
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'student_profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    blood_group: 'O+',
                    course: 'B.Tech',
                    hostel_room: 'Kaveri Hostel Block B-201',
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'student_residences') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    residence_type: 'COLLEGE_HOSTEL',
                    hostel_name: 'Kaveri Hostel Block B',
                    room_number: '201',
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        return { select: vi.fn() };
      });

      const res = await getProfileRoute();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.residence.residence_type).toBe('COLLEGE_HOSTEL');
      expect(json.residence.hostel_name).toBe('Kaveri Hostel Block B');
      expect(json.residence.room_number).toBe('201');
    });
  });

  // =========================================================================
  // 3. ID CARD VERIFICATION & FRONTEND VALIDATION HELPERS
  // =========================================================================
  describe('ID Card Submission Logic & Pre-checks', () => {
    it('validates 7, 8, 9, or 10-character alphanumeric student registration number', () => {
      expect(validateStudentId('2101201045').valid).toBe(true);
      expect(validateStudentId('21B91A0501').valid).toBe(true);
      expect(validateStudentId('21CS1045').valid).toBe(true);
      expect(validateStudentId('21CS104').valid).toBe(true);
      expect(validateStudentId('987654321').valid).toBe(true);
      expect(validateStudentId('12345').valid).toBe(false);
      expect(validateStudentId('21012010450').valid).toBe(false);
      expect(validateStudentId('2101-20104').valid).toBe(false);
      expect(validateStudentId('').valid).toBe(false);
    });

    it('validates academic batch duration correctly (Regular 4 yrs, Lateral 3 yrs)', () => {
      // Regular B.Tech: 2024 to 2028 is exactly 4 years
      expect(validateAcademicBatch('REGULAR', 2024, 2028).valid).toBe(true);
      // Regular B.Tech: 2024 to 2027 is 3 years (invalid for regular)
      expect(validateAcademicBatch('REGULAR', 2024, 2027).valid).toBe(false);
      // Lateral Entry: 2024 to 2027 is exactly 3 years
      expect(validateAcademicBatch('LATERAL_ENTRY', 2024, 2027).valid).toBe(true);
      // Lateral Entry: 2024 to 2028 is 4 years (invalid for lateral)
      expect(validateAcademicBatch('LATERAL_ENTRY', 2024, 2028).valid).toBe(false);
    });

    it('enforces 5MB max file size and allowed MIME types', () => {
      expect(validateIdCardFile({ size: 1024 * 1024, type: 'image/jpeg', name: 'id.jpg' }).valid).toBe(true);
      expect(validateIdCardFile({ size: 2 * 1024 * 1024, type: 'image/png', name: 'id.png' }).valid).toBe(true);
      expect(validateIdCardFile({ size: 3 * 1024 * 1024, type: 'application/pdf', name: 'id.pdf' }).valid).toBe(true);
      // Over 5MB
      expect(validateIdCardFile({ size: 6 * 1024 * 1024, type: 'image/jpeg', name: 'huge.jpg' }).valid).toBe(false);
      // Executable file
      expect(validateIdCardFile({ size: 1024, type: 'application/x-msdownload', name: 'malware.exe' }).valid).toBe(false);
    });

    it('validates binary magic bytes for JPEG, PNG, and PDF', () => {
      const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
      expect(validateFileSignature(jpegBytes).valid).toBe(true);

      const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      expect(validateFileSignature(pngBytes).valid).toBe(true);

      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]);
      expect(validateFileSignature(pdfBytes).valid).toBe(true);

      const badBytes = new Uint8Array([0x4D, 0x5A, 0x90, 0x00]); // DOS / EXE
      expect(validateFileSignature(badBytes).valid).toBe(false);
    });

    it('rejects duplicate student ID with HTTP 409', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'usr-student-01', email: 'alice@srkr.edu.in' } },
      });

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                neq: vi.fn().mockResolvedValue({
                  data: [{ id: 'usr-another-student', student_id: '2101201045' }],
                }),
              })),
            })),
          };
        }
        return { select: vi.fn() };
      });

      const req = new NextRequest('http://localhost:3000/api/student/verify-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: '2101201045',
          admissionType: 'REGULAR',
          admissionYear: 2024,
          expectedGraduationYear: 2028,
        }),
      });

      const res = await verifyIdRoute(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.error).toMatch(/already registered/i);
    });
  });

  // =========================================================================
  // 4. CONDITIONAL COLLEGE BRANDING & NAME RENDERING
  // =========================================================================
  describe('Conditional College Branding Logic', () => {
    it('resolves correct institution from official email domain', () => {
      expect(resolveCollegeIdFromEmail('student@srkr.edu.in')).toBe('srkr-bhimavaram');
      expect(resolveCollegeIdFromEmail('student@srkrec.ac.in')).toBe('srkr-bhimavaram');
      expect(resolveCollegeIdFromEmail('student@vishnu.edu.in')).toBe('vishnu-bhimavaram');
      expect(resolveCollegeIdFromEmail('student@svecw.edu.in')).toBe('vishnu-bhimavaram');
      // Generic or personal email domain must be marked as pending campus verification
      expect(resolveCollegeIdFromEmail('user@gmail.com')).toBe('PENDING_CAMPUS_VERIFICATION');
      expect(resolveCollegeIdFromEmail('user@yahoo.com')).toBe('PENDING_CAMPUS_VERIFICATION');
    });

    it('returns null or verification pending when student profile is unapproved', () => {
      const unapprovedProfile = {
        college_id: 'srkr-bhimavaram',
        is_approved: false,
        role: 'STUDENT',
      };

      const isVerified = unapprovedProfile.is_approved === true || unapprovedProfile.role !== 'STUDENT';
      const authenticatedCollege = (unapprovedProfile.college_id && unapprovedProfile.college_id !== 'PENDING_CAMPUS_VERIFICATION' && isVerified)
        ? getCollegeById(unapprovedProfile.college_id)
        : null;

      expect(authenticatedCollege).toBeNull();
      const displayName = authenticatedCollege ? authenticatedCollege.shortName : 'Campus verification pending';
      expect(displayName).toBe('Campus verification pending');
    });

    it('renders exact college name for approved SRKR student profile', () => {
      const approvedSrkrProfile = {
        college_id: 'srkr-bhimavaram',
        is_approved: true,
        role: 'STUDENT',
      };

      const isVerified = approvedSrkrProfile.is_approved === true || approvedSrkrProfile.role !== 'STUDENT';
      const authenticatedCollege = (approvedSrkrProfile.college_id && approvedSrkrProfile.college_id !== 'PENDING_CAMPUS_VERIFICATION' && isVerified)
        ? getCollegeById(approvedSrkrProfile.college_id)
        : null;

      expect(authenticatedCollege).not.toBeNull();
      expect(authenticatedCollege?.shortName).toBe('SRKR Engineering College');
    });

    it('renders exact college name for approved Vishnu student profile', () => {
      const approvedVishnuProfile = {
        college_id: 'vit-bhimavaram',
        is_approved: true,
        role: 'STUDENT',
      };

      const isVerified = approvedVishnuProfile.is_approved === true || approvedVishnuProfile.role !== 'STUDENT';
      const authenticatedCollege = (approvedVishnuProfile.college_id && approvedVishnuProfile.college_id !== 'PENDING_CAMPUS_VERIFICATION' && isVerified)
        ? getCollegeById(approvedVishnuProfile.college_id)
        : null;

      expect(authenticatedCollege).not.toBeNull();
      expect(authenticatedCollege?.shortName).toBe('Vishnu Institute of Technology');
    });
  });
});
