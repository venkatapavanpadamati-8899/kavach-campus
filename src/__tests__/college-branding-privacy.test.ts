import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getActiveCollegeTenant,
  getCollegeBranding,
} from '@/lib/college-branding';

describe('college branding privacy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses generic branding when no verified college identifier is available', () => {
    const branding = getCollegeBranding();

    expect(branding.id).toBe('unassigned');
    expect(branding.name).toBe('Kavach Campus');
    expect(branding.name).not.toContain('SRKR');
    expect(branding.name).not.toContain('Vishnu');
  });

  it('does not infer a college when client storage has no authenticated tenant', () => {
    vi.stubGlobal('window', {
      localStorage: { getItem: vi.fn(() => null) },
    });

    const tenant = getActiveCollegeTenant();

    expect(tenant.id).toBe('unassigned');
    expect(tenant.shortName).toBe('Kavach Campus');
  });

  it('only resolves a named branding when an explicit identifier is supplied', () => {
    expect(getCollegeBranding('srkr-bhimavaram').shortName).toBe('SRKR Engineering College');
    expect(getCollegeBranding('vit-bhimavaram').shortName).toBe('Vishnu Institute of Technology');
  });
});
