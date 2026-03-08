'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingAuthProvider, useOnboarding } from '@/components/providers/onboarding-auth-provider';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { SectionCard } from '@/components/onboarding/section-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Pencil, CheckCircle2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type {
  IndividualDetails,
  CorporateDetails,
  Beneficiary,
  FatcaDeclaration,
  TaxResidency,
  KycDocument,
  KycDirector,
  KycUbo,
} from '@/types/database';

function ReviewContent() {
  const { session, clientId, clientType, loading } = useOnboarding();
  const router = useRouter();
  const supabase = createClient();

  const [individual, setIndividual] = useState<IndividualDetails | null>(null);
  const [corporate, setCorporate] = useState<CorporateDetails | null>(null);
  const [directors, setDirectors] = useState<KycDirector[]>([]);
  const [ubos, setUbos] = useState<KycUbo[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [fatca, setFatca] = useState<FatcaDeclaration | null>(null);
  const [taxResidencies, setTaxResidencies] = useState<TaxResidency[]>([]);
  const [documents, setDocuments] = useState<KycDocument[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [declared, setDeclared] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    if (!clientId) return;

    const promises = [];

    // KYC details
    if (clientType === 'corporate') {
      promises.push(
        supabase.from('corporate_details').select('*').eq('client_id', clientId).single().then(({ data }) => setCorporate(data as CorporateDetails | null)),
        supabase.from('kyc_directors').select('*').eq('client_id', clientId).order('created_at').then(({ data }) => setDirectors((data as KycDirector[]) || [])),
        supabase.from('kyc_ubos').select('*').eq('client_id', clientId).order('created_at').then(({ data }) => setUbos((data as KycUbo[]) || [])),
      );
    } else {
      promises.push(
        supabase.from('individual_details').select('*').eq('client_id', clientId).single().then(({ data }) => setIndividual(data as IndividualDetails | null)),
      );
    }

    // Beneficiaries
    promises.push(
      supabase.from('beneficiaries').select('*').eq('client_id', clientId).is('deleted_at', null).order('created_at').then(({ data }) => setBeneficiaries((data as Beneficiary[]) || [])),
    );

    // FATCA + tax residencies
    promises.push(
      supabase.from('fatca_declarations').select('*').eq('client_id', clientId).single().then(async ({ data }) => {
        setFatca(data as FatcaDeclaration | null);
        if (data) {
          const { data: tr } = await supabase.from('tax_residencies').select('*').eq('fatca_declaration_id', data.id);
          setTaxResidencies((tr as TaxResidency[]) || []);
        }
      }),
    );

    // Documents
    promises.push(
      supabase.from('kyc_documents').select('*').eq('client_id', clientId).is('deleted_at', null).order('upload_date', { ascending: false }).then(({ data }) => setDocuments((data as KycDocument[]) || [])),
    );

    await Promise.all(promises);
    setLoadingData(false);
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

      router.push('/onboard/confirmation');
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

  return (
    <OnboardingShell
      currentStep="review"
      title="Review Your Application"
      subtitle="Please review all your information before submitting. Click Edit on any section to make changes."
    >
      <div className="space-y-6">
        {/* KYC Section */}
        <SectionCard
          title="KYC Details"
          action={
            <Button variant="ghost" size="sm" onClick={() => router.push('/onboard/kyc')}>
              <Pencil className="w-3 h-3 mr-1" /> Edit
            </Button>
          }
        >
          {clientType === 'corporate' && corporate ? (
            <CorporateReview data={corporate} directors={directors} ubos={ubos} />
          ) : individual ? (
            <IndividualReview data={individual} />
          ) : (
            <p className="text-sm text-amber-600">KYC details not completed</p>
          )}
        </SectionCard>

        {/* Beneficiaries Section */}
        <SectionCard
          title={`Beneficiaries (${beneficiaries.length})`}
          action={
            <Button variant="ghost" size="sm" onClick={() => router.push('/onboard/beneficiaries')}>
              <Pencil className="w-3 h-3 mr-1" /> Edit
            </Button>
          }
        >
          {beneficiaries.length > 0 ? (
            <div className="space-y-3">
              {beneficiaries.map((b) => (
                <div key={b.id} className="border border-[#E2E8F0] rounded-md p-3 text-sm">
                  <p className="font-medium text-[#253859]">{b.beneficiary_name}</p>
                  <p className="text-[#717D93]">
                    {b.bank_name}{b.bank_country ? ` (${b.bank_country})` : ''} &mdash; {b.currency}
                  </p>
                  {b.iban && <p className="text-[#717D93]">IBAN: {b.iban}</p>}
                  {b.account_number && <p className="text-[#717D93]">Account: {b.account_number}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-amber-600">No beneficiaries added</p>
          )}
        </SectionCard>

        {/* FATCA/CRS Section */}
        <SectionCard
          title="Tax Declaration (FATCA/CRS)"
          action={
            <Button variant="ghost" size="sm" onClick={() => router.push('/onboard/fatca')}>
              <Pencil className="w-3 h-3 mr-1" /> Edit
            </Button>
          }
        >
          {fatca ? (
            <FatcaReview data={fatca} residencies={taxResidencies} isCorporate={clientType === 'corporate'} />
          ) : (
            <p className="text-sm text-amber-600">FATCA declaration not completed</p>
          )}
        </SectionCard>

        {/* Documents Section */}
        <SectionCard
          title={`Documents (${documents.length})`}
          action={
            <Button variant="ghost" size="sm" onClick={() => router.push('/onboard/documents')}>
              <Pencil className="w-3 h-3 mr-1" /> Edit
            </Button>
          }
        >
          {documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-[#253859]">{formatDocType(d.document_type)}</span>
                    <span className="text-[#717D93] ml-2">{d.original_filename}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {d.status === 'pending_review' ? 'Uploaded' : d.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-amber-600">No documents uploaded</p>
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
              onClick={() => router.push('/onboard/documents')}
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

// --- Sub-components for review sections ---

function ReviewField({ label, value }: { label: string; value: string | null | undefined | boolean }) {
  const display =
    value === null || value === undefined || value === ''
      ? '—'
      : typeof value === 'boolean'
        ? value ? 'Yes' : 'No'
        : String(value);

  return (
    <div>
      <dt className="text-xs text-[#717D93]">{label}</dt>
      <dd className="text-sm text-[#253859]">{display}</dd>
    </div>
  );
}

function IndividualReview({ data }: { data: IndividualDetails }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
      <ReviewField label="Name" value={[data.title, data.first_name, data.last_name].filter(Boolean).join(' ')} />
      <ReviewField label="Date of Birth" value={data.date_of_birth} />
      <ReviewField label="Nationality" value={data.nationality} />
      <ReviewField label="Country of Residence" value={data.country_of_residence} />
      <ReviewField label="Email" value={data.email_primary} />
      <ReviewField label="Phone" value={data.phone_primary} />
      <ReviewField label="Address" value={[data.address_line_1, data.address_city, data.address_postal_code, data.address_country].filter(Boolean).join(', ')} />
      <ReviewField label="Occupation" value={data.occupation} />
      <ReviewField label="PEP" value={data.politically_exposed_person} />
      <ReviewField label="Source of Funds" value={data.source_of_funds} />
      <ReviewField label="Sanctions Consent" value={data.sanctions_consent} />
    </dl>
  );
}

function CorporateReview({ data, directors, ubos }: { data: CorporateDetails; directors: KycDirector[]; ubos: KycUbo[] }) {
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
        <ReviewField label="Company Name" value={data.company_name} />
        <ReviewField label="Registration No." value={data.company_registration_number} />
        <ReviewField label="Country" value={data.country_of_incorporation} />
        <ReviewField label="Industry" value={data.industry} />
        <ReviewField label="Registered Address" value={[data.registered_address_line_1, data.registered_address_city, data.registered_address_country].filter(Boolean).join(', ')} />
        <ReviewField label="Anticipated Volume" value={data.anticipated_volume} />
        <ReviewField label="Sanctions Consent" value={data.sanctions_consent} />
      </dl>

      {directors.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-[#717D93] mb-2 uppercase tracking-wide">Directors ({directors.length})</h4>
          <div className="space-y-1">
            {directors.map((d) => (
              <p key={d.id} className="text-sm text-[#253859]">
                {d.full_name} {d.nationality ? `(${d.nationality})` : ''}
              </p>
            ))}
          </div>
        </div>
      )}

      {ubos.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-[#717D93] mb-2 uppercase tracking-wide">UBOs ({ubos.length})</h4>
          <div className="space-y-1">
            {ubos.map((u) => (
              <p key={u.id} className="text-sm text-[#253859]">
                {u.full_name} — {u.ownership_percentage}%{u.is_pep ? ' (PEP)' : ''}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FatcaReview({ data, residencies, isCorporate }: { data: FatcaDeclaration; residencies: TaxResidency[]; isCorporate: boolean }) {
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
        <ReviewField label="US Citizen" value={data.us_citizen} />
        <ReviewField label="US Tax Resident" value={data.us_tax_resident} />
        {data.us_tin && <ReviewField label="US TIN" value={data.us_tin} />}
        {isCorporate && <ReviewField label="Entity Classification" value={data.entity_classification} />}
        {data.giin && <ReviewField label="GIIN" value={data.giin} />}
        <ReviewField label="Self-Certification" value={data.self_certification} />
      </dl>

      {residencies.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-[#717D93] mb-2 uppercase tracking-wide">Tax Residencies ({residencies.length})</h4>
          <div className="space-y-1">
            {residencies.map((r) => (
              <p key={r.id} className="text-sm text-[#253859]">
                {r.country}{r.tin ? ` — TIN: ${r.tin}` : ''}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
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
