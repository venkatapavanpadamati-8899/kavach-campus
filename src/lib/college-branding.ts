import { CollegeTenant, getCollegeById } from '@/lib/colleges';

export type PageKey =
  | 'login'
  | 'register'
  | 'verify_otp'
  | 'student_dashboard'
  | 'identity_verification'
  | 'file_report'
  | 'voice_report'
  | 'safe_box'
  | 'student_profile'
  | 'sos'
  | 'safe_walk'
  | 'my_cases'
  | 'trusted_contacts'
  | 'settings'
  | 'staff_dashboard'
  | 'admin_dashboard'
  | 'management_dashboard'
  | 'super_admin'
  | 'landing'
  | 'about'
  | 'features'
  | 'contact'
  | 'privacy';

export interface PageBackgroundConfig {
  imageUrl: string;
  overlay: string;
  caption: string;
}

export interface AnimationThemeConfig {
  styleName: string;
  themeStyle: 'technical_grid' | 'cyber_aurora' | 'marine_wave' | 'engineering_gear' | 'modern_glass';
  particleColor: string;
  shieldAccent: string;
  glowEffect: string;
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
  animationTheme?: AnimationThemeConfig;
}

// High-fidelity, optimized campus visual assets with crystal-clear luminous gradients
const SRKR_BACKGROUNDS: Record<PageKey, PageBackgroundConfig> = {
  login: {
    imageUrl: '/images/colleges/srkr/login.jpg',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.42) 0%, rgba(10, 15, 30, 0.68) 100%)',
    caption: 'SRKR Engineering College — Main Campus Gateway & Academic Edifice'
  },
  register: {
    imageUrl: '/images/auth_campus_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.45) 0%, rgba(10, 15, 30, 0.70) 100%)',
    caption: 'SRKR Technology & Sciences Quad — Student Admissions Wing'
  },
  verify_otp: {
    imageUrl: '/images/auth_campus_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.48) 0%, rgba(10, 15, 30, 0.72) 100%)',
    caption: 'SRKR Central Verification & Credential Registry'
  },
  student_dashboard: {
    imageUrl: '/images/colleges/srkr/student-dashboard.jpg',
    overlay: 'linear-gradient(180deg, rgba(13, 26, 27, 0.35) 0%, rgba(10, 15, 30, 0.62) 100%)',
    caption: 'SRKR Campus Landscape & Student Innovation Promenade'
  },
  identity_verification: {
    imageUrl: '/images/auth_campus_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(20, 20, 35, 0.45) 0%, rgba(10, 15, 30, 0.70) 100%)',
    caption: 'SRKR Administrative Secretariat & Student Records Center'
  },
  file_report: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(24, 24, 37, 0.42) 0%, rgba(10, 15, 30, 0.68) 100%)',
    caption: 'SRKR Campus Security Corridor & Student Safety Desk'
  },
  voice_report: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(19, 21, 36, 0.42) 0%, rgba(10, 15, 30, 0.68) 100%)',
    caption: 'SRKR Confidential Counseling & Voice Telemetry Wing'
  },
  sos: {
    imageUrl: '/images/sos_emergency_bg.jpg',
    overlay: 'radial-gradient(circle at center, rgba(185, 28, 28, 0.28) 0%, rgba(10, 15, 30, 0.75) 85%)',
    caption: 'SRKR Quick Response & Emergency Perimeter'
  },
  safe_walk: {
    imageUrl: '/images/student_safewalk_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(13, 148, 136, 0.20) 0%, rgba(10, 15, 30, 0.68) 100%)',
    caption: 'SRKR Illuminated Night Walkways & Campus Patrol Path'
  },
  my_cases: {
    imageUrl: '/images/staff_admin_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(30, 41, 59, 0.45) 0%, rgba(10, 15, 30, 0.70) 100%)',
    caption: 'SRKR Institutional Grievance & Case Redressal Cell'
  },
  trusted_contacts: {
    imageUrl: '/images/auth_campus_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(23, 25, 35, 0.45) 0%, rgba(10, 15, 30, 0.70) 100%)',
    caption: 'SRKR Student Guardian Network & Emergency Contacts'
  },
  settings: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.45) 0%, rgba(10, 15, 30, 0.70) 100%)',
    caption: 'SRKR Security Systems & Personal Preferences Tower'
  },
  staff_dashboard: {
    imageUrl: '/images/staff_admin_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(6, 45, 34, 0.45) 0%, rgba(4, 20, 13, 0.72) 100%)',
    caption: 'SRKR Faculty Secretariat & Departmental Response Cell'
  },
  admin_dashboard: {
    imageUrl: '/images/campus_hero_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(6, 45, 34, 0.48) 0%, rgba(4, 20, 13, 0.75) 100%)',
    caption: 'SRKR Campus Command & Security Operations Center'
  },
  safe_box: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.55) 0%, rgba(10, 15, 30, 0.85) 100%)',
    caption: 'SRKR Confidential Vault & Encrypted Student Locker'
  },
  student_profile: {
    imageUrl: '/images/auth_campus_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(20, 20, 35, 0.45) 0%, rgba(10, 15, 30, 0.70) 100%)',
    caption: 'SRKR Student Identity & Verified Credentials'
  },
  super_admin: {
    imageUrl: '/images/staff_admin_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.50) 0%, rgba(8, 12, 24, 0.80) 100%)',
    caption: 'Kavach Campus Multi-Institutional Command Infrastructure'
  },
  landing: {
    imageUrl: '/images/campus_hero_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.40) 0%, rgba(8, 13, 26, 0.85) 100%)',
    caption: 'SRKR Engineering College — Campus Gateway'
  },
  about: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.45) 0%, rgba(8, 13, 26, 0.85) 100%)',
    caption: 'SRKR Engineering Excellence & Student Dignity Network'
  },
  features: {
    imageUrl: '/images/campus_hero_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.45) 0%, rgba(8, 13, 26, 0.85) 100%)',
    caption: 'SRKR Smart Campus Security & Rapid Telemetry Suite'
  },
  contact: {
    imageUrl: '/images/auth_campus_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.45) 0%, rgba(8, 13, 26, 0.85) 100%)',
    caption: 'SRKR Emergency Helpdesk & Campus Dispatch Desk'
  },
  privacy: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.55) 0%, rgba(8, 13, 26, 0.90) 100%)',
    caption: 'SRKR Institutional Privacy & Data Protection Standard'
  },
  management_dashboard: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(4, 32, 24, 0.45) 0%, rgba(4, 20, 13, 0.72) 100%)',
    caption: 'SRKR Governing Body & Institutional Analytics Suite'
  }
};

const VISHNU_BACKGROUNDS: Record<PageKey, PageBackgroundConfig> = {
  login: {
    imageUrl: '/images/colleges/vishnu/login.jpg',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.42) 0%, rgba(10, 15, 30, 0.68) 100%)',
    caption: 'Vishnu Institute of Technology — Main Academic Campus & Tech Dome'
  },
  register: {
    imageUrl: '/images/auth_campus_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.45) 0%, rgba(10, 15, 30, 0.70) 100%)',
    caption: 'Vishnu Institute of Technology — Dr. B.V. Raju Knowledge Enclave'
  },
  verify_otp: {
    imageUrl: '/images/auth_campus_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.48) 0%, rgba(10, 15, 30, 0.72) 100%)',
    caption: 'Vishnu Institute of Technology — Identity Verification Portal'
  },
  student_dashboard: {
    imageUrl: '/images/colleges/vishnu/student-dashboard.jpg',
    overlay: 'linear-gradient(180deg, rgba(12, 28, 48, 0.35) 0%, rgba(10, 15, 30, 0.62) 100%)',
    caption: 'Vishnu Institute of Technology — Central Academic Lawn & Innovation Plaza'
  },
  identity_verification: {
    imageUrl: '/images/auth_campus_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(17, 24, 39, 0.45) 0%, rgba(10, 15, 30, 0.70) 100%)',
    caption: 'Vishnu Institute of Technology — Academic Senate & Registrar Bureau'
  },
  file_report: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(18, 25, 45, 0.42) 0%, rgba(10, 15, 30, 0.68) 100%)',
    caption: 'Vishnu Institute of Technology — Campus Safety & Redressal Center'
  },
  voice_report: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(20, 27, 45, 0.42) 0%, rgba(10, 15, 30, 0.68) 100%)',
    caption: 'Vishnu Institute of Technology — Confidential Audio Telemetry'
  },
  sos: {
    imageUrl: '/images/sos_emergency_bg.jpg',
    overlay: 'radial-gradient(circle at center, rgba(225, 29, 72, 0.28) 0%, rgba(10, 15, 30, 0.75) 85%)',
    caption: 'Vishnu Emergency Dispatch & Security Operations Wing'
  },
  safe_walk: {
    imageUrl: '/images/student_safewalk_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(14, 116, 144, 0.20) 0%, rgba(10, 15, 30, 0.68) 100%)',
    caption: 'Vishnu Campus Pathway & Smart Surveillance Avenue'
  },
  my_cases: {
    imageUrl: '/images/staff_admin_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.45) 0%, rgba(10, 15, 30, 0.70) 100%)',
    caption: 'Vishnu Student Case Tracking & Ombudsman Bureau'
  },
  trusted_contacts: {
    imageUrl: '/images/auth_campus_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(16, 24, 40, 0.45) 0%, rgba(10, 15, 30, 0.70) 100%)',
    caption: 'Vishnu Trusted Parent & Faculty Mentor Network'
  },
  settings: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.45) 0%, rgba(10, 15, 30, 0.70) 100%)',
    caption: 'Vishnu Technology Administration & Security Configuration'
  },
  staff_dashboard: {
    imageUrl: '/images/staff_admin_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(6, 45, 34, 0.45) 0%, rgba(4, 20, 13, 0.72) 100%)',
    caption: 'Vishnu Faculty & First Responder Dispatch Matrix'
  },
  admin_dashboard: {
    imageUrl: '/images/campus_hero_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(6, 45, 34, 0.48) 0%, rgba(4, 20, 13, 0.75) 100%)',
    caption: 'Vishnu Central Campus Command & Control Tower'
  },
    safe_box: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.55) 0%, rgba(4, 20, 13, 0.85) 100%)',
    caption: 'Vishnu Encrypted Student Safe Box & Document Vault'
  },
  student_profile: {
    imageUrl: '/images/auth_campus_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(20, 20, 35, 0.45) 0%, rgba(4, 20, 13, 0.70) 100%)',
    caption: 'Vishnu Student Credentials & Profile Verification'
  },
  super_admin: {
    imageUrl: '/images/staff_admin_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.50) 0%, rgba(8, 12, 24, 0.80) 100%)',
    caption: 'Kavach Campus Multi-Institutional Command Infrastructure'
  },
  landing: {
    imageUrl: '/images/campus_hero_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.40) 0%, rgba(4, 20, 13, 0.85) 100%)',
    caption: 'Vishnu Institute of Technology — Main Gateway'
  },
  about: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.45) 0%, rgba(4, 20, 13, 0.85) 100%)',
    caption: 'Vishnu Institute of Technology — Academic Excellence'
  },
  features: {
    imageUrl: '/images/campus_hero_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.45) 0%, rgba(4, 20, 13, 0.85) 100%)',
    caption: 'Vishnu Safety Systems & Real-Time Incident Response'
  },
  contact: {
    imageUrl: '/images/auth_campus_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.45) 0%, rgba(4, 20, 13, 0.85) 100%)',
    caption: 'Vishnu Security Office & Student Assistance'
  },
  privacy: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.55) 0%, rgba(4, 20, 13, 0.90) 100%)',
    caption: 'Vishnu Student Privacy Charter & Security Guardrails'
  },
  management_dashboard: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(4, 32, 24, 0.45) 0%, rgba(4, 20, 13, 0.72) 100%)',
    caption: 'Vishnu Executive Board & Institutional Quality Council'
  }
};

// Generic fallback for any other registered or searched college
const DEFAULT_FALLBACK_BACKGROUNDS: Record<PageKey, PageBackgroundConfig> = {
  login: {
    imageUrl: '/images/campus_hero_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(17, 24, 39, 0.42) 0%, rgba(10, 15, 30, 0.68) 100%)',
    caption: 'Engineering Campus — Main Entrance Gate'
  },
  register: {
    imageUrl: '/images/auth_campus_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.45) 0%, rgba(10, 15, 30, 0.70) 100%)',
    caption: 'Engineering Sciences & Admissions Quad'
  },
  verify_otp: {
    imageUrl: '/images/auth_campus_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(17, 24, 39, 0.48) 0%, rgba(10, 15, 30, 0.72) 100%)',
    caption: 'Campus Credential & Security Registry'
  },
  student_dashboard: {
    imageUrl: '/images/campus_hero_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(13, 26, 27, 0.35) 0%, rgba(10, 15, 30, 0.62) 100%)',
    caption: 'Campus Academic Lawn & Student Services'
  },
  identity_verification: {
    imageUrl: '/images/auth_campus_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(17, 24, 39, 0.45) 0%, rgba(10, 15, 30, 0.70) 100%)',
    caption: 'Administration Building & Academic Records'
  },
  file_report: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(17, 24, 39, 0.42) 0%, rgba(10, 15, 30, 0.68) 100%)',
    caption: 'Campus Walkway & Safety Desk'
  },
  voice_report: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(17, 24, 39, 0.42) 0%, rgba(10, 15, 30, 0.68) 100%)',
    caption: 'Campus Guidance & Confidential Support'
  },
  sos: {
    imageUrl: '/images/sos_emergency_bg.jpg',
    overlay: 'radial-gradient(circle at center, rgba(185, 28, 28, 0.28) 0%, rgba(10, 15, 30, 0.75) 85%)',
    caption: 'Emergency Security Perimeter'
  },
  safe_walk: {
    imageUrl: '/images/student_safewalk_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(13, 148, 136, 0.20) 0%, rgba(10, 15, 30, 0.68) 100%)',
    caption: 'Illuminated Night Walkway'
  },
  my_cases: {
    imageUrl: '/images/staff_admin_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(17, 24, 39, 0.45) 0%, rgba(10, 15, 30, 0.70) 100%)',
    caption: 'Campus Grievance & Records Cell'
  },
  trusted_contacts: {
    imageUrl: '/images/auth_campus_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(17, 24, 39, 0.45) 0%, rgba(10, 15, 30, 0.70) 100%)',
    caption: 'Student Support Network'
  },
  settings: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(17, 24, 39, 0.45) 0%, rgba(10, 15, 30, 0.70) 100%)',
    caption: 'Security Settings & Preferences'
  },
  staff_dashboard: {
    imageUrl: '/images/staff_admin_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(6, 45, 34, 0.45) 0%, rgba(4, 20, 13, 0.72) 100%)',
    caption: 'Faculty & Responder Control Room'
  },
  admin_dashboard: {
    imageUrl: '/images/campus_hero_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(6, 45, 34, 0.48) 0%, rgba(4, 20, 13, 0.75) 100%)',
    caption: 'Campus Central Command Tower'
  },
    safe_box: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.55) 0%, rgba(10, 15, 30, 0.85) 100%)',
    caption: 'Confidential Safe Box & Encrypted Evidence Vault'
  },
  student_profile: {
    imageUrl: '/images/auth_campus_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(17, 24, 39, 0.45) 0%, rgba(10, 15, 30, 0.70) 100%)',
    caption: 'Student Profile & Campus Accreditation'
  },
  super_admin: {
    imageUrl: '/images/staff_admin_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(15, 23, 42, 0.50) 0%, rgba(8, 12, 24, 0.80) 100%)',
    caption: 'Kavach Campus Multi-Campus System Governance'
  },
  landing: {
    imageUrl: '/images/campus_hero_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.40) 0%, rgba(8, 13, 26, 0.85) 100%)',
    caption: 'Kavach Campus — Smart Student Safety Platform'
  },
  about: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.45) 0%, rgba(8, 13, 26, 0.85) 100%)',
    caption: 'About Kavach Campus Safety Network'
  },
  features: {
    imageUrl: '/images/campus_hero_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.45) 0%, rgba(8, 13, 26, 0.85) 100%)',
    caption: 'Kavach Campus Advanced Safety Capabilities'
  },
  contact: {
    imageUrl: '/images/auth_campus_bg.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.45) 0%, rgba(8, 13, 26, 0.85) 100%)',
    caption: 'Campus Helpdesk & Technical Support'
  },
  privacy: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(10, 15, 30, 0.55) 0%, rgba(8, 13, 26, 0.90) 100%)',
    caption: 'Kavach Campus Privacy & Security Policy'
  },
  management_dashboard: {
    imageUrl: '/images/desktop_hero_banner.jpg',
    overlay: 'linear-gradient(180deg, rgba(4, 32, 24, 0.45) 0%, rgba(4, 20, 13, 0.72) 100%)',
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
  },
  'dnr-bhimavaram': {
    id: 'dnr-bhimavaram',
    name: 'DNR College of Engineering and Technology',
    shortName: 'DNR College of Engg',
    tagline: 'Pioneering Technical Education & Student Wellbeing',
    logoSvg: DEFAULT_LOGO_SVG,
    primaryColor: '#2563eb',
    secondaryColor: '#059669',
    accentGradient: 'linear-gradient(135deg, #2563eb 0%, #059669 100%)',
    pageBackgrounds: DEFAULT_FALLBACK_BACKGROUNDS
  },
  'swarnandhra-narsapur': {
    id: 'swarnandhra-narsapur',
    name: 'Swarnandhra College of Engineering and Technology (Autonomous)',
    shortName: 'Swarnandhra College of Engg',
    tagline: 'Empowering Engineers in a Secure Campus Ecosystem',
    logoSvg: DEFAULT_LOGO_SVG,
    primaryColor: '#0284c7',
    secondaryColor: '#f59e0b',
    accentGradient: 'linear-gradient(135deg, #0284c7 0%, #f59e0b 100%)',
    pageBackgrounds: DEFAULT_FALLBACK_BACKGROUNDS
  },
  'aditya-surampalem': {
    id: 'aditya-surampalem',
    name: 'Aditya Engineering College (Autonomous)',
    shortName: 'Aditya Engineering College',
    tagline: 'Technical Innovation with 24/7 Student Safety',
    logoSvg: DEFAULT_LOGO_SVG,
    primaryColor: '#dc2626',
    secondaryColor: '#ea580c',
    accentGradient: 'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)',
    pageBackgrounds: DEFAULT_FALLBACK_BACKGROUNDS
  },
  'jntuk-kakinada': {
    id: 'jntuk-kakinada',
    name: 'Jawaharlal Nehru Technological University College of Engineering Kakinada',
    shortName: 'JNTUK Kakinada',
    tagline: 'Premier State Technological University Campus Safety',
    logoSvg: DEFAULT_LOGO_SVG,
    primaryColor: '#1d4ed8',
    secondaryColor: '#9333ea',
    accentGradient: 'linear-gradient(135deg, #1d4ed8 0%, #9333ea 100%)',
    pageBackgrounds: DEFAULT_FALLBACK_BACKGROUNDS
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
    
    // Fuzzy matching for colleges
    if (normalized.includes('srkr') || normalized.includes('sagi rama')) {
      return COLLEGE_BRANDINGS['srkr-bhimavaram'];
    }
    if (normalized.includes('vishnu') || normalized.includes('vit')) {
      return COLLEGE_BRANDINGS['vit-bhimavaram'];
    }
    if (normalized.includes('dnr')) {
      return COLLEGE_BRANDINGS['dnr-bhimavaram'];
    }
    if (normalized.includes('swarnandhra')) {
      return COLLEGE_BRANDINGS['swarnandhra-narsapur'];
    }
    if (normalized.includes('aditya') || normalized.includes('aec')) {
      return COLLEGE_BRANDINGS['aditya-surampalem'];
    }
    if (normalized.includes('jntuk') || normalized.includes('jntu')) {
      return COLLEGE_BRANDINGS['jntuk-kakinada'];
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

/**
 * Returns the unique 3D and UI animation theme configuration for an institution.
 */
export function getCollegeAnimationTheme(collegeIdOrSlug?: string | null): AnimationThemeConfig {
  const branding = getCollegeBranding(collegeIdOrSlug);
  if (branding.animationTheme) {
    return branding.animationTheme;
  }

  const id = (collegeIdOrSlug || '').toLowerCase();
  if (id.includes('srkr')) {
    return {
      styleName: 'SRKR Technical Radar Grid',
      themeStyle: 'technical_grid',
      particleColor: '#f59e0b',
      shieldAccent: '#b91c1c',
      glowEffect: '0 0 25px rgba(245, 158, 11, 0.45)',
    };
  }
  if (id.includes('vishnu') || id.includes('vit')) {
    return {
      styleName: 'Vishnu Cyber Aurora Pulse',
      themeStyle: 'cyber_aurora',
      particleColor: '#10b981',
      shieldAccent: '#059669',
      glowEffect: '0 0 30px rgba(16, 185, 129, 0.5)',
    };
  }
  if (id.includes('dnr')) {
    return {
      styleName: 'DNR Marine Wave Safety',
      themeStyle: 'marine_wave',
      particleColor: '#06b6d4',
      shieldAccent: '#0284c7',
      glowEffect: '0 0 25px rgba(6, 182, 212, 0.4)',
    };
  }
  if (id.includes('jntu')) {
    return {
      styleName: 'JNTUK Engineering Gear Vortex',
      themeStyle: 'engineering_gear',
      particleColor: '#f97316',
      shieldAccent: '#c2410c',
      glowEffect: '0 0 25px rgba(249, 115, 22, 0.45)',
    };
  }

  // Universal Default / Unassigned
  return {
    styleName: 'Kavach Modern Glass Shield',
    themeStyle: 'modern_glass',
    particleColor: '#60a5fa',
    shieldAccent: '#3b82f6',
    glowEffect: '0 0 25px rgba(59, 130, 246, 0.35)',
  };
}
