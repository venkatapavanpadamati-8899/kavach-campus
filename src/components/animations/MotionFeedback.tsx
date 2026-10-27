"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';

export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

interface MotionFeedbackProps {
  type: FeedbackType;
  message: string;
  description?: string;
  className?: string;
}

export function MotionFeedback({
  type,
  message,
  description,
  className = '',
}: MotionFeedbackProps) {
  const prefersReduced = useReducedMotionPreference();

  const config = {
    success: {
      icon: CheckCircle2,
      bgColor: 'rgba(16, 185, 129, 0.12)',
      borderColor: 'rgba(16, 185, 129, 0.35)',
      textColor: '#10b981',
    },
    error: {
      icon: AlertCircle,
      bgColor: 'rgba(239, 68, 68, 0.12)',
      borderColor: 'rgba(239, 68, 68, 0.35)',
      textColor: '#ef4444',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'rgba(245, 158, 11, 0.12)',
      borderColor: 'rgba(245, 158, 11, 0.35)',
      textColor: '#f59e0b',
    },
    info: {
      icon: Info,
      bgColor: 'rgba(56, 189, 248, 0.12)',
      borderColor: 'rgba(56, 189, 248, 0.35)',
      textColor: '#38bdf8',
    },
  }[type];

  const IconComponent = config.icon;

  const content = (
    <div
      role="alert"
      style={{
        background: config.bgColor,
        borderColor: config.borderColor,
      }}
      className={`flex items-start gap-3 p-3.5 rounded-xl border text-sm backdrop-blur-md ${className}`}
    >
      <IconComponent
        size={19}
        style={{ color: config.textColor, marginTop: '2px', flexShrink: 0 }}
      />
      <div className="flex-1">
        <p className="font-semibold" style={{ color: config.textColor }}>
          {message}
        </p>
        {description && <p className="text-xs text-slate-300 mt-0.5">{description}</p>}
      </div>
    </div>
  );

  if (prefersReduced) {
    return content;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {content}
    </motion.div>
  );
}
