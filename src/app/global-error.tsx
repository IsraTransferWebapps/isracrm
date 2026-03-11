'use client';

/**
 * Global error boundary — catches errors from layouts that the
 * route-level error.tsx cannot handle (e.g. PortalAuthShell crash).
 *
 * In Next.js App Router, error.tsx only catches page errors.
 * global-error.tsx catches everything including root / nested layout errors.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F8FAFC',
            padding: '1rem',
          }}
        >
          <div
            style={{
              maxWidth: '28rem',
              width: '100%',
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              border: '1px solid #E2E8F0',
              padding: '1.5rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <h2
              style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: '#253859',
                marginBottom: '0.5rem',
              }}
            >
              Something went wrong
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#717D93',
                marginBottom: '1rem',
              }}
            >
              {error.message || 'An unexpected error occurred.'}
            </p>
            {error.digest && (
              <p
                style={{
                  fontSize: '0.75rem',
                  color: '#94A3B8',
                  marginBottom: '1rem',
                }}
              >
                Error ID: {error.digest}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={reset}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'white',
                  backgroundColor: '#01A0FF',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
              <a
                href="/portal/login"
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#717D93',
                  border: '1px solid #E2E8F0',
                  borderRadius: '0.5rem',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Go to login
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
