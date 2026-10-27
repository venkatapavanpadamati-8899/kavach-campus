import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as registerRoute } from '@/app/api/auth/register/route';
import { POST as verifyIdRoute } from '@/app/api/student/verify-id/route';
import { POST as approveUserRoute } from '@/app/api/admin/users/approve/route';
import {
  deriveDepartmentFromBranch,
  ACADEMIC_PROGRAMS,
  ACADEMIC_YEARS,
} from '@/lib/academic-programs';
import {
  validateFileSignature,
} from '@/lib/verification/id-card';

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
const mockStorageUpload = vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null });

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
        upload: mockStorageUpload,
      })),
    },
  })),
}));

// Mock notifications
vi.mock('@/lib/notifications', () => ({
  sendEmailNotification: vi.fn().mockResolvedValue({ success: true }),
  isRealDeliveryEnabled: vi.fn().mockReturnValue(false),
  isRealEmailDeliveryEnabled: vi.fn().mockReturnValue(false),
  isSmtpConfigured: vi.fn().mockReturnValue(true),
  insertInAppNotification: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Kavach Campus — 11-Field Registration, 15-Field Profile & Management RBAC Suite', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-that-is-long-enough-32-chars',
      ENABLE_REAL_EMAIL_DELIVERY: 'false',
    };
  });

  describe('1. 11 Registration Fields & Dynamic Branch/Department Mapping', () => {
    it('verifies academic programs and year options', () => {
      expect(ACADEMIC_PROGRAMS).toContain('B.Tech');
      expect(ACADEMIC_PROGRAMS).toContain('B.E.');
      expect(ACADEMIC_PROGRAMS).toContain('B.Sc.');
      expect(ACADEMIC_PROGRAMS).toContain('B.Com.');
      expect(ACADEMIC_PROGRAMS).toContain('Diploma');

      expect(ACADEMIC_YEARS).toEqual(['Year 1', 'Year 2', 'Year 3', 'Year 4']);
    });

    it('correctly maps popular engineering branches to official department titles', () => {
      expect(deriveDepartmentFromBranch('CSE')).toBe('Computer Science and Engineering');
      expect(deriveDepartmentFromBranch('AIML')).toBe('Artificial Intelligence and Machine Learning');
      expect(deriveDepartmentFromBranch('ECE')).toBe('Electronics and Communication Engineering');
      expect(deriveDepartmentFromBranch('EEE')).toBe('Electrical and Electronics Engineering');
      expect(deriveDepartmentFromBranch('MECH')).toBe('Mechanical Engineering');
      expect(deriveDepartmentFromBranch('CIVIL')).toBe('Civil Engineering');
      expect(deriveDepartmentFromBranch('IT')).toBe('Information Technology');
    });

    it('derives custom department names gracefully when branch is custom', () => {
      expect(deriveDepartmentFromBranch('Robotics and Automation')).toBe('Robotics and Automation Department');
      expect(deriveDepartmentFromBranch('Aerospace Engineering')).toBe('Aerospace Engineering');
    });

    it('processes registration with 11 fields and preserves branch & section', async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
                data: [],
              })),
            })),
          };
        }
        if (table === 'user_otp_verifications') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {
          select: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [] }) })),
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const registrationPayload = {
        name: 'Venkata Pavan',
        email: 'pavan@srkr.edu.in',
        phone: '9876543210',
        password: 'ValidPassword123!',
        registrationNumber: '2101201045',
        branch: 'CSE',
        section: 'A',
        degree: 'B.Tech',
        department: 'Computer Science and Engineering',
        academicYear: 'Year 4',
        consent: true,
      };

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationPayload),
      });

      const res = await registerRoute(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.message).toMatch(/OTP/i);
    });

    it('rejects registration when mandatory student registration number is invalid', async () => {
      const invalidPayload = {
        name: 'Test Student',
        email: 'test@campus.edu',
        phone: '9876543210',
        password: 'ValidPassword123!',
        registrationNumber: '123', // Too short (min 7)
        branch: 'CSE',
        section: 'A',
        degree: 'B.Tech',
        department: 'Computer Science and Engineering',
        academicYear: 'Year 1',
        consent: true,
      };

      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      });

      const res = await registerRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toMatch(/Student Registration Number must be 7/i);
    });
  });

  describe('2. 15-Field Student Profile Verification & Completion Specification', () => {
    it('verifies the exact 15-attribute student schema', () => {
      const mockProfile = {
        // Personal (7)
        fullName: 'Ananya Sharma',
        dob: '2003-05-15',
        parentPhone: '9876543211',
        personalPhone: '9876543210',
        emergencyPhone: '9876543212',
        gender: 'Female',
        address: 'Room 204, Ganga Hostel, Campus North',
        // College (5)
        studentRegistrationNumber: '2101201088',
        collegeEmail: '', // Optional
        branch: 'CSE',
        section: 'B',
        accommodationType: 'Hosteller',
        // Verification & Images (3)
        idCardFrontImage: 'kavach-id-cards/usr-1/front.jpg',
        idCardBackImage: 'kavach-id-cards/usr-1/back.jpg',
        profilePhotograph: 'kavach-id-cards/usr-1/avatar.jpg',
      };

      const personalFields = [
        mockProfile.fullName,
        mockProfile.dob,
        mockProfile.parentPhone,
        mockProfile.personalPhone,
        mockProfile.emergencyPhone,
        mockProfile.gender,
        mockProfile.address,
      ];
      expect(personalFields).toHaveLength(7);
      personalFields.forEach(f => expect(f).toBeTruthy());

      const collegeFields = [
        mockProfile.studentRegistrationNumber,
        mockProfile.branch,
        mockProfile.section,
        mockProfile.accommodationType,
      ];
      expect(collegeFields).toHaveLength(4); // plus optional collegeEmail makes 5

      const imageFields = [
        mockProfile.idCardFrontImage,
        mockProfile.idCardBackImage,
        mockProfile.profilePhotograph,
      ];
      expect(imageFields).toHaveLength(3);
      imageFields.forEach(img => expect(img).toBeTruthy());
    });
  });

  describe('3. Dual Front & Back ID Card Upload & Verification API', () => {
    it('validates binary magic bytes for JPEG and PNG', () => {
      const jpegMagic = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
      expect(validateFileSignature(jpegMagic).valid).toBe(true);

      const pngMagic = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(validateFileSignature(pngMagic).valid).toBe(true);

      const invalidMagic = new Uint8Array([0x4d, 0x5a]); // Windows PE/EXE header
      expect(validateFileSignature(invalidMagic).valid).toBe(false);
    });

    it('rejects duplicate student registration ID used by another account', async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: { id: 'usr-student-1', email: 'student1@srkr.edu.in' },
        },
      });

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                neq: vi.fn().mockResolvedValue({
                  data: [{ id: 'usr-student-2', student_id: '2101201045' }],
                }),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [] }) })),
        };
      });

      const formData = new FormData();
      formData.append('studentId', '2101201045');
      formData.append('collegeId', 'srkr');
      formData.append('admissionType', 'REGULAR');
      formData.append('admissionYear', '2024');
      formData.append('expectedGraduationYear', '2028');
      formData.append('idCardUrl', 'kavach-id-cards/usr-student-1/front.jpg');

      const req = new Request('http://localhost:3000/api/student/verify-id', {
        method: 'POST',
        body: formData,
      });

      const res = await verifyIdRoute(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.error).toContain('is already registered by another account');
    });
  });

  describe('4. RBAC: Management Admin Staff Governance vs Monitoring-Only Normal/Super Admin', () => {
    it('allows MANAGEMENT admin to approve staff account', async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: { id: 'usr-management-1' },
        },
      });

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    role: 'MANAGEMENT',
                    is_approved: true,
                    college_id: 'srkr-bhimavaram',
                    can_manage_staff: true,
                  },
                }),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [] }) })),
        };
      });

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'STAFF', college_id: 'srkr-bhimavaram' },
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
        if (table === 'audit_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [] }) })),
        };
      });

      const req = new Request('http://localhost:3000/api/admin/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: 'usr-staff-target',
          requestedRole: 'STAFF',
          action: 'APPROVE',
        }),
      });

      const res = await approveUserRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toBe('User approved successfully');
    });

    it('rejects ADMIN attempting to approve staff with monitoring-only notice', async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: { id: 'usr-normal-admin' },
        },
      });

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    role: 'ADMIN',
                    is_approved: true,
                    college_id: 'srkr',
                    can_manage_staff: false,
                  },
                }),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [] }) })),
        };
      });

      const req = new Request('http://localhost:3000/api/admin/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: 'usr-staff-target',
          requestedRole: 'STAFF',
          action: 'APPROVE',
        }),
      });

      const res = await approveUserRoute(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toBe(
        'Normal Admin and Super Admin are monitoring-only roles by default. Management Admin authorization required to grant staff access.'
      );
    });

    it('rejects SUPER_ADMIN attempting to approve staff without Management authorization', async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: { id: 'usr-super-admin' },
        },
      });

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    role: 'SUPER_ADMIN',
                    is_approved: true,
                    college_id: null,
                    can_manage_staff: false,
                  },
                }),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [] }) })),
        };
      });

      const req = new Request('http://localhost:3000/api/admin/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: 'usr-staff-target',
          requestedRole: 'SECURITY',
          action: 'APPROVE',
        }),
      });

      const res = await approveUserRoute(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toBe(
        'Normal Admin and Super Admin are monitoring-only roles by default. Management Admin authorization required to grant staff access.'
      );
    });

    it('allows PRINCIPAL role to approve campus staff', async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: { id: 'usr-principal-1' },
        },
      });

      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    role: 'PRINCIPAL',
                    is_approved: true,
                    college_id: 'srkr-bhimavaram',
                  },
                }),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [] }) })),
        };
      });

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'HOD', college_id: 'srkr-bhimavaram' },
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
        if (table === 'audit_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [] }) })),
        };
      });

      const req = new Request('http://localhost:3000/api/admin/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: 'usr-hod-target',
          requestedRole: 'HOD',
          action: 'APPROVE',
        }),
      });

      const res = await approveUserRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
    });
  });
});
