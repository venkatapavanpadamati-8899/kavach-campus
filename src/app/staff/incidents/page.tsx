import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import { Incident } from '@/types';

export const dynamic = 'force-dynamic';
export default async function StaffIncidentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let incidents: Incident[] = [];
  if (user) {
    // Only fetch incidents assigned to this staff member or unassigned ones in their zone (simplified for now)
    const { data } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) incidents = data;
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'RECEIVED': return 'var(--accent-red)';
      case 'IN_PROGRESS': return 'var(--accent-blue)';
      case 'RESOLVED': return 'var(--accent-green)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Incident Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>View and respond to campus incidents.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {incidents.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
            <CheckCircle size={48} color="var(--accent-green)" style={{ margin: '0 auto 16px' }} />
            <h3>All Clear</h3>
            <p style={{ color: 'var(--text-secondary)' }}>No active incidents require your attention.</p>
          </div>
        ) : (
          incidents.map((incident) => (
            <div key={incident.id} className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{incident.case_id}</h3>
                  <span style={{ 
                    padding: '4px 12px', 
                    borderRadius: '20px', 
                    fontSize: '0.8rem', 
                    background: `${getStatusColor(incident.status)}20`,
                    color: getStatusColor(incident.status),
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}>
                    {incident.status === 'RECEIVED' ? <AlertTriangle size={14} /> : null}
                    {incident.status}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{incident.category}</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 12px 0', maxWidth: '600px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {incident.description}
                </p>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={14} /> {new Date(incident.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
              <div>
                <Link href={`/staff/incidents/${incident.id}`}>
                  <button className="btn-secondary">Manage</button>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
