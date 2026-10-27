"use client";
import React, { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { getPageAnimationConfig } from './pageAnimations';

interface PageMotionWrapperProps {
  children: React.ReactNode;
  overrideRoute?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function PageMotionWrapper({
  children,
  overrideRoute,
  className = '',
  style = {},
}: PageMotionWrapperProps) {
  const pathname = usePathname();
  const route = overrideRoute || pathname || '/';
  const config = useMemo(() => getPageAnimationConfig(route), [route]);

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        ...style,
      }}
    >
      {/* Route-Specific Ambient Glow Layer */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          background: config.backgroundGlow,
          zIndex: 0,
          transition: 'background 0.6s ease',
        }}
      />

      {/* Animated Content Layer */}
      <motion.div
        initial={{ opacity: 0, y: config.motionIntensity === 'urgent' ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: config.motionIntensity === 'urgent' ? 0.2 : 0.45,
          ease: 'easeOut',
        }}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
