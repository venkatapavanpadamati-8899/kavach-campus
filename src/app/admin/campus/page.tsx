import { Map, Navigation } from 'lucide-react';
export default function AdminCampusPage() {
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Campus Geometry</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Manage campus geofences, buildings, and Safe Walk routing data.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        
        <div className="glass-panel" style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Map size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <p>Geofencing Map Editor (Placeholder)</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Navigation size={18} /> Zones
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>North Campus</div>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>South Campus</div>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>Medical Wing</div>
              <button className="btn-secondary" style={{ marginTop: '8px' }}>+ Add Zone</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
