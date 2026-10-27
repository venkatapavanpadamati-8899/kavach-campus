"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';

export interface BackgroundThemeConfig {
  themeStyle?: 'technical_grid' | 'cyber_aurora' | 'marine_wave' | 'engineering_gear' | 'modern_glass';
  particleColor?: string;
  glowColor?: string;
  intensity?: 'low' | 'medium' | 'high';
}

interface BackgroundRendererProps {
  themeConfig?: BackgroundThemeConfig;
  className?: string;
}

export function BackgroundRenderer({
  themeConfig,
  className = '',
}: BackgroundRendererProps) {
  const prefersReduced = useReducedMotionPreference();
  const themeStyle = themeConfig?.themeStyle || 'modern_glass';
  const glow = themeConfig?.glowColor || 'rgba(59, 130, 246, 0.2)';

  if (prefersReduced) {
    return (
      <div
        className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${className}`}
        aria-hidden="true"
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at 50% 20%, ${glow} 0%, transparent 60%)`,
            opacity: 0.12,
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      {/* Pattern overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            themeStyle === 'technical_grid'
              ? `radial-gradient(${themeConfig?.particleColor || '#22d3ee'} 1px, transparent 1px)`
              : themeStyle === 'marine_wave'
              ? `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(14, 165, 233, 0.08) 35px, rgba(14, 165, 233, 0.08) 70px)`
              : 'none',
          backgroundSize: themeStyle === 'technical_grid' ? '32px 32px' : '100% 100%',
          opacity: 0.15,
        }}
      />

      {/* Floating subtle ambient glow */}
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.12, 0.22, 0.12],
        }}
        transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '450px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`,
          filter: 'blur(50px)',
        }}
      />
    </div>
  );
}
