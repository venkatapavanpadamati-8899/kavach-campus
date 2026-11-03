"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Building2, Mail, Phone, Lock, User, Briefcase, FileText, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { CollegeSearchInput } from '@/components/ui/CollegeSearchInput';
import { CollegeTenant } from '@/lib/colleges';

export default function CampusAdminRegisterPage() {
  const router = useRouter();
  const [selectedCollege, setSelectedCollege] = useState<CollegeTenant | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    designation: 'Campus Safety Director',
    employeeId: '',
    collegeAddress: '',
    appointmentNotes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedCollege) {
      setError('Please search and select your affiliated institution / college.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: cleanPhone,
        password: formData.password,
        role: 'STAFF', // Submits initially under staff request, routed to Super Admin / Principal for CAMPUS_ADMIN approval
        collegeId: selectedCollege.id,
        claimedCollegeId: selectedCollege.id,
        department: 'Campus Administration & Safety',
        registrationNumber: formData.employeeId.trim(),
        studentId: formData.employeeId.trim(),
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit Campus Admin request.');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/verify-otp?email=${encodeURIComponent(formData.email.trim().toLowerCase())}`);
      }, 1000);
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : 'An error occurred during submission.'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backgroundImage: "linear-gradient(180deg, rgba(4, 31, 22, 0.75) 0%, rgba(3, 23, 16, 0.90) 100%), url('/images/staff_admin_bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: 'rgba(4, 31, 22, 0.92)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '20px',
            padding: '36px',
            maxWidth: '480px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)'
          }}
        >
          <CheckCircle2 size={52} color="#10b981" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ecfdf5', marginBottom: '8px' }}>
            Campus Admin Request Submitted
          </h2>
          <p style={{ color: '#a7f3d0', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Your administrative registration for <strong>{selectedCollege?.name}</strong> has been logged.
            First-time institutional requests route to Super Admin for verification. Redirecting to verification...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 16px',
      backgroundImage: "linear-gradient(180deg, rgba(4, 31, 22, 0.82) 0%, rgba(3, 23, 16, 0.92) 100%), url('/images/staff_admin_bg.jpg')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'rgba(4, 31, 22, 0.92)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(16, 185, 129, 0.30)',
          borderRadius: '20px',
          padding: '36px',
          maxWidth: '620px',
          width: '100%',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.18)', marginBottom: '12px' }}>
            <Building2 size={32} color="#10b981" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ecfdf5', margin: '0 0 6px 0', letterSpacing: '-0.01em' }}>
            Campus Administrator Registration
          </h1>
          <p style={{ color: '#a7f3d0', fontSize: '0.88rem', margin: 0 }}>
            Request administrative authority to manage student &amp; staff safety for your institution
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#fca5a5',
            fontSize: '0.85rem',
            marginBottom: '20px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ecfdf5', display: 'block', marginBottom: '6px' }}>
              Full Name *
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', top: '14px', left: '14px', color: '#34d399' }} />
              <input
                type="text"
                name="fullName"
                placeholder="e.g. Dr. K. Satyanarayana"
                className="input-field"
                style={{ paddingLeft: '44px' }}
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ecfdf5', display: 'block', marginBottom: '6px' }}>
                Email (Official or Personal) *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', top: '14px', left: '14px', color: '#34d399' }} />
                <input
                  type="email"
                  name="email"
                  placeholder="admin@college.edu or gmail"
                  className="input-field"
                  style={{ paddingLeft: '44px' }}
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ecfdf5', display: 'block', marginBottom: '6px' }}>
                Mobile Number *
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', top: '14px', left: '14px', color: '#34d399' }} />
                <input
                  type="tel"
                  name="phone"
                  placeholder="10-digit mobile"
                  className="input-field"
                  style={{ paddingLeft: '44px' }}
                  value={formData.phone}
                  onChange={handleChange}
                  maxLength={10}
                  required
                />
              </div>
            </div>
          </div>

          {/* Searchable College Selection */}
          <CollegeSearchInput
            selectedCollege={selectedCollege}
            onSelectCollege={(col) => setSelectedCollege(col)}
            required
            label="College / University to Administer"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ecfdf5', display: 'block', marginBottom: '6px' }}>
                Administrative Designation *
              </label>
              <div style={{ position: 'relative' }}>
                <Briefcase size={18} style={{ position: 'absolute', top: '14px', left: '14px', color: '#34d399' }} />
                <select
                  name="designation"
                  className="input-field"
                  style={{ paddingLeft: '44px', appearance: 'none', background: '#041f16', color: '#ecfdf5' }}
                  value={formData.designation}
                  onChange={handleChange}
                  required
                >
                  <option value="Campus Safety Director">Campus Safety Director</option>
                  <option value="Dean of Student Affairs">Dean of Student Affairs</option>
                  <option value="Principal / Provost">Principal / Provost</option>
                  <option value="Chief Security Officer">Chief Security Officer</option>
                  <option value="Administrative Officer">Administrative Officer</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ecfdf5', display: 'block', marginBottom: '6px' }}>
                Employee / Faculty ID *
              </label>
              <div style={{ position: 'relative' }}>
                <FileText size={18} style={{ position: 'absolute', top: '14px', left: '14px', color: '#34d399' }} />
                <input
                  type="text"
                  name="employeeId"
                  placeholder="e.g. ADM1049"
                  className="input-field"
                  style={{ paddingLeft: '44px' }}
                  value={formData.employeeId}
                  onChange={handleChange}
                  minLength={4}
                  maxLength={15}
                  required
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ecfdf5', display: 'block', marginBottom: '6px' }}>
                Password *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', top: '14px', left: '14px', color: '#34d399' }} />
                <input
                  type="password"
                  name="password"
                  placeholder="Min 8 characters"
                  className="input-field"
                  style={{ paddingLeft: '44px' }}
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ecfdf5', display: 'block', marginBottom: '6px' }}>
                Confirm Password *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', top: '14px', left: '14px', color: '#34d399' }} />
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Re-enter password"
                  className="input-field"
                  style={{ paddingLeft: '44px' }}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div style={{
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.10)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            fontSize: '0.8rem',
            color: '#a7f3d0',
            lineHeight: 1.5
          }}>
            🛡️ <strong>Governance Notice:</strong> Campus Administrator access grants safety management for your selected institution. All requests require verification by the Super Admin before authorization is active.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '14px',
              marginTop: '6px',
              fontSize: '1rem',
              fontWeight: 700
            }}
          >
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Submit Campus Admin Request'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.88rem', color: '#a7f3d0' }}>
          Already authorized? <Link href="/admin/login" style={{ color: '#34d399', fontWeight: 700 }}>Administrative Sign In</Link>
        </div>
      </motion.div>
    </div>
  );
}
