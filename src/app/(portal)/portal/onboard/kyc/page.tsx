'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingAuthProvider, useOnboarding } from '@/components/providers/onboarding-auth-provider';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { GdprNotice } from '@/components/onboarding/gdpr-notice';
import { DynamicFormRenderer } from '@/components/onboarding/dynamic-form-renderer';
import { getFormConfigClient } from '@/lib/form-config/fetch-client';
import { loadFormData } from '@/lib/form-config/load';
import { saveFormData } from '@/lib/form-config/save';
import { updateOnboardingStep } from '@/lib/onboarding/actions';
import { createClient } from '@/lib/supabase/client';
import type { FormConfig } from '@/lib/form-config/types';
import { Skeleton } from '@/components/ui/skeleton';

function KycPageContent() {
  const { session, clientId, clientType, loading } = useOnboarding();
  const [showGdpr, setShowGdpr] = useState(false);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [existingData, setExistingData] = useState<Record<string, unknown>>({});
  const [configLoading, setConfigLoading] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // Show GDPR notice if not yet accepted on session
    if (session && !session.gdpr_consent) {
      setShowGdpr(true);
    }
  }, [session]);

  // Fetch form config and existing data when client info is available
  useEffect(() => {
    if (!clientId || !clientType) return;

    const formKey = clientType === 'corporate' ? 'kyc_corporate' : 'kyc_individual';

    const fetchConfig = async () => {
      setConfigLoading(true);
      try {
        // Fetch form config from DB
        const config = await getFormConfigClient(supabase, formKey);
        if (config) {
          setFormConfig(config);

          // Load existing data from the detail table
          const data = await loadFormData(supabase, config, clientId);
          setExistingData(data);
        }
      } catch (err) {
        console.error('Failed to load form config:', err);
      } finally {
        setConfigLoading(false);
      }
    };

    fetchConfig();
  }, [clientId, clientType, supabase]);

  // Handle form submission: save to DB + advance step
  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!clientId || !session || !formConfig) return;

    // Save form data to the appropriate table(s)
    const result = await saveFormData(supabase, formConfig, data, clientId);

    if (!result.success) {
      throw new Error(result.error || 'Failed to save KYC data');
    }

    // Advance to the next step
    await updateOnboardingStep(session.id, 'beneficiaries', { kyc: data });
    router.push('/portal/onboard/beneficiaries');
  };

  if (loading || configLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!session || !clientId) {
    return <p className="text-sm text-[#717D93]">Session not found. Please register first.</p>;
  }

  if (!formConfig) {
    return <p className="text-sm text-[#717D93]">Form configuration not found. Please contact support.</p>;
  }

  // Get draft data from the session's step_data
  const draftData = (session.step_data as Record<string, unknown>)?.kyc as Record<string, unknown> | undefined;

  return (
    <>
      <GdprNotice open={showGdpr} onAccept={() => setShowGdpr(false)} />

      <OnboardingShell
        currentStep="kyc"
        title="Know Your Customer (KYC)"
        subtitle="We are required by law to verify your identity and understand the nature of your transactions."
      >
        <DynamicFormRenderer
          config={formConfig}
          existingData={existingData}
          draftData={draftData}
          onSubmit={handleSubmit}
          sessionId={session.id}
          stepName="kyc"
        />
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
