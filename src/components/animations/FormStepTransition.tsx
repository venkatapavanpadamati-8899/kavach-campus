"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference';

interface FormStepTransitionProps {
  currentStep: number | string;
  children: React.ReactNode;
  className?: string;
}

export function FormStepTransition({
  currentStep,
  children,
  className = '',
}: FormStepTransitionProps) {
  const prefersReduced = useReducedMotionPreference();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.28, ease: 'easeInOut' }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
