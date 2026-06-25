'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Global error boundary for the app.
 * Catches unhandled errors and shows a friendly recovery UI
 * instead of crashing the entire application.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem',
        textAlign: 'center',
        gap: '1.25rem',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 'var(--radius-lg, 16px)',
          background: 'rgba(220, 38, 38, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AlertTriangle size={32} style={{ color: '#dc2626' }} />
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
        Something went wrong
      </h2>
      <p style={{ color: 'var(--text-muted, #8e9fae)', maxWidth: 400, margin: 0 }}>
        An unexpected error occurred. You can try again or refresh the page.
      </p>
      <button
        onClick={reset}
        className="btn btn-primary"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginTop: '0.5rem',
        }}
      >
        <RefreshCw size={16} />
        Try Again
      </button>
    </div>
  );
}
