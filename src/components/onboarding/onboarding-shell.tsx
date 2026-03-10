'use client';

import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/components/providers/onboarding-auth-provider';
import { useInactivityTimeout } from '@/hooks/use-inactivity-timeout';
import { ProgressBar } from './progress-bar';
import type { OnboardingStep } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface OnboardingShellProps {
  currentStep: OnboardingStep;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function OnboardingShell({ currentStep, title, subtitle, children }: OnboardingShellProps) {
  const router = useRouter();
  const { session, signOut } = useOnboarding();

  const { showWarning, dismissWarning } = useInactivityTimeout(
    async () => {
      await signOut();
      router.push('/portal/login');
    },
    15 * 60 * 1000, // 15 minutes
    60 * 1000 // 1 minute warning
  );

  return (
    <div>
      <ProgressBar currentStep={currentStep} />

      {/* Compliance feedback banner — shown when application was returned for corrections */}
      {session?.status === 'returned' && session.review_notes && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-6">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Compliance Feedback</p>
            <p className="text-sm text-amber-700 mt-0.5">{session.review_notes}</p>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#253859]">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-[#717D93]">{subtitle}</p>
        )}
      </div>

      {children}

      {/* Inactivity warning dialog */}
      <Dialog open={showWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session Timeout Warning</DialogTitle>
            <DialogDescription>
              Your session will expire in 60 seconds due to inactivity.
              Click below to continue your application.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={dismissWarning}>
              Continue Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
