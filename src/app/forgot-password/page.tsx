"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, Mail, CreditCard, Loader2, ArrowRight } from 'lucide-react';
import { validateStudentRegistrationNumber } from '@/lib/verification/id-card';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const emailTrimmed = email.trim().toLowerCase();
      if (!emailTrimmed) {
        setError('Please enter your registered email address.');
        setLoading(false);
        return;
      }

      if (registrationNumber.trim()) {
        const regCheck = validateStudentRegistrationNumber({
          registrationNumber: registrationNumber.trim(),
        });
        if (!regCheck.valid) {
          setError(regCheck.error || 'Student Registration Number must be 7 to 10 alphanumeric characters');
          setLoading(false);
          return;
        }
      }

      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailTrimmed,
          registrationNumber: registrationNumber.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to request password reset');
      }

      setSuccess(true);
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : "An unexpected error occurred") || 'Failed to send reset link');
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
          <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#fff' }}>Recovery Code Dispatched!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem', lineHeight: 1.5 }}>
            If an account exists with these matching credentials, a verification OTP has been sent. Please check your email and proceed to create your new password.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              onClick={() => router.push(`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`)} 
              className="btn-primary" 
              style={{ width: '100%', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              Enter OTP &amp; Reset Password <ArrowRight size={16} />
            </button>
            <button 
              onClick={() => router.push('/login')} 
              className="btn-secondary" 
              style={{ width: '100%', height: '42px' }}
            >
              Return to Login
            </button>
          </div>
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
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
            style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', marginBottom: '16px' }}
          >
            <Shield size={32} color="var(--accent-blue)" />
          </motion.div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '8px', color: '#fff' }}>Reset Password</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Enter your registered email and Student Registration Number to receive a secure recovery code.
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: 'var(--accent-red)', marginBottom: '20px', fontSize: '0.9rem' }}
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <Mail size={18} style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }} />
            <input 
              type="email" 
              name="email" 
              placeholder="Registered Email address" 
              className="input-field" 
              style={{ paddingLeft: '44px' }} 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div style={{ position: 'relative' }}>
            <CreditCard size={18} style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              name="registrationNumber" 
              placeholder="Student Registration Number (for students)" 
              className="input-field" 
              style={{ paddingLeft: '44px' }} 
              value={registrationNumber} 
              onChange={(e) => setRegistrationNumber(e.target.value)} 
              maxLength={10}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '8px', height: '46px', fontSize: '0.95rem', fontWeight: 600 }}>
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Send Recovery OTP'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Remember your password? <a href="/login" style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>Sign In</a>
        </div>
      </motion.div>
    </div>
  );
}
