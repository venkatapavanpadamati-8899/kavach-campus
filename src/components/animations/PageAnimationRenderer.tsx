"use client";

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { getPageAnimationConfig, PageAnimationConfig } from '@/config/pageAnimations';

interface PageAnimationRendererProps {
  pathname: string;
  collegeAnimationTheme?: {
    themeStyle: 'technical_grid' | 'cyber_aurora' | 'marine_wave' | 'engineering_gear' | 'modern_glass';
    particleColor: string;
    shieldAccent: string;
    glowEffect: string;
  };
  className?: string;
}

export function PageAnimationRenderer({
  pathname,
  collegeAnimationTheme,
  className = '',
}: PageAnimationRendererProps) {
  const prefersReducedMotion = useReducedMotion();
  const config: PageAnimationConfig = getPageAnimationConfig(pathname);

  // If user prefers reduced motion, render a subtle non-animated ambient gradient
  if (prefersReducedMotion) {
    return (
      <div
        className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${className}`}
        aria-hidden="true"
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at 50% 20%, ${config.accentGlow} 0%, transparent 60%)`,
            opacity: 0.15,
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
      {/* College theme background layer */}
      {collegeAnimationTheme && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              collegeAnimationTheme.themeStyle === 'technical_grid'
                ? `radial-gradient(${collegeAnimationTheme.particleColor} 1px, transparent 1px)`
                : collegeAnimationTheme.themeStyle === 'cyber_aurora'
                ? `linear-gradient(135deg, ${collegeAnimationTheme.particleColor} 0%, transparent 50%)`
                : collegeAnimationTheme.themeStyle === 'marine_wave'
                ? `repeating-linear-gradient(45deg, transparent, transparent 35px, ${collegeAnimationTheme.particleColor} 35px, ${collegeAnimationTheme.particleColor} 70px)`
                : `none`,
            backgroundSize:
              collegeAnimationTheme.themeStyle === 'technical_grid'
                ? '32px 32px'
                : '100% 100%',
            opacity: 0.12,
          }}
        />
      )}

      {/* Route-Specific Animation Primitives */}
      {renderAnimationPrimitive(config)}
    </div>
  );
}

function renderAnimationPrimitive(config: PageAnimationConfig) {
  switch (config.animationStyle) {
    case 'radar_sweep':
      // Safe Walk 360-degree sweeping radar
      return (
        <div className="absolute right-8 bottom-12 w-64 h-64 md:w-96 md:h-96 opacity-30 flex items-center justify-center">
          <div className="relative w-full h-full rounded-full border border-teal-500/30">
            <div className="absolute inset-8 rounded-full border border-teal-500/20" />
            <div className="absolute inset-20 rounded-full border border-teal-500/15" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-teal-500/20" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-teal-500/20" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(20, 184, 166, 0.4) 360deg)',
              }}
            />
            {/* Blips */}
            <motion.div
              animate={{ scale: [1, 2, 1], opacity: [0.8, 0.2, 0.8] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute top-1/3 left-1/3 w-3 h-3 rounded-full bg-teal-400 shadow-[0_0_12px_#2dd4bf]"
            />
          </div>
        </div>
      );

    case 'audio_waveform':
      // Voice Report real-time simulated sound telemetry
      return (
        <div className="absolute top-20 right-10 w-48 h-24 opacity-35 flex items-end gap-1.5 justify-center">
          {[16, 32, 48, 64, 80, 52, 36, 72, 60, 28, 44, 20].map((height, i) => (
            <motion.div
              key={i}
              animate={{
                height: [height * 0.3, height, height * 0.4],
                backgroundColor: ['#a855f7', '#6366f1', '#a855f7'],
              }}
              transition={{
                repeat: Infinity,
                duration: 0.8 + (i % 4) * 0.2,
                ease: 'easeInOut',
              }}
              className="w-1.5 rounded-full"
            />
          ))}
        </div>
      );

    case 'emergency_beacon':
      // SOS high-contrast ultra-fast strobe beacon (subtle ambient, never blocking)
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.15, 0.4, 0.15] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
            className="w-[450px] h-[450px] md:w-[700px] md:h-[700px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, transparent 70%)',
              filter: 'blur(30px)',
            }}
          />
        </div>
      );

    case 'id_scanner':
      // AI Credential Scanner laser line
      return (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-80 h-44 md:w-96 md:h-56 opacity-25 border border-cyan-500/30 rounded-2xl overflow-hidden p-2">
          <div className="w-full h-full border border-dashed border-cyan-400/30 rounded-xl relative">
            <motion.div
              animate={{ y: [0, 180, 0] }}
              transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
              className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee]"
            />
          </div>
        </div>
      );

    case 'otp_matrix':
      // Cryptographic Matrix & Neural Weights
      return (
        <div className="absolute inset-0 opacity-20 flex items-center justify-around pointer-events-none">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
            className="w-96 h-96 rounded-full border border-indigo-500/20 flex items-center justify-center"
          >
            <div className="w-64 h-64 rounded-full border border-dashed border-indigo-400/30" />
          </motion.div>
        </div>
      );

    case 'lock_shield':
      // Forgot/Reset Password Cryptographic Vault Ring
      return (
        <div className="absolute top-1/4 right-1/4 w-72 h-72 opacity-25 pointer-events-none">
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 30, ease: 'linear' }}
            className="w-full h-full rounded-full border-2 border-dashed border-amber-500/30 flex items-center justify-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
              className="w-44 h-44 rounded-full border border-amber-400/20"
            />
          </motion.div>
        </div>
      );

    case 'super_admin_core':
      // Global Sovereign Campus Core
      return (
        <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
            transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
            className="w-96 h-96 rounded-full border border-fuchsia-500/30 flex items-center justify-center"
          >
            <div className="w-64 h-64 rounded-full border border-dashed border-fuchsia-400/40" />
            <div className="w-32 h-32 rounded-full bg-fuchsia-600/10 blur-xl" />
          </motion.div>
        </div>
      );

    case 'hero_shield':
    default:
      // Subtle Ambient Security Glow
      return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.15, 0.3, 0.15] }}
            transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
            className="w-[500px] h-[500px] rounded-full"
            style={{
              background: `radial-gradient(circle, ${config.accentGlow} 0%, transparent 70%)`,
              filter: 'blur(40px)',
            }}
          />
        </div>
      );
  }
}
