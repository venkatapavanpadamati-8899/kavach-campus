import { describe, it, expect } from 'vitest';
import { 
  PAGE_ANIMATION_REGISTRY, 
  getPageAnimationConfig 
} from '@/components/animations/pageAnimations';
import {
  PageEntrance,
  StaggeredCardList,
  StaggeredCardItem,
  FormStepTransition,
  MotionLoadingIndicator,
  MotionFeedback,
  StatusTransitionBadge,
  BackgroundRenderer,
  PageAnimationRenderer,
  InteractiveSafetyCharacter,
} from '@/components/animations';

describe('Kavach Campus — Reusable Page Animation Engine Suite', () => {
  it('registers distinct animation configurations for 30+ critical web routes', () => {
    const routeKeys = Object.keys(PAGE_ANIMATION_REGISTRY);
    expect(routeKeys.length).toBeGreaterThanOrEqual(30);

    // Verify key security and emergency workflows exist
    expect(routeKeys).toContain('/');
    expect(routeKeys).toContain('/login');
    expect(routeKeys).toContain('/register');
    expect(routeKeys).toContain('/student/sos');
    expect(routeKeys).toContain('/student/voice-report');
    expect(routeKeys).toContain('/student/safe-walk');
    expect(routeKeys).toContain('/student/profile');
    expect(routeKeys).toContain('/student/verification-status');
    expect(routeKeys).toContain('/student/cases');
    expect(routeKeys).toContain('/admin');
    expect(routeKeys).toContain('/admin/incidents');
    expect(routeKeys).toContain('/admin/system-audit');
    expect(routeKeys).toContain('/super-admin');
  });

  it('assigns purpose-specific animation types preventing generic duplicates', () => {
    // SOS must be sos_beacon with urgent intensity for immediate response
    const sosConfig = PAGE_ANIMATION_REGISTRY['/student/sos'];
    expect(sosConfig.animationType).toBe('sos_beacon');
    expect(sosConfig.motionIntensity).toBe('urgent');
    expect(sosConfig.accentColor).toBe('#ef4444');

    // Voice report must be audio_waveform
    const voiceConfig = PAGE_ANIMATION_REGISTRY['/student/voice-report'];
    expect(voiceConfig.animationType).toBe('audio_waveform');
    expect(voiceConfig.accentColor).toBe('#ec4899');

    // Safe walk must be route_navigation
    const walkConfig = PAGE_ANIMATION_REGISTRY['/student/safe-walk'];
    expect(walkConfig.animationType).toBe('route_navigation');

    // ID verification must be scanner_laser
    const idConfig = PAGE_ANIMATION_REGISTRY['/student/verification-status'];
    expect(idConfig.animationType).toBe('scanner_laser');

    // Admin audit must be admin_radar
    const adminConfig = PAGE_ANIMATION_REGISTRY['/admin/system-audit'];
    expect(adminConfig.animationType).toBe('admin_radar');
  });

  it('resolves dynamic route prefixes accurately and provides safe fallbacks', () => {
    // Dynamic case route e.g. /student/cases/CASE-2026-9921
    const dynamicCase = getPageAnimationConfig('/student/cases/CASE-2026-9921');
    expect(dynamicCase.animationType).toBe('incident_timeline');

    // Unknown route falls back gracefully to minimal ambient
    const unknownRoute = getPageAnimationConfig('/some/unregistered/path');
    expect(unknownRoute.animationType).toBe('minimal_ambient');
    expect(unknownRoute.motionIntensity).toBe('calm');
  });

  it('exports all required reusable animation primitives', () => {
    expect(PageEntrance).toBeDefined();
    expect(StaggeredCardList).toBeDefined();
    expect(StaggeredCardItem).toBeDefined();
    expect(FormStepTransition).toBeDefined();
    expect(MotionLoadingIndicator).toBeDefined();
    expect(MotionFeedback).toBeDefined();
    expect(StatusTransitionBadge).toBeDefined();
    expect(BackgroundRenderer).toBeDefined();
    expect(PageAnimationRenderer).toBeDefined();
    expect(InteractiveSafetyCharacter).toBeDefined();
  });

  it('enforces non-blocking urgent intensity for emergency SOS', () => {
    const sos = getPageAnimationConfig('/student/sos');
    expect(sos.motionIntensity).toBe('urgent');
    // Ensure SOS does not use blocking 3D mascot
    expect(sos.animationType).not.toBe('mascot_3d');
  });

  it('guarantees accessible contrast and color accents across all configurations', () => {
    Object.values(PAGE_ANIMATION_REGISTRY).forEach((config) => {
      expect(config.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(['calm', 'dynamic', 'urgent']).toContain(config.motionIntensity);
      expect(config.backgroundGlow).toContain('radial-gradient');
    });
  });
});
