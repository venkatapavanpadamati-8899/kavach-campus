"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, User, Briefcase, Loader2, ArrowRight, Phone, CreditCard, Building2, GraduationCap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { validateStudentRegistrationNumber } from '@/lib/verification/id-card';

import { INDIAN_ENGINEERING_COLLEGES } from '@/lib/colleges';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    collegeId: INDIAN_ENGINEERING_COLLEGES[0]?.id || '',
    email: '',
    personalEmail: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'STUDENT',
    registrationNumber: '',
    degree: 'B.Tech — Bachelor of Technology',
    department: '',
    academicYear: '1st Year'
  });
  const [consent, setConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [campusVerificationRequired, setCampusVerificationRequired] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setError('');
      const supabase = createClient();
      const callbackUrl = typeof window !== 'undefined' && window.location.origin 
        ? `${window.location.origin}/api/auth/callback` 
        : `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/callback`;

      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
        }
      });
      if (oauthErr) {
        if (oauthErr.message?.includes('deleted_client') || oauthErr.message?.includes('401')) {
          throw new Error('Google OAuth Client is inactive or deleted in Google Cloud Console. Please configure an active client in Supabase.');
        }
        throw oauthErr;
      }
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : "An unexpected error occurred during Google sign in"));
      setGoogleLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
        setError('Passwords do not match. Please ensure both password fields match.');
        setLoading(false);
        return;
      }

      if (!consent) {
        setError('Please agree to the Campus Safety Terms & Privacy Policy to continue.');
        setLoading(false);
        return;
      }
      const emailTrimmed = formData.email.trim();
      if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
        setError('Please enter a valid email address (e.g. college email or personal Gmail)');
        setLoading(false);
        return;
      }

      const regNumTrimmed = formData.registrationNumber.trim();
      if (formData.role === 'STUDENT') {
        const regCheck = validateStudentRegistrationNumber({
          registrationNumber: regNumTrimmed,
        });
        if (!regCheck.valid) {
          setError(regCheck.error || 'Student Registration Number must be 8, 9, or 10 alphanumeric characters');
          setLoading(false);
          return;
        }
        if (!formData.department || formData.department.trim() === '') {
          setError('Please select your department');
          setLoading(false);
          return;
        }
        if (!formData.academicYear || formData.academicYear.trim() === '') {
          setError('Please select your academic year');
          setLoading(false);
          return;
        }
      } else if (!regNumTrimmed) {
        setError('Employee ID is required for staff registration');
        setLoading(false);
        return;
      }

      const payload = {
        name: formData.name.trim(),
        email: emailTrimmed.toLowerCase(),
        personalEmail: formData.personalEmail.trim() || undefined,
        personal_email: formData.personalEmail.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        password: formData.password,
        role: formData.role,
        degree: formData.role === 'STUDENT' ? formData.degree : undefined,
        department: formData.department.trim(),
        academicYear: formData.role === 'STUDENT' ? formData.academicYear : undefined,
        academic_year: formData.role === 'STUDENT' ? formData.academicYear : undefined,
        registrationNumber: regNumTrimmed,
        studentId: regNumTrimmed,
        collegeId: formData.collegeId.trim() || regNumTrimmed,
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      if (data.clientToken && typeof window !== 'undefined') {
        sessionStorage.setItem(`kavach_demo_token_${emailTrimmed.toLowerCase()}`, data.clientToken);
      }

      setCampusVerificationRequired(data.campusVerificationRequired === true);
      setSuccess(true);
      setTimeout(() => {
        const tokenQuery = data.clientToken ? `&token=${encodeURIComponent(data.clientToken)}` : '';
        router.push(`/verify-otp?email=${encodeURIComponent(emailTrimmed)}${tokenQuery}`);
      }, 2000);
      
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : "An unexpected error occurred"));
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
          backgroundImage: "linear-gradient(180deg, rgba(10, 15, 30, 0.65) 0%, rgba(15, 23, 42, 0.78) 100%), url('/images/auth_campus_bg.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="ambient-light"></div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-panel" 
          style={{ 
            width: '100%', 
            maxWidth: '460px', 
            padding: '40px', 
            textAlign: 'center', 
            borderRadius: '20px',
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)'
          }}
        >
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', marginBottom: '16px' }}>
            <Shield size={48} color="var(--accent-green)" />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '8px' }}>Registration Complete!</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {campusVerificationRequired
              ? 'Your email domain is not linked to a pre-verified campus. You can submit your Student ID card after sign-in to complete campus verification.'
              : 'Your institutional email determines your campus. Redirecting to email verification...'}
          </p>
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
        padding: '32px 16px',
        backgroundImage: "linear-gradient(180deg, rgba(10, 15, 30, 0.65) 0%, rgba(15, 23, 42, 0.78) 100%), url('/images/auth_campus_bg.jpg')",
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
        style={{ 
          width: '100%', 
          maxWidth: '520px', 
          padding: '36px 32px', 
          position: 'relative', 
          zIndex: 10, 
          borderRadius: '20px',
          background: 'rgba(15, 23, 42, 0.84)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)'
        }}
      >
        {/* Universal Kavach Shield & Main Heading */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div 
            style={{ 
              width: '64px', 
              height: '64px', 
              margin: '0 auto 14px auto',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
              border: '1px solid rgba(124, 58, 237, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px rgba(124, 58, 237, 0.3)'
            }}
          >
            <Shield size={34} color="var(--accent-purple)" />
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em', color: '#fff' }}>
            Create Your Safety Account
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Kavach Campus &bull; Multi-Institution Safety Network
          </p>

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', background: 'rgba(255, 255, 255, 0.05)', padding: '4px', borderRadius: '12px' }}>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: 'STUDENT' })}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                background: formData.role === 'STUDENT' ? 'var(--accent-purple)' : 'transparent',
                color: '#fff',
                transition: 'all 0.2s',
              }}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: 'STAFF' })}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                background: formData.role !== 'STUDENT' ? 'var(--accent-blue)' : 'transparent',
                color: '#fff',
                transition: 'all 0.2s',
              }}
            >
              Staff / Management
            </button>
          </div>

          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            textAlign: 'center'
          }}>
            Institutional affiliation is linked via your college email or verified with your Student ID card after sign-in.
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: 'var(--accent-red)', marginBottom: '20px', fontSize: '0.9rem' }}
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleRegister} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <User size={18} style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }} />
            <input type="text" name="name" placeholder="Full Name" className="input-field" style={{ paddingLeft: '44px' }} value={formData.name} onChange={handleChange} required />
          </div>

          {/* College / Institution Selector */}
          <div style={{ position: 'relative' }}>
            <Building2 size={18} style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }} />
            <select
              name="collegeId"
              className="input-field"
              style={{
                paddingLeft: '44px',
                appearance: 'none',
                background: 'rgba(255, 255, 255, 0.08)',
                color: formData.collegeId ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
              value={formData.collegeId}
              onChange={handleChange}
              required
            >
              <option value="" disabled style={{ background: '#0f172a', color: '#94a3b8' }}>Select College / Institution...</option>
              {INDIAN_ENGINEERING_COLLEGES.map((c) => (
                <option key={c.id} value={c.id} style={{ background: '#1e293b', color: '#fff' }}>
                  {c.name}
                </option>
              ))}
              <option value="dnr-bhimavaram" style={{ background: '#1e293b', color: '#fff' }}>DNR College of Engineering and Technology</option>
              <option value="aucoe-visakhapatnam" style={{ background: '#1e293b', color: '#fff' }}>Andhra University College of Engineering</option>
              <option value="vrsec-vijayawada" style={{ background: '#1e293b', color: '#fff' }}>VR Siddhartha Engineering College</option>
              <option value="jntuk-kakinada" style={{ background: '#1e293b', color: '#fff' }}>JNTUK College of Engineering Kakinada</option>
              <option value="OTHER" style={{ background: '#1e293b', color: '#fff' }}>Other / Affiliate Institution</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }} />
              <input 
                type="email" 
                name="email" 
                placeholder={formData.role === 'STUDENT' ? 'Email Address (College or Personal Gmail)' : 'Official Faculty Email'} 
                className="input-field" 
                style={{ paddingLeft: '44px' }} 
                value={formData.email} 
                onChange={handleChange} 
                required 
              />
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', paddingLeft: '4px' }}>
              Institutional domain auto-authenticates your campus tenant. Personal emails require ID card verification.
            </span>
          </div>

          {/* Optional Alternative Personal Email */}
          {formData.role === 'STUDENT' && (
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }} />
              <input 
                type="text"
                inputMode="email"
                name="personalEmail" 
                placeholder="Alternate Personal Email (Optional)" 
                className="input-field" 
                style={{ paddingLeft: '44px' }} 
                value={formData.personalEmail} 
                onChange={handleChange} 
              />
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <Phone size={18} style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }} />
            <input 
              type="tel" 
              name="phone" 
              placeholder="10-Digit Mobile Number (e.g. 9876543210)" 
              className="input-field" 
              style={{ paddingLeft: '44px' }} 
              value={formData.phone} 
              onChange={handleChange} 
              maxLength={10} 
            />
          </div>
          
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }} />
            <input type="password" name="password" placeholder="Password (minimum 8 characters)" className="input-field" style={{ paddingLeft: '44px' }} value={formData.password} onChange={handleChange} required minLength={8} />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }} />
            <input type="password" name="confirmPassword" placeholder="Confirm Password" className="input-field" style={{ paddingLeft: '44px' }} value={formData.confirmPassword} onChange={handleChange} minLength={8} />
          </div>

          {formData.role === 'STUDENT' ? (
            <div style={{ position: 'relative' }}>
              <CreditCard size={18} style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                name="registrationNumber" 
                placeholder="Student Registration Number (8-10 Characters e.g. 2101201045, 21CS1045)" 
                className="input-field" 
                style={{ paddingLeft: '44px', letterSpacing: '0.5px' }} 
                value={formData.registrationNumber} 
                onChange={handleChange} 
                minLength={8}
                maxLength={10} 
                pattern="[A-Za-z0-9]{8,10}"
                title="Student Registration Number (8, 9, or 10 characters)"
                required 
              />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ position: 'relative' }}>
                <Briefcase size={18} style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }} />
                <select
                  name="role"
                  className="input-field"
                  style={{ paddingLeft: '44px', appearance: 'none', background: 'rgba(255, 255, 255, 0.08)', color: '#fff' }}
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="STAFF" style={{ background: '#1e1b4b' }}>Staff Member</option>
                  <option value="MENTOR" style={{ background: '#1e1b4b' }}>Mentor</option>
                  <option value="COUNSELLOR" style={{ background: '#1e1b4b' }}>Counselor</option>
                  <option value="SECURITY" style={{ background: '#1e1b4b' }}>Campus Security</option>
                  <option value="WOMENS_CELL" style={{ background: '#1e1b4b' }}>Women&apos;s Cell</option>
                  <option value="HOD" style={{ background: '#1e1b4b' }}>Head of Department (HOD)</option>
                  <option value="PRINCIPAL" style={{ background: '#1e1b4b' }}>Principal</option>
                  <option value="MANAGEMENT" style={{ background: '#1e1b4b' }}>College Management</option>
                </select>
              </div>
              <input 
                type="text" 
                name="registrationNumber" 
                placeholder="Employee ID" 
                className="input-field" 
                value={formData.registrationNumber} 
                onChange={handleChange} 
                required 
              />
            </div>
          )}

          {formData.role === 'STUDENT' && (
            <div style={{ position: 'relative' }}>
              <GraduationCap size={18} style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }} />
              <select
                name="degree"
                className="input-field"
                style={{
                  paddingLeft: '44px',
                  appearance: 'none',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  cursor: 'pointer',
                }}
                value={formData.degree}
                onChange={handleChange}
                required
              >
                <option value="B.Tech — Bachelor of Technology" style={{ background: '#1e293b', color: '#fff' }}>B.Tech — Bachelor of Technology</option>
                <option value="Degree Programs (B.Sc., B.Com., BBA, BA)" style={{ background: '#1e293b', color: '#fff' }}>Degree Programs (B.Sc., B.Com., BBA, BA)</option>
                <option value="Other Academic Program" style={{ background: '#1e293b', color: '#fff' }}>Other Academic Program</option>
              </select>
            </div>
          )}

          {formData.role === 'STUDENT' ? (
            <div style={{ position: 'relative' }}>
              <select
                name="department"
                className="input-field"
                style={{
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  appearance: 'none',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: formData.department ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
                value={formData.department}
                onChange={handleChange}
                required
              >
                <option value="" disabled style={{ background: '#0f172a', color: '#94a3b8' }}>Select Department...</option>
                {formData.degree.includes('Degree Programs') ? (
                  <optgroup label="Degree Program Departments" style={{ background: '#0f172a', color: '#a855f7', fontWeight: 600 }}>
                    <option value="B.Sc. Computer Science" style={{ background: '#1e293b', color: '#fff' }}>B.Sc. Computer Science</option>
                    <option value="B.Sc. Mathematics" style={{ background: '#1e293b', color: '#fff' }}>B.Sc. Mathematics</option>
                    <option value="B.Sc. Physics" style={{ background: '#1e293b', color: '#fff' }}>B.Sc. Physics</option>
                    <option value="B.Sc. Chemistry" style={{ background: '#1e293b', color: '#fff' }}>B.Sc. Chemistry</option>
                    <option value="B.Com." style={{ background: '#1e293b', color: '#fff' }}>B.Com.</option>
                    <option value="BBA" style={{ background: '#1e293b', color: '#fff' }}>BBA</option>
                    <option value="BA" style={{ background: '#1e293b', color: '#fff' }}>BA</option>
                    <option value="Other Degree Department" style={{ background: '#1e293b', color: '#fff' }}>Other Degree Department</option>
                  </optgroup>
                ) : (
                  <optgroup label="B.Tech / Engineering Departments" style={{ background: '#0f172a', color: '#38bdf8', fontWeight: 600 }}>
                    <option value="CSE — Computer Science and Engineering" style={{ background: '#1e293b', color: '#fff' }}>CSE — Computer Science and Engineering</option>
                    <option value="CSE (AI & ML)" style={{ background: '#1e293b', color: '#fff' }}>CSE (AI & ML)</option>
                    <option value="CSE (Data Science)" style={{ background: '#1e293b', color: '#fff' }}>CSE (Data Science)</option>
                    <option value="CSE (Cyber Security)" style={{ background: '#1e293b', color: '#fff' }}>CSE (Cyber Security)</option>
                    <option value="CSE (IoT)" style={{ background: '#1e293b', color: '#fff' }}>CSE (IoT)</option>
                    <option value="IT — Information Technology" style={{ background: '#1e293b', color: '#fff' }}>IT — Information Technology</option>
                    <option value="ECE — Electronics and Communication Engineering" style={{ background: '#1e293b', color: '#fff' }}>ECE — Electronics and Communication Engineering</option>
                    <option value="EEE — Electrical and Electronics Engineering" style={{ background: '#1e293b', color: '#fff' }}>EEE — Electrical and Electronics Engineering</option>
                    <option value="EIE — Electronics and Instrumentation Engineering" style={{ background: '#1e293b', color: '#fff' }}>EIE — Electronics and Instrumentation Engineering</option>
                    <option value="Mechanical Engineering" style={{ background: '#1e293b', color: '#fff' }}>Mechanical Engineering</option>
                    <option value="Civil Engineering" style={{ background: '#1e293b', color: '#fff' }}>Civil Engineering</option>
                    <option value="Chemical Engineering" style={{ background: '#1e293b', color: '#fff' }}>Chemical Engineering</option>
                    <option value="Agricultural Engineering" style={{ background: '#1e293b', color: '#fff' }}>Agricultural Engineering</option>
                    <option value="Biotechnology" style={{ background: '#1e293b', color: '#fff' }}>Biotechnology</option>
                    <option value="Aerospace Engineering" style={{ background: '#1e293b', color: '#fff' }}>Aerospace Engineering</option>
                    <option value="Automobile Engineering" style={{ background: '#1e293b', color: '#fff' }}>Automobile Engineering</option>
                    <option value="Mechatronics" style={{ background: '#1e293b', color: '#fff' }}>Mechatronics</option>
                    <option value="Artificial Intelligence and Data Science" style={{ background: '#1e293b', color: '#fff' }}>Artificial Intelligence and Data Science</option>
                    <option value="Other Engineering Department" style={{ background: '#1e293b', color: '#fff' }}>Other Engineering Department</option>
                  </optgroup>
                )}
              </select>
            </div>
          ) : (
            <input 
              type="text" 
              name="department" 
              placeholder="Department / Office" 
              className="input-field" 
              value={formData.department} 
              onChange={handleChange} 
              required 
            />
          )}

          {formData.role === 'STUDENT' && (
            <div style={{ position: 'relative' }}>
              <select
                name="academicYear"
                className="input-field"
                style={{
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  appearance: 'none',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: formData.academicYear ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
                value={formData.academicYear}
                onChange={handleChange}
                required
              >
                <option value="" disabled style={{ background: '#0f172a', color: '#94a3b8' }}>Select Academic Year...</option>
                <option value="1st Year" style={{ background: '#1e293b', color: '#fff' }}>Year 1 (1st Year)</option>
                <option value="2nd Year" style={{ background: '#1e293b', color: '#fff' }}>Year 2 (2nd Year)</option>
                <option value="3rd Year" style={{ background: '#1e293b', color: '#fff' }}>Year 3 (3rd Year)</option>
                <option value="4th Year" style={{ background: '#1e293b', color: '#fff' }}>Year 4 (4th Year)</option>
              </select>
            </div>
          )}

          {formData.role !== 'STUDENT' && (
            <div style={{ padding: '10px 14px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', color: '#f59e0b', fontSize: '0.85rem' }}>
              ℹ️ Staff requests require verification and approval by an authorized campus administrator.
            </div>
          )}

          {/* Required Consent and Safety Policy Verification */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '4px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              id="consent-check"
              name="consent"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={{ marginTop: '3px', cursor: 'pointer' }}
            />
            <label htmlFor="consent-check" style={{ cursor: 'pointer', lineHeight: '1.4' }}>
              I agree to the <a href="/privacy" target="_blank" style={{ color: 'var(--accent-purple)' }}>Campus Safety Terms &amp; Privacy Policy</a> and certify that my registration details are accurate.
            </label>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '12px', height: '46px', fontSize: '1rem', fontWeight: 600 }}>
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : (formData.role === 'STUDENT' ? 'Create account' : 'Submit access request')}
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
          Already registered? <a href="/login" id="link-to-login" style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>Sign In</a>
        </div>
      </motion.div>
    </div>
  );
}
