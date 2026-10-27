/**
 * Kavach Campus - Core Animation & Motion Types
 * Defines the canonical contract for page animations, intensity levels,
 * reduced-motion handling, and reusable motion primitive components.
 */

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

export type MotionIntensity = 'calm' | 'dynamic' | 'urgent';

export interface PageAnimationConfig {
  route: string;
  title: string;
  animationType: AnimationType;
  motionIntensity: MotionIntensity;
  accentColor: string;
  backgroundGlow: string;
  description: string;
}

export type AnimationStatusType = 'idle' | 'loading' | 'success' | 'error' | 'warning' | 'info';

export interface StaggerConfig {
  staggerDelay?: number;
  initialDelay?: number;
  duration?: number;
}
