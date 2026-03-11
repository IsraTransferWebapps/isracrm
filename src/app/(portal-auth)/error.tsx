'use client';

import { useEffect } from 'react';

/**
 * Error boundary for portal authenticated pages.
 * Shows the actual error message instead of the generic Next.js error page.
 */
export default function PortalAuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Portal auth error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-[#E2E8F0] p-6">
        <h2 className="text-lg font-semibold text-[#253859] mb-2">Something went wrong</h2>
        <p className="text-sm text-[#717D93] mb-4">
          {error.message || 'An unexpected error occurred.'}
        </p>
        {error.digest && (
          <p className="text-xs text-[#94A3B8] mb-4">Error ID: {error.digest}</p>
        )}
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 text-sm font-medium text-white bg-[#01A0FF] rounded-lg hover:bg-[#0090E0]"
          >
            Try again
          </button>
          <a
            href="/portal/register"
            className="px-4 py-2 text-sm font-medium text-[#717D93] border border-[#E2E8F0] rounded-lg hover:bg-[#F4F5F7]"
          >
            Back to registration
          </a>
        </div>
      </div>
    </div>
  );
}
