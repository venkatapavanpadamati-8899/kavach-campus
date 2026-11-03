import { describe, it, expect } from 'vitest';
import { STAFF_HIERARCHY, isStaffRole, isManagementRole, getStaffRoleByCode } from '@/lib/staff-roles';

describe('Staff Hierarchy & Role Management', () => {
  it('contains all 16 roles in the strict hierarchical order from Principal down to Security Officer', () => {
    expect(STAFF_HIERARCHY).toHaveLength(16);

    const expectedCodes = [
      'PRINCIPAL',
      'PROVOST',
      'VICE_PRINCIPAL',
      'DEAN',
      'HOD',
      'PROFESSOR',
      'ASSOCIATE_PROFESSOR',
      'ASSISTANT_PROFESSOR',
      'JUNIOR_PROFESSOR',
      'LECTURER',
      'TEACHER',
      'MENTOR',
      'COUNSELOR',
      'ADMINISTRATIVE_OFFICER',
      'NON_TEACHING_STAFF',
      'SECURITY',
    ];

    expectedCodes.forEach((expectedCode, idx) => {
      expect(STAFF_HIERARCHY[idx].code).toBe(expectedCode);
      expect(STAFF_HIERARCHY[idx].level).toBe(idx + 1);
    });
  });

  it('correctly categorizes management and leadership roles', () => {
    expect(isManagementRole('PRINCIPAL')).toBe(true);
    expect(isManagementRole('Principal')).toBe(true);
    expect(isManagementRole('PROVOST')).toBe(true);
    expect(isManagementRole('VICE_PRINCIPAL')).toBe(true);
    expect(isManagementRole('Vice Principal')).toBe(true);
    expect(isManagementRole('DEAN')).toBe(true);
    expect(isManagementRole('HOD')).toBe(true);
    expect(isManagementRole('CAMPUS_ADMIN')).toBe(true);

    expect(isManagementRole('PROFESSOR')).toBe(false);
    expect(isManagementRole('SECURITY')).toBe(false);
    expect(isManagementRole('STUDENT')).toBe(false);
  });

  it('validates any member in STAFF_HIERARCHY with isStaffRole', () => {
    STAFF_HIERARCHY.forEach((role) => {
      expect(isStaffRole(role.code)).toBe(true);
      expect(isStaffRole(role.title)).toBe(true);
    });

    expect(isStaffRole('STAFF')).toBe(true);
    expect(isStaffRole('WOMENS_CELL')).toBe(true);
    expect(isStaffRole('WARDEN')).toBe(true);

    expect(isStaffRole('STUDENT')).toBe(false);
    expect(isStaffRole('SUPER_ADMIN')).toBe(false);
  });

  it('fetches staff role metadata with getStaffRoleByCode', () => {
    const principal = getStaffRoleByCode('PRINCIPAL');
    expect(principal).toBeDefined();
    expect(principal?.title).toBe('Principal');
    expect(principal?.level).toBe(1);
    expect(principal?.category).toBe('LEADERSHIP');

    const security = getStaffRoleByCode('SECURITY');
    expect(security).toBeDefined();
    expect(security?.level).toBe(16);
    expect(security?.category).toBe('SAFETY');
  });
});
