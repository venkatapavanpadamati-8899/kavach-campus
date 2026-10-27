"use client";
import React from 'react';
import { motion } from 'framer-motion';

interface RouteProgressProps {
  progress?: number; // 0 to 100
  isActive?: boolean;
  accentColor?: string;
  className?: string;
}

export function RouteProgress({
  progress = 45,
  isActive = true,
  accentColor = '#10b981',
  className = '',
}: RouteProgressProps) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '380px',
        margin: '0 auto',
        padding: '16px',
        background: 'rgba(16, 185, 129, 0.08)',
        borderRadius: '16px',
        border: '1px solid rgba(16, 185, 129, 0.25)',
      }}
      aria-label="Safe Walk route progress tracker"
    >
      {/* Waypoint Track */}
      <div
        style={{
          position: 'relative',
          height: '6px',
          background: 'rgba(255, 255, 255, 0.12)',
          borderRadius: '999px',
          overflow: 'hidden',
          marginBottom: '16px',
        }}
      >
        <motion.div
          style={{
            height: '100%',
            background: `linear-gradient(90deg, #059669 0%, ${accentColor} 100%)`,
            boxShadow: `0 0 10px ${accentColor}`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {/* Walking Waypoint Nodes */}
      <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
        {['Origin Point', 'Campus Waypoint', 'Safe Haven Destination'].map((label, index) => {
          const stepPercent = index * 50;
          const isReached = progress >= stepPercent;
          return (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: index === 0 ? 'flex-start' : index === 2 ? 'flex-end' : 'center',
                gap: '6px',
              }}
            >
              <motion.div
                animate={
                  isActive && isReached
                    ? { scale: [1, 1.25, 1], boxShadow: [`0 0 0px ${accentColor}`, `0 0 10px ${accentColor}`, `0 0 0px ${accentColor}`] }
                    : {}
                }
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: isReached ? accentColor : 'rgba(255, 255, 255, 0.2)',
                  border: '2px solid rgba(15, 23, 42, 0.9)',
                }}
              />
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: isReached ? '#e2e8f0' : 'rgba(255, 255, 255, 0.4)',
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
