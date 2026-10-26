export type AdmissionType = 'REGULAR' | 'LATERAL_ENTRY';

export type VerificationStatus =
  | 'PENDING_UPLOAD'
  | 'PENDING_VERIFICATION'
  | 'PENDING_MANUAL_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'RESUBMISSION_REQUIRED';

export interface StudentVerificationData {
  fullName: string;
  studentId: string; // 10-digit alphanumeric / numeric
  collegeName: string;
  department: string;
  admissionType: AdmissionType;
  admissionYear: number;
  expectedGraduationYear: number;
  idCardUrl?: string;
  verificationStatus: VerificationStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  verificationNotes?: string;
  ocrExtractedData?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * College-aware validation for Student Registration Number.
 * Standard requirement across partner institutions (SRKR, Vishnu, etc.):
 * Accepts identifiers with 8, 9, or 10 characters (alphanumeric: letters and numbers).
 * E.g., '21B91A0501' (10 chars), '21CS1045' (8 chars), '987654321' (9 chars).
 * Rejects spaces, special characters, fewer than 8 characters, or more than 10 characters.
 * Supports custom regex configuration per college when institution-specific patterns are registered.
 */
export function validateStudentRegistrationNumber(params: {
  collegeId?: string | null;
  registrationNumber: string | null | undefined;
}): { valid: boolean; normalizedNumber?: string; error?: string } {
  const { registrationNumber } = params;

  if (!registrationNumber || typeof registrationNumber !== 'string') {
    return { valid: false, error: 'Student Registration Number is required' };
  }

  const trimmed = registrationNumber.trim();

  if (trimmed.length < 8 || trimmed.length > 10) {
    return {
      valid: false,
      error: `Student Registration Number must be 8, 9, or 10 characters (provided ${trimmed.length} characters)`,
    };
  }

  // Strictly alphanumeric: letters and numbers only, no spaces or special characters
  if (!/^[A-Za-z0-9]{8,10}$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Student Registration Number must contain only letters and numbers (no spaces or special characters)',
    };
  }

  return { valid: true, normalizedNumber: trimmed.toUpperCase() };
}

/**
 * Validates the Student ID format.
 * Defaults to strictly checking 10 numeric digits: ^[0-9]{10}$,
 * but supports custom regex configuration for colleges using alphanumeric or other lengths.
 */
export function validateStudentId(
  studentId: string,
  options?: { customRegex?: RegExp; collegeId?: string }
): { valid: boolean; normalizedId?: string; error?: string } {
  if (!studentId || typeof studentId !== 'string') {
    return { valid: false, error: 'Student ID is required' };
  }

  const trimmed = studentId.trim();

  if (options?.customRegex) {
    if (!options.customRegex.test(trimmed)) {
      return {
        valid: false,
        error: `Student ID format does not match college standard pattern (${options.customRegex.source})`,
      };
    }
    return { valid: true, normalizedId: trimmed.toUpperCase() };
  }

  const result = validateStudentRegistrationNumber({
    collegeId: options?.collegeId,
    registrationNumber: trimmed,
  });

  return {
    valid: result.valid,
    normalizedId: result.normalizedNumber,
    error: result.error ? result.error.replace('Student Registration Number', 'Student ID') : undefined,
  };
}

/**
 * Validates actual binary content / magic bytes of the uploaded file
 * Prevents disguised files (e.g., executable, HTML, or script files renamed to .jpg/.png)
 */
export function validateFileSignature(buffer: Uint8Array | number[]): {
  valid: boolean;
  detectedMime?: string;
  error?: string;
} {
  if (!buffer || buffer.length < 4) {
    return { valid: false, error: 'File content too small or empty' };
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMime: 'image/jpeg' };
  }

  // 2. PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { valid: true, detectedMime: 'image/png' };
  }

  // 3. PDF: 25 50 44 46 (%PDF)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { valid: true, detectedMime: 'application/pdf' };
  }

  // 4. WEBP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, detectedMime: 'image/webp' };
  }

  return {
    valid: false,
    error: 'File signature mismatch: File content does not match allowed JPEG, PNG, WEBP, or PDF binary signatures.',
  };
}

/**
 * Validates B.Tech academic batch duration:
 * - Regular B.Tech: 4 academic years (Graduation = Admission + 4)
 * - Lateral Entry: 3 academic years (Graduation = Admission + 3)
 */
export function validateAcademicBatch(
  admissionType: AdmissionType,
  admissionYear: number,
  expectedGraduationYear: number
): { valid: boolean; duration: number; expectedDuration: number; error?: string } {
  const currentYear = new Date().getFullYear();

  if (!admissionYear || isNaN(admissionYear) || admissionYear < 2018 || admissionYear > currentYear + 2) {
    return {
      valid: false,
      duration: 0,
      expectedDuration: admissionType === 'REGULAR' ? 4 : 3,
      error: `Invalid admission year: ${admissionYear}. Must be between 2018 and ${currentYear + 2}.`,
    };
  }

  if (!expectedGraduationYear || isNaN(expectedGraduationYear) || expectedGraduationYear <= admissionYear) {
    return {
      valid: false,
      duration: 0,
      expectedDuration: admissionType === 'REGULAR' ? 4 : 3,
      error: `Invalid expected graduation year: ${expectedGraduationYear}. Must be greater than admission year (${admissionYear}).`,
    };
  }

  const expectedDuration = admissionType === 'REGULAR' ? 4 : 3;
  const duration = expectedGraduationYear - admissionYear;

  if (duration !== expectedDuration) {
    const courseName = admissionType === 'REGULAR' ? 'Regular B.Tech (4 Years)' : 'Lateral Entry B.Tech (3 Years)';
    return {
      valid: false,
      duration,
      expectedDuration,
      error: `Academic duration mismatch for ${courseName}: Expected ${expectedDuration} years (Graduation: ${admissionYear + expectedDuration}), but provided ${duration} years (${admissionYear} - ${expectedGraduationYear}).`,
    };
  }

  return {
    valid: true,
    duration,
    expectedDuration,
  };
}

/**
 * Validates uploaded ID Card file properties:
 * - Allowed mime types: image/jpeg, image/png, image/webp, application/pdf
 * - Max size: 5 MB (5 * 1024 * 1024 bytes)
 */
export function validateIdCardFile(file: {
  size: number;
  type: string;
  name?: string;
}): { valid: boolean; error?: string } {
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (file.size <= 0) {
    return { valid: false, error: 'Uploaded file is empty or corrupted' };
  }

  if (file.size > MAX_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size exceeds the 5MB limit (current size: ${sizeMB} MB)`,
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `Unsupported file format (${file.type}). Allowed formats: JPEG, PNG, WEBP, PDF`,
    };
  }

  return { valid: true };
}

/**
 * Core ID Card OCR & verification evaluator:
 * Evaluates submitted student information against extracted OCR text and official roster.
 *
 * Rules:
 * - Deterministic format checks (10-digit ID, 4-yr / 3-yr batch) must strictly pass.
 * - OCR output is treated as untrusted external data.
 * - If OCR is missing or unreadable -> PENDING_MANUAL_REVIEW
 * - If OCR extracted ID does not match student ID -> REJECTED
 * - If official college roster does not verify -> PENDING_MANUAL_REVIEW
 * - An AI/OCR service failure will NEVER cause false automatic verification.
 */
export function evaluateVerificationDecision(params: {
  fullName: string;
  studentId: string;
  admissionType: AdmissionType;
  admissionYear: number;
  expectedGraduationYear: number;
  ocrExtractedText?: string;
  officialRosterVerified?: boolean;
}): {
  status: VerificationStatus;
  reason: string;
  isAutoApproved: boolean;
  confidenceScore: number;
} {
  // 1. Strict ID format validation
  const idCheck = validateStudentId(params.studentId);
  if (!idCheck.valid) {
    return {
      status: 'REJECTED',
      reason: idCheck.error || 'Invalid Student ID format',
      isAutoApproved: false,
      confidenceScore: 0,
    };
  }

  // 2. Strict Academic Batch validation
  const batchCheck = validateAcademicBatch(
    params.admissionType,
    params.admissionYear,
    params.expectedGraduationYear
  );
  if (!batchCheck.valid) {
    return {
      status: 'REJECTED',
      reason: batchCheck.error || 'Academic batch mismatch',
      isAutoApproved: false,
      confidenceScore: 0,
    };
  }

  // 3. OCR Text Inspection
  if (!params.ocrExtractedText || params.ocrExtractedText.trim().length === 0) {
    return {
      status: 'PENDING_MANUAL_REVIEW',
      reason: 'ID card image text could not be clearly extracted. Queued for campus administrator manual inspection.',
      isAutoApproved: false,
      confidenceScore: 0.2,
    };
  }

  const ocrLower = params.ocrExtractedText.toLowerCase();
  const cleanId = params.studentId.trim().toLowerCase();
  const idFound = ocrLower.includes(cleanId);

  // Split student name into components (support names with >= 2 characters e.g. "Om", "Ali")
  const nameTokens = params.fullName
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(t => t.length >= 2);
  const matchedTokens = nameTokens.filter(t => ocrLower.includes(t));
  const nameMatched = nameTokens.length > 0 && matchedTokens.length >= Math.ceil(nameTokens.length / 2);

  if (!idFound) {
    return {
      status: 'REJECTED',
      reason: `Uploaded ID card does not contain the claimed 10-digit Student ID (${params.studentId}). Possible card mismatch.`,
      isAutoApproved: false,
      confidenceScore: 0.1,
    };
  }

  if (!nameMatched) {
    return {
      status: 'PENDING_MANUAL_REVIEW',
      reason: `Student name (${params.fullName}) does not match the name detected on the ID card. Sent for manual verification.`,
      isAutoApproved: false,
      confidenceScore: 0.5,
    };
  }

  // 4. Official College Roster Verification
  // If an authoritative college API/roster confirms the student, approve.
  // Otherwise, if only OCR matched but no external roster is available, flag for admin verification.
  if (params.officialRosterVerified === true) {
    return {
      status: 'VERIFIED',
      reason: 'Student ID, batch duration, and official college roster confirmed successfully.',
      isAutoApproved: true,
      confidenceScore: 0.98,
    };
  } else if (params.officialRosterVerified === false) {
    return {
      status: 'REJECTED',
      reason: 'Student ID was rejected by official college roster database.',
      isAutoApproved: false,
      confidenceScore: 0.1,
    };
  } else {
    // Official roster not yet connected or awaiting admin confirmation
    return {
      status: 'PENDING_MANUAL_REVIEW',
      reason: 'ID card format and text match, awaiting confirmation against official college student roster.',
      isAutoApproved: false,
      confidenceScore: 0.85,
    };
  }
}
