"use client";
import React from 'react';
import { motion } from 'framer-motion';

interface SosEmergencyPulseProps {
  isBroadcasting?: boolean;
  className?: string;
}

export function SosEmergencyPulse({
  isBroadcasting = false,
  className = '',
}: SosEmergencyPulseProps) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '180px',
        height: '180px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
      aria-hidden="true"
    >
      {/* Outer Shockwave Beacon Ring */}
      <motion.div
        animate={
          isBroadcasting
            ? {
                scale: [1, 2.2],
                opacity: [0.8, 0],
              }
            : {
                scale: [1, 1.35, 1],
                opacity: [0.25, 0.45, 0.25],
              }
        }
        transition={{
          repeat: Infinity,
          duration: isBroadcasting ? 1.2 : 2.5,
          ease: 'easeOut',
        }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '2px solid rgba(239, 68, 68, 0.7)',
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, transparent 70%)',
        }}
      />

      {/* Inner Emergency Flare Ring */}
      <motion.div
        animate={
          isBroadcasting
            ? {
                scale: [1, 1.6],
                opacity: [0.9, 0],
              }
            : {
                scale: [1, 1.15, 1],
                opacity: [0.4, 0.7, 0.4],
              }
        }
        transition={{
          repeat: Infinity,
          duration: isBroadcasting ? 1.2 : 2.5,
          ease: 'easeOut',
          delay: isBroadcasting ? 0.3 : 0,
        }}
        style={{
          position: 'absolute',
          inset: '16px',
          borderRadius: '50%',
          border: '2.5px solid rgba(239, 68, 68, 0.85)',
          background: 'rgba(239, 68, 68, 0.15)',
        }}
      />

      {/* Core Glowing Orb */}
      <div
        style={{
          width: '90px',
          height: '90px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
          boxShadow: '0 0 24px rgba(239, 68, 68, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 900,
          fontSize: '1.25rem',
          letterSpacing: '0.05em',
        }}
      >
        SOS
      </div>
    </div>
  );
}
