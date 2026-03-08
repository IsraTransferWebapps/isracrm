'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingAuthProvider, useOnboarding } from '@/components/providers/onboarding-auth-provider';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { DocumentUploader } from '@/components/onboarding/document-uploader';
import { updateOnboardingStep } from '@/lib/onboarding/actions';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import type { DocumentType, KycDocument } from '@/types/database';

interface RequiredDoc {
  type: DocumentType;
  label: string;
  description: string;
  required: boolean;
}

const INDIVIDUAL_DOCS: RequiredDoc[] = [
  {
    type: 'passport',
    label: 'Passport or National ID',
    description: 'Government-issued photo identification (passport, Teudat Zehut, or driving licence)',
    required: true,
  },
  {
    type: 'proof_of_address',
    label: 'Proof of Address',
    description: 'Utility bill, bank statement, or government letter dated within the last 90 days',
    required: true,
  },
  {
    type: 'source_of_funds',
    label: 'Source of Funds Documentation',
    description: 'Supporting evidence for your declared source of funds (e.g. payslips, tax returns)',
    required: false,
  },
];

const CORPORATE_DOCS: RequiredDoc[] = [
  {
    type: 'certificate_of_incorporation',
    label: 'Certificate of Incorporation',
    description: 'Official certificate of company registration',
    required: true,
  },
  {
    type: 'company_registration',
    label: 'Company Register Extract',
    description: 'Current list of directors, shareholders, and registered details',
    required: true,
  },
  {
    type: 'ubo_declaration',
    label: 'UBO Declaration',
    description: 'Declaration of ultimate beneficial ownership (if UBOs were declared)',
    required: false,
  },
  {
    type: 'proof_of_address',
    label: 'Proof of Registered Address',
    description: 'Utility bill or bank statement for the company, dated within 90 days',
    required: true,
  },
];

function DocumentsContent() {
  const { session, clientId, clientType, loading } = useOnboarding();
  const router = useRouter();
  const supabase = createClient();

  const [documents, setDocuments] = useState<KycDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const requiredDocs = clientType === 'corporate' ? CORPORATE_DOCS : INDIVIDUAL_DOCS;

  const fetchDocuments = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase
      .from('kyc_documents')
      .select('*')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('upload_date', { ascending: false });
    setDocuments((data as KycDocument[]) || []);
    setLoadingDocs(false);
  }, [clientId, supabase]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const getExistingDoc = (type: DocumentType) =>
    documents.find((d) => d.document_type === type);

  const requiredComplete = requiredDocs
    .filter((d) => d.required)
    .every((d) => getExistingDoc(d.type));

  const handleContinue = async () => {
    if (!session) return;
    setSubmitting(true);
    await updateOnboardingStep(session.id, 'review');
    router.push('/onboard/review');
  };

  if (loading || loadingDocs) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-32 w-full" /></div>;
  }

  if (!session || !clientId) {
    return <p className="text-sm text-[#717D93]">Session not found.</p>;
  }

  return (
    <OnboardingShell
      currentStep="documents"
      title="Identity Verification"
      subtitle="Upload the required documents to verify your identity. All files are stored securely and encrypted."
    >
      <div className="space-y-4">
        {requiredDocs.map((doc) => (
          <DocumentUploader
            key={doc.type}
            clientId={clientId}
            documentType={doc.type}
            label={doc.label}
            description={doc.description}
            required={doc.required}
            existingDocument={getExistingDoc(doc.type)}
            onUploadComplete={fetchDocuments}
          />
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-6">
        <Button onClick={handleContinue} disabled={!requiredComplete || submitting}>
          {submitting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
          ) : (
            'Continue to Review'
          )}
        </Button>
      </div>
      {!requiredComplete && (
        <p className="text-xs text-amber-600 text-right mt-2">
          Please upload all required documents to continue.
        </p>
      )}
    </OnboardingShell>
  );
}

export default function DocumentsPage() {
  return (
    <OnboardingAuthProvider>
      <DocumentsContent />
    </OnboardingAuthProvider>
  );
}
