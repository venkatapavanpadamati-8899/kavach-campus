"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, ArrowRight, Shield, CheckCircle2, AlertCircle, Phone, Smartphone, KeyRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getCollegeById } from '@/lib/colleges';
import {
  getPageBackground,
  setActiveCollegeTenant,
} from '@/lib/college-branding';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [simulatedMobileSms, setSimulatedMobileSms] = useState<string | null>(null);
  const [requestingDemoOtp, setRequestingDemoOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [authMode, setAuthMode] = useState<'password' | 'magic_link'>('password');

  // Handle URL search params on mount
  useEffect(() => {
    const paramError = searchParams.get('error');
    const paramVerified = searchParams.get('verified');
    const paramNotice = searchParams.get('notice');

    if (paramVerified === 'true') {
      setMsg('Email verified successfully! Please sign in with your credentials.');
    } else if (paramError === 'pending_approval') {
      setError('Your account is pending administrator approval. Please wait for campus accreditation.');
    } else if (paramError === 'unauthorized') {
      setError('You do not have permission to access that area. Please sign in with an authorized account.');
    } else if (
      paramError === 'google_oauth_client_deleted' ||
      paramError === 'google_oauth_not_configured' ||
      paramError?.includes('deleted_client') ||
      paramError?.includes('invalid_client')
    ) {
      setError('Google Cloud OAuth Client Deleted or Inactive. The configured Google OAuth Web Client ID was deleted or disabled in Google Cloud Console. Please update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or sign in using institutional email and password.');
    } else if (paramError) {
      setError(decodeURIComponent(paramError));
    } else if (paramNotice === 'verification_required') {
      setMsg('Campus or student ID verification is required for full portal access.');
    }
  }, [searchParams]);

  const getSafeRedirectUrl = (role: string): string => {
    const redirectParam = searchParams.get('redirect') || searchParams.get('returnTo') || searchParams.get('next');
    if (
      redirectParam &&
      redirectParam.startsWith('/') &&
      !redirectParam.startsWith('//') &&
      !redirectParam.includes('\\') &&
      !redirectParam.includes(':')
    ) {
      return redirectParam;
    }

    switch (role) {
      case 'STUDENT':
        return '/student';
      case 'STAFF':
      case 'COUNSELLOR':
      case 'COUNSELOR':
      case 'WOMENS_CELL':
      case 'SECURITY':
      case 'MENTOR':
      case 'WARDEN':
        return '/staff';
      case 'HOD':
      case 'PRINCIPAL':
      case 'MANAGEMENT':
        return '/management';
      case 'ADMIN':
        return '/admin';
      case 'SUPER_ADMIN':
        return '/super-admin';
      default:
        return '/student';
    }
  };

  const handleRequestMobileDemoOtp = async () => {
    const cleanPhone = mobilePhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number to request demo OTP.');
      return;
    }
    setRequestingDemoOtp(true);
    setError('');
    try {
      const res = await fetch('/api/auth/demo-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: cleanPhone, purpose: 'LOGIN' })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate demo OTP');
      }
      if (data.message?.body) {
        setSimulatedMobileSms(data.message.body);
        if (data.message.otp) {
          setDemoOtp(data.message.otp);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error generating demo mobile OTP');
    } finally {
      setRequestingDemoOtp(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMsg('');

    if (mobilePhone.trim()) {
      const cleanDigits = mobilePhone.replace(/\D/g, '');
      if (cleanDigits.length !== 10) {
        setError('Please enter a valid 10-digit mobile number.');
        setLoading(false);
        return;
      }
      if (!demoOtp.trim() || demoOtp.trim().length !== 6) {
        setError('Please enter the 6-digit demo OTP received on your mobile.');
        setLoading(false);
        return;
      }
    }

    try {
      if (authMode === 'password') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password
        });
        
        if (signInError) throw signInError;

        if (!data.user) {
          throw new Error('Authentication succeeded but user session could not be established.');
        }
        
        // Fetch profile to route correctly
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, is_approved, college_id')
          .eq('id', data.user.id)
          .single();
          
        if (profileError || !profile) {
          router.push('/student');
          return;
        }

        // Unapproved student -> route directly to verification status page so they can upload credentials or see notice
        if (!profile.is_approved) {
          if (profile.role === 'STUDENT') {
            router.push('/student/verification-status?notice=verification_required');
            return;
          }
          await supabase.auth.signOut();
          throw new Error('Your staff/faculty account is pending administrator approval.');
        }

        const authenticatedCollege = profile.college_id ? getCollegeById(profile.college_id) : null;
        if (authenticatedCollege) setActiveCollegeTenant(authenticatedCollege);

        router.push(getSafeRedirectUrl(profile.role));
      } else {
        // Magic Link (OTP)
        const callbackUrl = typeof window !== 'undefined' && window.location.origin 
          ? `${window.location.origin}/api/auth/callback` 
          : `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/callback`;

        const { error: magicError } = await supabase.auth.signInWithOtp({
          email: email.trim().toLowerCase(),
          options: {
            emailRedirectTo: callbackUrl,
          },
        });
        
        if (magicError) throw magicError;
        setMsg('Check your email for the magic link!');
      }
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : "An unexpected error occurred"));
    } finally {
      setLoading(false);
    }
  };

  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setError('');
      setMsg('');

      const rawRedirect = searchParams.get('redirect') || searchParams.get('returnTo') || searchParams.get('next');
      const safeRedirect = rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') && !rawRedirect.includes('\\') && !rawRedirect.includes(':')
        ? rawRedirect
        : null;

      const baseCallback = typeof window !== 'undefined' && window.location.origin 
        ? `${window.location.origin}/api/auth/callback` 
        : `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/callback`;

      const callbackUrl = safeRedirect 
        ? `${baseCallback}?next=${encodeURIComponent(safeRedirect)}`
        : baseCallback;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
        }
      });
      if (oauthError) {
        if (oauthError.message?.includes('deleted_client') || oauthError.message?.includes('401')) {
          throw new Error('Google OAuth is temporarily unavailable because the OAuth client was deleted in Google Cloud Console. Please sign in with email and password.');
        }
        throw oauthError;
      }
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : "An unexpected error occurred during Google sign in"));
      setGoogleLoading(false);
    }
  };

  const bgConfig = getPageBackground(undefined, 'login');

  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        position: 'relative', 
        padding: '24px 16px',
        backgroundImage: `${bgConfig.overlay}, url('/images/auth_campus_bg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        transition: 'background-image 0.5s ease'
      }}
    >
      <div className="ambient-light"></div>
      <div className="ambient-light-alt"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-panel" 
        style={{ width: '100%', maxWidth: '440px', padding: '36px 32px', position: 'relative', zIndex: 10, borderRadius: '20px' }}
      >
        {/* Official Kavach Campus Shield & Main Heading */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div 
            style={{ 
              width: '64px', 
              height: '64px', 
              margin: '0 auto 14px auto',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px rgba(59, 130, 246, 0.3)'
            }}
          >
            <Shield size={34} color="var(--accent-blue)" />
          </div>
          
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em', color: '#fff' }}>
            KAVACH CAMPUS
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Campus Safety &amp; Emergency Telemetry &bull; Sign in to Portal
          </p>

        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ 
              padding: '12px 14px', 
              background: 'rgba(239, 68, 68, 0.12)', 
              border: '1px solid rgba(239, 68, 68, 0.3)', 
              borderRadius: '8px', 
              color: '#fca5a5', 
              marginBottom: '20px', 
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, color: 'var(--accent-red)' }} />
            <span>{error}</span>
          </motion.div>
        )}
        
        {msg && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ 
              padding: '12px 14px', 
              background: 'rgba(16, 185, 129, 0.12)', 
              border: '1px solid rgba(16, 185, 129, 0.3)', 
              borderRadius: '8px', 
              color: '#6ee7b7', 
              marginBottom: '20px', 
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0, color: 'var(--accent-green)' }} />
            <span>{msg}</span>
          </motion.div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ position: 'relative' }}>
            <Mail size={18} style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }} />
            <input 
              type="email" 
              placeholder="College or Personal Email address" 
              className="input-field" 
              style={{ paddingLeft: '44px' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          {authMode === 'password' && (
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                placeholder="Password" 
                className="input-field" 
                style={{ paddingLeft: '44px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
          )}

          {/* Mobile Number Entry with Demo OTP */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.07)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Smartphone size={14} color="var(--accent-blue)" /> Mobile Number Entry (Demo OTP)
              </span>
              <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>₹0 Free Demo</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Phone size={16} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="tel"
                  id="login-mobile-input"
                  placeholder="10-Digit Mobile (e.g. 9876543210)"
                  className="input-field"
                  style={{ paddingLeft: '38px', height: '40px', fontSize: '0.88rem' }}
                  value={mobilePhone}
                  onChange={(e) => setMobilePhone(e.target.value)}
                  maxLength={10}
                />
              </div>
              <button
                type="button"
                id="btn-get-login-demo-otp"
                onClick={handleRequestMobileDemoOtp}
                disabled={requestingDemoOtp || mobilePhone.replace(/\D/g, '').length !== 10}
                className="btn-secondary"
                style={{ height: '40px', fontSize: '0.8rem', padding: '0 12px', whiteSpace: 'nowrap' }}
              >
                {requestingDemoOtp ? 'Sending...' : 'Get Demo OTP'}
              </button>
            </div>

            {simulatedMobileSms && (
              <div 
                id="simulated-login-otp-box"
                style={{
                  marginTop: '10px',
                  padding: '10px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px dashed rgba(59, 130, 246, 0.4)',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  color: '#93c5fd',
                  whiteSpace: 'pre-line'
                }}
              >
                {simulatedMobileSms}
              </div>
            )}

            {simulatedMobileSms && (
              <div style={{ marginTop: '10px', position: 'relative' }}>
                <KeyRound size={16} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="text"
                  id="login-demo-otp-input"
                  placeholder="Enter 6-Digit Demo OTP"
                  className="input-field"
                  style={{ paddingLeft: '38px', height: '40px', fontSize: '0.88rem', letterSpacing: '2px' }}
                  value={demoOtp}
                  onChange={(e) => setDemoOtp(e.target.value)}
                  maxLength={6}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
            <button 
              type="button" 
              onClick={() => setAuthMode(authMode === 'password' ? 'magic_link' : 'password')}
              style={{ background: 'transparent', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', padding: 0 }}
            >
              {authMode === 'password' ? 'Sign in with Magic Link' : 'Sign in with Password'}
            </button>
            
            {authMode === 'password' && (
              <a href="/forgot-password" style={{ color: 'var(--text-secondary)' }}>Forgot Password?</a>
            )}
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', height: '46px', fontSize: '1rem', fontWeight: 600 }}
          >
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Sign In'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
        </div>

        <button 
          type="button" 
          onClick={handleGoogleLogin}
          disabled={loading || googleLoading}
          className="btn-secondary"
          style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', height: '44px', fontSize: '0.95rem', opacity: (loading || googleLoading) ? 0.7 : 1 }}
        >
          {googleLoading ? (
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
              <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"/>
              <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"/>
            </svg>
          )}
          {googleLoading ? 'Connecting to Google...' : 'Continue with Google Workspace'}
        </button>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Don&apos;t have an account? <a href="/register" id="link-to-register" style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>Register Account</a>
        </div>

        {/* Discreet Institutional Authority & Super Admin Portal Link */}
        <div style={{ marginTop: '16px', textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '12px' }}>
          <a 
            href="/super-admin/login" 
            title="Institutional Authority & Platform Administration Portal"
            style={{ 
              fontSize: '0.74rem', 
              color: 'rgba(255, 255, 255, 0.35)', 
              textDecoration: 'none', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '5px',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#93c5fd')}
            onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.35)')}
          >
            <Shield size={12} /> Institutional Authority &amp; Super Admin Portal
          </a>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-blue)' }} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
