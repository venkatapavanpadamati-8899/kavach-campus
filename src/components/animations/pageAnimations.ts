export type AnimationType =
  | 'mascot_3d'
  | 'sos_beacon'
  | 'audio_waveform'
  | 'route_navigation'
  | 'scanner_laser'
  | 'incident_timeline'
  | 'secure_shield'
  | 'admin_radar'
  | 'lock_recovery'
  | 'otp_counter'
  | 'governance_crest'
  | 'minimal_ambient';

export interface PageAnimationConfig {
  route: string;
  title: string;
  animationType: AnimationType;
  motionIntensity: 'calm' | 'dynamic' | 'urgent';
  accentColor: string;
  backgroundGlow: string;
  description: string;
}

/**
 * Registry mapping all 30+ Kavach Campus routes to distinct, purpose-specific animations.
 * Ensures no two distinct workflows share an identical generic animation.
 */
export const PAGE_ANIMATION_REGISTRY: Record<string, PageAnimationConfig> = {
  // Public & Authentication Entrypoints (Interactive 3D Safety Shield Character)
  '/': {
    route: '/',
    title: 'Landing Gateway',
    animationType: 'mascot_3d',
    motionIntensity: 'dynamic',
    accentColor: '#22d3ee',
    backgroundGlow: 'radial-gradient(circle at 50% 20%, rgba(34, 211, 238, 0.18) 0%, transparent 70%)',
    description: '3D Campus Safety Mascot Avatar with ambient holographic rings',
  },
  '/login': {
    route: '/login',
    title: 'Portal Sign In',
    animationType: 'mascot_3d',
    motionIntensity: 'dynamic',
    accentColor: '#3b82f6',
    backgroundGlow: 'radial-gradient(circle at 50% 30%, rgba(59, 130, 246, 0.22) 0%, transparent 65%)',
    description: 'Interactive character tracking cursor and covering eyes on password focus',
  },
  '/register': {
    route: '/register',
    title: 'Account Registration',
    animationType: 'mascot_3d',
    motionIntensity: 'dynamic',
    accentColor: '#8b5cf6',
    backgroundGlow: 'radial-gradient(circle at 50% 30%, rgba(139, 92, 246, 0.22) 0%, transparent 65%)',
    description: 'Mascot welcome pose with multi-step registration validation feedback',
  },
  '/verify-otp': {
    route: '/verify-otp',
    title: 'OTP Verification',
    animationType: 'otp_counter',
    motionIntensity: 'calm',
    accentColor: '#10b981',
    backgroundGlow: 'radial-gradient(circle at 50% 40%, rgba(16, 185, 129, 0.2) 0%, transparent 60%)',
    description: 'Tick-by-tick countdown ring with verified green shield confirmation',
  },
  '/forgot-password': {
    route: '/forgot-password',
    title: 'Forgot Password',
    animationType: 'lock_recovery',
    motionIntensity: 'calm',
    accentColor: '#f59e0b',
    backgroundGlow: 'radial-gradient(circle at 50% 30%, rgba(245, 158, 11, 0.18) 0%, transparent 65%)',
    description: 'Animated tumbler padlock that smoothly unlocks upon credential match',
  },
  '/reset-password': {
    route: '/reset-password',
    title: 'Password Reset',
    animationType: 'lock_recovery',
    motionIntensity: 'calm',
    accentColor: '#06b6d4',
    backgroundGlow: 'radial-gradient(circle at 50% 30%, rgba(6, 182, 212, 0.2) 0%, transparent 65%)',
    description: 'Cryptographic key exchange and password strength wave animation',
  },

  // Student Core Safety Suite
  '/student': {
    route: '/student',
    title: 'Student Dashboard',
    animationType: 'secure_shield',
    motionIntensity: 'calm',
    accentColor: '#38bdf8',
    backgroundGlow: 'radial-gradient(circle at 50% 10%, rgba(56, 189, 248, 0.14) 0%, transparent 70%)',
    description: 'Verified institution crest with staggered quick-action card entrances',
  },
  '/student/sos': {
    route: '/student/sos',
    title: 'One-Tap Emergency SOS',
    animationType: 'sos_beacon',
    motionIntensity: 'urgent',
    accentColor: '#ef4444',
    backgroundGlow: 'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.3) 0%, transparent 80%)',
    description: 'Rapid concentric dual-beacon pulse with zero UI latency or blocking',
  },
  '/student/safe-walk': {
    route: '/student/safe-walk',
    title: 'Safe Walk Companion',
    animationType: 'route_navigation',
    motionIntensity: 'dynamic',
    accentColor: '#10b981',
    backgroundGlow: 'radial-gradient(circle at 50% 40%, rgba(16, 185, 129, 0.18) 0%, transparent 70%)',
    description: 'Animated waypoint trail tracking walking progress along campus pathways',
  },
  '/student/voice-report': {
    route: '/student/voice-report',
    title: 'Voice Incident Report',
    animationType: 'audio_waveform',
    motionIntensity: 'dynamic',
    accentColor: '#ec4899',
    backgroundGlow: 'radial-gradient(circle at 50% 45%, rgba(236, 72, 153, 0.22) 0%, transparent 65%)',
    description: 'Multi-bar live acoustic waveform visualizer reflecting voice telemetry',
  },
  '/student/report': {
    route: '/student/report',
    title: 'Confidential Report Filing',
    animationType: 'secure_shield',
    motionIntensity: 'calm',
    accentColor: '#8b5cf6',
    backgroundGlow: 'radial-gradient(circle at 50% 30%, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
    description: 'Evidence upload drag-and-drop state with step-by-step progress glow',
  },
  '/student/cases': {
    route: '/student/cases',
    title: 'My Active Cases',
    animationType: 'incident_timeline',
    motionIntensity: 'calm',
    accentColor: '#0ea5e9',
    backgroundGlow: 'radial-gradient(circle at 50% 20%, rgba(14, 165, 233, 0.16) 0%, transparent 70%)',
    description: 'Animated resolution milestone timeline with live status beacon',
  },
  '/student/incidents': {
    route: '/student/incidents',
    title: 'Incident History',
    animationType: 'incident_timeline',
    motionIntensity: 'calm',
    accentColor: '#0284c7',
    backgroundGlow: 'radial-gradient(circle at 50% 20%, rgba(2, 132, 199, 0.14) 0%, transparent 70%)',
    description: 'Chronological telemetry log with responder assignment verification',
  },
  '/student/profile': {
    route: '/student/profile',
    title: 'Student Identity & ID Card',
    animationType: 'scanner_laser',
    motionIntensity: 'calm',
    accentColor: '#6366f1',
    backgroundGlow: 'radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.18) 0%, transparent 65%)',
    description: 'Holographic ID card scanner sweep verifying institutional credentials',
  },
  '/student/verification-status': {
    route: '/student/verification-status',
    title: 'Campus Verification Status',
    animationType: 'scanner_laser',
    motionIntensity: 'dynamic',
    accentColor: '#06b6d4',
    backgroundGlow: 'radial-gradient(circle at 50% 35%, rgba(6, 182, 212, 0.22) 0%, transparent 65%)',
    description: 'AI OCR document cross-check scan with automated confidence metrics',
  },
  '/student/trusted-contacts': {
    route: '/student/trusted-contacts',
    title: 'Trusted Safety Contacts',
    animationType: 'secure_shield',
    motionIntensity: 'calm',
    accentColor: '#14b8a6',
    backgroundGlow: 'radial-gradient(circle at 50% 25%, rgba(20, 184, 166, 0.18) 0%, transparent 70%)',
    description: 'Connected guardian network radar with instant emergency link indicator',
  },
  '/student/contacts': {
    route: '/student/contacts',
    title: 'Emergency Directory',
    animationType: 'secure_shield',
    motionIntensity: 'calm',
    accentColor: '#10b981',
    backgroundGlow: 'radial-gradient(circle at 50% 20%, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
    description: 'Institutional helpline cards with instant one-tap contact pulses',
  },
  '/student/settings': {
    route: '/student/settings',
    title: 'Privacy & Security Settings',
    animationType: 'minimal_ambient',
    motionIntensity: 'calm',
    accentColor: '#64748b',
    backgroundGlow: 'radial-gradient(circle at 50% 20%, rgba(100, 116, 139, 0.14) 0%, transparent 70%)',
    description: 'Subtle ambient mesh with toggle transition micro-interactions',
  },

  // Staff & Faculty Responder Operations
  '/staff': {
    route: '/staff',
    title: 'Staff Responder Portal',
    animationType: 'governance_crest',
    motionIntensity: 'calm',
    accentColor: '#3b82f6',
    backgroundGlow: 'radial-gradient(circle at 50% 15%, rgba(59, 130, 246, 0.16) 0%, transparent 70%)',
    description: 'Institutional faculty crest with assigned emergency queue telemetry',
  },
  '/staff/incidents': {
    route: '/staff/incidents',
    title: 'Assigned Incident Queue',
    animationType: 'incident_timeline',
    motionIntensity: 'dynamic',
    accentColor: '#f59e0b',
    backgroundGlow: 'radial-gradient(circle at 50% 20%, rgba(245, 158, 11, 0.18) 0%, transparent 65%)',
    description: 'Severity-tagged ticket intake with active response timer indicators',
  },

  // Campus Administration & Departmental Oversight
  '/admin': {
    route: '/admin',
    title: 'Campus Command Center',
    animationType: 'admin_radar',
    motionIntensity: 'calm',
    accentColor: '#0ea5e9',
    backgroundGlow: 'radial-gradient(circle at 50% 15%, rgba(14, 165, 233, 0.18) 0%, transparent 70%)',
    description: 'Live 360-degree silent audit radar monitoring institutional telemetry',
  },
  '/admin/incidents': {
    route: '/admin/incidents',
    title: 'Incident Redressal Matrix',
    animationType: 'admin_radar',
    motionIntensity: 'dynamic',
    accentColor: '#ef4444',
    backgroundGlow: 'radial-gradient(circle at 50% 25%, rgba(239, 68, 68, 0.18) 0%, transparent 70%)',
    description: 'Campus-wide triage map with departmental escalation queues',
  },
  '/admin/users': {
    route: '/admin/users',
    title: 'Student & Staff Roster',
    animationType: 'admin_radar',
    motionIntensity: 'calm',
    accentColor: '#6366f1',
    backgroundGlow: 'radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.16) 0%, transparent 70%)',
    description: 'Cryptographic identity verification queue with approval gates',
  },
  '/admin/campus': {
    route: '/admin/campus',
    title: 'Campus Perimeter & Geozones',
    animationType: 'route_navigation',
    motionIntensity: 'calm',
    accentColor: '#10b981',
    backgroundGlow: 'radial-gradient(circle at 50% 30%, rgba(16, 185, 129, 0.18) 0%, transparent 70%)',
    description: 'Interactive boundary polygon visualizer for campus safe zones',
  },
  '/admin/system-audit': {
    route: '/admin/system-audit',
    title: 'Security Audit & Compliance',
    animationType: 'admin_radar',
    motionIntensity: 'calm',
    accentColor: '#8b5cf6',
    backgroundGlow: 'radial-gradient(circle at 50% 20%, rgba(139, 92, 246, 0.16) 0%, transparent 70%)',
    description: 'Immutable ledger audit log with cryptographic hash verification',
  },
  '/admin/ai': {
    route: '/admin/ai',
    title: 'AI Classification Engine',
    animationType: 'admin_radar',
    motionIntensity: 'dynamic',
    accentColor: '#ec4899',
    backgroundGlow: 'radial-gradient(circle at 50% 25%, rgba(236, 72, 153, 0.18) 0%, transparent 70%)',
    description: 'Neural confidence matrix visualizer for multi-lingual risk scoring',
  },

  // Management & Governing Body
  '/management': {
    route: '/management',
    title: 'Institutional Governance Suite',
    animationType: 'governance_crest',
    motionIntensity: 'calm',
    accentColor: '#d97706',
    backgroundGlow: 'radial-gradient(circle at 50% 15%, rgba(217, 119, 6, 0.16) 0%, transparent 70%)',
    description: 'Executive safety analytics and compliance metrics overview',
  },
  '/management/incidents': {
    route: '/management/incidents',
    title: 'Executive Case Review',
    animationType: 'governance_crest',
    motionIntensity: 'calm',
    accentColor: '#b45309',
    backgroundGlow: 'radial-gradient(circle at 50% 20%, rgba(180, 83, 9, 0.16) 0%, transparent 70%)',
    description: 'High-severity and critical incident redressal oversight',
  },

  // Super Administrator (Multi-Tenant System Authority)
  '/super-admin': {
    route: '/super-admin',
    title: 'System Federation Console',
    animationType: 'admin_radar',
    motionIntensity: 'dynamic',
    accentColor: '#6366f1',
    backgroundGlow: 'radial-gradient(circle at 50% 15%, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
    description: 'Multi-campus federation radar with cross-tenant isolation telemetry',
  },
  '/super-admin/login': {
    route: '/super-admin/login',
    title: 'Executive Master Access',
    animationType: 'lock_recovery',
    motionIntensity: 'calm',
    accentColor: '#4f46e5',
    backgroundGlow: 'radial-gradient(circle at 50% 30%, rgba(79, 70, 229, 0.22) 0%, transparent 65%)',
    description: 'Hardware key / MFA cryptographic challenge gateway',
  },
  '/super-admin/pending-campus': {
    route: '/super-admin/pending-campus',
    title: 'Campus Accreditation Queue',
    animationType: 'admin_radar',
    motionIntensity: 'calm',
    accentColor: '#8b5cf6',
    backgroundGlow: 'radial-gradient(circle at 50% 20%, rgba(139, 92, 246, 0.18) 0%, transparent 70%)',
    description: 'Institutional tenant onboarding verification and domain trust review',
  },

  // Informational & Compliance
  '/about': {
    route: '/about',
    title: 'About Kavach Campus',
    animationType: 'minimal_ambient',
    motionIntensity: 'calm',
    accentColor: '#38bdf8',
    backgroundGlow: 'radial-gradient(circle at 50% 20%, rgba(56, 189, 248, 0.12) 0%, transparent 70%)',
    description: 'Subtle safety mission crest with gentle ambient particle float',
  },
  '/features': {
    route: '/features',
    title: 'Safety Features',
    animationType: 'minimal_ambient',
    motionIntensity: 'dynamic',
    accentColor: '#22d3ee',
    backgroundGlow: 'radial-gradient(circle at 50% 20%, rgba(34, 211, 238, 0.15) 0%, transparent 70%)',
    description: 'Interactive feature showcase cards with staggered reveal physics',
  },
  '/contact': {
    route: '/contact',
    title: 'Emergency & Campus Contacts',
    animationType: 'secure_shield',
    motionIntensity: 'calm',
    accentColor: '#10b981',
    backgroundGlow: 'radial-gradient(circle at 50% 25%, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
    description: 'Helpdesk channel links with active responsiveness indicators',
  },
  '/privacy': {
    route: '/privacy',
    title: 'Privacy & Data Protection',
    animationType: 'minimal_ambient',
    motionIntensity: 'calm',
    accentColor: '#64748b',
    backgroundGlow: 'radial-gradient(circle at 50% 20%, rgba(100, 116, 139, 0.12) 0%, transparent 70%)',
    description: 'Zero-knowledge encryption and tenant isolation disclosure overview',
  },
  '/unauthorized': {
    route: '/unauthorized',
    title: 'Access Restricted',
    animationType: 'lock_recovery',
    motionIntensity: 'calm',
    accentColor: '#ef4444',
    backgroundGlow: 'radial-gradient(circle at 50% 30%, rgba(239, 68, 68, 0.22) 0%, transparent 65%)',
    description: 'Restricted boundary lock with role escalation guidance',
  },
};

/**
 * Returns the page-specific animation configuration for any route,
 * falling back gracefully to minimal ambient if the route is unlisted.
 */
export function getPageAnimationConfig(pathname: string): PageAnimationConfig {
  if (!pathname) return PAGE_ANIMATION_REGISTRY['/'];

  // Normalize path (strip trailing slash)
  const normalized = pathname.length > 1 && pathname.endsWith('/') 
    ? pathname.slice(0, -1) 
    : pathname;

  if (PAGE_ANIMATION_REGISTRY[normalized]) {
    return PAGE_ANIMATION_REGISTRY[normalized];
  }

  // Sort keys by length descending to match most specific subroutes first (e.g. /student/cases before /student)
  const sortedRouteKeys = Object.keys(PAGE_ANIMATION_REGISTRY).sort((a, b) => b.length - a.length);

  for (const routeKey of sortedRouteKeys) {
    if (routeKey !== '/' && (normalized === routeKey || normalized.startsWith(routeKey + '/'))) {
      return PAGE_ANIMATION_REGISTRY[routeKey];
    }
  }

  // Graceful default fallback
  return {
    route: normalized,
    title: 'Campus Safety',
    animationType: 'minimal_ambient',
    motionIntensity: 'calm',
    accentColor: '#38bdf8',
    backgroundGlow: 'radial-gradient(circle at 50% 20%, rgba(56, 189, 248, 0.12) 0%, transparent 70%)',
    description: 'Subtle ambient safety backdrop with high accessibility contrast',
  };
}
