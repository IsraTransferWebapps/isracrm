'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { OnboardingAuthProvider, useOnboarding } from '@/components/providers/onboarding-auth-provider';
import { DocumentUploader } from '@/components/onboarding/document-uploader';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import type { DocumentType, KycDocument } from '@/types/database';

// Document upload slots available in the portal
const DOCUMENT_SLOTS: { type: DocumentType; label: string; description: string; required: boolean }[] = [
  {
    type: 'passport',
    label: 'Passport or National ID',
    description: 'A clear copy of your passport photo page or national ID card (front and back).',
    required: false,
  },
  {
    type: 'proof_of_address',
    label: 'Proof of Address',
    description: 'Utility bill, bank statement, or council tax bill dated within the last 3 months.',
    required: false,
  },
  {
    type: 'source_of_funds',
    label: 'Source of Funds Evidence',
    description: 'Payslips, tax returns, or other documentation showing the origin of your funds.',
    required: false,
  },
  {
    type: 'bank_statement',
    label: 'Bank Statement',
    description: 'Recent bank statement showing your name, account details, and the account you plan to use.',
    required: false,
  },
  {
    type: 'other',
    label: 'Other Supporting Documents',
    description: 'Any additional documents requested by our compliance team.',
    required: false,
  },
];

function DocumentsContent() {
  const { clientId, loading: authLoading } = useOnboarding();
  const [documents, setDocuments] = useState<KycDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const supabase = useMemo(() => createClient(), []);

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

  if (authLoading || loadingDocs) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!clientId) {
    return <p className="text-sm text-[#717D93]">Session not found. Please register first.</p>;
  }

  // Find existing document for each slot
  const getExistingDoc = (type: DocumentType): KycDocument | null => {
    return documents.find((d) => d.document_type === type) || null;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#253859]">Upload Documents</h1>
        <p className="mt-1 text-sm text-[#717D93]">
          Securely upload supporting documents for your application. Your files are encrypted and stored safely.
        </p>
      </div>

      <div className="space-y-4">
        {DOCUMENT_SLOTS.map((slot) => (
          <DocumentUploader
            key={slot.type}
            clientId={clientId}
            documentType={slot.type}
            label={slot.label}
            description={slot.description}
            required={slot.required}
            existingDocument={getExistingDoc(slot.type)}
            onUploadComplete={fetchDocuments}
          />
        ))}
      </div>
    </div>
  );
}

export default function PortalDocumentsPage() {
  return (
    <OnboardingAuthProvider>
      <DocumentsContent />
    </OnboardingAuthProvider>
  );
}
