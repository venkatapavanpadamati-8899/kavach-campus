"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Shield, 
  Clock, 
  ArrowLeft, 
  RefreshCw, 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  FileText,
  User,
  Activity
} from 'lucide-react';
import { Incident } from '@/types';

interface CandidateStaff {
  id: string;
  name: string;
  role: string;
  department: string | null;
  isCurrentlyAssigned: boolean;
  distanceMeters: number | null;
  hasFreshGps: boolean;
  lastSeenMinutesAgo: number | null;
  isRoleQualified: boolean;
}

interface StudentSummary {
  name: string;
  email: string;
  studentId: string;
  department: string;
  year: string;
  phone: string;
  verificationStatus: string;
}

interface CaseActionRecord {
  id: string;
  action: string;
  from_status: string;
  to_status: string;
  notes: string;
  created_at: string;
}

function AdminIncidentDetailContent() {
  const params = useParams();
  const id = params.id as string;

  const [incident, setIncident] = useState<Incident | null>(null);
  const [studentSummary, setStudentSummary] = useState<StudentSummary | null>(null);
  const [assignedResponder, setAssignedResponder] = useState<{ id: string; name: string; role: string; department: string } | null>(null);
  const [caseActions, setCaseActions] = useState<CaseActionRecord[]>([]);
  const [evidenceList, setEvidenceList] = useState<{ id: string; file_name: string; file_size: number; storage_path: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusInput, setStatusInput] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Nearby staff state
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyResults, setNearbyResults] = useState<{
    hasIncidentLocation: boolean;
    hasFreshGpsResponders: boolean;
    message: string;
    candidates: CandidateStaff[];
  } | null>(null);

  const fetchDetails = async () => {
    try {
      const res = await fetch(`/api/incidents/${id}`);
      const data = await res.json();
      if (data.success && data.incident) {
        setIncident(data.incident);
        setStatusInput(data.incident.status);
        setStudentSummary(data.studentSummary || null);
        setAssignedResponder(data.assignedResponder || null);
        setCaseActions(data.caseActions || []);
        setEvidenceList(data.evidence || []);
      }
    } catch (e) {
      console.error('Failed to load incident oversight:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const res = await fetch(`/api/incidents/${id}`);
        const data = await res.json();
        if (isMounted && data.success && data.incident) {
          setIncident(data.incident);
          setStatusInput(data.incident.status);
          setStudentSummary(data.studentSummary || null);
          setAssignedResponder(data.assignedResponder || null);
          setCaseActions(data.caseActions || []);
          setEvidenceList(data.evidence || []);
        }
      } catch (e) {
        console.error('Failed to load incident oversight:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [id]);

  const handleUpdateStatus = async () => {
    if (!statusInput) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusInput, notes: `Status manually changed to ${statusInput} by administrator.` }),
      });
      const data = await res.json();
      if (data.success) {
        setIncident(data.incident);
        setMessage({ type: 'success', text: `Status updated to ${statusInput}. Audit log saved.` });
        fetchDetails();
      } else {
        setMessage({ type: 'error', text: data.error || 'Update failed' });
      }
    } catch (e: unknown) {
      setMessage({ type: 'error', text: (e instanceof Error ? e.message : 'Network error') });
    } finally {
      setActionLoading(false);
    }
  };

  const handleFindNearbyStaff = async () => {
    setNearbyLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/incidents/${id}/nearby-staff`);
      const data = await res.json();
      if (data.success) {
        setNearbyResults(data);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to search nearby staff.' });
      }
    } catch (e: unknown) {
      setMessage({ type: 'error', text: (e instanceof Error ? e.message : 'Network error') });
    } finally {
      setNearbyLoading(false);
    }
  };

  const handleReassign = async (candidate: CandidateStaff) => {
    if (!confirm(`Reassign case to ${candidate.name} (${candidate.role})?`)) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assigned_to: candidate.id,
          notes: `Reassigned by Administrator to ${candidate.name} (${candidate.distanceMeters ? `${candidate.distanceMeters}m away` : 'Role fallback'}).`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIncident(data.incident);
        setMessage({ type: 'success', text: `Case reassigned to ${candidate.name}. Notification sent and audit log created.` });
        fetchDetails();
        handleFindNearbyStaff();
      } else {
        setMessage({ type: 'error', text: data.error || 'Reassignment failed' });
      }
    } catch (e: unknown) {
      setMessage({ type: 'error', text: (e instanceof Error ? e.message : 'Network error') });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '20px' }}>Loading admin case oversight...</div>;
  }

  if (!incident) {
    return (
      <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '20px' }}>
        <h2>Incident not found</h2>
        <Link href="/admin/incidents" style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>
          Back to Incident Audit
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link href="/admin/incidents" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Back to Incident Audit
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', margin: '0 0 8px 0' }}>Incident Oversight: {incident.case_id}</h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem', background: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-blue)' }}>
              Category: {incident.category}
            </span>
            <span style={{ padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--accent-red)' }}>
              Severity: {incident.severity}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Status: <strong>{incident.status}</strong>
            </span>
          </div>
        </div>

        {/* Status Control */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select 
            value={statusInput} 
            onChange={(e) => setStatusInput(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <option value="RECEIVED">RECEIVED</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="ACTION_TAKEN">ACTION_TAKEN</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
            <option value="FALSE_ALARM">FALSE_ALARM</option>
          </select>
          <button 
            className="btn-primary" 
            onClick={handleUpdateStatus}
            disabled={actionLoading}
            style={{ fontSize: '0.85rem', padding: '8px 16px' }}
          >
            Update Status
          </button>
        </div>
      </div>

      {message && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${message.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'}`,
          color: message.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
          fontSize: '0.9rem'
        }}>
          {message.text}
        </div>
      )}

      {/* Grid: Incident Info & Student Profile */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={20} color="var(--accent-blue)" /> Incident Details
          </h3>
          <p style={{ lineHeight: '1.6', marginBottom: '16px' }}>{incident.description}</p>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>Reported: {new Date(incident.created_at).toLocaleString()}</div>
            <div>Assigned Responder: <strong>{assignedResponder ? `${assignedResponder.name} (${assignedResponder.role})` : 'Unassigned'}</strong></div>
            {incident.latitude && incident.longitude ? (
              <div>
                Location: {incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}{' '}
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${incident.latitude},${incident.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--accent-blue)', textDecoration: 'underline', marginLeft: '6px' }}
                >
                  View on Map ↗
                </a>
              </div>
            ) : (
              <div>Location: <em>No GPS provided</em></div>
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={20} color="var(--accent-purple)" /> Reporting Student
          </h3>
          {studentSummary ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
              <div><strong>Name:</strong> {studentSummary.name}</div>
              <div><strong>Student ID:</strong> {studentSummary.studentId || 'N/A'}</div>
              <div><strong>Email:</strong> {studentSummary.email}</div>
              <div><strong>Dept / Year:</strong> {studentSummary.department || 'N/A'} {studentSummary.year ? `(${studentSummary.year})` : ''}</div>
              <div><strong>ID Card Status:</strong>{' '}
                <span style={{ 
                  color: studentSummary.verificationStatus === 'VERIFIED' ? 'var(--accent-green)' : '#f59e0b',
                  fontWeight: 600
                }}>
                  {studentSummary.verificationStatus}
                </span>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>Student identity masked or anonymous report.</p>
          )}
        </div>
      </div>

      {/* NEARBY AVAILABLE STAFF WORKFLOW */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} color="var(--accent-green)" /> Nearby Available Staff & Reassignment
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Identify closest verified responders with active GPS pings to dispatch or reassign.
            </p>
          </div>
          <button 
            className="btn-secondary" 
            onClick={handleFindNearbyStaff}
            disabled={nearbyLoading || actionLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={16} className={nearbyLoading ? 'spin-animation' : ''} />
            {nearbyLoading ? 'Scanning...' : 'Find Nearby Available Staff'}
          </button>
        </div>

        {nearbyResults && (
          <div>
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              background: !nearbyResults.hasFreshGpsResponders ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.1)',
              border: `1px solid ${!nearbyResults.hasFreshGpsResponders ? '#f59e0b' : 'rgba(59, 130, 246, 0.3)'}`,
              fontSize: '0.9rem',
              color: !nearbyResults.hasFreshGpsResponders ? '#f59e0b' : 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {!nearbyResults.hasFreshGpsResponders ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
              <span>{nearbyResults.message}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {nearbyResults.candidates.map((c) => (
                <div 
                  key={c.id}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.03)',
                    border: c.isCurrentlyAssigned ? '1px solid var(--accent-blue)' : '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '1rem' }}>{c.name}</strong>
                      <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-blue)' }}>
                        {c.role}
                      </span>
                      {c.isCurrentlyAssigned ? (
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-green)' }}>
                          Current Assignee
                        </span>
                      ) : null}
                    </div>

                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                      <span>Dept: {c.department || 'Campus Security'}</span>
                      {c.hasFreshGps && c.distanceMeters != null ? (
                        <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                          📍 Distance: {c.distanceMeters}m ({c.lastSeenMinutesAgo != null ? `${c.lastSeenMinutesAgo}m ago` : 'Fresh'})
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>GPS: Not fresh / Unavailable</span>
                      )}
                      <span>Eligibility: {c.isRoleQualified ? '✅ Qualified' : '⚠️ Escalation Only'}</span>
                    </div>
                  </div>

                  <div>
                    {!c.isCurrentlyAssigned ? (
                      <button 
                        className="btn-primary" 
                        onClick={() => handleReassign(c)}
                        disabled={actionLoading}
                        style={{ fontSize: '0.85rem', padding: '8px 14px' }}
                      >
                        Reassign
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--accent-blue)' }}>Assigned</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Case Action History & Audit Log */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={20} color="var(--accent-blue)" /> Audit History & Actions
        </h3>
        {caseActions.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No actions recorded yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {caseActions.map((action) => (
              <div 
                key={action.id} 
                style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: '3px solid var(--accent-blue)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong>{action.action}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    {new Date(action.created_at).toLocaleString()}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {action.notes || `Transitioned from ${action.from_status} to ${action.to_status}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Evidence Attachments */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={20} color="var(--accent-green)" /> Attached Evidence ({evidenceList.length})
        </h3>
        {evidenceList.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No media or documentary evidence uploaded for this incident.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {evidenceList.map((file) => (
              <div key={file.id} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{file.file_name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{Math.round(file.file_size / 1024)} KB</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminIncidentDetail() {
  return (
    <Suspense fallback={<div style={{ maxWidth: '1000px', margin: '40px auto', padding: '20px' }}>Loading incident oversight...</div>}>
      <AdminIncidentDetailContent />
    </Suspense>
  );
}
