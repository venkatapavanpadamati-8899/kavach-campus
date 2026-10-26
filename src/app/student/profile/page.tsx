"use client";
import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Save, 
  ShieldCheck, 
  CreditCard, 
  Clock,
  UploadCloud
} from 'lucide-react';
import Link from 'next/link';
import { getActiveCollegeTenant } from '@/lib/college-branding';

export default function StudentProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTenant, setActiveTenant] = useState(getActiveCollegeTenant());

  const [formData, setFormData] = useState({
    fullName: '',
    studentId: '',
    collegeEmail: '',
    department: '',
    bloodGroup: 'O+',
    phone: '',
    medicalConditions: '',
    residenceType: 'COLLEGE_HOSTEL' as 'COLLEGE_HOSTEL' | 'PRIVATE_HOSTEL' | 'DAY_SCHOLAR',
    hostelName: '',
    hostelRoom: '',
    pgName: '',
    pgAddress: '',
    guardianPhone: '',
    course: 'B.Tech',
    verificationStatus: 'PENDING_UPLOAD',
    idCardUrl: '',
    admissionType: 'REGULAR',
    admissionYear: '2024',
    expectedGraduationYear: '2028',
  });
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kavach_student_profile_photo');
      if (saved) setProfilePhotoUrl(saved);
    }
  }, []);

  useEffect(() => {
    setActiveTenant(getActiveCollegeTenant());
    async function fetchProfile() {
      try {
        const res = await fetch('/api/student/profile');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            const rawType = data.residence?.residence_type 
              || (data.studentProfile?.hostel_room?.toLowerCase().includes('day scholar') 
                ? 'DAY_SCHOLAR' 
                : (data.studentProfile?.hostel_room?.toLowerCase().includes('pg') ? 'PRIVATE_HOSTEL' : 'COLLEGE_HOSTEL'));

            setFormData({
              fullName: data.profile?.full_name || '',
              studentId: data.profile?.student_id || '',
              collegeEmail: data.profile?.college_email || '',
              department: data.profile?.department || '',
              bloodGroup: data.studentProfile?.blood_group || 'O+',
              phone: data.profile?.phone || '',
              medicalConditions: data.studentProfile?.medical_conditions || '',
              residenceType: (['COLLEGE_HOSTEL', 'PRIVATE_HOSTEL', 'DAY_SCHOLAR'].includes(rawType) ? rawType : 'COLLEGE_HOSTEL') as 'COLLEGE_HOSTEL' | 'PRIVATE_HOSTEL' | 'DAY_SCHOLAR',
              hostelName: data.residence?.hostel_name || '',
              hostelRoom: data.residence?.room_number || data.studentProfile?.hostel_room || '',
              pgName: data.residence?.pg_name || '',
              pgAddress: data.residence?.pg_address || '',
              guardianPhone: data.residence?.guardian_contact_phone || '',
              course: data.studentProfile?.course || 'B.Tech',
              verificationStatus: data.studentProfile?.verification_status || 'PENDING_UPLOAD',
              idCardUrl: data.studentProfile?.id_card_url || '',
              admissionType: data.studentProfile?.admission_type || 'REGULAR',
              admissionYear: data.studentProfile?.admission_year || '2024',
              expectedGraduationYear: data.studentProfile?.expected_graduation_year || '2028',
            });
          }
        }
      } catch (err) {
        console.error('Failed to load student profile:', err);
        setErrorMsg('Failed to load profile details. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bloodGroup: formData.bloodGroup,
          medicalConditions: formData.medicalConditions,
          hostelRoom: formData.residenceType === 'COLLEGE_HOSTEL' ? formData.hostelRoom : (formData.residenceType === 'PRIVATE_HOSTEL' ? (formData.pgName ? `Private PG: ${formData.pgName}` : 'Private Hostel') : 'Day Scholar'),
          course: formData.course,
          phone: formData.phone,
          residenceType: formData.residenceType,
          hostelName: formData.hostelName,
          pgName: formData.pgName,
          pgAddress: formData.pgAddress,
          guardianContactPhone: formData.guardianPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setSuccessMsg('Your health and security profile has been saved successfully.');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '850px', margin: '60px auto', textAlign: 'center' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-blue)', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading student profile and verification credentials...</p>
      </div>
    );
  }

  const isVerified = formData.verificationStatus === 'VERIFIED';

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Header Profile Identity Banner */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '28px 32px', 
          borderRadius: '20px', 
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(59, 130, 246, 0.12) 100%)',
          border: '1px solid rgba(124, 58, 237, 0.25)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Profile Photo / Avatar with ID Card Photo Support */}
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            fontWeight: 700,
            color: '#fff',
            boxShadow: '0 0 20px rgba(124, 58, 237, 0.4)',
            border: '2px solid rgba(255, 255, 255, 0.25)',
            position: 'relative'
          }}>
            {profilePhotoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img 
                src={profilePhotoUrl} 
                alt={formData.fullName || 'Student Profile'} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              formData.fullName ? formData.fullName.charAt(0).toUpperCase() : 'S'
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>
                {formData.fullName || 'Student Profile'}
              </h1>
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              {activeTenant.shortName} • {formData.course} ({formData.department || 'General'})
            </p>
            <div style={{ marginTop: '6px', fontSize: '0.85rem', color: 'var(--accent-purple)', fontWeight: 600 }}>
              Roll No: {formData.studentId || 'Pending ID Upload'}
            </div>
          </div>
        </div>

        {/* Verification Status Pill */}
        <div style={{
          padding: '8px 16px',
          borderRadius: '20px',
          background: isVerified ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          border: `1px solid ${isVerified ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          color: isVerified ? 'var(--accent-green)' : '#f59e0b',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 600,
          fontSize: '0.9rem'
        }}>
          {isVerified ? <ShieldCheck size={18} /> : <Clock size={18} />}
          <span>{isVerified ? 'ID Card Verified' : 'Verification Required'}</span>
        </div>
      </div>

      {successMsg && (
        <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <CheckCircle size={20} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Institutional ID Card Showcase Section */}
      <div className="glass-panel" style={{ padding: '28px', borderRadius: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.3rem', margin: 0 }}>
            <CreditCard color="var(--accent-purple)" size={22} />
            Institutional Student ID Card
          </h2>
          <Link href="/student/verification-status">
            <button className="btn-secondary" style={{ fontSize: '0.85rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UploadCloud size={14} /> Update ID Card
            </button>
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'center' }}>
          {/* ID Card Image Preview */}
          <div style={{
            position: 'relative',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '2px solid rgba(255, 255, 255, 0.1)',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
            padding: '16px',
            minHeight: '180px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)'
          }}>
            {formData.idCardUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img 
                src={formData.idCardUrl.startsWith('http') || formData.idCardUrl.startsWith('data:') 
                  ? formData.idCardUrl 
                  : `https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80`} 
                alt="Uploaded Student ID Card" 
                style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '8px' }} 
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-secondary)' }}>
                <CreditCard size={42} style={{ margin: '0 auto 8px auto', opacity: 0.6 }} />
                <div style={{ fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Official College ID Document</div>
                <div style={{ fontSize: '0.8rem' }}>Uploaded credentials verified against {activeTenant.shortName} database</div>
                <div style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--accent-purple)', fontWeight: 600 }}>
                  10-Digit ID: {formData.studentId || '2101201045'}
                </div>
              </div>
            )}
          </div>

          {/* ID Verification Details */}
          <div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Institution Tenant</div>
              <strong style={{ fontSize: '1.05rem', color: '#fff' }}>{activeTenant.name}</strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Academic Program</div>
                <div style={{ fontWeight: 600 }}>{formData.course} ({formData.admissionType})</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Batch Years</div>
                <div style={{ fontWeight: 600 }}>{formData.admissionYear} - {formData.expectedGraduationYear}</div>
              </div>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              🔒 Document is stored confidentially under institutional encryption for verification.
            </div>
          </div>
        </div>
      </div>

      {/* Medical & Campus Residence Information Form */}
      <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '28px', borderRadius: '16px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', fontSize: '1.3rem' }}>
            <Activity color="var(--accent-red)" size={22} /> Emergency Medical Profile &amp; Campus Residence
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Blood Group *</label>
              <select 
                className="input-field" 
                value={formData.bloodGroup}
                onChange={e => setFormData({ ...formData, bloodGroup: e.target.value })}
                style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', borderRadius: '8px' }}
              >
                {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                  <option key={bg} value={bg} style={{ background: '#0f172a' }}>{bg}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Emergency Contact Phone</label>
              <input 
                type="tel" 
                className="input-field" 
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                style={{ borderRadius: '8px' }}
              />
            </div>
          </div>

          {/* Student Accommodation Status & Residential Details */}
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '14px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Accommodation Status *
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, residenceType: 'COLLEGE_HOSTEL' })}
                className={formData.residenceType === 'COLLEGE_HOSTEL' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '12px 14px', textAlign: 'left', borderRadius: '10px' }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>College Hostel</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>On-Campus Hostel Resident</div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, residenceType: 'PRIVATE_HOSTEL' })}
                className={formData.residenceType === 'PRIVATE_HOSTEL' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '12px 14px', textAlign: 'left', borderRadius: '10px' }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Private Hostel / PG</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Off-Campus Paying Guest</div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, residenceType: 'DAY_SCHOLAR' })}
                className={formData.residenceType === 'DAY_SCHOLAR' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '12px 14px', textAlign: 'left', borderRadius: '10px' }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Day Scholar</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Daily Commuter / Living with Family</div>
              </button>
            </div>

            {/* Conditionally Rendered Residential Fields */}
            {formData.residenceType === 'COLLEGE_HOSTEL' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Hostel Block / Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Kaveri Hostel Block A"
                    value={formData.hostelName}
                    onChange={e => setFormData({ ...formData, hostelName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Room Number *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Room 204"
                    value={formData.hostelRoom}
                    onChange={e => setFormData({ ...formData, hostelRoom: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}

            {formData.residenceType === 'PRIVATE_HOSTEL' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Private Hostel / PG Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Sri Sai Balaji PG"
                    value={formData.pgName}
                    onChange={e => setFormData({ ...formData, pgName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>PG Address / Area *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Kovvali Road, Bhimavaram"
                    value={formData.pgAddress}
                    onChange={e => setFormData({ ...formData, pgAddress: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}

            {formData.residenceType === 'DAY_SCHOLAR' && (
              <div style={{ padding: '14px 18px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px', marginBottom: '16px', color: '#6ee7b7', fontSize: '0.88rem' }}>
                ✓ <strong>Day Scholar Confirmed:</strong> You commute daily from home. No hostel block or room allocation details are required.
              </div>
            )}

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Guardian / Parent Emergency Contact Phone
              </label>
              <input
                type="tel"
                className="input-field"
                placeholder="+91 98765 43210 (Parent / Local Guardian)"
                value={formData.guardianPhone}
                onChange={e => setFormData({ ...formData, guardianPhone: e.target.value })}
                style={{ borderRadius: '8px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Medical Conditions, Chronic Illnesses &amp; Severe Allergies
            </label>
            <textarea 
              className="input-field" 
              style={{ minHeight: '100px', resize: 'vertical', borderRadius: '8px' }} 
              placeholder="e.g. Asthmatic (inhaler in backpack), Allergic to Penicillin and Peanuts. Type 1 Diabetic."
              value={formData.medicalConditions}
              onChange={e => setFormData({ ...formData, medicalConditions: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={saving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', fontSize: '1rem', borderRadius: '10px' }}
          >
            {saving ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={18} />}
            {saving ? 'Saving Updates...' : 'Save Profile Updates'}
          </button>
        </div>
      </form>
    </div>
  );
}
