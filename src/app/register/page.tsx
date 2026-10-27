"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, User, Briefcase, Loader2, ArrowRight, Phone, CreditCard, GraduationCap, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { validateStudentRegistrationNumber } from '@/lib/verification/id-card';
import { InteractiveSafetyCharacter } from '@/components/animations/InteractiveSafetyCharacter';

// Comprehensive branch-to-department mapping across academic programs
const BRANCH_DEPARTMENT_MAP: Record<string, string> = {
  // Engineering / B.Tech / B.E.
  'CSE': 'Computer Science and Engineering',
  'CSE_AIML': 'CSE (Artificial Intelligence & Machine Learning)',
  'CSE_DS': 'CSE (Data Science)',
  'CSE_CYBER': 'CSE (Cyber Security)',
  'CSE_IOT': 'CSE (Internet of Things)',
  'IT': 'Information Technology',
  'ECE': 'Electronics and Communication Engineering',
  'EEE': 'Electrical and Electronics Engineering',
  'MECH': 'Mechanical Engineering',
  'CIVIL': 'Civil Engineering',
  'CHEM': 'Chemical Engineering',
  'BIOTECH': 'Biotechnology',
  'AGRI': 'Agricultural Engineering',
  'AERO': 'Aerospace Engineering',
  'AUTO': 'Automobile Engineering',
  'MECHATRONICS': 'Mechatronics Engineering',
  // Degree Programs
  'BSC_CS': 'B.Sc. Computer Science',
  'BSC_MATHS': 'B.Sc. Mathematics',
  'BSC_PHYSICS': 'B.Sc. Physics',
  'BSC_CHEM': 'B.Sc. Chemistry',
  'BSC_STATS': 'B.Sc. Statistics',
  'BCOM_GEN': 'B.Com. General',
  'BCOM_CA': 'B.Com. Computer Applications',
  'BCOM_FA': 'B.Com. Finance & Accounting',
  'BBA_GEN': 'Bachelor of Business Administration',
  'BBA_BA': 'BBA Business Analytics',
  'BCA_GEN': 'Bachelor of Computer Applications',
  'BA_GEN': 'Bachelor of Arts',
  // Diploma / Polytechnic
  'DIPLOMA_CSE': 'Diploma in Computer Engineering',
  'DIPLOMA_ECE': 'Diploma in Electronics & Communication',
  'DIPLOMA_EEE': 'Diploma in Electrical & Electronics',
  'DIPLOMA_MECH': 'Diploma in Mechanical Engineering',
  'DIPLOMA_CIVIL': 'Diploma in Civil Engineering',
};

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    guardianPhone: '',
    password: '',
    role: 'STUDENT',
    registrationNumber: '',
    degree: 'B.Tech',
    branch: 'CSE',
    department: 'Computer Science and Engineering',
    section: 'A',
    academicYear: 'Year 1'
  });
  const [customDepartment, setCustomDepartment] = useState('');
  const [consent, setConsent] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [campusVerificationRequired, setCampusVerificationRequired] = useState(false);

  const handleProgramChange = (prog: string) => {
    let defaultBranch = 'CSE';
    if (prog === 'B.Sc.') defaultBranch = 'BSC_CS';
    else if (prog === 'B.Com.') defaultBranch = 'BCOM_GEN';
    else if (prog === 'BBA') defaultBranch = 'BBA_GEN';
    else if (prog === 'BCA') defaultBranch = 'BCA_GEN';
    else if (prog === 'B.A.') defaultBranch = 'BA_GEN';
    else if (prog === 'Diploma') defaultBranch = 'DIPLOMA_CSE';
    else if (prog === 'Other') defaultBranch = 'OTHER';

    const mappedDept = BRANCH_DEPARTMENT_MAP[defaultBranch] || '';
    setFormData(prev => ({
      ...prev,
      degree: prog,
      branch: defaultBranch,
      department: mappedDept,
    }));
  };

  const handleBranchChange = (branchVal: string) => {
    const mappedDept = BRANCH_DEPARTMENT_MAP[branchVal] || (branchVal === 'OTHER' ? customDepartment : branchVal);
    setFormData(prev => ({
      ...prev,
      branch: branchVal,
      department: mappedDept,
    }));
  };

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
      if (!formData.password || formData.password.length < 8) {
        setError('Password must be at least 8 characters long.');
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
          setError(regCheck.error || 'Student Registration Number must be 7 to 10 alphanumeric characters');
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
        if (formData.guardianPhone && !/^[6-9]\d{9}$/.test(formData.guardianPhone.replace(/\D/g, ''))) {
          setError('Please enter a valid 10-digit parent or guardian mobile number.');
          setLoading(false);
          return;
        }
      } else {
        if (!regNumTrimmed || regNumTrimmed.length < 7 || regNumTrimmed.length > 10 || !/^[A-Za-z0-9]{7,10}$/.test(regNumTrimmed)) {
          setError('Staff Employee ID must be 7 to 10 alphanumeric characters');
          setLoading(false);
          return;
        }
      }

      const payload = {
        name: formData.name.trim(),
        email: emailTrimmed.toLowerCase(),
        phone: formData.phone.trim() || undefined,
        guardianPhone: formData.role === 'STUDENT'
          ? formData.guardianPhone.replace(/\D/g, '')
          : undefined,
        password: formData.password,
        role: formData.role,
        degree: formData.role === 'STUDENT' ? formData.degree : undefined,
        department: formData.department.trim(),
        branch: formData.branch?.trim() || undefined,
        section: formData.section?.trim() || undefined,
        academicYear: formData.role === 'STUDENT' ? formData.academicYear : undefined,
        academic_year: formData.role === 'STUDENT' ? formData.academicYear : undefined,
        registrationNumber: regNumTrimmed,
        studentId: regNumTrimmed,
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
        {/* Interactive 3D Safety Shield Character */}
        <InteractiveSafetyCharacter
          isPasswordFocused={isPasswordFocused}
          isInputFocused={isInputFocused}
          isError={!!error}
          isLoading={loading}
          isSuccess={success}
        />

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
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
              Single email field: Institutional or personal email. Campus identity is verified via Student ID card after sign-in.
            </span>
          </div>

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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Password (minimum 8 characters)"
                className="input-field"
                style={{ paddingLeft: '44px', paddingRight: '44px' }}
                value={formData.password}
                onChange={handleChange}
                onFocus={() => {
                  setIsPasswordFocused(true);
                  setIsInputFocused(false);
                }}
                onBlur={() => setIsPasswordFocused(false)}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
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
                  justifyContent: 'center'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', paddingLeft: '4px' }}>
              Minimum 8 characters (letters, numbers, and symbols).
            </span>
          </div>

          {formData.role === 'STUDENT' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ position: 'relative' }}>
                <CreditCard size={18} style={{ position: 'absolute', top: '14px', left: '16px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  name="registrationNumber"
                  placeholder="Student Registration Number (7-10 Characters e.g. 21B91A0501, 21CS1045)"
                  className="input-field"
                  style={{ paddingLeft: '44px', letterSpacing: '0.5px' }}
                  value={formData.registrationNumber}
                  onChange={handleChange}
                  minLength={7}
                  maxLength={10}
                  pattern="[A-Za-z0-9]{7,10}"
                  title="Student Registration Number (7 to 10 alphanumeric characters)"
                  required
                />
              </div>

              {/* Branch and Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <select
                    name="branch"
                    className="input-field"
                    style={{
                      appearance: 'none',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                    value={formData.branch}
                    onChange={(e) => handleBranchChange(e.target.value)}
                    required
                  >
                    <optgroup label="Engineering (B.Tech / B.E.)" style={{ background: '#0f172a', color: '#38bdf8' }}>
                      <option value="CSE" style={{ background: '#1e293b' }}>CSE — Computer Science</option>
                      <option value="CSE_AIML" style={{ background: '#1e293b' }}>CSE (AI &amp; ML)</option>
                      <option value="CSE_DS" style={{ background: '#1e293b' }}>CSE (Data Science)</option>
                      <option value="CSE_CYBER" style={{ background: '#1e293b' }}>CSE (Cyber Security)</option>
                      <option value="CSE_IOT" style={{ background: '#1e293b' }}>CSE (IoT)</option>
                      <option value="IT" style={{ background: '#1e293b' }}>IT — Information Technology</option>
                      <option value="ECE" style={{ background: '#1e293b' }}>ECE — Electronics &amp; Comm.</option>
                      <option value="EEE" style={{ background: '#1e293b' }}>EEE — Electrical &amp; Electronics</option>
                      <option value="MECH" style={{ background: '#1e293b' }}>MECH — Mechanical</option>
                      <option value="CIVIL" style={{ background: '#1e293b' }}>CIVIL — Civil Engineering</option>
                      <option value="CHEM" style={{ background: '#1e293b' }}>CHEM — Chemical</option>
                      <option value="BIOTECH" style={{ background: '#1e293b' }}>BIOTECH — Biotechnology</option>
                      <option value="AGRI" style={{ background: '#1e293b' }}>AGRI — Agricultural</option>
                      <option value="AERO" style={{ background: '#1e293b' }}>AERO — Aerospace</option>
                      <option value="AUTO" style={{ background: '#1e293b' }}>AUTO — Automobile</option>
                    </optgroup>
                    <optgroup label="Degree Programs" style={{ background: '#0f172a', color: '#a855f7' }}>
                      <option value="BSC_CS" style={{ background: '#1e293b' }}>B.Sc. Computer Science</option>
                      <option value="BSC_MATHS" style={{ background: '#1e293b' }}>B.Sc. Mathematics</option>
                      <option value="BSC_PHYSICS" style={{ background: '#1e293b' }}>B.Sc. Physics</option>
                      <option value="BSC_CHEM" style={{ background: '#1e293b' }}>B.Sc. Chemistry</option>
                      <option value="BSC_STATS" style={{ background: '#1e293b' }}>B.Sc. Statistics</option>
                      <option value="BCOM_GEN" style={{ background: '#1e293b' }}>B.Com. General</option>
                      <option value="BCOM_CA" style={{ background: '#1e293b' }}>B.Com. Computer Applications</option>
                      <option value="BBA_GEN" style={{ background: '#1e293b' }}>BBA General</option>
                      <option value="BBA_BA" style={{ background: '#1e293b' }}>BBA Business Analytics</option>
                      <option value="BCA_GEN" style={{ background: '#1e293b' }}>BCA Computer Applications</option>
                      <option value="BA_GEN" style={{ background: '#1e293b' }}>B.A. Arts &amp; Humanities</option>
                    </optgroup>
                    <optgroup label="Diploma / Polytechnic" style={{ background: '#0f172a', color: '#34d399' }}>
                      <option value="DIPLOMA_CSE" style={{ background: '#1e293b' }}>Diploma CSE</option>
                      <option value="DIPLOMA_ECE" style={{ background: '#1e293b' }}>Diploma ECE</option>
                      <option value="DIPLOMA_EEE" style={{ background: '#1e293b' }}>Diploma EEE</option>
                      <option value="DIPLOMA_MECH" style={{ background: '#1e293b' }}>Diploma Mechanical</option>
                      <option value="DIPLOMA_CIVIL" style={{ background: '#1e293b' }}>Diploma Civil</option>
                    </optgroup>
                    <option value="OTHER" style={{ background: '#1e293b' }}>Other Branch...</option>
                  </select>
                </div>
                <input
                  type="text"
                  name="section"
                  placeholder="Section (e.g. A, B, C)"
                  className="input-field"
                  value={formData.section}
                  onChange={handleChange}
                  required
                />
              </div>
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
                placeholder="Staff ID (7-10 Chars)"
                className="input-field"
                value={formData.registrationNumber}
                onChange={handleChange}
                minLength={7}
                maxLength={10}
                pattern="[A-Za-z0-9]{7,10}"
                title="Staff ID must be 7 to 10 alphanumeric characters"
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
                onChange={(e) => handleProgramChange(e.target.value)}
                required
              >
                <option value="B.Tech" style={{ background: '#1e293b', color: '#fff' }}>B.Tech — Bachelor of Technology</option>
                <option value="B.E." style={{ background: '#1e293b', color: '#fff' }}>B.E. — Bachelor of Engineering</option>
                <option value="B.Sc." style={{ background: '#1e293b', color: '#fff' }}>B.Sc. — Bachelor of Science</option>
                <option value="B.Com." style={{ background: '#1e293b', color: '#fff' }}>B.Com. — Bachelor of Commerce</option>
                <option value="B.A." style={{ background: '#1e293b', color: '#fff' }}>B.A. — Bachelor of Arts</option>
                <option value="BBA" style={{ background: '#1e293b', color: '#fff' }}>BBA — Bachelor of Business Admin</option>
                <option value="BCA" style={{ background: '#1e293b', color: '#fff' }}>BCA — Bachelor of Computer Apps</option>
                <option value="Diploma" style={{ background: '#1e293b', color: '#fff' }}>Diploma / Polytechnic</option>
                <option value="Other" style={{ background: '#1e293b', color: '#fff' }}>Other Academic Program</option>
              </select>
            </div>
          )}

          {formData.role === 'STUDENT' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '4px' }}>
                Department (Auto-populated from selected Branch):
              </label>
              {formData.branch === 'OTHER' ? (
                <input
                  type="text"
                  name="department"
                  placeholder="Enter your Department Name"
                  className="input-field"
                  value={formData.department}
                  onChange={(e) => {
                    setCustomDepartment(e.target.value);
                    setFormData({ ...formData, department: e.target.value });
                  }}
                  required
                />
              ) : (
                <input
                  type="text"
                  name="department"
                  readOnly
                  className="input-field"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#93c5fd', cursor: 'not-allowed' }}
                  value={formData.department}
                  required
                />
              )}
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
                <option value="Year 1" style={{ background: '#1e293b', color: '#fff' }}>Year 1 (1st Year)</option>
                <option value="Year 2" style={{ background: '#1e293b', color: '#fff' }}>Year 2 (2nd Year)</option>
                <option value="Year 3" style={{ background: '#1e293b', color: '#fff' }}>Year 3 (3rd Year)</option>
                <option value="Year 4" style={{ background: '#1e293b', color: '#fff' }}>Year 4 (4th Year)</option>
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
