"use client";
import React from 'react';
import { motion } from 'framer-motion';

interface AdminMonitoringRadarProps {
  institutionName?: string;
  activeIncidentsCount?: number;
  accentColor?: string;
  className?: string;
}

export function AdminMonitoringRadar({
  institutionName = 'Institutional Safety Perimeter',
  activeIncidentsCount = 0,
  accentColor = '#0ea5e9',
  className = '',
}: AdminMonitoringRadarProps) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '340px',
        padding: '20px 16px',
        margin: '0 auto',
        background: 'rgba(15, 23, 42, 0.75)',
        borderRadius: '20px',
        border: `1px solid ${accentColor}30`,
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '14px',
      }}
      aria-label="Campus Admin Silent Oversight Radar"
    >
      {/* 360-degree Radar Dish */}
      <div
        style={{
          position: 'relative',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          border: `1.5px solid ${accentColor}40`,
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.08) 0%, transparent 70%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Concentric Grid Rings */}
        <div style={{ position: 'absolute', width: '100px', height: '100px', borderRadius: '50%', border: `1px dashed ${accentColor}30` }} />
        <div style={{ position: 'absolute', width: '50px', height: '50px', borderRadius: '50%', border: `1px solid ${accentColor}25` }} />

        {/* Crosshair Lines */}
        <div style={{ position: 'absolute', width: '100%', height: '1px', background: `${accentColor}25` }} />
        <div style={{ position: 'absolute', height: '100%', width: '1px', background: `${accentColor}25` }} />

        {/* Sweeping Radar Beam */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: `conic-gradient(from 0deg, ${accentColor}40 0deg, transparent 60deg, transparent 360deg)`,
          }}
        />

        {/* Active Node Blip */}
        <motion.div
          animate={{
            scale: [0.8, 1.3, 0.8],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: '35px',
            right: '42px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: activeIncidentsCount > 0 ? '#ef4444' : '#10b981',
            boxShadow: `0 0 8px ${activeIncidentsCount > 0 ? '#ef4444' : '#10b981'}`,
          }}
        />
      </div>

      {/* Audit & Perimeter Caption */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
          {institutionName}
        </div>
        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Audited Institutional Oversight &bull; RLS Guarded
        </div>
      </div>
    </div>
  );
}
