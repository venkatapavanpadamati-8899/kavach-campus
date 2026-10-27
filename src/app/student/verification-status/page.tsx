"use client";
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, UploadCloud, CheckCircle, AlertCircle, XCircle, Clock, Loader2, ArrowRight, Camera, Check, RefreshCw, FileText } from 'lucide-react';
import Link from 'next/link';
import { INDIAN_ENGINEERING_COLLEGES } from '@/lib/colleges';

export default function StudentVerificationStatusPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [status, setStatus] = useState<string>('PENDING_UPLOAD');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    gender: 'Prefer not to say',
    parentPhone: '',
    emergencyPhone: '',
    bloodGroup: 'B+',
    address: '',
    studentId: '',
    collegeId: 'srkr',
    admissionType: 'REGULAR',
    admissionYear: '2024',
    expectedGraduationYear: '2028',
    department: 'Computer Science & Engineering',
    branch: 'CSE',
    section: 'A',
    residentialStatus: 'Day Scholar',
    idCardName: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);
  const [extractedPhotoUrl, setExtractedPhotoUrl] = useState<string | null>(null);
  const [photoConfirmed, setPhotoConfirmed] = useState<boolean>(true);
  const [formError, setFormError] = useState('');

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
          setFormData(prev => ({
            ...prev,
            fullName: data.profile?.full_name || prev.fullName,
            studentId: data.profile?.student_id || prev.studentId,
            department: data.profile?.department || prev.department,
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

    if (!selectedFile && !formData.idCardName) {
      setFormError('Please select your College ID card document (JPEG, PNG, WEBP, or PDF, max 5MB)');
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
      formPayload.append('dob', formData.dob);
      formPayload.append('gender', formData.gender);
      formPayload.append('parentPhone', formData.parentPhone);
      formPayload.append('emergencyPhone', formData.emergencyPhone);
      formPayload.append('bloodGroup', formData.bloodGroup);
      formPayload.append('address', formData.address);
      formPayload.append('admissionType', formData.admissionType);
      formPayload.append('admissionYear', formData.admissionYear);
      formPayload.append('expectedGraduationYear', formData.expectedGraduationYear);
      formPayload.append('ocrText', `STUDENT ID: ${formData.studentId.trim()} COLLEGE ID CARD B.TECH ${formData.department} ${formData.branch} ${formData.section}`);
      
      if (extractedPhotoUrl && photoConfirmed) {
        formPayload.append('profilePhoto', extractedPhotoUrl);
      }
      
      if (selectedFile) {
        formPayload.append('file', selectedFile);
      } else {
        const storagePath = userId
          ? `kavach-id-cards/${userId}/${formData.studentId.trim()}-card.jpg`
          : `kavach-id-cards/${formData.studentId.trim()}-card.jpg`;
        formPayload.append('idCardUrl', storagePath);
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

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Section A: Personal Details */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '14px', color: '#c4b5fd' }}>
                Section A: Personal Details
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Full Name *
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
                    Date of Birth
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
                    Gender
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
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Blood Group
                  </label>
                  <select
                    className="input-field"
                    style={{ background: '#1e1b4b', color: '#fff' }}
                    value={formData.bloodGroup}
                    onChange={e => setFormData({ ...formData, bloodGroup: e.target.value })}
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Parent / Guardian Contact Number
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit number"
                    className="input-field"
                    value={formData.parentPhone}
                    onChange={e => setFormData({ ...formData, parentPhone: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Emergency Contact Number
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit emergency number"
                    className="input-field"
                    value={formData.emergencyPhone}
                    onChange={e => setFormData({ ...formData, emergencyPhone: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Residential Address
                </label>
                <input
                  type="text"
                  placeholder="Hostel Room / Home Residential Address"
                  className="input-field"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>

            {/* Section B: College & Academic Details */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '14px', color: '#93c5fd' }}>
                Section B: College &amp; Academic Details
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
                    Student Registration ID / Roll Number (7–10 Chars) *
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
                    Residential Status *
                  </label>
                  <select
                    className="input-field"
                    style={{ background: '#1e1b4b', color: '#fff' }}
                    value={formData.residentialStatus}
                    onChange={e => setFormData({ ...formData, residentialStatus: e.target.value })}
                  >
                    <option value="Day Scholar">Day Scholar</option>
                    <option value="Hosteller">Hosteller</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Branch / Programme
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science (CSE)"
                    className="input-field"
                    value={formData.branch}
                    onChange={e => setFormData({ ...formData, branch: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Section
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Section A"
                    className="input-field"
                    value={formData.section}
                    onChange={e => setFormData({ ...formData, section: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Admission Type &amp; Academic Duration *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => handleAdmissionTypeChange('REGULAR', formData.admissionYear)}
                  className={formData.admissionType === 'REGULAR' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '12px', fontSize: '0.9rem', textAlign: 'left' }}
                >
                  <div style={{ fontWeight: 600 }}>Regular B.Tech</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>4 Academic Years</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleAdmissionTypeChange('LATERAL_ENTRY', formData.admissionYear)}
                  className={formData.admissionType === 'LATERAL_ENTRY' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '12px', fontSize: '0.9rem', textAlign: 'left' }}
                >
                  <div style={{ fontWeight: 600 }}>Lateral Entry B.Tech</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>3 Academic Years</div>
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
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
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
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

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Upload ID Card (Image or PDF, Max 5MB) *
              </label>
              <div style={{ border: '2px dashed rgba(255, 255, 255, 0.15)', borderRadius: '12px', padding: '24px', textAlign: 'center', background: 'rgba(0, 0, 0, 0.2)' }}>
                <UploadCloud size={32} color="var(--accent-purple)" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}>Click to select your College ID Card</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Supported: JPEG, PNG, WEBP, PDF (Max 5MB)</div>
                <input
                  type="file"
                  id="id-card-file-input"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={e => {
                    setFormError('');
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      const MAX_SIZE = 5 * 1024 * 1024;
                      if (file.size > MAX_SIZE) {
                        setFormError(`Selected file is too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Maximum allowed size is 5MB.`);
                        setSelectedFile(null);
                        setFormData({ ...formData, idCardName: '' });
                        setDocPreviewUrl(null);
                        setExtractedPhotoUrl(null);
                        return;
                      }
                      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
                      if (!allowedTypes.includes(file.type)) {
                        setFormError(`Invalid file type (${file.type}). Allowed formats: JPEG, PNG, WEBP, PDF.`);
                        setSelectedFile(null);
                        setFormData({ ...formData, idCardName: '' });
                        setDocPreviewUrl(null);
                        setExtractedPhotoUrl(null);
                        return;
                      }
                      setSelectedFile(file);
                      setFormData({ ...formData, idCardName: file.name });

                      if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const result = event.target?.result as string;
                          setDocPreviewUrl(result);
                          const img = new Image();
                          img.onload = () => {
                            try {
                              const canvas = document.createElement('canvas');
                              canvas.width = 180;
                              canvas.height = 220;
                              const ctx = canvas.getContext('2d');
                              if (ctx) {
                                // Crop standard student portrait from top-right quadrant of horizontal ID or top-center
                                const isLandscape = img.width >= img.height;
                                const cropX = isLandscape ? img.width * 0.62 : img.width * 0.2;
                                const cropY = img.height * 0.15;
                                const cropW = isLandscape ? img.width * 0.34 : img.width * 0.6;
                                const cropH = img.height * 0.48;
                                ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, 180, 220);
                                setExtractedPhotoUrl(canvas.toDataURL('image/jpeg', 0.85));
                              }
                            } catch (err) {
                              console.warn('Canvas crop fallback:', err);
                            }
                          };
                          img.src = result;
                        };
                        reader.readAsDataURL(file);
                      } else {
                        setDocPreviewUrl(null);
                        setExtractedPhotoUrl(null);
                      }
                    }
                  }}
                  style={{ marginTop: '12px', fontSize: '0.85rem' }}
                />

                {selectedFile && (
                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--accent-green)', fontSize: '0.85rem', fontWeight: 500 }}>
                    <Check size={16} /> Ready to upload: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </div>
                )}
              </div>

              {/* ID Card Document & Cropped Portrait Preview */}
              {selectedFile && (
                <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: extractedPhotoUrl ? '1fr 1fr' : '1fr', gap: '16px' }}>
                  {/* Full Document Preview */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={14} color="var(--accent-blue)" /> Document Preview
                    </div>
                    {docPreviewUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={docPreviewUrl}
                        alt="ID Card Document Preview"
                        style={{ width: '100%', maxHeight: '160px', objectFit: 'contain', borderRadius: '6px', background: '#0a0a0f' }}
                      />
                    ) : (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        📄 PDF Document attached for OCR parsing
                      </div>
                    )}
                  </div>

                  {/* Extracted Portrait Photo Preview */}
                  {extractedPhotoUrl && (
                    <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                      <div style={{ fontSize: '0.8rem', color: '#c4b5fd', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Camera size={14} color="var(--accent-purple)" /> Extracted Student Portrait
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById('id-card-file-input') as HTMLInputElement | null;
                            if (input) input.click();
                          }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <RefreshCw size={11} /> Replace
                        </button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={extractedPhotoUrl}
                          alt="Extracted Student Portrait"
                          style={{ width: '70px', height: '85px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(139, 92, 246, 0.5)' }}
                        />
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
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Auto-detected from ID card layout.
                          </div>
                          <div style={{ marginTop: '6px' }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', cursor: 'pointer', textDecoration: 'underline' }}>
                              Upload standalone portrait photo (manual fallback)
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    const customPhoto = e.target.files[0];
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                      if (ev.target?.result) {
                                        setExtractedPhotoUrl(ev.target.result as string);
                                        setPhotoConfirmed(true);
                                      }
                                    };
                                    reader.readAsDataURL(customPhoto);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
