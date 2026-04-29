'use client';

/**
 * Global error boundary — last-resort fallback for errors that escape every
 * other layer (including the root layout). Per Next.js App Router convention,
 * this MUST render its own <html> and <body> because it replaces the root
 * layout when triggered.
 *
 * No provider tree is available here (no IntlProvider, no theme, no auth) —
 * keep the markup self-contained and minimal.
 *
 * SPEC-ARCH-UI-001 §11 (Error Handling) L1.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en-IN">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          backgroundColor: '#0a0a0a',
          color: '#e6e6e6',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: '480px',
            border: '1px solid #2a2a2a',
            borderRadius: '6px',
            padding: '32px',
            backgroundColor: '#141414',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
            BN DMS is unavailable
          </h1>
          <p style={{ marginTop: '12px', fontSize: '14px', color: '#a0a0a0' }}>
            An unexpected error broke the application shell. Please reload the
            page. If the problem persists, contact support with the digest
            below.
          </p>
          <pre
            style={{
              marginTop: '16px',
              padding: '12px',
              borderRadius: '4px',
              backgroundColor: '#0a0a0a',
              border: '1px solid #2a2a2a',
              fontSize: '12px',
              color: '#a0a0a0',
              fontFamily: 'ui-monospace, SF Mono, monospace',
              wordBreak: 'break-all',
              whiteSpace: 'pre-wrap',
            }}
          >
            {process.env.NODE_ENV !== 'production'
              ? error.message
              : error.digest
              ? `digest: ${error.digest}`
              : 'An unexpected error occurred.'}
          </pre>
          <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={reset}
              style={{
                height: '36px',
                padding: '0 16px',
                borderRadius: '6px',
                border: '1px solid #3b82f6',
                backgroundColor: '#3b82f6',
                color: 'white',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="/dashboard"
              style={{
                height: '36px',
                padding: '0 16px',
                borderRadius: '6px',
                border: '1px solid #2a2a2a',
                backgroundColor: 'transparent',
                color: '#e6e6e6',
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Go to dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
