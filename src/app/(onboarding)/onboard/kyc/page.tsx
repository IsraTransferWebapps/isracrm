'use client';

import { useEffect, useState } from 'react';
import { OnboardingAuthProvider, useOnboarding } from '@/components/providers/onboarding-auth-provider';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { GdprNotice } from '@/components/onboarding/gdpr-notice';
import { KycIndividualForm } from '@/components/onboarding/kyc-individual-form';
import { KycCorporateForm } from '@/components/onboarding/kyc-corporate-form';
import { Skeleton } from '@/components/ui/skeleton';

function KycPageContent() {
  const { session, clientId, clientType, loading } = useOnboarding();
  const [showGdpr, setShowGdpr] = useState(false);

  useEffect(() => {
    // Show GDPR notice if not yet accepted on session
    if (session && !session.gdpr_consent) {
      setShowGdpr(true);
    }
  }, [session]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!session || !clientId) {
    return <p className="text-sm text-[#717D93]">Session not found. Please register first.</p>;
  }

  return (
    <>
      <GdprNotice open={showGdpr} onAccept={() => setShowGdpr(false)} />

      <OnboardingShell
        currentStep="kyc"
        title="Know Your Customer (KYC)"
        subtitle="We are required by law to verify your identity and understand the nature of your transactions."
      >
        {clientType === 'corporate' ? (
          <KycCorporateForm sessionId={session.id} clientId={clientId} stepData={session.step_data} />
        ) : (
          <KycIndividualForm sessionId={session.id} clientId={clientId} stepData={session.step_data} />
        )}
      </OnboardingShell>
    </>
  );
}

export default function KycPage() {
  return (
    <OnboardingAuthProvider>
      <KycPageContent />
    </OnboardingAuthProvider>
  );
}
