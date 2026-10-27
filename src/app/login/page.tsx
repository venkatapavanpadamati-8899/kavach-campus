"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  Phone, 
  KeyRound, 
  Loader2, 
  ArrowRight, 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  RotateCcw
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getCollegeById } from '@/lib/colleges';
import { getPageBackground, setActiveCollegeTenant } from '@/lib/college-branding';
import { InteractiveSafetyCharacter } from '@/components/animations/InteractiveSafetyCharacter';

function formatAuthError(err: unknown): string {
  if (!err) return 'An unexpected error occurred during sign in. Please try again.';
  const message = err instanceof Error ? err.message : String(err);

  if (
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('fetch failed') ||
    message.includes('ECONNREFUSED')
  ) {
    return 'Authentication server could not be reached. Please check your internet connection or verify campus network access.';
  }
  if (message.includes('Invalid login credentials')) {
    return 'Incorrect email or password. Please verify your credentials and try again.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Your email address has not been confirmed yet. Please verify your email or use Mobile OTP.';
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Too many login attempts. Please wait a moment before trying again.';
  }
  return message;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Mode: 'email' or 'mobile'
  const [loginMethod, setLoginMethod] = useState<'email' | 'mobile'>('email');

  // Email form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<'password' | 'magic_link'>('password');

  // Mobile OTP state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Focus & feedback states for 3D Character interaction
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

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

  // Resend OTP countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

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

  // Smart auto-detection: if user types 10-digit number into email, guide to mobile OTP
  const handleEmailInputChange = (val: string) => {
    setEmail(val);
    const cleaned = val.trim();
    if (/^[6-9]\d{9}$/.test(cleaned) && !cleaned.includes('@')) {
      setPhone(cleaned);
      setLoginMethod('mobile');
      setMsg('Switched to Mobile OTP mode for 10-digit phone number.');
    }
  };

  // 1. Send OTP to Mobile
  const handleSendMobileOtp = async () => {
    setError('');
    setMsg('');
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `+91${cleanPhone}`;
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });

      if (otpError) {
        // Never show an OTP field unless the configured provider accepted the
        // request; doing so would imply that a code was sent when it was not.
        throw otpError;
      } else {
        setOtpSent(true);
        setCountdown(60);
        setMsg(`6-digit secure login OTP has been sent to +91 ${cleanPhone}.`);
      }
    } catch (err: unknown) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // 2. Verify Mobile OTP and Sign In
  const handleVerifyMobileOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');
    const cleanPhone = phone.trim().replace(/\D/g, '');
    const cleanOtp = otp.trim();

    if (cleanOtp.length < 6) {
      setError('Please enter the 6-digit OTP received on your mobile.');
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `+91${cleanPhone}`;
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: cleanOtp,
        type: 'sms',
      });

      if (verifyError) throw verifyError;

      if (!data.user) {
        throw new Error('Authentication succeeded but user session could not be established.');
      }

      setIsSuccess(true);

      // Fetch profile to route correctly
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_approved, college_id')
        .eq('id', data.user.id)
        .single();

      if (!profile || !profile.is_approved) {
        if (profile?.role === 'STUDENT') {
          router.push('/student/verification-status?notice=verification_required');
          return;
        }
      }

      const authenticatedCollege = profile?.college_id ? getCollegeById(profile.college_id) : null;
      if (authenticatedCollege) setActiveCollegeTenant(authenticatedCollege);

      router.push(getSafeRedirectUrl(profile?.role || 'STUDENT'));
    } catch (err: unknown) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // 3. Email & Password / Magic Link Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMsg('');

    try {
      if (authMode === 'password') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (signInError) throw signInError;

        if (!data.user) {
          throw new Error('Authentication succeeded but user session could not be established.');
        }

        setIsSuccess(true);

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

        // Unapproved student -> route directly to verification status page
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
        // Magic Link
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
      setError(formatAuthError(err));
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
        },
      });
      if (oauthError) {
        if (oauthError.message?.includes('deleted_client') || oauthError.message?.includes('401')) {
          throw new Error('Google OAuth is temporarily unavailable. Please sign in with email/password or mobile OTP.');
        }
        throw oauthError;
      }
    } catch (err: unknown) {
      setError(formatAuthError(err));
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
        transition: 'background-image 0.5s ease',
      }}
    >
      <div className="ambient-light"></div>
      <div className="ambient-light-alt"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '450px',
          padding: '36px 32px',
          position: 'relative',
          zIndex: 10,
          borderRadius: '24px',
          background: 'rgba(15, 23, 42, 0.86)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Interactive 3D Safety Shield Character */}
        <InteractiveSafetyCharacter
          isPasswordFocused={isPasswordFocused}
          isInputFocused={isInputFocused}
          isError={!!error}
          isLoading={loading}
          isSuccess={isSuccess}
        />

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              margin: '0 0 6px 0',
              letterSpacing: '-0.02em',
              color: '#fff',
            }}
          >
            KAVACH CAMPUS
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
            Unified Campus Safety &amp; Emergency Telemetry &bull; Sign In
          </p>
        </div>

        {/* Segmented Dual Mode Switcher: Email vs Mobile Number */}
        <div
          style={{
            display: 'flex',
            padding: '4px',
            background: 'rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            marginBottom: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setLoginMethod('email');
              setError('');
              setMsg('');
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '0.85rem',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.25s ease',
              background: loginMethod === 'email' ? 'var(--accent-blue)' : 'transparent',
              color: loginMethod === 'email' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: loginMethod === 'email' ? '0 2px 8px rgba(59, 130, 246, 0.4)' : 'none',
            }}
          >
            <Mail size={15} /> Institutional Email
          </button>

          <button
            type="button"
            onClick={() => {
              setLoginMethod('mobile');
              setError('');
              setMsg('');
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '0.85rem',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.25s ease',
              background: loginMethod === 'mobile' ? 'var(--accent-blue)' : 'transparent',
              color: loginMethod === 'mobile' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: loginMethod === 'mobile' ? '0 2px 8px rgba(59, 130, 246, 0.4)' : 'none',
            }}
          >
            <Phone size={15} /> Mobile OTP
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
              padding: '12px 14px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              color: '#fca5a5',
              marginBottom: '18px',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
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
              borderRadius: '10px',
              color: '#6ee7b7',
              marginBottom: '18px',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0, color: 'var(--accent-green)' }} />
            <span>{msg}</span>
          </motion.div>
        )}

        {/* Dynamic Mode A: Institutional Email & Password */}
        {loginMethod === 'email' ? (
          <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <Mail
                size={18}
                style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }}
              />
              <input
                type="email"
                placeholder="Institutional or Personal Email"
                className="input-field"
                style={{ paddingLeft: '44px' }}
                value={email}
                onChange={(e) => handleEmailInputChange(e.target.value)}
                onFocus={() => {
                  setIsInputFocused(true);
                  setIsPasswordFocused(false);
                }}
                onBlur={() => setIsInputFocused(false)}
                required
              />
            </div>

            {authMode === 'password' && (
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  className="input-field"
                  style={{ paddingLeft: '44px', paddingRight: '44px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => {
                    setIsPasswordFocused(true);
                    setIsInputFocused(false);
                  }}
                  onBlur={() => setIsPasswordFocused(false)}
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
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'password' ? 'magic_link' : 'password')}
                style={{ background: 'transparent', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', padding: 0 }}
              >
                {authMode === 'password' ? 'Sign in with Magic Link' : 'Sign in with Password'}
              </button>

              {authMode === 'password' && (
                <a href="/forgot-password" style={{ color: 'var(--text-secondary)' }}>
                  Forgot Password?
                </a>
              )}
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
              }}
            >
              {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Sign In'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>
        ) : (
          /* Dynamic Mode B: Mobile Number with Send OTP & Verification */
          <AnimatePresence mode="wait">
            {!otpSent ? (
              <motion.div
                key="send-otp-block"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      borderRight: '1px solid rgba(255, 255, 255, 0.15)',
                      paddingRight: '8px',
                    }}
                  >
                    <span>🇮🇳 +91</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="10-digit Mobile Number"
                    className="input-field"
                    style={{ paddingLeft: '84px' }}
                    value={phone}
                    maxLength={10}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    onFocus={() => {
                      setIsInputFocused(true);
                      setIsPasswordFocused(false);
                    }}
                    onBlur={() => setIsInputFocused(false)}
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSendMobileOtp}
                  disabled={loading || phone.length !== 10}
                  className="btn-primary"
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    height: '46px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    opacity: phone.length === 10 ? 1 : 0.6,
                  }}
                >
                  {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Send OTP'}
                  {!loading && <ArrowRight size={18} />}
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="verify-otp-block"
                onSubmit={handleVerifyMobileOtp}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    OTP sent to: <strong>+91 {phone}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp('');
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-blue)',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                    }}
                  >
                    Change Number
                  </button>
                </div>

                <div style={{ position: 'relative' }}>
                  <KeyRound
                    size={18}
                    style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }}
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter 6-digit OTP"
                    className="input-field"
                    style={{ paddingLeft: '44px', letterSpacing: '4px', fontSize: '1.1rem', fontWeight: 600 }}
                    value={otp}
                    maxLength={6}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    onFocus={() => {
                      setIsInputFocused(true);
                      setIsPasswordFocused(false);
                    }}
                    onBlur={() => setIsInputFocused(false)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  {countdown > 0 ? (
                    <span style={{ color: 'var(--text-muted)' }}>
                      Resend code in {countdown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendMobileOtp}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-blue)',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <RotateCcw size={13} /> Resend OTP
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading || otp.length < 6}
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    height: '46px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    opacity: otp.length === 6 ? 1 : 0.6,
                  }}
                >
                  {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Verify & Sign In'}
                  {!loading && <ArrowRight size={18} />}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        )}

        {/* Social / Workspace Sign In */}
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
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            height: '44px',
            fontSize: '0.95rem',
            opacity: loading || googleLoading ? 0.7 : 1,
          }}
        >
          {googleLoading ? (
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
              />
            </svg>
          )}
          {googleLoading ? 'Connecting to Google...' : 'Continue with Google Workspace'}
        </button>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Don&apos;t have an account?{' '}
          <a href="/register" id="link-to-register" style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>
            Register Account
          </a>
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
              transition: 'color 0.2s',
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
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-blue)' }} />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
