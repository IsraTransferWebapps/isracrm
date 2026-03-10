'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingAuthProvider, useOnboarding } from '@/components/providers/onboarding-auth-provider';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { DynamicFormRenderer } from '@/components/onboarding/dynamic-form-renderer';
import { SignaturePad } from '@/components/onboarding/signature-pad';
import { SectionCard } from '@/components/onboarding/section-card';
import { getFormConfigClient } from '@/lib/form-config/fetch-client';
import { loadFormData } from '@/lib/form-config/load';
import { saveFormData } from '@/lib/form-config/save';
import { updateOnboardingStep } from '@/lib/onboarding/actions';
import { createClient } from '@/lib/supabase/client';
import type { FormConfig } from '@/lib/form-config/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

function BeneficiariesContent() {
  const { session, clientId, loading } = useOnboarding();
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [existingData, setExistingData] = useState<Record<string, unknown>>({});
  const [configLoading, setConfigLoading] = useState(true);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [existingSignatureUrl, setExistingSignatureUrl] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState(false);
  const signatureSectionRef = useRef<HTMLDivElement>(null);
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

          // Check for existing signature on beneficiary declarations
          // Query the first beneficiary declaration for the signature (all share the same)
          const { data: benefDecl } = await supabase
            .from('beneficiary_declarations')
            .select('signature_image')
            .eq('client_id', clientId)
            .is('deleted_at', null)
            .limit(1)
            .maybeSingle();

          if (benefDecl?.signature_image) {
            const { data: signedUrlData } = await supabase.storage
              .from('onboarding-documents')
              .createSignedUrl(benefDecl.signature_image, 3600);
            if (signedUrlData?.signedUrl) {
              setExistingSignatureUrl(signedUrlData.signedUrl);
              setSignatureDataUrl('existing');
            }
          }
        }
      } catch (err) {
        console.error('Failed to load beneficiary declaration config:', err);
      } finally {
        setConfigLoading(false);
      }
    };

    fetchConfig();
  }, [clientId, supabase]);

  // Memoize the signature change handler
  const handleSignatureChange = useCallback((dataUrl: string | null) => {
    setSignatureDataUrl(dataUrl);
    if (dataUrl) setSignatureError(false);
  }, []);

  // Handle form submission: validate signature, upload it, save data, advance step
  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!clientId || !session || !formConfig) return;

    // Require a signature
    if (!signatureDataUrl) {
      setSignatureError(true);
      signatureSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      throw new Error('Signature is required');
    }

    // Upload signature if it's a new drawing (not 'existing')
    if (signatureDataUrl && signatureDataUrl !== 'existing') {
      const storagePath = `${clientId}/signatures/beneficiary_${Date.now()}.png`;

      // Convert base64 data URL to Blob
      const response = await fetch(signatureDataUrl);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('onboarding-documents')
        .upload(storagePath, blob, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Signature upload failed:', uploadError);
        throw new Error('Failed to upload signature');
      }

      // Record signing metadata server-side (IP address, user agent) for audit trail
      // This is called after saveFormData so the beneficiary rows exist
      // We'll call it after the save below
      data._signaturePath = storagePath;
    }

    const result = await saveFormData(supabase, formConfig, data, clientId);

    if (!result.success) {
      throw new Error(result.error || 'Failed to save beneficiary declaration');
    }

    // Now record the signing metadata (beneficiary rows exist after save)
    if (data._signaturePath && typeof data._signaturePath === 'string') {
      await fetch('/api/clients/onboard/sign-beneficiary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature_image: data._signaturePath }),
      }).catch((err) => {
        console.error('Failed to record signing metadata:', err);
      });
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

  // Signature section rendered below the dynamic form fields, above the submit button
  const signatureSection = (
    <div ref={signatureSectionRef}>
      <SectionCard
        title="Declaration Signature"
        description="By signing below, you confirm that the beneficiary information provided is true, correct, and complete."
      >
        <SignaturePad
          onSignatureChange={handleSignatureChange}
          existingSignatureUrl={existingSignatureUrl}
        />
        {signatureError && (
          <div className="flex items-center gap-2 mt-3 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Please sign the declaration before continuing.
          </div>
        )}
      </SectionCard>
    </div>
  );

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
        renderBeforeSubmit={signatureSection}
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
