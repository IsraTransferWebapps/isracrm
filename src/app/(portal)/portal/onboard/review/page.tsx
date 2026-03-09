'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingAuthProvider, useOnboarding } from '@/components/providers/onboarding-auth-provider';
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
import { Loader2, Pencil, CheckCircle2, AlertCircle, Building2, ShieldCheck } from 'lucide-react';
import { getVerificationForClient } from '@/lib/idv/status';
import { createClient } from '@/lib/supabase/client';
import type { FormConfig } from '@/lib/form-config/types';
import type { Beneficiary, IdentityVerification } from '@/types/database';

function ReviewContent() {
  const { session, clientId, clientType, loading } = useOnboarding();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Form configs
  const [kycConfig, setKycConfig] = useState<FormConfig | null>(null);
  const [fatcaConfig, setFatcaConfig] = useState<FormConfig | null>(null);

  // Data
  const [kycData, setKycData] = useState<Record<string, unknown>>({});
  const [fatcaData, setFatcaData] = useState<Record<string, unknown>>({});
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [verification, setVerification] = useState<IdentityVerification | null>(null);

  const [loadingData, setLoadingData] = useState(true);
  const [declared, setDeclared] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    if (!clientId || !clientType) return;

    try {
      const kycFormKey = clientType === 'corporate' ? 'kyc_corporate' : 'kyc_individual';

      // Fetch configs and data in parallel
      const [kycCfg, fatcaCfg, benefData, idvResult] = await Promise.all([
        getFormConfigClient(supabase, kycFormKey),
        getFormConfigClient(supabase, 'fatca'),
        supabase.from('beneficiaries').select('*').eq('client_id', clientId).is('deleted_at', null).order('created_at'),
        getVerificationForClient(supabase, clientId),
      ]);

      setKycConfig(kycCfg);
      setFatcaConfig(fatcaCfg);
      setBeneficiaries((benefData.data as Beneficiary[]) || []);
      setVerification(idvResult);

      // Load form data using configs
      if (kycCfg) {
        const data = await loadFormData(supabase, kycCfg, clientId);
        setKycData(data);
      }
      if (fatcaCfg) {
        const data = await loadFormData(supabase, fatcaCfg, clientId);
        setFatcaData(data);
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

        {/* Beneficiaries Section */}
        <SectionCard
          title={`Beneficiaries (${beneficiaries.length})`}
          action={editButton('/portal/onboard/beneficiaries')}
        >
          {beneficiaries.length > 0 ? (
            <div className="space-y-3">
              {beneficiaries.map((b) => (
                <div key={b.id} className="flex items-center gap-3 border border-[#E2E8F0] rounded-md p-3">
                  <div className="p-2 rounded-lg bg-[#F4F5F7]">
                    <Building2 className="w-4 h-4 text-[#717D93]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#253859]">{b.beneficiary_name}</p>
                    <p className="text-xs text-[#717D93]">
                      {b.bank_name}{b.bank_country ? ` (${b.bank_country})` : ''} &mdash; {b.currency}
                    </p>
                    {b.iban && <p className="text-xs text-[#717D93]">IBAN: {b.iban}</p>}
                    {b.account_number && <p className="text-xs text-[#717D93]">Account: {b.account_number}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-amber-600">No beneficiaries added</p>
          )}
        </SectionCard>

        {/* FATCA/CRS Section */}
        <SectionCard title="Tax Declaration (FATCA/CRS)" action={editButton('/portal/onboard/fatca')}>
          {fatcaConfig && hasFatcaData ? (
            <DynamicReviewSection config={fatcaConfig} data={fatcaData} />
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

export default function ReviewPage() {
  return (
    <OnboardingAuthProvider>
      <ReviewContent />
    </OnboardingAuthProvider>
  );
}
