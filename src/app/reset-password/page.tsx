"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, Lock, Mail, KeyRound, Loader2, ArrowRight } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const queryEmail = searchParams.get('email');
    if (queryEmail) {
      setEmail(queryEmail);
    }
  }, [searchParams]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOtp = otp.trim();

    if (!trimmedEmail) {
      setError('Email address is required.');
      return;
    }

    if (!trimmedOtp || trimmedOtp.length !== 6) {
      setError('Please enter the 6-digit recovery code sent to your email.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          otp: trimmedOtp,
          password: password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : 'An unexpected error occurred') || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div 
        style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          position: 'relative',
          backgroundImage: "linear-gradient(180deg, rgba(15, 23, 42, 0.45) 0%, rgba(15, 23, 42, 0.65) 100%), url('/images/auth_campus_bg.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          padding: '20px'
        }}
      >
        <div className="ambient-light"></div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-panel" 
          style={{ width: '100%', maxWidth: '440px', padding: '40px', textAlign: 'center', borderRadius: '20px', background: 'rgba(15, 23, 42, 0.84)', backdropFilter: 'blur(16px)' }}
        >
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', marginBottom: '16px' }}>
            <Shield size={48} color="var(--accent-green)" />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#fff' }}>Password Updated!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Your password has been securely reset. Redirecting you to login...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        position: 'relative', 
        padding: '20px',
        backgroundImage: "linear-gradient(180deg, rgba(15, 23, 42, 0.45) 0%, rgba(15, 23, 42, 0.65) 100%), url('/images/auth_campus_bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="ambient-light"></div>
      <div className="ambient-light-alt"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-panel" 
        style={{ width: '100%', maxWidth: '440px', padding: '40px', position: 'relative', zIndex: 10, borderRadius: '20px', background: 'rgba(15, 23, 42, 0.84)', backdropFilter: 'blur(16px)' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
            style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', marginBottom: '16px' }}
          >
            <Shield size={32} color="var(--accent-blue)" />
          </motion.div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '8px', color: '#fff' }}>Set New Password</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Enter the recovery code sent to your email and your new password.</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: 'var(--accent-red)', marginBottom: '20px', fontSize: '0.9rem' }}
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <Mail size={18} style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }} />
            <input 
              type="email" 
              name="email"
              placeholder="Registered Email" 
              className="input-field" 
              style={{ paddingLeft: '44px' }} 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div style={{ position: 'relative' }}>
            <KeyRound size={18} style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              name="otp"
              placeholder="6-Digit Recovery Code (OTP)" 
              className="input-field" 
              style={{ paddingLeft: '44px', letterSpacing: '2px' }} 
              value={otp} 
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
              maxLength={6}
              required 
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }} />
            <input 
              type="password" 
              name="password"
              placeholder="New Password (min 8 chars)" 
              className="input-field" 
              style={{ paddingLeft: '44px' }} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }} />
            <input 
              type="password" 
              name="confirmPassword"
              placeholder="Confirm New Password" 
              className="input-field" 
              style={{ paddingLeft: '44px' }} 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              required 
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '8px', height: '46px', fontSize: '0.95rem', fontWeight: 600 }}>
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Update Password'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <a href="/login" style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>Return to Login</a>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
