"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Shield, 
  MapPin, 
  Clock, 
  UserCheck, 
  AlertTriangle, 
  CheckCircle, 
  Radio, 
  ArrowLeft,
  RefreshCw,
  Users
} from 'lucide-react';
import { Incident, LocationRecord } from '@/types';

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

function StaffIncidentDetailContent() {
  const params = useParams();
  const id = params.id as string;
  
  const [incident, setIncident] = useState<Incident | null>(null);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Nearby staff lookup state
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyResults, setNearbyResults] = useState<{
    hasIncidentLocation: boolean;
    hasFreshGpsResponders: boolean;
    message: string;
    candidates: CandidateStaff[];
  } | null>(null);

  const fetchIncident = async () => {
    try {
      const res = await fetch(`/api/incidents/${id}`);
      const data = await res.json();
      if (data.success && data.incident) {
        setIncident(data.incident);
      }
    } catch (e) {
      console.error('Failed to fetch incident:', e);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch(`/api/sos/location?incidentId=${id}`);
      const data = await res.json();
      if (data.success && data.locations) {
        setLocations(data.locations);
      }
    } catch (e) {
      console.error('Failed to fetch locations:', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchIncident();
      await fetchLocations();
      setLoading(false);
    };
    init();

    // Poll location every 5 seconds if live tracking is active
    const timer = setInterval(() => {
      fetchLocations();
    }, 5000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Handle status update (Acknowledge, In Progress, Resolve)
  const handleUpdateStatus = async (newStatus: string) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, notes: `Status updated to ${newStatus} by staff responder.` }),
      });
      const data = await res.json();
      if (data.success) {
        setIncident(data.incident);
        setActionMessage({ type: 'success', text: `Incident status updated to ${newStatus}. Action recorded in audit log.` });
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to update status.' });
      }
    } catch (e: unknown) {
      setActionMessage({ type: 'error', text: (e instanceof Error ? e.message : 'Network error') });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle "Find Nearby Available Staff"
  const handleFindNearbyStaff = async () => {
    setNearbyLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/incidents/${id}/nearby-staff`);
      const data = await res.json();
      if (data.success) {
        setNearbyResults(data);
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to search nearby staff.' });
      }
    } catch (e: unknown) {
      setActionMessage({ type: 'error', text: (e instanceof Error ? e.message : 'Network error') });
    } finally {
      setNearbyLoading(false);
    }
  };

  // Handle Reassigning to a candidate staff member
  const handleReassign = async (candidate: CandidateStaff) => {
    if (!confirm(`Confirm reassigning case ${incident?.case_id} to ${candidate.name} (${candidate.role})?`)) {
      return;
    }
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assigned_to: candidate.id,
          notes: `Reassigned via Nearby Staff selection: ${candidate.name} (${candidate.distanceMeters ? `${candidate.distanceMeters}m away` : 'Role fallback'}).`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIncident(data.incident);
        setActionMessage({ 
          type: 'success', 
          text: `Case successfully reassigned to ${candidate.name}. Responder notified and audit log recorded.` 
        });
        // Refresh candidate list
        handleFindNearbyStaff();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to reassign incident.' });
      }
    } catch (e: unknown) {
      setActionMessage({ type: 'error', text: (e instanceof Error ? e.message : 'Network error') });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '900px', margin: '40px auto', padding: '20px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading incident and coordinates...</p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div style={{ maxWidth: '900px', margin: '40px auto', padding: '20px' }}>
        <h2>Incident not found</h2>
        <Link href="/staff/incidents" style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>
          Back to Incident Queue
        </Link>
      </div>
    );
  }

  const currentLoc = locations.length > 0 ? locations[0] : null;

  const getSeverityBadgeColor = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return 'var(--accent-red)';
      case 'HIGH': return '#f59e0b';
      case 'MEDIUM': return 'var(--accent-blue)';
      default: return 'var(--accent-green)';
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link 
          href="/staff/incidents" 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem' }}
        >
          <ArrowLeft size={16} /> Back to Incident Queue
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', margin: '0 0 8px 0' }}>Case: {incident.case_id}</h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ 
              padding: '4px 12px', 
              borderRadius: '20px', 
              fontSize: '0.85rem', 
              fontWeight: 600,
              background: `${getSeverityBadgeColor(incident.severity)}20`, 
              color: getSeverityBadgeColor(incident.severity) 
            }}>
              Severity: {incident.severity}
            </span>
            <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.08)' }}>
              Status: {incident.status}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Category: {incident.category}
            </span>
          </div>
        </div>

        {/* Quick Status Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {incident.status === 'RECEIVED' || incident.status === 'ASSIGNED' ? (
            <button 
              className="btn-primary" 
              onClick={() => handleUpdateStatus('ACKNOWLEDGED')}
              disabled={actionLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <UserCheck size={16} /> Acknowledge Case
            </button>
          ) : null}

          {incident.status === 'ACKNOWLEDGED' ? (
            <button 
              className="btn-primary" 
              onClick={() => handleUpdateStatus('IN_PROGRESS')}
              disabled={actionLoading}
            >
              Mark In Progress
            </button>
          ) : null}

          {incident.status === 'IN_PROGRESS' ? (
            <button 
              className="btn-secondary" 
              onClick={() => handleUpdateStatus('ACTION_TAKEN')}
              disabled={actionLoading}
            >
              Action Taken
            </button>
          ) : null}

          {incident.status !== 'RESOLVED' && incident.status !== 'CLOSED' ? (
            <button 
              className="btn-secondary" 
              onClick={() => handleUpdateStatus('RESOLVED')}
              disabled={actionLoading}
              style={{ borderColor: 'var(--accent-green)', color: 'var(--accent-green)' }}
            >
              <CheckCircle size={16} /> Mark Resolved
            </button>
          ) : null}
        </div>
      </div>

      {actionMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          background: actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${actionMessage.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'}`,
          color: actionMessage.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
          fontSize: '0.9rem'
        }}>
          {actionMessage.text}
        </div>
      )}

      {/* Incident Details Card */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={20} color="var(--accent-blue)" /> Incident Overview
        </h3>
        <p style={{ fontSize: '1rem', lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '16px' }}>
          {incident.description}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <div>
            <Clock size={14} style={{ display: 'inline', marginRight: '6px' }} />
            Reported: {new Date(incident.created_at).toLocaleString()}
          </div>
          <div>
            Tracking Active: <strong>{incident.is_tracking_active ? 'Yes (Live)' : 'No'}</strong>
          </div>
          <div>
            Assigned Responder: <strong>{incident.assigned_to ? 'Assigned' : 'Unassigned (Broadcast)'}</strong>
          </div>
        </div>
      </div>

      {/* Student Location Card */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={20} color="var(--accent-red)" /> Student Location (Authorized Personnel Only)
          </h3>
          {incident.is_tracking_active ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-green)', fontSize: '0.85rem' }}>
              <Radio size={14} className="pulse-animation" /> Live GPS Stream
            </span>
          ) : null}
        </div>

        {currentLoc ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Latitude</span>
                <p style={{ margin: '4px 0 0 0', fontWeight: 600 }}>{currentLoc.latitude.toFixed(6)}</p>
              </div>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Longitude</span>
                <p style={{ margin: '4px 0 0 0', fontWeight: 600 }}>{currentLoc.longitude.toFixed(6)}</p>
              </div>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Accuracy</span>
                <p style={{ margin: '4px 0 0 0', fontWeight: 600 }}>±{Math.round(currentLoc.accuracy)}m</p>
              </div>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Last Ping</span>
                <p style={{ margin: '4px 0 0 0', fontWeight: 600 }}>{new Date(currentLoc.recorded_at).toLocaleTimeString()}</p>
              </div>
            </div>

            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${currentLoc.latitude},${currentLoc.longitude}`}
              target="_blank" 
              rel="noreferrer"
              style={{ color: 'var(--accent-blue)', textDecoration: 'underline', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              Open Student Coordinates in Maps ↗
            </a>
          </div>
        ) : incident.latitude != null && incident.longitude != null ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Latitude</span>
                <p style={{ margin: '4px 0 0 0', fontWeight: 600 }}>{Number(incident.latitude).toFixed(6)}</p>
              </div>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Longitude</span>
                <p style={{ margin: '4px 0 0 0', fontWeight: 600 }}>{Number(incident.longitude).toFixed(6)}</p>
              </div>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Location Source</span>
                <p style={{ margin: '4px 0 0 0', fontWeight: 600 }}>Incident Report GPS</p>
              </div>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Reported At</span>
                <p style={{ margin: '4px 0 0 0', fontWeight: 600 }}>{new Date(incident.created_at).toLocaleTimeString()}</p>
              </div>
            </div>

            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${incident.latitude},${incident.longitude}`}
              target="_blank" 
              rel="noreferrer"
              style={{ color: 'var(--accent-blue)', textDecoration: 'underline', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              Open Student Coordinates in Maps ↗
            </a>
          </div>
        ) : (
          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
            No GPS coordinates recorded for this incident. Location fallback routing applies.
          </div>
        )}
      </div>

      {/* NEARBY AVAILABLE STAFF WORKFLOW SECTION (Phase 5 & Section 2) */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} color="var(--accent-green)" /> Nearby Available Staff & Reassignment
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Check verified nearby responders with fresh GPS coordinates if current assignee is unavailable.
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
            {/* Banner message */}
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

            {/* Candidates list */}
            {nearbyResults.candidates.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No active responders available in duty roster.</p>
            ) : (
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
                        <span style={{ 
                          fontSize: '0.75rem', 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          background: 'rgba(59, 130, 246, 0.2)', 
                          color: 'var(--accent-blue)' 
                        }}>
                          {c.role}
                        </span>
                        {c.isCurrentlyAssigned ? (
                          <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-green)' }}>
                            Current Assignee
                          </span>
                        ) : null}
                      </div>

                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                        <span>Dept: {c.department || 'General'}</span>
                        {c.hasFreshGps && c.distanceMeters != null ? (
                          <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                            📍 Distance: {c.distanceMeters}m ({c.lastSeenMinutesAgo != null ? `${c.lastSeenMinutesAgo}m ago` : 'Fresh'})
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>
                            GPS: Not fresh / Unavailable
                          </span>
                        )}
                        <span>
                          Eligibility: {c.isRoleQualified ? '✅ Qualified' : '⚠️ Senior Escalation'}
                        </span>
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
                          Reassign to {c.name.split(' ')[0]}
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', fontWeight: 500 }}>
                          Active Assignee
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StaffIncidentDetail() {
  return (
    <Suspense fallback={<div style={{ maxWidth: '900px', margin: '40px auto', padding: '20px' }}>Loading incident...</div>}>
      <StaffIncidentDetailContent />
    </Suspense>
  );
}
