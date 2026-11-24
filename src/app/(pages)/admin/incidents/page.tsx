import Link from 'next/link';
import { Download, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Incident } from '@/types';
export const dynamic = 'force-dynamic';
export default async function AdminIncidentsPage() {
  const supabase = await createClient();
  const { data: incidents } = await supabase.from('incidents').select('*').order('created_at', { ascending: false });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Global Incident Audit</h1>
          <p style={{ color: 'var(--text-secondary)' }}>System-wide oversight of all security logs.</p>
        </div>
        <button className="btn-secondary" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Download size={18} /> Export CSV
        </button>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '16px', fontWeight: 500 }}>Case ID</th>
              <th style={{ padding: '16px', fontWeight: 500 }}>Category</th>
              <th style={{ padding: '16px', fontWeight: 500 }}>Severity</th>
              <th style={{ padding: '16px', fontWeight: 500 }}>Status</th>
              <th style={{ padding: '16px', fontWeight: 500 }}>Date</th>
              <th style={{ padding: '16px', fontWeight: 500 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {incidents && incidents.map((i: Incident) => (
              <tr key={i.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '16px', fontWeight: 500 }}>{i.case_id}</td>
                <td style={{ padding: '16px' }}>{i.category}</td>
                <td style={{ padding: '16px' }}>{i.severity}</td>
                <td style={{ padding: '16px' }}>{i.status}</td>
                <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                  {new Date(i.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: '16px' }}>
                  <Link href={`/admin/incidents/${i.id}`}>
                    <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ExternalLink size={14} /> Review
                    </button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
