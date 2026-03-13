'use client';

import React from 'react';
import { OnboardingAuthProvider, useOnboarding } from '@/components/providers/onboarding-auth-provider';
import { PortalSidebar } from './portal-sidebar';
import { useInactivityTimeout } from '@/hooks/use-inactivity-timeout';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * Client-side error boundary that catches render errors from child components.
 */
class ShellErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PortalAuthShell error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-[#E2E8F0] p-6">
            <h2 className="text-lg font-semibold text-[#253859] mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-[#717D93] mb-4">
              {this.state.error?.message || 'An unexpected error occurred loading the portal.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-[#01A0FF] rounded-lg hover:bg-[#0090E0]"
              >
                Reload page
              </button>
              <a
                href="/portal/login"
                className="px-4 py-2 text-sm font-medium text-[#717D93] border border-[#E2E8F0] rounded-lg hover:bg-[#F4F5F7]"
              >
                Go to login
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/** Inner shell that has access to auth context for inactivity timeout */
function PortalShellInner({ children }: { children: React.ReactNode }) {
  const { signOut } = useOnboarding();
  const { showWarning, dismissWarning } = useInactivityTimeout(signOut);

  return (
    <>
      <PortalSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto w-full px-4 py-8">
            {children}
          </div>
        </main>
        <footer className="border-t border-[#E2E8F0] bg-white mt-auto">
          <div className="max-w-5xl mx-auto px-4 py-4 text-center">
            <p className="text-[11px] text-[#94A3B8]">
              IsraTransfer Ltd &mdash; Licence No. 57488 &mdash; Regulated by the Israel Securities Authority
            </p>
          </div>
        </footer>
      </div>

      {/* Inactivity timeout warning dialog */}
      <Dialog open={showWarning} onOpenChange={(open) => !open && dismissWarning()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#253859]">Session expiring</DialogTitle>
            <DialogDescription className="text-[#717D93]">
              You&apos;ve been inactive for a while. For your security, you&apos;ll be signed out shortly.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={signOut}>
              Sign out now
            </Button>
            <Button onClick={dismissWarning}>
              Stay signed in
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Wraps authenticated portal pages with the sidebar + main content layout.
 */
export function PortalAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <ShellErrorBoundary>
      <OnboardingAuthProvider>
        <PortalShellInner>{children}</PortalShellInner>
      </OnboardingAuthProvider>
    </ShellErrorBoundary>
  );
}
