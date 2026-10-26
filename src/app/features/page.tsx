import React from 'react';
import Link from 'next/link';
import { Navigation, AlertTriangle, Shield, Eye } from 'lucide-react';

export default function FeaturesPage() {
  const features = [
    { icon: <AlertTriangle />, title: 'Emergency SOS', desc: 'Instantly notify security and trusted contacts with your live location.' },
    { icon: <Navigation />, title: 'Safe Walk', desc: 'A dead-man switch timer and location tracker for walking home late.' },
    { icon: <Shield />, title: 'Role-Based Access Control', desc: 'Enterprise-grade security ensuring data is only visible to authorized personnel.' },
    { icon: <Eye />, title: 'Anonymous Reporting', desc: 'Submit evidence securely without compromising your identity.' }
  ];

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '40px' }}>
          &larr; Back to Home
        </Link>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '40px', textAlign: 'center' }}>Platform Features</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          {features.map((f, i) => (
            <div key={i} className="glass-panel" style={{ padding: '32px', display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', color: 'var(--accent-blue)' }}>
                {f.icon}
              </div>
              <div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{f.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
