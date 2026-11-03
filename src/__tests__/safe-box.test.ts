import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, DELETE } from '@/app/api/student/safe-box/route';

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

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockSupabase),
}));

describe('Safe Box API (/api/student/safe-box)', () => {
  const studentUser = { id: 'usr-student-123', email: 'student@srkr.edu.in' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/student/safe-box', () => {
    it('returns 401 Unauthorized when user is not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('No session') });

      const res = await GET();
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 200 with list of evidence and signed URLs for authenticated student', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: studentUser }, error: null });

      const mockEvidenceList = [
        {
          id: 'ev-1',
          case_id: 'SAFEBOX-USR-STUD',
          file_path: 'usr-student-123/12345-photo.jpg',
          file_name: 'photo.jpg',
          file_size: 10240,
          mime_type: 'image/jpeg',
          type: 'IMAGE',
          uploaded_by: studentUser.id,
          created_at: '2026-11-01T10:00:00Z',
        },
      ];

      const queryMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockEvidenceList, error: null }),
      };
      mockFrom.mockReturnValue(queryMock);

      mockStorageFrom.mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://supabase.co/storage/v1/object/sign/kavach-evidence/photo.jpg?token=abc' },
          error: null,
        }),
      });

      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.count).toBe(1);
      expect(json.items[0].id).toBe('ev-1');
      expect(json.items[0].signedUrl).toContain('photo.jpg?token=abc');
    });

    it('returns 500 when database query fails', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: studentUser }, error: null });

      const queryMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB connection error') }),
      };
      mockFrom.mockReturnValue(queryMock);

      const res = await GET();
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toContain('Failed to retrieve Safe Box records');
    });
  });

  describe('POST /api/student/safe-box', () => {
    it('returns 401 Unauthorized when user is not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('No session') });

      const formData = new FormData();
      formData.set('file', new File(['content'], 'test.png', { type: 'image/png' }));
      const req = new Request('http://localhost/api/student/safe-box', { method: 'POST', body: formData });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 when no file is uploaded', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: studentUser }, error: null });

      const formData = new FormData();
      const req = new Request('http://localhost/api/student/safe-box', { method: 'POST', body: formData });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Evidence file is required');
    });

    it('returns 400 when file exceeds 25MB maximum limit', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: studentUser }, error: null });

      const largeBlob = new Blob([new Uint8Array(26 * 1024 * 1024)]);
      const file = new File([largeBlob], 'large.mp4', { type: 'video/mp4' });
      const formData = new FormData();
      formData.set('file', file);
      const req = new Request('http://localhost/api/student/safe-box', { method: 'POST', body: formData });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('exceeds maximum 25MB limit');
    });

    it('returns 400 for disallowed mime types (e.g., .exe, .sh)', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: studentUser }, error: null });

      const file = new File(['binary'], 'script.sh', { type: 'application/x-sh' });
      const formData = new FormData();
      formData.set('file', file);
      const req = new Request('http://localhost/api/student/safe-box', { method: 'POST', body: formData });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Unsupported format');
    });

    it('successfully uploads valid evidence file and records in database', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: studentUser }, error: null });

      const file = new File(['valid photo content'], 'evidence.png', { type: 'image/png' });
      const formData = new FormData();
      formData.set('file', file);
      formData.set('notes', 'Suspicious person outside campus hostel');

      mockStorageFrom.mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'path/to/evidence.png' }, error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://storage/signed/evidence.png' },
          error: null,
        }),
      });

      const mockDbRow = {
        id: 'ev-new-uuid',
        case_id: 'SAFEBOX-USR-STUD',
        type: 'IMAGE',
        file_path: 'usr-student-123/evidence.png',
        file_name: 'evidence.png',
        file_size: file.size,
        mime_type: 'image/png',
        uploaded_by: studentUser.id,
        created_at: '2026-11-01T12:00:00Z',
      };

      const insertMock = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockDbRow, error: null }),
      };
      mockFrom.mockReturnValue(insertMock);

      const req = new Request('http://localhost/api/student/safe-box', { method: 'POST', body: formData });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.item.fileName).toBe('evidence.png');
      expect(json.item.type).toBe('IMAGE');
      expect(json.item.notes).toBe('Suspicious person outside campus hostel');
    });
  });

  describe('DELETE /api/student/safe-box', () => {
    it('returns 401 Unauthorized when user is not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('No session') });

      const req = new Request('http://localhost/api/student/safe-box?id=ev-1', { method: 'DELETE' });
      const res = await DELETE(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 when id query parameter is missing', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: studentUser }, error: null });

      const req = new Request('http://localhost/api/student/safe-box', { method: 'DELETE' });
      const res = await DELETE(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Evidence ID is required');
    });

    it('returns 404 when evidence is not found or owned by a different user', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: studentUser }, error: null });

      const queryMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockFrom.mockReturnValue(queryMock);

      const req = new Request('http://localhost/api/student/safe-box?id=ev-nonexistent', { method: 'DELETE' });
      const res = await DELETE(req);
      expect(res.status).toBe(404);
    });

    it('successfully deletes record and removes file from storage when owned by student', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: studentUser }, error: null });

      const existingRecord = {
        id: 'ev-mine',
        file_path: 'usr-student-123/test.jpg',
        uploaded_by: studentUser.id,
      };

      const selectMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: existingRecord, error: null }),
        delete: vi.fn().mockReturnThis(),
      };
      mockFrom.mockReturnValue(selectMock);

      const removeMock = vi.fn().mockResolvedValue({ error: null });
      mockStorageFrom.mockReturnValue({
        remove: removeMock,
      });

      const req = new Request('http://localhost/api/student/safe-box?id=ev-mine', { method: 'DELETE' });
      const res = await DELETE(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain('Evidence deleted from Safe Box');
      expect(removeMock).toHaveBeenCalled();
    });
  });
});
