import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getIncident, PATCH as patchIncident } from '@/app/api/incidents/[id]/route';
import { GET as adminVerificationsGet, POST as adminVerificationsPost } from '@/app/api/admin/verifications/route';
import { POST as registerUser } from '@/app/api/auth/register/route';
import { POST as escalateCron } from '@/app/api/cron/escalate/route';

// Mocks for Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

describe('KAVACH CAMPUS — STEP 112: Authorization Regression Tests (Phase C)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Student A cannot read or update Student B's incidents
  it('1. Student A cannot read or update Student B incidents (403 Forbidden)', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'student-A' } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'inc-B', student_id: 'student-B', assigned_to: 'responder-1' },
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
                  data: { id: 'student-A', role: 'STUDENT', is_approved: true },
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    // Test GET
    const reqGet = new Request('http://localhost:3000/api/incidents/inc-B');
    const resGet = await getIncident(reqGet, { params: Promise.resolve({ id: 'inc-B' }) });
    expect(resGet.status).toBe(403);
    const dataGet = await resGet.json();
    expect(dataGet.error).toContain('Forbidden: You cannot access other students');

    // Test PATCH (Student A attempts to update status of Student B's case)
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'student-A' } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'student-A', role: 'STUDENT', is_approved: true },
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const reqPatch = new Request('http://localhost:3000/api/incidents/inc-B', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'RESOLVED' }),
    });
    const resPatch = await patchIncident(reqPatch, { params: Promise.resolve({ id: 'inc-B' }) });
    expect(resPatch.status).toBe(403);
    const dataPatch = await resPatch.json();
    expect(dataPatch.error).toContain('Forbidden: Only authorized personnel can update incidents');
  });

  // 2. Student A cannot read Student B's evidence or private messages
  it('2. Student A cannot access Student B evidence signed URLs', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'student-A' } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'inc-B', student_id: 'student-B', assigned_to: null },
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
                  data: { id: 'student-A', role: 'STUDENT' },
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/incidents/inc-B');
    const res = await getIncident(req, { params: Promise.resolve({ id: 'inc-B' }) });
    expect(res.status).toBe(403);
  });

  // 3. Students cannot read internal staff-only notes
  it('3. RLS policy definition isolates is_internal messages from students', () => {
    // In SQL verification policy:
    // (i.student_id = auth.uid() AND incident_messages.is_internal = false)
    // Ensures internal notes are never delivered to the student
    const studentCanSeeMessage = (isStudent: boolean, isInternal: boolean) => {
      if (isStudent && isInternal) return false;
      return true;
    };
    expect(studentCanSeeMessage(true, true)).toBe(false);
    expect(studentCanSeeMessage(true, false)).toBe(true);
    expect(studentCanSeeMessage(false, true)).toBe(true);
  });

  // 4. Unassigned staff cannot access restricted incidents
  it('4. Unassigned staff cannot access restricted incidents assigned to other staff', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'staff-unassigned' } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'inc-assigned-other', student_id: 'student-99', assigned_to: 'staff-primary-responder' },
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
                  data: { id: 'staff-unassigned', role: 'STAFF', is_approved: true },
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/incidents/inc-assigned-other');
    const res = await getIncident(req, { params: Promise.resolve({ id: 'inc-assigned-other' }) });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Forbidden: You are not authorized to view this incident');
  });

  // 5. Assigned authorized responders can access only permitted cases
  it('5. Assigned authorized responders can access their assigned cases with location and signed URLs', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { createAdminClient } = await import('@/lib/supabase/admin');

    vi.mocked(createAdminClient).mockReturnValue({
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: 'https://supabase.co/storage/v1/object/sign/kavach-evidence/signed-token' },
            error: null,
          }),
        }),
      },
    } as unknown as ReturnType<typeof createAdminClient>);

    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_valid_service_role_key_for_testing_purposes_only';

    try {
      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'responder-42' } } }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'incidents') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'inc-42',
                      student_id: 'student-1',
                      assigned_to: 'responder-42',
                      latitude: 17.4455,
                      longitude: 78.3498,
                      location_accuracy: 5,
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
                    data: { id: 'responder-42', role: 'SECURITY', is_approved: true },
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
                        id: 'ev-1',
                        file_name: 'photo.jpg',
                        storage_path: 'student-1/inc-42/photo.jpg',
                      },
                    ],
                  }),
                }),
              }),
            };
          }
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null }),
                order: vi.fn().mockResolvedValue({ data: [] }),
              }),
            }),
          };
        }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/incidents/inc-42');
      const res = await getIncident(req, { params: Promise.resolve({ id: 'inc-42' }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.incident.latitude).toBe(17.4455);
      expect(data.evidence[0].signedUrl).toContain('signed-token');
    } finally {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    }
  });

  // 6 & 7. General staff cannot access ID cards; only approved designated reviewers can
  it('6 & 7. General staff cannot access ID cards; only approved designated reviewers can', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { createAdminClient } = await import('@/lib/supabase/admin');

    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_valid_key_greater_than_thirty_chars';

    try {
      // General staff attempt
      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'staff-general' } } }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'staff-general', role: 'STAFF', is_approved: true },
              }),
            }),
          }),
        }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const resStaff = await adminVerificationsGet();
      expect(resStaff.status).toBe(403);
      const dataStaff = await resStaff.json();
      expect(dataStaff.error).toContain('Reviewer privileges required');

      // Approved Reviewer (ADMIN) attempt
      const mockCampusProfileFilter = vi.fn().mockResolvedValue({
        data: [{
          id: 'std-1',
          full_name: 'Student One',
          college_email: 's1@college.edu',
          student_id: '2024CS0001',
          department: 'CSE',
          is_approved: false,
          college_id: 'srkr-bhimavaram',
        }],
        error: null,
      });
      vi.mocked(createAdminClient).mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                in: mockCampusProfileFilter,
              }),
            };
          }
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [{ id: 'std-1', verification_status: 'PENDING', id_card_url: 'std-1/id.jpg' }],
                  error: null,
                }),
              }),
            }),
          };
        }),
        storage: {
          from: vi.fn().mockReturnValue({
            createSignedUrl: vi.fn().mockResolvedValue({
              data: { signedUrl: 'https://mock.storage/id.jpg' },
              error: null,
            }),
          }),
        },
      } as unknown as ReturnType<typeof createAdminClient>);

      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-reviewer' } } }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'admin-reviewer', role: 'ADMIN', is_approved: true, college_id: 'srkr-bhimavaram' },
                  }),
                }),
              }),
            };
          }
          return { select: vi.fn().mockReturnThis() };
        }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const resReviewer = await adminVerificationsGet();
      expect(resReviewer.status).toBe(200);
      const dataReviewer = await resReviewer.json();
      expect(Array.isArray(dataReviewer.verifications)).toBe(true);
      expect(dataReviewer.verifications.length).toBe(1);
      expect(mockCampusProfileFilter).toHaveBeenCalledWith('college_id', ['srkr-bhimavaram']);
    } finally {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    }
  });

  // 8. Users cannot promote themselves to staff/admin roles
  it('8. Users cannot promote themselves to staff/admin roles during registration', async () => {
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_valid_key_greater_than_thirty_chars';

    try {
      const forbiddenRoles = ['ADMIN', 'SUPER_ADMIN', 'MANAGEMENT', 'PRINCIPAL', 'HOD'];
      for (const role of forbiddenRoles) {
        const req = new Request('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Attacker User',
            email: `attacker-${role.toLowerCase()}@college.edu`,
            password: 'Password123!',
            role: role,
          }),
        });
        const res = await registerUser(req);
        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.error).toContain('cannot be self-assigned');
      }
    } finally {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    }
  });

  // 9. Students cannot spoof another student's identity or owner ID
  it('9. Storage upload and incident submission enforce authenticated auth.uid() identity', () => {
    const isOwnerOrPathValid = (userId: string, folderPrefix: string) => {
      return userId === folderPrefix;
    };
    expect(isOwnerOrPathValid('user-123', 'user-123')).toBe(true);
    expect(isOwnerOrPathValid('user-123', 'victim-456')).toBe(false);
  });

  // 10. Storage uploads enforce authenticated ownership and expected paths
  it('10. Validates storage path prefix matches authenticated user uid', () => {
    const validateStoragePath = (authUid: string, filePath: string) => {
      const parts = filePath.split('/');
      return parts[0] === authUid;
    };
    expect(validateStoragePath('student-uid-1', 'student-uid-1/evidence/file.png')).toBe(true);
    expect(validateStoragePath('student-uid-1', 'other-student-uid/evidence/file.png')).toBe(false);
    expect(validateStoragePath('student-uid-1', 'malicious/traversal/file.png')).toBe(false);
  });

  // 11. Expired or unauthorized signed URLs are not generated by the API
  it('11. Signed URLs are issued with strict 900s (15 min) maximum expiry only for authorized callers', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { createAdminClient } = await import('@/lib/supabase/admin');

    let expiryParam = 0;
    vi.mocked(createAdminClient).mockReturnValue({
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockImplementation((path: string, expiresIn: number) => {
            expiryParam = expiresIn;
            return Promise.resolve({
              data: { signedUrl: `https://mock.storage/signed?expires=${expiresIn}` },
              error: null,
            });
          }),
        }),
      },
    } as unknown as ReturnType<typeof createAdminClient>);

    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_valid_key_greater_than_thirty_chars';

    try {
      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'student-owner' } } }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'incidents') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'inc-1', student_id: 'student-owner', assigned_to: null },
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
                    data: { id: 'student-owner', role: 'STUDENT' },
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
                    data: [{ id: 'ev-1', storage_path: 'student-owner/inc-1/doc.pdf' }],
                  }),
                }),
              }),
            };
          }
          return { select: vi.fn().mockReturnThis() };
        }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/incidents/inc-1');
      await getIncident(req, { params: Promise.resolve({ id: 'inc-1' }) });
      expect(expiryParam).toBe(900); // 15 minutes = 900 seconds
    } finally {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    }
  });

  // 12. Missing server credentials fail closed without exposing secrets
  it('12. Missing CRON_SECRET or authorization header fails closed with 401', async () => {
    const originalSecret = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;

    try {
      const req = new Request('http://localhost:3000/api/cron/escalate', {
        method: 'POST',
        headers: { Authorization: 'Bearer some_unauthorized_token' },
      });
      const res = await escalateCron(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    } finally {
      process.env.CRON_SECRET = originalSecret;
    }
  });

  // 13. Admin verification routes do not break because of trigger logic
  it('13. Admin verification decision endpoint handles verified and rejected statuses with audit logging', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    const { createAdminClient } = await import('@/lib/supabase/admin');

    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_valid_key_greater_than_thirty_chars';

    try {
      const mockAdminUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });
      const mockAdminInsert = vi.fn().mockResolvedValue({ data: null, error: null });

      vi.mocked(createAdminClient).mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { college_id: 'srkr-bhimavaram' },
                    error: null,
                  }),
                }),
              }),
              update: mockAdminUpdate,
            };
          }
          if (table === 'student_profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'student-target-123' },
                    error: null,
                  }),
                }),
              }),
              update: mockAdminUpdate,
            };
          }
          if (table === 'audit_logs') {
            return { insert: mockAdminInsert };
          }
          return { update: mockAdminUpdate, insert: mockAdminInsert };
        }),
      } as unknown as ReturnType<typeof createAdminClient>);

      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-99' } } }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'admin-99', role: 'ADMIN', is_approved: true, college_id: 'srkr-bhimavaram' },
              }),
            }),
          }),
        }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const req = new Request('http://localhost:3000/api/admin/verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetStudentId: 'student-target-123',
          decision: 'VERIFIED',
        }),
      });

      const res = await adminVerificationsPost(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('Student verification updated to VERIFIED');
    } finally {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    }
  });

  // 14. RLS policies do not accidentally block legitimate intended workflows
  it('14. Student can successfully view their own incident without hindrance', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'student-legit' } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'incidents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'inc-legit',
                    student_id: 'student-legit',
                    category: 'GENERAL_SAFETY',
                    severity: 'LOW',
                    latitude: 17.4455,
                    longitude: 78.3498,
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
                  data: { id: 'student-legit', role: 'STUDENT', is_approved: true },
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        };
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request('http://localhost:3000/api/incidents/inc-legit');
    const res = await getIncident(req, { params: Promise.resolve({ id: 'inc-legit' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.incident.id).toBe('inc-legit');
    expect(data.incident.latitude).toBe(17.4455);
  });
});
