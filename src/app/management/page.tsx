"use client";
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ShieldAlert, Users, TrendingUp, AlertTriangle, ArrowRight, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getCollegeById, CollegeTenant } from '@/lib/colleges';

export default function ManagementDashboard() {
  const [collegeInfo, setCollegeInfo] = useState<CollegeTenant | null>(null);
  const [data, setData] = useState({
    activeIncidents: '0',
    avgResponseTime: '--',
    staffOnDuty: '0',
    criticalList: [] as Array<{ id: string; case_id: string; title: string; category: string }>,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    async function loadManagementData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        let userCollegeId: string | null = null;
        let isSuperAdmin = false;

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, college_id')
            .eq('id', user.id)
            .single();

          if (profile) {
            isSuperAdmin = profile.role === 'SUPER_ADMIN';
            userCollegeId = profile.college_id;
            if (profile.college_id) {
              const col = getCollegeById(profile.college_id);
              if (!cancelled && col) setCollegeInfo(col);
            }
          }
        }

        let incidentQuery = supabase.from('incidents').select('*', { count: 'exact', head: true }).neq('status', 'RESOLVED');
        let dutyQuery = supabase.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['SECURITY', 'STAFF', 'WARDEN', 'CAMPUS_WATCH']).eq('is_active', true);
        let criticalQuery = supabase.from('incidents').select('id, case_id, title, category').eq('severity', 'CRITICAL').neq('status', 'RESOLVED').limit(5);

        // Strict cross-college data isolation: College management sees only their own college's incidents and staff
        if (userCollegeId && !isSuperAdmin) {
          incidentQuery = incidentQuery.eq('college_id', userCollegeId);
          dutyQuery = dutyQuery.eq('college_id', userCollegeId);
          criticalQuery = criticalQuery.eq('college_id', userCollegeId);
        }

        const [{ count: activeCount }, { count: dutyCount }, { data: criticals }] = await Promise.all([
          incidentQuery,
          dutyQuery,
          criticalQuery,
        ]);

        if (!cancelled) {
          setData({
            activeIncidents: (activeCount ?? 0).toString(),
            avgResponseTime: '< 3m (SLA Target)',
            staffOnDuty: (dutyCount ?? 0).toString(),
            criticalList: criticals ?? [],
            loading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setData(prev => ({ ...prev, loading: false }));
        }
      }
    }
    loadManagementData();
    return () => { cancelled = true; };
  }, []);

  const kpis = [
    { label: 'Total Active Incidents', value: data.loading ? '...' : data.activeIncidents, icon: ShieldAlert, color: 'var(--accent-red)' },
    { label: 'Avg Target Response', value: data.avgResponseTime, icon: TrendingUp, color: 'var(--accent-blue)' },
    { label: 'Staff On Duty', value: data.loading ? '...' : data.staffOnDuty, icon: Users, color: 'var(--accent-purple)' },
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {collegeInfo && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '20px',
          background: 'rgba(59, 130, 246, 0.15)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          marginBottom: '16px'
        }}>
          <Building2 size={16} color="#60a5fa" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#93c5fd' }}>
            {collegeInfo.name} ({collegeInfo.city}, {collegeInfo.state})
          </span>
        </div>
      )}
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertTriangle color="var(--accent-red)" /> Critical Escalations
        </h2>
        <Link href="/management/incidents" className="btn-secondary" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          View All Incidents <ArrowRight size={14} />
        </Link>
      </div>
      <div className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
        {data.criticalList.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No critical escalations at this time.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.criticalList.map(item => (
              <Link
                key={item.id}
                href={`/management/incidents/${item.id}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 18px',
                  background: 'rgba(239,68,68,0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'background 0.2s, transform 0.15s',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--accent-red)', marginRight: '12px' }}>{item.case_id}</span>
                  <span style={{ fontWeight: 500 }}>{item.title || item.category}</span>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Review <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
