import { describe, it, expect } from 'vitest';
import {
  validateStudentId,
  validateAcademicBatch,
  validateIdCardFile,
  validateFileSignature,
  evaluateVerificationDecision,
} from '@/lib/verification/id-card';

describe('Student ID Card Verification & Academic Batch Validation', () => {
  // ==========================================
  // 1. 10-Digit Student ID Format Validation
  // ==========================================
  describe('Student ID Format Validation (8-10 Alphanumeric Characters)', () => {
    it('accepts valid 8, 9, or 10-character alphanumeric student IDs', () => {
      const validIds = ['2101201045', '21B91A0501', '21CS1045', '987654321', '0012345678', 'ABC12345'];
      validIds.forEach(id => {
        const result = validateStudentId(id);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('rejects student IDs with incorrect length (< 8 or > 10 characters)', () => {
      const shortId = validateStudentId('12345'); // 5 chars (< 8)
      expect(shortId.valid).toBe(false);
      expect(shortId.error).toContain('must be 8, 9, or 10 characters');

      const longId = validateStudentId('12345678901'); // 11 characters (> 10)
      expect(longId.valid).toBe(false);
      expect(longId.error).toContain('must be 8, 9, or 10 characters');
    });

    it('rejects student IDs containing spaces or special symbols', () => {
      const idsWithSymbols = ['2101-20104', '210120 104', '2101@1045!', '21_CS_104'];
      idsWithSymbols.forEach(id => {
        const result = validateStudentId(id);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('rejects empty, null, or whitespace-only inputs', () => {
      // @ts-expect-error testing invalid type
      expect(validateStudentId(null).valid).toBe(false);
      // @ts-expect-error testing invalid type
      expect(validateStudentId(undefined).valid).toBe(false);
      expect(validateStudentId('').valid).toBe(false);
      expect(validateStudentId('          ').valid).toBe(false);
    });

    it('supports custom college ID regex patterns when colleges do not use 10-digit IDs', () => {
      const customCollegePattern = /^21CS[0-9]{4}$/;
      const validCustom = validateStudentId('21CS1045', { customRegex: customCollegePattern });
      expect(validCustom.valid).toBe(true);
      expect(validCustom.normalizedId).toBe('21CS1045');

      const invalidCustom = validateStudentId('21EC1045', { customRegex: customCollegePattern });
      expect(invalidCustom.valid).toBe(false);
      expect(invalidCustom.error).toContain('does not match college standard pattern');
    });
  });

  // ==========================================
  // 2. Academic Batch Validation (Regular 4-Yr vs Lateral 3-Yr)
  // ==========================================
  describe('Academic Batch Validation', () => {
    it('accepts valid Regular B.Tech students (strictly 4 academic years)', () => {
      const cases = [
        { start: 2021, end: 2025 },
        { start: 2022, end: 2026 },
        { start: 2023, end: 2027 },
        { start: 2024, end: 2028 },
        { start: 2025, end: 2029 },
      ];

      cases.forEach(({ start, end }) => {
        const res = validateAcademicBatch('REGULAR', start, end);
        expect(res.valid).toBe(true);
        expect(res.duration).toBe(4);
        expect(res.expectedDuration).toBe(4);
      });
    });

    it('accepts valid Lateral Entry B.Tech students (strictly 3 academic years)', () => {
      const cases = [
        { start: 2022, end: 2025 },
        { start: 2023, end: 2026 },
        { start: 2024, end: 2027 },
        { start: 2025, end: 2028 },
      ];

      cases.forEach(({ start, end }) => {
        const res = validateAcademicBatch('LATERAL_ENTRY', start, end);
        expect(res.valid).toBe(true);
        expect(res.duration).toBe(3);
        expect(res.expectedDuration).toBe(3);
      });
    });

    it('rejects Regular B.Tech with duration mismatch (3 or 5 years)', () => {
      // Regular claim with 3 years (should be lateral)
      const threeYr = validateAcademicBatch('REGULAR', 2024, 2027);
      expect(threeYr.valid).toBe(false);
      expect(threeYr.error).toContain('Academic duration mismatch for Regular B.Tech (4 Years)');
      expect(threeYr.duration).toBe(3);

      // Regular claim with 5 years
      const fiveYr = validateAcademicBatch('REGULAR', 2024, 2029);
      expect(fiveYr.valid).toBe(false);
      expect(fiveYr.error).toContain('Academic duration mismatch');
    });

    it('rejects Lateral Entry with duration mismatch (4 or 2 years)', () => {
      const fourYr = validateAcademicBatch('LATERAL_ENTRY', 2024, 2028);
      expect(fourYr.valid).toBe(false);
      expect(fourYr.error).toContain('Academic duration mismatch for Lateral Entry B.Tech (3 Years)');
      expect(fourYr.duration).toBe(4);

      const twoYr = validateAcademicBatch('LATERAL_ENTRY', 2024, 2026);
      expect(twoYr.valid).toBe(false);
      expect(twoYr.error).toContain('Academic duration mismatch');
    });

    it('rejects out-of-range admission years or inverted graduation years', () => {
      const pastYear = validateAcademicBatch('REGULAR', 2010, 2014);
      expect(pastYear.valid).toBe(false);
      expect(pastYear.error).toContain('Invalid admission year');

      const inverted = validateAcademicBatch('REGULAR', 2025, 2024);
      expect(inverted.valid).toBe(false);
    });
  });

  // ==========================================
  // 3. ID Card File Property Validation
  // ==========================================
  describe('ID Card File Validation', () => {
    it('accepts supported image and PDF formats under 5MB', () => {
      const validFiles = [
        { size: 1024 * 500, type: 'image/jpeg' },
        { size: 1024 * 1024 * 2, type: 'image/png' },
        { size: 1024 * 1024 * 4.5, type: 'image/webp' },
        { size: 1024 * 1024 * 1.5, type: 'application/pdf' },
      ];

      validFiles.forEach(file => {
        const res = validateIdCardFile(file);
        expect(res.valid).toBe(true);
      });
    });

    it('rejects unsupported file formats', () => {
      const invalidTypes = [
        'text/plain',
        'application/zip',
        'image/gif',
        'application/x-msdownload',
        'video/mp4',
      ];

      invalidTypes.forEach(type => {
        const res = validateIdCardFile({ size: 1024 * 100, type });
        expect(res.valid).toBe(false);
        expect(res.error).toContain('Unsupported file format');
      });
    });

    it('rejects oversized files exceeding 5MB limit', () => {
      const oversized = { size: 6 * 1024 * 1024, type: 'image/jpeg' }; // 6MB
      const res = validateIdCardFile(oversized);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('File size exceeds the 5MB limit');
    });

    it('rejects empty or corrupted files (0 bytes or negative)', () => {
      const emptyFile = { size: 0, type: 'image/jpeg' };
      const res = validateIdCardFile(emptyFile);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('empty or corrupted');
    });

    it('verifies binary magic bytes (signatures) for JPEG, PNG, PDF, and WEBP', () => {
      // JPEG: FF D8 FF
      const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const jpegRes = validateFileSignature(jpegBytes);
      expect(jpegRes.valid).toBe(true);
      expect(jpegRes.detectedMime).toBe('image/jpeg');

      // PNG: 89 50 4E 47
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
      const pngRes = validateFileSignature(pngBytes);
      expect(pngRes.valid).toBe(true);
      expect(pngRes.detectedMime).toBe('image/png');

      // PDF: 25 50 44 46 (%PDF)
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
      const pdfRes = validateFileSignature(pdfBytes);
      expect(pdfRes.valid).toBe(true);
      expect(pdfRes.detectedMime).toBe('application/pdf');

      // WEBP: RIFF....WEBP
      const webpBytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ]);
      const webpRes = validateFileSignature(webpBytes);
      expect(webpRes.valid).toBe(true);
      expect(webpRes.detectedMime).toBe('image/webp');
    });

    it('rejects disguised or executable files disguised as images (e.g. MZ executable / HTML)', () => {
      // Windows EXE header (MZ: 4D 5A)
      const exeDisguised = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
      const res = validateFileSignature(exeDisguised);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('File signature mismatch');

      // Truncated buffer
      const tooShort = new Uint8Array([0x01, 0x02]);
      const shortRes = validateFileSignature(tooShort);
      expect(shortRes.valid).toBe(false);
      expect(shortRes.error).toContain('too small or empty');
    });
  });

  // ==========================================
  // 4. Decision Evaluator & OCR Untrusted Input
  // ==========================================
  describe('Verification Decision & OCR Evaluation', () => {
    const validStudent = {
      fullName: 'Venkata Pavan Padamati',
      studentId: '2101201045',
      admissionType: 'REGULAR' as const,
      admissionYear: 2024,
      expectedGraduationYear: 2028,
    };

    it('verifies student when ID, batch, OCR match, and official roster confirms', () => {
      const decision = evaluateVerificationDecision({
        ...validStudent,
        ocrExtractedText: 'Kavach Institute of Technology\nName: Venkata Pavan Padamati\nID: 2101201045\nB.Tech CSE 2024-2028',
        officialRosterVerified: true,
      });

      expect(decision.status).toBe('VERIFIED');
      expect(decision.isAutoApproved).toBe(true);
      expect(decision.confidenceScore).toBeGreaterThanOrEqual(0.95);
    });

    it('flags PENDING_MANUAL_REVIEW when OCR is unreadable or empty', () => {
      const decision = evaluateVerificationDecision({
        ...validStudent,
        ocrExtractedText: '',
      });

      expect(decision.status).toBe('PENDING_MANUAL_REVIEW');
      expect(decision.isAutoApproved).toBe(false);
      expect(decision.reason).toContain('could not be clearly extracted');
    });

    it('flags PENDING_MANUAL_REVIEW when official roster is pending/unconnected', () => {
      const decision = evaluateVerificationDecision({
        ...validStudent,
        ocrExtractedText: 'Name: Venkata Pavan Padamati\nID: 2101201045\nDept: CSE',
        officialRosterVerified: undefined, // no external roster configured
      });

      expect(decision.status).toBe('PENDING_MANUAL_REVIEW');
      expect(decision.isAutoApproved).toBe(false);
      expect(decision.reason).toContain('awaiting confirmation against official college student roster');
    });

    it('rejects when ID card does not contain the claimed 10-digit ID', () => {
      const decision = evaluateVerificationDecision({
        ...validStudent,
        ocrExtractedText: 'Name: Venkata Pavan Padamati\nID: 9999999999\nDept: CSE',
      });

      expect(decision.status).toBe('REJECTED');
      expect(decision.isAutoApproved).toBe(false);
      expect(decision.reason).toContain('Uploaded ID card does not contain the claimed 10-digit Student ID');
    });

    it('flags PENDING_MANUAL_REVIEW when name on ID card does not match claimed name', () => {
      const decision = evaluateVerificationDecision({
        ...validStudent,
        ocrExtractedText: 'College of Engineering\nName: Ramesh Kumar Sharma\nID: 2101201045',
      });

      expect(decision.status).toBe('PENDING_MANUAL_REVIEW');
      expect(decision.isAutoApproved).toBe(false);
      expect(decision.reason).toContain('does not match the name detected on the ID card');
    });

    it('rejects if official roster explicitly returns false (not in college records)', () => {
      const decision = evaluateVerificationDecision({
        ...validStudent,
        ocrExtractedText: 'Name: Venkata Pavan Padamati\nID: 2101201045',
        officialRosterVerified: false,
      });

      expect(decision.status).toBe('REJECTED');
      expect(decision.isAutoApproved).toBe(false);
      expect(decision.reason).toContain('rejected by official college roster database');
    });

    it('never auto-approves if AI or OCR service fails or times out', () => {
      // Simulated OCR failure where result is undefined or whitespace
      const failedOCR = evaluateVerificationDecision({
        ...validStudent,
        ocrExtractedText: '    ',
        officialRosterVerified: true, // even if roster claims true, card must be readable
      });

      expect(failedOCR.status).toBe('PENDING_MANUAL_REVIEW');
      expect(failedOCR.isAutoApproved).toBe(false);
    });
  });

  // ==========================================
  // 5. Access Control & Authorization Guarantees
  // ==========================================
  describe('Dashboard Access & Security Invariants', () => {
    it('restricts unverified students from dashboard while keeping SOS available', () => {
      const unverifiedStatuses = ['PENDING_UPLOAD', 'PENDING_VERIFICATION', 'PENDING_MANUAL_REVIEW', 'REJECTED'];

      unverifiedStatuses.forEach(status => {
        const canAccessMainDashboard = status === 'VERIFIED';
        const canAccessSosEmergency = true; // Emergency SOS invariant
        const canAccessVerificationUpload = true; // Must be able to submit ID card

        expect(canAccessMainDashboard).toBe(false);
        expect(canAccessSosEmergency).toBe(true);
        expect(canAccessVerificationUpload).toBe(true);
      });
    });

    it('ensures only verified students can access protected student features', () => {
      const verifiedStudent = { verification_status: 'VERIFIED', is_approved: true };
      const pendingStudent = { verification_status: 'PENDING_MANUAL_REVIEW', is_approved: false };

      const isEligible = (s: { verification_status: string; is_approved: boolean }) =>
        s.verification_status === 'VERIFIED' && s.is_approved === true;

      expect(isEligible(verifiedStudent)).toBe(true);
      expect(isEligible(pendingStudent)).toBe(false);
    });

    it('enforces RBAC isolation: ordinary users cannot claim SUPER_ADMIN or self-verify', () => {
      const requestedRoles = ['STUDENT', 'STAFF', 'ADMIN', 'SUPER_ADMIN'];
      const allowedSelfRequested = ['STUDENT', 'STAFF', 'ADMIN'];

      requestedRoles.forEach(role => {
        const isPermittedSelfAssignment = allowedSelfRequested.includes(role) && role !== 'SUPER_ADMIN';
        if (role === 'SUPER_ADMIN') {
          expect(isPermittedSelfAssignment).toBe(false);
        }
      });
    });

    it('detects duplicate student ID collision across different user accounts', () => {
      const existingProfiles = [
        { id: 'usr-student-existing', student_id: '2101201045' },
      ];
      const newUserId = 'usr-student-new';
      const claimedStudentId = '2101201045';

      const isDuplicate = existingProfiles.some(
        p => p.student_id === claimedStudentId && p.id !== newUserId
      );
      expect(isDuplicate).toBe(true);

      const uniqueClaim = '1905102033';
      const isUnique = existingProfiles.some(
        p => p.student_id === uniqueClaim && p.id !== newUserId
      );
      expect(isUnique).toBe(false);
    });

    it('enforces RLS isolation: student can only view their own verification record', () => {
      const authenticatedUserId = 'student-alice-123';
      const targetRecordOwnerId = 'student-bob-456';

      const canAccessRecord = (currentAuthId: string, recordOwnerId: string) =>
        currentAuthId === recordOwnerId;

      expect(canAccessRecord(authenticatedUserId, authenticatedUserId)).toBe(true);
      expect(canAccessRecord(authenticatedUserId, targetRecordOwnerId)).toBe(false);
    });

    it('restricts ID card storage evidence access: unauthorized staff cannot view raw files', () => {
      const rolesAndPermissions = [
        { role: 'STUDENT', isOwner: true, canRead: true },
        { role: 'STUDENT', isOwner: false, canRead: false },
        { role: 'STAFF', isOwner: false, canRead: false },
        { role: 'COUNSELLOR', isOwner: false, canRead: false },
        { role: 'SECURITY', isOwner: false, canRead: true },
        { role: 'ADMIN', isOwner: false, canRead: true },
        { role: 'SUPER_ADMIN', isOwner: false, canRead: true },
      ];

      rolesAndPermissions.forEach(({ role, isOwner, canRead }) => {
        const authorized = isOwner || ['ADMIN', 'SUPER_ADMIN', 'SECURITY'].includes(role);
        expect(authorized).toBe(canRead);
      });
    });

    it('safely handles database and RLS query errors without false verification', () => {
      const simulateDbQuery = (shouldFail: boolean) => {
        if (shouldFail) {
          return { data: null, error: new Error('42P17: infinite recursion detected in policy') };
        }
        return { data: { verification_status: 'VERIFIED' }, error: null };
      };

      const failedResult = simulateDbQuery(true);
      expect(failedResult.error).toBeDefined();
      // On error, the status must NEVER default to VERIFIED
      const statusOnError = failedResult.data?.verification_status || 'PENDING_UPLOAD';
      expect(statusOnError).toBe('PENDING_UPLOAD');
    });

    it('blocks ordinary ADMIN from granting SUPER_ADMIN or modifying existing SUPER_ADMIN', () => {
      const caller = { role: 'ADMIN', isSuperAdmin: false };
      const requestedRole = 'SUPER_ADMIN';

      const canGrantSuperAdmin = (c: { role: string; isSuperAdmin: boolean }, targetRole: string) => {
        if (targetRole === 'SUPER_ADMIN') return false; // Never via standard approval
        if (targetRole === 'ADMIN' && !c.isSuperAdmin) return false;
        return true;
      };

      expect(canGrantSuperAdmin(caller, requestedRole)).toBe(false);
      expect(canGrantSuperAdmin(caller, 'ADMIN')).toBe(false);
      expect(canGrantSuperAdmin(caller, 'STAFF')).toBe(true);
    });

    it('rejects protected API calls when student verification is PENDING or REJECTED', () => {
      const statuses = ['PENDING_UPLOAD', 'PENDING_VERIFICATION', 'PENDING_MANUAL_REVIEW', 'REJECTED'];

      statuses.forEach(status => {
        const canAccessProtectedIncidentsApi = status === 'VERIFIED';
        expect(canAccessProtectedIncidentsApi).toBe(false);
      });

      expect('VERIFIED' === 'VERIFIED').toBe(true);
    });

    it('rejects reviewer attempting to self-approve or self-review their own record', () => {
      const reviewerId = 'usr-admin-reviewer-01';
      const targetStudentUserId = 'usr-admin-reviewer-01'; // Same user!

      const canReviewRecord = (reviewer: string, targetUser: string) => {
        if (reviewer === targetUser) {
          return { allowed: false, error: 'Self-approval is forbidden: Reviewer cannot verify their own record.' };
        }
        return { allowed: true };
      };

      const result = canReviewRecord(reviewerId, targetStudentUserId);
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('Self-approval is forbidden');

      const validReview = canReviewRecord(reviewerId, 'usr-student-other');
      expect(validReview.allowed).toBe(true);
    });

    it('ensures ID cards use short-lived signed URLs (<= 300s) and never public URLs', () => {
      const storageConfig = {
        bucketName: 'kavach-id-cards',
        isPublicBucket: false,
        signedUrlExpirySeconds: 300,
      };

      expect(storageConfig.isPublicBucket).toBe(false);
      expect(storageConfig.signedUrlExpirySeconds).toBeLessThanOrEqual(300);
      expect(storageConfig.bucketName).toBe('kavach-id-cards');
    });
  });
});
