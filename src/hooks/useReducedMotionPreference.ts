"use client";

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Hook to reactively detect if the user has requested reduced motion.
 * Respects OS/browser 'prefers-reduced-motion' media query.
 */
export function useReducedMotionPreference(): boolean {
  const framerReducedMotion = useReducedMotion();
  const [prefersReduced, setPrefersReduced] = useState<boolean>(Boolean(framerReducedMotion));

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mediaQuery.matches || Boolean(framerReducedMotion));

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReduced(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Legacy browser fallback
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [framerReducedMotion]);

  return prefersReduced;
}
