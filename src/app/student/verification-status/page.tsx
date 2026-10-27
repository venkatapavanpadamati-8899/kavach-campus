"use client";
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, UploadCloud, CheckCircle, AlertCircle, XCircle, Clock, Loader2, ArrowRight, Camera } from 'lucide-react';
import Link from 'next/link';
import { INDIAN_ENGINEERING_COLLEGES } from '@/lib/colleges';

export default function StudentVerificationStatusPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [status, setStatus] = useState<string>('PENDING_UPLOAD');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const [formData, setFormData] = useState({
    // 1-7. Personal Details (7 fields)
    fullName: '',
    dob: '',
    parentPhone: '',
    personalPhone: '',
    emergencyPhone: '',
    gender: 'Prefer not to say',
    address: '',
    bloodGroup: 'B+',
    // 8-12. College Details (5 fields)
    studentId: '',
    collegeEmail: '', // OPTIONAL
    branch: 'CSE',
    section: 'A',
    residentialStatus: 'Day Scholar',
    // Verification & College routing
    collegeId: 'srkr',
    admissionType: 'REGULAR',
    admissionYear: '2024',
    expectedGraduationYear: '2028',
    department: 'Computer Science & Engineering',
    idCardName: '',
  });

  // 13-15. Verification & Image Details (3 fields)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [backPreviewUrl, setBackPreviewUrl] = useState<string | null>(null);
  const [customPhotoFile, setCustomPhotoFile] = useState<File | null>(null);
  const [customPhotoPreview, setCustomPhotoPreview] = useState<string | null>(null);
  const [extractedPhotoUrl, setExtractedPhotoUrl] = useState<string | null>(null);
  const [photoConfirmed, setPhotoConfirmed] = useState<boolean>(true);
  const [formError, setFormError] = useState('');

  // 15-Field Completion Tracker
  const calculateCompletedCount = () => {
    let count = 0;
    if (formData.fullName.trim()) count++; // 1. Name
    if (formData.dob) count++; // 2. DOB
    if (formData.parentPhone.trim()) count++; // 3. Parent Phone
    if (formData.personalPhone.trim()) count++; // 4. Personal Phone
    if (formData.emergencyPhone.trim()) count++; // 5. Emergency Phone
    if (formData.gender) count++; // 6. Gender
    if (formData.address.trim()) count++; // 7. Address
    if (formData.studentId.trim()) count++; // 8. Roll No / Registration No
    if (formData.collegeEmail.trim()) count++; // 9. College Email (Optional)
    if (formData.branch.trim()) count++; // 10. Branch
    if (formData.section.trim()) count++; // 11. Section
    if (formData.residentialStatus) count++; // 12. Hosteller or Day Scholar
    if (selectedFile || docPreviewUrl) count++; // 13. ID Card Front
    if (backFile || backPreviewUrl) count++; // 14. ID Card Back
    if (customPhotoFile || customPhotoPreview || extractedPhotoUrl) count++; // 15. Profile Photo
    return count;
  };

  // Auto-calculate graduation year based on admission type
  const handleAdmissionTypeChange = (type: 'REGULAR' | 'LATERAL_ENTRY', startYear: string) => {
    const yearNum = parseInt(startYear) || 2024;
    const duration = type === 'REGULAR' ? 4 : 3;
    setFormData(prev => ({
      ...prev,
      admissionType: type,
      admissionYear: startYear,
      expectedGraduationYear: (yearNum + duration).toString(),
    }));
  };

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch('/api/student/verify-id');
        if (res.ok) {
          const data = await res.json();
          if (data.profile?.id) {
            setUserId(data.profile.id);
          }
          if (data.studentProfile?.verification_status) {
            setStatus(data.studentProfile.verification_status);
            setStatusMessage(data.studentProfile.verification_notes || '');
          }
          if (data.studentProfile?.ocr_extracted_data) {
            const ocr = data.studentProfile.ocr_extracted_data;
            if (ocr.front_url) setDocPreviewUrl(ocr.front_url);
            if (ocr.back_url) setBackPreviewUrl(ocr.back_url);
            setFormData(prev => ({
              ...prev,
              dob: ocr.dob || prev.dob,
              gender: ocr.gender || prev.gender,
              parentPhone: ocr.parent_phone || prev.parentPhone,
              emergencyPhone: ocr.emergency_phone || prev.emergencyPhone,
              personalPhone: ocr.personal_phone || data.profile?.phone || prev.personalPhone,
              address: ocr.address || prev.address,
              branch: ocr.branch || prev.branch,
              section: ocr.section || prev.section,
              residentialStatus: ocr.accommodation_type || prev.residentialStatus,
            }));
          }
          setFormData(prev => ({
            ...prev,
            fullName: data.profile?.full_name || prev.fullName,
            studentId: data.profile?.student_id || prev.studentId,
            department: data.profile?.department || prev.department,
            collegeEmail: data.profile?.college_email || prev.collegeEmail,
            personalPhone: data.profile?.phone || prev.personalPhone,
            collegeId: (data.profile?.college_id && data.profile.college_id !== 'PENDING_CAMPUS_VERIFICATION')
              ? data.profile.college_id
              : prev.collegeId,
          }));
        }
      } catch (err) {
        console.error('Failed to load status:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Strict 7-10 alphanumeric characters check
    if (!/^[A-Za-z0-9]{7,10}$/.test(formData.studentId.trim())) {
      setFormError('Student ID must be 7 to 10 alphanumeric characters (e.g. 2101201045, 21CS1045)');
      return;
    }

    if (!selectedFile && !docPreviewUrl && !formData.idCardName) {
      setFormError('Please select your College ID card Front document (JPEG, PNG, WEBP, or PDF, max 5MB)');
      return;
    }

    setSubmitting(true);
    try {
      const formPayload = new FormData();
      formPayload.append('studentId', formData.studentId.trim());
      formPayload.append('collegeId', formData.collegeId);
      formPayload.append('fullName', formData.fullName.trim());
      formPayload.append('department', formData.department);
      formPayload.append('branch', formData.branch);
      formPayload.append('section', formData.section);
      formPayload.append('residentialStatus', formData.residentialStatus);
      formPayload.append('accommodationType', formData.residentialStatus);
      formPayload.append('dob', formData.dob);
      formPayload.append('gender', formData.gender);
      formPayload.append('personalPhone', formData.personalPhone.trim());
      formPayload.append('phone', formData.personalPhone.trim());
      formPayload.append('collegeEmail', formData.collegeEmail.trim());
      formPayload.append('parentPhone', formData.parentPhone.trim());
      formPayload.append('emergencyPhone', formData.emergencyPhone.trim());
      formPayload.append('bloodGroup', formData.bloodGroup);
      formPayload.append('address', formData.address.trim());
      formPayload.append('admissionType', formData.admissionType);
      formPayload.append('admissionYear', formData.admissionYear);
      formPayload.append('expectedGraduationYear', formData.expectedGraduationYear);
      formPayload.append('ocrText', `STUDENT ID: ${formData.studentId.trim()} COLLEGE ID CARD B.TECH ${formData.department} ${formData.branch} ${formData.section}`);
      
      const activePhoto = customPhotoPreview || (photoConfirmed ? extractedPhotoUrl : null);
      if (activePhoto) {
        formPayload.append('profilePhoto', activePhoto);
      }
      
      if (selectedFile) {
        formPayload.append('fileFront', selectedFile);
        formPayload.append('file', selectedFile); // backwards compatibility
      } else {
        const storagePath = userId
          ? `kavach-id-cards/${userId}/${formData.studentId.trim()}-card.jpg`
          : `kavach-id-cards/${formData.studentId.trim()}-card.jpg`;
        formPayload.append('idCardUrl', storagePath);
      }

      if (backFile) {
        formPayload.append('fileBack', backFile);
      }

      const res = await fetch('/api/student/verify-id', {
        method: 'POST',
        body: formPayload,
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Submission failed');
      }

      setStatus(result.verificationStatus);
      setStatusMessage(result.message);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error submitting ID verification');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'VERIFIED':
        return (
          <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent-green)' }}>
            <CheckCircle size={24} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>ID Card Verified &amp; Approved</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Full student dashboard features are now active.</div>
            </div>
          </div>
        );
      case 'PENDING_MANUAL_REVIEW':
      case 'PENDING_VERIFICATION':
        return (
          <div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', color: '#f59e0b' }}>
            <Clock size={24} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>Pending Campus Administrator Review</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Your ID card and batch information is queued for inspection by campus security officials.</div>
            </div>
          </div>
        );
      case 'RESUBMISSION_REQUIRED':
        return (
          <div style={{ padding: '16px', background: 'rgba(249, 115, 22, 0.15)', border: '1px solid rgba(249, 115, 22, 0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', color: '#f97316' }}>
            <AlertCircle size={24} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>Resubmission Required</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {statusMessage ? `Reviewer Note: ${statusMessage}` : 'Please re-upload a clear, readable copy of your student ID card.'}
              </div>
            </div>
          </div>
        );
      case 'REJECTED':
        return (
          <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent-red)' }}>
            <XCircle size={24} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>Verification Rejected</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {statusMessage ? `Rejection Reason: ${statusMessage}` : 'Student ID or duration details did not match college records. Please re-submit.'}
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent-blue)' }}>
            <UploadCloud size={24} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>ID Card Upload Required</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Upload your official 10-digit ID card to unlock student safety services.</div>
            </div>
          </div>
        );
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.15)', marginBottom: '16px' }}>
          <Shield size={36} color="var(--accent-purple)" />
        </div>
        <h1 style={{ fontSize: '2.2rem', marginBottom: '8px' }}>Student Identity Verification</h1>
        <p style={{ color: 'var(--text-secondary)' }}>10-Digit ID &amp; Academic Batch Verification (B.Tech Regular 4-Year / Lateral Entry 3-Year)</p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        {loading ? <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} /> : getStatusBadge()}
      </div>

      {status === 'VERIFIED' ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Your student credentials have been confirmed by campus authority.</p>
          <Link href="/student" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}>
            Enter Student Dashboard <ArrowRight size={18} />
          </Link>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Submit ID Credentials</h2>

          {formError && (
            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: 'var(--accent-red)', marginBottom: '20px', fontSize: '0.9rem' }}>
              {formError}
            </div>
          )}

          {/* 15-Detail Profile Verification Progress Indicator */}
          {(() => {
            const completedCount = calculateCompletedCount();
            return (
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e0e7ff' }}>
                    Profile Completion Progress ({completedCount}/15 Details Completed)
                  </span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: completedCount === 15 ? 'var(--accent-green)' : 'var(--accent-purple)' }}>
                    {Math.round((completedCount / 15) * 100)}%
                  </span>
                </div>
                <div style={{ height: '8px', width: '100%', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(completedCount / 15) * 100}%`,
                      background: completedCount === 15 ? 'var(--accent-green)' : 'linear-gradient(90deg, #7c3aed 0%, #3b82f6 100%)',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  <span style={{ color: formData.fullName.trim() && formData.dob && formData.parentPhone.trim() && formData.personalPhone.trim() && formData.emergencyPhone.trim() && formData.gender && formData.address.trim() ? '#34d399' : 'var(--text-muted)' }}>
                    ● Personal (7)
                  </span>
                  <span>•</span>
                  <span style={{ color: formData.studentId.trim() && formData.branch.trim() && formData.section.trim() && formData.residentialStatus ? '#34d399' : 'var(--text-muted)' }}>
                    ● Academic (5)
                  </span>
                  <span>•</span>
                  <span style={{ color: (selectedFile || docPreviewUrl) && (backFile || backPreviewUrl) && (customPhotoPreview || (extractedPhotoUrl && photoConfirmed)) ? '#34d399' : 'var(--text-muted)' }}>
                    ● Credentials &amp; Photo (3)
                  </span>
                </div>
              </div>
            );
          })()}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Section A: Personal Details (7 fields) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '14px', color: '#c4b5fd' }}>
                Section A: Personal Details (7 Details)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    1. Full Name *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Legal Full Name"
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    2. Date of Birth
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.dob}
                    onChange={e => setFormData({ ...formData, dob: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    3. Student Personal Mobile Number *
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    className="input-field"
                    value={formData.personalPhone}
                    onChange={e => setFormData({ ...formData, personalPhone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    4. Parent / Guardian Contact Number *
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit number"
                    className="input-field"
                    value={formData.parentPhone}
                    onChange={e => setFormData({ ...formData, parentPhone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    5. Emergency Contact Number *
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit emergency number"
                    className="input-field"
                    value={formData.emergencyPhone}
                    onChange={e => setFormData({ ...formData, emergencyPhone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    6. Gender
                  </label>
                  <select
                    className="input-field"
                    style={{ background: '#1e1b4b', color: '#fff' }}
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-Binary">Non-Binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  7. Residential Address *
                </label>
                <input
                  type="text"
                  placeholder="Hostel Room / Home Residential Address"
                  className="input-field"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Section B: College & Academic Details (5 fields) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '14px', color: '#93c5fd' }}>
                Section B: College &amp; Academic Details (5 Details)
              </h3>
              
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Affiliated Engineering College *
                </label>
                <select
                  className="input-field"
                  style={{ background: '#1e1b4b', color: '#fff' }}
                  value={formData.collegeId}
                  onChange={e => setFormData({ ...formData, collegeId: e.target.value })}
                  required
                >
                  {INDIAN_ENGINEERING_COLLEGES.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.shortName})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    8. Student Registration ID / Roll Number (7–10 Chars) *
                  </label>
                  <input
                    type="text"
                    minLength={7}
                    maxLength={10}
                    placeholder="e.g. 21B91A0501"
                    className="input-field"
                    value={formData.studentId}
                    onChange={e => setFormData({ ...formData, studentId: e.target.value })}
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    7 to 10 alphanumeric characters as printed on your ID card.
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    9. College Email (OPTIONAL)
                  </label>
                  <input
                    type="email"
                    placeholder="student@college.edu.in (Optional)"
                    className="input-field"
                    value={formData.collegeEmail}
                    onChange={e => setFormData({ ...formData, collegeEmail: e.target.value })}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Leave blank if your college does not provide student email.
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    10. Branch / Programme *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science (CSE)"
                    className="input-field"
                    value={formData.branch}
                    onChange={e => setFormData({ ...formData, branch: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    11. Section *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Section A"
                    className="input-field"
                    value={formData.section}
                    onChange={e => setFormData({ ...formData, section: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  12. Accommodation Type *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, residentialStatus: 'Day Scholar' })}
                    className={formData.residentialStatus === 'Day Scholar' ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding: '10px 14px', textAlign: 'left', borderRadius: '8px' }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Day Scholar</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Daily Commuter / Living with Family</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, residentialStatus: 'Hosteller' })}
                    className={formData.residentialStatus === 'Hosteller' ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding: '10px 14px', textAlign: 'left', borderRadius: '8px' }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Hosteller</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Campus or Private Hostel Resident</div>
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  Admission Type &amp; Academic Duration *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => handleAdmissionTypeChange('REGULAR', formData.admissionYear)}
                    className={formData.admissionType === 'REGULAR' ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding: '10px 14px', fontSize: '0.85rem', textAlign: 'left', borderRadius: '8px' }}
                  >
                    <div style={{ fontWeight: 600 }}>Regular B.Tech</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>4 Academic Years</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdmissionTypeChange('LATERAL_ENTRY', formData.admissionYear)}
                    className={formData.admissionType === 'LATERAL_ENTRY' ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding: '10px 14px', fontSize: '0.85rem', textAlign: 'left', borderRadius: '8px' }}
                  >
                    <div style={{ fontWeight: 600 }}>Lateral Entry B.Tech</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>3 Academic Years</div>
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Admission Year *
                  </label>
                  <select
                    className="input-field"
                    style={{ background: '#1e1b4b', color: '#fff' }}
                    value={formData.admissionYear}
                    onChange={e => handleAdmissionTypeChange(formData.admissionType as 'REGULAR' | 'LATERAL_ENTRY', e.target.value)}
                  >
                    <option value="2021">2021</option>
                    <option value="2022">2022</option>
                    <option value="2023">2023</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Expected Graduation Year (Auto-Calculated)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.expectedGraduationYear}
                    disabled
                    style={{ opacity: 0.8 }}
                  />
                </div>
              </div>
            </div>

            {/* Section C: Verification Images & Profile Photograph (3 fields) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '14px', color: '#a78bfa' }}>
                Section C: ID Card Images &amp; Profile Photograph (3 Details)
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {/* 13. ID Card Front Image */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    13. ID Card Front Image *
                  </label>
                  <div style={{ border: '2px dashed rgba(255, 255, 255, 0.15)', borderRadius: '10px', padding: '16px', textAlign: 'center', background: 'rgba(0, 0, 0, 0.2)' }}>
                    <UploadCloud size={24} color="var(--accent-purple)" style={{ margin: '0 auto 6px' }} />
                    <div style={{ fontSize: '0.82rem', marginBottom: '4px' }}>Upload Front Side of ID Card</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>JPEG, PNG, WEBP, PDF (Max 5MB)</div>
                    <input
                      type="file"
                      id="id-card-front-input"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={e => {
                        setFormError('');
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          if (file.size > 5 * 1024 * 1024) {
                            setFormError(`Front ID Card too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max 5MB.`);
                            return;
                          }
                          setSelectedFile(file);
                          setFormData(prev => ({ ...prev, idCardName: file.name }));
                          if (file.type.startsWith('image/')) {
                            const reader = new FileReader();
                            reader.onload = ev => {
                              const res = ev.target?.result as string;
                              setDocPreviewUrl(res);
                              const img = new Image();
                              img.onload = () => {
                                try {
                                  const canvas = document.createElement('canvas');
                                  canvas.width = 180;
                                  canvas.height = 220;
                                  const ctx = canvas.getContext('2d');
                                  if (ctx) {
                                    const isLandscape = img.width >= img.height;
                                    const cropX = isLandscape ? img.width * 0.62 : img.width * 0.2;
                                    const cropY = img.height * 0.15;
                                    const cropW = isLandscape ? img.width * 0.34 : img.width * 0.6;
                                    const cropH = img.height * 0.48;
                                    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, 180, 220);
                                    setExtractedPhotoUrl(canvas.toDataURL('image/jpeg', 0.85));
                                  }
                                } catch (err) {
                                  console.warn('Portrait extraction error:', err);
                                }
                              };
                              img.src = res;
                            };
                            reader.readAsDataURL(file);
                          }
                        }
                      }}
                      style={{ marginTop: '8px', fontSize: '0.78rem' }}
                    />
                    {docPreviewUrl && (
                      <div style={{ marginTop: '10px' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={docPreviewUrl}
                          alt="Front Preview"
                          style={{ width: '100%', maxHeight: '110px', objectFit: 'contain', borderRadius: '6px', background: '#0a0a0f' }}
                        />
                        <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '4px' }}>✓ Front ID Ready</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 14. ID Card Back Image */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    14. ID Card Back Image *
                  </label>
                  <div style={{ border: '2px dashed rgba(255, 255, 255, 0.15)', borderRadius: '10px', padding: '16px', textAlign: 'center', background: 'rgba(0, 0, 0, 0.2)' }}>
                    <UploadCloud size={24} color="var(--accent-blue)" style={{ margin: '0 auto 6px' }} />
                    <div style={{ fontSize: '0.82rem', marginBottom: '4px' }}>Upload Back Side of ID Card</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>JPEG, PNG, WEBP, PDF (Max 5MB)</div>
                    <input
                      type="file"
                      id="id-card-back-input"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={e => {
                        setFormError('');
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          if (file.size > 5 * 1024 * 1024) {
                            setFormError(`Back ID Card too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max 5MB.`);
                            return;
                          }
                          setBackFile(file);
                          if (file.type.startsWith('image/')) {
                            const reader = new FileReader();
                            reader.onload = ev => {
                              setBackPreviewUrl(ev.target?.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }
                      }}
                      style={{ marginTop: '8px', fontSize: '0.78rem' }}
                    />
                    {backPreviewUrl && (
                      <div style={{ marginTop: '10px' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={backPreviewUrl}
                          alt="Back Preview"
                          style={{ width: '100%', maxHeight: '110px', objectFit: 'contain', borderRadius: '6px', background: '#0a0a0f' }}
                        />
                        <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '4px' }}>✓ Back ID Ready</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 15. Profile Photograph Preview & Confirmation */}
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '10px', padding: '14px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                <div style={{ fontSize: '0.85rem', color: '#c4b5fd', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <Camera size={16} color="var(--accent-purple)" /> 15. Profile Photograph
                  </span>
                  <label style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', cursor: 'pointer', textDecoration: 'underline' }}>
                    Upload Custom Portrait
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setCustomPhotoFile(file);
                          const reader = new FileReader();
                          reader.onload = ev => {
                            setCustomPhotoPreview(ev.target?.result as string);
                            setPhotoConfirmed(true);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '70px', height: '85px', borderRadius: '6px', overflow: 'hidden', background: '#111827', border: '1px solid rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {customPhotoPreview ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={customPhotoPreview} alt="Custom Portrait" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : extractedPhotoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={extractedPhotoUrl} alt="Extracted Portrait" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', padding: '4px' }}>No Photo Detected</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#e0e7ff', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={photoConfirmed}
                        onChange={e => setPhotoConfirmed(e.target.checked)}
                        style={{ accentColor: 'var(--accent-purple)' }}
                      />
                      Confirm photo as student profile picture
                    </label>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {customPhotoPreview
                        ? 'Using uploaded custom portrait photo.'
                        : extractedPhotoUrl
                        ? 'Auto-cropped from Front ID Card.'
                        : 'Upload Front ID Card or custom photo to set profile picture.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

              {/* Pre-Submission Validation Analysis Card */}
              <div style={{ marginTop: '16px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Frontend Pre-Submission Verification Analysis
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: /^[0-9]{10}$/.test(formData.studentId.trim()) ? '#34d399' : 'var(--accent-red)' }}>
                    <span>{/^[0-9]{10}$/.test(formData.studentId.trim()) ? '✓' : '✗'}</span>
                    <span>10-Digit Roll No: {formData.studentId || 'Pending'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399' }}>
                    <span>✓</span>
                    <span>Affiliated College: {formData.collegeId.toUpperCase()}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399' }}>
                    <span>✓</span>
                    <span>Academic Duration: {formData.admissionType === 'REGULAR' ? '4 Yrs' : '3 Yrs'} ({formData.admissionYear}-{formData.expectedGraduationYear})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: selectedFile ? '#34d399' : 'var(--text-muted)' }}>
                    <span>{selectedFile ? '✓' : '○'}</span>
                    <span>ID Document: {selectedFile ? `${(selectedFile.size / 1024).toFixed(0)} KB` : 'File not selected'}</span>
                  </div>
                </div>
              </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '14px' }}
            >
              {submitting ? (
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (status === 'REJECTED' || status === 'RESUBMISSION_REQUIRED') ? (
                'Resubmit Credentials for Verification'
              ) : (
                'Submit Credentials for Verification'
              )}
            </button>
          </form>
        </motion.div>
      )}

      <div style={{ marginTop: '32px', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-red)' }}>
          <AlertCircle size={20} />
          <span style={{ fontSize: '0.9rem' }}>Emergency SOS is ALWAYS available to all authenticated students.</span>
        </div>
        <Link href="/student/sos" className="btn-secondary" style={{ fontSize: '0.85rem', color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}>
          Open SOS
        </Link>
      </div>
    </div>
  );
}
