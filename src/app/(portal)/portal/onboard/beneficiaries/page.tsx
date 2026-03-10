'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingAuthProvider, useOnboarding } from '@/components/providers/onboarding-auth-provider';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { DynamicFormRenderer } from '@/components/onboarding/dynamic-form-renderer';
import { getFormConfigClient } from '@/lib/form-config/fetch-client';
import { loadFormData } from '@/lib/form-config/load';
import { saveFormData } from '@/lib/form-config/save';
import { updateOnboardingStep } from '@/lib/onboarding/actions';
import { createClient } from '@/lib/supabase/client';
import type { FormConfig } from '@/lib/form-config/types';
import { Skeleton } from '@/components/ui/skeleton';

function BeneficiariesContent() {
  const { session, clientId, loading } = useOnboarding();
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [existingData, setExistingData] = useState<Record<string, unknown>>({});
  const [configLoading, setConfigLoading] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Fetch form config and existing data when client info is available
  useEffect(() => {
    if (!clientId) return;

    const fetchConfig = async () => {
      setConfigLoading(true);
      try {
        const config = await getFormConfigClient(supabase, 'beneficiary_declaration');
        if (config) {
          setFormConfig(config);

          // Load existing data from individual_details + beneficiary_declarations
          const data = await loadFormData(supabase, config, clientId);
          setExistingData(data);
        }
      } catch (err) {
        console.error('Failed to load beneficiary declaration config:', err);
      } finally {
        setConfigLoading(false);
      }
    };

    fetchConfig();
  }, [clientId, supabase]);

  // Handle form submission: save to DB + advance step
  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!clientId || !session || !formConfig) return;

    const result = await saveFormData(supabase, formConfig, data, clientId);

    if (!result.success) {
      throw new Error(result.error || 'Failed to save beneficiary declaration');
    }

    // Advance to the next step (FATCA)
    await updateOnboardingStep(session.id, 'fatca', { beneficiary_declaration: data });
    router.push('/portal/onboard/fatca');
  };

  if (loading || configLoading) {
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

  if (!formConfig) {
    return <p className="text-sm text-[#717D93]">Form configuration not found. Please contact support.</p>;
  }

  // Get draft data from the session's step_data
  const draftData = (session.step_data as Record<string, unknown>)?.beneficiary_declaration as
    | Record<string, unknown>
    | undefined;

  return (
    <OnboardingShell
      currentStep="beneficiaries"
      title="Beneficiary Declaration"
      subtitle="Please indicate whether you are using our services for yourself or on behalf of a third party."
    >
      <DynamicFormRenderer
        config={formConfig}
        existingData={existingData}
        draftData={draftData}
        onSubmit={handleSubmit}
        sessionId={session.id}
        stepName="beneficiary_declaration"
      />
    </OnboardingShell>
  );
}

export default function BeneficiariesPage() {
  return (
    <OnboardingAuthProvider>
      <BeneficiariesContent />
    </OnboardingAuthProvider>
  );
}
