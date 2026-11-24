"use client";
import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  Loader2, 
  FileText, 
  Search, 
  ArrowRight,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { Incident } from '@/types';
import { getActiveCollegeTenant } from '@/lib/college-branding';

export default function MyCasesPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTenant, setActiveTenant] = useState(getActiveCollegeTenant());

  useEffect(() => {
    setActiveTenant(getActiveCollegeTenant());
    async function fetchCases() {
      try {
        const res = await fetch('/api/incidents');
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to load case records');
        }
        const data = await res.json();
        setIncidents(data.incidents || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error fetching cases');
      } finally {
        setLoading(false);
      }
    }
    fetchCases();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return 'var(--accent-blue)';
      case 'IN_PROGRESS':
      case 'DISPATCHED':
        return 'var(--accent-purple)';
      case 'RESOLVED':
        return 'var(--accent-green)';
      case 'CANCELLED':
        return 'var(--text-muted)';
      default:
        return 'var(--accent-yellow)';
    }
  };

  const getSeverityBadge = (severity?: string) => {
    switch (severity) {
      case 'CRITICAL':
        return { label: 'CRITICAL', bg: 'rgba(239, 68, 68, 0.2)', color: 'var(--accent-red)' };
      case 'HIGH':
        return { label: 'HIGH', bg: 'rgba(249, 115, 22, 0.2)', color: '#f97316' };
      case 'MEDIUM':
        return { label: 'MEDIUM', bg: 'rgba(234, 179, 8, 0.2)', color: '#eab308' };
      default:
        return { label: 'LOW', bg: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-blue)' };
    }
  };

  const filtered = incidents.filter((inc) => {
    const matchesStatus = filterStatus === 'ALL' || inc.status === filterStatus;
    const matchesSearch = 
      !searchQuery.trim() ||
      (inc.case_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inc.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inc.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 700, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
            My Safety Cases
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1rem' }}>
            Track and monitor official case progression with {activeTenant.shortName} Redressal Committee.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/student/report">
            <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px' }}>
              <Plus size={18} /> File Report
            </button>
          </Link>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '14px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search by Case ID, keyword, or category..."
            className="input-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '38px', fontSize: '0.9rem', width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['ALL', 'RECEIVED', 'IN_PROGRESS', 'RESOLVED'].map((statusKey) => (
            <button
              key={statusKey}
              onClick={() => setFilterStatus(statusKey)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: filterStatus === statusKey ? 'var(--accent-purple)' : 'rgba(255, 255, 255, 0.05)',
                color: filterStatus === statusKey ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}
            >
              {statusKey === 'ALL' ? 'All' : statusKey.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px auto', color: 'var(--accent-blue)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading your verified cases...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--accent-red)' }}>
          <AlertTriangle size={36} style={{ margin: '0 auto 12px auto' }} />
          <p>{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center', borderRadius: '16px' }}>
          <Shield size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>No cases found</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '380px', margin: '0 auto 24px auto' }}>
            {searchQuery || filterStatus !== 'ALL' 
              ? 'No reports match your current search query or status filter.' 
              : 'You have not submitted any complaints yet. Kavach is active to protect your campus rights.'}
          </p>
          <Link href="/student/report">
            <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} /> File a Report
            </button>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filtered.map((incident) => {
            const sev = getSeverityBadge(incident.severity);
            return (
              <div
                key={incident.id}
                className="glass-panel"
                style={{
                  padding: '24px',
                  borderRadius: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <div style={{ flex: '1 1 340px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                      {incident.case_id}
                    </h3>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: `${getStatusColor(incident.status)}20`,
                        color: getStatusColor(incident.status),
                        border: `1px solid ${getStatusColor(incident.status)}40`
                      }}
                    >
                      {incident.status}
                    </span>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: sev.bg,
                        color: sev.color
                      }}
                    >
                      {sev.label}
                    </span>
                    {incident.is_anonymous && (
                      <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)' }}>
                        Anonymous
                      </span>
                    )}
                  </div>

                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      margin: '0 0 14px 0',
                      fontSize: '0.95rem',
                      lineHeight: '1.5',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {incident.description}
                  </p>

                  <div style={{ display: 'flex', gap: '20px', fontSize: '0.82rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} /> Filed: {new Date(incident.created_at).toLocaleString()}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FileText size={14} /> Category: <strong>{incident.category}</strong>
                    </span>
                    {incident.latitude != null && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-blue)' }}>
                        <MapPin size={14} /> GPS Tagged ({incident.latitude.toFixed(4)}, {incident.longitude?.toFixed(4)})
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <Link href={`/student/incidents/${incident.id}`}>
                    <button
                      className="btn-secondary"
                      style={{
                        fontSize: '0.85rem',
                        padding: '10px 18px',
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      View Case Details <ArrowRight size={14} />
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
