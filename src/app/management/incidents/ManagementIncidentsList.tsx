"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ShieldAlert, Clock, Search, Filter, 
  ArrowRight, UserX, Eye
} from 'lucide-react';

interface IncidentItem {
  id: string;
  case_id: string;
  title?: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  is_anonymous: boolean;
  student_id: string | null;
  created_at: string;
  assigned_to: string | null;
}

interface Props {
  initialIncidents: IncidentItem[];
  userRole: string;
}

export default function ManagementIncidentsList({ initialIncidents, userRole }: Props) {
  const [incidents] = useState<IncidentItem[]>(initialIncidents);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredIncidents = useMemo(() => {
    return incidents.filter((item) => {
      // Search match
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !query ||
        item.case_id.toLowerCase().includes(query) ||
        (item.title && item.title.toLowerCase().includes(query)) ||
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);

      // Severity match
      const matchesSeverity = severityFilter === 'ALL' || item.severity === severityFilter;

      // Status match
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [incidents, searchQuery, severityFilter, statusFilter]);

  const metrics = useMemo(() => {
    return {
      total: incidents.length,
      critical: incidents.filter((i) => i.severity === 'CRITICAL').length,
      active: incidents.filter((i) => !['RESOLVED', 'CLOSED', 'FALSE_ALARM'].includes(i.status)).length,
      resolved: incidents.filter((i) => ['RESOLVED', 'CLOSED'].includes(i.status)).length,
    };
  }, [incidents]);

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'RESOLVED':
      case 'CLOSED':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'IN_PROGRESS':
      case 'ACTION_TAKEN':
        return 'bg-blue-500/20 text-blue-400';
      case 'ASSIGNED':
        return 'bg-purple-500/20 text-purple-400';
      default:
        return 'bg-amber-500/20 text-amber-400';
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', margin: '0 0 6px 0', fontWeight: 700 }}>Management Incident Console</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Unified campus oversight, case assignment, escalation and audit tracking. Logged in as: <strong>{userRole}</strong>
          </p>
        </div>
      </div>

      {/* Metrics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid var(--accent-blue)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Incidents</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '4px' }}>{metrics.total}</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid var(--accent-red)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Critical Incidents</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-red)', marginTop: '4px' }}>{metrics.critical}</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Active / Pending</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>{metrics.active}</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Resolved</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>{metrics.resolved}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by Case ID, keyword, category or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ width: '100%', paddingLeft: '40px', margin: 0 }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={14} /> Severity:
            </span>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={severityFilter === sev ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
              >
                {sev}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status:</span>
            {['ALL', 'RECEIVED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={statusFilter === st ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Incidents List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredIncidents.length === 0 ? (
          <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
            <ShieldAlert size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>No matching incidents found</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Try clearing filters or search query.</p>
          </div>
        ) : (
          filteredIncidents.map((incident) => (
            <div 
              key={incident.id} 
              className="glass-panel" 
              style={{ 
                padding: '20px 24px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                gap: '20px',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ flex: '1 1 500px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                    {incident.case_id}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getSeverityBadgeClass(incident.severity)}`}>
                    {incident.severity}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(incident.status)}`}>
                    {incident.status}
                  </span>
                  {incident.is_anonymous && (
                    <span 
                      style={{ 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem', 
                        background: 'rgba(168, 85, 247, 0.15)', 
                        color: '#c084fc',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <UserX size={12} /> Anonymous Report
                    </span>
                  )}
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {incident.category}
                  </span>
                </div>

                <p style={{ color: 'var(--text-secondary)', margin: '0 0 12px 0', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  {incident.description}
                </p>

                <div style={{ display: 'flex', gap: '20px', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={13} /> {new Date(incident.created_at).toLocaleString()}
                  </span>
                  <span>
                    Assignee: <strong>{incident.assigned_to ? 'Assigned' : 'Unassigned'}</strong>
                  </span>
                </div>
              </div>

              <div>
                <Link href={`/management/incidents/${incident.id}`}>
                  <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                    <Eye size={16} /> Review Case <ArrowRight size={14} />
                  </button>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
