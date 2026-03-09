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

function FatcaContent() {
  const { session, clientId, loading } = useOnboarding();
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [existingData, setExistingData] = useState<Record<string, unknown>>({});
  const [configLoading, setConfigLoading] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Fetch form config and existing data
  useEffect(() => {
    if (!clientId) return;

    const fetchConfig = async () => {
      setConfigLoading(true);
      try {
        const config = await getFormConfigClient(supabase, 'fatca');
        if (config) {
          setFormConfig(config);
          const data = await loadFormData(supabase, config, clientId);
          setExistingData(data);
        }
      } catch (err) {
        console.error('Failed to load FATCA config:', err);
      } finally {
        setConfigLoading(false);
      }
    };

    fetchConfig();
  }, [clientId, supabase]);

  // Handle form submission: save FATCA data + advance step
  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!clientId || !session || !formConfig) return;

    // Add declaration metadata
    data.declaration_date = new Date().toISOString();

    const result = await saveFormData(supabase, formConfig, data, clientId);

    if (!result.success) {
      throw new Error(result.error || 'Failed to save FATCA data');
    }

    await updateOnboardingStep(session.id, 'documents', { fatca: data });
    router.push('/portal/onboard/documents');
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
    return <p className="text-sm text-[#717D93]">Session not found.</p>;
  }

  if (!formConfig) {
    return <p className="text-sm text-[#717D93]">Form configuration not found. Please contact support.</p>;
  }

  const draftData = (session.step_data as Record<string, unknown>)?.fatca as Record<string, unknown> | undefined;

  return (
    <OnboardingShell
      currentStep="fatca"
      title="Tax Declaration (FATCA / CRS)"
      subtitle="We are required to collect tax residency information under international tax reporting standards."
    >
      <DynamicFormRenderer
        config={formConfig}
        existingData={existingData}
        draftData={draftData}
        onSubmit={handleSubmit}
        sessionId={session.id}
        stepName="fatca"
      />
    </OnboardingShell>
  );
}

export default function FatcaPage() {
  return (
    <OnboardingAuthProvider>
      <FatcaContent />
    </OnboardingAuthProvider>
  );
}
