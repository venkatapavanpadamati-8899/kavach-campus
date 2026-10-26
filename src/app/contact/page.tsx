import React from 'react';
import Link from 'next/link';
import { Mail, MapPin } from 'lucide-react';

export default function ContactPage() {
  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '40px' }}>
          &larr; Back to Home
        </Link>
        <div className="glass-panel" style={{ padding: '40px' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '24px' }}>Contact Support</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>For technical assistance or deployment inquiries, reach out to our team.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <Mail color="var(--accent-purple)" />
              <span>support@kavachcampus.edu</span>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <MapPin color="var(--accent-blue)" />
              <span>Security Headquarters, Admin Block</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
