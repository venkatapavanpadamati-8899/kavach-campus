"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, KeyRound, Loader2, ArrowRight, Smartphone, RefreshCw, AlertCircle } from 'lucide-react';

function VerifyOTPForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [simulatedSms, setSimulatedSms] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes (300 seconds)
  const [resendCooldown, setResendCooldown] = useState(0);

  // 5-minute countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const cooldownTimer = setInterval(() => {
      setResendCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(cooldownTimer);
  }, [resendCooldown]);

  // Check for local demo SMS in development (authorized session only)
  useEffect(() => {
    if (email && process.env.NODE_ENV !== 'production') {
      const urlToken = searchParams.get('token');
      const cleanEmail = email.trim().toLowerCase();
      const storedToken = typeof window !== 'undefined' ? sessionStorage.getItem(`kavach_demo_token_${cleanEmail}`) : null;
      const token = urlToken || storedToken;

      const fetchUrl = `/api/auth/demo-sms?recipient=${encodeURIComponent(cleanEmail)}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
      fetch(fetchUrl, {
        headers: token ? { 'x-demo-token': token } : {}
      })
        .then(res => {
          if (!res.ok) return null;
          return res.json();
        })
        .then(data => {
          if (data?.message?.body) {
            setSimulatedSms(data.message.body);
            if (data.message.otp) {
              setOtp(data.message.otp);
            }
          }
        })
        .catch(() => {});
    }
  }, [email, searchParams]);

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;
    setResending(true);
    setError('');
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend verification code');
      }
      if (data.clientToken && typeof window !== 'undefined') {
        const cleanEmail = email.trim().toLowerCase();
        sessionStorage.setItem(`kavach_demo_token_${cleanEmail}`, data.clientToken);
        const fetchUrl = `/api/auth/demo-sms?recipient=${encodeURIComponent(cleanEmail)}&token=${encodeURIComponent(data.clientToken)}`;
        fetch(fetchUrl, { headers: { 'x-demo-token': data.clientToken } })
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (d?.message?.body) {
              setSimulatedSms(d.message.body);
              if (d.message.otp) setOtp(d.message.otp);
            }
          })
          .catch(() => {});
      }
      setTimeLeft(300); // Reset 5-minute expiry
      setResendCooldown(60); // 60-second cooldown
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error resending OTP');
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'OTP verification failed');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
      
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : "An unexpected error occurred"));
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div className="ambient-light"></div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '40px', textAlign: 'center' }}
        >
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', marginBottom: '16px' }}>
            <Shield size={48} color="var(--accent-green)" />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Account Verified!</h2>
          <p style={{ color: 'var(--text-secondary)' }}>You can now login with your credentials.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '20px' }}>
      <div className="ambient-light"></div>
      <div className="ambient-light-alt"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-panel" 
        style={{ width: '100%', maxWidth: '460px', padding: '36px', position: 'relative', zIndex: 10 }}
      >
        {/* Demo Mode Notice Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '0.85rem',
          color: 'var(--accent-blue)'
        }}>
          <Smartphone size={16} />
          <span><strong>Demo OTP Verification</strong> — ₹0 Free Simulation. Real SMS is disabled; enter the 6-digit verification code.</span>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            style={{ display: 'inline-flex', padding: '14px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', marginBottom: '12px' }}
          >
            <KeyRound size={28} color="var(--accent-blue)" />
          </motion.div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '6px' }}>Verify Identity</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Enter the 6-digit verification code.
          </p>
          <div style={{ marginTop: '8px', fontSize: '0.85rem', color: timeLeft > 60 ? 'var(--text-secondary)' : 'var(--accent-red)' }}>
            Code expires in: <strong>{formatTimer(timeLeft)}</strong>
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: 'var(--accent-red)', marginBottom: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Simulated Demo SMS Box */}
        {simulatedSms && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px dashed rgba(59, 130, 246, 0.4)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            color: '#93c5fd',
            whiteSpace: 'pre-line'
          }}>
            {simulatedSms}
          </div>
        )}

        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <input 
              type="email" 
              placeholder="Campus Email or Phone" 
              className="input-field" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="6-digit OTP" 
              className="input-field"
              maxLength={6}
              style={{ fontSize: '1.2rem', letterSpacing: '4px', textAlign: 'center' }}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required 
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading || timeLeft <= 0} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Verify Account'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        {/* Resend OTP Action */}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button 
            type="button" 
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
            style={{
              background: 'none',
              border: 'none',
              color: resendCooldown > 0 ? 'var(--text-secondary)' : 'var(--accent-blue)',
              cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={14} style={{ animation: resending ? 'spin 1s linear infinite' : 'none' }} />
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Demo OTP'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyOTPForm />
    </Suspense>
  );
}
