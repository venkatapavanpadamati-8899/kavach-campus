"use client";

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { getPageAnimationConfig } from '@/components/animations/pageAnimations';
import { PageAnimationConfig } from '@/types/animation';
import { useReducedMotionPreference } from './useReducedMotionPreference';

export interface UsePageAnimationReturn {
  config: PageAnimationConfig;
  prefersReducedMotion: boolean;
  effectiveDuration: number;
  shouldAnimate: boolean;
}

/**
 * Hook providing route-specific animation configuration, intensity,
 * and adaptive timing based on user accessibility preferences.
 */
export function usePageAnimation(overrideRoute?: string): UsePageAnimationReturn {
  const pathname = usePathname();
  const route = overrideRoute || pathname || '/';
  const prefersReducedMotion = useReducedMotionPreference();

  const config = useMemo(() => getPageAnimationConfig(route), [route]);

  const effectiveDuration = useMemo(() => {
    if (prefersReducedMotion) return 0;
    if (config.motionIntensity === 'urgent') return 0.2;
    if (config.motionIntensity === 'dynamic') return 0.35;
    return 0.5;
  }, [config.motionIntensity, prefersReducedMotion]);

  return {
    config,
    prefersReducedMotion,
    effectiveDuration,
    shouldAnimate: !prefersReducedMotion,
  };
}
