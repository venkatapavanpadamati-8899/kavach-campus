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
