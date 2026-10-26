"use client";
import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, UserCheck, UserX, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Profile = {
  id: string;
  college_email?: string;
  email?: string;
  full_name?: string;
  role: string;
  is_approved: boolean;
  department?: string;
  student_id?: string;
  created_at?: string;
};

type VerificationRecord = {
  id: string;
  fullName: string;
  collegeEmail: string;
  studentId: string;
  department: string;
  admissionType: 'REGULAR' | 'LATERAL_ENTRY';
  admissionYear: number;
  expectedGraduationYear: number;
  verificationStatus: string;
  verifiedAt?: string;
  verifiedBy?: string;
  verificationNotes?: string;
  isApproved: boolean;
  signedIdCardUrl: string | null;
  rawStoragePath?: string;
};

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'STAFF' | 'ID_CARDS'>('PENDING');

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (isMounted && data) {
          setProfiles(data);
        }

        // Fetch ID card verification records
        const vRes = await fetch('/api/admin/verifications');
        if (vRes.ok) {
          const vData = await vRes.json();
          if (isMounted && vData.verifications) {
            setVerifications(vData.verifications);
          }
        }
      } catch (err) {
        console.error('Failed to load users / verifications:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleApproval = async (targetUserId: string, action: 'APPROVE' | 'REJECT', requestedRole: string) => {
    setActionLoading(targetUserId);
    try {
      const res = await fetch('/api/admin/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, action, requestedRole }),
      });

      const result = await res.json();
      if (!res.ok) {
        alert(result.error || 'Failed to update user status');
        return;
      }

      setProfiles(prev =>
        prev.map(p => (p.id === targetUserId ? { ...p, is_approved: action === 'APPROVE' } : p))
      );
    } catch (err) {
      console.error('Action error:', err);
      alert('Error updating user approval status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerificationDecision = async (
    targetStudentId: string,
    decision: 'VERIFIED' | 'REJECTED' | 'PENDING_MANUAL_REVIEW' | 'RESUBMISSION_REQUIRED',
    officialRosterConfirmed: boolean = false
  ) => {
    let reason = '';
    if (decision === 'REJECTED') {
      const input = window.prompt('Enter reason for rejecting student ID verification (required):');
      if (!input || !input.trim()) {
        alert('A specific rejection reason is required.');
        return;
      }
      reason = input.trim();
    } else if (decision === 'RESUBMISSION_REQUIRED') {
      const input = window.prompt('Enter instructions/reason for requesting resubmission (required, e.g. "ID card photo blurred, please re-upload clear photo"):');
      if (!input || !input.trim()) {
        alert('A resubmission reason is required.');
        return;
      }
      reason = input.trim();
    } else if (decision === 'VERIFIED') {
      reason = officialRosterConfirmed
        ? 'Confirmed against official college student roster'
        : 'Approved by campus security administrator';
    }

    setActionLoading(targetStudentId);
    try {
      const res = await fetch('/api/admin/verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetStudentId,
          decision,
          reason,
          officialRosterConfirmed,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        alert(result.error || 'Failed to record verification decision');
        return;
      }

      setVerifications(prev =>
        prev.map(v => (v.id === targetStudentId ? { ...v, verificationStatus: decision, isApproved: decision === 'VERIFIED', verificationNotes: reason } : v))
      );
    } catch (err) {
      console.error('Verification decision error:', err);
      alert('Error recording verification decision');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = profiles.filter(p => !p.is_approved).length;
  const pendingIdCardsCount = verifications.filter(v => v.verificationStatus === 'PENDING_MANUAL_REVIEW' || v.verificationStatus === 'PENDING_VERIFICATION').length;

  const filteredProfiles = profiles.filter(p => {
    if (filter === 'PENDING') return !p.is_approved;
    if (filter === 'STAFF') return p.role !== 'STUDENT';
    return true;
  });

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>User &amp; Access Governance</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Review pending staff requests, verify student ID cards, and manage roles.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setFilter('PENDING')}
            className={filter === 'PENDING' ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            Pending Requests {pendingCount > 0 && <span style={{ background: 'var(--accent-red)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem' }}>{pendingCount}</span>}
          </button>
          <button
            onClick={() => setFilter('ID_CARDS')}
            className={filter === 'ID_CARDS' ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            Student ID Cards {pendingIdCardsCount > 0 && <span style={{ background: '#f59e0b', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', color: '#000' }}>{pendingIdCardsCount}</span>}
          </button>
          <button
            onClick={() => setFilter('STAFF')}
            className={filter === 'STAFF' ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '0.85rem' }}
          >
            Staff &amp; Officers
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={filter === 'ALL' ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '0.85rem' }}
          >
            All Users
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {filter === 'ID_CARDS' ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '16px', fontWeight: 500 }}>Student Name</th>
                <th style={{ padding: '16px', fontWeight: 500 }}>Student ID</th>
                <th style={{ padding: '16px', fontWeight: 500 }}>Academic Batch</th>
                <th style={{ padding: '16px', fontWeight: 500 }}>Verification Status</th>
                <th style={{ padding: '16px', fontWeight: 500 }}>ID Card Document</th>
                <th style={{ padding: '16px', fontWeight: 500, textAlign: 'right' }}>Review Decision</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                    Loading verification records...
                  </td>
                </tr>
              ) : verifications.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No student ID verification requests submitted yet.
                  </td>
                </tr>
              ) : (
                verifications.map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 600 }}>{v.fullName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{v.collegeEmail}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{v.studentId}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{v.department}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: '0.9rem' }}>
                        {v.admissionType === 'REGULAR' ? 'Regular B.Tech (4 Years)' : 'Lateral Entry (3 Years)'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {v.admissionYear} – {v.expectedGraduationYear}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          background:
                            v.verificationStatus === 'VERIFIED'
                              ? 'rgba(16, 185, 129, 0.2)'
                              : v.verificationStatus === 'REJECTED'
                              ? 'rgba(239, 68, 68, 0.2)'
                              : v.verificationStatus === 'RESUBMISSION_REQUIRED'
                              ? 'rgba(249, 115, 22, 0.2)'
                              : 'rgba(245, 158, 11, 0.2)',
                          color:
                            v.verificationStatus === 'VERIFIED'
                              ? 'var(--accent-green)'
                              : v.verificationStatus === 'REJECTED'
                              ? 'var(--accent-red)'
                              : v.verificationStatus === 'RESUBMISSION_REQUIRED'
                              ? '#f97316'
                              : '#f59e0b',
                        }}
                      >
                        {v.verificationStatus}
                      </span>
                      {v.verificationNotes && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '200px' }}>
                          Note: {v.verificationNotes}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {v.signedIdCardUrl ? (
                        <a
                          href={v.signedIdCardUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--accent-blue)',
                            fontSize: '0.85rem',
                            textDecoration: 'none',
                          }}
                        >
                          View Document ↗
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No file uploaded</span>
                      )}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => handleVerificationDecision(v.id, 'VERIFIED', true)}
                          disabled={actionLoading === v.id}
                          className="btn-primary"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'var(--accent-green)',
                          }}
                        >
                          <CheckCircle size={14} /> Verify
                        </button>
                        <button
                          onClick={() => handleVerificationDecision(v.id, 'RESUBMISSION_REQUIRED', false)}
                          disabled={actionLoading === v.id}
                          className="btn-secondary"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#f97316',
                            borderColor: 'rgba(249, 115, 22, 0.4)',
                          }}
                        >
                          Resubmit
                        </button>
                        <button
                          onClick={() => handleVerificationDecision(v.id, 'PENDING_MANUAL_REVIEW', false)}
                          disabled={actionLoading === v.id}
                          className="btn-secondary"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#f59e0b',
                          }}
                        >
                          Review
                        </button>
                        <button
                          onClick={() => handleVerificationDecision(v.id, 'REJECTED', false)}
                          disabled={actionLoading === v.id}
                          className="btn-secondary"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--accent-red)',
                          }}
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '16px', fontWeight: 500 }}>User / Name</th>
                <th style={{ padding: '16px', fontWeight: 500 }}>Email / ID</th>
                <th style={{ padding: '16px', fontWeight: 500 }}>Role</th>
                <th style={{ padding: '16px', fontWeight: 500 }}>Department</th>
                <th style={{ padding: '16px', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '16px', fontWeight: 500, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                    Loading accounts...
                  </td>
                </tr>
              ) : filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No users found in this view.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 600 }}>{p.full_name || 'Unnamed User'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ID: {p.id.slice(0, 8)}...</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div>{p.college_email || p.email}</div>
                      {p.student_id && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ref: {p.student_id}</div>}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          background:
                            p.role === 'ADMIN' || p.role === 'SUPER_ADMIN'
                              ? 'rgba(139, 92, 246, 0.2)'
                              : p.role === 'STUDENT'
                              ? 'rgba(59, 130, 246, 0.2)'
                              : 'rgba(16, 185, 129, 0.2)',
                          color:
                            p.role === 'ADMIN' || p.role === 'SUPER_ADMIN'
                              ? 'var(--accent-purple)'
                              : p.role === 'STUDENT'
                              ? 'var(--accent-blue)'
                              : 'var(--accent-green)',
                        }}
                      >
                        {p.role}
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                      {p.department || '—'}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {p.is_approved ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-green)', fontSize: '0.85rem' }}>
                          <CheckCircle size={14} /> Approved
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontSize: '0.85rem' }}>
                          <XCircle size={14} /> Pending Review
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      {!p.is_approved ? (
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => handleApproval(p.id, 'APPROVE', p.role)}
                            disabled={actionLoading === p.id}
                            className="btn-primary"
                            style={{
                              padding: '6px 12px',
                              fontSize: '0.8rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'var(--accent-green)',
                            }}
                          >
                            <UserCheck size={14} /> Approve
                          </button>
                          <button
                            onClick={() => handleApproval(p.id, 'REJECT', p.role)}
                            disabled={actionLoading === p.id}
                            className="btn-secondary"
                            style={{
                              padding: '6px 12px',
                              fontSize: '0.8rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: 'var(--accent-red)',
                            }}
                          >
                            <UserX size={14} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Active</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
