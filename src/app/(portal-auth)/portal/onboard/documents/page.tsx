'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/components/providers/onboarding-auth-provider';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { updateOnboardingStep } from '@/lib/onboarding/actions';
import { getVerificationForClient } from '@/lib/idv/status';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  CheckCircle2,
  ShieldCheck,
  ScanFace,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import type { IdentityVerification } from '@/types/database';

function IdentityVerificationContent() {
  const { session, clientId, loading } = useOnboarding();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [verification, setVerification] = useState<IdentityVerification | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch current verification status
  const fetchStatus = useCallback(async () => {
    if (!clientId) return;
    const result = await getVerificationForClient(supabase, clientId);
    setVerification(result);
    setLoadingStatus(false);
  }, [clientId, supabase]);

  // Initial load
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll while verification is in progress (webhook updates the DB asynchronously)
  useEffect(() => {
    const shouldPoll =
      verification?.status === 'pending' || verification?.status === 'in_progress';

    if (shouldPoll) {
      pollRef.current = setInterval(fetchStatus, 5000);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [verification?.status, fetchStatus]);

  // Start verification — create session and open Didit SDK modal
  const handleStartVerification = async () => {
    setStarting(true);
    setError(null);

    try {
      const res = await fetch('/api/idv/create-session', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to start verification');
        setStarting(false);
        return;
      }

      // If already completed, just refetch status
      if (data.alreadyCompleted) {
        await fetchStatus();
        setStarting(false);
        return;
      }

      // Dynamic import — SDK is browser-only
      const { DiditSdk } = await import('@didit-protocol/sdk-web');
      const sdk = DiditSdk.shared;

      // Set up callbacks before starting
      sdk.onComplete = (result) => {
        if (result.type === 'completed') {
          // Verification flow finished — poll for webhook results
          fetchStatus();
        } else if (result.type === 'cancelled') {
          // User closed the modal — check if verification completed anyway
          fetchStatus();
        } else if (result.type === 'failed') {
          setError(result.error?.message || 'Verification failed. Please try again.');
          fetchStatus();
        }
      };

      // Open the Didit verification modal
      await sdk.startVerification({
        url: data.sessionUrl,
        configuration: {
          showCloseButton: true,
          showExitConfirmation: true,
          closeModalOnComplete: true,
        },
      });
    } catch (err) {
      console.error('Failed to start verification:', err);
      setError('Failed to start verification. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  // Continue to review step
  const handleContinue = async () => {
    if (!session) return;
    setSubmitting(true);
    await updateOnboardingStep(session.id, 'review');
    router.push('/portal/onboard/review');
  };

  if (loading || loadingStatus) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!session || !clientId) {
    return <p className="text-sm text-[#717D93]">Session not found.</p>;
  }

  const isCompleted = verification?.status === 'completed';
  const isInProgress = verification?.status === 'pending' || verification?.status === 'in_progress';
  const isFailed = verification?.status === 'failed' || verification?.status === 'expired' || verification?.status === 'abandoned';
  const hasNoVerification = !verification;

  return (
    <OnboardingShell
      currentStep="documents"
      title="Identity Verification"
      subtitle="Verify your identity securely using your ID document and a quick selfie."
    >
      <div className="space-y-6">
        {/* Error alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ── STATE: Not started or failed ──────────────────── */}
        {(hasNoVerification || isFailed) && (
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#EFF6FF]">
              <ScanFace className="h-8 w-8 text-[#01A0FF]" />
            </div>

            <h2 className="text-lg font-semibold text-[#253859] mb-2">
              {isFailed ? 'Verification Unsuccessful' : 'Verify Your Identity'}
            </h2>

            <p className="text-sm text-[#717D93] max-w-md mx-auto mb-6">
              {isFailed
                ? 'Your previous verification attempt was unsuccessful. Please try again with a valid identity document.'
                : 'We need to verify your identity as part of our regulatory obligations. This quick process uses your ID document and a live selfie to confirm your identity.'}
            </p>

            {/* What happens during verification */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 max-w-lg mx-auto text-left">
              <VerificationStep icon="id" title="Scan ID" desc="Take a photo of your passport or ID card" />
              <VerificationStep icon="selfie" title="Selfie Check" desc="A quick liveness check to match your face" />
              <VerificationStep icon="aml" title="AML Screening" desc="Automated regulatory compliance check" />
            </div>

            <Button
              onClick={handleStartVerification}
              disabled={starting}
              size="lg"
            >
              {starting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting...</>
              ) : isFailed ? (
                <><RefreshCw className="w-4 h-4 mr-2" />Retry Verification</>
              ) : (
                <><ShieldCheck className="w-4 h-4 mr-2" />Start Verification</>
              )}
            </Button>

            <p className="text-[11px] text-[#94A3B8] mt-4">
              Powered by Didit &middot; Your data is encrypted and processed securely
            </p>
          </div>
        )}

        {/* ── STATE: In progress ─────────────────────────────── */}
        {isInProgress && (
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
              <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
            </div>

            <h2 className="text-lg font-semibold text-[#253859] mb-2">
              Verification In Progress
            </h2>
            <p className="text-sm text-[#717D93] max-w-md mx-auto mb-6">
              Your identity verification is being processed. This usually takes less than a minute.
              This page will update automatically.
            </p>

            <Button
              variant="outline"
              onClick={handleStartVerification}
              disabled={starting}
            >
              {starting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Opening...</>
              ) : (
                'Reopen Verification'
              )}
            </Button>
          </div>
        )}

        {/* ── STATE: Completed ───────────────────────────────── */}
        {isCompleted && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>

            <h2 className="text-lg font-semibold text-[#253859] mb-2">
              Identity Verified
            </h2>
            <p className="text-sm text-[#717D93] max-w-md mx-auto">
              Your identity has been successfully verified. You can continue to review your application.
            </p>

            {/* Verification details */}
            {(verification.document_type || verification.full_name_extracted) && (
              <div className="mt-4 inline-flex flex-col gap-1 text-sm text-[#717D93]">
                {verification.full_name_extracted && (
                  <span>Name: <span className="text-[#253859] font-medium">{verification.full_name_extracted}</span></span>
                )}
                {verification.document_type && (
                  <span>Document: <span className="text-[#253859] font-medium">{formatDocType(verification.document_type)}</span></span>
                )}
                {verification.document_country && (
                  <span>Country: <span className="text-[#253859] font-medium">{verification.document_country}</span></span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Continue button (completed state) */}
        {isCompleted && (
          <div className="flex justify-end">
            <Button onClick={handleContinue} disabled={submitting}>
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : (
                'Continue to Review'
              )}
            </Button>
          </div>
        )}
      </div>
    </OnboardingShell>
  );
}

// ── Helper: Verification step card for the "not started" state ──
function VerificationStep({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    id: <span className="text-lg">🪪</span>,
    selfie: <span className="text-lg">🤳</span>,
    aml: <span className="text-lg">🔍</span>,
  };

  return (
    <div className="flex flex-col items-center text-center gap-1.5 p-3 rounded-lg bg-[#FAFBFC]">
      {iconMap[icon]}
      <span className="text-xs font-semibold text-[#253859]">{title}</span>
      <span className="text-[11px] text-[#717D93]">{desc}</span>
    </div>
  );
}

/**
 * Format a document type string for display.
 * e.g. "passport" → "Passport", "national_id" → "National Id"
 */
function formatDocType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Layout already wraps in OnboardingAuthProvider — no need to nest another one
export default function DocumentsPage() {
  return <IdentityVerificationContent />;
}
