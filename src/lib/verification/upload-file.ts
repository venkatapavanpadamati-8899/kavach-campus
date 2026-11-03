export interface UploadSignatureResult {
  valid: boolean;
  mimeType?: string;
  error?: string;
}

const SUPPORTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'application/pdf',
]);

function readAscii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function detectedMime(bytes: Uint8Array): string | undefined {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8
    && bytes[0] === 0x89
    && readAscii(bytes, 1, 3) === 'PNG'
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (bytes.length >= 12 && readAscii(bytes, 0, 4) === 'RIFF') {
    if (readAscii(bytes, 8, 4) === 'WEBP') return 'image/webp';
    if (readAscii(bytes, 8, 4) === 'WAVE') return 'audio/wav';
  }
  if (bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(readAscii(bytes, 0, 6))) {
    return 'image/gif';
  }
  if (bytes.length >= 4 && readAscii(bytes, 0, 4) === '%PDF') {
    return 'application/pdf';
  }
  if (bytes.length >= 4 && readAscii(bytes, 0, 4) === 'OggS') {
    return 'audio/ogg';
  }
  if (bytes.length >= 4 && readAscii(bytes, 0, 4) === '\u001aEß£') {
    return 'webm';
  }
  if (bytes.length >= 12 && readAscii(bytes, 4, 4) === 'ftyp') {
    const brand = readAscii(bytes, 8, 4).toLowerCase();
    if (brand === 'qt  ') return 'video/quicktime';
    if (['m4a ', 'm4b ', 'm4p ', 'f4a ', 'f4b '].includes(brand)) return 'audio/mp4';
    return 'video/mp4';
  }
  if (bytes.length >= 3 && readAscii(bytes, 0, 3) === 'ID3') {
    return 'audio/mpeg';
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return 'audio/mpeg';
  }
  return undefined;
}

export function validateUploadSignature(
  bytes: Uint8Array,
  declaredMimeType: string
): UploadSignatureResult {
  if (bytes.length < 4) {
    return { valid: false, error: 'File content is empty or too small to validate.' };
  }

  const declaredMime = declaredMimeType.trim().toLowerCase();
  if (declaredMime && !SUPPORTED_MIME_TYPES.has(declaredMime)) {
    return { valid: false, error: 'Unsupported file type.' };
  }

  const detected = detectedMime(bytes);
  if (!detected) {
    return { valid: false, error: 'File content does not match a supported file format.' };
  }

  if (detected === 'webm') {
    if (declaredMime !== 'video/webm' && declaredMime !== 'audio/webm') {
      return { valid: false, error: 'File content does not match the declared supported file type.' };
    }
    return { valid: true, mimeType: declaredMime };
  }

  if (declaredMime && declaredMime !== detected) {
    return { valid: false, error: 'File content does not match the declared supported file type.' };
  }

  return { valid: true, mimeType: detected };
}
