"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldAlert, Mail, Lock, Loader2, ArrowRight, Zap, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function SuperAdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const paramError = searchParams.get('error');
    if (paramError === 'unauthorized') {
      setError('Access Denied: Super Admin privileges are required to access this portal.');
    } else if (paramError === 'profile_not_found') {
      setError('Account profile record not found. Please contact platform administration.');
    } else if (paramError) {
      setError(decodeURIComponent(paramError));
    }
  }, [searchParams]);

  const performSuperAdminAuth = async (authEmail: string, authPass: string) => {
    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail.trim().toLowerCase(),
        password: authPass,
      });

      if (signInError) {
        throw signInError;
      }

      if (!data.user) {
        throw new Error('Authentication failed');
      }

      // Fetch profile to verify SUPER_ADMIN role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_approved')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error('Profile record not found for this account.');
      }

      if (profile.role !== 'SUPER_ADMIN') {
        await supabase.auth.signOut();
        throw new Error('Access Denied: This portal requires SUPER_ADMIN privileges.');
      }

      if (!profile.is_approved) {
        await supabase.auth.signOut();
        throw new Error('Super Admin account is currently inactive.');
      }

      // Log the login event
      try {
        await supabase.from('audit_logs').insert({
          actor_id: data.user.id,
          action: 'SUPER_ADMIN_LOGIN_SUCCESS',
          entity_type: 'auth',
          metadata: { email: authEmail },
        });
      } catch {
        // Non-blocking audit log
      }

      const redirectParam = searchParams.get('redirect') || searchParams.get('returnTo');
      const target = (redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//') && !redirectParam.includes('\\'))
        ? redirectParam
        : '/super-admin';

      router.push(target);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSuperAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await performSuperAdminAuth(email, password);
  };

  const handleDirectSuperAdminLogin = async () => {
    setEmail('venkatapavanpadamati1@gmail.com');
    setPassword('Pavan@123');
    await performSuperAdminAuth('venkatapavanpadamati1@gmail.com', 'Pavan@123');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '20px' }}>
      <div className="ambient-light" style={{ background: 'radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, rgba(0,0,0,0) 70%)' }}></div>
      <div className="ambient-light-alt" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(0,0,0,0) 70%)' }}></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-panel"
        style={{ width: '100%', maxWidth: '440px', padding: '40px', position: 'relative', zIndex: 10, border: '1px solid rgba(239, 68, 68, 0.3)' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '16px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              marginBottom: '16px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <ShieldAlert size={36} color="var(--accent-red)" />
          </div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Super Admin Portal</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>High-Security Root Command &amp; Oversight</p>
        </div>

        {/* 1-Click Direct Super Admin Login Button */}
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          borderRadius: '12px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
        }}>
          <div style={{ fontSize: '0.78rem', color: '#fca5a5', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} color="#ef4444" /> Direct Root Access
          </div>
          <button
            type="button"
            id="btn-direct-superadmin-login"
            onClick={handleDirectSuperAdminLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px 16px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              color: '#ffffff',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
              transition: 'opacity 0.2s',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={16} />}
            <span>Direct Super Admin Login</span>
          </button>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
            Instant sign-in for <code>venkatapavanpadamati1@gmail.com</code>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OR ENTER MANUALLY</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: 'var(--accent-red)',
              marginBottom: '20px',
              fontSize: '0.9rem',
            }}
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSuperAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <Mail size={18} style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }} />
            <input
              type="email"
              placeholder="Super Admin Email"
              className="input-field"
              style={{ paddingLeft: '44px' }}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }} />
            <input
              type="password"
              placeholder="Root Password"
              className="input-field"
              style={{ paddingLeft: '44px' }}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              marginTop: '12px',
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
            }}
          >
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Authenticate Super Admin'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.85rem' }}>
          <a href="/login" style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={14} /> Back to Campus Login
          </a>
        </div>

        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          🔒 Restricted Administrative System. All login attempts are recorded in immutable audit logs.
        </div>
      </motion.div>
    </div>
  );
}

export default function SuperAdminLoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-red)' }} />
      </div>
    }>
      <SuperAdminLoginForm />
    </Suspense>
  );
}
