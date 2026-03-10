'use client';

import { OnboardingAuthProvider } from '@/components/providers/onboarding-auth-provider';
import { PortalSidebar } from './portal-sidebar';

/**
 * Wraps authenticated portal pages with the sidebar + main content layout.
 * The OnboardingAuthProvider is needed for the sidebar's sign-out button.
 */
export function PortalAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingAuthProvider>
      <PortalSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto w-full px-4 py-8">
            {children}
          </div>
        </main>
        <footer className="border-t border-[#E2E8F0] bg-white mt-auto">
          <div className="max-w-3xl mx-auto px-4 py-4 text-center">
            <p className="text-[11px] text-[#94A3B8]">
              IsraTransfer Ltd &mdash; Licence No. 57488 &mdash; Regulated by the Israel Securities Authority
            </p>
          </div>
        </footer>
      </div>
    </OnboardingAuthProvider>
  );
}
