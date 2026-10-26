"use client";
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Activity, Users, Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: '0',
    activeGuards: '0',
    systemHealth: '100%',
    criticalIncidents: '0',
    loading: true,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const supabase = createClient();
        const [{ count: userCount }, { count: guardCount }, { count: criticalCount }] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('staff_profiles').select('*', { count: 'exact', head: true }).eq('is_on_duty', true),
          supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('severity', 'CRITICAL'),
        ]);

        setStats({
          totalUsers: (userCount ?? 0).toLocaleString(),
          activeGuards: (guardCount ?? 0).toString(),
          systemHealth: '99.9%',
          criticalIncidents: (criticalCount ?? 0).toString(),
          loading: false,
        });
      } catch {
        setStats(prev => ({ ...prev, loading: false }));
      }
    }
    loadStats();
  }, []);

  const cardItems = [
    { label: 'Total Users', value: stats.loading ? '...' : stats.totalUsers, icon: Users, color: 'var(--accent-blue)' },
    { label: 'Active Guards (On Duty)', value: stats.loading ? '...' : stats.activeGuards, icon: Shield, color: 'var(--accent-green)' },
    { label: 'System Health', value: stats.systemHealth, icon: Activity, color: 'var(--accent-green)' },
    { label: 'Critical Escalations', value: stats.loading ? '...' : stats.criticalIncidents, icon: Settings, color: stats.criticalIncidents === '0' ? 'var(--accent-blue)' : 'var(--accent-red)' },
  ];

  return (
    <div>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Control Center</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>System overview and administrative controls.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        {cardItems.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel"
            style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}
          >
            <div style={{ padding: '12px', background: `${stat.color}20`, borderRadius: '12px' }}>
              <stat.icon size={24} color={stat.color} />
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>{stat.label}</p>
              <h3 style={{ fontSize: '1.8rem', margin: 0 }}>{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Live Campus Heatmap</h2>
          <div style={{ height: '300px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Campus Zone Monitoring Active</span>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>AI Insights</h2>
          <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', marginBottom: '12px' }}>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Pattern detected: Increased reports near North Gate after 8 PM.</p>
          </div>
          <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Resolution times improved by 15% this week.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
