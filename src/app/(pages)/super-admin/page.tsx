"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldAlert, Users, Database, Cpu, Activity, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: '0',
    totalAdmins: '0',
    pendingStaff: '0',
    totalIncidents: '0',
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    async function loadSuperStats() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) router.push('/super-admin/login');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_approved')
          .eq('id', user.id)
          .single();

        if (!profile || profile.role !== 'SUPER_ADMIN' || !profile.is_approved) {
          if (!cancelled) router.push('/super-admin/login?error=unauthorized');
          return;
        }

        const [{ count: userCount }, { count: adminCount }, { count: pendingCount }, { count: incidentCount }] =
          await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['ADMIN', 'SUPER_ADMIN']),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_approved', false),
            supabase.from('incidents').select('*', { count: 'exact', head: true }),
          ]);

        if (!cancelled) {
          setStats({
            totalUsers: (userCount ?? 0).toLocaleString(),
            totalAdmins: (adminCount ?? 0).toString(),
            pendingStaff: (pendingCount ?? 0).toString(),
            totalIncidents: (incidentCount ?? 0).toString(),
            loading: false,
          });
        }
      } catch {
        if (!cancelled) setStats(prev => ({ ...prev, loading: false }));
      }
    }
    loadSuperStats();
    return () => { cancelled = true; };
  }, [router]);

  const cards = [
    { label: 'Total Registered Accounts', value: stats.loading ? '...' : stats.totalUsers, icon: Users, color: 'var(--accent-blue)' },
    { label: 'Admins & Leadership', value: stats.loading ? '...' : stats.totalAdmins, icon: ShieldAlert, color: 'var(--accent-purple)' },
    { label: 'Pending Staff Verifications', value: stats.loading ? '...' : stats.pendingStaff, icon: AlertTriangle, color: '#f59e0b' },
    { label: 'Total Emergency Logs', value: stats.loading ? '...' : stats.totalIncidents, icon: Activity, color: 'var(--accent-red)' },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '20px', color: 'var(--accent-red)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
            <ShieldAlert size={16} /> ROOT SUPER ADMIN OVERSIGHT
          </div>
          <h1 style={{ fontSize: '2.5rem', margin: 0 }}>Super Admin Command Center</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>System-wide governance, security policy enforcement, and infrastructure health.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/admin/users" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
            Review Pending Staff ({stats.pendingStaff})
          </Link>
          <Link href="/super-admin/pending-campus" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
            Verify Pending Campuses
          </Link>
          <Link href="/admin" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
            Open Admin Control <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel"
            style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}
          >
            <div style={{ padding: '14px', background: `${c.color}20`, borderRadius: '12px' }}>
              <c.icon size={26} color={c.color} />
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>{c.label}</p>
              <h3 style={{ fontSize: '1.8rem', margin: '4px 0 0' }}>{c.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '40px' }}>
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={22} color="var(--accent-blue)" /> Infrastructure &amp; Security Posture
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
              <div>
                <div style={{ fontWeight: 600 }}>PostgreSQL Database (Supabase)</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Row-Level Security (RLS) isolation active</div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent-green)', fontSize: '0.9rem' }}>
                <CheckCircle size={16} /> Healthy
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Deterministic Safety Override Engine</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Multilingual threat keyword rules (Telugu / Hindi / English)</div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent-green)', fontSize: '0.9rem' }}>
                <CheckCircle size={16} /> Active &amp; Guarded
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Emergency SOS &amp; Safe Walk Pipelines</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Non-blocking dispatch with 6-second timeout bounding</div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent-green)', fontSize: '0.9rem' }}>
                <CheckCircle size={16} /> Operational
              </span>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu size={22} color="var(--accent-purple)" /> Quick Actions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link href="/super-admin/pending-campus" style={{ textDecoration: 'none' }}>
              <button className="btn-secondary" style={{ width: '100%', textAlign: 'left', padding: '12px 16px' }}>
                🏫 Assign verified campuses to pending accounts
              </button>
            </Link>
            <Link href="/admin/users" style={{ textDecoration: 'none' }}>
              <button className="btn-secondary" style={{ width: '100%', textAlign: 'left', padding: '12px 16px' }}>
                👥 Manage All Users &amp; Roles
              </button>
            </Link>
            <Link href="/admin/ai" style={{ textDecoration: 'none' }}>
              <button className="btn-secondary" style={{ width: '100%', textAlign: 'left', padding: '12px 16px' }}>
                🤖 AI Severity Rules &amp; Thresholds
              </button>
            </Link>
            <Link href="/admin/campus" style={{ textDecoration: 'none' }}>
              <button className="btn-secondary" style={{ width: '100%', textAlign: 'left', padding: '12px 16px' }}>
                🏫 Campus Zones &amp; Safe Havens
              </button>
            </Link>
            <Link href="/admin/incidents" style={{ textDecoration: 'none' }}>
              <button className="btn-secondary" style={{ width: '100%', textAlign: 'left', padding: '12px 16px' }}>
                📊 Global Incident Audit Log
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
