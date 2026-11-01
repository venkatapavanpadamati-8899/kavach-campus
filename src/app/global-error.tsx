"use client";

import React from 'react';

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#0a0a0c', color: '#fff' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '12px' }}>Something went wrong!</h2>
          <p style={{ color: '#94a3b8', maxWidth: '460px', marginBottom: '24px' }}>
            An unexpected application error occurred. You can attempt to recover by refreshing the page.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: '12px 28px',
              borderRadius: '10px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

