export interface CollegeTenant {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  pincode: string;
  city: string;
  district: string;
  state: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  geofenceRadiusMeters: number;
  domain: string;
  emergencyHelpline: string;
  womensCellHelpline: string;
  securityControlRoom: string;
  ambulanceContact: string;
  primaryColor: string;
  secondaryColor: string;
  campusBuildings: string[];
  bannerUrl?: string;
  logoUrl?: string;
  isAutonomous: boolean;
  naacGrade?: string;
}

export const INDIAN_ENGINEERING_COLLEGES: CollegeTenant[] = [
  {
    id: 'srkr-bhimavaram',
    name: 'Sagi Rama Krishnam Raju Engineering College (Autonomous)',
    shortName: 'SRKR Engineering College',
    slug: 'srkr-bhimavaram',
    pincode: '534204',
    city: 'Bhimavaram',
    district: 'West Godavari',
    state: 'Andhra Pradesh',
    coordinates: {
      lat: 16.5449,
      lng: 81.4975
    },
    geofenceRadiusMeters: 800,
    domain: 'srkr.edu.in',
    emergencyHelpline: '+91-8816-223332',
    womensCellHelpline: '+91-8816-223334',
    securityControlRoom: '+91-8816-223330',
    ambulanceContact: '+91-8816-223339',
    primaryColor: '#7c3aed',
    secondaryColor: '#3b82f6',
    campusBuildings: [
      'Main Administrative Block',
      'Mechanical Sciences Block',
      'Civil Engineering Block',
      'CSE & IT Block',
      'ECE & EEE Block',
      'Central Library & Auditorium',
      'Girls Hostel Complex (North)',
      'Boys Hostel Complex (South)',
      'Sports Complex & Gymnasium',
      'Medical Dispensary & First Aid'
    ],
    isAutonomous: true,
    naacGrade: 'A+'
  },
  {
    id: 'vit-bhimavaram',
    name: 'Vishnu Institute of Technology (Autonomous)',
    shortName: 'Vishnu Institute of Technology',
    slug: 'vit-bhimavaram',
    pincode: '534202',
    city: 'Bhimavaram',
    district: 'West Godavari',
    state: 'Andhra Pradesh',
    coordinates: {
      lat: 16.5684,
      lng: 81.5222
    },
    geofenceRadiusMeters: 850,
    domain: 'vishnu.edu.in',
    emergencyHelpline: '+91-8816-251333',
    womensCellHelpline: '+91-8816-251335',
    securityControlRoom: '+91-8816-251330',
    ambulanceContact: '+91-8816-251339',
    primaryColor: '#2563eb',
    secondaryColor: '#f59e0b',
    campusBuildings: [
      'Vishnu Administrative Block',
      'Technology Tower (CS & IT)',
      'Electronics & Electrical Block',
      'Mechanical & Civil Complex',
      'Dr. B.V. Raju Knowledge Center',
      'Sita Girls Hostel Wing',
      'Boys Hostel Block A & B',
      'Campus Health Clinic & First Aid',
      'Auditorium & Open Air Theatre'
    ],
    isAutonomous: true,
    naacGrade: 'A++'
  },
  {
    id: 'dnr-bhimavaram',
    name: 'DNR College of Engineering and Technology',
    shortName: 'DNR College of Engg',
    slug: 'dnr-bhimavaram',
    pincode: '534202',
    city: 'Bhimavaram',
    district: 'West Godavari',
    state: 'Andhra Pradesh',
    coordinates: {
      lat: 16.5412,
      lng: 81.5229
    },
    geofenceRadiusMeters: 600,
    domain: 'dnrcet.org',
    emergencyHelpline: '+91-8816-221234',
    womensCellHelpline: '+91-8816-221235',
    securityControlRoom: '+91-8816-221230',
    ambulanceContact: '+91-8816-221239',
    primaryColor: '#2563eb',
    secondaryColor: '#059669',
    campusBuildings: ['Main Block', 'Engineering Block', 'Hostel Wing', 'Library'],
    isAutonomous: true,
    naacGrade: 'A'
  },
  {
    id: 'aucoe-visakhapatnam',
    name: 'Andhra University College of Engineering',
    shortName: 'AUCE Visakhapatnam',
    slug: 'aucoe-visakhapatnam',
    pincode: '530003',
    city: 'Visakhapatnam',
    district: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    coordinates: {
      lat: 17.7289,
      lng: 83.3188
    },
    geofenceRadiusMeters: 1200,
    domain: 'andhrauniversity.edu.in',
    emergencyHelpline: '+91-891-2844000',
    womensCellHelpline: '+91-891-2844222',
    securityControlRoom: '+91-891-2844111',
    ambulanceContact: '+91-891-2844999',
    primaryColor: '#b91c1c',
    secondaryColor: '#f59e0b',
    campusBuildings: ['North Campus Main', 'South Campus Lab Complex', 'Central Library', 'Hostels'],
    isAutonomous: true,
    naacGrade: 'A++'
  },
  {
    id: 'vrsec-vijayawada',
    name: 'Velagapudi Ramakrishna Siddhartha Engineering College',
    shortName: 'VR Siddhartha Engg College',
    slug: 'vrsec-vijayawada',
    pincode: '520007',
    city: 'Vijayawada',
    district: 'NTR',
    state: 'Andhra Pradesh',
    coordinates: {
      lat: 16.4813,
      lng: 80.6934
    },
    geofenceRadiusMeters: 900,
    domain: 'vrsiddhartha.ac.in',
    emergencyHelpline: '+91-866-2582333',
    womensCellHelpline: '+91-866-2582334',
    securityControlRoom: '+91-866-2582330',
    ambulanceContact: '+91-866-2582339',
    primaryColor: '#047857',
    secondaryColor: '#0284c7',
    campusBuildings: ['Administrative Block', 'CSE Block', 'Mechanical Block', 'Girls Hostel'],
    isAutonomous: true,
    naacGrade: 'A+'
  },
  {
    id: 'jntuk-kakinada',
    name: 'Jawaharlal Nehru Technological University College of Engineering Kakinada',
    shortName: 'JNTUK Kakinada',
    slug: 'jntuk-kakinada',
    pincode: '533003',
    city: 'Kakinada',
    district: 'Kakinada',
    state: 'Andhra Pradesh',
    coordinates: {
      lat: 16.9804,
      lng: 82.2423
    },
    geofenceRadiusMeters: 1000,
    domain: 'jntukucek.ac.in',
    emergencyHelpline: '+91-884-2300900',
    womensCellHelpline: '+91-884-2300911',
    securityControlRoom: '+91-884-2300922',
    ambulanceContact: '+91-884-2300933',
    primaryColor: '#1d4ed8',
    secondaryColor: '#9333ea',
    campusBuildings: ['Administrative Secretariat', 'ECE Block', 'CSE Department', 'Hostels'],
    isAutonomous: true,
    naacGrade: 'A+'
  },
  {
    id: 'iiit-hyderabad',
    name: 'International Institute of Information Technology, Hyderabad',
    shortName: 'IIIT Hyderabad',
    slug: 'iiit-hyderabad',
    pincode: '500032',
    city: 'Hyderabad',
    district: 'Rangareddy',
    state: 'Telangana',
    coordinates: {
      lat: 17.4455,
      lng: 78.3489
    },
    geofenceRadiusMeters: 1000,
    domain: 'iiit.ac.in',
    emergencyHelpline: '+91-40-6653-1000',
    womensCellHelpline: '+91-40-6653-1234',
    securityControlRoom: '+91-40-6653-1111',
    ambulanceContact: '+91-40-6653-1999',
    primaryColor: '#0f766e',
    secondaryColor: '#f97316',
    campusBuildings: ['Nilgiri Building', 'Himalaya Block', 'Vindhya Complex', 'OBH', 'NBH'],
    isAutonomous: true,
    naacGrade: 'A++'
  },
  {
    id: 'cbit-hyderabad',
    name: 'Chaitanya Bharathi Institute of Technology (Autonomous)',
    shortName: 'CBIT Hyderabad',
    slug: 'cbit-hyderabad',
    pincode: '500075',
    city: 'Hyderabad',
    district: 'Gandipet',
    state: 'Telangana',
    coordinates: {
      lat: 17.3916,
      lng: 78.3195
    },
    geofenceRadiusMeters: 900,
    domain: 'cbit.ac.in',
    emergencyHelpline: '+91-40-2419-3276',
    womensCellHelpline: '+91-40-2419-3280',
    securityControlRoom: '+91-40-2419-3277',
    ambulanceContact: '+91-40-2419-3279',
    primaryColor: '#7e22ce',
    secondaryColor: '#06b6d4',
    campusBuildings: ['Main Block', 'K-Block', 'R&D Center', 'Girls Hostel'],
    isAutonomous: true,
    naacGrade: 'A++'
  },
  {
    id: 'iit-madras',
    name: 'Indian Institute of Technology Madras',
    shortName: 'IIT Madras',
    slug: 'iit-madras',
    pincode: '600036',
    city: 'Chennai',
    district: 'Chennai',
    state: 'Tamil Nadu',
    coordinates: {
      lat: 12.9915,
      lng: 80.2337
    },
    geofenceRadiusMeters: 2500,
    domain: 'iitm.ac.in',
    emergencyHelpline: '+91-44-2257-8000',
    womensCellHelpline: '+91-44-2257-8240',
    securityControlRoom: '+91-44-2257-9999',
    ambulanceContact: '+91-44-2257-8888',
    primaryColor: '#b45309',
    secondaryColor: '#15803d',
    campusBuildings: ['Building Sciences Block', 'Central Library', 'SAC', 'Hostel Zone'],
    isAutonomous: true,
    naacGrade: 'NIRF #1'
  },
  {
    id: 'iisc-bangalore',
    name: 'Indian Institute of Science Bangalore',
    shortName: 'IISc Bangalore',
    slug: 'iisc-bangalore',
    pincode: '560012',
    city: 'Bengaluru',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    coordinates: {
      lat: 13.0184,
      lng: 77.5674
    },
    geofenceRadiusMeters: 2000,
    domain: 'iisc.ac.in',
    emergencyHelpline: '+91-80-2293-2000',
    womensCellHelpline: '+91-80-2293-2555',
    securityControlRoom: '+91-80-2293-2400',
    ambulanceContact: '+91-80-2293-2227',
    primaryColor: '#1e3a8a',
    secondaryColor: '#d97706',
    campusBuildings: ['Main Building', 'Biological Sciences', 'Physical Sciences', 'Aerospace Block'],
    isAutonomous: true,
    naacGrade: 'A++'
  },
  {
    id: 'rvce-bengaluru',
    name: 'R.V. College of Engineering (Autonomous)',
    shortName: 'RVCE Bengaluru',
    slug: 'rvce-bengaluru',
    pincode: '560059',
    city: 'Bengaluru',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    coordinates: {
      lat: 12.9237,
      lng: 77.4987
    },
    geofenceRadiusMeters: 800,
    domain: 'rvce.edu.in',
    emergencyHelpline: '+91-80-6818-8100',
    womensCellHelpline: '+91-80-6818-8120',
    securityControlRoom: '+91-80-6818-8111',
    ambulanceContact: '+91-80-6818-8199',
    primaryColor: '#831843',
    secondaryColor: '#0284c7',
    campusBuildings: ['Admin Block', 'Civil & Mech Block', 'CS & IS Block', 'Hostel Complex'],
    isAutonomous: true,
    naacGrade: 'A+'
  },
  {
    id: 'coep-pune',
    name: 'COEP Technological University (College of Engineering Pune)',
    shortName: 'COEP Pune',
    slug: 'coep-pune',
    pincode: '411005',
    city: 'Pune',
    district: 'Pune',
    state: 'Maharashtra',
    coordinates: {
      lat: 18.5293,
      lng: 73.8566
    },
    geofenceRadiusMeters: 1000,
    domain: 'coep.ac.in',
    emergencyHelpline: '+91-20-2550-7000',
    womensCellHelpline: '+91-20-2550-7010',
    securityControlRoom: '+91-20-2550-7001',
    ambulanceContact: '+91-20-2550-7099',
    primaryColor: '#166534',
    secondaryColor: '#9333ea',
    campusBuildings: ['Main Heritage Block', 'Mechanical Sciences', 'North Campus', 'Hostel'],
    isAutonomous: true,
    naacGrade: 'A+'
  },
  {
    id: 'iit-delhi',
    name: 'Indian Institute of Technology Delhi',
    shortName: 'IIT Delhi',
    slug: 'iit-delhi',
    pincode: '110016',
    city: 'New Delhi',
    district: 'South Delhi',
    state: 'Delhi',
    coordinates: {
      lat: 28.5450,
      lng: 77.1926
    },
    geofenceRadiusMeters: 1800,
    domain: 'iitd.ac.in',
    emergencyHelpline: '+91-11-2659-1000',
    womensCellHelpline: '+91-11-2659-1700',
    securityControlRoom: '+91-11-2659-1001',
    ambulanceContact: '+91-11-2659-6666',
    primaryColor: '#0369a1',
    secondaryColor: '#e11d48',
    campusBuildings: ['Main Administrative Block', 'Block II', 'Block IV', 'Hostels Area'],
    isAutonomous: true,
    naacGrade: 'NIRF #2'
  }
];

export function getDefaultCollege(): CollegeTenant {
  return INDIAN_ENGINEERING_COLLEGES[0]; // SRKR Engineering College
}

export function getCollegeById(idOrSlug: string): CollegeTenant | null {
  const normalized = idOrSlug.trim().toLowerCase();
  return (
    INDIAN_ENGINEERING_COLLEGES.find(
      (c) =>
        c.id.toLowerCase() === normalized ||
        c.slug.toLowerCase() === normalized ||
        (c.id === 'vit-bhimavaram' && (normalized === 'vishnu-bhimavaram' || normalized === 'vishnu'))
    ) || null
  );
}

export function searchColleges(options: {
  query?: string;
  pincode?: string;
  state?: string;
}): CollegeTenant[] {
  let results = [...INDIAN_ENGINEERING_COLLEGES];

  if (options.pincode && options.pincode.trim()) {
    const cleanPincode = options.pincode.trim();
    results = results.filter((c) => c.pincode.startsWith(cleanPincode));
  }

  if (options.state && options.state.trim()) {
    const cleanState = options.state.trim().toLowerCase();
    results = results.filter((c) => c.state.toLowerCase() === cleanState);
  }

  if (options.query && options.query.trim()) {
    const q = options.query.trim().toLowerCase();
    results = results.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q) ||
        c.pincode.includes(q) ||
        c.domain.toLowerCase().includes(q)
    );
  }

  return results;
}

/**
 * Resolves the institutional tenant college ID based on a verified email domain.
 * Aligns strictly with Migration 012 domain mapping rules.
 * Ambiguous/unrecognized domains return 'PENDING_CAMPUS_VERIFICATION' to avoid cross-tenant contamination.
 */
export function resolveCollegeIdFromEmail(email?: string | null): string {
  if (!email || typeof email !== 'string') return 'PENDING_CAMPUS_VERIFICATION';
  const [localPart, domain, ...unexpectedParts] = email.trim().toLowerCase().split('@');
  if (!localPart || !domain || unexpectedParts.length > 0) {
    return 'PENDING_CAMPUS_VERIFICATION';
  }

  const verifiedDomainTenants: Record<string, string> = {
    'srkr.edu.in': 'srkr-bhimavaram',
    'srkrec.ac.in': 'srkr-bhimavaram',
    'vishnu.edu.in': 'vishnu-bhimavaram',
    'svecw.edu.in': 'vishnu-bhimavaram',
  };
  const verifiedTenant = verifiedDomainTenants[domain];
  if (verifiedTenant) return verifiedTenant;

  const matched = INDIAN_ENGINEERING_COLLEGES.find((c) => domain === c.domain.toLowerCase());
  if (matched) {
    return matched.id;
  }
  return 'PENDING_CAMPUS_VERIFICATION';
}

export interface DepartmentOption {
  code: string;
  name: string;
  category: 'Engineering (B.Tech)' | 'Degree Programs' | 'Other';
}

export const ACADEMIC_DEPARTMENTS: DepartmentOption[] = [
  // Engineering (B.Tech)
  { code: 'CSE', name: 'CSE — Computer Science and Engineering', category: 'Engineering (B.Tech)' },
  { code: 'CSE_AIML', name: 'CSE (AI & ML)', category: 'Engineering (B.Tech)' },
  { code: 'CSE_DS', name: 'CSE (Data Science)', category: 'Engineering (B.Tech)' },
  { code: 'CSE_CS', name: 'CSE (Cyber Security)', category: 'Engineering (B.Tech)' },
  { code: 'CSE_IOT', name: 'CSE (IoT)', category: 'Engineering (B.Tech)' },
  { code: 'IT', name: 'IT — Information Technology', category: 'Engineering (B.Tech)' },
  { code: 'ECE', name: 'ECE — Electronics and Communication Engineering', category: 'Engineering (B.Tech)' },
  { code: 'EEE', name: 'EEE — Electrical and Electronics Engineering', category: 'Engineering (B.Tech)' },
  { code: 'EIE', name: 'EIE — Electronics and Instrumentation Engineering', category: 'Engineering (B.Tech)' },
  { code: 'MECH', name: 'Mechanical Engineering', category: 'Engineering (B.Tech)' },
  { code: 'CIVIL', name: 'Civil Engineering', category: 'Engineering (B.Tech)' },
  { code: 'CHEM', name: 'Chemical Engineering', category: 'Engineering (B.Tech)' },
  { code: 'AGRI', name: 'Agricultural Engineering', category: 'Engineering (B.Tech)' },
  { code: 'BIOTECH', name: 'Biotechnology', category: 'Engineering (B.Tech)' },
  { code: 'AERO', name: 'Aerospace Engineering', category: 'Engineering (B.Tech)' },
  { code: 'AUTO', name: 'Automobile Engineering', category: 'Engineering (B.Tech)' },
  { code: 'MECHATRONICS', name: 'Mechatronics', category: 'Engineering (B.Tech)' },
  { code: 'AIDS', name: 'Artificial Intelligence and Data Science', category: 'Engineering (B.Tech)' },
  { code: 'OTHER_ENGG', name: 'Other Engineering', category: 'Engineering (B.Tech)' },

  // Degree Programs
  { code: 'BSC_CS', name: 'B.Sc. Computer Science', category: 'Degree Programs' },
  { code: 'BSC_MATH', name: 'B.Sc. Mathematics', category: 'Degree Programs' },
  { code: 'BSC_PHYS', name: 'B.Sc. Physics', category: 'Degree Programs' },
  { code: 'BSC_CHEM', name: 'B.Sc. Chemistry', category: 'Degree Programs' },
  { code: 'BCOM', name: 'B.Com.', category: 'Degree Programs' },
  { code: 'BBA', name: 'BBA', category: 'Degree Programs' },
  { code: 'BA', name: 'BA', category: 'Degree Programs' },
  { code: 'OTHER_DEGREE', name: 'Other Degree Department', category: 'Degree Programs' },
];

export const ACADEMIC_YEARS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
] as const;
