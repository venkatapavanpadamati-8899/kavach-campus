/**
 * Kavach Campus - Typed Page Animation Registry
 * Maps each real application route to a distinct, page-specific animation configuration.
 * Solves the multi-page animation challenge without requiring 30+ separate paid 3D models.
 */

export type PageAnimationStyle =
  | 'hero_shield'             // Landing / Index - 3D Hologram Security Shield
  | 'login_mascot'            // Login - Interactive 3D Mascot with Eye Tracking & Paws
  | 'register_stepper'        // Register - Biometric Step Progression & Validation
  | 'lock_shield'             // Forgot / Reset Password - Cryptographic Vault Lock
  | 'otp_matrix'              // OTP Verification - High-security Digital Pulse & Matrix
  | 'student_pulse'           // Student Dashboard - Active Protection Field & Status
  | 'radar_sweep'             // Safe Walk - Live Geo-Location Radar & Route Tracking
  | 'audio_waveform'          // Voice Report - Real-time Reactive Sound Waveform
  | 'file_vault'              // File / Incident Report - Encrypted Document Vault Flow
  | 'emergency_beacon'        // SOS Emergency - High-contrast Ultra-fast Strobe Beacon
  | 'id_scanner'              // Identity / Profile Verification - AI Laser Hologram Scanner
  | 'timeline_flow'           // Cases & History - Chronological Case Telemetry Trace
  | 'guardian_network'        // Trusted Contacts - Mesh Node Topology Network
  | 'staff_command'           // Staff Dashboard - Priority Incident Queue Stream
  | 'admin_radar'             // Campus Admin - Multi-Department Tactical Heatmap
  | 'management_analytics'    // Management - Strategic Institutional Insight Rings
  | 'super_admin_core'        // Super Admin - Global Sovereign Campus Telemetry Orb
  | 'settings_gears'          // Settings - Fine-tuned Security Configuration Gears
  | 'public_flow';            // About / Features / Privacy - Subtle Floating Glass Particles

export interface PageAnimationConfig {
  pageId: string;
  route: string;
  title: string;
  animationStyle: PageAnimationStyle;
  intensity: 'low' | 'medium' | 'high';
  accentGlow: string;
  hasInteractive3DMascot: boolean;
  description: string;
}

export const PAGE_ANIMATION_REGISTRY: Record<string, PageAnimationConfig> = {
  // Public & Authentication
  '/': {
    pageId: 'landing',
    route: '/',
    title: 'Kavach Campus Security Portal',
    animationStyle: 'hero_shield',
    intensity: 'high',
    accentGlow: 'rgba(59, 130, 246, 0.4)',
    hasInteractive3DMascot: true,
    description: 'Central 3D Holographic Shield with campus perimeter pulses',
  },
  '/login': {
    pageId: 'login',
    route: '/login',
    title: 'Secure Authentication Gate',
    animationStyle: 'login_mascot',
    intensity: 'medium',
    accentGlow: 'rgba(99, 102, 241, 0.35)',
    hasInteractive3DMascot: true,
    description: 'Interactive mascot watching mouse/inputs and shielding eyes on password',
  },
  '/register': {
    pageId: 'register',
    route: '/register',
    title: 'Student Identity Onboarding',
    animationStyle: 'register_stepper',
    intensity: 'medium',
    accentGlow: 'rgba(16, 185, 129, 0.35)',
    hasInteractive3DMascot: true,
    description: 'Dynamic welcoming mascot with biometric step-progress indicators',
  },
  '/forgot-password': {
    pageId: 'forgot-password',
    route: '/forgot-password',
    title: 'Credential Recovery Vault',
    animationStyle: 'lock_shield',
    intensity: 'low',
    accentGlow: 'rgba(234, 179, 8, 0.3)',
    hasInteractive3DMascot: false,
    description: 'Cryptographic lock-and-key ring rotation animation',
  },
  '/reset-password': {
    pageId: 'reset-password',
    route: '/reset-password',
    title: 'Secure Token Reset',
    animationStyle: 'lock_shield',
    intensity: 'low',
    accentGlow: 'rgba(234, 179, 8, 0.3)',
    hasInteractive3DMascot: false,
    description: 'Dual-phase key verification rotating ring effect',
  },
  '/verify-otp': {
    pageId: 'verify-otp',
    route: '/verify-otp',
    title: 'Two-Factor Challenge',
    animationStyle: 'otp_matrix',
    intensity: 'medium',
    accentGlow: 'rgba(14, 165, 233, 0.4)',
    hasInteractive3DMascot: false,
    description: 'Hexagonal cryptographic countdown matrix with confirmation checkmark',
  },

  // Student Core Services
  '/student': {
    pageId: 'student_dashboard',
    route: '/student',
    title: 'Student Command Dashboard',
    animationStyle: 'student_pulse',
    intensity: 'medium',
    accentGlow: 'rgba(59, 130, 246, 0.25)',
    hasInteractive3DMascot: false,
    description: 'Active campus safety grid with live telemetry pulses',
  },
  '/student/safe-walk': {
    pageId: 'safe_walk',
    route: '/student/safe-walk',
    title: 'Safe Walk Night Patrol',
    animationStyle: 'radar_sweep',
    intensity: 'high',
    accentGlow: 'rgba(13, 148, 136, 0.45)',
    hasInteractive3DMascot: false,
    description: '360-degree radar sweeping wave tracking safe route corridors',
  },
  '/student/voice-report': {
    pageId: 'voice_report',
    route: '/student/voice-report',
    title: 'Voice Telemetry Witness',
    animationStyle: 'audio_waveform',
    intensity: 'high',
    accentGlow: 'rgba(168, 85, 247, 0.4)',
    hasInteractive3DMascot: false,
    description: 'Dynamic audio frequency spectrum reacting to sound decibels',
  },
  '/student/report': {
    pageId: 'file_report',
    route: '/student/report',
    title: 'Confidential Incident Filing',
    animationStyle: 'file_vault',
    intensity: 'medium',
    accentGlow: 'rgba(99, 102, 241, 0.3)',
    hasInteractive3DMascot: false,
    description: 'Quantum-encrypted file dropzone with holographic upload streams',
  },
  '/student/sos': {
    pageId: 'sos',
    route: '/student/sos',
    title: 'Emergency Distress Beacon',
    animationStyle: 'emergency_beacon',
    intensity: 'high',
    accentGlow: 'rgba(239, 68, 68, 0.7)',
    hasInteractive3DMascot: false,
    description: 'Ultra-fast, zero-lag red strobe beacon with immediate dispatch priority',
  },
  '/student/verification-status': {
    pageId: 'id_verification',
    route: '/student/verification-status',
    title: 'AI Credential Verification',
    animationStyle: 'id_scanner',
    intensity: 'medium',
    accentGlow: 'rgba(6, 182, 212, 0.4)',
    hasInteractive3DMascot: false,
    description: 'Cyan laser biometric scan bar sweeping across institutional ID badge',
  },
  '/student/cases': {
    pageId: 'student_cases',
    route: '/student/cases',
    title: 'Case History & Resolution',
    animationStyle: 'timeline_flow',
    intensity: 'low',
    accentGlow: 'rgba(59, 130, 246, 0.3)',
    hasInteractive3DMascot: false,
    description: 'Vertical chronological telemetry line with glowing status nodes',
  },
  '/student/trusted-contacts': {
    pageId: 'trusted_contacts',
    route: '/student/trusted-contacts',
    title: 'Emergency Guardian Mesh',
    animationStyle: 'guardian_network',
    intensity: 'low',
    accentGlow: 'rgba(16, 185, 129, 0.35)',
    hasInteractive3DMascot: false,
    description: 'Constellation graph linking student node to verified guardian satellites',
  },
  '/student/profile': {
    pageId: 'student_profile',
    route: '/student/profile',
    title: 'Student Dossier & Identity',
    animationStyle: 'id_scanner',
    intensity: 'low',
    accentGlow: 'rgba(99, 102, 241, 0.25)',
    hasInteractive3DMascot: false,
    description: 'Subtle identity credential halo with verified security watermark',
  },
  '/student/settings': {
    pageId: 'student_settings',
    route: '/student/settings',
    title: 'Personal Privacy & Encryption',
    animationStyle: 'settings_gears',
    intensity: 'low',
    accentGlow: 'rgba(100, 116, 139, 0.3)',
    hasInteractive3DMascot: false,
    description: 'Interlocking precision cryptographic dials and telemetry toggles',
  },

  // Staff & Responders
  '/staff': {
    pageId: 'staff_dashboard',
    route: '/staff',
    title: 'Responder Command Console',
    animationStyle: 'staff_command',
    intensity: 'medium',
    accentGlow: 'rgba(245, 158, 11, 0.35)',
    hasInteractive3DMascot: false,
    description: 'Live incident queue waterfall with urgent alert flash badges',
  },
  '/staff/incidents': {
    pageId: 'staff_incidents',
    route: '/staff/incidents',
    title: 'Assigned Incident Docket',
    animationStyle: 'staff_command',
    intensity: 'medium',
    accentGlow: 'rgba(245, 158, 11, 0.35)',
    hasInteractive3DMascot: false,
    description: 'Departmental triage board with live assignment state transitions',
  },

  // Campus Admin & Management
  '/admin': {
    pageId: 'admin_dashboard',
    route: '/admin',
    title: 'Campus Safety Operations Center',
    animationStyle: 'admin_radar',
    intensity: 'medium',
    accentGlow: 'rgba(14, 165, 233, 0.4)',
    hasInteractive3DMascot: false,
    description: 'Multi-quadrant tactical telemetry with live security patrol status',
  },
  '/admin/campus': {
    pageId: 'admin_campus',
    route: '/admin/campus',
    title: 'Campus Perimeter Configuration',
    animationStyle: 'admin_radar',
    intensity: 'medium',
    accentGlow: 'rgba(14, 165, 233, 0.3)',
    hasInteractive3DMascot: false,
    description: 'Geofence perimeter visualizer with safe zone coordinates',
  },
  '/admin/ai': {
    pageId: 'admin_ai',
    route: '/admin/ai',
    title: 'AI Threat Classifier Diagnostics',
    animationStyle: 'otp_matrix',
    intensity: 'high',
    accentGlow: 'rgba(168, 85, 247, 0.4)',
    hasInteractive3DMascot: false,
    description: 'Neural weight matrix flow displaying live NLP categorization confidence',
  },
  '/admin/users': {
    pageId: 'admin_users',
    route: '/admin/users',
    title: 'Student & Staff Roster Governance',
    animationStyle: 'id_scanner',
    intensity: 'low',
    accentGlow: 'rgba(59, 130, 246, 0.3)',
    hasInteractive3DMascot: false,
    description: 'Verified student roster grid with instant verification badges',
  },
  '/admin/system-audit': {
    pageId: 'admin_audit',
    route: '/admin/system-audit',
    title: 'Confidential System Audit Logs',
    animationStyle: 'timeline_flow',
    intensity: 'low',
    accentGlow: 'rgba(239, 68, 68, 0.3)',
    hasInteractive3DMascot: false,
    description: 'Immutable ledger trace documenting every privileged administrative access',
  },
  '/management': {
    pageId: 'management_dashboard',
    route: '/management',
    title: 'Executive Institutional Overview',
    animationStyle: 'management_analytics',
    intensity: 'low',
    accentGlow: 'rgba(16, 185, 129, 0.3)',
    hasInteractive3DMascot: false,
    description: 'Concentric analytics orbits showing campus safety metrics & KPI trends',
  },

  // Sovereign Super Admin
  '/super-admin': {
    pageId: 'super_admin_core',
    route: '/super-admin',
    title: 'Sovereign Multi-Campus Matrix',
    animationStyle: 'super_admin_core',
    intensity: 'high',
    accentGlow: 'rgba(217, 70, 239, 0.45)',
    hasInteractive3DMascot: false,
    description: 'Global multi-campus constellation orb orchestrating cross-institution safety',
  },
  '/super-admin/pending-campus': {
    pageId: 'super_admin_pending',
    route: '/super-admin/pending-campus',
    title: 'Institution Onboarding Queue',
    animationStyle: 'register_stepper',
    intensity: 'medium',
    accentGlow: 'rgba(217, 70, 239, 0.35)',
    hasInteractive3DMascot: false,
    description: 'College accreditation portal with cryptographic signing checks',
  },

  // Informational Pages
  '/about': {
    pageId: 'about',
    route: '/about',
    title: 'About Kavach Campus',
    animationStyle: 'public_flow',
    intensity: 'low',
    accentGlow: 'rgba(59, 130, 246, 0.2)',
    hasInteractive3DMascot: false,
    description: 'Floating glass security facets showcasing Kavach architectural principles',
  },
  '/features': {
    pageId: 'features',
    route: '/features',
    title: 'Platform Capabilities',
    animationStyle: 'public_flow',
    intensity: 'low',
    accentGlow: 'rgba(13, 148, 136, 0.25)',
    hasInteractive3DMascot: false,
    description: 'Interactive capability constellation with dynamic feature spotlights',
  },
  '/privacy': {
    pageId: 'privacy',
    route: '/privacy',
    title: 'Privacy & Cryptographic Architecture',
    animationStyle: 'lock_shield',
    intensity: 'low',
    accentGlow: 'rgba(100, 116, 139, 0.25)',
    hasInteractive3DMascot: false,
    description: 'Zero-knowledge cryptographic shield visualizer ensuring privacy rights',
  },
  '/contact': {
    pageId: 'contact',
    route: '/contact',
    title: 'Emergency Contact Dispatch',
    animationStyle: 'public_flow',
    intensity: 'low',
    accentGlow: 'rgba(234, 179, 8, 0.25)',
    hasInteractive3DMascot: false,
    description: 'Live dispatch channel beacons with response time indicators',
  },
};

/**
 * Returns the exact animation config for any given path, falling back gracefully to public_flow.
 */
export function getPageAnimationConfig(pathname: string): PageAnimationConfig {
  if (!pathname) return PAGE_ANIMATION_REGISTRY['/'];

  // Exact match
  if (PAGE_ANIMATION_REGISTRY[pathname]) {
    return PAGE_ANIMATION_REGISTRY[pathname];
  }

  // Prefix match for dynamic routes (e.g., /admin/incidents/123 -> /staff/incidents or /admin)
  if (pathname.startsWith('/admin/incidents/')) {
    return PAGE_ANIMATION_REGISTRY['/staff/incidents'] || PAGE_ANIMATION_REGISTRY['/admin'];
  }
  if (pathname.startsWith('/staff/incidents/')) {
    return PAGE_ANIMATION_REGISTRY['/staff/incidents'];
  }
  if (pathname.startsWith('/student/incidents/')) {
    return PAGE_ANIMATION_REGISTRY['/student/cases'];
  }

  // Base route fallbacks
  if (pathname.startsWith('/student')) return PAGE_ANIMATION_REGISTRY['/student'];
  if (pathname.startsWith('/staff')) return PAGE_ANIMATION_REGISTRY['/staff'];
  if (pathname.startsWith('/admin')) return PAGE_ANIMATION_REGISTRY['/admin'];
  if (pathname.startsWith('/super-admin')) return PAGE_ANIMATION_REGISTRY['/super-admin'];

  // Default fallback
  return {
    pageId: 'generic',
    route: pathname,
    title: 'Kavach Campus',
    animationStyle: 'public_flow',
    intensity: 'low',
    accentGlow: 'rgba(59, 130, 246, 0.2)',
    hasInteractive3DMascot: false,
    description: 'Subtle ambient safety glow tailored for responsive reading',
  };
}
