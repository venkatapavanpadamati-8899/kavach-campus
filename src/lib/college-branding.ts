import { CollegeTenant, getCollegeById } from '@/lib/colleges';

export type PageKey =
  | 'login'
  | 'register'
  | 'verify_otp'
  | 'student_dashboard'
  | 'identity_verification'
  | 'file_report'
  | 'voice_report'
  | 'sos'
  | 'safe_walk'
  | 'my_cases'
  | 'trusted_contacts'
  | 'settings'
  | 'staff_dashboard'
  | 'admin_dashboard'
  | 'management_dashboard';

export interface PageBackgroundConfig {
  imageUrl: string;
  overlay: string;
  caption: string;
}

export interface CollegeBranding {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  logoUrl?: string;
  logoSvg: string;
  primaryColor: string;
  secondaryColor: string;
  accentGradient: string;
  pageBackgrounds: Record<PageKey, PageBackgroundConfig>;
}

// High-fidelity, optimized campus visual assets with dark readability gradients
const SRKR_BACKGROUNDS: Record<PageKey, PageBackgroundConfig> = {
  login: {
    imageUrl: '/images/colleges/srkr/login.jpg',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.82) 0%, rgba(10, 10, 12, 0.94) 100%)',
    caption: 'SRKR Engineering College — Main Campus Gateway & Academic Edifice'
  },
  register: {
    imageUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.65) 0%, rgba(10, 10, 15, 0.78) 100%)',
    caption: 'SRKR Technology & Sciences Quad — Student Admissions Wing'
  },
  verify_otp: {
    imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.88) 0%, rgba(10, 10, 12, 0.96) 100%)',
    caption: 'SRKR Central Verification & Credential Registry'
  },
  student_dashboard: {
    imageUrl: '/images/colleges/srkr/student-dashboard.jpg',
    overlay: 'linear-gradient(180deg, rgba(13, 26, 27, 0.85) 0%, rgba(10, 10, 12, 0.94) 100%)',
    caption: 'SRKR Campus Landscape & Student Innovation Promenade'
  },
  identity_verification: {
    imageUrl: 'https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(20, 20, 35, 0.86) 0%, rgba(10, 10, 12, 0.95) 100%)',
    caption: 'SRKR Administrative Secretariat & Student Records Center'
  },
  file_report: {
    imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(24, 24, 37, 0.87) 0%, rgba(10, 10, 12, 0.95) 100%)',
    caption: 'SRKR Campus Security Corridor & Student Safety Desk'
  },
  voice_report: {
    imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(19, 21, 36, 0.88) 0%, rgba(10, 10, 12, 0.96) 100%)',
    caption: 'SRKR Confidential Counseling & Voice Telemetry Wing'
  },
  sos: {
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80',
    overlay: 'radial-gradient(circle at center, rgba(185, 28, 28, 0.28) 0%, rgba(10, 10, 12, 0.96) 80%)',
    caption: 'SRKR Quick Response & Emergency Perimeter'
  },
  safe_walk: {
    imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(13, 148, 136, 0.2) 0%, rgba(10, 10, 12, 0.94) 100%)',
    caption: 'SRKR Illuminated Night Walkways & Campus Patrol Path'
  },
  my_cases: {
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(30, 41, 59, 0.85) 0%, rgba(10, 10, 12, 0.95) 100%)',
    caption: 'SRKR Institutional Grievance & Case Redressal Cell'
  },
  trusted_contacts: {
    imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(23, 25, 35, 0.86) 0%, rgba(10, 10, 12, 0.95) 100%)',
    caption: 'SRKR Student Guardian Network & Emergency Contacts'
  },
  settings: {
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.88) 0%, rgba(10, 10, 12, 0.95) 100%)',
    caption: 'SRKR Security Systems & Personal Preferences Tower'
  },
  staff_dashboard: {
    imageUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(20, 20, 35, 0.88) 0%, rgba(10, 10, 12, 0.96) 100%)',
    caption: 'SRKR Faculty Secretariat & Departmental Response Cell'
  },
  admin_dashboard: {
    imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.88) 0%, rgba(10, 10, 12, 0.96) 100%)',
    caption: 'SRKR Campus Command & Security Operations Center'
  },
  management_dashboard: {
    imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.88) 0%, rgba(10, 10, 12, 0.96) 100%)',
    caption: 'SRKR Governing Body & Institutional Analytics Suite'
  }
};

const VISHNU_BACKGROUNDS: Record<PageKey, PageBackgroundConfig> = {
  login: {
    imageUrl: '/images/colleges/vishnu/login.jpg',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.84) 0%, rgba(10, 10, 12, 0.94) 100%)',
    caption: 'Vishnu Institute of Technology — Main Academic Campus & Tech Dome'
  },
  register: {
    imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.65) 0%, rgba(10, 10, 15, 0.78) 100%)',
    caption: 'Vishnu Institute of Technology — Dr. B.V. Raju Knowledge Enclave'
  },
  verify_otp: {
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.88) 0%, rgba(10, 10, 12, 0.96) 100%)',
    caption: 'Vishnu Institute of Technology — Identity Verification Portal'
  },
  student_dashboard: {
    imageUrl: '/images/colleges/vishnu/student-dashboard.jpg',
    overlay: 'linear-gradient(180deg, rgba(12, 28, 48, 0.85) 0%, rgba(10, 10, 12, 0.94) 100%)',
    caption: 'Vishnu Institute of Technology — Central Academic Lawn & Innovation Plaza'
  },
  identity_verification: {
    imageUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(17, 24, 39, 0.87) 0%, rgba(10, 10, 12, 0.95) 100%)',
    caption: 'Vishnu Institute of Technology — Academic Senate & Registrar Bureau'
  },
  file_report: {
    imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(18, 25, 45, 0.86) 0%, rgba(10, 10, 12, 0.95) 100%)',
    caption: 'Vishnu Institute of Technology — Campus Safety & Redressal Center'
  },
  voice_report: {
    imageUrl: 'https://images.unsplash.com/photo-1590650516494-0c8e4a4dd67e?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(20, 27, 45, 0.87) 0%, rgba(10, 10, 12, 0.96) 100%)',
    caption: 'Vishnu Institute of Technology — Confidential Audio Telemetry'
  },
  sos: {
    imageUrl: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=1920&q=80',
    overlay: 'radial-gradient(circle at center, rgba(225, 29, 72, 0.3) 0%, rgba(10, 10, 12, 0.96) 80%)',
    caption: 'Vishnu Emergency Dispatch & Security Operations Wing'
  },
  safe_walk: {
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(14, 116, 144, 0.22) 0%, rgba(10, 10, 12, 0.94) 100%)',
    caption: 'Vishnu Campus Pathway & Smart Surveillance Avenue'
  },
  my_cases: {
    imageUrl: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.87) 0%, rgba(10, 10, 12, 0.95) 100%)',
    caption: 'Vishnu Student Case Tracking & Ombudsman Bureau'
  },
  trusted_contacts: {
    imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(16, 24, 40, 0.87) 0%, rgba(10, 10, 12, 0.95) 100%)',
    caption: 'Vishnu Trusted Parent & Faculty Mentor Network'
  },
  settings: {
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.88) 0%, rgba(10, 10, 12, 0.95) 100%)',
    caption: 'Vishnu Technology Administration & Security Configuration'
  },
  staff_dashboard: {
    imageUrl: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.88) 0%, rgba(10, 10, 12, 0.96) 100%)',
    caption: 'Vishnu Faculty & First Responder Dispatch Matrix'
  },
  admin_dashboard: {
    imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.88) 0%, rgba(10, 10, 12, 0.96) 100%)',
    caption: 'Vishnu Central Campus Command & Control Tower'
  },
  management_dashboard: {
    imageUrl: 'https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.88) 0%, rgba(10, 10, 12, 0.96) 100%)',
    caption: 'Vishnu Executive Board & Institutional Quality Council'
  }
};

// Generic fallback for any other registered or searched college
const DEFAULT_FALLBACK_BACKGROUNDS: Record<PageKey, PageBackgroundConfig> = {
  login: {
    imageUrl: 'https://images.unsplash.com/photo-1564981797816-1043664bf78d?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(17, 24, 39, 0.85) 0%, rgba(10, 10, 12, 0.95) 100%)',
    caption: 'Engineering Campus — Main Entrance Gate'
  },
  register: {
    imageUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.65) 0%, rgba(10, 10, 15, 0.78) 100%)',
    caption: 'Engineering Sciences & Admissions Quad'
  },
  verify_otp: {
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(17, 24, 39, 0.88) 0%, rgba(10, 10, 12, 0.96) 100%)',
    caption: 'Campus Credential & Security Registry'
  },
  student_dashboard: {
    imageUrl: 'https://images.unsplash.com/photo-1519452575417-564c1401ecc0?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(13, 26, 27, 0.85) 0%, rgba(10, 10, 12, 0.94) 100%)',
    caption: 'Campus Academic Lawn & Student Services'
  },
  identity_verification: {
    imageUrl: 'https://images.unsplash.com/photo-1492538368677-f6e0afe31dcc?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(17, 24, 39, 0.87) 0%, rgba(10, 10, 12, 0.95) 100%)',
    caption: 'Administration Building & Academic Records'
  },
  file_report: {
    imageUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(17, 24, 39, 0.87) 0%, rgba(10, 10, 12, 0.95) 100%)',
    caption: 'Campus Walkway & Safety Desk'
  },
  voice_report: {
    imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(17, 24, 39, 0.88) 0%, rgba(10, 10, 12, 0.96) 100%)',
    caption: 'Campus Guidance & Confidential Support'
  },
  sos: {
    imageUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1920&q=80',
    overlay: 'radial-gradient(circle at center, rgba(185, 28, 28, 0.28) 0%, rgba(10, 10, 12, 0.96) 80%)',
    caption: 'Emergency Security Perimeter'
  },
  safe_walk: {
    imageUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(13, 148, 136, 0.2) 0%, rgba(10, 10, 12, 0.94) 100%)',
    caption: 'Illuminated Night Walkway'
  },
  my_cases: {
    imageUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(17, 24, 39, 0.87) 0%, rgba(10, 10, 12, 0.95) 100%)',
    caption: 'Campus Grievance & Records Cell'
  },
  trusted_contacts: {
    imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(17, 24, 39, 0.87) 0%, rgba(10, 10, 12, 0.95) 100%)',
    caption: 'Student Support Network'
  },
  settings: {
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(17, 24, 39, 0.88) 0%, rgba(10, 10, 12, 0.95) 100%)',
    caption: 'Security Settings & Preferences'
  },
  staff_dashboard: {
    imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(17, 24, 39, 0.88) 0%, rgba(10, 10, 12, 0.96) 100%)',
    caption: 'Faculty & Responder Control Room'
  },
  admin_dashboard: {
    imageUrl: 'https://images.unsplash.com/photo-1551836022-b06985bceb24?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(17, 24, 39, 0.88) 0%, rgba(10, 10, 12, 0.96) 100%)',
    caption: 'Campus Control Tower'
  },
  management_dashboard: {
    imageUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1920&q=80',
    overlay: 'linear-gradient(180deg, rgba(17, 24, 39, 0.88) 0%, rgba(10, 10, 12, 0.96) 100%)',
    caption: 'Executive Management Council'
  }
};

// Official SVG vector logos
export const SRKR_LOGO_SVG = `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="60" cy="60" r="56" fill="#1e1b4b" stroke="#7c3aed" stroke-width="4"/>
  <circle cx="60" cy="60" r="46" fill="#0f172a" stroke="#3b82f6" stroke-width="2" stroke-dasharray="3 3"/>
  <path d="M60 22L78 34V58C78 74 60 92 60 92C60 92 42 74 42 58V34L60 22Z" fill="url(#srkr_grad)" stroke="#ffffff" stroke-width="2"/>
  <path d="M60 38V76M49 54L71 54" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
  <text x="60" y="106" font-size="10" font-weight="bold" fill="#38bdf8" text-anchor="middle" letter-spacing="1.5">SRKR</text>
  <defs>
    <linearGradient id="srkr_grad" x1="42" y1="22" x2="78" y2="92" gradientUnits="userSpaceOnUse">
      <stop stop-color="#7c3aed"/>
      <stop offset="1" stop-color="#2563eb"/>
    </linearGradient>
  </defs>
</svg>`;

export const VISHNU_LOGO_SVG = `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="60" cy="60" r="56" fill="#0c1e3d" stroke="#2563eb" stroke-width="4"/>
  <circle cx="60" cy="60" r="46" fill="#0b1728" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4 2"/>
  <path d="M60 24L86 78H34L60 24Z" fill="url(#vishnu_grad)" stroke="#f59e0b" stroke-width="2"/>
  <path d="M60 42L72 70H48L60 42Z" fill="#0c1e3d"/>
  <circle cx="60" cy="58" r="4" fill="#fbbf24"/>
  <text x="60" y="105" font-size="10" font-weight="bold" fill="#fbbf24" text-anchor="middle" letter-spacing="1.5">VISHNU</text>
  <defs>
    <linearGradient id="vishnu_grad" x1="34" y1="24" x2="86" y2="78" gradientUnits="userSpaceOnUse">
      <stop stop-color="#2563eb"/>
      <stop offset="1" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
</svg>`;

export const DEFAULT_LOGO_SVG = `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="60" cy="60" r="56" fill="#111827" stroke="#3b82f6" stroke-width="4"/>
  <path d="M60 24L82 36V60C82 76 60 92 60 92C60 92 38 76 38 60V36L60 24Z" fill="url(#kavach_grad)" stroke="#ffffff" stroke-width="2"/>
  <path d="M52 58L58 64L69 52" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="60" y="106" font-size="9" font-weight="bold" fill="#60a5fa" text-anchor="middle" letter-spacing="1">KAVACH</text>
  <defs>
    <linearGradient id="kavach_grad" x1="38" y1="24" x2="82" y2="92" gradientUnits="userSpaceOnUse">
      <stop stop-color="#3b82f6"/>
      <stop offset="1" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
</svg>`;

const UNASSIGNED_BRANDING: CollegeBranding = {
  id: 'unassigned',
  name: 'Kavach Campus',
  shortName: 'Kavach Campus',
  tagline: 'Campus Safety & Emergency Response',
  logoSvg: DEFAULT_LOGO_SVG,
  primaryColor: '#3b82f6',
  secondaryColor: '#8b5cf6',
  accentGradient: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
  pageBackgrounds: DEFAULT_FALLBACK_BACKGROUNDS,
};

// This is a presentation-only fallback for an unauthenticated or not-yet-
// verified session. It is deliberately not one of the registered colleges and
// must never be used to make an authorization decision.
const UNASSIGNED_TENANT: CollegeTenant = {
  id: 'unassigned',
  name: 'Kavach Campus',
  shortName: 'Kavach Campus',
  slug: 'unassigned',
  pincode: '',
  city: '',
  district: '',
  state: '',
  coordinates: { lat: 0, lng: 0 },
  geofenceRadiusMeters: 0,
  domain: '',
  emergencyHelpline: '',
  womensCellHelpline: '',
  securityControlRoom: '',
  ambulanceContact: '',
  primaryColor: '#3b82f6',
  secondaryColor: '#8b5cf6',
  campusBuildings: [],
  isAutonomous: false,
};

export function getUnassignedCollegeTenant(): CollegeTenant {
  return UNASSIGNED_TENANT;
}

export const COLLEGE_BRANDINGS: Record<string, CollegeBranding> = {
  'srkr-bhimavaram': {
    id: 'srkr-bhimavaram',
    name: 'Sagi Rama Krishnam Raju Engineering College (Autonomous)',
    shortName: 'SRKR Engineering College',
    tagline: 'Leading Technical Innovation with Campus Safety & Dignity',
    logoSvg: SRKR_LOGO_SVG,
    primaryColor: '#7c3aed',
    secondaryColor: '#3b82f6',
    accentGradient: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
    pageBackgrounds: SRKR_BACKGROUNDS
  },
  'vit-bhimavaram': {
    id: 'vit-bhimavaram',
    name: 'Vishnu Institute of Technology (Autonomous)',
    shortName: 'Vishnu Institute of Technology',
    tagline: 'Excellence in Engineering with Comprehensive Student Care',
    logoSvg: VISHNU_LOGO_SVG,
    primaryColor: '#2563eb',
    secondaryColor: '#f59e0b',
    accentGradient: 'linear-gradient(135deg, #2563eb 0%, #f59e0b 100%)',
    pageBackgrounds: VISHNU_BACKGROUNDS
  },
  'vishnu-bhimavaram': {
    id: 'vishnu-bhimavaram',
    name: 'Vishnu Institute of Technology (Autonomous)',
    shortName: 'Vishnu Institute of Technology',
    tagline: 'Excellence in Engineering with Comprehensive Student Care',
    logoSvg: VISHNU_LOGO_SVG,
    primaryColor: '#2563eb',
    secondaryColor: '#f59e0b',
    accentGradient: 'linear-gradient(135deg, #2563eb 0%, #f59e0b 100%)',
    pageBackgrounds: VISHNU_BACKGROUNDS
  }
};

/**
 * Resolves the branding configuration for a given college ID or slug.
 * Always returns a valid, high-contrast, accessible branding scheme.
 */
export function getCollegeBranding(collegeIdOrSlug?: string | null): CollegeBranding {
  if (collegeIdOrSlug) {
    const normalized = collegeIdOrSlug.trim().toLowerCase();
    
    // Direct match in brandings
    if (COLLEGE_BRANDINGS[normalized]) {
      return COLLEGE_BRANDINGS[normalized];
    }
    
    // Fuzzy matching for SRKR and Vishnu variations
    if (normalized.includes('srkr') || normalized.includes('sagi rama')) {
      return COLLEGE_BRANDINGS['srkr-bhimavaram'];
    }
    if (normalized.includes('vishnu') || normalized.includes('vit')) {
      return COLLEGE_BRANDINGS['vit-bhimavaram'];
    }

    // Match from registered colleges
    const college = getCollegeById(normalized);
    if (college) {
      return {
        id: college.id,
        name: college.name,
        shortName: college.shortName,
        tagline: `${college.shortName} — Autonomous Safety System`,
        logoSvg: DEFAULT_LOGO_SVG,
        primaryColor: college.primaryColor || '#3b82f6',
        secondaryColor: college.secondaryColor || '#8b5cf6',
        accentGradient: `linear-gradient(135deg, ${college.primaryColor || '#3b82f6'} 0%, ${college.secondaryColor || '#8b5cf6'} 100%)`,
        pageBackgrounds: DEFAULT_FALLBACK_BACKGROUNDS
      };
    }
  }

  // Public and pre-authentication pages must never imply a default tenant.
  return UNASSIGNED_BRANDING;
}

/**
 * Returns the page-specific background configuration for the specified college and page.
 */
export function getPageBackground(collegeIdOrSlug: string | null | undefined, pageKey: PageKey): PageBackgroundConfig {
  const branding = getCollegeBranding(collegeIdOrSlug);
  return branding.pageBackgrounds[pageKey] || DEFAULT_FALLBACK_BACKGROUNDS[pageKey];
}

/**
 * Client-side helper to read the actively selected or authenticated college tenant.
 */
export function getActiveCollegeTenant(): CollegeTenant {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('kavach_selected_college');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.id && parsed?.shortName) {
          return parsed as CollegeTenant;
        }
      }
    } catch {
      // Ignore JSON parse errors in localStorage
    }
  }
  return UNASSIGNED_TENANT;
}

/**
 * Persists the user's selected college tenant.
 */
export function setActiveCollegeTenant(college: CollegeTenant) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('kavach_selected_college', JSON.stringify(college));
      window.dispatchEvent(new Event('kavach_college_changed'));
    } catch {
      // Ignore storage errors
    }
  }
}
