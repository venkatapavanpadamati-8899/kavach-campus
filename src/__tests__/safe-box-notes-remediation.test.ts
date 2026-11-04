import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/student/safe-box/route';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockStorageFrom = vi.fn();

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
  storage: {
    from: mockStorageFrom,
  },
};

function configureFrom(tableMocks: Record<string, unknown>, role = 'STUDENT') {
  const profileQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { role }, error: null }),
  };
  mockFrom.mockImplementation((table: string) => (
    table === 'profiles' ? profileQuery : tableMocks[table]
  ));
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockSupabase),
}));

describe('Phase 13A Remediation: Safe Box Private Notes & Debounce Guard', () => {
  const studentUser = { id: 'usr-student-phase13a', email: 'student13a@srkr.edu.in' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Migration available: successfully persists evidence and private note', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: studentUser }, error: null });

    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], 'incident_proof.png', { type: 'image/png' });
    const formData = new FormData();
    formData.set('file', file);
    formData.set('notes', 'Confidential note from student');

    mockStorageFrom.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'path/to/incident_proof.png' }, error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://storage/signed/incident_proof.png' },
        error: null,
      }),
    });

    const mockDbRow = {
      id: 'ev-phase13a-1',
      case_id: null,
      type: 'IMAGE',
      file_path: 'usr-student-phase13a/incident_proof.png',
      file_name: 'incident_proof.png',
      file_size: file.size,
      mime_type: 'image/png',
      uploaded_by: studentUser.id,
      created_at: '2026-11-04T20:00:00Z',
    };

    const evidenceMock = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), // No duplicate
      single: vi.fn().mockResolvedValue({ data: mockDbRow, error: null }),
    };

    const noteInsertMock = vi.fn().mockResolvedValue({ error: null });

    configureFrom({
      evidence: evidenceMock,
      safe_box_private_notes: { insert: noteInsertMock },
    });

    const req = new Request('http://localhost/api/student/safe-box', { method: 'POST', body: formData });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.noteSaved).toBe(true);
    expect(json.noteStatus).toBe('SAVED');
    expect(json.warning).toBeUndefined();
    expect(json.item.notes).toBe('Confidential note from student');
    expect(noteInsertMock).toHaveBeenCalledWith({
      evidence_id: 'ev-phase13a-1',
      owner_id: studentUser.id,
      private_note: 'Confidential note from student',
    });
  });

  it('2. Migration 016 unapplied (42P01 table missing): returns structured partial success with warning', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: studentUser }, error: null });

    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], 'harassment_audio.png', { type: 'image/png' });
    const formData = new FormData();
    formData.set('file', file);
    formData.set('notes', 'Private witness statement');

    mockStorageFrom.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'path/to/harassment_audio.png' }, error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://storage/signed/harassment_audio.png' },
        error: null,
      }),
    });

    const mockDbRow = {
      id: 'ev-phase13a-2',
      case_id: null,
      type: 'IMAGE',
      file_path: 'usr-student-phase13a/harassment_audio.png',
      file_name: 'harassment_audio.png',
      file_size: file.size,
      mime_type: 'image/png',
      uploaded_by: studentUser.id,
      created_at: '2026-11-04T20:05:00Z',
    };

    const evidenceMock = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: mockDbRow, error: null }),
    };

    // Simulate 42P01 PostgreSQL error: relation "safe_box_private_notes" does not exist
    const noteInsertMock = vi.fn().mockResolvedValue({
      error: { code: '42P01', message: 'relation "safe_box_private_notes" does not exist' },
    });

    configureFrom({
      evidence: evidenceMock,
      safe_box_private_notes: { insert: noteInsertMock },
    });

    const req = new Request('http://localhost/api/student/safe-box', { method: 'POST', body: formData });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    // CRITICAL: noteSaved MUST be false, noteStatus MUST be UNAVAILABLE, notes in item MUST be null
    expect(json.noteSaved).toBe(false);
    expect(json.noteStatus).toBe('UNAVAILABLE');
    expect(json.warning).toContain('Private note persistence is temporarily unavailable (migration 016 pending)');
    expect(json.item.notes).toBeNull();
    // Evidence file itself must still be safely saved
    expect(json.item.id).toBe('ev-phase13a-2');
  });

  it('3. Unexpected database error during note persistence triggers rollback with 500', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: studentUser }, error: null });

    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], 'error_test.png', { type: 'image/png' });
    const formData = new FormData();
    formData.set('file', file);
    formData.set('notes', 'Should roll back');

    const removeStorageMock = vi.fn().mockResolvedValue({ error: null });
    mockStorageFrom.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'path/to/error_test.png' }, error: null }),
      remove: removeStorageMock,
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'mock-url' }, error: null }),
    });

    const mockDbRow = {
      id: 'ev-phase13a-rollback',
      case_id: null,
      type: 'IMAGE',
      file_path: 'usr-student-phase13a/error_test.png',
      file_name: 'error_test.png',
      file_size: file.size,
      mime_type: 'image/png',
      uploaded_by: studentUser.id,
      created_at: '2026-11-04T20:10:00Z',
    };

    const evidenceDeleteMock = vi.fn().mockReturnThis();
    const evidenceMock = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: mockDbRow, error: null }),
      delete: evidenceDeleteMock,
    };

    // Generic non-42P01 error (e.g. unique constraint violation, disk error)
    const noteInsertMock = vi.fn().mockResolvedValue({
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    });

    configureFrom({
      evidence: evidenceMock,
      safe_box_private_notes: { insert: noteInsertMock },
    });

    const req = new Request('http://localhost/api/student/safe-box', { method: 'POST', body: formData });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('Failed to save the private note; the upload was rolled back');
    // Ensure rollback was executed on both evidence DB table and storage
    expect(evidenceDeleteMock).toHaveBeenCalled();
    expect(removeStorageMock).toHaveBeenCalled();
  });

  it('4. Rejects unauthenticated upload with 401', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Unauthorized') });

    const formData = new FormData();
    const req = new Request('http://localhost/api/student/safe-box', { method: 'POST', body: formData });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('5. Rejects non-student accounts with 403', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: studentUser }, error: null });
    configureFrom({}, 'FACULTY');

    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], 'test.png', { type: 'image/png' });
    const formData = new FormData();
    formData.set('file', file);

    const req = new Request('http://localhost/api/student/safe-box', { method: 'POST', body: formData });
    const res = await POST(req);

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Student access required');
  });

  it('6. Duplicate submission debounce guard rejects identical upload within 5s with 409', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: studentUser }, error: null });

    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], 'repeat.png', { type: 'image/png' });
    const formData = new FormData();
    formData.set('file', file);

    // Duplicate check returns an existing recent upload
    const evidenceMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'existing-ev-1', file_name: 'repeat.png', created_at: new Date().toISOString() },
        error: null,
      }),
    };

    configureFrom({
      evidence: evidenceMock,
    });

    const req = new Request('http://localhost/api/student/safe-box', { method: 'POST', body: formData });
    const res = await POST(req);

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain('Duplicate upload detected');
  });

  it('7. GET endpoint reports notesServiceAvailable: false when migration 016 is unapplied', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: studentUser }, error: null });

    const mockEvidenceList = [
      {
        id: 'ev-test-get-1',
        case_id: null,
        file_path: 'usr-student-phase13a/proof.png',
        file_name: 'proof.png',
        file_size: 2048,
        mime_type: 'image/png',
        type: 'IMAGE',
        uploaded_by: studentUser.id,
        created_at: '2026-11-04T20:15:00Z',
      },
    ];

    configureFrom({
      evidence: {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockEvidenceList, error: null }),
      },
      safe_box_private_notes: {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '42P01', message: 'relation "safe_box_private_notes" does not exist' },
        }),
      },
    });

    mockStorageFrom.mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://storage/signed/proof.png' },
        error: null,
      }),
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.notesServiceAvailable).toBe(false);
    expect(json.items[0].notes).toBeNull();
  });
});
