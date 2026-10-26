import React from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '40px' }}>
          &larr; Back to Home
        </Link>
        <div className="glass-panel" style={{ padding: '60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <Lock size={32} color="var(--accent-purple)" />
            <h1 style={{ fontSize: '2.5rem' }}>Privacy Policy</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '24px' }}>
            At Kavach Campus, we enforce strict zero-trust data policies. Your location is ONLY tracked when you explicitly activate a Safe Walk or an SOS alert.
          </p>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.8, paddingLeft: '24px' }}>
            <li style={{ marginBottom: '12px' }}><strong>Medical Data:</strong> Fully encrypted, accessible only to certified emergency responders during an active incident.</li>
            <li style={{ marginBottom: '12px' }}><strong>Location:</strong> Never logged in the background without explicit activation.</li>
            <li style={{ marginBottom: '12px' }}><strong>Anonymity:</strong> Anonymous reports strip all IP and user agent metadata before reaching the database.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
