"use client";
import React from 'react';
import { motion } from 'framer-motion';

interface IdScannerEffectProps {
  isScanning?: boolean;
  isVerified?: boolean;
  accentColor?: string;
  className?: string;
}

export function IdScannerEffect({
  isScanning = true,
  isVerified = false,
  accentColor = '#06b6d4',
  className = '',
}: IdScannerEffectProps) {
  const activeColor = isVerified ? '#10b981' : accentColor;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '320px',
        height: '190px',
        margin: '0 auto',
        borderRadius: '16px',
        border: `1.5px dashed ${activeColor}80`,
        background: 'rgba(15, 23, 42, 0.6)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-label="ID Card Laser Scanner Frame"
    >
      {/* 4 Corner Targeting Reticles */}
      <div style={{ position: 'absolute', top: '8px', left: '8px', width: '16px', height: '16px', borderTop: `3px solid ${activeColor}`, borderLeft: `3px solid ${activeColor}` }} />
      <div style={{ position: 'absolute', top: '8px', right: '8px', width: '16px', height: '16px', borderTop: `3px solid ${activeColor}`, borderRight: `3px solid ${activeColor}` }} />
      <div style={{ position: 'absolute', bottom: '8px', left: '8px', width: '16px', height: '16px', borderBottom: `3px solid ${activeColor}`, borderLeft: `3px solid ${activeColor}` }} />
      <div style={{ position: 'absolute', bottom: '8px', right: '8px', width: '16px', height: '16px', borderBottom: `3px solid ${activeColor}`, borderRight: `3px solid ${activeColor}` }} />

      {/* Sweeping Laser Line */}
      {isScanning && !isVerified && (
        <motion.div
          animate={{
            y: ['-80px', '80px', '-80px'],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            repeat: Infinity,
            duration: 2.4,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: '2.5px',
            background: `linear-gradient(90deg, transparent 0%, ${activeColor} 50%, transparent 100%)`,
            boxShadow: `0 0 12px ${activeColor}`,
            zIndex: 3,
          }}
        />
      )}

      {/* Grid Pattern Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `radial-gradient(circle at 1px 1px, ${activeColor}20 1px, transparent 0)`,
          backgroundSize: '16px 16px',
          opacity: 0.6,
        }}
      />

      {/* Center Label / Verification Badge */}
      <div style={{ position: 'relative', zIndex: 4, textAlign: 'center' }}>
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: activeColor,
            background: 'rgba(15, 23, 42, 0.85)',
            padding: '6px 12px',
            borderRadius: '999px',
            border: `1px solid ${activeColor}50`,
          }}
        >
          {isVerified ? '✓ Identity Verified' : isScanning ? 'AI OCR Scanning...' : 'Align ID Card Within Frame'}
        </span>
      </div>
    </div>
  );
}
