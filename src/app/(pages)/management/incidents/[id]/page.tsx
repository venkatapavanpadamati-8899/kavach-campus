"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Shield, Clock, ArrowLeft, Users, RefreshCw, AlertTriangle, 
  CheckCircle2, FileText, Send, UserX, Download, MessageSquare
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

interface CaseAction {
  id: string;
  action: string;
  from_status: string;
  to_status: string;
  notes: string;
  created_at: string;
}

interface EvidenceFile {
  id: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  signedUrl?: string | null;
  created_at: string;
}

interface StudentSummary {
  name: string;
  email: string;
  phone?: string;
  studentId?: string;
}

function ManagementIncidentDetailContent() {
  const params = useParams();
  const id = params.id as string;

  const [incident, setIncident] = useState<Incident | null>(null);
  const [caseActions, setCaseActions] = useState<CaseAction[]>([]);
  const [evidence, setEvidence] = useState<EvidenceFile[]>([]);
  const [studentSummary, setStudentSummary] = useState<StudentSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Responder scan & assign state
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyResults, setNearbyResults] = useState<{
    message: string;
    candidates: CandidateStaff[];
  } | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // Status transition state
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Case note state
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Escalation state
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [escalateLevel, setEscalateLevel] = useState('MANAGEMENT');
  const [escalating, setEscalating] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const res = await fetch(`/api/incidents/${id}`);
        const data = await res.json();
        if (!ignore && data.success && data.incident) {
          setIncident(data.incident);
          if (data.caseActions) setCaseActions(data.caseActions);
          if (data.evidence) setEvidence(data.evidence);
          if (data.studentSummary) setStudentSummary(data.studentSummary);
        }
      } catch (e) {
        console.error('Failed to load incident:', e);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, [id, refreshKey]);

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  const handleScanStaff = async () => {
    setNearbyLoading(true);
    try {
      const res = await fetch(`/api/incidents/${id}/nearby-staff`);
      const data = await res.json();
      if (data.success) {
        setNearbyResults(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setNearbyLoading(false);
    }
  };

  const handleAssignResponder = async (staffId: string) => {
    setAssigningId(staffId);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: staffId }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ type: 'success', text: `Responder assigned successfully.` });
        triggerRefresh();
        handleScanStaff();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to assign responder.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error while assigning responder.' });
    } finally {
      setAssigningId(null);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setUpdatingStatus(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ type: 'success', text: `Case status updated to ${newStatus}.` });
        triggerRefresh();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to update status.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error while updating status.' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSubmittingNote(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/incidents/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewNote('');
        setStatusMessage({ type: 'success', text: 'Case note added to audit trail.' });
        triggerRefresh();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to add note.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error while saving note.' });
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleEscalateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateReason.trim()) return;

    setEscalating(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/incidents/${id}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason: escalateReason,
          to_level: escalateLevel 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowEscalateModal(false);
        setEscalateReason('');
        setStatusMessage({ type: 'success', text: `Case successfully escalated to ${escalateLevel}.` });
        triggerRefresh();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to escalate case.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error while escalating.' });
    } finally {
      setEscalating(false);
    }
  };

  if (loading) {
    return <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '20px' }}>Loading incident oversight...</div>;
  }

  if (!incident) {
    return (
      <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '20px' }}>
        <h2>Incident not found</h2>
        <Link href="/management/incidents" style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>
          Back to Incidents List
        </Link>
      </div>
    );
  }

  const isResolvedOrClosed = ['RESOLVED', 'CLOSED'].includes(incident.status);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 20px' }}>
      {/* Back button */}
      <div style={{ marginBottom: '20px' }}>
        <Link href="/management/incidents" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Back to Incident Oversight
        </Link>
      </div>

      {/* Status toast message */}
      {statusMessage && (
        <div 
          style={{ 
            padding: '12px 16px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            background: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${statusMessage.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: statusMessage.type === 'success' ? '#10b981' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {statusMessage.text}
        </div>
      )}

      {/* Case Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', margin: '0 0 8px 0' }}>Case: {incident.case_id}</h1>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem', background: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-blue)' }}>
              Category: {incident.category}
            </span>
            <span style={{ padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--accent-red)' }}>
              Severity: {incident.severity}
            </span>
            <span style={{ padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
              Status: <strong>{incident.status}</strong>
            </span>
            {incident.is_anonymous && (
              <span style={{ padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <UserX size={14} /> Anonymous Report
              </span>
            )}
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {!isResolvedOrClosed && (
            <button 
              className="btn-secondary"
              onClick={() => setShowEscalateModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-red)', borderColor: 'rgba(239,68,68,0.4)' }}
            >
              <AlertTriangle size={14} /> Escalate Case
            </button>
          )}
        </div>
      </div>

      {/* Incident Summary Card */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={20} color="var(--accent-blue)" /> Incident Summary
        </h3>
        <p style={{ lineHeight: '1.6', marginBottom: '16px', fontSize: '1.05rem' }}>{incident.description}</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Reported At</div>
            <div style={{ fontSize: '0.95rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={14} /> {new Date(incident.created_at).toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Reporter</div>
            <div style={{ fontSize: '0.95rem', marginTop: '2px' }}>
              {incident.is_anonymous ? (
                <span style={{ color: '#c084fc', fontStyle: 'italic' }}>Anonymous Student (Protected)</span>
              ) : (
                studentSummary ? `${studentSummary.name} (${studentSummary.studentId || 'Student'})` : 'Campus Student'
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Assigned Responder</div>
            <div style={{ fontSize: '0.95rem', marginTop: '2px' }}>
              {incident.assigned_to ? <strong>Assigned</strong> : <span style={{ color: 'var(--accent-red)' }}>Unassigned</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Management Actions: Status Transition */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={20} color="var(--accent-blue)" /> Update Case Status
        </h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {['ACKNOWLEDGED', 'IN_PROGRESS', 'ACTION_TAKEN', 'RESOLVED', 'CLOSED'].map((st) => (
            <button
              key={st}
              disabled={updatingStatus || incident.status === st}
              onClick={() => handleUpdateStatus(st)}
              className={incident.status === st ? 'btn-primary' : 'btn-secondary'}
              style={{ opacity: incident.status === st ? 1 : 0.8 }}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Responder Assignment Section */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="var(--accent-green)" /> Assign Eligible Responder
          </h3>
          <button 
            className="btn-secondary" 
            onClick={handleScanStaff}
            disabled={nearbyLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={nearbyLoading ? 'spin-animation' : ''} />
            {nearbyLoading ? 'Scanning...' : 'Scan Active Responders'}
          </button>
        </div>

        {nearbyResults ? (
          <div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              {nearbyResults.message}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {nearbyResults.candidates.map(c => (
                <div key={c.id} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <strong>{c.name}</strong> ({c.role}) — {c.department || 'Security'}
                    {c.isCurrentlyAssigned && (
                      <span style={{ marginLeft: '8px', fontSize: '0.75rem', background: 'rgba(59,130,246,0.2)', color: 'var(--accent-blue)', padding: '2px 8px', borderRadius: '10px' }}>
                        Current Assignee
                      </span>
                    )}
                    <div>
                      {c.hasFreshGps && c.distanceMeters != null ? (
                        <span style={{ color: 'var(--accent-green)', fontSize: '0.8rem' }}>📍 {c.distanceMeters}m away</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Location unavailable</span>
                      )}
                    </div>
                  </div>
                  <div>
                    {!c.isCurrentlyAssigned && (
                      <button
                        className="btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                        disabled={assigningId === c.id}
                        onClick={() => handleAssignResponder(c.id)}
                      >
                        {assigningId === c.id ? 'Assigning...' : 'Assign Case'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Click &quot;Scan Active Responders&quot; to inspect qualified staff and assign this incident.
          </p>
        )}
      </div>

      {/* Case Notes & Audit Timeline */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={20} color="var(--accent-blue)" /> Official Case Notes & Audit Timeline
        </h3>

        {/* Add Note Form */}
        <form onSubmit={handleAddNote} style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Enter official case note or update..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="input-field"
              style={{ flex: 1, margin: 0 }}
            />
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={submittingNote || !newNote.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
            >
              <Send size={14} /> {submittingNote ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </form>

        {/* Timeline */}
        {caseActions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>No actions or notes recorded yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {caseActions.map((act) => (
              <div 
                key={act.id} 
                style={{ 
                  padding: '12px 16px', 
                  borderRadius: '8px', 
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderLeft: '3px solid var(--accent-blue)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--accent-blue)' }}>
                    {act.action}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(act.created_at).toLocaleString()}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  {act.notes}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incident Evidence */}
      {evidence.length > 0 && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="var(--accent-purple)" /> Incident Evidence Files ({evidence.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {evidence.map((ev) => (
              <div 
                key={ev.id} 
                style={{ 
                  padding: '10px 14px', 
                  background: 'rgba(255, 255, 255, 0.03)', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}
              >
                <div>
                  <strong>{ev.file_name}</strong>
                  {ev.mime_type && <span style={{ marginLeft: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>({ev.mime_type})</span>}
                </div>
                <div>
                  {ev.signedUrl ? (
                    <a 
                      href={ev.signedUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ color: 'var(--accent-blue)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '0.85rem' }}
                    >
                      <Download size={14} /> Download File (15m Link)
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Direct Link Pending</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Escalation Modal */}
      {showEscalateModal && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.7)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 100,
            padding: '20px'
          }}
        >
          <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', padding: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} /> Escalate Case {incident.case_id}
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Escalating notifies higher authorities and logs an immutable audit event.
            </p>

            <form onSubmit={handleEscalateIncident}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Target Authority:
                </label>
                <select
                  value={escalateLevel}
                  onChange={(e) => setEscalateLevel(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                >
                  <option value="MANAGEMENT">Campus Management</option>
                  <option value="SECURITY_HEAD">Head of Security</option>
                  <option value="DISCIPLINARY_COMMITTEE">Disciplinary Committee</option>
                  <option value="CAMPUS_POLICE">Nearest Police / Thana</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Escalation Reason (Required):
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail the rationale for emergency escalation..."
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={escalating}
                  onClick={() => setShowEscalateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={escalating || !escalateReason.trim()}
                  style={{ background: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}
                >
                  {escalating ? 'Escalating...' : 'Confirm Escalation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManagementIncidentDetail() {
  return (
    <Suspense fallback={<div style={{ maxWidth: '1000px', margin: '40px auto', padding: '20px' }}>Loading incident oversight...</div>}>
      <ManagementIncidentDetailContent />
    </Suspense>
  );
}
