export interface StaffRoleDefinition {
  id: string;
  code: string;
  title: string;
  label: string;
  rank: number;
  level: number; // 1 is highest (Principal), 16 is lowest (Security Officer)
  category: 'LEADERSHIP' | 'FACULTY' | 'ACADEMIC_SUPPORT' | 'ADMINISTRATIVE' | 'SAFETY';
  description: string;
  requiresApproval: boolean;
}

/**
 * Complete Staff Hierarchy from Highest Leadership down to Campus Safety
 * Adheres strictly to the user requirement:
 * 1. Principal
 * 2. Provost
 * 3. Vice Principal
 * 4. Dean
 * 5. Head of Department (HOD)
 * 6. Professor
 * 7. Associate Professor
 * 8. Assistant Professor
 * 9. Junior Professor
 * 10. Lecturer
 * 11. Teacher
 * 12. Mentor
 * 13. Counselor
 * 14. Administrative Officer
 * 15. Non-Teaching Staff
 * 16. Security Officer
 */
export const STAFF_HIERARCHY: StaffRoleDefinition[] = [
  { id: 'PRINCIPAL', code: 'PRINCIPAL', title: 'Principal', label: 'Principal', rank: 1, level: 1, category: 'LEADERSHIP', description: 'Institutional Head & Chief Academic Officer', requiresApproval: true },
  { id: 'PROVOST', code: 'PROVOST', title: 'Provost', label: 'Provost', rank: 2, level: 2, category: 'LEADERSHIP', description: 'Senior Academic Administrator & Chief Student Affairs Officer', requiresApproval: true },
  { id: 'VICE_PRINCIPAL', code: 'VICE_PRINCIPAL', title: 'Vice Principal', label: 'Vice Principal', rank: 3, level: 3, category: 'LEADERSHIP', description: 'Academic Operations & Faculty Administration', requiresApproval: true },
  { id: 'DEAN', code: 'DEAN', title: 'Dean (Academics / Student Affairs)', label: 'Dean', rank: 4, level: 4, category: 'LEADERSHIP', description: 'Faculty Division Head & Student Welfare Dean', requiresApproval: true },
  { id: 'HOD', code: 'HOD', title: 'Head of Department (HOD)', label: 'Head of Department (HOD)', rank: 5, level: 5, category: 'LEADERSHIP', description: 'Department Academic & Faculty Leadership', requiresApproval: true },
  { id: 'PROFESSOR', code: 'PROFESSOR', title: 'Professor', label: 'Professor', rank: 6, level: 6, category: 'FACULTY', description: 'Senior Faculty Member & Research Advisor', requiresApproval: true },
  { id: 'ASSOCIATE_PROFESSOR', code: 'ASSOCIATE_PROFESSOR', title: 'Associate Professor', label: 'Associate Professor', rank: 7, level: 7, category: 'FACULTY', description: 'Senior Faculty & Laboratory In-charge', requiresApproval: true },
  { id: 'ASSISTANT_PROFESSOR', code: 'ASSISTANT_PROFESSOR', title: 'Assistant Professor', label: 'Assistant Professor', rank: 8, level: 8, category: 'FACULTY', description: 'Department Faculty & Student Mentor', requiresApproval: true },
  { id: 'JUNIOR_PROFESSOR', code: 'JUNIOR_PROFESSOR', title: 'Junior Professor', label: 'Junior Professor', rank: 9, level: 9, category: 'FACULTY', description: 'Lecturing & Tutorial Faculty', requiresApproval: true },
  { id: 'LECTURER', code: 'LECTURER', title: 'Lecturer', label: 'Lecturer', rank: 10, level: 10, category: 'FACULTY', description: 'Department Lecturer & Academic Tutor', requiresApproval: true },
  { id: 'TEACHER', code: 'TEACHER', title: 'Teacher / Instructor', label: 'Teacher', rank: 11, level: 11, category: 'FACULTY', description: 'Laboratory Instructor & Course Teacher', requiresApproval: true },
  { id: 'MENTOR', code: 'MENTOR', title: 'Mentor / Faculty Advisor', label: 'Mentor', rank: 12, level: 12, category: 'ACADEMIC_SUPPORT', description: 'Assigned Student Cohort Counselor & Safety Guide', requiresApproval: true },
  { id: 'COUNSELOR', code: 'COUNSELOR', title: 'Student Counselor / Psychological Cell', label: 'Counselor', rank: 13, level: 13, category: 'ACADEMIC_SUPPORT', description: 'Confidential Mental Health & Student Well-being Officer', requiresApproval: true },
  { id: 'ADMINISTRATIVE_OFFICER', code: 'ADMINISTRATIVE_OFFICER', title: 'Administrative Officer (AO)', label: 'Administrative Officer', rank: 14, level: 14, category: 'ADMINISTRATIVE', description: 'Campus Registrar & Records Administrator', requiresApproval: true },
  { id: 'NON_TEACHING_STAFF', code: 'NON_TEACHING_STAFF', title: 'Non-Teaching / Support Staff', label: 'Non-Teaching Staff', rank: 15, level: 15, category: 'ADMINISTRATIVE', description: 'Department Technical & Administrative Support', requiresApproval: true },
  { id: 'SECURITY', code: 'SECURITY', title: 'Security Officer / Campus Watch', label: 'Security Officer', rank: 16, level: 16, category: 'SAFETY', description: 'Gate Security, Perimeter Patrol & Rapid Response Staff', requiresApproval: true },
];

export function getStaffRoleByCode(code: string): StaffRoleDefinition | undefined {
  if (!code) return undefined;
  const norm = code.toUpperCase().trim();
  return STAFF_HIERARCHY.find(r => r.code === norm || r.id === norm || r.label.toUpperCase() === norm || r.title.toUpperCase() === norm);
}

export function isStaffRole(role: string): boolean {
  if (!role || typeof role !== 'string') return false;
  const norm = role.toUpperCase().trim();
  if (norm === 'STUDENT' || norm === 'SUPER_ADMIN' || norm === 'SUPER ADMIN') return false;
  return STAFF_HIERARCHY.some(r => r.code === norm || r.id === norm || r.label.toUpperCase() === norm || r.title.toUpperCase() === norm) ||
    norm === 'STAFF' || norm === 'WOMENS_CELL' || norm === 'WARDEN' || norm === 'COUNSELLOR';
}

export function isManagementRole(role: string): boolean {
  if (!role || typeof role !== 'string') return false;
  const norm = role.toUpperCase().trim();
  return norm === 'PRINCIPAL' ||
    norm === 'PROVOST' ||
    norm === 'VICE PRINCIPAL' ||
    norm === 'VICE_PRINCIPAL' ||
    norm === 'DEAN' ||
    norm === 'HOD' ||
    norm === 'HEAD OF DEPARTMENT (HOD)' ||
    norm === 'MANAGEMENT' ||
    norm === 'CAMPUS_ADMIN';
}

export interface ApprovalUser {
  id?: string | null;
  role?: string | null;
  college_id?: string | null;
  department?: string | null;
  is_approved?: boolean | null;
  account_status?: string | null;
}

export interface ApprovalCheckResult {
  allowed: boolean;
  code?: string;
  reason?: string;
}

/**
 * Normalizes role string to standard uppercase code.
 */
export function normalizeRole(role: string | null | undefined): string {
  if (!role) return '';
  return role.toUpperCase().trim().replace(/[\s-]+/g, '_');
}

/**
 * Normalizes department string for robust comparison across abbreviations.
 */
export function normalizeDepartment(dept: string | null | undefined): string {
  if (!dept) return '';
  const s = dept.trim().toLowerCase().replace(/[\s\-_&]+/g, ' ');
  if (s.includes('computer science') || s === 'cse' || s.startsWith('cse ')) return 'cse';
  if (s.includes('electronics and comm') || s.includes('electronics & comm') || s === 'ece' || s.startsWith('ece ')) return 'ece';
  if (s.includes('electrical and') || s.includes('electrical &') || s === 'eee' || s.startsWith('eee ')) return 'eee';
  if (s.includes('mechanical') || s === 'mech' || s.startsWith('mech ')) return 'mech';
  if (s.includes('civil') || s === 'civil') return 'civil';
  if (s.includes('information tech') || s === 'it') return 'it';
  if (s.includes('biotech') || s === 'bt') return 'biotech';
  if (s.includes('chemical') || s === 'chem') return 'chem';
  return s;
}

/**
 * Compares two departments robustly.
 */
export function areDepartmentsEqual(dept1: string | null | undefined, dept2: string | null | undefined): boolean {
  if (!dept1 || !dept2) return false;
  const n1 = normalizeDepartment(dept1);
  const n2 = normalizeDepartment(dept2);
  return n1 === n2 || dept1.trim().toLowerCase() === dept2.trim().toLowerCase();
}

/**
 * Institutional Leadership roles that can ONLY be approved by SUPER_ADMIN
 */
export const INSTITUTIONAL_LEADERSHIP_ROLES = [
  'CAMPUS_ADMIN',
  'ADMIN',
  'MANAGEMENT',
  'MANAGEMENT_ADMIN',
  'PRINCIPAL',
  'DIRECTOR',
  'DEAN',
  'PROVOST',
  'VICE_PRINCIPAL',
];

/**
 * Roles that can approve HOD for their college
 */
export const HOD_APPROVER_ROLES = [
  'SUPER_ADMIN',
  'CAMPUS_ADMIN',
  'ADMIN',
  'PRINCIPAL',
  'DIRECTOR',
];

/**
 * Department Faculty & Staff roles
 */
export const FACULTY_AND_STAFF_ROLES = [
  'PROFESSOR',
  'ASSOCIATE_PROFESSOR',
  'ASSISTANT_PROFESSOR',
  'JUNIOR_PROFESSOR',
  'LECTURER',
  'TEACHER',
  'MENTOR',
  'COUNSELOR',
  'COUNSELLOR',
  'ADMINISTRATIVE_OFFICER',
  'NON_TEACHING_STAFF',
  'SECURITY',
  'STAFF',
  'WOMENS_CELL',
  'WARDEN',
];

/**
 * Validates whether a caller has authorization to approve or reject a target user's role.
 * 
 * Rules:
 * 1. Self-approval is strictly prohibited.
 * 2. Unapproved callers cannot approve anyone.
 * 3. Target SUPER_ADMIN accounts cannot be approved or modified via this endpoint.
 * 4. Institutional Leadership (Campus Admin, Principal, Dean, Provost, Vice Principal):
 *    ONLY SUPER_ADMIN can approve them.
 * 5. Head of Department (HOD):
 *    SUPER_ADMIN, or Campus Admin / Principal of the SAME college.
 * 6. Department Staff & Faculty (Professor, Lecturer, etc.):
 *    - SUPER_ADMIN: Allowed across any institution.
 *    - Campus Admin / Principal: Allowed for the SAME college.
 *    - HOD: Allowed ONLY for the SAME college AND SAME department!
 *      Attempting to approve staff of another department returns CROSS_DEPARTMENT_APPROVAL_FORBIDDEN.
 */
export function canUserApproveRole(
  caller: ApprovalUser,
  target: ApprovalUser
): ApprovalCheckResult {
  if (!caller || !target) {
    return { allowed: false, code: 'INVALID_INPUT', reason: 'Caller and target user details are required' };
  }

  // 1. Self-approval check
  if (caller.id && target.id && caller.id === target.id) {
    return {
      allowed: false,
      code: 'SELF_APPROVAL_BLOCKED',
      reason: 'Self-approval and self-role elevation are prohibited.',
    };
  }

  // 2. Caller approval check
  if (caller.is_approved === false) {
    return {
      allowed: false,
      code: 'CALLER_NOT_APPROVED',
      reason: 'Caller account is pending approval and cannot perform administrative actions.',
    };
  }

  const callerRole = normalizeRole(caller.role);
  const targetRole = normalizeRole(target.role);

  // 3. Super Admin target protection
  if (targetRole === 'SUPER_ADMIN' || targetRole === 'SUPERADMIN') {
    return {
      allowed: false,
      code: 'CANNOT_APPROVE_SUPER_ADMIN',
      reason: 'Super Admin accounts cannot be approved or altered via this route.',
    };
  }

  // Caller is SUPER_ADMIN -> Full Platform Privileges across all colleges and departments
  if (callerRole === 'SUPER_ADMIN') {
    return { allowed: true };
  }

  // Multi-tenant check: Non-super-admin callers must match the target's college
  const callerCollege = (caller.college_id || '').trim().toLowerCase();
  const targetCollege = (target.college_id || '').trim().toLowerCase();

  if (!callerCollege || !targetCollege || callerCollege !== targetCollege) {
    return {
      allowed: false,
      code: 'CROSS_COLLEGE_FORBIDDEN',
      reason: 'Cannot manage users outside your assigned campus',
    };
  }

  // 4. Target is Institutional Leadership (Campus Admin, Principal, Dean, Provost, Vice Principal)
  if (INSTITUTIONAL_LEADERSHIP_ROLES.includes(targetRole)) {
    return {
      allowed: false,
      code: 'SUPER_ADMIN_REQUIRED_FOR_INSTITUTIONAL_LEADERSHIP',
      reason: 'Institutional Leadership (Campus Admin, Principal, Dean) requires Super Admin approval.',
    };
  }

  // 5. Target is HOD
  if (targetRole === 'HOD' || targetRole === 'HEAD_OF_DEPARTMENT') {
    if (HOD_APPROVER_ROLES.includes(callerRole)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      code: 'CAMPUS_ADMIN_OR_PRINCIPAL_REQUIRED',
      reason: 'Only Campus Admin or Principal can approve Head of Department.',
    };
  }

  // 6. Target is Department Faculty / Staff
  if (FACULTY_AND_STAFF_ROLES.includes(targetRole) || targetRole === 'STAFF') {
    // Campus Admin & Principal can approve any staff in their verified college
    if (['CAMPUS_ADMIN', 'ADMIN', 'MANAGEMENT', 'MANAGEMENT_ADMIN', 'PRINCIPAL', 'DIRECTOR'].includes(callerRole)) {
      return { allowed: true };
    }

    // HOD can ONLY approve staff in their own verified college AND department
    if (callerRole === 'HOD' || callerRole === 'HEAD_OF_DEPARTMENT') {
      if (!areDepartmentsEqual(caller.department, target.department)) {
        return {
          allowed: false,
          code: 'CROSS_DEPARTMENT_APPROVAL_FORBIDDEN',
          reason: 'CROSS_DEPARTMENT_APPROVAL_FORBIDDEN: HOD can only approve staff within their own department',
        };
      }
      return { allowed: true };
    }

    return {
      allowed: false,
      code: 'INSUFFICIENT_STAFF_APPROVAL_PRIVILEGES',
      reason: 'Insufficient privileges to approve department staff.',
    };
  }

  // 7. Target is Student
  if (targetRole === 'STUDENT') {
    if (['CAMPUS_ADMIN', 'ADMIN', 'MANAGEMENT', 'PRINCIPAL', 'DIRECTOR'].includes(callerRole)) {
      return { allowed: true };
    }
    if (callerRole === 'HOD') {
      if (!areDepartmentsEqual(caller.department, target.department)) {
        return {
          allowed: false,
          code: 'CROSS_DEPARTMENT_APPROVAL_FORBIDDEN',
          reason: 'HOD can only approve students within their own department',
        };
      }
      return { allowed: true };
    }
  }

  return {
    allowed: false,
    code: 'ROLE_APPROVAL_UNAUTHORIZED',
    reason: 'Caller lacks authorization to approve this role.',
  };
}
