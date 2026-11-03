import { describe, expect, it } from 'vitest';
import { validateUploadSignature } from '@/lib/verification/upload-file';

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

describe('Evidence upload signature validation', () => {
  it.each([
    ['image/jpeg', bytes(0xff, 0xd8, 0xff, 0xe0)],
    ['image/png', bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)],
    ['image/gif', bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61)],
    ['image/webp', bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50)],
    ['application/pdf', bytes(0x25, 0x50, 0x44, 0x46)],
    ['audio/ogg', bytes(0x4f, 0x67, 0x67, 0x53)],
    ['audio/wav', bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45)],
    ['audio/mpeg', bytes(0x49, 0x44, 0x33, 0x04)],
    ['video/webm', bytes(0x1a, 0x45, 0xdf, 0xa3)],
    ['audio/webm', bytes(0x1a, 0x45, 0xdf, 0xa3)],
    ['video/mp4', bytes(0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d)],
    ['audio/mp4', bytes(0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20)],
    ['video/quicktime', bytes(0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20)],
  ])('accepts supported %s content by signature', (mimeType, content) => {
    expect(validateUploadSignature(content, mimeType)).toEqual({ valid: true, mimeType });
  });

  it('rejects a supported-looking MIME type when the content signature disagrees', () => {
    expect(validateUploadSignature(bytes(0x4d, 0x5a, 0x90, 0), 'image/png').valid).toBe(false);
    expect(validateUploadSignature(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), 'application/pdf').valid).toBe(false);
  });

  it('rejects unsupported MIME types, empty files, and unknown content', () => {
    expect(validateUploadSignature(bytes(1, 2, 3, 4), 'application/x-sh').valid).toBe(false);
    expect(validateUploadSignature(new Uint8Array(), 'image/jpeg').valid).toBe(false);
    expect(validateUploadSignature(bytes(1, 2, 3, 4), 'image/jpeg').valid).toBe(false);
  });

  it('uses the detected signature when the browser supplies no MIME type', () => {
    expect(validateUploadSignature(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), '')).toEqual({
      valid: true,
      mimeType: 'image/png',
    });
  });
});
