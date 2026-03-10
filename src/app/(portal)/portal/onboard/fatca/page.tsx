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

function FatcaContent() {
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

  // Fetch form config, existing data, and existing signature
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

          // If there's an existing signature, get a signed URL to display it
          if (data.signature_image && typeof data.signature_image === 'string') {
            const { data: signedUrlData } = await supabase.storage
              .from('onboarding-documents')
              .createSignedUrl(data.signature_image, 3600);
            if (signedUrlData?.signedUrl) {
              setExistingSignatureUrl(signedUrlData.signedUrl);
              // Mark as having a signature so submit isn't blocked
              setSignatureDataUrl('existing');
            }
          }
        }
      } catch (err) {
        console.error('Failed to load FATCA config:', err);
      } finally {
        setConfigLoading(false);
      }
    };

    fetchConfig();
  }, [clientId, supabase]);

  // Memoize the signature change handler to avoid re-rendering the pad
  const handleSignatureChange = useCallback((dataUrl: string | null) => {
    setSignatureDataUrl(dataUrl);
    if (dataUrl) setSignatureError(false);
  }, []);

  // Handle form submission: validate signature, upload it, save FATCA data, advance step
  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!clientId || !session || !formConfig) return;

    // Require a signature
    if (!signatureDataUrl) {
      setSignatureError(true);
      // Scroll to the signature section
      signatureSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      throw new Error('Signature is required');
    }

    // Add declaration metadata
    data.declaration_date = new Date().toISOString();

    // Upload signature if it's a new drawing (not 'existing')
    if (signatureDataUrl && signatureDataUrl !== 'existing') {
      const storagePath = `${clientId}/signatures/fatca_${Date.now()}.png`;

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

      // Store the path in the form data (will be saved to fatca_declarations.signature_image)
      data.signature_image = storagePath;
    }

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

  // Signature section rendered below the dynamic form fields, above the submit button
  const signatureSection = (
    <div ref={signatureSectionRef}>
      <SectionCard
        title="Declaration Signature"
        description="By signing below, you confirm that the information provided in this FATCA/CRS declaration is true, correct, and complete."
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
        renderBeforeSubmit={signatureSection}
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
