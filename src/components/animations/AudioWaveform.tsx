"use client";
import React from 'react';
import { motion } from 'framer-motion';

interface AudioWaveformProps {
  isRecording?: boolean;
  barCount?: number;
  color?: string;
  className?: string;
}

export function AudioWaveform({
  isRecording = true,
  barCount = 18,
  color = '#ec4899',
  className = '',
}: AudioWaveformProps) {
  // Pre-generated seed heights for aesthetic organic waveform
  const seedHeights = [
    12, 24, 45, 68, 85, 92, 70, 88, 100, 78, 62, 80, 54, 40, 28, 18, 14, 10
  ];

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        height: '64px',
        padding: '8px 16px',
        background: 'rgba(236, 72, 153, 0.08)',
        borderRadius: '16px',
        border: '1px solid rgba(236, 72, 153, 0.25)',
      }}
      aria-label="Audio waveform visualizer"
    >
      {Array.from({ length: barCount }).map((_, index) => {
        const baseHeight = seedHeights[index % seedHeights.length];
        return (
          <motion.div
            key={index}
            style={{
              width: '4px',
              borderRadius: '999px',
              background: `linear-gradient(180deg, ${color} 0%, #a855f7 100%)`,
              boxShadow: isRecording ? `0 0 8px ${color}80` : 'none',
            }}
            animate={
              isRecording
                ? {
                    height: [
                      `${Math.max(8, baseHeight * 0.25)}px`,
                      `${Math.min(56, baseHeight * 0.55)}px`,
                      `${Math.max(6, baseHeight * 0.15)}px`,
                      `${Math.min(60, baseHeight * 0.65)}px`,
                    ],
                    opacity: [0.7, 1, 0.6, 0.95],
                  }
                : {
                    height: '8px',
                    opacity: 0.35,
                  }
            }
            transition={{
              repeat: Infinity,
              duration: 0.8 + (index % 4) * 0.2,
              ease: 'easeInOut',
              delay: (index * 0.05) % 0.4,
            }}
          />
        );
      })}
    </div>
  );
}
