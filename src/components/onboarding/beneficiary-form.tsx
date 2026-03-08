'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { beneficiarySchema, type BeneficiaryFormData } from '@/lib/onboarding/schemas';
import {
  COUNTRIES, CURRENCIES, RELATIONSHIP_OPTIONS,
  PURPOSE_OF_TRANSFERS_OPTIONS, FREQUENCY_OPTIONS,
} from '@/lib/onboarding/constants';
import { SectionCard } from './section-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { Beneficiary } from '@/types/database';

interface Props {
  clientId: string;
  editingBeneficiary?: Beneficiary;
  onSave: () => void;
  onCancel: () => void;
}

export function BeneficiaryForm({ clientId, editingBeneficiary, onSave, onCancel }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();
  const isEditing = !!editingBeneficiary;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BeneficiaryFormData>({
    resolver: zodResolver(beneficiarySchema),
    defaultValues: isEditing
      ? {
          beneficiary_name: editingBeneficiary.beneficiary_name,
          nickname: editingBeneficiary.nickname || '',
          bank_name: editingBeneficiary.bank_name || '',
          bank_country: editingBeneficiary.bank_country || '',
          iban: editingBeneficiary.iban || '',
          account_number: editingBeneficiary.account_number || '',
          sort_code: editingBeneficiary.sort_code || '',
          bic_swift: editingBeneficiary.bic_swift || '',
          currency: editingBeneficiary.currency || '',
          relationship_to_client: editingBeneficiary.relationship_to_client || '',
          purpose_of_payments: editingBeneficiary.purpose_of_payments || '',
          estimated_frequency: editingBeneficiary.estimated_frequency || '',
        }
      : {
          beneficiary_name: '', nickname: '', bank_name: '', bank_country: '',
          iban: '', account_number: '', sort_code: '', bic_swift: '',
          currency: '', relationship_to_client: '', purpose_of_payments: '', estimated_frequency: '',
        },
  });

  const onSubmit = async (data: BeneficiaryFormData) => {
    setSubmitting(true);
    try {
      const payload = {
        client_id: clientId,
        beneficiary_name: data.beneficiary_name,
        nickname: data.nickname || null,
        bank_name: data.bank_name || null,
        bank_country: data.bank_country || null,
        iban: data.iban || null,
        account_number: data.account_number || null,
        sort_code: data.sort_code || null,
        bic_swift: data.bic_swift || null,
        currency: data.currency || null,
        relationship_to_client: data.relationship_to_client || null,
        purpose_of_payments: data.purpose_of_payments || null,
        estimated_frequency: data.estimated_frequency || null,
      };

      if (isEditing) {
        await supabase.from('beneficiaries').update(payload).eq('id', editingBeneficiary.id);
      } else {
        await supabase.from('beneficiaries').insert(payload);
      }

      onSave();
    } catch {
      setSubmitting(false);
    }
  };

  const SelectField = ({ label, name, options, required }: {
    label: string; name: keyof BeneficiaryFormData;
    options: readonly { value: string; label: string }[] | readonly string[];
    required?: boolean;
  }) => (
    <div className="space-y-1.5">
      <Label>{label}{required && ' *'}</Label>
      <select
        {...register(name)}
        className="flex h-8 w-full rounded-lg border border-input bg-input/30 px-2.5 py-1 text-sm focus:border-ring focus:ring-3 focus:ring-ring/50 outline-none"
      >
        <option value="">Select...</option>
        {options.map((opt) => {
          const val = typeof opt === 'string' ? opt : opt.value;
          const lab = typeof opt === 'string' ? opt : opt.label;
          return <option key={val} value={val}>{lab}</option>;
        })}
      </select>
      {errors[name] && <p className="text-xs text-red-500">{errors[name]?.message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <SectionCard title={isEditing ? 'Edit Beneficiary' : 'Add Beneficiary'}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Beneficiary Name *</Label>
              <Input {...register('beneficiary_name')} placeholder="Full name or company name" />
              {errors.beneficiary_name && <p className="text-xs text-red-500">{errors.beneficiary_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Nickname</Label>
              <Input {...register('nickname')} placeholder="For your reference" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Bank Name *</Label>
              <Input {...register('bank_name')} />
              {errors.bank_name && <p className="text-xs text-red-500">{errors.bank_name.message}</p>}
            </div>
            <SelectField label="Bank Country" name="bank_country" options={COUNTRIES} required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>IBAN</Label>
              <Input {...register('iban')} placeholder="e.g. IL620108000000099999999" />
            </div>
            <div className="space-y-1.5">
              <Label>Account Number</Label>
              <Input {...register('account_number')} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Sort Code</Label>
              <Input {...register('sort_code')} placeholder="e.g. 20-00-00" />
            </div>
            <div className="space-y-1.5">
              <Label>SWIFT / BIC</Label>
              <Input {...register('bic_swift')} />
            </div>
            <SelectField label="Currency" name="currency" options={CURRENCIES} required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SelectField label="Relationship" name="relationship_to_client" options={RELATIONSHIP_OPTIONS} required />
            <SelectField label="Purpose of Payments" name="purpose_of_payments" options={PURPOSE_OF_TRANSFERS_OPTIONS} required />
            <SelectField label="Frequency" name="estimated_frequency" options={FREQUENCY_OPTIONS} required />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#E2E8F0]">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : isEditing ? 'Update' : 'Add'}
          </Button>
        </div>
      </SectionCard>
    </form>
  );
}
