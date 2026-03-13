'use client';

import { Landmark, CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Beneficiary } from '@/types/database';

interface BeneficiaryCardProps {
  beneficiary: Beneficiary;
  onEdit: (b: Beneficiary) => void;
  onDelete: (id: string) => void;
}

export function BeneficiaryCard({ beneficiary, onEdit, onDelete }: BeneficiaryCardProps) {
  const b = beneficiary;

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-[#EFF6FF]">
            <Landmark className="h-5 w-5 text-[#01A0FF]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#253859]">
              {b.nickname || b.beneficiary_name}
            </p>
            {b.nickname && (
              <p className="text-xs text-[#94A3B8]">{b.beneficiary_name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {b.currency && (
            <span className="inline-flex items-center rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-medium text-[#01A0FF]">
              {b.currency}
            </span>
          )}
          {b.verified && (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          )}
        </div>
      </div>

      <div className="space-y-1.5 text-xs text-[#717D93]">
        {b.bank_name && (
          <div className="flex justify-between">
            <span className="text-[#94A3B8]">Bank</span>
            <span>{b.bank_name}</span>
          </div>
        )}
        {b.iban && (
          <div className="flex justify-between">
            <span className="text-[#94A3B8]">IBAN</span>
            <span className="font-mono">{b.iban}</span>
          </div>
        )}
        {b.account_number && (
          <div className="flex justify-between">
            <span className="text-[#94A3B8]">Account</span>
            <span className="font-mono">{b.account_number}</span>
          </div>
        )}
        {b.sort_code && (
          <div className="flex justify-between">
            <span className="text-[#94A3B8]">Sort Code</span>
            <span className="font-mono">{b.sort_code}</span>
          </div>
        )}
        {b.bic_swift && (
          <div className="flex justify-between">
            <span className="text-[#94A3B8]">BIC/SWIFT</span>
            <span className="font-mono">{b.bic_swift}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4 pt-3 border-t border-[#E2E8F0]">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-[#717D93] hover:text-[#253859]"
          onClick={() => onEdit(b)}
        >
          <Pencil className="h-3 w-3 mr-1" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-[#717D93] hover:text-red-600"
          onClick={() => onDelete(b.id)}
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Remove
        </Button>
      </div>
    </div>
  );
}
