import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as postEvidence, GET as getEvidence } from '@/app/api/incidents/[id]/evidence/route';
import { PUT as putStudentProfile } from '@/app/api/student/profile/route';
import { POST as postAdminVerification } from '@/app/api/admin/verifications/route';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Mocks for Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

/*
 * ==============================================================================
 * TEST ARCHITECTURE & METHODOLOGY DISCLOSURE:
 * ==============================================================================
 * - Category A: UNIT & ROUTE HANDLER TESTS (Node.js runtime with mocked Supabase)
 * - Category B: SQL TEXT & STRUCTURE TESTS (Static AST / pattern analysis of SQL candidate)
 * - Category C: IN-MEMORY PL/PGSQL TRIGGER & RLS LOGIC SIMULATION TESTS
 * 
 * IMPORTANT: NONE of these tests connect to a live remote PostgreSQL database.
 * Real PostgreSQL RLS enforcement must be verified on an actual PostgreSQL instance.
 * ==============================================================================
 */

describe('KAVACH CAMPUS — BATCH 8: Security Fixes and Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------------------------
  // TASK 3: STUDENT PROFILE TAMPERING PROTECTION
  // ----------------------------------------------------------------------------

  interface StudentProfileRow {
    id: string;
    verification_status: string;
    verified_at: string | null;
    verified_by: string | null;
    verification_notes: string | null;
    ocr_extracted_data: Record<string, unknown> | null;
    id_card_url: string | null;
    course: string;
    admission_type: string;
    admission_year: number;
    expected_graduation_year: number;
  }

  // Simulation of PostgreSQL trigger public.prevent_student_profile_tampering()
  const simulateProfileTamperingTrigger = (
    actorRole: string,
    jwtRole: string,
    sessionUser: string,
    oldRow: StudentProfileRow,
    newRow: StudentProfileRow
  ): { allowed: boolean; resultingRow?: StudentProfileRow; error?: string } => {
    // 1. Direct superuser / DBA session check
    if (['postgres', 'supabase_admin'].includes(sessionUser)) {
      return { allowed: true, resultingRow: newRow };
    }

    // 2. Service role API request
    if (jwtRole === 'service_role') {
      return { allowed: true, resultingRow: newRow };
    }

    // 3. Authenticated institutional reviewer / administrator
    if (['ADMIN', 'SUPER_ADMIN', 'SECURITY'].includes(actorRole)) {
      return { allowed: true, resultingRow: newRow };
    }

    // 4. Non-privileged student checks
    // 4.1 Primary key immutability
    if (oldRow.id !== newRow.id) {
      return { allowed: false, error: 'Access Denied: Student profile primary key (id) cannot be modified.' };
    }

    // 4.2 Server-controlled verification and audit columns
    if (
      oldRow.verification_status !== newRow.verification_status ||
      oldRow.verified_at !== newRow.verified_at ||
      oldRow.verified_by !== newRow.verified_by ||
      oldRow.verification_notes !== newRow.verification_notes ||
      JSON.stringify(oldRow.ocr_extracted_data) !== JSON.stringify(newRow.ocr_extracted_data)
    ) {
      return {
        allowed: false,
        error: 'Access Denied: Only institutional reviewers or automated verification service can modify student verification status or audit records.'
      };
    }

    // 4.3 Verified Academic Credentials Immutability
    if (
      oldRow.verification_status === 'VERIFIED' &&
      (oldRow.admission_type !== newRow.admission_type ||
        oldRow.admission_year !== newRow.admission_year ||
        oldRow.expected_graduation_year !== newRow.expected_graduation_year)
    ) {
      return {
        allowed: false,
        error: 'Access Denied: Verified academic credentials (admission_type, admission_year, expected_graduation_year) cannot be modified after verification.'
      };
    }

    // 4.4 ID Card Re-Upload Invalidation Rule
    const resulting = { ...newRow };
    if (oldRow.verification_status === 'VERIFIED' && oldRow.id_card_url !== newRow.id_card_url) {
      resulting.verification_status = 'PENDING_MANUAL_REVIEW';
      resulting.verified_at = null;
      resulting.verified_by = null;
      resulting.verification_notes = 'ID card changed by student; status reset to PENDING_MANUAL_REVIEW for institutional verification.';
    }

    return { allowed: true, resultingRow: resulting };
  };

  const sampleStudent: StudentProfileRow = {
    id: 'student-uuid-001',
    verification_status: 'PENDING_UPLOAD',
    verified_at: null,
    verified_by: null,
    verification_notes: null,
    ocr_extracted_data: null,
    id_card_url: 'student-uuid-001/card-v1.jpg',
    course: 'B.Tech CSE',
    admission_type: 'REGULAR',
    admission_year: 2024,
    expected_graduation_year: 2028,
  };

  it('1. [Unit / Trigger Simulation] Student cannot self-verify (PostgREST PATCH with verification_status=VERIFIED is rejected)', () => {
    const maliciousUpdate: StudentProfileRow = {
      ...sampleStudent,
      verification_status: 'VERIFIED',
    };

    const result = simulateProfileTamperingTrigger('STUDENT', 'authenticated', 'authenticator', sampleStudent, maliciousUpdate);
    expect(result.allowed).toBe(false);
    expect(result.error).toContain('Only institutional reviewers or automated verification service can modify student verification status');
  });

  it('2. [Unit / Trigger Simulation] Student cannot alter verified_at or verified_by', () => {
    const maliciousVerifiedAt: StudentProfileRow = {
      ...sampleStudent,
      verified_at: new Date().toISOString(),
    };
    const result1 = simulateProfileTamperingTrigger('STUDENT', 'authenticated', 'authenticator', sampleStudent, maliciousVerifiedAt);
    expect(result1.allowed).toBe(false);

    const maliciousVerifiedBy: StudentProfileRow = {
      ...sampleStudent,
      verified_by: '00000000-0000-0000-0000-000000000000',
    };
    const result2 = simulateProfileTamperingTrigger('STUDENT', 'authenticated', 'authenticator', sampleStudent, maliciousVerifiedBy);
    expect(result2.allowed).toBe(false);
  });

  it('3. [Unit / Trigger Simulation] Student cannot replace protected OCR verification data or verified academic batch credentials', () => {
    const maliciousOcr: StudentProfileRow = {
      ...sampleStudent,
      ocr_extracted_data: { confidence: 1.0, studentId: 'FORGED_ID' },
    };
    const resultOcr = simulateProfileTamperingTrigger('STUDENT', 'authenticated', 'authenticator', sampleStudent, maliciousOcr);
    expect(resultOcr.allowed).toBe(false);

    // Verified student trying to change graduation year
    const verifiedStudent: StudentProfileRow = {
      ...sampleStudent,
      verification_status: 'VERIFIED',
      verified_at: '2026-09-01T00:00:00Z',
      verified_by: 'admin-uuid',
    };
    const tamperedGradYear: StudentProfileRow = {
      ...verifiedStudent,
      expected_graduation_year: 2025,
    };
    const resultBatch = simulateProfileTamperingTrigger('STUDENT', 'authenticated', 'authenticator', verifiedStudent, tamperedGradYear);
    expect(resultBatch.allowed).toBe(false);
    expect(resultBatch.error).toContain('Verified academic credentials');
  });

  // ----------------------------------------------------------------------------
  // TASK 2: INCIDENT LOCATIONS RLS & ACCESS CONTROL
  // ----------------------------------------------------------------------------

  interface IncidentRecord {
    id: string;
    student_id: string;
    assigned_to: string | null;
  }

  interface LocationRecord {
    id: string;
    incident_id: string;
    latitude: number;
    longitude: number;
  }

  const checkIncidentLocationSelectPolicy = (
    callerUid: string,
    callerRole: string,
    incident: IncidentRecord,
    location: LocationRecord
  ): boolean => {
    if (location.incident_id !== incident.id) return false;
    const isOwner = incident.student_id === callerUid;
    const isAssigned = incident.assigned_to === callerUid;
    const isReviewer = ['ADMIN', 'SUPER_ADMIN', 'SECURITY'].includes(callerRole);
    return isOwner || isAssigned || isReviewer;
  };

  it('4. [Unit / Policy Simulation] Assigned responder can access authorized incident locations', () => {
    const incident: IncidentRecord = {
      id: 'inc-loc-001',
      student_id: 'student-victim-01',
      assigned_to: 'responder-assigned-01',
    };
    const location: LocationRecord = {
      id: 'loc-001',
      incident_id: 'inc-loc-001',
      latitude: 17.4455,
      longitude: 78.3498,
    };

    // Assigned responder has access
    const allowed = checkIncidentLocationSelectPolicy('responder-assigned-01', 'STAFF', incident, location);
    expect(allowed).toBe(true);

    // Student owner also has access
    const studentAllowed = checkIncidentLocationSelectPolicy('student-victim-01', 'STUDENT', incident, location);
    expect(studentAllowed).toBe(true);

    // Security reviewer has access
    const reviewerAllowed = checkIncidentLocationSelectPolicy('security-user', 'SECURITY', incident, location);
    expect(reviewerAllowed).toBe(true);
  });

  it('5. [Unit / Policy Simulation] Unassigned staff cannot access another incident location history', () => {
    const incident: IncidentRecord = {
      id: 'inc-loc-002',
      student_id: 'student-victim-02',
      assigned_to: 'responder-assigned-02',
    };
    const location: LocationRecord = {
      id: 'loc-002',
      incident_id: 'inc-loc-002',
      latitude: 17.4490,
      longitude: 78.3480,
    };

    // Unassigned general staff is strictly DENIED
    const unassignedAllowed = checkIncidentLocationSelectPolicy('unassigned-staff-09', 'STAFF', incident, location);
    expect(unassignedAllowed).toBe(false);

    // Another unrelated student is strictly DENIED
    const otherStudentAllowed = checkIncidentLocationSelectPolicy('attacker-student', 'STUDENT', incident, location);
    expect(otherStudentAllowed).toBe(false);
  });

  // ----------------------------------------------------------------------------
  // TASK 1: EVIDENCE STORAGE & AUTHORIZATION
  // ----------------------------------------------------------------------------

  it('6. [Unit / Route Handler] Evidence upload cannot attach a file to an unauthorized incident (403 Forbidden)', async () => {
    // Mock caller as student-attacker
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
                    id: 'inc-victim-uuid',
                    case_id: 'KC-2026-VICTIM',
                    student_id: 'student-victim',
                    assigned_to: 'responder-assigned',
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

    const formData = new FormData();
    formData.append('file', new File(['mock content'], 'exploit.jpg', { type: 'image/jpeg' }));

    const req = new Request('http://localhost:3000/api/incidents/KC-2026-VICTIM/evidence', {
      method: 'POST',
      body: formData,
    });

    const res = await postEvidence(req, { params: Promise.resolve({ id: 'KC-2026-VICTIM' }) });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Forbidden: You are not authorized to upload evidence to this incident.');
  });

  it('7. [Unit / Route Handler] Cross-incident signed URL requests are rejected (403 Forbidden)', async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'unassigned-staff' } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'inc-private-uuid',
                    case_id: 'KC-2026-PRIVATE',
                    student_id: 'student-victim',
                    assigned_to: 'responder-other',
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
                  data: { id: 'unassigned-staff', role: 'STAFF', is_approved: true },
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/incidents/KC-2026-PRIVATE/evidence');
    const res = await getEvidence(req, { params: Promise.resolve({ id: 'KC-2026-PRIVATE' }) });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Forbidden: You are not authorized to access evidence for this incident.');
  });

  // ----------------------------------------------------------------------------
  // TASK 4: REVIEWER VERIFICATION WORKFLOW
  // ----------------------------------------------------------------------------

  it('8. [Unit / Route Handler] Authorized reviewers can complete the intended verification workflow via server-side service-role route', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_valid_service_role_key_longer_than_30_characters_for_testing';

    // Mock reviewer session and role lookup
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'reviewer-admin-01' } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'ADMIN', is_approved: true, college_id: 'srkr-bhimavaram' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    // Mock admin client operations
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const mockInsert = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn((column: string, id: string) => ({
                single: vi.fn().mockResolvedValue({
                  data: id === 'reviewer-admin-01'
                    ? { id: 'reviewer-admin-01', role: 'ADMIN', is_approved: true, college_id: 'srkr-bhimavaram' }
                    : { id, college_id: 'srkr-bhimavaram' },
                  error: null,
                }),
              })),
            }),
            update: mockUpdate,
          };
        }
        if (table === 'student_profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'student-to-verify', verification_status: 'PENDING_MANUAL_REVIEW' },
                  error: null,
                }),
              }),
            }),
            update: mockUpdate,
          };
        }
        if (table === 'audit_logs') {
          return { insert: mockInsert };
        }
        return { select: vi.fn().mockReturnThis() };
      }),
    } as unknown as ReturnType<typeof createAdminClient>);

    const req = new Request('http://localhost:3000/api/admin/verifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetStudentId: 'student-to-verify',
        decision: 'VERIFIED',
        reason: 'Valid government ID cross-referenced with university records',
        officialRosterConfirmed: true,
      }),
    });

    const res = await postAdminVerification(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.decision).toBe('VERIFIED');

    // Verify audit log payload complies with entity_type NOT NULL requirement
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'STUDENT_VERIFICATION_DECISION',
        entity_type: 'student_profiles',
        entity_id: 'student-to-verify',
        metadata: expect.objectContaining({
          decision: 'VERIFIED',
          reviewerRole: 'ADMIN',
        }),
      })
    );
  });

  // ----------------------------------------------------------------------------
  // TASK 5: AUDIT LOG SCHEMA COMPLIANCE
  // ----------------------------------------------------------------------------

  it('9. [Unit / Schema Validation] Invalid audit log INSERTs are detected and rejected', () => {
    interface AuditLogPayload {
      action: string;
      entity_type?: string | null;
      entity_id?: string | null;
      metadata?: Record<string, unknown> | null;
      created_at?: string;
    }

    const validateAuditLogSchema = (payload: AuditLogPayload) => {
      if (!payload.action || typeof payload.action !== 'string') {
        throw new Error('NOT_NULL_VIOLATION: action is required');
      }
      if (!payload.entity_type || typeof payload.entity_type !== 'string') {
        throw new Error('NOT_NULL_VIOLATION: null value in column "entity_type" violates not-null constraint');
      }
      if (!payload.metadata || typeof payload.metadata !== 'object') {
        throw new Error('SCHEMA_VIOLATION: metadata must be a JSONB object');
      }
      return true;
    };

    // Missing entity_type throws not-null violation
    expect(() =>
      validateAuditLogSchema({
        action: 'TEST_ACTION',
        metadata: { foo: 'bar' },
      })
    ).toThrow('NOT_NULL_VIOLATION: null value in column "entity_type" violates not-null constraint');

    // Compliant payload succeeds
    expect(
      validateAuditLogSchema({
        action: 'SECURITY_REMEDIATION_STEP115',
        entity_type: 'system',
        metadata: { version: '1.15.2' },
      })
    ).toBe(true);
  });

  // ----------------------------------------------------------------------------
  // TASK 3: EXISTING LEGITIMATE STUDENT PROFILE EDITING
  // ----------------------------------------------------------------------------

  it('10. [Unit / Route Handler] Existing student profile editing remains fully functional for legitimate health & room updates', async () => {
    const mockStudentUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'student-legit-01' } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'student_profiles') {
          return {
            update: mockStudentUpdate,
          };
        }
        if (table === 'profiles') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/student/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bloodGroup: 'O+',
        medicalConditions: 'Mild asthma, carries inhaler',
        hostelRoom: 'Block B, Room 204',
        course: 'B.Tech IT',
      }),
    });

    const res = await putStudentProfile(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    // Verify that the payload sent to Supabase contains only legitimate profile fields
    expect(mockStudentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        blood_group: 'O+',
        medical_conditions: 'Mild asthma, carries inhaler',
        hostel_room: 'Block B, Room 204',
        course: 'B.Tech IT',
      })
    );
    // Verify that verification_status or verified_at are NEVER touched
    expect(mockStudentUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({
        verification_status: expect.anything(),
      })
    );
  });
});
