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

interface OnboardingShellProps {
  currentStep: OnboardingStep;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function OnboardingShell({ currentStep, title, subtitle, children }: OnboardingShellProps) {
  const router = useRouter();
  const { signOut } = useOnboarding();

  const { showWarning, dismissWarning } = useInactivityTimeout(
    async () => {
      await signOut();
      router.push('/onboard/login');
    },
    15 * 60 * 1000, // 15 minutes
    60 * 1000 // 1 minute warning
  );

  return (
    <div>
      <ProgressBar currentStep={currentStep} />

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
