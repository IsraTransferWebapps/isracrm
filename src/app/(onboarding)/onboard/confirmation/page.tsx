'use client';

import { useEffect, useState } from 'react';
import { OnboardingAuthProvider, useOnboarding } from '@/components/providers/onboarding-auth-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Clock, Mail } from 'lucide-react';

function ConfirmationContent() {
  const { session, clientId, loading } = useOnboarding();
  const [referenceId, setReferenceId] = useState<string>('');

  useEffect(() => {
    // Generate a display reference from the session ID
    if (session?.id) {
      setReferenceId(`IST-${session.id.slice(0, 8).toUpperCase()}`);
    }
  }, [session]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!session || !clientId) {
    return <p className="text-sm text-[#717D93]">Session not found.</p>;
  }

  return (
    <div className="max-w-lg mx-auto text-center py-12">
      {/* Success icon */}
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
      </div>

      <h1 className="text-2xl font-semibold text-[#253859] mb-2">
        Application Submitted
      </h1>
      <p className="text-[#717D93] mb-8">
        Your onboarding application has been received and is now pending review by our compliance team.
      </p>

      {/* Reference number */}
      <div className="bg-[#F4F5F7] rounded-lg p-4 mb-8 inline-block">
        <p className="text-xs text-[#717D93] mb-1">Reference Number</p>
        <p className="text-lg font-mono font-semibold text-[#253859]">{referenceId}</p>
      </div>

      {/* Next steps */}
      <div className="text-left bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-4">
        <h2 className="font-medium text-[#253859]">What happens next?</h2>

        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-[#01A0FF] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-[#253859]">Compliance Review</p>
            <p className="text-sm text-[#717D93]">
              Our compliance team will review your application and supporting documents. This typically takes 1-3 business days.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-[#01A0FF] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-[#253859]">Email Notification</p>
            <p className="text-sm text-[#717D93]">
              You will receive an email notification once your application has been reviewed. If additional information is needed, we will contact you directly.
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-[#94A3B8] mt-8">
        If you have any questions, please contact our team at{' '}
        <a href="mailto:compliance@isratransfer.com" className="text-[#01A0FF] hover:underline">
          compliance@isratransfer.com
        </a>
      </p>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <OnboardingAuthProvider>
      <ConfirmationContent />
    </OnboardingAuthProvider>
  );
}
