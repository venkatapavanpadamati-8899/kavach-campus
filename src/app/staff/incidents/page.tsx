import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import { Incident } from '@/types';

export const dynamic = 'force-dynamic';
export default async function StaffIncidentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?redirect=/staff/incidents');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, college_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Staff incident profile lookup failed:', profileError);
    throw new Error('Unable to verify access to staff incidents.');
  }
  if (!profile) {
    redirect('/unauthorized');
  }
  if (profile.role === 'STUDENT') {
    redirect('/student');
  }

  const platformAdmin = profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN';
  const securityRoles = ['SECURITY'];
  const staffRoles = [
    'STAFF',
    'MENTOR',
    'COUNSELLOR',
    'COUNSELOR',
    'WOMENS_CELL',
    'WARDEN',
    'HOD',
    'PRINCIPAL',
    'MANAGEMENT',
    'MANAGEMENT_ADMIN',
    ...securityRoles,
  ];
  if (!platformAdmin && !staffRoles.includes(profile.role)) {
    redirect('/unauthorized');
  }

  const collegeId = profile.college_id && profile.college_id !== 'PENDING_CAMPUS_VERIFICATION'
    ? profile.college_id
    : null;
  if (!platformAdmin && !collegeId) {
    redirect('/unauthorized');
  }

  let query = supabase
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: false });

  if (!platformAdmin && collegeId) {
    query = query.eq('college_id', collegeId);
  }
  if (!platformAdmin && !securityRoles.includes(profile.role)) {
    query = query.or(`assigned_to.eq.${user.id},assigned_to.is.null`);
  }

  const { data, error: incidentsError } = await query;
  if (incidentsError) {
    console.error('Staff incident query failed:', incidentsError);
    throw new Error('Unable to load staff incidents.');
  }
  const incidents: Incident[] = data || [];

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
