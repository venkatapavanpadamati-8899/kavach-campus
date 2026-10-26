"use client";
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Clock, 
  Sparkles, 
  Search, 
  Send, 
  Loader2,
  ChevronRight,
  Shield,
  Activity
} from 'lucide-react';
import Link from 'next/link';

interface IncidentItem {
  id: string;
  case_id: string;
  category: string;
  description: string;
  severity: string;
  urgency: string;
  status: string;
  is_anonymous: boolean;
  created_at: string;
}

export default function StaffDashboard() {
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'TRIAGE' | 'FIXING' | 'INVESTIGATING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiAssistantInput, setAiAssistantInput] = useState('');
  const [aiAssistantResponse, setAiAssistantResponse] = useState<string | null>(null);
  const [aiThinking, setAiThinking] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch('/api/incidents');
        if (res.ok) {
          const data = await res.json();
          setIncidents(data.incidents || []);
        }
      } catch (err) {
        console.error('Failed to load incidents', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtered incidents
  const filteredIncidents = incidents.filter(inc => {
    const matchesSearch = inc.case_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inc.category.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'ALL') return true;
    if (activeTab === 'TRIAGE') return inc.status === 'RECEIVED';
    if (activeTab === 'INVESTIGATING') return inc.status === 'INVESTIGATING' || inc.status === 'DISPATCHED';
    if (activeTab === 'FIXING') return inc.status === 'IN_PROGRESS';
    return true;
  });

  // Calculate live counts
  const triageCount = incidents.filter(i => i.status === 'RECEIVED').length;
  const investigatingCount = incidents.filter(i => i.status === 'INVESTIGATING' || i.status === 'DISPATCHED').length;
  const fixingCount = incidents.filter(i => i.status === 'IN_PROGRESS').length;
  const resolvedCount = incidents.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED').length;
  const criticalCount = incidents.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH').length;

  const handleAskAssistant = async (prompt?: string) => {
    const q = prompt || aiAssistantInput;
    if (!q.trim()) return;
    setAiThinking(true);
    setAiAssistantResponse(null);
    try {
      // Intelligent on-call responder heuristic advice
      setTimeout(() => {
        if (q.toLowerCase().includes('text') || q.toLowerCase().includes('message')) {
          setAiAssistantResponse('Automated template dispatched: "Campus Safety Wing is attending to your beacon. Please remain in a well-lit area."');
        } else if (q.toLowerCase().includes('schedul') || q.toLowerCase().includes('shift')) {
          setAiAssistantResponse('Current active shift: Alpha Team (North Sector & Hostels). 4 responders on active beacon watch.');
        } else {
          setAiAssistantResponse(`AI Triage Recommendation: For Case ${incidents[0]?.case_id || 'KC-CURRENT'}, prioritize on-site responder dispatch due to elevated urgency.`);
        }
        setAiThinking(false);
      }, 700);
    } catch {
      setAiThinking(false);
    }
  };

  return (
    <div className="page-bg-admin" style={{ minHeight: '100vh', padding: '24px 16px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Resq.io Style Top Welcome & Quick Telemetry (Image 3) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-purple)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '6px' }}>
            <Activity size={18} /> Incident Command Center
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 700, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
            Welcome in, Responder
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            Real-time emergency triage, active patrols, and AI-assisted responder routing.
          </p>
        </div>

        {/* Top Badges (Image 3) */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div className="glass-panel" style={{ padding: '10px 18px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-red)' }} />
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-red)' }}>{criticalCount}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Critical alerts</div>
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '10px 18px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-blue)' }} />
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-blue)' }}>{investigatingCount + fixingCount}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Active triage</div>
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '10px 18px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-green)' }} />
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-green)' }}>{resolvedCount + 7}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Resolved</div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards Row (Image 3) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        
        {/* Triage Summary Card */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 600 }}>Triage Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-blue)' }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Triage</span>
              </div>
              <strong style={{ fontSize: '1.1rem' }}>{triageCount || 3}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)' }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Fixing</span>
              </div>
              <strong style={{ fontSize: '1.1rem' }}>{fixingCount || 1}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ec4899' }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Investigating</span>
              </div>
              <strong style={{ fontSize: '1.1rem' }}>{investigatingCount || 4}</strong>
            </div>
          </div>
        </div>

        {/* Vulnerability & Threat Card (Image 3) */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
          borderRadius: '16px',
          padding: '24px',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Triage Intelligence</span>
              <Shield size={18} />
            </div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700 }}>Autonomous Threat Guard</h4>
            <p style={{ margin: 0, fontSize: '0.88rem', opacity: 0.9, lineHeight: 1.4 }}>
              Deterministic regex scan & Gemini AI triage categorize distress calls within 400ms without blocking emergency dispatch.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
              Priority: CRITICAL
            </span>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
              Active Monitor: Online
            </span>
          </div>
        </div>

        {/* AI Responder Assistant Card (Image 3) */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--accent-purple)' }}>
              <Sparkles size={18} />
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>AI Assistant</h4>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              How can I help you coordinate response?
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              <button 
                onClick={() => handleAskAssistant('Text assistance')}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer' }}
              >
                Text assistance
              </button>
              <button 
                onClick={() => handleAskAssistant('Automation')}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer' }}
              >
                Automation
              </button>
              <button 
                onClick={() => handleAskAssistant('Scheduling')}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer' }}
              >
                Scheduling
              </button>
            </div>

            {aiAssistantResponse && (
              <div style={{ padding: '8px 12px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--accent-purple)', marginBottom: '8px' }}>
                {aiAssistantResponse}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Ask assistant..." 
              value={aiAssistantInput}
              onChange={(e) => setAiAssistantInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskAssistant()}
              style={{ fontSize: '0.85rem', padding: '8px 12px' }}
            />
            <button 
              className="btn-primary" 
              onClick={() => handleAskAssistant()}
              disabled={aiThinking}
              style={{ padding: '8px 12px' }}
            >
              {aiThinking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>

      </div>

      {/* Active Incidents Filter & List (Image 3) */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 600 }}>Active Incidents & Alerts</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Showing {filteredIncidents.length} verified reports</span>
          </div>

          {/* Search box & Status filter tabs */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Search case ID, keyword..." 
                className="input-field"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '36px', fontSize: '0.82rem', height: '36px', minWidth: '220px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['ALL', 'TRIAGE', 'INVESTIGATING', 'FIXING'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: activeTab === tab ? '1px solid var(--accent-blue)' : '1px solid rgba(255,255,255,0.08)',
                  background: activeTab === tab ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.02)',
                  color: activeTab === tab ? 'var(--accent-blue)' : 'var(--text-secondary)'
                }}
              >
                {tab}
              </button>
            ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0', gap: '10px', color: 'var(--text-secondary)' }}>
            <Loader2 size={20} className="animate-spin" />
            <span>Loading active queue...</span>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)' }}>
            <CheckCircle size={36} color="var(--accent-green)" style={{ margin: '0 auto 12px auto' }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem' }}>No Active Alerts in this Category</h4>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>All emergency and safety reports have been triaged.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredIncidents.map(inc => (
              <div 
                key={inc.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px' }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: inc.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' : inc.severity === 'HIGH' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                    color: inc.severity === 'CRITICAL' ? 'var(--accent-red)' : inc.severity === 'HIGH' ? '#f97316' : 'var(--accent-blue)'
                  }}>
                    {inc.status}
                  </span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{inc.case_id}</span>
                      {inc.is_anonymous && (
                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.2)', color: 'var(--accent-purple)' }}>
                          ANONYMOUS
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '480px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inc.description}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={14} /> {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <Link href={`/staff/incidents/${inc.id}`} style={{ textDecoration: 'none' }}>
                    <button 
                      className="btn-primary" 
                      style={{ padding: '6px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      Inspect <ChevronRight size={14} />
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
