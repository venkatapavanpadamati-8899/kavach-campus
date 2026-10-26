"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Shield, Clock, ArrowLeft, CheckCircle, MapPin, AlertCircle, FileText } from 'lucide-react';
import { Incident } from '@/types';

function StudentIncidentDetailContent() {
  const params = useParams();
  const id = params.id as string;

  const [incident, setIncident] = useState<Incident | null>(null);
  const [assignedResponder, setAssignedResponder] = useState<{ role: string; department: string } | null>(null);
  const [evidenceList, setEvidenceList] = useState<{ id: string; file_name: string; file_size: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadIncident() {
      try {
        const res = await fetch(`/api/incidents/${id}`);
        const data = await res.json();
        if (data.success && data.incident) {
          setIncident(data.incident);
          setAssignedResponder(data.assignedResponder ? { role: data.assignedResponder.role, department: data.assignedResponder.department } : null);
          setEvidenceList(data.evidence || []);
        } else {
          setError(data.error || 'Failed to load case');
        }
      } catch (e: unknown) {
        setError((e instanceof Error ? e.message : 'Network error'));
      } finally {
        setLoading(false);
      }
    }
    loadIncident();
  }, [id]);

  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading case details...</p>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px' }}>
        <h2>Unable to view incident</h2>
        <p style={{ color: 'var(--accent-red)', marginBottom: '16px' }}>{error || 'Incident not found'}</p>
        <Link href="/student/incidents" style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>
          Back to My Cases
        </Link>
      </div>
    );
  }

  const steps = [
    { label: 'Reported', completed: true },
    { label: 'Acknowledged', completed: ['ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'ACTION_TAKEN', 'RESOLVED', 'CLOSED'].includes(incident.status) },
    { label: 'Action in Progress', completed: ['IN_PROGRESS', 'ACTION_TAKEN', 'RESOLVED', 'CLOSED'].includes(incident.status) },
    { label: 'Resolved', completed: ['RESOLVED', 'CLOSED'].includes(incident.status) },
  ];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link href="/student/incidents" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Back to My Cases
        </Link>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2.2rem', margin: '0 0 8px 0' }}>Case Status: {incident.case_id}</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem', background: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-blue)' }}>
            Category: {incident.category}
          </span>
          <span style={{ padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-green)' }}>
            Status: {incident.status}
          </span>
        </div>
      </div>

      {/* Progress Timeline Stepper */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem' }}>Investigation Progress</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
          {steps.map((s, idx) => (
            <div key={s.label} style={{ textAlign: 'center', padding: '12px', borderRadius: '8px', background: s.completed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'inline-flex', marginBottom: '8px' }}>
                {s.completed ? <CheckCircle size={24} color="var(--accent-green)" /> : <AlertCircle size={24} color="var(--text-muted)" />}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: s.completed ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                {idx + 1}. {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Description & Responder Handling */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={20} color="var(--accent-blue)" /> Your Report
        </h3>
        <p style={{ lineHeight: '1.6', marginBottom: '16px', color: 'var(--text-primary)' }}>
          {incident.description}
        </p>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <Clock size={14} style={{ display: 'inline', marginRight: '6px' }} />
            Submitted: {new Date(incident.created_at).toLocaleString()}
          </div>
          <div>
            Handling Team: <strong>{assignedResponder ? `${assignedResponder.department} (${assignedResponder.role})` : 'Dispatched to Campus Duty Team'}</strong>
          </div>
        </div>
      </div>

      {/* Reported Location (Only student's own location, never disclosing staff location) */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={20} color="var(--accent-red)" /> Incident Location
        </h3>
        {incident.latitude && incident.longitude ? (
          <div>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Coordinates recorded with your report consent: {incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}
            </p>
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${incident.latitude},${incident.longitude}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--accent-blue)', textDecoration: 'underline', fontSize: '0.9rem' }}
            >
              View on External Map ↗
            </a>
          </div>
        ) : (
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            No GPS coordinates were attached to this report.
          </p>
        )}
      </div>

      {/* Evidence Attachments */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={20} color="var(--accent-purple)" /> Uploaded Evidence ({evidenceList.length})
        </h3>
        {evidenceList.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
            No media or files attached to this report.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {evidenceList.map((f) => (
              <div key={f.id} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{f.file_name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{Math.round(f.file_size / 1024)} KB</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentIncidentDetail() {
  return (
    <Suspense fallback={<div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px' }}>Loading case details...</div>}>
      <StudentIncidentDetailContent />
    </Suspense>
  );
}
