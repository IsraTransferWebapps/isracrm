'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus, Landmark } from 'lucide-react';
import { useOnboarding } from '@/components/providers/onboarding-auth-provider';
import { createClient } from '@/lib/supabase/client';
import { BeneficiaryCard } from '@/components/portal/beneficiary-card';
import { BeneficiaryDialog } from '@/components/beneficiary-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Beneficiary } from '@/types/database';

export default function BeneficiariesPage() {
  const { clientId, loading: authLoading } = useOnboarding();
  const supabase = useMemo(() => createClient(), []);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBeneficiaries = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase
      .from('beneficiaries')
      .select('*')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    setBeneficiaries((data as Beneficiary[]) ?? []);
    setLoading(false);
  }, [clientId, supabase]);

  useEffect(() => { fetchBeneficiaries(); }, [fetchBeneficiaries]);

  const handleEdit = (b: Beneficiary) => {
    setEditingBeneficiary(b);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingBeneficiary(null);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);

    await supabase
      .from('beneficiaries')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', deleteConfirmId);

    setDeleteConfirmId(null);
    setDeleting(false);
    fetchBeneficiaries();
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#253859]">Beneficiaries</h1>
          <p className="mt-1 text-sm text-[#717D93]">
            Manage your bank accounts for receiving funds
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      {beneficiaries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {beneficiaries.map((b) => (
            <BeneficiaryCard
              key={b.id}
              beneficiary={b}
              onEdit={handleEdit}
              onDelete={setDeleteConfirmId}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-[#FAFBFC] p-12 text-center">
          <Landmark className="h-10 w-10 text-[#E2E8F0] mx-auto mb-3" />
          <p className="text-sm font-medium text-[#717D93]">No beneficiaries yet</p>
          <p className="text-xs text-[#94A3B8] mt-1 mb-4">
            Add a bank account to receive converted funds
          </p>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Account
          </Button>
        </div>
      )}

      {/* Add/Edit Dialog */}
      {clientId && (
        <BeneficiaryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          clientId={clientId}
          beneficiary={editingBeneficiary}
          onSaved={fetchBeneficiaries}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#253859]">Remove beneficiary?</DialogTitle>
            <DialogDescription className="text-[#717D93]">
              This beneficiary will be removed from your account. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
