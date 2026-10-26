import React from 'react';
import Link from 'next/link';
import { Shield } from 'lucide-react';

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '40px' }}>
          &larr; Back to Home
        </Link>
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
          <Shield size={48} color="var(--accent-purple)" style={{ margin: '0 auto 24px' }} />
          <h1 style={{ fontSize: '2.5rem', marginBottom: '24px' }}>About Kavach Campus</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '24px', textAlign: 'left' }}>
            Kavach Campus was engineered with a singular mission: to provide an impenetrable layer of safety for educational institutions. 
            By leveraging real-time GPS tracking, automated AI threat analysis, and instantaneous emergency broadcasting, we bridge the gap between 
            students and security personnel.
          </p>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '24px', textAlign: 'left' }}>
            Our infrastructure is designed for speed and reliability. Whether it&apos;s a late-night Safe Walk, an anonymous tip, or an active 
            emergency, the system operates securely in the background, ready to escalate incidents to authorized staff in milliseconds.
          </p>
          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-color)', textAlign: 'left' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '12px', color: 'var(--text-primary)' }}>Supported Institutions</h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Kavach Campus provides multi-college tenant isolation and dedicated campus safety infrastructure for partner institutions, 
              including <strong>SRKR Engineering College</strong> (Bhimavaram) and <strong>Vishnu Institute of Technology</strong> (Bhimavaram).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
