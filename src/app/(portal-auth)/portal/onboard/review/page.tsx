'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/components/providers/onboarding-auth-provider';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { SectionCard } from '@/components/onboarding/section-card';
import { DynamicReviewSection } from '@/components/onboarding/dynamic-review-renderer';
import { getFormConfigClient } from '@/lib/form-config/fetch-client';
import { loadFormData } from '@/lib/form-config/load';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Pencil, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { getVerificationForClient } from '@/lib/idv/status';
import { createClient } from '@/lib/supabase/client';
import type { FormConfig } from '@/lib/form-config/types';
import type { IdentityVerification } from '@/types/database';
import { PenLine } from 'lucide-react';

function ReviewContent() {
  const { session, clientId, clientType, loading } = useOnboarding();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Form configs
  const [kycConfig, setKycConfig] = useState<FormConfig | null>(null);
  const [beneficiaryConfig, setBeneficiaryConfig] = useState<FormConfig | null>(null);
  const [fatcaConfig, setFatcaConfig] = useState<FormConfig | null>(null);

  // Data
  const [kycData, setKycData] = useState<Record<string, unknown>>({});
  const [beneficiaryData, setBeneficiaryData] = useState<Record<string, unknown>>({});
  const [fatcaData, setFatcaData] = useState<Record<string, unknown>>({});
  const [verification, setVerification] = useState<IdentityVerification | null>(null);

  const [beneficiarySignatureUrl, setBeneficiarySignatureUrl] = useState<string | null>(null);
  const [beneficiarySignatureDate, setBeneficiarySignatureDate] = useState<string | null>(null);
  const [fatcaSignatureUrl, setFatcaSignatureUrl] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [declared, setDeclared] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    if (!clientId || !clientType) return;

    try {
      const kycFormKey = clientType === 'corporate' ? 'kyc_corporate' : 'kyc_individual';

      // Fetch configs and data in parallel
      const [kycCfg, benefCfg, fatcaCfg, idvResult] = await Promise.all([
        getFormConfigClient(supabase, kycFormKey),
        getFormConfigClient(supabase, 'beneficiary_declaration'),
        getFormConfigClient(supabase, 'fatca'),
        getVerificationForClient(supabase, clientId),
      ]);

      setKycConfig(kycCfg);
      setBeneficiaryConfig(benefCfg);
      setFatcaConfig(fatcaCfg);
      setVerification(idvResult);

      // Load form data using configs
      if (kycCfg) {
        const data = await loadFormData(supabase, kycCfg, clientId);
        setKycData(data);
      }
      if (benefCfg) {
        const data = await loadFormData(supabase, benefCfg, clientId);
        setBeneficiaryData(data);

        // Fetch signed URL for beneficiary declaration signature
        const { data: benefDecl } = await supabase
          .from('beneficiary_declarations')
          .select('signature_image, declaration_date')
          .eq('client_id', clientId)
          .is('deleted_at', null)
          .limit(1)
          .maybeSingle();

        if (benefDecl?.signature_image) {
          const { data: sigUrl } = await supabase.storage
            .from('onboarding-documents')
            .createSignedUrl(benefDecl.signature_image, 3600);
          if (sigUrl?.signedUrl) setBeneficiarySignatureUrl(sigUrl.signedUrl);
          if (benefDecl.declaration_date) setBeneficiarySignatureDate(benefDecl.declaration_date);
        }
      }
      if (fatcaCfg) {
        const data = await loadFormData(supabase, fatcaCfg, clientId);
        setFatcaData(data);

        // Fetch signed URL for FATCA signature image if one exists
        if (data.signature_image && typeof data.signature_image === 'string') {
          const { data: sigUrl } = await supabase.storage
            .from('onboarding-documents')
            .createSignedUrl(data.signature_image, 3600);
          if (sigUrl?.signedUrl) setFatcaSignatureUrl(sigUrl.signedUrl);
        }
      }
    } catch (err) {
      console.error('Failed to load review data:', err);
    } finally {
      setLoadingData(false);
    }
  }, [clientId, clientType, supabase]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/clients/onboard', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        setSubmitError(data.details ? data.details.join(', ') : data.error || 'Submission failed');
        setSubmitting(false);
        return;
      }

      router.push('/portal/onboard/confirmation');
    } catch {
      setSubmitError('Network error. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!session || !clientId) {
    return <p className="text-sm text-[#717D93]">Session not found.</p>;
  }

  const editButton = (href: string) => (
    <Button variant="ghost" size="sm" onClick={() => router.push(href)}>
      <Pencil className="w-3 h-3 mr-1" /> Edit
    </Button>
  );

  // Check if KYC data exists (has any non-empty values)
  const hasKycData = Object.values(kycData).some((v) => v !== '' && v !== null && v !== undefined && v !== false);
  const hasFatcaData = Object.values(fatcaData).some((v) => v !== '' && v !== null && v !== undefined && v !== false);

  return (
    <OnboardingShell
      currentStep="review"
      title="Review Your Application"
      subtitle="Please review all your information before submitting. Click Edit on any section to make changes."
    >
      <div className="space-y-6">
        {/* KYC Section */}
        <SectionCard title="KYC Details" action={editButton('/portal/onboard/kyc')}>
          {kycConfig && hasKycData ? (
            <DynamicReviewSection config={kycConfig} data={kycData} />
          ) : (
            <p className="text-sm text-amber-600">KYC details not completed</p>
          )}
        </SectionCard>

        {/* Beneficiary Declaration Section */}
        <SectionCard title="Beneficiary Declaration" action={editButton('/portal/onboard/beneficiaries')}>
          {beneficiaryConfig && Object.keys(beneficiaryData).length > 0 ? (
            <>
              <DynamicReviewSection config={beneficiaryConfig} data={beneficiaryData} />
              {beneficiarySignatureUrl && (
                <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                  <div className="flex items-center gap-2 mb-2">
                    <PenLine className="w-3.5 h-3.5 text-[#717D93]" />
                    <p className="text-xs font-medium text-[#717D93] uppercase tracking-wider">Declaration Signature</p>
                  </div>
                  <div className="rounded-lg border border-[#E2E8F0] bg-white p-2 inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={beneficiarySignatureUrl} alt="Beneficiary declaration signature" className="h-20 w-auto" />
                  </div>
                  {beneficiarySignatureDate && (
                    <p className="text-xs text-[#94A3B8] mt-1">
                      Signed on {new Date(beneficiarySignatureDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-amber-600">Beneficiary declaration not completed</p>
          )}
        </SectionCard>

        {/* FATCA/CRS Section */}
        <SectionCard title="Tax Declaration (FATCA/CRS)" action={editButton('/portal/onboard/fatca')}>
          {fatcaConfig && hasFatcaData ? (
            <>
              <DynamicReviewSection config={fatcaConfig} data={fatcaData} />
              {fatcaSignatureUrl && (
                <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                  <div className="flex items-center gap-2 mb-2">
                    <PenLine className="w-3.5 h-3.5 text-[#717D93]" />
                    <p className="text-xs font-medium text-[#717D93] uppercase tracking-wider">Declaration Signature</p>
                  </div>
                  <div className="rounded-lg border border-[#E2E8F0] bg-white p-2 inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fatcaSignatureUrl} alt="FATCA signature" className="h-20 w-auto" />
                  </div>
                  {typeof fatcaData.declaration_date === 'string' && (
                    <p className="text-xs text-[#94A3B8] mt-1">
                      Signed on {new Date(fatcaData.declaration_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-amber-600">FATCA declaration not completed</p>
          )}
        </SectionCard>

        {/* Identity Verification Section */}
        <SectionCard
          title="Identity Verification"
          action={editButton('/portal/onboard/documents')}
        >
          {verification?.status === 'completed' ? (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#253859]">Identity Verified</p>
                <p className="text-xs text-[#717D93]">
                  {verification.document_type && `${formatDocType(verification.document_type)} verified`}
                  {verification.document_country ? ` (${verification.document_country})` : ''}
                  {verification.completed_at && ` on ${new Date(verification.completed_at).toLocaleDateString()}`}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-amber-600">Identity verification not completed</p>
          )}
        </SectionCard>

        {/* Declaration + Submit */}
        <div className="border-t border-[#E2E8F0] pt-6 space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="declaration"
              checked={declared}
              onCheckedChange={(checked) => setDeclared(checked === true)}
            />
            <Label htmlFor="declaration" className="text-sm text-[#253859] leading-snug">
              I declare that the information provided in this application is true, complete, and accurate to the
              best of my knowledge. I understand that providing false or misleading information may result in the
              rejection of my application and may constitute a criminal offence under applicable law.
            </Label>
          </div>

          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/portal/onboard/documents')}
              disabled={submitting}
            >
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!declared || submitting}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-2" />Submit Application</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}

function formatDocType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Layout already wraps in OnboardingAuthProvider — no need to nest another one
export default function ReviewPage() {
  return <ReviewContent />;
}
