/**
 * Kavach Campus - Academic Programs and Branch-to-Department Mapping
 * Provides typed, institutional mappings so that selecting a student's branch
 * automatically derives the official department full name.
 */

export const ACADEMIC_PROGRAMS = [
  'B.Tech',
  'B.E.',
  'B.Sc.',
  'B.Com.',
  'B.A.',
  'BBA',
  'BCA',
  'Diploma',
  'Other',
] as const;

export type AcademicProgram = (typeof ACADEMIC_PROGRAMS)[number];

export const POPULAR_BRANCHES = [
  { code: 'CSE', name: 'Computer Science and Engineering', program: 'B.Tech' },
  { code: 'AIML', name: 'Artificial Intelligence and Machine Learning', program: 'B.Tech' },
  { code: 'AIDS', name: 'Artificial Intelligence and Data Science', program: 'B.Tech' },
  { code: 'CSBS', name: 'Computer Science and Business Systems', program: 'B.Tech' },
  { code: 'CS_CYBER', name: 'Computer Science (Cyber Security)', program: 'B.Tech' },
  { code: 'CS_IOT', name: 'Computer Science (Internet of Things)', program: 'B.Tech' },
  { code: 'IT', name: 'Information Technology', program: 'B.Tech' },
  { code: 'ECE', name: 'Electronics and Communication Engineering', program: 'B.Tech' },
  { code: 'EEE', name: 'Electrical and Electronics Engineering', program: 'B.Tech' },
  { code: 'MECH', name: 'Mechanical Engineering', program: 'B.Tech' },
  { code: 'CIVIL', name: 'Civil Engineering', program: 'B.Tech' },
  { code: 'CHEM', name: 'Chemical Engineering', program: 'B.Tech' },
  { code: 'BIOTECH', name: 'Biotechnology', program: 'B.Tech' },
  { code: 'AERO', name: 'Aerospace Engineering', program: 'B.Tech' },
  { code: 'AUTO', name: 'Automobile Engineering', program: 'B.Tech' },
  { code: 'BSC_CS', name: 'Computer Science', program: 'B.Sc.' },
  { code: 'BSC_MATH', name: 'Mathematics', program: 'B.Sc.' },
  { code: 'BSC_PHYS', name: 'Physics', program: 'B.Sc.' },
  { code: 'BSC_CHEM', name: 'Chemistry', program: 'B.Sc.' },
  { code: 'BCOM_GEN', name: 'Commerce (General)', program: 'B.Com.' },
  { code: 'BCOM_COMP', name: 'Commerce (Computers)', program: 'B.Com.' },
  { code: 'BBA_GEN', name: 'Business Administration', program: 'BBA' },
  { code: 'BCA_GEN', name: 'Computer Applications', program: 'BCA' },
  { code: 'BA_GEN', name: 'Arts & Humanities', program: 'B.A.' },
  { code: 'DIP_MECH', name: 'Diploma in Mechanical Engineering', program: 'Diploma' },
  { code: 'DIP_CIVIL', name: 'Diploma in Civil Engineering', program: 'Diploma' },
  { code: 'DIP_EEE', name: 'Diploma in Electrical Engineering', program: 'Diploma' },
  { code: 'DIP_CSE', name: 'Diploma in Computer Engineering', program: 'Diploma' },
] as const;

export const BRANCH_DEPARTMENT_MAP: Record<string, string> = {
  CSE: 'Computer Science and Engineering',
  'CSE (AI&ML)': 'Artificial Intelligence and Machine Learning',
  AIML: 'Artificial Intelligence and Machine Learning',
  'AI&DS': 'Artificial Intelligence and Data Science',
  AIDS: 'Artificial Intelligence and Data Science',
  CSBS: 'Computer Science and Business Systems',
  'CSE (CS)': 'Computer Science (Cyber Security)',
  'CSE (IOT)': 'Computer Science (Internet of Things)',
  IT: 'Information Technology',
  ECE: 'Electronics and Communication Engineering',
  EEE: 'Electrical and Electronics Engineering',
  EIE: 'Electronics and Instrumentation Engineering',
  MECH: 'Mechanical Engineering',
  MECHANICAL: 'Mechanical Engineering',
  CIVIL: 'Civil Engineering',
  CHEM: 'Chemical Engineering',
  CHEMICAL: 'Chemical Engineering',
  BIOTECH: 'Biotechnology',
  AERO: 'Aerospace Engineering',
  AUTO: 'Automobile Engineering',
  MECHATRONICS: 'Mechatronics',
  AGRI: 'Agricultural Engineering',
  'BSC CS': 'Computer Science',
  'B.SC CS': 'Computer Science',
  BSC_CS: 'Computer Science',
  BCOM: 'Commerce',
  'B.COM': 'Commerce',
  BCOM_GEN: 'Commerce (General)',
  BBA: 'Business Administration',
  BBA_GEN: 'Business Administration',
  BCA: 'Computer Applications',
  BCA_GEN: 'Computer Applications',
  BA: 'Arts and Humanities',
  'B.A': 'Arts and Humanities',
  BA_GEN: 'Arts and Humanities',
  DIP_CSE: 'Diploma in Computer Engineering',
  DIP_ECE: 'Diploma in Electronics Engineering',
  DIP_EEE: 'Diploma in Electrical Engineering',
  DIP_MECH: 'Diploma in Mechanical Engineering',
  DIP_CIVIL: 'Diploma in Civil Engineering',
};

/**
 * Derives the department full name from the selected branch and program.
 * Normalizes input so "cse" or "CSE" automatically yields "Computer Science and Engineering".
 */
export function deriveDepartmentFromBranch(branch: string, program?: string): string {
  if (!branch || typeof branch !== 'string') return '';
  const cleaned = branch.trim().toUpperCase();
  
  if (BRANCH_DEPARTMENT_MAP[cleaned]) {
    return BRANCH_DEPARTMENT_MAP[cleaned];
  }

  // Check partial key matches
  for (const [key, deptName] of Object.entries(BRANCH_DEPARTMENT_MAP)) {
    if (cleaned === key || cleaned.startsWith(key + ' ') || cleaned.startsWith(key + '-')) {
      return deptName;
    }
  }

  // If user entered custom branch, format cleanly as Department
  if (cleaned.length > 0) {
    return cleaned.endsWith('ENGINEERING') || cleaned.endsWith('DEPARTMENT')
      ? branch.trim()
      : `${branch.trim()} Department`;
  }

  return program ? `${program} Department` : '';
}

export const ACADEMIC_YEARS = [
  'Year 1',
  'Year 2',
  'Year 3',
  'Year 4',
] as const;
