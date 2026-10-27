"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';

export type StatusColorMode = 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'slate';

interface StatusTransitionBadgeProps {
  status: string;
  label?: string;
  colorMode?: StatusColorMode;
  className?: string;
}

export function StatusTransitionBadge({
  status,
  label,
  colorMode = 'blue',
  className = '',
}: StatusTransitionBadgeProps) {
  const prefersReduced = useReducedMotionPreference();
  const displayLabel = label || status;

  const colorStyles: Record<StatusColorMode, { bg: string; text: string; border: string; dot: string }> = {
    green: {
      bg: 'rgba(16, 185, 129, 0.14)',
      text: '#10b981',
      border: 'rgba(16, 185, 129, 0.3)',
      dot: '#10b981',
    },
    amber: {
      bg: 'rgba(245, 158, 11, 0.14)',
      text: '#f59e0b',
      border: 'rgba(245, 158, 11, 0.3)',
      dot: '#f59e0b',
    },
    red: {
      bg: 'rgba(239, 68, 68, 0.14)',
      text: '#ef4444',
      border: 'rgba(239, 68, 68, 0.3)',
      dot: '#ef4444',
    },
    blue: {
      bg: 'rgba(56, 189, 248, 0.14)',
      text: '#38bdf8',
      border: 'rgba(56, 189, 248, 0.3)',
      dot: '#38bdf8',
    },
    purple: {
      bg: 'rgba(168, 85, 247, 0.14)',
      text: '#c084fc',
      border: 'rgba(168, 85, 247, 0.3)',
      dot: '#c084fc',
    },
    slate: {
      bg: 'rgba(100, 116, 139, 0.14)',
      text: '#94a3b8',
      border: 'rgba(100, 116, 139, 0.3)',
      dot: '#94a3b8',
    },
  };

  const style = colorStyles[colorMode] || colorStyles.blue;

  if (prefersReduced) {
    return (
      <span
        style={{ background: style.bg, color: style.text, borderColor: style.border }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${className}`}
      >
        <span
          style={{ backgroundColor: style.dot }}
          className="w-1.5 h-1.5 rounded-full inline-block"
        />
        {displayLabel}
      </span>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={status}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        style={{ background: style.bg, color: style.text, borderColor: style.border }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${className}`}
      >
        <motion.span
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          style={{ backgroundColor: style.dot }}
          className="w-1.5 h-1.5 rounded-full inline-block"
        />
        {displayLabel}
      </motion.span>
    </AnimatePresence>
  );
}
