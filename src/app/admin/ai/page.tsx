import { Brain, Settings } from 'lucide-react';
export default function AdminAIPage() {
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Gemini AI Control</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Configure automated risk assessment and routing parameters.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        <div className="glass-panel" style={{ padding: '32px', display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '16px', borderRadius: '12px' }}>
            <Brain size={32} color="var(--accent-purple)" />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>AI Engine Status</h2>
            <div style={{ display: 'flex', gap: '24px' }}>
              <div>
                <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>Model Version</span>
                <span style={{ fontWeight: 500 }}>Gemini 1.5 Pro</span>
              </div>
              <div>
                <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>Status</span>
                <span style={{ color: 'var(--accent-green)', fontWeight: 500 }}>Operational</span>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Settings color="var(--accent-blue)" /> Auto-Escalation Thresholds
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0' }}>Critical Threat Score</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Automatically page security if AI score exceeds this value.</p>
              </div>
              <input type="number" defaultValue="80" className="input-field" style={{ width: '80px', textAlign: 'center' }} />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0' }}>Spam Filtering</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Auto-reject submissions flagged as spam with confidence %.</p>
              </div>
              <input type="number" defaultValue="95" className="input-field" style={{ width: '80px', textAlign: 'center' }} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
