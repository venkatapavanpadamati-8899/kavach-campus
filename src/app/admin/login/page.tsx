"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, Loader2, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getCollegeById } from '@/lib/colleges';
import { setActiveCollegeTenant } from '@/lib/college-branding';

function CampusAdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setError('Authentication service is temporarily unavailable. Institutional administrator configuration required.');
      return;
    }

    const paramError = searchParams.get('error');
    if (paramError === 'unauthorized') {
      setError('Access restricted: Authorized campus administrator credentials are required.');
    } else if (paramError === 'pending_approval') {
      setError('Your administrator account is pending institutional accreditation or campus activation.');
    } else if (paramError === 'profile_not_found') {
      setError('Administrator profile record not found. Please contact the campus platform administrator.');
    } else if (paramError) {
      setError(decodeURIComponent(paramError));
    }
  }, [searchParams]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          throw new Error('Incorrect administrator email or password. Please verify credentials.');
        }
        if (signInError.message.includes('Email not confirmed')) {
          throw new Error('Your institutional email address has not been confirmed yet.');
        }
        throw signInError;
      }

      if (!data.user) {
        throw new Error('Authentication succeeded but session could not be established.');
      }

      // Verify server-side permissions in profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_approved, college_id, full_name')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error('Administrator profile record not found. Please contact campus authority.');
      }

      const role = profile.role;

      // Students are strictly blocked from administrator portals
      if (role === 'STUDENT') {
        await supabase.auth.signOut();
        throw new Error('Access restricted: This portal is reserved for campus administrators and institutional staff. Students must sign in through the student portal.');
      }

      // Check approval status for staff / admin
      if (!profile.is_approved) {
        await supabase.auth.signOut();
        throw new Error('Your administrator account is pending institutional accreditation or campus activation.');
      }

      // Check authorized institutional roles
      const isInstitutionalAdmin =
        role === 'ADMIN' ||
        role === 'MANAGEMENT' ||
        role === 'PRINCIPAL' ||
        role === 'HOD' ||
        role === 'STAFF' ||
        role === 'COUNSELLOR' ||
        role === 'COUNSELOR' ||
        role === 'WOMENS_CELL' ||
        role === 'SECURITY' ||
        role === 'WARDEN' ||
        role === 'MENTOR' ||
        role === 'SUPER_ADMIN';

      if (!isInstitutionalAdmin) {
        await supabase.auth.signOut();
        throw new Error('Access denied: You do not have verified campus administrator privileges.');
      }

      // Set active college tenant branding if configured
      if (profile.college_id) {
        const college = getCollegeById(profile.college_id);
        if (college) setActiveCollegeTenant(college);
      }

      // Log successful administrator access event safely
      try {
        await supabase.from('audit_logs').insert({
          actor_id: data.user.id,
          action: 'CAMPUS_ADMIN_LOGIN_SUCCESS',
          entity_type: 'auth',
          metadata: { email: normalizedEmail, role },
        });
      } catch {
        // Non-blocking telemetry
      }

      // Safe redirection matrix
      const redirectParam = searchParams.get('redirect') || searchParams.get('returnTo');
      if (
        redirectParam &&
        redirectParam.startsWith('/') &&
        !redirectParam.startsWith('//') &&
        !redirectParam.includes('\\') &&
        !redirectParam.includes(':')
      ) {
        router.push(redirectParam);
        return;
      }

      if (role === 'SUPER_ADMIN') {
        router.push('/super-admin');
      } else if (role === 'ADMIN') {
        router.push('/admin');
      } else if (role === 'HOD' || role === 'PRINCIPAL' || role === 'MANAGEMENT') {
        router.push('/management');
      } else {
        router.push('/staff');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: '24px 16px',
        background: 'linear-gradient(135deg, #0B132B 0%, #1C2541 50%, #0F172A 100%)',
      }}
    >
      <div className="ambient-light" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.18) 0%, rgba(0,0,0,0) 70%)' }}></div>
      <div className="ambient-light-alt" style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0,0,0,0) 70%)' }}></div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '36px 32px',
          position: 'relative',
          zIndex: 10,
          borderRadius: '24px',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 40px rgba(59, 130, 246, 0.1)',
        }}
      >
        {/* Administrator Badge Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(79, 70, 229, 0.2) 100%)',
              border: '1px solid rgba(96, 165, 250, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: '#60a5fa',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.25)',
            }}
          >
            <Shield size={28} />
          </div>

          <h1
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              margin: '0 0 6px 0',
              letterSpacing: '-0.02em',
              color: '#fff',
            }}
          >
            Campus Administrator
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', margin: 0 }}>
            Authorized Institutional Staff &amp; Authority Portal
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              lineHeight: 1.45,
              marginBottom: '20px',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{error}</div>
          </motion.div>
        )}

        <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ position: 'relative' }}>
            <Mail
              size={18}
              style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }}
            />
            <input
              type="email"
              placeholder="Administrator Email (@campus.edu)"
              className="input-field"
              style={{ paddingLeft: '44px', width: '100%' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock
              size={18}
              style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }}
            />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              className="input-field"
              style={{ paddingLeft: '44px', paddingRight: '44px', width: '100%' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                top: '12px',
                right: '14px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.85rem' }}>
            <a href="/forgot-password" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>
              Forgot Password?
            </a>
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
              height: '46px',
              fontSize: '1rem',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
            }}
          >
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Authenticate & Enter Dashboard'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Student or standard user?{' '}
          <a href="/login" style={{ color: 'var(--accent-blue)', fontWeight: 600, textDecoration: 'none' }}>
            Go to Student Portal
          </a>
        </div>

        {/* Security Audit Watermark */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.4)' }}>
            Authorized Institutional Access Only &bull; All sessions cryptographically verified
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function CampusAdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-blue)' }} />
        </div>
      }
    >
      <CampusAdminLoginForm />
    </Suspense>
  );
}
