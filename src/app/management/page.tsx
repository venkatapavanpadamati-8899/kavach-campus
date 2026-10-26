"use client";
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ManagementDashboard() {
  const [data, setData] = useState({
    activeIncidents: '0',
    avgResponseTime: '2m 14s',
    staffOnDuty: '0',
    criticalList: [] as Array<{ id: string; case_id: string; title: string; category: string }>,
    loading: true,
  });

  useEffect(() => {
    async function loadManagementData() {
      try {
        const supabase = createClient();
        const [{ count: activeCount }, { count: dutyCount }, { data: criticals }] = await Promise.all([
          supabase.from('incidents').select('*', { count: 'exact', head: true }).neq('status', 'RESOLVED'),
          supabase.from('staff_profiles').select('*', { count: 'exact', head: true }).eq('is_on_duty', true),
          supabase.from('incidents').select('id, case_id, title, category').eq('severity', 'CRITICAL').neq('status', 'RESOLVED').limit(5),
        ]);

        setData({
          activeIncidents: (activeCount ?? 0).toString(),
          avgResponseTime: '< 3 mins',
          staffOnDuty: (dutyCount ?? 0).toString(),
          criticalList: criticals ?? [],
          loading: false,
        });
      } catch {
        setData(prev => ({ ...prev, loading: false }));
      }
    }
    loadManagementData();
  }, []);

  const kpis = [
    { label: 'Total Active Incidents', value: data.loading ? '...' : data.activeIncidents, icon: ShieldAlert, color: 'var(--accent-red)' },
    { label: 'Avg Target Response', value: data.avgResponseTime, icon: TrendingUp, color: 'var(--accent-blue)' },
    { label: 'Staff On Duty', value: data.loading ? '...' : data.staffOnDuty, icon: Users, color: 'var(--accent-purple)' },
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Management Overview</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>High-level analytics and critical escalation monitoring.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="glass-panel"
            style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}
          >
            <div style={{ padding: '16px', background: `${kpi.color}20`, borderRadius: '12px' }}>
              <kpi.icon size={28} color={kpi.color} />
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>{kpi.label}</p>
              <h3 style={{ fontSize: '2rem', margin: 0 }}>{kpi.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <AlertTriangle color="var(--accent-red)" /> Critical Escalations
      </h2>
      <div className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
        {data.criticalList.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No critical escalations at this time.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.criticalList.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>
                <span style={{ fontWeight: 600 }}>{item.case_id}</span>
                <span>{item.title || item.category}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
