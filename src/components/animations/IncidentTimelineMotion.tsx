"use client";
import React from 'react';
import { motion } from 'framer-motion';

export interface TimelineMilestone {
  title: string;
  status: 'completed' | 'current' | 'pending';
  timestamp?: string;
}

interface IncidentTimelineMotionProps {
  milestones?: TimelineMilestone[];
  accentColor?: string;
  className?: string;
}

export function IncidentTimelineMotion({
  milestones = [
    { title: 'Complaint Filed', status: 'completed' },
    { title: 'AI Triage & Categorization', status: 'completed' },
    { title: 'Assigned to Responder', status: 'current' },
    { title: 'Resolution & Closure', status: 'pending' },
  ],
  accentColor = '#0ea5e9',
  className = '',
}: IncidentTimelineMotionProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        padding: '16px',
        background: 'rgba(14, 165, 233, 0.06)',
        borderRadius: '16px',
        border: '1px solid rgba(14, 165, 233, 0.2)',
      }}
      aria-label="Incident Resolution Timeline"
    >
      {milestones.map((milestone, idx) => {
        const isCompleted = milestone.status === 'completed';
        const isCurrent = milestone.status === 'current';

        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
            {/* Step Icon Indicator */}
            <motion.div
              animate={
                isCurrent
                  ? {
                      scale: [1, 1.2, 1],
                      boxShadow: [`0 0 0px ${accentColor}`, `0 0 10px ${accentColor}`, `0 0 0px ${accentColor}`],
                    }
                  : {}
              }
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: isCompleted ? '#10b981' : isCurrent ? accentColor : 'rgba(255, 255, 255, 0.15)',
                border: '2px solid rgba(15, 23, 42, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isCompleted && (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </motion.div>

            {/* Step Content */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCompleted ? '#e2e8f0' : isCurrent ? '#38bdf8' : 'rgba(255, 255, 255, 0.45)',
                }}
              >
                {milestone.title}
              </span>
              {milestone.timestamp && (
                <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                  {milestone.timestamp}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
