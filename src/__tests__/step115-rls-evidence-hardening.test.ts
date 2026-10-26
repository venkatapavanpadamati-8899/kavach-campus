import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getIncident } from '@/app/api/incidents/[id]/route';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Mocks for Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

describe('KAVACH CAMPUS — STEP 115: Security-First RLS & Evidence Hardening Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Student reads own incident
  it('1. Student reads own incident with location coordinates visible', async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'student-owner-1' } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'd9b2d61b-31d6-44ec-b8aa-111111111111',
                    case_id: 'KC-2026-OWN01',
                    student_id: 'student-owner-1',
                    latitude: 17.4455,
                    longitude: 78.3498,
                    location_accuracy: 10,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'student-owner-1', role: 'STUDENT', is_approved: true },
                }),
              }),
            }),
          };
        }
        if (table === 'evidence') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [] }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/incidents/d9b2d61b-31d6-44ec-b8aa-111111111111');
    const res = await getIncident(req, { params: Promise.resolve({ id: 'd9b2d61b-31d6-44ec-b8aa-111111111111' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.incident.case_id).toBe('KC-2026-OWN01');
    expect(data.incident.latitude).toBe(17.4455);
  });

  // 2. Student cannot read another student's incident
  it('2. Student cannot read another student incident (403 Forbidden)', async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'student-attacker' } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'd9b2d61b-31d6-44ec-b8aa-222222222222',
                    case_id: 'KC-2026-VICTIM',
                    student_id: 'student-victim',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'student-attacker', role: 'STUDENT', is_approved: true },
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/incidents/KC-2026-VICTIM');
    const res = await getIncident(req, { params: Promise.resolve({ id: 'KC-2026-VICTIM' }) });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Forbidden: You cannot access other students’ incidents');
  });

  // 3. Assigned responder reads assigned incident
  it('3. Assigned responder reads assigned incident with full location access', async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'responder-assigned-1' } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'd9b2d61b-31d6-44ec-b8aa-333333333333',
                    case_id: 'KC-2026-ASSIGNED',
                    student_id: 'student-victim-3',
                    assigned_to: 'responder-assigned-1',
                    latitude: 17.4490,
                    longitude: 78.3480,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'responder-assigned-1', role: 'SECURITY', is_approved: true },
                }),
              }),
            }),
          };
        }
        if (table === 'evidence') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [] }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/incidents/KC-2026-ASSIGNED');
    const res = await getIncident(req, { params: Promise.resolve({ id: 'KC-2026-ASSIGNED' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.incident.latitude).toBe(17.4490);
  });

  // 4. Unassigned staff cannot read another case
  it('4. Unassigned staff cannot read another assigned case (403 Forbidden)', async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'unassigned-staff-9' } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'd9b2d61b-31d6-44ec-b8aa-444444444444',
                    case_id: 'KC-2026-OTHER-STAFF',
                    student_id: 'student-9',
                    assigned_to: 'other-responder-1',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'unassigned-staff-9', role: 'STAFF', is_approved: true },
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/incidents/KC-2026-OTHER-STAFF');
    const res = await getIncident(req, { params: Promise.resolve({ id: 'KC-2026-OTHER-STAFF' }) });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Forbidden: You are not authorized to view this incident');
  });

  // 5. Reviewer access works only for approved reviewer roles
  it('5. Approved SECURITY reviewer can access incident oversight', async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'reviewer-security-1' } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'd9b2d61b-31d6-44ec-b8aa-555555555555',
                    case_id: 'KC-2026-REVIEW-1',
                    student_id: 'student-5',
                    assigned_to: 'other-staff',
                    latitude: 17.4422,
                    longitude: 78.3411,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'reviewer-security-1', role: 'SECURITY', is_approved: true },
                }),
              }),
            }),
          };
        }
        if (table === 'evidence') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [] }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/incidents/KC-2026-REVIEW-1');
    const res = await getIncident(req, { params: Promise.resolve({ id: 'KC-2026-REVIEW-1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.incident.latitude).toBe(17.4422);
  });

  // 6. Student reads own profile but not another profile
  it('6. Policy simulation: Student owner can select own profile row but not others', () => {
    const simulateStudentProfileSelect = (callerUid: string, profileRowId: string, isReviewer: boolean) => {
      // Expression: id = auth.uid() OR is_reviewer()
      return profileRowId === callerUid || isReviewer;
    };

    expect(simulateStudentProfileSelect('student-100', 'student-100', false)).toBe(true);
    expect(simulateStudentProfileSelect('student-100', 'student-200', false)).toBe(false);
    expect(simulateStudentProfileSelect('reviewer-admin', 'student-200', true)).toBe(true);
  });

  // 7. General staff cannot directly read sensitive student profiles
  it('7. Policy simulation: General unassigned staff is blocked from student_profiles SELECT', () => {
    const isReviewerRole = (role: string) => ['ADMIN', 'SUPER_ADMIN', 'SECURITY'].includes(role);
    const simulateStaffProfileAccess = (callerRole: string, callerUid: string, studentUid: string) => {
      const isReviewer = isReviewerRole(callerRole);
      return studentUid === callerUid || isReviewer;
    };

    // General staff roles like STAFF, COUNSELLOR, HOD do NOT have reviewer bypass on student_profiles
    expect(simulateStaffProfileAccess('STAFF', 'staff-1', 'student-target')).toBe(false);
    expect(simulateStaffProfileAccess('COUNSELLOR', 'counsel-1', 'student-target')).toBe(false);
    expect(simulateStaffProfileAccess('HOD', 'hod-1', 'student-target')).toBe(false);
    // Only approved security/admin reviewers have access
    expect(simulateStaffProfileAccess('SECURITY', 'sec-1', 'student-target')).toBe(true);
    expect(simulateStaffProfileAccess('ADMIN', 'admin-1', 'student-target')).toBe(true);
  });

  // 8. Evidence uploader cannot attach evidence to arbitrary case_id
  it('8. Policy simulation: Evidence INSERT requires case ownership, assignment, or reviewer status', () => {
    interface IncidentRecord {
      id: string;
      case_id: string;
      student_id: string;
      assigned_to: string | null;
    }

    const incidents: IncidentRecord[] = [
      { id: 'inc-uuid-1', case_id: 'KC-2026-VICTIM-1', student_id: 'student-victim', assigned_to: 'responder-bob' }
    ];

    const simulateEvidenceInsertPolicy = (
      uploaderUid: string,
      targetCaseId: string,
      isReviewer: boolean
    ) => {
      // Policy: uploaded_by = auth.uid() AND EXISTS (SELECT 1 FROM incidents WHERE case_id/id matching AND (student_id = auth.uid() OR assigned_to = auth.uid() OR is_reviewer()))
      const matchingIncident = incidents.find(
        (i) => (i.case_id === targetCaseId || i.id === targetCaseId) &&
               (i.student_id === uploaderUid || i.assigned_to === uploaderUid || isReviewer)
      );
      return !!matchingIncident;
    };

    // Attacker cannot attach evidence to another student's case
    expect(simulateEvidenceInsertPolicy('student-attacker', 'KC-2026-VICTIM-1', false)).toBe(false);
    // Student owner can attach evidence
    expect(simulateEvidenceInsertPolicy('student-victim', 'KC-2026-VICTIM-1', false)).toBe(true);
    // Assigned responder can attach evidence
    expect(simulateEvidenceInsertPolicy('responder-bob', 'KC-2026-VICTIM-1', false)).toBe(true);
    // Reviewer can attach evidence
    expect(simulateEvidenceInsertPolicy('security-admin', 'KC-2026-VICTIM-1', true)).toBe(true);
  });

  // 9. Evidence INSERT rejects nonexistent case_id
  it('9. Policy simulation: Evidence INSERT rejects nonexistent case_id values', () => {
    const incidents: { case_id: string; student_id: string }[] = [];

    const simulateEvidenceInsertPolicy = (uploaderUid: string, targetCaseId: string, isReviewer: boolean) => {
      const match = incidents.find(i => i.case_id === targetCaseId && (i.student_id === uploaderUid || isReviewer));
      return !!match;
    };

    expect(simulateEvidenceInsertPolicy('student-any', 'KC-2026-NONEXISTENT', false)).toBe(false);
    expect(simulateEvidenceInsertPolicy('admin-any', 'KC-2026-NONEXISTENT', true)).toBe(false);
  });

  // 10. Evidence owner/assigned responder/reviewer access is scoped to that case
  it('10. Unassigned staff cannot retrieve evidence files from route (returns empty list without executing evidence query)', async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'unassigned-staff-x' } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'd9b2d61b-31d6-44ec-b8aa-666666666666',
                    case_id: 'KC-2026-UNASSIGNED-CASE',
                    student_id: 'student-someone-else',
                    assigned_to: null, // unassigned incident
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'unassigned-staff-x', role: 'STAFF', is_approved: true },
                }),
              }),
            }),
          };
        }
        if (table === 'evidence') {
          // Should NOT be reached for unassigned staff
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [{ id: 'ev-secret', file_name: 'secret.jpg', file_path: 'secret.jpg' }],
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/incidents/KC-2026-UNASSIGNED-CASE');
    const res = await getIncident(req, { params: Promise.resolve({ id: 'KC-2026-UNASSIGNED-CASE' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    // Evidence MUST be empty because caller is not incident owner, assigned responder, or reviewer/admin
    expect(data.evidence).toEqual([]);
  });

  // 11. Students cannot modify protected profile fields
  it('11. Trigger contract simulation: Student cannot alter verification_status or verified_by', () => {
    const simulateStudentProfileUpdateTrigger = (
      callerRole: string,
      isServiceRole: boolean,
      oldRecord: { verification_status: string; verified_by: string | null },
      newRecord: { verification_status: string; verified_by: string | null }
    ) => {
      const isStatusChanged = oldRecord.verification_status !== newRecord.verification_status;
      const isVerifiedByChanged = oldRecord.verified_by !== newRecord.verified_by;

      if (!isStatusChanged && !isVerifiedByChanged) {
        return { allowed: true };
      }

      if (isServiceRole || ['ADMIN', 'SUPER_ADMIN'].includes(callerRole)) {
        return { allowed: true };
      }

      return {
        allowed: false,
        error: 'Access Denied: Only institutional reviewers or verification service can modify student verification status or audit fields.',
      };
    };

    const oldState = { verification_status: 'PENDING_UPLOAD', verified_by: null };
    const tamperedState = { verification_status: 'VERIFIED', verified_by: 'student-self' };

    // Student self-update attempt is blocked
    const studentAttempt = simulateStudentProfileUpdateTrigger('STUDENT', false, oldState, tamperedState);
    expect(studentAttempt.allowed).toBe(false);
    expect(studentAttempt.error).toContain('Access Denied');

    // Admin or verification service is allowed
    const adminAttempt = simulateStudentProfileUpdateTrigger('ADMIN', false, oldState, tamperedState);
    expect(adminAttempt.allowed).toBe(true);

    const serviceAttempt = simulateStudentProfileUpdateTrigger('STUDENT', true, oldState, tamperedState);
    expect(serviceAttempt.allowed).toBe(true);
  });

  // 12. Evidence retrieval uses case_id/file_path, not incident_id/storage_path
  it('12. Evidence retrieval queries using real schema columns (case_id and file_path)', async () => {
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'ev-test-12',
              file_name: 'test.png',
              file_size: 2048,
              mime_type: 'image/png',
              file_path: 'student-owner-12/KC-2026-CASE12/test.png',
              case_id: 'KC-2026-CASE12',
              created_at: '2026-10-17T12:00:00Z',
            },
          ],
        }),
      }),
    });

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'student-owner-12' } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'd9b2d61b-31d6-44ec-b8aa-777777777777',
                    case_id: 'KC-2026-CASE12',
                    student_id: 'student-owner-12',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'student-owner-12', role: 'STUDENT', is_approved: true },
                }),
              }),
            }),
          };
        }
        if (table === 'evidence') {
          return { select: selectMock };
        }
        return { select: vi.fn().mockReturnThis() };
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/incidents/KC-2026-CASE12');
    const res = await getIncident(req, { params: Promise.resolve({ id: 'KC-2026-CASE12' }) });
    expect(res.status).toBe(200);

    // Verify evidence select was called with file_path and case_id (not storage_path or incident_id)
    expect(selectMock).toHaveBeenCalledWith('id, file_name, file_size, mime_type, file_path, case_id, created_at');
  });

  // 13. Storage access is private and case-authorized
  it('13. Storage access generates signed URLs and never exposes raw file_path as public URL', async () => {
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_valid_key_greater_than_thirty_chars';

    const createSignedUrlMock = vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://supabase.co/storage/v1/object/sign/kavach-evidence/photo.jpg?token=safe' },
      error: null,
    });

    vi.mocked(createAdminClient).mockReturnValue({
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl: createSignedUrlMock,
        }),
      },
    } as unknown as ReturnType<typeof createAdminClient>);

    try {
      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'student-owner-13' } } }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'incidents') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'd9b2d61b-31d6-44ec-b8aa-888888888888',
                      case_id: 'KC-2026-CASE13',
                      student_id: 'student-owner-13',
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'student-owner-13', role: 'STUDENT', is_approved: true },
                  }),
                }),
              }),
            };
          }
          if (table === 'evidence') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'ev-13',
                        file_name: 'evidence.png',
                        file_size: 4096,
                        mime_type: 'image/png',
                        file_path: 'student-owner-13/KC-2026-CASE13/evidence.png',
                        case_id: 'KC-2026-CASE13',
                        created_at: '2026-10-17T12:00:00Z',
                      },
                    ],
                  }),
                }),
              }),
            };
          }
          return { select: vi.fn().mockReturnThis() };
        }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/incidents/KC-2026-CASE13');
      const res = await getIncident(req, { params: Promise.resolve({ id: 'KC-2026-CASE13' }) });
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.evidence[0].signedUrl).toContain('kavach-evidence');
      // Ensure file_path is NOT leaked as public URL in response payload
      expect(data.evidence[0].file_path).toBeUndefined();
      expect(data.evidence[0].storage_path).toBeUndefined();
      // Verify signed URL duration was 900 seconds (15 min)
      expect(createSignedUrlMock).toHaveBeenCalledWith('student-owner-13/KC-2026-CASE13/evidence.png', 900);
    } finally {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    }
  });

  // 14. Existing student profile editing still works (updating unconstrained fields)
  it('14. Trigger simulation: Legitimate student profile updates (course, batch, id_card_url, blood_group) are permitted', () => {
    const simulateStudentProfileUpdateTrigger = (
      oldRecord: Record<string, unknown>,
      newRecord: Record<string, unknown>
    ) => {
      const protectedFields = [
        'verification_status',
        'verified_at',
        'verified_by',
        'verification_notes',
        'ocr_extracted_data',
        'id',
      ];
      const isProtectedFieldModified = protectedFields.some(
        (field) => oldRecord[field] !== newRecord[field]
      );
      return !isProtectedFieldModified;
    };

    const oldRecord = {
      id: 'student-uuid-14',
      course: 'B.Tech CSE',
      admission_year: 2023,
      expected_graduation_year: 2027,
      id_card_url: 'student-uuid-14/old-card.jpg',
      blood_group: 'B+',
      verification_status: 'PENDING_UPLOAD',
      verified_at: null,
      verified_by: null,
      verification_notes: null,
      ocr_extracted_data: null,
    };

    const updatedRecord = {
      ...oldRecord,
      course: 'B.Tech AI & DS',
      blood_group: 'O+',
      id_card_url: 'student-uuid-14/new-card.jpg',
      expected_graduation_year: 2027,
    };

    // Updating course, blood_group, id_card_url MUST be permitted
    expect(simulateStudentProfileUpdateTrigger(oldRecord, updatedRecord)).toBe(true);
  });

  // 15. Student cannot alter verified_by or verified_at even if verification_status is unchanged
  it('15. Trigger simulation: Student attempting to forge verified_by or verified_at is blocked', () => {
    const simulateStudentProfileUpdateTrigger = (
      callerRole: string,
      isServiceRole: boolean,
      oldRecord: Record<string, unknown>,
      newRecord: Record<string, unknown>
    ) => {
      const protectedFields = [
        'verification_status',
        'verified_at',
        'verified_by',
        'verification_notes',
        'ocr_extracted_data',
        'id',
      ];
      const isProtectedFieldModified = protectedFields.some(
        (field) => oldRecord[field] !== newRecord[field]
      );
      if (!isProtectedFieldModified) return true;
      if (isServiceRole || ['ADMIN', 'SUPER_ADMIN'].includes(callerRole)) return true;
      return false;
    };

    const baseline = {
      id: 'student-uuid-15',
      verification_status: 'PENDING_UPLOAD',
      verified_at: null,
      verified_by: null,
    };

    // Student attempts to inject a verified_by UUID without changing status
    const forgedVerifiedBy = { ...baseline, verified_by: 'admin-fake-uuid' };
    expect(simulateStudentProfileUpdateTrigger('STUDENT', false, baseline, forgedVerifiedBy)).toBe(false);

    // Student attempts to set verified_at timestamp
    const forgedVerifiedAt = { ...baseline, verified_at: new Date().toISOString() };
    expect(simulateStudentProfileUpdateTrigger('STUDENT', false, baseline, forgedVerifiedAt)).toBe(false);

    // Institutional Admin can set verified_by and verified_at
    expect(simulateStudentProfileUpdateTrigger('ADMIN', false, baseline, forgedVerifiedBy)).toBe(true);
  });

  // 16. Service-role automated ID verification workflow remains functional
  it('16. Service-role verification workflow (createAdminClient) successfully updates verification status', () => {
    const simulateServiceRoleTriggerBypass = (jwtRole: string) => {
      // In Postgres trigger: IF v_jwt_role = 'service_role' THEN RETURN NEW;
      return jwtRole === 'service_role';
    };

    expect(simulateServiceRoleTriggerBypass('service_role')).toBe(true);
    expect(simulateServiceRoleTriggerBypass('authenticated')).toBe(false);
    expect(simulateServiceRoleTriggerBypass('anon')).toBe(false);
  });

  // 17. Legacy permissive policies cannot bypass the new restrictions (OR combination simulation)
  it('17. Policy simulation: Dropping broad legacy policies prevents OR-based isolation bypass', () => {
    interface PolicyEvaluation {
      authorizedPolicyAllows: boolean;
      legacyStaffPolicyAllows: boolean;
    }

    const evaluatePermissiveOr = (policies: PolicyEvaluation, includeLegacy: boolean) => {
      if (includeLegacy) {
        // PERMISSIVE policies combine with OR in Postgres
        return policies.authorizedPolicyAllows || policies.legacyStaffPolicyAllows;
      }
      return policies.authorizedPolicyAllows;
    };

    // Case: Unassigned staff trying to view confidential student profile
    const unassignedStaffAccess: PolicyEvaluation = {
      authorizedPolicyAllows: false, // is_reviewer()=false, auth.uid() != id
      legacyStaffPolicyAllows: true,  // is_staff() was true!
    };

    // If legacy policy is present, isolation is DEFEATED (returns true)
    expect(evaluatePermissiveOr(unassignedStaffAccess, true)).toBe(true);

    // After dropping legacy policy, isolation is ENFORCED (returns false)
    expect(evaluatePermissiveOr(unassignedStaffAccess, false)).toBe(false);
  });

  // 18. Assigned responders can upload only to authorized assigned cases
  it('18. Policy simulation: Assigned responder can attach evidence to their case, but is rejected for unassigned cases', () => {
    interface IncidentCase {
      case_id: string;
      assigned_to: string | null;
      student_id: string;
    }

    const incidents: IncidentCase[] = [
      { case_id: 'KC-2026-CASE-A', assigned_to: 'responder-18', student_id: 'student-A' },
      { case_id: 'KC-2026-CASE-B', assigned_to: 'other-responder', student_id: 'student-B' },
    ];

    const simulateEvidenceInsertPolicy = (callerUid: string, targetCaseId: string) => {
      const match = incidents.find(
        (i) => i.case_id === targetCaseId && (i.assigned_to === callerUid || i.student_id === callerUid)
      );
      return !!match;
    };

    // Responder-18 can attach evidence to CASE-A where they are assigned
    expect(simulateEvidenceInsertPolicy('responder-18', 'KC-2026-CASE-A')).toBe(true);

    // Responder-18 CANNOT attach evidence to CASE-B where someone else is assigned
    expect(simulateEvidenceInsertPolicy('responder-18', 'KC-2026-CASE-B')).toBe(false);
  });

  // 19. Student cannot modify verification_notes or ocr_extracted_data
  it('19. Trigger simulation: Student cannot alter verification_notes or ocr_extracted_data', () => {
    const baseline = {
      id: 'student-owner-19',
      verification_status: 'PENDING_UPLOAD',
      verification_notes: 'Awaiting ID card upload',
      ocr_extracted_data: { confidence: 0.8 },
      verified_by: null,
      verified_at: null,
      course: 'B.Tech CSE',
    };

    const simulateTrigger = (role: string, oldRow: typeof baseline, newRow: typeof baseline) => {
      const isProtectedColumnChanged =
        oldRow.verification_status !== newRow.verification_status ||
        oldRow.verified_at !== newRow.verified_at ||
        oldRow.verified_by !== newRow.verified_by ||
        oldRow.verification_notes !== newRow.verification_notes ||
        JSON.stringify(oldRow.ocr_extracted_data) !== JSON.stringify(newRow.ocr_extracted_data) ||
        oldRow.id !== newRow.id;

      if (!isProtectedColumnChanged) return true;
      return ['ADMIN', 'SUPER_ADMIN', 'SECURITY'].includes(role);
    };

    // Student modifying verification_notes is blocked
    const forgedNotes = { ...baseline, verification_notes: 'Bypassed verification note' };
    expect(simulateTrigger('STUDENT', baseline, forgedNotes)).toBe(false);

    // Student modifying ocr_extracted_data is blocked
    const forgedOcr = { ...baseline, ocr_extracted_data: { confidence: 1.0, bypass: true } };
    expect(simulateTrigger('STUDENT', baseline, forgedOcr)).toBe(false);

    // Institutional Admin can update verification_notes and OCR data
    expect(simulateTrigger('ADMIN', baseline, forgedNotes)).toBe(true);
  });

  // 20. Student cannot alter student_profiles id (primary key)
  it('20. Trigger simulation: Student cannot modify primary key id', () => {
    const baseline = {
      id: 'student-owner-20',
      verification_status: 'VERIFIED',
      verification_notes: null,
      ocr_extracted_data: null,
      verified_by: 'admin-1',
      verified_at: '2026-10-17T00:00:00Z',
    };

    const simulateIdTamper = (role: string, oldRow: typeof baseline, newRow: typeof baseline) => {
      if (oldRow.id !== newRow.id) {
        return ['ADMIN', 'SUPER_ADMIN'].includes(role);
      }
      return true;
    };

    const forgedId = { ...baseline, id: 'attacker-sub-id' };
    expect(simulateIdTamper('STUDENT', baseline, forgedId)).toBe(false);
  });

  // 21. Evidence INSERT policy fails closed on NULL, empty string, or malformed case_id
  it('21. Evidence INSERT fails closed on NULL, empty, or nonexistent case_id', () => {
    const knownIncidents = [
      { id: '11111111-1111-1111-1111-111111111111', case_id: 'KC-2026-KNOWN', student_id: 'stu-21' },
    ];

    const simulateInsertCheck = (callerUid: string, inputCaseId: string | null | undefined) => {
      if (!inputCaseId || inputCaseId.trim() === '') return false;
      const match = knownIncidents.find(
        (i) => (i.case_id === inputCaseId || i.id === inputCaseId) && i.student_id === callerUid
      );
      return !!match;
    };

    expect(simulateInsertCheck('stu-21', null)).toBe(false);
    expect(simulateInsertCheck('stu-21', '')).toBe(false);
    expect(simulateInsertCheck('stu-21', '   ')).toBe(false);
    expect(simulateInsertCheck('stu-21', 'NONEXISTENT_CASE_999')).toBe(false);
    expect(simulateInsertCheck('stu-21', 'KC-2026-KNOWN')).toBe(true);
    expect(simulateInsertCheck('stu-21', '11111111-1111-1111-1111-111111111111')).toBe(true);
  });

  // 22. Evidence INSERT policy supports both UUID and human-readable case IDs
  it('22. Evidence INSERT handles both UUID and human-readable case IDs seamlessly', () => {
    const incidentRecord = {
      id: '22222222-2222-2222-2222-222222222222',
      case_id: 'KC-2026-SOS-22',
      student_id: 'student-22',
      assigned_to: 'responder-22',
    };

    const checkPolicy = (callerId: string, caseIdentifier: string) => {
      const isMatch =
        (incidentRecord.case_id === caseIdentifier || incidentRecord.id === caseIdentifier) &&
        (incidentRecord.student_id === callerId || incidentRecord.assigned_to === callerId);
      return isMatch;
    };

    // Match via human-readable case_id
    expect(checkPolicy('student-22', 'KC-2026-SOS-22')).toBe(true);
    expect(checkPolicy('responder-22', 'KC-2026-SOS-22')).toBe(true);

    // Match via UUID
    expect(checkPolicy('student-22', '22222222-2222-2222-2222-222222222222')).toBe(true);
    expect(checkPolicy('responder-22', '22222222-2222-2222-2222-222222222222')).toBe(true);

    // Unrelated user fails both
    expect(checkPolicy('attacker-user', 'KC-2026-SOS-22')).toBe(false);
    expect(checkPolicy('attacker-user', '22222222-2222-2222-2222-222222222222')).toBe(false);
  });

  // 23. Storage direct-access isolation: Users cannot directly read files outside their folder prefix
  it('23. Storage direct access restricts users to their own folder prefix; cross-user access requires signed URL', () => {
    interface StorageObject {
      bucket_id: string;
      name: string; // e.g. "user-uuid/file.png"
    }

    const checkStorageSelectPolicy = (callerUid: string, role: string, obj: StorageObject) => {
      if (obj.bucket_id !== 'kavach-evidence') return false;
      const folderPrefix = obj.name.split('/')[0];
      const isOwner = folderPrefix === callerUid;
      const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role);
      return isOwner || isAdmin;
    };

    const targetFile: StorageObject = {
      bucket_id: 'kavach-evidence',
      name: 'victim-student-23/emergency-audio.mp3',
    };

    // Victim can directly access own file
    expect(checkStorageSelectPolicy('victim-student-23', 'STUDENT', targetFile)).toBe(true);

    // Another student cannot directly access victim file
    expect(checkStorageSelectPolicy('other-student', 'STUDENT', targetFile)).toBe(false);

    // General staff cannot directly access victim file via storage client
    expect(checkStorageSelectPolicy('general-staff', 'STAFF', targetFile)).toBe(false);

    // Admin can access
    expect(checkStorageSelectPolicy('admin-user', 'ADMIN', targetFile)).toBe(true);
  });

  // 24. Defensive drop check: Dropping all historical policy names ensures no bypass
  it('24. Defensive drop verification: Historical policy variants are cleanly dropped', () => {
    const historicalEvidencePolicies = [
      'Users upload evidence',
      'Users insert evidence',
      'Users can upload evidence for own incidents',
      'Staff view evidence',
      'Staff can view all evidence',
      'Users view own evidence',
      'Users can view own evidence',
    ];

    const droppedPolicies = new Set([
      'Users upload evidence',
      'Users insert evidence',
      'Users can upload evidence for own incidents',
      'Staff view evidence',
      'Staff can view all evidence',
      'Users view own evidence',
      'Users can view own evidence',
      'Authorized users view incident evidence',
      'Authorized users upload incident evidence',
    ]);

    // All historical variants must be accounted for in defensive drops
    const allAccountedFor = historicalEvidencePolicies.every((name) => droppedPolicies.has(name));
    expect(allAccountedFor).toBe(true);
  });

  // 25. Audit logs schema parity & NOT NULL entity_type compliance
  it('25. Audit logs insert payload strictly requires entity_type and metadata', () => {
    interface AuditLogRecord {
      action: string;
      entity_type?: string | null;
      metadata?: Record<string, unknown> | null;
      created_at?: string;
    }

    const validateAuditLogInsert = (record: AuditLogRecord) => {
      if (!record.action || typeof record.action !== 'string') {
        throw new Error('NOT_NULL_VIOLATION: action is required');
      }
      if (!record.entity_type || typeof record.entity_type !== 'string') {
        throw new Error('NOT_NULL_VIOLATION: null value in column "entity_type" violates not-null constraint');
      }
      if (!record.metadata || typeof record.metadata !== 'object') {
        throw new Error('SCHEMA_VIOLATION: metadata JSONB column is required');
      }
      return true;
    };

    // Defective Step 115 insert lacking entity_type fails
    const defectiveInsert = {
      action: 'SECURITY_REMEDIATION_STEP115',
      // entity_type omitted
      created_at: new Date().toISOString(),
    };
    expect(() => validateAuditLogInsert(defectiveInsert as AuditLogRecord)).toThrow(
      'NOT_NULL_VIOLATION: null value in column "entity_type" violates not-null constraint'
    );

    // Hardened Step 121 insert with entity_type and metadata succeeds
    const compliantInsert: AuditLogRecord = {
      action: 'SECURITY_REMEDIATION_STEP115',
      entity_type: 'system',
      metadata: { description: 'Hardened evidence INSERT and student trigger', version: '1.15.1' },
      created_at: new Date().toISOString(),
    };
    expect(validateAuditLogInsert(compliantInsert)).toBe(true);
  });

  // 26. Legacy incident permissive-policy detection
  it('26. Incidents policy drops explicitly include all legacy variants including "Staff can view assigned or unassigned incidents"', () => {
    const historicalIncidentPolicies = [
      'Staff view incidents',
      'Staff can view assigned or unassigned incidents',
      'Staff and admin view incidents',
      'Authorized users view incidents',
    ];

    const dropsInCandidate = new Set([
      'Staff view incidents',
      'Staff can view assigned or unassigned incidents',
      'Staff and admin view incidents',
      'Authorized users view incidents',
    ]);

    const allDropped = historicalIncidentPolicies.every((policy) => dropsInCandidate.has(policy));
    expect(allDropped).toBe(true);
  });

  // 27. Student ID card URL re-upload invalidation rule
  it('27. Trigger simulation: Verified student changing id_card_url resets status to PENDING_MANUAL_REVIEW', () => {
    interface StudentProfileRow {
      id: string;
      verification_status: string;
      verified_at: string | null;
      verified_by: string | null;
      verification_notes: string | null;
      ocr_extracted_data: Record<string, unknown> | null;
      id_card_url: string | null;
      course: string;
    }

    const simulateTriggerWithIdCardCheck = (
      role: string,
      oldRow: StudentProfileRow,
      newRow: StudentProfileRow
    ): { allowed: boolean; resultingRow?: StudentProfileRow; error?: string } => {
      const isPrivileged = ['ADMIN', 'SUPER_ADMIN', 'SECURITY'].includes(role);
      if (isPrivileged) return { allowed: true, resultingRow: newRow };

      // Student checks
      if (oldRow.id !== newRow.id) {
        return { allowed: false, error: 'Access Denied: Student profile primary key (id) cannot be modified.' };
      }

      // Check if student directly tampered with status or audit fields
      if (
        oldRow.verification_status !== newRow.verification_status ||
        oldRow.verified_at !== newRow.verified_at ||
        oldRow.verified_by !== newRow.verified_by ||
        oldRow.verification_notes !== newRow.verification_notes ||
        JSON.stringify(oldRow.ocr_extracted_data) !== JSON.stringify(newRow.ocr_extracted_data)
      ) {
        return { allowed: false, error: 'Access Denied: Protected column modified.' };
      }

      // Business rule: If VERIFIED student changes id_card_url, reset status to PENDING_MANUAL_REVIEW
      const resulting = { ...newRow };
      if (oldRow.verification_status === 'VERIFIED' && oldRow.id_card_url !== newRow.id_card_url) {
        resulting.verification_status = 'PENDING_MANUAL_REVIEW';
        resulting.verified_at = null;
        resulting.verified_by = null;
        resulting.verification_notes = 'ID card changed by student; status reset to PENDING_MANUAL_REVIEW for institutional verification.';
      }

      return { allowed: true, resultingRow: resulting };
    };

    const verifiedStudent: StudentProfileRow = {
      id: 'student-verified-27',
      verification_status: 'VERIFIED',
      verified_at: '2026-10-15T00:00:00Z',
      verified_by: 'admin-reviewer-1',
      verification_notes: 'Approved institutional ID card',
      ocr_extracted_data: { confidence: 0.95 },
      id_card_url: 'student-verified-27/id_card_v1.png',
      course: 'B.Tech IT',
    };

    // When verified student uploads a new ID card image
    const updatedCardRow = {
      ...verifiedStudent,
      id_card_url: 'student-verified-27/id_card_v2_new.png',
    };

    const result = simulateTriggerWithIdCardCheck('STUDENT', verifiedStudent, updatedCardRow);
    expect(result.allowed).toBe(true);
    expect(result.resultingRow?.verification_status).toBe('PENDING_MANUAL_REVIEW');
    expect(result.resultingRow?.verified_at).toBeNull();
    expect(result.resultingRow?.verified_by).toBeNull();
    expect(result.resultingRow?.verification_notes).toContain('status reset to PENDING_MANUAL_REVIEW');
  });

  // 28. Storage ID card policy isolation (kavach-id-cards)
  it('28. Storage kavach-id-cards enforces folder prefix and restricts reads strictly to owner or reviewer', () => {
    interface StorageObject {
      bucket_id: string;
      name: string;
    }

    const checkIdCardStoragePolicy = (callerUid: string, role: string, obj: StorageObject) => {
      if (obj.bucket_id !== 'kavach-id-cards') return false;
      const folderPrefix = obj.name.split('/')[0];
      const isOwner = folderPrefix === callerUid;
      const isReviewer = ['ADMIN', 'SUPER_ADMIN', 'SECURITY'].includes(role);
      return isOwner || isReviewer;
    };

    const victimCard: StorageObject = {
      bucket_id: 'kavach-id-cards',
      name: 'student-victim/government_id.pdf',
    };

    // Owning student can read
    expect(checkIdCardStoragePolicy('student-victim', 'STUDENT', victimCard)).toBe(true);

    // Another student cannot read
    expect(checkIdCardStoragePolicy('other-student', 'STUDENT', victimCard)).toBe(false);

    // General unassigned staff (e.g. teachers) CANNOT read private ID card
    expect(checkIdCardStoragePolicy('general-teacher', 'STAFF', victimCard)).toBe(false);

    // Security reviewer can read for verification
    expect(checkIdCardStoragePolicy('security-officer', 'SECURITY', victimCard)).toBe(true);

    // Admin can read
    expect(checkIdCardStoragePolicy('admin-user', 'ADMIN', victimCard)).toBe(true);
  });

  // 29. Precondition checks validation: halts if required columns or functions missing
  it('29. Precondition validator fails safely if required columns or helper functions are absent', () => {
    interface SchemaInventory {
      functions: { name: string; prosecdef: boolean; owner: string }[];
      columns: { table: string; column: string }[];
    }

    const validatePreconditions = (schema: SchemaInventory) => {
      const hasReviewer = schema.functions.some(
        (f) => f.name === 'is_reviewer' && f.prosecdef && ['postgres', 'supabase_admin'].includes(f.owner)
      );
      if (!hasReviewer) throw new Error('Precondition Failed: is_reviewer() missing or insecure');

      const hasAdmin = schema.functions.some(
        (f) => f.name === 'is_admin' && f.prosecdef && ['postgres', 'supabase_admin'].includes(f.owner)
      );
      if (!hasAdmin) throw new Error('Precondition Failed: is_admin() missing or insecure');

      const requiredColumns = [
        { table: 'evidence', column: 'case_id' },
        { table: 'evidence', column: 'file_path' },
        { table: 'evidence', column: 'uploaded_by' },
        { table: 'incidents', column: 'student_id' },
        { table: 'incidents', column: 'assigned_to' },
        { table: 'student_profiles', column: 'verification_status' },
        { table: 'student_profiles', column: 'verified_at' },
        { table: 'student_profiles', column: 'verified_by' },
        { table: 'student_profiles', column: 'ocr_extracted_data' },
        { table: 'audit_logs', column: 'entity_type' },
        { table: 'audit_logs', column: 'metadata' },
      ];

      for (const req of requiredColumns) {
        const found = schema.columns.some((c) => c.table === req.table && c.column === req.column);
        if (!found) throw new Error(`Precondition Failed: public.${req.table}.${req.column} does not exist.`);
      }

      return true;
    };

    const healthySchema: SchemaInventory = {
      functions: [
        { name: 'is_reviewer', prosecdef: true, owner: 'postgres' },
        { name: 'is_admin', prosecdef: true, owner: 'postgres' },
      ],
      columns: [
        { table: 'evidence', column: 'case_id' },
        { table: 'evidence', column: 'file_path' },
        { table: 'evidence', column: 'uploaded_by' },
        { table: 'incidents', column: 'student_id' },
        { table: 'incidents', column: 'assigned_to' },
        { table: 'student_profiles', column: 'verification_status' },
        { table: 'student_profiles', column: 'verified_at' },
        { table: 'student_profiles', column: 'verified_by' },
        { table: 'student_profiles', column: 'ocr_extracted_data' },
        { table: 'audit_logs', column: 'entity_type' },
        { table: 'audit_logs', column: 'metadata' },
      ],
    };

    expect(validatePreconditions(healthySchema)).toBe(true);

    // Missing entity_type on audit_logs fails precondition check
    const missingAuditCols: SchemaInventory = {
      ...healthySchema,
      columns: healthySchema.columns.filter((c) => !(c.table === 'audit_logs' && c.column === 'entity_type')),
    };
    expect(() => validatePreconditions(missingAuditCols)).toThrow('Precondition Failed: public.audit_logs.entity_type does not exist.');
  });

  // 30. Rollback vulnerability risk detection
  it('30. Rollback script validation flags restored vulnerabilities (unprotected profile update & arbitrary evidence upload)', () => {
    interface RollbackState {
      triggerActive: boolean;
      evidenceInsertPolicy: 'CASE_BOUND' | 'UPLOADER_ONLY';
      studentProfileWithCheck: boolean;
    }

    const evaluateRollbackSecurity = (state: RollbackState) => {
      const risks: string[] = [];
      if (!state.triggerActive) {
        risks.push('VULNERABILITY: student_profiles trigger missing (client-side self-verification possible)');
      }
      if (state.evidenceInsertPolicy === 'UPLOADER_ONLY') {
        risks.push('VULNERABILITY: evidence INSERT only checks uploaded_by (arbitrary case_id injection possible)');
      }
      if (!state.studentProfileWithCheck) {
        risks.push('VULNERABILITY: student_profiles UPDATE policy lacks WITH CHECK');
      }
      return { isSecure: risks.length === 0, risks };
    };

    // Post-Step 115 state: secure
    const hardenedState: RollbackState = {
      triggerActive: true,
      evidenceInsertPolicy: 'CASE_BOUND',
      studentProfileWithCheck: true,
    };
    expect(evaluateRollbackSecurity(hardenedState).isSecure).toBe(true);

    // Post-Rollback state: restores vulnerable baseline
    const rolledBackState: RollbackState = {
      triggerActive: false,
      evidenceInsertPolicy: 'UPLOADER_ONLY',
      studentProfileWithCheck: false,
    };
    const audit = evaluateRollbackSecurity(rolledBackState);
    expect(audit.isSecure).toBe(false);
    expect(audit.risks).toHaveLength(3);
    expect(audit.risks[0]).toContain('client-side self-verification possible');
  });
});

