'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { canReviewLeads } from '@/lib/roles';
import { getFormConfigClient } from '@/lib/form-config/fetch-client';
import { loadFormData } from '@/lib/form-config/load';
import { getVerificationForClient } from '@/lib/idv/status';
import { DynamicReviewSection } from '@/components/onboarding/dynamic-review-renderer';
import { SectionCard } from '@/components/onboarding/section-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft, CheckCircle2, XCircle, RotateCcw, ShieldCheck, FileText,
  Loader2, AlertCircle, Download, PenLine,
} from 'lucide-react';
import { formatDate } from '@/lib/format';
import type { FormConfig } from '@/lib/form-config/types';
import type {
  ClientType, OnboardingStatus, KycStatus, IdentityVerification, KycDocument, ComplianceReviewAction,
} from '@/types/database';

// Status badge styles
const ONBOARDING_STATUS_STYLES: Record<OnboardingStatus, { bg: string; text: string; dot: string }> = {
  in_progress: { bg: 'bg-[#F4F5F7]', text: 'text-[#717D93]', dot: 'bg-[#94A3B8]' },
  submitted: { bg: 'bg-[#eff6ff]', text: 'text-[#0284c7]', dot: 'bg-[#01A0FF]' },
  under_review: { bg: 'bg-[#f5f3ff]', text: 'text-[#7c3aed]', dot: 'bg-[#8b5cf6]' },
  approved: { bg: 'bg-[#ecfdf5]', text: 'text-[#059669]', dot: 'bg-[#10b981]' },
  rejected: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', dot: 'bg-[#ef4444]' },
  returned: { bg: 'bg-[#fffbeb]', text: 'text-[#d97706]', dot: 'bg-[#f59e0b]' },
};

function StatusPill({ style, label }: { style: { bg: string; text: string; dot: string }; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${style.bg} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}

interface LeadData {
  id: string;
  client_type: ClientType;
  kyc_status: KycStatus;
  individual_details: { first_name: string; last_name: string; email_primary: string | null } | null;
  corporate_details: { company_name: string } | null;
}

interface SessionData {
  id: string;
  status: OnboardingStatus;
  submitted_at: string | null;
  review_notes: string | null;
  reviewed_by: string | null;
  returned_at: string | null;
  current_step: string;
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { role } = useUser();
  const supabase = useMemo(() => createClient(), []);

  // Data state
  const [lead, setLead] = useState<LeadData | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [kycConfig, setKycConfig] = useState<FormConfig | null>(null);
  const [beneficiaryConfig, setBeneficiaryConfig] = useState<FormConfig | null>(null);
  const [fatcaConfig, setFatcaConfig] = useState<FormConfig | null>(null);
  const [kycData, setKycData] = useState<Record<string, unknown>>({});
  const [beneficiaryData, setBeneficiaryData] = useState<Record<string, unknown>>({});
  const [fatcaData, setFatcaData] = useState<Record<string, unknown>>({});
  const [verification, setVerification] = useState<IdentityVerification | null>(null);
  const [documents, setDocuments] = useState<KycDocument[]>([]);
  const [fatcaSignatureUrl, setFatcaSignatureUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Action state
  const [actionDialog, setActionDialog] = useState<ComplianceReviewAction | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      // Fetch lead and session
      const [leadResult, sessionResult] = await Promise.all([
        supabase.from('clients').select(`
          id, client_type, kyc_status,
          individual_details (first_name, last_name, email_primary),
          corporate_details (company_name)
        `).eq('id', id).single(),
        supabase.from('onboarding_sessions').select('id, status, submitted_at, review_notes, reviewed_by, returned_at, current_step')
          .eq('client_id', id).single(),
      ]);

      if (!leadResult.data) return;
      setLead(leadResult.data as unknown as LeadData);

      if (sessionResult.data) {
        setSession(sessionResult.data as unknown as SessionData);

        // Auto-update submitted → under_review when a reviewer opens the page
        if (sessionResult.data.status === 'submitted') {
          await supabase.from('onboarding_sessions')
            .update({ status: 'under_review' })
            .eq('id', sessionResult.data.id);
          setSession((prev) => prev ? { ...prev, status: 'under_review' } : prev);
        }
      }

      const clientType = leadResult.data.client_type as ClientType;
      const kycFormKey = clientType === 'corporate' ? 'kyc_corporate' : 'kyc_individual';

      // Fetch all form configs and data in parallel
      const [kycCfg, benefCfg, fatcaCfg, idvResult, docsResult] = await Promise.all([
        getFormConfigClient(supabase, kycFormKey),
        getFormConfigClient(supabase, 'beneficiary_declaration'),
        getFormConfigClient(supabase, 'fatca'),
        getVerificationForClient(supabase, id),
        supabase.from('kyc_documents').select('*').eq('client_id', id).is('deleted_at', null).order('upload_date', { ascending: false }),
      ]);

      setKycConfig(kycCfg);
      setBeneficiaryConfig(benefCfg);
      setFatcaConfig(fatcaCfg);
      setVerification(idvResult);
      setDocuments((docsResult.data as KycDocument[]) || []);

      // Load form data
      if (kycCfg) setKycData(await loadFormData(supabase, kycCfg, id));
      if (benefCfg) setBeneficiaryData(await loadFormData(supabase, benefCfg, id));
      if (fatcaCfg) {
        const fData = await loadFormData(supabase, fatcaCfg, id);
        setFatcaData(fData);

        // Fetch signed URL for FATCA signature image
        if (fData.signature_image && typeof fData.signature_image === 'string') {
          const { data: sigUrl } = await supabase.storage
            .from('onboarding-documents')
            .createSignedUrl(fData.signature_image, 3600);
          if (sigUrl?.signedUrl) setFatcaSignatureUrl(sigUrl.signedUrl);
        }
      }
    } catch (err) {
      console.error('Failed to load lead data:', err);
    } finally {
      setLoading(false);
    }
  }, [id, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async () => {
    if (!actionDialog || !id) return;
    if ((actionDialog === 'reject' || actionDialog === 'return') && !actionNotes.trim()) {
      setActionError('Please provide notes explaining your decision.');
      return;
    }

    setActionSubmitting(true);
    setActionError(null);

    try {
      const response = await fetch(`/api/leads/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionDialog, notes: actionNotes.trim() || undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        setActionError(data.error || 'Action failed');
        setActionSubmitting(false);
        return;
      }

      // Success — close dialog and refresh or redirect
      setActionDialog(null);
      setActionNotes('');
      setActionSubmitting(false);

      if (actionDialog === 'approve') {
        // Approved leads move to clients — redirect to the clients page
        router.push('/leads');
      } else {
        // Rejected or returned — refresh the page data
        fetchData();
      }
    } catch {
      setActionError('Network error. Please try again.');
      setActionSubmitting(false);
    }
  };

  const handleDownload = async (doc: KycDocument) => {
    if (!doc.file_reference) return;
    const { data } = await supabase.storage.from('onboarding-documents')
      .createSignedUrl(doc.file_reference, 3600);
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6">
        <p className="text-[#717D93]">Lead not found.</p>
      </div>
    );
  }

  const displayName = lead.client_type === 'corporate' && lead.corporate_details
    ? lead.corporate_details.company_name
    : lead.individual_details
      ? `${lead.individual_details.first_name} ${lead.individual_details.last_name}`
      : 'Unknown';

  const canAct = canReviewLeads(role) && session &&
    (session.status === 'submitted' || session.status === 'under_review');

  const hasKycData = Object.values(kycData).some((v) => v !== '' && v !== null && v !== undefined && v !== false);
  const hasBeneficiaryData = Object.keys(beneficiaryData).length > 0;
  const hasFatcaData = Object.values(fatcaData).some((v) => v !== '' && v !== null && v !== undefined && v !== false);

  return (
    <div className="p-6 space-y-6">
      {/* Back link + Header */}
      <div>
        <button
          onClick={() => router.push('/leads')}
          className="inline-flex items-center gap-1.5 text-[13px] text-[#717D93] hover:text-[#253859] mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Leads
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-semibold text-[#253859] tracking-tight">{displayName}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[12px] text-[#717D93] capitalize">{lead.client_type.replace(/_/g, ' ')}</span>
              {session && (
                <StatusPill
                  style={ONBOARDING_STATUS_STYLES[session.status]}
                  label={session.status.replace(/_/g, ' ')}
                />
              )}
              {session?.submitted_at && (
                <span className="text-[12px] text-[#94A3B8]">
                  Submitted {formatDate(session.submitted_at)}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {canAct && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800 h-8 text-[12px]"
                onClick={() => { setActionDialog('return'); setActionNotes(''); setActionError(null); }}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Return
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-8 text-[12px]"
                onClick={() => { setActionDialog('reject'); setActionNotes(''); setActionError(null); }}
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Reject
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-[12px]"
                onClick={() => { setActionDialog('approve'); setActionNotes(''); setActionError(null); }}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Approve
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Previous review notes (if returned or rejected) */}
      {session?.review_notes && (session.status === 'returned' || session.status === 'rejected') && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          session.status === 'rejected'
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-amber-200 bg-amber-50 text-amber-700'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">
              {session.status === 'rejected' ? 'Rejection reason' : 'Return notes'}
            </span>
          </div>
          <p className="ml-6">{session.review_notes}</p>
        </div>
      )}

      {/* KYC Details */}
      <SectionCard title="KYC Details">
        {kycConfig && hasKycData ? (
          <DynamicReviewSection config={kycConfig} data={kycData} />
        ) : (
          <p className="text-sm text-[#94A3B8]">KYC details not submitted</p>
        )}
      </SectionCard>

      {/* Beneficiary Declaration */}
      <SectionCard title="Beneficiary Declaration">
        {beneficiaryConfig && hasBeneficiaryData ? (
          <DynamicReviewSection config={beneficiaryConfig} data={beneficiaryData} />
        ) : (
          <p className="text-sm text-[#94A3B8]">Beneficiary declaration not submitted</p>
        )}
      </SectionCard>

      {/* FATCA / CRS */}
      <SectionCard title="Tax Declaration (FATCA/CRS)">
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
                <div className="mt-2 space-y-0.5">
                  {typeof fatcaData.declaration_date === 'string' && (
                    <p className="text-xs text-[#94A3B8]">
                      Signed on {new Date(fatcaData.declaration_date).toLocaleDateString()}
                    </p>
                  )}
                  {typeof fatcaData.signature_ip === 'string' && (
                    <p className="text-xs text-[#94A3B8]">
                      IP: {fatcaData.signature_ip}
                    </p>
                  )}
                  {typeof fatcaData.signed_by === 'string' && (
                    <p className="text-xs text-[#94A3B8]">
                      Signed by: {fatcaData.signed_by}
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-[#94A3B8]">FATCA declaration not submitted</p>
        )}
      </SectionCard>

      {/* Identity Verification */}
      <SectionCard title="Identity Verification">
        {verification ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${verification.status === 'completed' ? 'bg-emerald-50' : 'bg-[#F4F5F7]'}`}>
                <ShieldCheck className={`w-4 h-4 ${verification.status === 'completed' ? 'text-emerald-600' : 'text-[#717D93]'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-[#253859] capitalize">
                  {verification.status.replace(/_/g, ' ')}
                </p>
                {verification.document_type && (
                  <p className="text-xs text-[#717D93]">
                    {verification.document_type.replace(/_/g, ' ')}
                    {verification.document_country ? ` (${verification.document_country})` : ''}
                  </p>
                )}
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {verification.full_name_extracted && (
                <div>
                  <dt className="text-xs text-[#717D93]">Name on ID</dt>
                  <dd className="text-[#253859]">{verification.full_name_extracted}</dd>
                </div>
              )}
              {verification.document_number && (
                <div>
                  <dt className="text-xs text-[#717D93]">Document Number</dt>
                  <dd className="text-[#253859]">{verification.document_number}</dd>
                </div>
              )}
              {verification.liveness_score != null && (
                <div>
                  <dt className="text-xs text-[#717D93]">Liveness Score</dt>
                  <dd className="text-[#253859]">{(verification.liveness_score * 100).toFixed(0)}%</dd>
                </div>
              )}
              {verification.face_match_score != null && (
                <div>
                  <dt className="text-xs text-[#717D93]">Face Match</dt>
                  <dd className="text-[#253859]">{(verification.face_match_score * 100).toFixed(0)}%</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-[#717D93]">AML Screening</dt>
                <dd className={verification.aml_hit ? 'text-red-600 font-medium' : 'text-emerald-600'}>
                  {verification.aml_hit ? 'HIT — Review required' : 'Clear'}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="text-sm text-[#94A3B8]">Identity verification not completed</p>
        )}
      </SectionCard>

      {/* Uploaded Documents */}
      <SectionCard title={`Uploaded Documents (${documents.length})`}>
        {documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-[#FAFBFC] border border-[#E2E8F0]">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-[#717D93]" />
                  <div>
                    <p className="text-sm text-[#253859]">{doc.original_filename || 'Document'}</p>
                    <p className="text-xs text-[#94A3B8]">
                      {doc.document_type.replace(/_/g, ' ')} · Uploaded {formatDate(doc.upload_date)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[#717D93] hover:text-[#253859] h-7"
                  onClick={() => handleDownload(doc)}
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#94A3B8]">No documents uploaded</p>
        )}
      </SectionCard>

      {/* Action Dialog */}
      <Dialog open={actionDialog !== null} onOpenChange={(open) => { if (!open) setActionDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog === 'approve' && 'Approve Application'}
              {actionDialog === 'reject' && 'Reject Application'}
              {actionDialog === 'return' && 'Return for Corrections'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog === 'approve' && `This will approve ${displayName}'s application and make them an active client.`}
              {actionDialog === 'reject' && `This will permanently reject ${displayName}'s application. This action cannot be undone.`}
              {actionDialog === 'return' && `This will return the application to ${displayName} for corrections. They will be able to edit and resubmit.`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Textarea
              placeholder={
                actionDialog === 'approve'
                  ? 'Optional notes...'
                  : 'Please explain what needs to be corrected...'
              }
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              rows={3}
            />
            {actionError && (
              <p className="text-xs text-red-500 mt-2">{actionError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)} disabled={actionSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={actionSubmitting}
              className={
                actionDialog === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
                actionDialog === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' :
                'bg-amber-600 hover:bg-amber-700 text-white'
              }
            >
              {actionSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
              ) : (
                actionDialog === 'approve' ? 'Approve' :
                actionDialog === 'reject' ? 'Reject' : 'Return for Corrections'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
