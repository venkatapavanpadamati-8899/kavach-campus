"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';

interface MotionLoadingIndicatorProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export function MotionLoadingIndicator({
  label = 'Loading...',
  size = 'md',
  color = '#38bdf8',
  className = '',
}: MotionLoadingIndicatorProps) {
  const prefersReduced = useReducedMotionPreference();

  const dimension = size === 'sm' ? 18 : size === 'lg' ? 36 : 24;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2.5 ${className}`}
    >
      {prefersReduced ? (
        <span
          style={{
            width: `${dimension}px`,
            height: `${dimension}px`,
            border: `2px solid ${color}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            display: 'inline-block',
          }}
        />
      ) : (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{
            width: `${dimension}px`,
            height: `${dimension}px`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width={dimension}
            height={dimension}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke={color}
              strokeWidth="3"
              strokeOpacity="0.25"
            />
            <path
              d="M12 2C6.47715 2 2 6.47715 2 12"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </motion.div>
      )}
      {label && <span className="text-sm font-medium text-slate-300">{label}</span>}
      <span className="sr-only">{label}</span>
    </div>
  );
}
