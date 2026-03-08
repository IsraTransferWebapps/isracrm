'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingAuthProvider, useOnboarding } from '@/components/providers/onboarding-auth-provider';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { BeneficiaryForm } from '@/components/onboarding/beneficiary-form';
import { updateOnboardingStep } from '@/lib/onboarding/actions';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Loader2, Building2 } from 'lucide-react';
import type { Beneficiary } from '@/types/database';

function BeneficiariesContent() {
  const { session, clientId, loading: authLoading } = useOnboarding();
  const router = useRouter();
  const supabase = createClient();

  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchBeneficiaries = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase
      .from('beneficiaries')
      .select('*')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    setBeneficiaries((data as Beneficiary[]) || []);
    setLoadingData(false);
  }, [clientId, supabase]);

  useEffect(() => {
    fetchBeneficiaries();
  }, [fetchBeneficiaries]);

  const handleDelete = async (id: string) => {
    await supabase.from('beneficiaries').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    fetchBeneficiaries();
  };

  const handleContinue = async () => {
    if (!session || beneficiaries.length === 0) return;
    setSubmitting(true);
    await updateOnboardingStep(session.id, 'fatca');
    router.push('/onboard/fatca');
  };

  if (authLoading || loadingData) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-32 w-full" /></div>;
  }

  if (!session || !clientId) {
    return <p className="text-sm text-[#717D93]">Session not found.</p>;
  }

  return (
    <OnboardingShell
      currentStep="beneficiaries"
      title="Beneficiary Declaration"
      subtitle="Add the bank accounts you plan to send money to. You can add more later."
    >
      {/* Existing beneficiaries */}
      {beneficiaries.length > 0 && !showForm && !editingId && (
        <div className="space-y-3 mb-6">
          {beneficiaries.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-4 rounded-xl border border-[#E2E8F0] bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#F4F5F7]">
                  <Building2 className="w-4 h-4 text-[#717D93]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#253859]">{b.beneficiary_name}</p>
                  <p className="text-xs text-[#94A3B8]">
                    {b.bank_name} &middot; {b.currency} &middot; {b.iban || b.account_number}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => { setEditingId(b.id); setShowForm(false); }}
                  className="p-1.5 rounded hover:bg-[#F4F5F7] text-[#94A3B8] hover:text-[#253859]"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="p-1.5 rounded hover:bg-red-50 text-[#94A3B8] hover:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit form */}
      {(showForm || editingId) && (
        <BeneficiaryForm
          clientId={clientId}
          editingBeneficiary={editingId ? beneficiaries.find((b) => b.id === editingId) : undefined}
          onSave={() => {
            setShowForm(false);
            setEditingId(null);
            fetchBeneficiaries();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingId(null);
          }}
        />
      )}

      {/* Actions */}
      {!showForm && !editingId && (
        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowForm(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Beneficiary
          </Button>

          <div className="flex justify-end pt-4 border-t border-[#E2E8F0]">
            <Button onClick={handleContinue} disabled={beneficiaries.length === 0 || submitting}>
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : (
                'Save & Continue'
              )}
            </Button>
          </div>
          {beneficiaries.length === 0 && (
            <p className="text-xs text-amber-600">Please add at least one beneficiary to continue.</p>
          )}
        </div>
      )}
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
